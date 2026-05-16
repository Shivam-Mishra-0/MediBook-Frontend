import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

let mockUser = null;

const appApiMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  clearPendingProviderSignup: vi.fn(),
  providerAPI: {
    getByUserId: vi.fn(),
  },
}));

const getUser = appApiMocks.getUser;
const clearPendingProviderSignup = appApiMocks.clearPendingProviderSignup;
const providerAPI = appApiMocks.providerAPI;

vi.mock('../src/utils/api', () => ({
  clearPendingProviderSignup: appApiMocks.clearPendingProviderSignup,
  getUser: appApiMocks.getUser,
  providerAPI: appApiMocks.providerAPI,
}));

function page(name) {
  return { default: () => <div>{name}</div> };
}

vi.mock('../src/pages/LandingPage', () => page('Landing Page'));
vi.mock('../src/pages/auth/LoginPage', () => page('Login Page'));
vi.mock('../src/pages/auth/RegisterPage', () => page('Register Page'));
vi.mock('../src/pages/auth/ForgotPasswordPage', () => page('Forgot Password Page'));
vi.mock('../src/pages/auth/ResetPasswordPage', () => page('Reset Password Page'));
vi.mock('../src/pages/auth/OtpPage', () => page('OTP Page'));
vi.mock('../src/pages/auth/AddPhonePage', () => page('Add Phone Page'));
vi.mock('../src/pages/auth/OAuth2Callback', () => page('OAuth2 Callback Page'));
vi.mock('../src/pages/auth/OAuth2SelectRole', () => page('OAuth2 Select Role Page'));
vi.mock('../src/pages/FindDoctorsPage', () => page('Find Doctors Page'));
vi.mock('../src/pages/DoctorProfilePage', () => page('Doctor Profile Page'));
vi.mock('../src/pages/patient/PatientDashboard', () => page('Patient Dashboard'));
vi.mock('../src/pages/patient/PatientAppointments', () => page('Patient Appointments'));
vi.mock('../src/pages/patient/PatientMedicalRecords', () => page('Patient Records'));
vi.mock('../src/pages/patient/PatientPayments', () => page('Patient Payments'));
vi.mock('../src/pages/patient/PatientProfile', () => page('Patient Profile'));
vi.mock('../src/pages/patient/BookAppointmentPage', () => page('Book Appointment Page'));
vi.mock('../src/pages/provider/ProviderDashboard', () => page('Provider Dashboard'));
vi.mock('../src/pages/provider/ProviderOnboardingPage', () => page('Provider Onboarding Page'));
vi.mock('../src/pages/provider/ProviderSchedule', () => page('Provider Schedule'));
vi.mock('../src/pages/provider/ProviderAppointments', () => page('Provider Appointments'));
vi.mock('../src/pages/provider/ProviderRecords', () => page('Provider Records'));
vi.mock('../src/pages/provider/ProviderProfile', () => page('Provider Profile'));
vi.mock('../src/pages/provider/ProviderEarnings', () => page('Provider Earnings'));
vi.mock('../src/pages/admin/AdminDashboard', () => page('Admin Dashboard'));
vi.mock('../src/pages/admin/AdminUsers', () => page('Admin Users'));
vi.mock('../src/pages/admin/AdminProviders', () => page('Admin Providers'));
vi.mock('../src/pages/admin/AdminAppointments', () => page('Admin Appointments'));
vi.mock('../src/pages/admin/AdminPayments', () => page('Admin Payments'));
vi.mock('../src/pages/admin/AdminProfile', () => page('Admin Profile'));
vi.mock('../src/pages/admin/AdminReviews', () => page('Admin Reviews'));
vi.mock('../src/pages/AdminSetup', () => page('Admin Setup'));

describe('App routing', () => {
  beforeEach(() => {
    mockUser = null;
    getUser.mockImplementation(() => mockUser);
    providerAPI.getByUserId.mockReset();
    clearPendingProviderSignup.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('redirects unauthenticated users to login for private routes', async () => {
    window.history.pushState({}, '', '/patient');
    render(<App />);

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login for provider routes too', async () => {
    window.history.pushState({}, '', '/provider');
    render(<App />);

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('redirects users with the wrong role to the landing page', async () => {
    mockUser = { userId: 1, role: 'Patient' };
    window.history.pushState({}, '', '/admin');
    render(<App />);

    expect(await screen.findByText('Landing Page')).toBeInTheDocument();
  });

  it('renders the requested patient route for the correct role', async () => {
    mockUser = { userId: 7, role: 'Patient' };
    window.history.pushState({}, '', '/patient/profile');
    render(<App />);

    expect(await screen.findByText('Patient Profile')).toBeInTheDocument();
  });

  it('checks provider profile access before allowing provider routes', async () => {
    mockUser = { userId: 14, role: 'Provider' };
    providerAPI.getByUserId.mockResolvedValue({ data: { providerId: 5 } });
    window.history.pushState({}, '', '/provider');
    render(<App />);

    expect(screen.getByText('Loading page...')).toBeInTheDocument();

    expect(await screen.findByText('Provider Dashboard')).toBeInTheDocument();
    expect(providerAPI.getByUserId).toHaveBeenCalledWith(14);
    expect(clearPendingProviderSignup).toHaveBeenCalled();
  });

  it('redirects providers without a profile to onboarding', async () => {
    mockUser = { userId: 21, role: 'Provider' };
    providerAPI.getByUserId.mockRejectedValue({ response: { status: 404 } });
    window.history.pushState({}, '', '/provider/profile');
    render(<App />);

    expect(await screen.findByText('Provider Onboarding Page')).toBeInTheDocument();
  });

  it('allows providers through when profile verification fails for non-404 errors', async () => {
    mockUser = { userId: 99, role: 'Provider' };
    providerAPI.getByUserId.mockRejectedValue({ response: { status: 500 } });
    window.history.pushState({}, '', '/provider/earnings');
    render(<App />);

    expect(await screen.findByText('Provider Earnings')).toBeInTheDocument();
    expect(console.warn).toHaveBeenCalled();
  });

  it('redirects non-provider users away from provider-only routes', async () => {
    mockUser = { userId: 88, role: 'Admin' };
    window.history.pushState({}, '', '/provider');
    render(<App />);

    expect(await screen.findByText('Landing Page')).toBeInTheDocument();
    expect(providerAPI.getByUserId).not.toHaveBeenCalled();
  });

  it('falls back to the home page for unknown routes', async () => {
    window.history.pushState({}, '', '/totally-unknown');
    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(await screen.findByText('Landing Page')).toBeInTheDocument();
  });
});
