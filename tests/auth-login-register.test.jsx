import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from '../src/pages/auth/LoginPage';
import RegisterPage from '../src/pages/auth/RegisterPage';

let pendingSignup = null;

const authMocks = vi.hoisted(() => ({
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
  },
  providerAPI: {
    getByUserId: vi.fn(),
  },
  saveAuth: vi.fn(),
  clearPendingProviderSignup: vi.fn(),
  getPendingProviderSignup: vi.fn(),
  savePendingProviderSignup: vi.fn(),
}));

const authAPI = authMocks.authAPI;
const providerAPI = authMocks.providerAPI;
const saveAuth = authMocks.saveAuth;
const clearPendingProviderSignup = authMocks.clearPendingProviderSignup;
const getPendingProviderSignup = authMocks.getPendingProviderSignup;
const savePendingProviderSignup = authMocks.savePendingProviderSignup;

vi.mock('../src/utils/api', () => ({
  authAPI: authMocks.authAPI,
  clearPendingProviderSignup: authMocks.clearPendingProviderSignup,
  getPendingProviderSignup: authMocks.getPendingProviderSignup,
  providerAPI: authMocks.providerAPI,
  saveAuth: authMocks.saveAuth,
  savePendingProviderSignup: authMocks.savePendingProviderSignup,
}));

function LocationProbe() {
  const location = useLocation();
  return (
    <div>
      <div data-testid="location">{location.pathname}</div>
      <div data-testid="search">{location.search}</div>
    </div>
  );
}

