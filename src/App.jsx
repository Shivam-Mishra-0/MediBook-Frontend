import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/global.css';

// Public Pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const OtpPage = lazy(() => import('./pages/auth/OtpPage'));
const AddPhonePage = lazy(() => import('./pages/auth/AddPhonePage'));
const OAuth2Callback = lazy(() => import('./pages/auth/OAuth2Callback'));
const OAuth2SelectRole = lazy(() => import('./pages/auth/OAuth2SelectRole'));
const FindDoctorsPage = lazy(() => import('./pages/FindDoctorsPage'));
const DoctorProfilePage = lazy(() => import('./pages/DoctorProfilePage'));

// Patient Pages
const PatientDashboard = lazy(() => import('./pages/patient/PatientDashboard'));
const PatientAppointments = lazy(() => import('./pages/patient/PatientAppointments'));
const PatientMedicalRecords = lazy(() => import('./pages/patient/PatientMedicalRecords'));
const PatientPayments = lazy(() => import('./pages/patient/PatientPayments'));
const PatientProfile = lazy(() => import('./pages/patient/PatientProfile'));
const BookAppointmentPage = lazy(() => import('./pages/patient/BookAppointmentPage'));

// Provider Pages
const ProviderDashboard = lazy(() => import('./pages/provider/ProviderDashboard'));
const ProviderOnboardingPage = lazy(() => import('./pages/provider/ProviderOnboardingPage'));
const ProviderSchedule = lazy(() => import('./pages/provider/ProviderSchedule'));
const ProviderAppointments = lazy(() => import('./pages/provider/ProviderAppointments'));
const ProviderRecords = lazy(() => import('./pages/provider/ProviderRecords'));
const ProviderProfile = lazy(() => import('./pages/provider/ProviderProfile'));
const ProviderEarnings = lazy(() => import('./pages/provider/ProviderEarnings'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminProviders = lazy(() => import('./pages/admin/AdminProviders'));
const AdminAppointments = lazy(() => import('./pages/admin/AdminAppointments'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminProfile = lazy(() => import('./pages/admin/AdminProfile'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminSetup = lazy(() => import('./pages/AdminSetup'));

import { clearPendingProviderSignup, getUser, providerAPI } from './utils/api';

function PrivateRoute({ children, role }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function ProviderRoute({ children }) {
  const user = getUser();
  const [status, setStatus] = useState(user ? 'checking' : 'unauthenticated');

  useEffect(() => {
    if (!user) {
      setStatus('unauthenticated');
      return;
    }

    if (user.role !== 'Provider') {
      setStatus('forbidden');
      return;
    }

    let active = true;
    setStatus('checking');

    providerAPI.getByUserId(user.userId)
      .then(() => {
        if (!active) return;
        clearPendingProviderSignup();
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 404) {
          setStatus('missing');
          return;
        }

        console.warn('Provider route guard could not verify profile:', err);
        setStatus('ready');
      });

    return () => {
      active = false;
    };
  }, [user?.role, user?.userId]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'Provider') return <Navigate to="/" replace />;
  if (status === 'checking') return <AppFallback />;
  if (status === 'missing') return <Navigate to="/provider/onboarding" replace />;
  return children;
}

function AppFallback() {
  return (
    <div className="page-loader">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }}></div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading page...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<AppFallback />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/otp" element={<OtpPage />} />
          <Route path="/add-phone" element={<AddPhonePage />} />
          <Route path="/oauth2/callback" element={<OAuth2Callback />} />
          <Route path="/oauth2/select-role" element={<OAuth2SelectRole />} />
          <Route path="/provider/onboarding" element={<ProviderOnboardingPage />} />
          <Route path="/admin-setup" element={<AdminSetup />} />
          <Route path="/find-doctors" element={<FindDoctorsPage />} />
          <Route path="/doctor/:providerId" element={<DoctorProfilePage />} />

          {/* Patient */}
          <Route path="/patient" element={<PrivateRoute role="Patient"><PatientDashboard /></PrivateRoute>} />
          <Route path="/patient/appointments" element={<PrivateRoute role="Patient"><PatientAppointments /></PrivateRoute>} />
          <Route path="/patient/records" element={<PrivateRoute role="Patient"><PatientMedicalRecords /></PrivateRoute>} />
          <Route path="/patient/payments" element={<PrivateRoute role="Patient"><PatientPayments /></PrivateRoute>} />
          <Route path="/patient/profile" element={<PrivateRoute role="Patient"><PatientProfile /></PrivateRoute>} />
          <Route path="/patient/book/:providerId" element={<PrivateRoute role="Patient"><BookAppointmentPage /></PrivateRoute>} />

          {/* Provider */}
          <Route path="/provider" element={<ProviderRoute><ProviderDashboard /></ProviderRoute>} />
          <Route path="/provider/schedule" element={<ProviderRoute><ProviderSchedule /></ProviderRoute>} />
          <Route path="/provider/appointments" element={<ProviderRoute><ProviderAppointments /></ProviderRoute>} />
          <Route path="/provider/records" element={<ProviderRoute><ProviderRecords /></ProviderRoute>} />
          <Route path="/provider/profile" element={<ProviderRoute><ProviderProfile /></ProviderRoute>} />
          <Route path="/provider/earnings" element={<ProviderRoute><ProviderEarnings /></ProviderRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<PrivateRoute role="Admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute role="Admin"><AdminUsers /></PrivateRoute>} />
          <Route path="/admin/providers" element={<PrivateRoute role="Admin"><AdminProviders /></PrivateRoute>} />
          <Route path="/admin/appointments" element={<PrivateRoute role="Admin"><AdminAppointments /></PrivateRoute>} />
          <Route path="/admin/payments" element={<PrivateRoute role="Admin"><AdminPayments /></PrivateRoute>} />
          <Route path="/admin/profile" element={<PrivateRoute role="Admin"><AdminProfile /></PrivateRoute>} />
          <Route path="/admin/reviews" element={<PrivateRoute role="Admin"><AdminReviews /></PrivateRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
