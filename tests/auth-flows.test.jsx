import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddPhonePage from '../src/pages/auth/AddPhonePage';
import ForgotPasswordPage from '../src/pages/auth/ForgotPasswordPage';
import OAuth2Callback from '../src/pages/auth/OAuth2Callback';
import OAuth2SelectRole from '../src/pages/auth/OAuth2SelectRole';
import OtpPage from '../src/pages/auth/OtpPage';
import ResetPasswordPage from '../src/pages/auth/ResetPasswordPage';

const authFlowMocks = vi.hoisted(() => ({
  clearPendingProviderSignup: vi.fn(),
  providerAPI: {
    getByUserId: vi.fn(),
  },
  saveAuth: vi.fn(),
}));

const clearPendingProviderSignup = authFlowMocks.clearPendingProviderSignup;
const providerAPI = authFlowMocks.providerAPI;
const saveAuth = authFlowMocks.saveAuth;

vi.mock('../src/utils/api', () => ({
  clearPendingProviderSignup: authFlowMocks.clearPendingProviderSignup,
  providerAPI: authFlowMocks.providerAPI,
  saveAuth: authFlowMocks.saveAuth,
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

function renderPage(route, path, element) {
  cleanup();
  window.history.replaceState({}, '', route);
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );
}

async function pasteOtp(code, inputIndex = 0) {
  const inputs = screen.getAllByRole('textbox');
  fireEvent.paste(inputs[inputIndex], {
    clipboardData: {
      getData: () => code,
    },
  });
}

describe('auth utility pages', () => {
  beforeEach(() => {
    vi.useRealTimers();
    global.fetch = vi.fn();
    saveAuth.mockReset();
    clearPendingProviderSignup.mockReset();
    providerAPI.getByUserId.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('validates forgot-password input and handles success plus failure responses', async () => {
    renderPage('/forgot-password', '/forgot-password', <ForgotPasswordPage />);

    await userEvent.type(screen.getByPlaceholderText(/you@example\.com/i), '   ');
    fireEvent.submit(screen.getByRole('button', { name: /send reset link/i }).closest('form'));
    expect(await screen.findByText('Please enter your email address.')).toBeInTheDocument();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'sent' }),
    });
    await userEvent.clear(screen.getByPlaceholderText(/you@example\.com/i));
    await userEvent.type(screen.getByPlaceholderText(/you@example\.com/i), 'patient@example.com');
    fireEvent.submit(screen.getByRole('button', { name: /send reset link/i }).closest('form'));

    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/patient@example\.com/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'));

    renderPage('/forgot-password', '/forgot-password', <ForgotPasswordPage />);
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'No account found' }),
    });
    await userEvent.type(screen.getByPlaceholderText(/you@example\.com/i), 'missing@example.com');
    fireEvent.submit(screen.getByRole('button', { name: /send reset link/i }).closest('form'));
    expect(await screen.findByText('No account found')).toBeInTheDocument();
  });

  it('handles reset-password invalid links, OTP verification, password validation, and success', async () => {
    renderPage('/reset-password', '/reset-password', <ResetPasswordPage />);
    expect(screen.getByText(/invalid or expired link/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /request new link/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/forgot-password'));

    renderPage('/reset-password?token=abc123', '/reset-password', <ResetPasswordPage />);
    const otpInputs = screen.getAllByRole('textbox');
    fireEvent.change(otpInputs[0], { target: { value: 'x' } });
    expect(otpInputs[0]).toHaveValue('');

    fireEvent.change(otpInputs[0], { target: { value: '1' } });
    fireEvent.change(otpInputs[1], { target: { value: '2' } });
    fireEvent.keyDown(otpInputs[1], { key: 'Backspace' });
    expect(otpInputs[1]).toHaveValue('');

    await pasteOtp('123456');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ verified: true }),
    });

    fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));
    expect(await screen.findByText(/set new password/i)).toBeInTheDocument();

    const newPasswordInput = screen.getByPlaceholderText(/at least 6 characters/i);
    const confirmPasswordInput = screen.getByPlaceholderText(/confirm your password/i);

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(newPasswordInput).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getAllByRole('button')[1]);
    expect(confirmPasswordInput).toHaveAttribute('type', 'text');

    await userEvent.type(newPasswordInput, '   ');
    await userEvent.type(confirmPasswordInput, '   ');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    expect(await screen.findByText('Please enter a new password')).toBeInTheDocument();

    await userEvent.clear(newPasswordInput);
    await userEvent.clear(confirmPasswordInput);
    await userEvent.type(newPasswordInput, '123');
    await userEvent.type(confirmPasswordInput, '123');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();

    await userEvent.clear(newPasswordInput);
    await userEvent.clear(confirmPasswordInput);
    await userEvent.type(newPasswordInput, 'password123');
    await userEvent.type(confirmPasswordInput, 'password321');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    await userEvent.clear(confirmPasswordInput);
    await userEvent.type(confirmPasswordInput, 'password123');
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/login');
      expect(screen.getByTestId('search')).toHaveTextContent('reset=success');
    });
  });

  it('shows reset-password expiry and backend failures', async () => {
    vi.useFakeTimers();
    renderPage('/reset-password?token=expiring', '/reset-password', <ResetPasswordPage />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900000);
    });
    expect(screen.getByText(/reset link expired/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /request new link/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/forgot-password');

    renderPage('/reset-password?token=broken', '/reset-password', <ResetPasswordPage />);
    await pasteOtp('654321');
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'OTP verification failed' }),
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));
      await Promise.resolve();
    });
    expect(screen.getByText('OTP verification failed')).toBeInTheDocument();
  });

  it('sanitizes and submits phone numbers before continuing to OTP', async () => {
    renderPage('/add-phone?email=user@example.com', '/add-phone', <AddPhonePage />);

    const input = screen.getByPlaceholderText('9876543210');
    await userEvent.type(input, '98a76b543210999');
    expect(input).toHaveValue('9876543210');
    expect(screen.getByText('10/10 digits entered')).toBeInTheDocument();

    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Phone already exists' }),
    });
    fireEvent.click(screen.getByRole('button', { name: /save & continue/i }));
    expect(await screen.findByText('Phone already exists')).toBeInTheDocument();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    fireEvent.click(screen.getByRole('button', { name: /save & continue/i }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/otp');
      expect(screen.getByTestId('search')).toHaveTextContent('email=user%40example.com');
    });
  });

  it('lets the add-phone brand link navigate home', async () => {
    renderPage('/add-phone?email=user@example.com', '/add-phone', <AddPhonePage />);

    await userEvent.type(screen.getByPlaceholderText('9876543210'), '12345');
    fireEvent.click(screen.getByText(/medi/i));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('verifies OTP for patients and resolves next-route branches for providers', async () => {
    renderPage('/otp?email=patient@example.com&name=Pat%20Demo', '/otp', <OtpPage />);
    expect(screen.getByText(/pa\*\*\*\*\*@example\.com/i)).toBeInTheDocument();

    await pasteOtp('123456');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'jwt',
        userId: 10,
        fullName: 'Pat Demo',
        role: 'Patient',
        email: 'patient@example.com',
      }),
    });
    fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));
    expect(await screen.findByText(/otp verified! redirecting/i)).toBeInTheDocument();
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(screen.getByTestId('location')).toHaveTextContent('/patient');
    expect(saveAuth).toHaveBeenCalledWith('jwt', {
      userId: 10,
      fullName: 'Pat Demo',
      role: 'Patient',
      email: 'patient@example.com',
    });

    renderPage('/otp?email=doctor@example.com', '/otp', <OtpPage />);
    await pasteOtp('654321');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'jwt2',
        userId: 11,
        fullName: 'Doctor Demo',
        role: 'Provider',
        email: 'doctor@example.com',
      }),
    });
    providerAPI.getByUserId.mockRejectedValueOnce({ response: { status: 404 } });
    fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(screen.getByTestId('location')).toHaveTextContent('/provider/onboarding');

    renderPage('/otp?email=doctor2@example.com', '/otp', <OtpPage />);
    await pasteOtp('777777');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        token: 'jwt3',
        userId: 12,
        fullName: 'Doctor Demo',
        role: 'Provider',
        email: 'doctor2@example.com',
      }),
    });
    providerAPI.getByUserId.mockRejectedValueOnce({ response: { status: 500 } });
    fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(screen.getByTestId('location')).toHaveTextContent('/provider');
    expect(console.warn).toHaveBeenCalled();
  });

  it('surfaces OTP verification errors and allows resending after expiry', async () => {
    vi.useFakeTimers();
    renderPage('/otp?email=oops@example.com', '/otp', <OtpPage />);

    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: '1' } });
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: '2' } });
    fireEvent.keyDown(screen.getAllByRole('textbox')[1], { key: 'Backspace' });
    expect(screen.getAllByRole('textbox')[1]).toHaveValue('');

    await pasteOtp('111111');
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ role: 'Mystery' }),
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify & continue/i }));
      await Promise.resolve();
    });
    expect(screen.getByText('Invalid response from server')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300000);
    });
    expect(screen.getByRole('button', { name: /resend otp/i })).toBeInTheDocument();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ resent: true }),
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /resend otp/i }));
      await Promise.resolve();
    });
    expect(screen.getByText(/otp resent!/i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(screen.queryByText(/otp resent!/i)).not.toBeInTheDocument();
  });

  it('lets users leave OTP verification through the brand link', async () => {
    renderPage('/otp?email=ab@example.com', '/otp', <OtpPage />);

    expect(screen.getByText(/ab@example\.com/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/medi/i));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });

  it('handles OAuth callback success and error flows', async () => {
    renderPage('/oauth2/callback', '/oauth2/callback', <OAuth2Callback />);
    expect(await screen.findByText(/missing authentication parameters/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'));

    renderPage('/oauth2/callback?token=abc&userId=7&role=Patient&name=Jane%20Doe', '/oauth2/callback', <OAuth2Callback />);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/patient'));
    expect(saveAuth).toHaveBeenCalledWith('abc', {
      userId: 7,
      fullName: 'Jane Doe',
      role: 'Patient',
    });

    renderPage('/oauth2/callback?token=abc&userId=8&role=Admin&name=Admin%20Demo', '/oauth2/callback', <OAuth2Callback />);
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/admin'));

    renderPage('/oauth2/callback?token=abc&userId=9&role=Mystery', '/oauth2/callback', <OAuth2Callback />);
    expect(await screen.findByText(/unknown role: mystery/i)).toBeInTheDocument();
  });

  it('selects an OAuth role, continues to OTP, and reports completion failures', async () => {
    renderPage(
      '/oauth2/select-role?email=user@example.com&name=Jane%20Doe&picture=https%3A%2F%2Fimg.test%2Favatar.png&provider=google',
      '/oauth2/select-role',
      <OAuth2SelectRole />
    );

    expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled();
    fireEvent.click(screen.getByText(/i am a patient/i));
    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ complete: true }),
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/otp');
      expect(screen.getByTestId('search')).toHaveTextContent('source=google');
      expect(screen.getByTestId('search')).toHaveTextContent('name=Jane%20Doe');
    });

    renderPage(
      '/oauth2/select-role?email=doc@example.com&name=Doctor%20Demo&provider=google',
      '/oauth2/select-role',
      <OAuth2SelectRole />
    );

    fireEvent.click(screen.getByText(/doctor \/ provider/i));
    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Failed to complete registration' }),
    });
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    expect(await screen.findByText('Failed to complete registration')).toBeInTheDocument();
  });
});
