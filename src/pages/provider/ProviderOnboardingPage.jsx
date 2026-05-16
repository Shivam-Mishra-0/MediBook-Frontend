import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  Clock3,
  MapPin,
  ShieldCheck,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import {
  clearPendingProviderSignup,
  getUser,
  providerAPI,
} from '../../utils/api';

const INITIAL_FORM = {
  specialization: '',
  qualification: '',
  experienceYears: '',
  clinicName: '',
  clinicAddress: '',
  bio: '',
};

const getHomePath = (role) => {
  if (role === 'Patient') return '/patient';
  if (role === 'Admin') return '/admin';
  return '/';
};

export default function ProviderOnboardingPage() {
  const navigate = useNavigate();
  const authUser = getUser();
  const providerUserId = Number(authUser?.role === 'Provider' ? authUser.userId : 0);
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(
    Boolean(authUser?.role === 'Provider' && providerUserId)
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (authUser?.role && authUser.role !== 'Provider') {
      navigate(getHomePath(authUser.role), { replace: true });
      return;
    }

    if (!authUser) {
      navigate('/login?registered=provider-account', { replace: true });
    }
  }, [authUser, authUser?.role, navigate, providerUserId]);

  useEffect(() => {
    if (authUser?.role !== 'Provider' || !providerUserId) {
      setCheckingProfile(false);
      return;
    }

    let active = true;
    providerAPI.getByUserId(providerUserId)
      .then(() => {
        if (!active) return;
        clearPendingProviderSignup();
        navigate('/provider', { replace: true });
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status !== 404) {
          console.warn('Provider profile lookup failed:', err);
        }
        setCheckingProfile(false);
      });

    return () => {
      active = false;
    };
  }, [authUser?.role, navigate, providerUserId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await providerAPI.register({
        userId: providerUserId,
        specialization: form.specialization.trim(),
        qualification: form.qualification.trim(),
        experienceYears: Number(form.experienceYears) || 0,
        clinicName: form.clinicName.trim(),
        clinicAddress: form.clinicAddress.trim(),
        bio: form.bio.trim(),
      });

      clearPendingProviderSignup();

      if (authUser?.role === 'Provider') {
        navigate('/provider', { replace: true });
        return;
      }

      navigate('/login?registered=provider', { replace: true });
    } catch (err) {
      if (err.response?.status === 409) {
        clearPendingProviderSignup();
        navigate(authUser?.role === 'Provider' ? '/provider' : '/login', { replace: true });
        return;
      }

      setError(err.response?.data?.message || 'Unable to save your provider profile right now.');
    } finally {
      setLoading(false);
    }
  };

  if (!authUser || (authUser?.role && authUser.role !== 'Provider') || !providerUserId) {
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-left auth-left-rich">
        <div className="auth-showcase">
          <span className="auth-kicker">
            <Sparkles size={14} />
            Provider onboarding
          </span>
          <h1 className="auth-showcase-title">Set up the profile patients will trust.</h1>
          <p className="auth-showcase-copy">
            Add your specialty, credentials, and clinic details once. MediBook will keep the rest of your provider
            journey organized from verification to bookings.
          </p>

          <div className="auth-insight-grid">
            {[
              {
                icon: <ShieldCheck size={18} />,
                title: 'Admin-reviewed',
                copy: 'Every provider profile stays private until verification is complete.',
              },
              {
                icon: <BadgeCheck size={18} />,
                title: 'Professional identity',
                copy: 'Show patients your qualifications, experience, and clinic location clearly.',
              },
              {
                icon: <Clock3 size={18} />,
                title: 'Fast start',
                copy: 'This takes about two minutes and unlocks the full provider workspace.',
              },
            ].map((item) => (
              <div key={item.title} className="auth-insight-card">
                <div className="auth-insight-icon">{item.icon}</div>
                <div>
                  <div className="auth-insight-title">{item.title}</div>
                  <div className="auth-insight-copy">{item.copy}</div>
                </div>
              </div>
            ))}
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
              <div className="auth-step-pill">Final step</div>
            </div>

            <div className="auth-panel-copy">
              <h2 className="auth-title">Complete your provider profile</h2>
              <p className="auth-sub">
                {authUser?.fullName || 'Provider'} will appear for admin review once these details are submitted.
              </p>
            </div>

            <div className="auth-profile-strip">
              <div className="auth-profile-badge">
                <Stethoscope size={18} />
              </div>
              <div>
                <div className="auth-profile-name">{authUser?.fullName || 'New provider account'}</div>
                <div className="auth-profile-email">{authUser?.email || 'Professional account setup'}</div>
              </div>
            </div>

            {error && <div className="alert alert-error mb-4">{error}</div>}

            {checkingProfile ? (
              <div className="auth-checking-card">
                <span className="spinner spinner-dark" />
                <div>
                  <div className="auth-checking-title">Checking your current provider setup</div>
                  <div className="auth-checking-copy">If a profile already exists, we will send you to the dashboard.</div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="auth-form-stack">
                <div className="auth-form-grid">
                  <div className="form-group">
                    <label className="form-label">Specialization</label>
                    <div className="auth-input-shell">
                      <Briefcase size={16} className="auth-input-icon" />
                      <input
                        className="form-input auth-input-with-icon"
                        name="specialization"
                        placeholder="Cardiology, Pediatrics, Dermatology"
                        value={form.specialization}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Qualification</label>
                    <div className="auth-input-shell">
                      <BadgeCheck size={16} className="auth-input-icon" />
                      <input
                        className="form-input auth-input-with-icon"
                        name="qualification"
                        placeholder="MBBS, MD, Fellowship"
                        value={form.qualification}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="auth-form-grid">
                  <div className="form-group">
                    <label className="form-label">Experience in years</label>
                    <div className="auth-input-shell">
                      <Clock3 size={16} className="auth-input-icon" />
                      <input
                        className="form-input auth-input-with-icon"
                        type="number"
                        name="experienceYears"
                        min="0"
                        max="60"
                        placeholder="8"
                        value={form.experienceYears}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Clinic name</label>
                    <div className="auth-input-shell">
                      <Building2 size={16} className="auth-input-icon" />
                      <input
                        className="form-input auth-input-with-icon"
                        name="clinicName"
                        placeholder="City Care Clinic"
                        value={form.clinicName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Clinic address</label>
                  <div className="auth-input-shell">
                    <MapPin size={16} className="auth-input-icon auth-input-icon-top" />
                    <textarea
                      className="form-textarea auth-input-with-icon"
                      name="clinicAddress"
                      placeholder="Building, road, area, city"
                      value={form.clinicAddress}
                      onChange={handleChange}
                      required
                      style={{ minHeight: 96 }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Professional bio</label>
                  <textarea
                    className="form-textarea"
                    name="bio"
                    placeholder="Share your care focus, patient approach, or clinical interests."
                    value={form.bio}
                    onChange={handleChange}
                    style={{ minHeight: 110 }}
                  />
                </div>

                <div className="auth-note-card">
                  <ShieldCheck size={16} />
                  <span>Your profile stays hidden from patient search until an admin verifies it.</span>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={loading}
                  style={{ justifyContent: 'center', padding: '13px 16px' }}
                >
                  {loading ? <span className="spinner" /> : <><ArrowRight size={16} /> Submit provider profile</>}
                </button>
              </form>
            )}

            <div className="auth-footer-line">
              {authUser?.role === 'Provider' ? (
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
                  Back to home
                </button>
              ) : (
                <span>
                  Need to adjust your account details? <Link to="/register">Start over</Link>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