function renderRoute(route, path, element) {
  cleanup();
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderLogin(route = '/login') {
  return renderRoute(route, '/login', <LoginPage />);
}

function renderRegister(route = '/register') {
  return renderRoute(route, '/register', <RegisterPage />);
}

async function fillLoginForm() {
  await userEvent.type(screen.getByPlaceholderText('you@example.com'), ' user@example.com ');
  await userEvent.type(screen.getByPlaceholderText('Enter your password'), ' secret ');
}

async function fillRegisterForm() {
  await userEvent.type(screen.getByPlaceholderText('Your full name'), '  Jane Doe  ');
  await userEvent.type(screen.getByPlaceholderText('+91 98765 43210'), ' 98765abc43210 ');
  await userEvent.type(screen.getByPlaceholderText('you@example.com'), ' jane@example.com ');
  await userEvent.type(screen.getByPlaceholderText('Minimum 6 characters'), 'password123');
}

describe('LoginPage and RegisterPage', () => {
  beforeEach(() => {
    pendingSignup = null;
    authAPI.login.mockReset();
    authAPI.register.mockReset();
    providerAPI.getByUserId.mockReset();
    saveAuth.mockReset();
    clearPendingProviderSignup.mockReset();
    getPendingProviderSignup.mockImplementation(() => pendingSignup);
    savePendingProviderSignup.mockReset();
  });

  it('shows login query-state success banners and toggles password visibility', async () => {
    renderLogin('/login?reset=success&registered=provider-account');

    expect(screen.getByText(/password reset successful/i)).toBeInTheDocument();
    expect(screen.getByText(/provider account created/i)).toBeInTheDocument();

    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('validates blank login submissions and surfaces API failures', async () => {
    renderLogin('/login');

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: '   ' } });
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: '   ' } });
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form'));

    expect(await screen.findByText('Email and password are required.')).toBeInTheDocument();

    await userEvent.clear(screen.getByPlaceholderText('you@example.com'));
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'user@example.com');
    await userEvent.clear(screen.getByPlaceholderText('Enter your password'));
    await userEvent.type(screen.getByPlaceholderText('Enter your password'), 'secret');

    authAPI.login.mockRejectedValueOnce({ response: { data: { message: 'Bad credentials' } } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Bad credentials')).toBeInTheDocument();

    authAPI.login.mockRejectedValueOnce({});
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
  });

  it('routes login users through phone and OTP verification when required', async () => {
    renderLogin('/login?registered=patient');
    await fillLoginForm();

    expect(screen.getByText(/account created\. verify your otp after login/i)).toBeInTheDocument();

    authAPI.login.mockResolvedValueOnce({ data: { requiresPhone: true } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/add-phone');
      expect(screen.getByTestId('search')).toHaveTextContent('email=user%40example.com');
    });

    renderLogin('/login?registered=provider');
    await fillLoginForm();
    expect(screen.getByText(/provider profile submitted/i)).toBeInTheDocument();

    authAPI.login.mockResolvedValueOnce({ data: { otpSent: true } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/otp');
      expect(screen.getByTestId('search')).toHaveTextContent('source=normal');
    });
  });

  it('handles successful login branches for patient, provider, admin, and unexpected roles', async () => {
    renderLogin('/login');
    await fillLoginForm();

    authAPI.login.mockResolvedValueOnce({
      data: { token: 'jwt', userId: 5, fullName: 'Jane Doe', role: 'Patient', email: 'patient@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/patient'));
    expect(saveAuth).toHaveBeenCalledWith('jwt', {
      userId: 5,
      email: 'patient@example.com',
      fullName: 'Jane Doe',
      role: 'Patient',
    });

    renderLogin('/login');
    await fillLoginForm();
    authAPI.login.mockResolvedValueOnce({
      data: { token: 'jwt2', userId: 6, fullName: 'Doctor Demo', role: 'Provider', email: 'doctor@example.com' },
    });
    providerAPI.getByUserId.mockResolvedValueOnce({ data: { providerId: 88 } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/provider'));
    expect(clearPendingProviderSignup).toHaveBeenCalled();

    renderLogin('/login');
    await fillLoginForm();
    authAPI.login.mockResolvedValueOnce({
      data: { token: 'jwt3', userId: 7, fullName: 'Doctor Missing', role: 'Provider', email: 'doctor2@example.com' },
    });
    providerAPI.getByUserId.mockRejectedValueOnce({ response: { status: 404 } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/provider/onboarding'));

    renderLogin('/login');
    await fillLoginForm();
    authAPI.login.mockResolvedValueOnce({
      data: { token: 'jwt4', userId: 8, fullName: 'Doctor Error', role: 'Provider', email: 'doctor3@example.com' },
    });
    providerAPI.getByUserId.mockRejectedValueOnce({ response: { status: 500 } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/provider'));

    renderLogin('/login');
    await fillLoginForm();
    authAPI.login.mockResolvedValueOnce({
      data: { token: 'jwt5', userId: 9, fullName: 'Admin Demo', role: 'Admin', email: 'admin@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin'));

    renderLogin('/login');
    await fillLoginForm();
    authAPI.login.mockResolvedValueOnce({
      data: { token: 'jwt6', userId: 10, fullName: 'Mystery', role: 'Mystery', email: 'mystery@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Unknown user role: Mystery')).toBeInTheDocument();
  });

  it('surfaces incomplete login payloads from the backend', async () => {
    renderLogin('/login');
    await fillLoginForm();

    authAPI.login.mockResolvedValueOnce({
      data: { userId: 10, fullName: 'Jane Doe', role: 'Patient', email: 'patient@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Login failed: No token received.')).toBeInTheDocument();

    renderLogin('/login');
    await fillLoginForm();
    authAPI.login.mockResolvedValueOnce({
      data: { token: 'jwt', fullName: 'Jane Doe', email: 'patient@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Login failed: Incomplete user data.')).toBeInTheDocument();
  });

  it('renders provider signup resume state and completes patient registration', async () => {
    pendingSignup = { fullName: 'Dr Resume', email: 'resume@example.com' };
    renderRegister('/register');

    expect(screen.getByText(/resume provider setup/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/login');
      expect(screen.getByTestId('search')).toHaveTextContent('registered=provider-account');
    });

    renderRegister('/register');
    await fillRegisterForm();

    authAPI.register.mockResolvedValueOnce({ data: { userId: 15 } });
    fireEvent.click(screen.getByRole('button', { name: /create patient account/i }));

    await waitFor(() => expect(authAPI.register).toHaveBeenCalledWith({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      phone: '98765abc43210',
      role: 'Patient',
    }));
    expect(clearPendingProviderSignup).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/login');
      expect(screen.getByTestId('search')).toHaveTextContent('registered=patient');
    });
  });

  it('completes provider registration through add-phone, OTP, and login fallback branches', async () => {
    renderRegister('/register');
    fireEvent.click(screen.getByRole('button', { name: /provider/i }));
    expect(screen.getByRole('button', { name: /continue to provider setup/i })).toBeInTheDocument();

    await fillRegisterForm();
    authAPI.register.mockResolvedValue({ data: { userId: 99 } });

    authAPI.login.mockResolvedValueOnce({ data: { requiresPhone: true } });
    fireEvent.click(screen.getByRole('button', { name: /continue to provider setup/i }));
    await waitFor(() => expect(savePendingProviderSignup).toHaveBeenCalledWith({
      userId: 99,
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      phone: '98765abc43210',
      role: 'Provider',
    }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/add-phone'));

    renderRegister('/register');
    fireEvent.click(screen.getByRole('button', { name: /provider/i }));
    await fillRegisterForm();
    authAPI.login.mockResolvedValueOnce({ data: { otpSent: true } });
    fireEvent.click(screen.getByRole('button', { name: /continue to provider setup/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/otp'));

    renderRegister('/register');
    fireEvent.click(screen.getByRole('button', { name: /provider/i }));
    await fillRegisterForm();
    authAPI.login.mockResolvedValueOnce({ data: {} });
    fireEvent.click(screen.getByRole('button', { name: /continue to provider setup/i }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/login');
      expect(screen.getByTestId('search')).toHaveTextContent('registered=provider-account');
    });
  });

  it('shows registration errors from the backend', async () => {
    renderRegister('/register');
    await fillRegisterForm();

    authAPI.register.mockRejectedValueOnce({ response: { data: { message: 'Email already exists' } } });
    fireEvent.click(screen.getByRole('button', { name: /create patient account/i }));
    expect(await screen.findByText('Email already exists')).toBeInTheDocument();

    authAPI.register.mockRejectedValueOnce({});
    fireEvent.click(screen.getByRole('button', { name: /create patient account/i }));
    expect(await screen.findByText(/registration failed\. please review your details/i)).toBeInTheDocument();
  });
});
