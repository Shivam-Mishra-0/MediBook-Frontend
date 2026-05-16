import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  HeartPulse,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { authAPI, clearPendingProviderSignup, providerAPI, saveAuth } from '../../utils/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const GOOGLE_LOGIN_URL = `${API_BASE_URL}/oauth2/authorization/google`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState('');

  useEffect(() => {
    if (params.get('reset') === 'success') {
      setResetSuccess(true);
      const timer = setTimeout(() => setResetSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [params]);

  useEffect(() => {
    const registered = params.get('registered');
    if (registered === 'patient') {
      setRegistrationSuccess('Account created. Verify your OTP after login to continue.');
    } else if (registered === 'provider-account') {
      setRegistrationSuccess('Provider account created. Sign in to finish your provider profile after OTP verification.');
    } else if (registered === 'provider') {
      setRegistrationSuccess('Provider profile submitted. Sign in to access your workspace after OTP verification.');
    } else {
      setRegistrationSuccess('');
    }
  }, [params]);

  const handle = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const email = form.email.trim();
    const password = form.password.trim();

    if (!email || !password) {
      setError('Email and password are required.');
      setLoading(false);
      return;
    }

    try {
      const res = await authAPI.login({ email, password });

      if (res.data.requiresPhone === true) {
        const encodedEmail = encodeURIComponent(form.email);
        navigate(`/add-phone?email=${encodedEmail}`, { replace: true });
        return;
      }

      if (res.data.otpSent === true) {
        const encodedEmail = encodeURIComponent(form.email);
        navigate(`/otp?email=${encodedEmail}&source=normal`, { replace: true });
        return;
      }

      const { token, userId, fullName, role, email: responseEmail } = res.data;

      if (!token) {
        setError('Login failed: No token received.');
        setLoading(false);
        return;
      }

      if (!role || !userId) {
        setError('Login failed: Incomplete user data.');
        setLoading(false);
        return;
      }

      const user = {
        userId,
        email: responseEmail || form.email,
        fullName,
        role,
      };

      saveAuth(token, user);

      if (user.role === 'Patient') {
        navigate('/patient', { replace: true });
      } else if (user.role === 'Provider') {
        try {
          await providerAPI.getByUserId(user.userId);
          clearPendingProviderSignup();
          navigate('/provider', { replace: true });
        } catch (providerErr) {
          if (providerErr.response?.status === 404) {
            navigate('/provider/onboarding', { replace: true });
          } else {
            navigate('/provider', { replace: true });
          }
        }
      } else if (user.role === 'Admin') {
        navigate('/admin', { replace: true });
      } else {
        setError(`Unknown user role: ${user.role}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { label: 'Patient workspace', credentials: 'patient@demo.com / password123' },
    { label: 'Provider workspace', credentials: 'doctor@demo.com / password123' },
    { label: 'Admin workspace', credentials: 'admin@demo.com / password123' },
  ];

  return (
    <div className="auth-page">
      <div className="auth-left auth-left-rich">
        <div className="auth-showcase auth-showcase-wide">
          <span className="auth-kicker">
            <Sparkles size={14} />
            Secure sign in
          </span>

          <h1 className="auth-showcase-title">Everything you need for care, ready the moment you log in.</h1>
          <p className="auth-showcase-copy">
            Move from booking to records to provider workflow without losing context. MediBook keeps patients,
            providers, and admins on the same coordinated system.
          </p>

          <div className="auth-metric-grid">
            <div className="auth-metric-card">
              <div className="auth-metric-value">500+</div>
              <div className="auth-metric-label">Verified providers</div>
            </div>
            <div className="auth-metric-card">
              <div className="auth-metric-value">OTP</div>
              <div className="auth-metric-label">Protected access flow</div>
            </div>
            <div className="auth-metric-card">
              <div className="auth-metric-value">3</div>
              <div className="auth-metric-label">Role-based workspaces</div>
            </div>
          </div>

          <div className="auth-insight-grid">
            <div className="auth-insight-card">
              <div className="auth-insight-icon">
                <HeartPulse size={18} />
              </div>
              <div>
                <div className="auth-insight-title">Patients stay organized</div>
                <div className="auth-insight-copy">
                  Track appointments, payments, and follow-up records from one calm dashboard.
                </div>
              </div>
            </div>

            <div className="auth-insight-card">
              <div className="auth-insight-icon">
                <Stethoscope size={18} />
              </div>
              <div>
                <div className="auth-insight-title">Providers stay in control</div>
                <div className="auth-insight-copy">
                  Manage schedules, complete visits, and keep patient care moving without friction.
                </div>
              </div>
            </div>

            <div className="auth-insight-card">
              <div className="auth-insight-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="auth-insight-title">Admins stay informed</div>
                <div className="auth-insight-copy">
                  Review verification queues, monitor revenue, and send platform-wide updates confidently.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box">
          <div className="auth-panel">
            <div className="auth-panel-head">
              <div className="topnav-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                Medi<span>Book</span>
              </div>
              <div className="auth-step-pill">Role-aware access</div>
            </div>

            <div className="auth-panel-copy">
              <h2 className="auth-title">Sign in to your account</h2>
              <p className="auth-sub">Use your email and password to continue into your MediBook workspace.</p>
            </div>

            <div className="auth-form-meta">
              <span className="auth-meta-pill">Patients</span>
              <span className="auth-meta-pill">Providers</span>
              <span className="auth-meta-pill">Admins</span>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {resetSuccess && (
              <div className="alert alert-success">
                Password reset successful. Please login with your new password.
              </div>
            )}
            {registrationSuccess && <div className="alert alert-success">{registrationSuccess}</div>}

            <form onSubmit={submit} className="auth-form-stack">
              <div className="form-group">
                <label className="form-label">Email address</label>
                <div className="auth-input-shell">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    className="form-input auth-input-with-icon"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handle}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <label className="form-label">Password</label>
                  <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600 }}>
                    Forgot password?
                  </Link>
                </div>
                <div className="auth-input-shell">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    className="form-input auth-input-with-icon"
                    style={{ paddingRight: 46 }}
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handle}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((current) => !current)}
                    className="auth-ghost-button"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-note-card">
                <ShieldCheck size={16} />
                <span>Phone verification and OTP checks are applied automatically when your account requires them.</span>
              </div>

              <button type="submit" className="btn btn-primary w-full auth-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <ArrowRight size={16} />
                    Sign in
                  </>
                )}
              </button>

              <div className="auth-divider">
                <span></span>
                <strong>or</strong>
                <span></span>
              </div>

              <a href={GOOGLE_LOGIN_URL} className="auth-google-btn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </a>
            </form>

            <div className="auth-footer-line">
              <span>
                Do not have an account? <Link to="/register">Create one</Link>
              </span>
            </div>

            <div className="auth-demo-card">
              <div className="auth-demo-title">Quick demo access</div>
              <div className="auth-demo-grid">
                {demoAccounts.map((account) => (
                  <div key={account.label} className="auth-demo-pill">
                    <strong>{account.label}</strong>
                    <span>{account.credentials}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
