// ================================================
// MediBook API Service
// All API calls mapped to backend endpoints
// Base URL: http://localhost:8080
// ================================================

import axios from 'axios';

const DEFAULT_BASE_URL = 'http://localhost:8080';
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true'
  },
  timeout: 60000,
});

// Retry logic with exponential backoff
const retryRequest = async (fn, maxRetries = 3, delayMs = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message.includes('timeout');
      const isNetworkError = !err.response;
      const isServerError = err.response?.status >= 500;
      
      const shouldRetry = isTimeout || isNetworkError || isServerError;
      const isLastAttempt = attempt === maxRetries - 1;

      if (!shouldRetry || isLastAttempt) {
        throw err;
      }

      // Exponential backoff
      const waitMs = delayMs * Math.pow(2, attempt);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }
};

const providerListCache = new Map();
const providerPendingRequests = new Map();
const providerProfileCache = new Map();
const PENDING_PROVIDER_KEY = 'medibook_pending_provider_signup';

const getCachedProviderList = (cacheKey, fetcher, ttlMs = 60000) => {
  const now = Date.now();
  const cachedEntry = providerListCache.get(cacheKey);

  if (cachedEntry && now - cachedEntry.ts < ttlMs) {
    return Promise.resolve(cachedEntry.response);
  }

  const pendingRequest = providerPendingRequests.get(cacheKey);
  if (pendingRequest) return pendingRequest;

  const request = retryRequest(fetcher, 3, 500)
    .then((response) => {
      providerListCache.set(cacheKey, { ts: Date.now(), response });
      return response;
    })
    .finally(() => {
      providerPendingRequests.delete(cacheKey);
    });

  providerPendingRequests.set(cacheKey, request);
  return request;
};

const getCachedProviderProfile = (providerId, fetcher, ttlMs = 120000) => {
  const now = Date.now();
  const cachedEntry = providerProfileCache.get(providerId);

  if (cachedEntry && now - cachedEntry.ts < ttlMs) {
    return Promise.resolve(cachedEntry.response);
  }

  return retryRequest(fetcher, 3, 500)
    .then((response) => {
      providerProfileCache.set(providerId, { ts: Date.now(), response });
      return response;
    });
};

const invalidateProviderListCache = () => {
  providerListCache.clear();
  providerPendingRequests.clear();
};

const invalidateProviderProfile = (providerId) => {
  providerProfileCache.delete(providerId);
};

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medibook_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── AUTH ──────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: (userId, config = {}) => api.get(`/auth/profile/${userId}`, config),
  getAllUsers: () => api.get('/admin/users'),
  updateProfile: (userId, data) => api.put(`/auth/profile/${userId}`, data),
  changePassword: (userId, newPassword) =>
    api.put(`/auth/password/${userId}`, { newPassword }),
  deactivate: (userId) => api.put(`/auth/deactivate/${userId}`),
  reactivate:  (id) => api.put(`/admin/users/${id}/reactivate`),
};

// ── PROVIDERS ─────────────────────────────────────
export const providerAPI = {
  register: (data) => {
    invalidateProviderListCache();
    return retryRequest(() => api.post('/providers/register', data), 2, 500);
  },
  getAll: () => getCachedProviderList('providers_all', () => api.get('/providers/all')),
  getAvailable: () => getCachedProviderList('providers_available', () => api.get('/providers/available')),
  getById: (id) => getCachedProviderProfile(id, () => api.get(`/providers/${id}`)),
  getByUserId: (uid) => retryRequest(() => api.get(`/providers/user/${uid}`), 3, 500),
  getBySpecialization: (spec) => retryRequest(() => api.get(`/providers/specialization/${spec}`), 2, 500),
  search: (keyword) => retryRequest(() => api.get(`/providers/search?keyword=${keyword}`), 2, 500),
  update: (id, data) => {
    invalidateProviderListCache();
    invalidateProviderProfile(id);
    return retryRequest(() => api.put(`/providers/${id}`, data), 2, 500);
  },
  verify: (id) => {
    invalidateProviderListCache();
    invalidateProviderProfile(id);
    return retryRequest(() => api.put(`/providers/${id}/verify`), 2, 500);
  },
  setAvailability: (id, val) => {
    invalidateProviderListCache();
    invalidateProviderProfile(id);
    return retryRequest(() => api.put(`/providers/${id}/availability?isAvailable=${val}`), 2, 500);
  },
  delete: (id) => {
    invalidateProviderListCache();
    invalidateProviderProfile(id);
    return retryRequest(() => api.delete(`/providers/${id}`), 2, 500);
  },
};

// ── SLOTS ─────────────────────────────────────────
export const slotAPI = {
  add: (data) => retryRequest(() => api.post('/slots/add', data), 2, 500),
  addBulk: (data) => retryRequest(() => api.post('/slots/bulk', data), 2, 500),
  generateRecurring: (data) => retryRequest(() => api.post('/slots/recurring', data), 2, 500),
  getByProvider: (pid) => retryRequest(() => api.get(`/slots/provider/${pid}`), 2, 500),
  getAvailable: (pid, date) => retryRequest(() => api.get(`/slots/available/${pid}?date=${date}`), 2, 500),
  getById: (id) => retryRequest(() => api.get(`/slots/${id}`), 2, 500),
  update: (id, data) => retryRequest(() => api.put(`/slots/${id}`, data), 2, 500),
  block: (id) => retryRequest(() => api.put(`/slots/${id}/block`), 2, 500),
  unblock: (id) => retryRequest(() => api.put(`/slots/${id}/unblock`), 2, 500),
  delete: (id) => retryRequest(() => api.delete(`/slots/${id}`), 2, 500),
};

