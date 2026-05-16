import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  Eye,
  HeartPulse,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Video,
} from 'lucide-react';
import medicalLogo from '../assets/medical-logo.png';
import { PublicNav } from '../components/Layout';

const SPECIALIZATIONS = [
  { name: 'Cardiology', icon: HeartPulse },
  { name: 'Neurology', icon: Brain },
  { name: 'Ophthalmology', icon: Eye },
  { name: 'General Care', icon: Stethoscope },
  { name: 'Diagnostics', icon: Activity },
  { name: 'Online Consults', icon: Video },
];

const FEATURES = [
  {
    icon: Search,
    title: 'Precision Doctor Discovery',
    desc: 'Search by specialty, symptoms, availability, and consultation style with a cleaner, faster path to the right provider.',
  },
  {
    icon: CalendarClock,
    title: 'Instant Smart Booking',
    desc: 'Surface high-intent appointment slots first so patients move from search to confirmation with almost no friction.',
  },
  {
    icon: ShieldCheck,
    title: 'Protected Health Experience',
    desc: 'Appointments, records, and sensitive profile actions stay inside a secure interface built to feel calm and trustworthy.',
  },
];

const JOURNEY_STEPS = [
  {
    num: '01',
    title: 'Discover',
    desc: 'Browse trusted providers, compare profiles, and search with symptoms or specializations.',
  },
  {
    num: '02',
    title: 'Connect',
    desc: 'Pick an in-clinic or virtual slot and lock in a smooth appointment flow in seconds.',
  },
  {
    num: '03',
    title: 'Continue Care',
    desc: 'Track follow-ups, revisit records, and keep your healthcare journey organized in one place.',
  },
];

