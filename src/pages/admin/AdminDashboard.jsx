import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CircleDollarSign,
  Megaphone,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { AdminSidebar, Loader, StatusBadge, Topbar } from '../../components/Layout';
import { getUser, notifAPI, paymentAPI, providerAPI } from '../../utils/api';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getUser();

  // ── Sidebar state now managed by SidebarProvider context in Layout.jsx

  const [providers, setProviders] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notifForm, setNotifForm] = useState({ title: '', message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Promise.all([providerAPI.getAll(), paymentAPI.getTotalRevenue()])
      .then(([prov, rev]) => {
        setProviders(prov.data || []);
        setRevenue(rev.data.totalRevenue || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sendPlatformNotif = async () => {
    if (!notifForm.title || !notifForm.message) return;
    setSending(true);
    try {

      const userRes = await authAPI.getAllUsers();
      const allIds = UNSAFE_useScrollRestoration.data.map(u => u.userId);
      
      await notifAPI.broadcast({
        // recipientId: user.userId,
        // type: 'BOOKING',
        title: notifForm.title,
        message: notifForm.message,
        // channel: 'APP',
      });
      setNotifForm({ title: '', message: '' });
      alert('Platform notification sent!');
    } catch (error) {
      alert('Failed to send notification.');
    } finally {
      setSending(false);
    }
  };

  const pendingVerification = providers.filter((provider) => !provider.isVerified);
  const verifiedProviders = providers.length - pendingVerification.length;
  const verificationRate = providers.length
    ? Math.round((verifiedProviders / providers.length) * 100)
    : 0;
  const platformRevenue = Math.round(revenue * 0.1);

  const stats = [
    { icon: <Users size={22} />,          label: 'Total providers', value: providers.length,                      cls: 'stat-icon-blue',   path: '/admin/providers' },
    { icon: <ShieldAlert size={22} />,    label: 'Pending review',  value: pendingVerification.length,            cls: 'stat-icon-yellow', path: '/admin/providers' },
    { icon: <CircleDollarSign size={22} />, label: 'Total revenue', value: `Rs ${revenue.toLocaleString()}`,      cls: 'stat-icon-green',  path: '/admin/payments' },
    { icon: <TrendingUp size={22} />,     label: 'Platform share',  value: `Rs ${platformRevenue.toLocaleString()}`, cls: 'stat-icon-red', path: '/admin/payments' },
  ];

  const actions = [
    { icon: <Users size={20} />,      label: 'Manage users',     sub: 'Review accounts, access, and account health.',          path: '/admin/users' },
    { icon: <UserCheck size={20} />,  label: 'Verify providers', sub: 'Approve clinic identities and credential details.',      path: '/admin/providers' },
    { icon: <CalendarDays size={20} />, label: 'Appointments',   sub: 'Inspect booking activity across the platform.',          path: '/admin/appointments' },
    { icon: <CircleDollarSign size={20} />, label: 'Payments',   sub: 'Track revenue, refunds, and financial activity.',        path: '/admin/payments' },
  ];

  return (
    <div className="dashboard-layout">
      <AdminSidebar />

      <div className="dashboard-main">
        <Topbar title="Admin Dashboard" />
        <div className="page-content fade-in">
          <div className="dashboard-page">
            <section className="dashboard-hero dashboard-hero-admin">
              <div className="dashboard-hero-content">
                <span className="dashboard-kicker">
                  <ShieldCheck size={15} />
                  Platform control
                </span>
                <h1 className="dashboard-hero-title">Run the platform with a clearer view of trust, growth, and action.</h1>
                <p className="dashboard-hero-copy">
                  Keep provider verification, revenue movement, and broadcast communication in one modern control
                  surface built for fast decision-making.
                </p>

                <div className="dashboard-hero-actions">
                  <button className="btn btn-primary" onClick={() => navigate('/admin/providers')}>
                    Review provider queue
                  </button>
                  <button className="btn btn-outline" onClick={() => navigate('/admin/payments')}>
                    Open payments overview
                  </button>
                </div>

                <div className="dashboard-pill-row">
                  <span className="dashboard-pill info">
                    <Users size={14} />
                    {providers.length} providers in network
                  </span>
                  <span className="dashboard-pill warn">
                    <ShieldAlert size={14} />
                    {pendingVerification.length} waiting for review
                  </span>
                  <span className="dashboard-pill success">
                    <TrendingUp size={14} />
                    {verificationRate}% verification rate
                  </span>
                </div>
              </div>

              <div className="dashboard-highlight-stack">
                <div className="dashboard-highlight-card">
                  <div className="dashboard-highlight-head">
                    <span className="dashboard-highlight-label">Approval queue</span>
                    <ShieldAlert size={18} />
                  </div>
                  <div className="dashboard-highlight-value">
                    {loading ? '...' : pendingVerification.length}
                  </div>
                  <p className="dashboard-highlight-copy">
                    Providers waiting for verification can be reviewed directly from the queue.
                  </p>
                </div>

                <div className="dashboard-highlight-card">
                  <div className="dashboard-highlight-head">
                    <span className="dashboard-highlight-label">Revenue snapshot</span>
                    <CircleDollarSign size={18} />
                  </div>
                  <div className="dashboard-highlight-value">
                    {loading ? '...' : `Rs ${platformRevenue.toLocaleString()}`}
                  </div>
                  <p className="dashboard-highlight-copy">
                    Estimated platform share based on the current revenue total.
                  </p>
                </div>
              </div>
            </section>

            <div className="stats-grid">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="stat-card dashboard-metric-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(stat.path)}
                >
                  <div className={`stat-icon ${stat.cls}`}>{stat.icon}</div>
                  <div>
                    <div className="stat-value">{loading ? '...' : stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid-2" style={{ alignItems: 'start' }}>
              <div className="dashboard-surface">
                <div className="dashboard-surface-header">
                  <div>
                    <div className="dashboard-surface-title">Pending verifications</div>
                    <div className="dashboard-surface-copy">
                      See who needs approval next and keep the network quality high.
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/providers')}>
                    View all <ArrowRight size={14} />
                  </button>
                </div>

                {loading ? (
                  <Loader />
                ) : pendingVerification.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">OK</div>
                    <div className="empty-state-title">No providers waiting</div>
                    <p className="text-muted">The verification queue is currently clear.</p>
                  </div>
                ) : (
                  <div className="dashboard-feed-list">
                    {pendingVerification.slice(0, 6).map((provider) => (
                      <div key={provider.providerId} className="dashboard-feed-item">
                        <div className="dashboard-feed-icon warn">
                          <UserCheck size={20} />
                        </div>
                        <div>
                          <div className="dashboard-feed-title">
                            Dr. {provider.fullName || `User #${provider.userId}`}
                          </div>
                          <div className="dashboard-feed-sub">
                            {provider.specialization || 'Specialization pending'} ·{' '}
                            {provider.qualification || 'Qualification pending'}
                          </div>
                        </div>
                        <StatusBadge status="PENDING" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="dashboard-surface">
                  <div className="dashboard-surface-header">
                    <div>
                      <div className="dashboard-surface-title">Management shortcuts</div>
                      <div className="dashboard-surface-copy">
                        Jump into the areas that matter most for platform operations.
                      </div>
                    </div>
                  </div>
                  <div className="dashboard-surface-body">
                    <div className="dashboard-action-grid">
                      {actions.map((action) => (
                        <button
                          key={action.label}
                          className="dashboard-action-card"
                          onClick={() => navigate(action.path)}
                        >
                          <span className="dashboard-action-icon">{action.icon}</span>
                          <span>
                            <span className="dashboard-action-title">{action.label}</span>
                            <span className="dashboard-action-copy">{action.sub}</span>
                          </span>
                          <ArrowRight size={16} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="dashboard-surface">
                  <div className="dashboard-surface-header">
                    <div>
                      <div className="dashboard-surface-title">Platform notification</div>
                      <div className="dashboard-surface-copy">
                        Share service updates or operational announcements with a single message.
                      </div>
                    </div>
                    <Megaphone size={18} style={{ color: 'var(--primary)' }} />
                  </div>

                  <div className="dashboard-surface-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="dashboard-inline-banner">
                      <BellRing size={18} />
                      <div>
                        <div className="dashboard-feed-title">Broadcast carefully</div>
                        <div className="dashboard-feed-sub">
                          Keep notifications short, direct, and useful for all users.
                        </div>
                      </div>
                    </div>

                    <input
                      className="form-input"
                      placeholder="Notification title"
                      value={notifForm.title}
                      onChange={(event) =>
                        setNotifForm((current) => ({ ...current, title: event.target.value }))
                      }
                    />
                    <textarea
                      className="form-textarea"
                      placeholder="Message content"
                      value={notifForm.message}
                      onChange={(event) =>
                        setNotifForm((current) => ({ ...current, message: event.target.value }))
                      }
                      style={{ minHeight: 110 }}
                    />
                    <button
                      className="btn btn-primary"
                      style={{ justifyContent: 'center' }}
                      onClick={sendPlatformNotif}
                      disabled={sending || !notifForm.title || !notifForm.message}
                    >
                      {sending ? <span className="spinner" /> : 'Send platform notification'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}