// ── APPOINTMENTS ──────────────────────────────────
export const appointmentAPI = {
  book: (data) => retryRequest(() => api.post('/appointments/book', data), 2, 500),
  getById: (id) => retryRequest(() => api.get(`/appointments/${id}`), 2, 500),
  getByPatient: (pid) => retryRequest(() => api.get(`/appointments/patient/${pid}`), 2, 500),
  getUpcoming: (pid) => retryRequest(() => api.get(`/appointments/patient/${pid}/upcoming`), 2, 500),
  getByProvider: (pid) => retryRequest(() => api.get(`/appointments/provider/${pid}`), 2, 500),
  getByProviderDate: (pid, date) =>
    retryRequest(() => api.get(`/appointments/provider/${pid}/date?date=${date}`), 2, 500),
  cancel: (id) => retryRequest(() => api.put(`/appointments/${id}/cancel`), 2, 500),
  reschedule: (id, data) => retryRequest(() => api.put(`/appointments/${id}/reschedule`, data), 2, 500),
  complete: (id, providerId) =>
    retryRequest(() => api.put(`/appointments/${id}/complete`, { providerId }), 2, 500),
  updateStatus: (id, status) =>
    retryRequest(() => api.put(`/appointments/${id}/status?status=${status}`), 2, 500),
  getCount: (pid) => retryRequest(() => api.get(`/appointments/provider/${pid}/count`), 2, 500),
};

// ── PAYMENTS ──────────────────────────────────────
export const paymentAPI = {
  initiate: (data) => api.post('/payments/initiate', data),
  verify: (data) => api.post('/payments/verify', data),
  getByAppointment: (id) => api.get(`/payments/appointment/${id}`),
  getById: (id) => api.get(`/payments/${id}`),
  getByPatient: (pid) => api.get(`/payments/patient/${pid}`),
  getByProvider: (pid) => api.get(`/payments/provider/${pid}`),
  refund: (id) => api.post(`/payments/${id}/refund`),
  getByStatus: (status) => api.get(`/payments/status?status=${status}`),
  getTotalRevenue: () => api.get('/payments/revenue/total'),
  updateStatus: (id, status) =>
    api.put(`/payments/${id}/status?status=${status}`),
};

// ── REVIEWS ───────────────────────────────────────
export const reviewAPI = {
  submit: (data) => api.post('/reviews/submit', data),
  getByProvider: (pid) => api.get(`/reviews/provider/${pid}`),
  getByPatient: (pid) => api.get(`/reviews/patient/${pid}`),
  getById: (id) => api.get(`/reviews/${id}`),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
  getAverage: (pid) => api.get(`/reviews/provider/${pid}/average`),
  getCount: (pid) => api.get(`/reviews/provider/${pid}/count`),
};

// ── NOTIFICATIONS ─────────────────────────────────
export const notifAPI = {
  send: (data) => api.post('/notifications/send', data),
  sendBulk: (data) => api.post('/notifications/bulk', data),
  broadcast: (data) => api.post('/notifications/broadcast', data),
  getByRecipient: (id) => api.get(`/notifications/recipient/${id}`),
  getUnreadCount: (id) => api.get(`/notifications/unread/count/${id}`),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: (id) => api.put(`/notifications/read/all/${id}`),
  delete: (id) => api.delete(`/notifications/${id}`),
  getAll: () => api.get('/notifications/all'),
};

// ── RECORDS ───────────────────────────────────────
export const recordAPI = {
  create: (data) => api.post('/records/create', data),
  getByAppointment: (id) => api.get(`/records/appointment/${id}`),
  getByPatient: (pid) => api.get(`/records/patient/${pid}`),
  getByProvider: (pid) => api.get(`/records/provider/${pid}`),
  getById: (id) => api.get(`/records/${id}`),
  update: (id, data) => api.put(`/records/${id}`, data),
  delete: (id) => api.delete(`/records/${id}`),
  attach: (id, url) => api.put(`/records/${id}/attach?url=${url}`),
  getFollowUps: (pid) => api.get(`/records/patient/${pid}/followups`),
  getTodayFollowUps: () => api.get('/records/followups/today'),
  getCount: (pid) => api.get(`/records/patient/${pid}/count`),
};

// ── HELPERS ───────────────────────────────────────
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem('medibook_user')); } catch { return null; }
};
export const getToken = () => localStorage.getItem('medibook_token');
export const saveAuth = (token, user) => {
  localStorage.setItem('medibook_token', token);
  localStorage.setItem('medibook_user', JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem('medibook_token');
  localStorage.removeItem('medibook_user');
};
export const savePendingProviderSignup = (data) => {
  localStorage.setItem(PENDING_PROVIDER_KEY, JSON.stringify(data));
};
export const getPendingProviderSignup = () => {
  try {
    return JSON.parse(localStorage.getItem(PENDING_PROVIDER_KEY));
  } catch {
    return null;
  }
};
export const clearPendingProviderSignup = () => {
  localStorage.removeItem(PENDING_PROVIDER_KEY);
};

export const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hh = parseInt(h);
  return `${hh > 12 ? hh - 12 : hh}:${m} ${hh >= 12 ? 'PM' : 'AM'}`;
};
export const getStatusBadge = (status) => {
  const map = {
    SCHEDULED: 'badge-blue',
    COMPLETED: 'badge-green',
    CANCELLED: 'badge-red',
    NO_SHOW: 'badge-yellow',
    Pending: 'badge-yellow',
    SUCCESS: 'badge-green',
    FAILED: 'badge-red',
    REFUNDED: 'badge-gray',
  };
  return map[status] || 'badge-gray';
};
export const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export default api;