const TRUST_METRICS = [
  { value: '500+', label: 'Verified doctors' },
  { value: '50k+', label: 'Care journeys started' },
  { value: '20+', label: 'Specialty lanes' },
  { value: '4.8', label: 'Average patient rating' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/find-doctors${search ? `?q=${encodeURIComponent(search)}` : ''}`);
  };

  return (
    <div className="landing-page">
      <PublicNav />

      <section className="hero hero-premium">
        <div className="hero-noise" aria-hidden="true" />
        <div className="container hero-premium-grid">
          <div className="hero-content">
            <div className="hero-tag">
              <CheckCircle2 size={14} />
              Trusted digital care for modern patients
            </div>

            <div className="hero-brand-lockup">
              <span className="hero-brand-chip">
                <Sparkles size={14} />
                MediBook
              </span>
              <span className="hero-brand-line" />
            </div>

            <h1 className="hero-title hero-title-premium">
              Dedicated to Your Health,
              <br />
              <span>Every Step of the Way</span>
            </h1>

            <p className="hero-sub hero-sub-premium">
              A polished healthcare experience with smart search, cleaner decision paths, and a premium visual rhythm across light and dark themes.
            </p>

            <form onSubmit={handleSearch} className="hero-search hero-search-premium">
              <Search size={18} className="hero-search-icon" />
              <input
                type="text"
                placeholder="Search doctors, symptoms, clinics, or specialties"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-search-glow">
                Start Search
              </button>
            </form>

            <div className="hero-inline-pills stagger-children">
              <button className="hero-inline-pill animate-fade-up" onClick={() => navigate('/find-doctors?mode=video')} type="button">
                <Video size={16} />
                Video Consult
              </button>
              <button className="hero-inline-pill animate-fade-up" onClick={() => navigate('/find-doctors?sort=rating')} type="button">
                <Star size={16} />
                Top Rated
              </button>
              <button className="hero-inline-pill animate-fade-up" onClick={() => navigate('/find-doctors?nearby=true')} type="button">
                <MapPin size={16} />
                Nearby Clinics
              </button>
            </div>

            <div className="hero-stats hero-stats-premium">
              {TRUST_METRICS.map((item) => (
                <div key={item.label} className="hero-stat-card">
                  <div className="hero-stat-num">
                    {item.value}
                    {item.label.includes('rating') && <span className="hero-stat-star">★</span>}
                  </div>
                  <div className="hero-stat-label">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual animate-scale">
            <div className="hero-visual-panel hero-visual-panel-main">
              <div className="hero-visual-topline">
                <span className="status-dot" />
                Live care network
              </div>
              <div className="hero-visual-title">MediBook</div>
              <p className="hero-visual-copy">
                Streamlined appointments, digital-first trust, and a stronger visual identity built for a modern medical platform.
              </p>

              <div className="hero-signal-stack">
                <div className="hero-signal-card">
                  <div>
                    <p>Doctor match score</p>
                    <strong>94%</strong>
                  </div>
                  <span>Fast route</span>
                </div>
                <div className="hero-signal-card">
                  <div>
                    <p>Average booking time</p>
                    <strong>2 min</strong>
                  </div>
                  <span>Low friction</span>
                </div>
              </div>

              <div className="hero-floating-review">
                <Star size={16} fill="currentColor" />
                <div>
                  <strong>Patient-first experience</strong>
                  <p>Clean navigation, faster choice, better confidence.</p>
                </div>
              </div>
            </div>

            <div className="hero-visual-panel hero-visual-panel-side">
              <div className="hero-side-label">Experience layers</div>
              <div className="hero-side-list">
                <div>
                  <span>01</span>
                  Motion-led hero
                </div>
                <div>
                  <span>02</span>
                  Theme-aware cards
                </div>
                <div>
                  <span>03</span>
                  Distinct brand treatment
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-surface">
        <div className="container">
          <div className="section-heading-row">
            <div>
              <div className="section-kicker">Focused pathways</div>
              <h2 className="section-title">Browse care lanes with a cleaner visual system</h2>
            </div>
            <p className="section-copy">
              A more premium structure makes it easier to scan specialties quickly while keeping the homepage visually distinct.
            </p>
          </div>

          <div className="spec-grid spec-grid-premium stagger-children">
            {SPECIALIZATIONS.map((spec) => {
              const Icon = spec.icon;
              return (
                <button
                  key={spec.name}
                  className="spec-pill spec-pill-premium animate-fade-up"
                  onClick={() => navigate(`/find-doctors?spec=${encodeURIComponent(spec.name)}`)}
                  type="button"
                >
                  <span className="spec-pill-icon spec-pill-icon-premium">
                    <Icon size={24} />
                  </span>
                  <span className="spec-pill-name">{spec.name}</span>
                  <span className="spec-pill-meta">Explore doctors</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="showcase-banner">
            <div>
              <div className="section-kicker">Brand refresh</div>
              <h2 className="section-title">A homepage that feels more original, premium, and alive</h2>
            </div>
            <div className="showcase-marquee" aria-hidden="true">
              <span>MediBook</span>
              <span>Digital Health</span>
              <span>Seamless Appointments</span>
              <span>Trusted Care</span>
            </div>
          </div>

          <div className="grid-3">
            {JOURNEY_STEPS.map((step) => (
              <div key={step.num} className="card journey-card">
                <div className="journey-step">{step.num}</div>
                <h3 className="journey-title">{step.title}</h3>
                <p className="journey-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-surface-alt">
        <div className="container">
          <div className="text-center mb-4">
            <div className="section-kicker">Platform strengths</div>
            <h2 className="section-title">Everything important stays visible, fast, and intuitive</h2>
            <p className="section-sub">Designed to feel modern without losing the trust expected from a healthcare product.</p>
          </div>
          <div className="grid-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="feature-card feature-card-premium">
                  <div className="feature-icon feature-icon-premium">
                    <Icon size={24} />
                  </div>
                  <h3 className="feature-title">{feature.title}</h3>
                  <p className="feature-desc">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta-shell">
            <div>
              <div className="section-kicker">Ready when you are</div>
              <h2 className="cta-title">Move MediBook from basic to memorable</h2>
              <p className="cta-copy">
                Help patients feel confident from the first screen with a stronger visual voice, smoother motion, and a refined booking funnel.
              </p>
            </div>
            <div className="cta-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                Create Account
                <ArrowRight size={18} />
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => navigate('/find-doctors')}>
                Browse Doctors
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container landing-footer-inner">
          <div>
            <div className="footer-brand">
              <span className="brand-emblem"><img src={medicalLogo} alt="" className="medical-brand-icon" /></span>
              Medi<span>Book</span>
            </div>
            <p className="footer-copy">Book smarter. Feel calmer. Stay connected to care.</p>
          </div>
          <p className="footer-meta">© 2026 MediBook Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
