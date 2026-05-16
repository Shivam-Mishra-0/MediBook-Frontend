import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let mockApi;
let requestInterceptor;
let responseErrorInterceptor;

vi.mock('axios', () => {
  const create = vi.fn(() => mockApi);
  return {
    create,
    default: { create },
  };
});

async function loadApiModule() {
  vi.resetModules();

  requestInterceptor = undefined;
  responseErrorInterceptor = undefined;
  mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((handler) => {
          requestInterceptor = handler;
        }),
      },
      response: {
        use: vi.fn((_, errorHandler) => {
          responseErrorInterceptor = errorHandler;
        }),
      },
    },
  };

  return import('../src/utils/api');
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('api utilities', () => {
  beforeEach(() => {
    vi.useRealTimers();
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers interceptors, injects auth headers, and clears auth on 401 responses', async () => {
    const apiModule = await loadApiModule();

    localStorage.setItem('medibook_token', 'token-123');
    localStorage.setItem('medibook_user', JSON.stringify({ role: 'Patient' }));

    const configWithToken = requestInterceptor({ headers: {} });
    expect(configWithToken.headers.Authorization).toBe('Bearer token-123');

    localStorage.removeItem('medibook_token');
    const configWithoutToken = requestInterceptor({ headers: {} });
    expect(configWithoutToken.headers.Authorization).toBeUndefined();

    localStorage.setItem('medibook_token', 'token-123');
    localStorage.setItem('medibook_user', JSON.stringify({ role: 'Patient' }));
    const error = { response: { status: 401 } };

    await expect(responseErrorInterceptor(error)).rejects.toBe(error);

    expect(localStorage.getItem('medibook_token')).toBeNull();
    expect(localStorage.getItem('medibook_user')).toBeNull();
    expect(apiModule.getToken()).toBeNull();
  });

  it('provides auth and helper storage utilities', async () => {
    const apiModule = await loadApiModule();

    apiModule.saveAuth('jwt-token', {
      userId: 7,
      fullName: 'Jane Doe',
      role: 'Patient',
      email: 'jane@example.com',
    });

    expect(apiModule.getToken()).toBe('jwt-token');
    expect(apiModule.getUser()).toEqual({
      userId: 7,
      fullName: 'Jane Doe',
      role: 'Patient',
      email: 'jane@example.com',
    });

    localStorage.setItem('medibook_user', '{bad-json');
    expect(apiModule.getUser()).toBeNull();

    apiModule.savePendingProviderSignup({ email: 'provider@example.com' });
    expect(apiModule.getPendingProviderSignup()).toEqual({ email: 'provider@example.com' });

    localStorage.setItem('medibook_pending_provider_signup', '{bad-json');
    expect(apiModule.getPendingProviderSignup()).toBeNull();

    apiModule.clearPendingProviderSignup();
    apiModule.clearAuth();

    expect(localStorage.getItem('medibook_pending_provider_signup')).toBeNull();
    expect(localStorage.getItem('medibook_token')).toBeNull();
  });

  it('formats dates, times, statuses, and initials safely', async () => {
    const apiModule = await loadApiModule();

    expect(apiModule.formatDate()).toBe('—');
    expect(apiModule.formatDate('2024-03-10')).toContain('2024');
    expect(apiModule.formatTime('13:45')).toBe('1:45 PM');
    expect(apiModule.formatTime('09:05')).toBe('9:05 AM');
    expect(apiModule.formatTime('')).toBe('');
    expect(apiModule.getStatusBadge('SCHEDULED')).toBe('badge-blue');
    expect(apiModule.getStatusBadge('Pending')).toBe('badge-yellow');
    expect(apiModule.getStatusBadge('missing')).toBe('badge-gray');
    expect(apiModule.getInitials('Jane Doe')).toBe('JD');
    expect(apiModule.getInitials('single')).toBe('S');
    expect(apiModule.getInitials('')).toBe('?');
  });

  it('maps the API wrapper methods to the expected backend endpoints', async () => {
    const apiModule = await loadApiModule();

    mockApi.get.mockResolvedValue({ data: {} });
    mockApi.post.mockResolvedValue({ data: {} });
    mockApi.put.mockResolvedValue({ data: {} });
    mockApi.delete.mockResolvedValue({ data: {} });

    await apiModule.authAPI.register({ a: 1 });
    await apiModule.authAPI.login({ b: 2 });
    await apiModule.authAPI.logout();
    await apiModule.authAPI.getProfile(1, { timeout: 12 });
    await apiModule.authAPI.updateProfile(1, { c: 3 });
    await apiModule.authAPI.changePassword(1, 'next-pass');
    await apiModule.authAPI.deactivate(1);

    await apiModule.providerAPI.register({ name: 'provider' });
    await apiModule.providerAPI.getAll();
    await apiModule.providerAPI.getAvailable();
    await apiModule.providerAPI.getById(4);
    await apiModule.providerAPI.getByUserId(5);
    await apiModule.providerAPI.getBySpecialization('Cardiology');
    await apiModule.providerAPI.search('sam');
    await apiModule.providerAPI.update(4, { fee: 500 });
    await apiModule.providerAPI.verify(4);
    await apiModule.providerAPI.setAvailability(4, true);
    await apiModule.providerAPI.delete(4);

    await apiModule.slotAPI.add({ start: '10:00' });
    await apiModule.slotAPI.addBulk([{ start: '11:00' }]);
    await apiModule.slotAPI.generateRecurring({ day: 'MON' });
    await apiModule.slotAPI.getByProvider(9);
    await apiModule.slotAPI.getAvailable(9, '2026-05-11');
    await apiModule.slotAPI.getById(10);
    await apiModule.slotAPI.update(10, { status: 'OPEN' });
    await apiModule.slotAPI.block(10);
    await apiModule.slotAPI.unblock(10);
    await apiModule.slotAPI.delete(10);

    await apiModule.appointmentAPI.book({ providerId: 4 });
    await apiModule.appointmentAPI.getById(11);
    await apiModule.appointmentAPI.getByPatient(7);
    await apiModule.appointmentAPI.getUpcoming(7);
    await apiModule.appointmentAPI.getByProvider(4);
    await apiModule.appointmentAPI.getByProviderDate(4, '2026-05-12');
    await apiModule.appointmentAPI.cancel(11);
    await apiModule.appointmentAPI.reschedule(11, { slotId: 20 });
    await apiModule.appointmentAPI.complete(11, 4);
    await apiModule.appointmentAPI.updateStatus(11, 'COMPLETED');
    await apiModule.appointmentAPI.getCount(4);

    await apiModule.paymentAPI.initiate({ amount: 500 });
    await apiModule.paymentAPI.verify({ paymentId: 1 });
    await apiModule.paymentAPI.getByAppointment(11);
    await apiModule.paymentAPI.getById(3);
    await apiModule.paymentAPI.getByPatient(7);
    await apiModule.paymentAPI.getByProvider(4);
    await apiModule.paymentAPI.refund(3);
    await apiModule.paymentAPI.getByStatus('SUCCESS');
    await apiModule.paymentAPI.getTotalRevenue();
    await apiModule.paymentAPI.updateStatus(3, 'FAILED');

    await apiModule.reviewAPI.submit({ rating: 5 });
    await apiModule.reviewAPI.getByProvider(4);
    await apiModule.reviewAPI.getByPatient(7);
    await apiModule.reviewAPI.getById(12);
    await apiModule.reviewAPI.update(12, { comment: 'Updated' });
    await apiModule.reviewAPI.delete(12);
    await apiModule.reviewAPI.getAverage(4);
    await apiModule.reviewAPI.getCount(4);

    await apiModule.notifAPI.send({ title: 'Ping' });
    await apiModule.notifAPI.sendBulk([{ title: 'Bulk' }]);
    await apiModule.notifAPI.getByRecipient(7);
    await apiModule.notifAPI.getUnreadCount(7);
    await apiModule.notifAPI.markRead(1);
    await apiModule.notifAPI.markAllRead(7);
    await apiModule.notifAPI.delete(1);
    await apiModule.notifAPI.getAll();

    await apiModule.recordAPI.create({ title: 'Record' });
    await apiModule.recordAPI.getByAppointment(11);
    await apiModule.recordAPI.getByPatient(7);
    await apiModule.recordAPI.getByProvider(4);
    await apiModule.recordAPI.getById(14);
    await apiModule.recordAPI.update(14, { diagnosis: 'OK' });
    await apiModule.recordAPI.delete(14);
    await apiModule.recordAPI.attach(14, 'https://cdn.example/file.pdf');
    await apiModule.recordAPI.getFollowUps(7);
    await apiModule.recordAPI.getTodayFollowUps();
    await apiModule.recordAPI.getCount(7);

    expect(mockApi.post).toHaveBeenCalledWith('/auth/register', { a: 1 });
    expect(mockApi.post).toHaveBeenCalledWith('/auth/login', { b: 2 });
    expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
    expect(mockApi.get).toHaveBeenCalledWith('/auth/profile/1', { timeout: 12 });
    expect(mockApi.put).toHaveBeenCalledWith('/auth/profile/1', { c: 3 });
    expect(mockApi.put).toHaveBeenCalledWith('/auth/password/1', { newPassword: 'next-pass' });
    expect(mockApi.put).toHaveBeenCalledWith('/auth/deactivate/1');
    expect(mockApi.post).toHaveBeenCalledWith('/providers/register', { name: 'provider' });
    expect(mockApi.get).toHaveBeenCalledWith('/providers/available');
    expect(mockApi.get).toHaveBeenCalledWith('/providers/4');
    expect(mockApi.get).toHaveBeenCalledWith('/providers/user/5');
    expect(mockApi.get).toHaveBeenCalledWith('/providers/specialization/Cardiology');
    expect(mockApi.get).toHaveBeenCalledWith('/providers/search?keyword=sam');
    expect(mockApi.put).toHaveBeenCalledWith('/providers/4', { fee: 500 });
    expect(mockApi.put).toHaveBeenCalledWith('/providers/4/verify');
    expect(mockApi.put).toHaveBeenCalledWith('/providers/4/availability?isAvailable=true');
    expect(mockApi.delete).toHaveBeenCalledWith('/providers/4');
    expect(mockApi.post).toHaveBeenCalledWith('/slots/add', { start: '10:00' });
    expect(mockApi.post).toHaveBeenCalledWith('/slots/bulk', [{ start: '11:00' }]);
    expect(mockApi.post).toHaveBeenCalledWith('/slots/recurring', { day: 'MON' });
    expect(mockApi.get).toHaveBeenCalledWith('/slots/provider/9');
    expect(mockApi.get).toHaveBeenCalledWith('/slots/available/9?date=2026-05-11');
    expect(mockApi.get).toHaveBeenCalledWith('/slots/10');
    expect(mockApi.put).toHaveBeenCalledWith('/slots/10', { status: 'OPEN' });
    expect(mockApi.put).toHaveBeenCalledWith('/slots/10/block');
    expect(mockApi.put).toHaveBeenCalledWith('/slots/10/unblock');
    expect(mockApi.delete).toHaveBeenCalledWith('/slots/10');
    expect(mockApi.post).toHaveBeenCalledWith('/appointments/book', { providerId: 4 });
    expect(mockApi.get).toHaveBeenCalledWith('/appointments/11');
    expect(mockApi.get).toHaveBeenCalledWith('/appointments/patient/7');
    expect(mockApi.get).toHaveBeenCalledWith('/appointments/patient/7/upcoming');
    expect(mockApi.get).toHaveBeenCalledWith('/appointments/provider/4');
    expect(mockApi.get).toHaveBeenCalledWith('/appointments/provider/4/date?date=2026-05-12');
    expect(mockApi.put).toHaveBeenCalledWith('/appointments/11/cancel');
    expect(mockApi.put).toHaveBeenCalledWith('/appointments/11/reschedule', { slotId: 20 });
    expect(mockApi.put).toHaveBeenCalledWith('/appointments/11/complete', { providerId: 4 });
    expect(mockApi.put).toHaveBeenCalledWith('/appointments/11/status?status=COMPLETED');
    expect(mockApi.get).toHaveBeenCalledWith('/appointments/provider/4/count');
    expect(mockApi.post).toHaveBeenCalledWith('/payments/initiate', { amount: 500 });
    expect(mockApi.post).toHaveBeenCalledWith('/payments/verify', { paymentId: 1 });
    expect(mockApi.get).toHaveBeenCalledWith('/payments/appointment/11');
    expect(mockApi.get).toHaveBeenCalledWith('/payments/3');
    expect(mockApi.get).toHaveBeenCalledWith('/payments/patient/7');
    expect(mockApi.get).toHaveBeenCalledWith('/payments/provider/4');
    expect(mockApi.post).toHaveBeenCalledWith('/payments/3/refund');
    expect(mockApi.get).toHaveBeenCalledWith('/payments/status?status=SUCCESS');
    expect(mockApi.get).toHaveBeenCalledWith('/payments/revenue/total');
    expect(mockApi.put).toHaveBeenCalledWith('/payments/3/status?status=FAILED');
    expect(mockApi.post).toHaveBeenCalledWith('/reviews/submit', { rating: 5 });
    expect(mockApi.get).toHaveBeenCalledWith('/reviews/provider/4');
    expect(mockApi.get).toHaveBeenCalledWith('/reviews/patient/7');
    expect(mockApi.get).toHaveBeenCalledWith('/reviews/12');
    expect(mockApi.put).toHaveBeenCalledWith('/reviews/12', { comment: 'Updated' });
    expect(mockApi.delete).toHaveBeenCalledWith('/reviews/12');
    expect(mockApi.get).toHaveBeenCalledWith('/reviews/provider/4/average');
    expect(mockApi.get).toHaveBeenCalledWith('/reviews/provider/4/count');
    expect(mockApi.post).toHaveBeenCalledWith('/notifications/send', { title: 'Ping' });
    expect(mockApi.post).toHaveBeenCalledWith('/notifications/bulk', [{ title: 'Bulk' }]);
    expect(mockApi.get).toHaveBeenCalledWith('/notifications/recipient/7');
    expect(mockApi.get).toHaveBeenCalledWith('/notifications/unread/count/7');
    expect(mockApi.put).toHaveBeenCalledWith('/notifications/1/read');
    expect(mockApi.put).toHaveBeenCalledWith('/notifications/read/all/7');
    expect(mockApi.delete).toHaveBeenCalledWith('/notifications/1');
    expect(mockApi.get).toHaveBeenCalledWith('/notifications/all');
    expect(mockApi.post).toHaveBeenCalledWith('/records/create', { title: 'Record' });
    expect(mockApi.get).toHaveBeenCalledWith('/records/appointment/11');
    expect(mockApi.get).toHaveBeenCalledWith('/records/patient/7');
    expect(mockApi.get).toHaveBeenCalledWith('/records/provider/4');
    expect(mockApi.get).toHaveBeenCalledWith('/records/14');
    expect(mockApi.put).toHaveBeenCalledWith('/records/14', { diagnosis: 'OK' });
    expect(mockApi.delete).toHaveBeenCalledWith('/records/14');
    expect(mockApi.put).toHaveBeenCalledWith('/records/14/attach?url=https://cdn.example/file.pdf');
    expect(mockApi.get).toHaveBeenCalledWith('/records/patient/7/followups');
    expect(mockApi.get).toHaveBeenCalledWith('/records/followups/today');
    expect(mockApi.get).toHaveBeenCalledWith('/records/patient/7/count');
  });

  it('caches provider list and profile lookups until invalidated', async () => {
    const apiModule = await loadApiModule();
    const providersRequest = deferred();
    const profileRequest = deferred();

    mockApi.get
      .mockImplementationOnce(() => providersRequest.promise)
      .mockImplementationOnce(() => profileRequest.promise)
      .mockResolvedValue({ data: ['fresh'] });
    mockApi.post.mockResolvedValue({ data: {} });
    mockApi.put.mockResolvedValue({ data: {} });

    const listPromiseA = apiModule.providerAPI.getAll();
    const listPromiseB = apiModule.providerAPI.getAll();

    expect(listPromiseA).toBe(listPromiseB);
    expect(mockApi.get).toHaveBeenCalledTimes(1);

    providersRequest.resolve({ data: ['cached-list'] });
    await expect(listPromiseA).resolves.toEqual({ data: ['cached-list'] });

    await expect(apiModule.providerAPI.getAll()).resolves.toEqual({ data: ['cached-list'] });
    expect(mockApi.get).toHaveBeenCalledTimes(1);

    const profileA = apiModule.providerAPI.getById(10);
    profileRequest.resolve({ data: { providerId: 10 } });
    await expect(profileA).resolves.toEqual({ data: { providerId: 10 } });
    await expect(apiModule.providerAPI.getById(10)).resolves.toEqual({ data: { providerId: 10 } });
    expect(mockApi.get).toHaveBeenCalledTimes(2);

    await apiModule.providerAPI.update(10, { fee: 999 });
    await apiModule.providerAPI.getAll();
    await apiModule.providerAPI.getById(10);

    expect(mockApi.get).toHaveBeenCalledTimes(4);
  });

  it('retries transient provider requests but stops on client errors and final failures', async () => {
    const apiModule = await loadApiModule();
    vi.useFakeTimers();

    mockApi.get
      .mockRejectedValueOnce({ message: 'timeout hit', code: 'ECONNABORTED' })
      .mockRejectedValueOnce({ message: 'server exploded', response: { status: 503 } })
      .mockResolvedValueOnce({ data: { providerId: 8 } });

    const retryPromise = apiModule.providerAPI.getByUserId(8);
    await vi.runAllTimersAsync();
    await expect(retryPromise).resolves.toEqual({ data: { providerId: 8 } });
    expect(mockApi.get).toHaveBeenCalledTimes(3);

    mockApi.get.mockReset();
    mockApi.get.mockRejectedValueOnce({ response: { status: 400 }, message: 'bad request' });
    await expect(apiModule.providerAPI.search('bad')).rejects.toMatchObject({ response: { status: 400 } });
    expect(mockApi.get).toHaveBeenCalledTimes(1);

    mockApi.get.mockReset();
    mockApi.get
      .mockRejectedValueOnce({ message: 'network down' })
      .mockRejectedValueOnce({ message: 'network down' });

    const failedPromise = apiModule.providerAPI.getBySpecialization('Neuro');
    const failedExpectation = expect(failedPromise).rejects.toMatchObject({ message: 'network down' });
    await vi.runAllTimersAsync();
    await failedExpectation;
    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });
});
