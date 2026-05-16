import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  HeartPulse,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
} from 'lucide-react';
import {
  authAPI,
  clearPendingProviderSignup,
  getPendingProviderSignup,
  savePendingProviderSignup,
} from '../../utils/api';

const GOOGLE_LOGIN_URL = 'http://localhost:8080/oauth2/authorization/google';

const ROLE_OPTIONS = [
  {
    id: 'Patient',
    title: 'Patient',
    caption: 'Book appointments, manage records, and stay on top of your care plan.',
    icon: <HeartPulse size={18} />,
  },
  {
    id: 'Provider',
    title: 'Provider',
    caption: 'Launch your profile, manage availability, and operate your practice flow.',
    icon: <Stethoscope size={18} />,
  },
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState('Patient');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pendingProviderSignup = useMemo(() => getPendingProviderSignup(), []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const registerUser = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    const payload = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      phone: form.phone.trim(),
      role,
    };

    try {
      const response = await authAPI.register(payload);

      if (role === 'Provider') {
        savePendingProviderSignup({
          userId: response.data.userId,
          fullName: payload.fullName,
          email: payload.email,
          phone: payload.phone,
          role: 'Provider',
        });

        const loginResponse = await authAPI.login({
          email: payload.email,
          password: payload.password,
        });

        const encodedEmail = encodeURIComponent(payload.email);
        if (loginResponse.data.requiresPhone === true) {
          navigate(`/add-phone?email=${encodedEmail}`, { replace: true });
          return;
        }

        if (loginResponse.data.otpSent === true) {
          navigate(`/otp?email=${encodedEmail}&source=normal`, { replace: true });
          return;
        }

        navigate('/login?registered=provider-account', { replace: true });
        return;
      }

      clearPendingProviderSignup();
      navigate('/login?registered=patient', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please review your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  const progressSteps = role === 'Provider'
    ? [
        'Create your account with email and password.',
        'Verify access through OTP or phone confirmation if prompted.',
        'Complete your provider profile and wait for admin verification.',
      ]
    : [
        'Create your account with your basic details.',
        'Verify your access through OTP if prompted.',
        'Sign in and start booking care immediately.',
      ];

  return (
    <div className="auth-page">
      <div className="auth-left auth-left-rich">
        <div className="auth-showcase auth-showcase-wide">
          <span className="auth-kicker">
            <Sparkles size={14} />
            Join MediBook
          </span>

          <h1 className="auth-showcase-title">Choose your role once. Unlock the right workflow from day one.</h1>
          <p className="auth-showcase-copy">
            Patients get a faster path to appointments and records. Providers get a guided setup that leads directly
            into profile completion and verification.
          </p>

          <div className="auth-metric-grid">
            <div className="auth-metric-card">
              <div className="auth-metric-value">2</div>
              <div className="auth-metric-label">Primary account types</div>
            </div>
            <div className="auth-metric-card">
              <div className="auth-metric-value">1</div>
              <div className="auth-metric-label">Shared secure identity flow</div>
            </div>
            <div className="auth-metric-card">
              <div className="auth-metric-value">24/7</div>
              <div className="auth-metric-label">Access to your workspace</div>
            </div>
          </div>

          <div className="auth-insight-grid">
            <div className="auth-insight-card">
              <div className="auth-insight-icon">
                <HeartPulse size={18} />
              </div>
              <div>
                <div className="auth-insight-title">Patient-ready in minutes</div>
                <div className="auth-insight-copy">
                  Search doctors, review appointment history, and keep your records nearby from the first login.
                </div>
              </div>
            </div>

            <div className="auth-insight-card">
              <div className="auth-insight-icon">
                <Stethoscope size={18} />
              </div>
              <div>
                <div className="auth-insight-title">Provider onboarding with context</div>
                <div className="auth-insight-copy">
                  Finish signup, continue to profile setup, and prepare your clinic details without losing progress.
                </div>
              </div>
            </div>

            <div className="auth-insight-card">
              <div className="auth-insight-icon">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="auth-insight-title">Security built into every step</div>
                <div className="auth-insight-copy">
                  OTP checks and role-based routing keep each account flow protected and predictable.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-box auth-box-wide">
          <div className="auth-panel">
            <div className="auth-panel-head">
              <div className="topnav-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                Medi<span>Book</span>
              </div>
              <div className="auth-step-pill">
                {role === 'Provider' ? 'Provider setup path' : 'Patient quick start'}
              </div>
            </div>

            <div className="auth-panel-copy">
              <h2 className="auth-title">Create your account</h2>
              <p className="auth-sub">Pick your role, enter your details, and continue with the right onboarding flow.</p>
            </div>

            {pendingProviderSignup && (
              <div className="auth-resume-card">
                <div>
                  <div className="auth-resume-title">Resume provider setup</div>
                  <div className="auth-resume-copy">
                    {pendingProviderSignup.fullName || pendingProviderSignup.email || 'Your provider account'} is ready
                    for profile completion.
                  </div>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => navigate('/login?registered=provider-account')}>
                  Continue
                </button>
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={registerUser} className="auth-form-stack">
              <div className="auth-role-grid">
                {ROLE_OPTIONS.map((option) => {
                  const active = role === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`auth-role-card ${active ? 'active' : ''}`}
                      onClick={() => setRole(option.id)}
                    >
                      <span className="auth-role-icon">{option.icon}</span>
                      <span className="auth-role-title">{option.title}</span>
                      <span className="auth-role-copy">{option.caption}</span>
                    </button>
                  );
                })}
              </div>

              <div className="auth-form-grid">
                <div className="form-group">
                  <label className="form-label">Full name</label>
                  <div className="auth-input-shell">
                    <User size={16} className="auth-input-icon" />
                    <input
                      className="form-input auth-input-with-icon"
                      type="text"
                      name="fullName"
                      placeholder="Your full name"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone number</label>
                  <div className="auth-input-shell">
                    <Phone size={16} className="auth-input-icon" />
                    <input
                      className="form-input auth-input-with-icon"
                      type="tel"
                      name="phone"
                      placeholder="+91 98765 43210"
                      value={form.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

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
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="auth-input-shell">
                  <Lock size={16} className="auth-input-icon" />
                  <input
                    className="form-input auth-input-with-icon"
                    type="password"
                    name="password"
                    placeholder="Minimum 6 characters"
                    value={form.password}
                    onChange={handleChange}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <div className="auth-note-card">
                <ShieldCheck size={16} />
                <span>
                  {role === 'Provider'
                    ? 'Your provider profile setup continues right after account creation.'
                    : 'Patients can move directly into sign-in after verification.'}
                </span>
              </div>

              <div className="auth-progress-list">
                {progressSteps.map((step, index) => (
                  <div key={step} className="auth-progress-item">
                    <span className="auth-progress-index">{index + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              <button type="submit" className="btn btn-primary w-full auth-submit-btn" disabled={loading}>
                {loading ? (
                  <span className="spinner" />
                ) : (
                  <>
                    <ArrowRight size={16} />
                    {role === 'Provider' ? 'Continue to provider setup' : 'Create patient account'}
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
                Already have an account? <Link to="/login">Sign in</Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
