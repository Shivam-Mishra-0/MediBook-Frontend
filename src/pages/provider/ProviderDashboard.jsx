import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { Loader, ProviderSidebar, StatusBadge, Topbar } from '../../components/Layout';
import { appointmentAPI, authAPI, formatDate, formatTime, getUser, paymentAPI, providerAPI } from '../../utils/api';

const getPatientName = (patient) => {
  if (!patient) return 'Patient';
  if (patient.fullName && !patient.fullName.includes('Patient')) return patient.fullName;
  if (patient.name && !patient.name.includes('Patient')) return patient.name;
  if (patient.firstName && !patient.firstName.includes('Patient')) return patient.firstName;
  return 'Patient';
};

export default function ProviderDashboard() {
  const user = getUser();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [todayAppts, setTodayAppts] = useState([]);
  const [allAppts, setAllAppts] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [cancelledAppts, setCancelledAppts] = useState([]);
  const [patientMap, setPatientMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const load = async () => {
      try {
        const providerResponse = await providerAPI.getByUserId(user.userId);
        setProvider(providerResponse.data);
        const providerId = providerResponse.data.providerId;

        const [todayResponse, allResponse, revenueResponse] = await Promise.all([
          appointmentAPI.getByProviderDate(providerId, today),
          appointmentAPI.getByProvider(providerId),
          paymentAPI.getTotalRevenue(),
        ]);

        const allAppointments = allResponse.data || [];
        const cancelled = allAppointments.filter((appointment) => appointment.status === 'CANCELLED');

        setTodayAppts(todayResponse.data || []);
        setAllAppts(allAppointments);
        setRevenue(revenueResponse.data.totalRevenue || 0);
        setCancelledAppts(cancelled);

        const uniquePatientIds = [...new Set(cancelled.map((appointment) => appointment.patientId))];
        const patients = {};
        for (const patientId of uniquePatientIds) {
          try {
            const patientResponse = await authAPI.getProfile(patientId);
            patients[patientId] = patientResponse.data;
          } catch (error) {
            patients[patientId] = { userId: patientId, fullName: `Patient #${patientId}` };
          }
        }
        setPatientMap(patients);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [today, user.userId]);

  const completeAppt = async (appointmentId, providerId) => {
    setActionLoading(appointmentId);
    try {
      await appointmentAPI.complete(appointmentId, providerId);
      setTodayAppts((current) =>
        current.map((appointment) =>
          appointment.appointmentId === appointmentId
            ? { ...appointment, status: 'COMPLETED' }
            : appointment
        )
      );
    } catch (error) {
      alert(error.response?.data?.message || 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const completedCount = allAppts.filter((appointment) => appointment.status === 'COMPLETED').length;
  const nextAppointment =
    todayAppts.find((appointment) => ['SCHEDULED', 'CONFIRMED'].includes(appointment.status)) || todayAppts[0];

  const stats = [
    {
      icon: <CalendarDays size={22} />,
      label: "Today's appointments",
      value: todayAppts.length,
      cls: 'stat-icon-blue',
    },
    {
      icon: <ClipboardList size={22} />,
      label: 'Total appointments',
      value: allAppts.length,
      cls: 'stat-icon-green',
    },
    {
      icon: <CheckCircle2 size={22} />,
      label: 'Completed visits',
      value: completedCount,
      cls: 'stat-icon-yellow',
    },
    {
      icon: <CircleDollarSign size={22} />,
      label: 'Revenue tracked',
      value: `Rs ${revenue.toLocaleString()}`,
      cls: 'stat-icon-red',
    },
  ];

  const quickActions = [
    {
      icon: <CalendarDays size={20} />,
      label: 'Manage schedule',
      sub: 'Open slot controls and calendar availability.',
      path: '/provider/schedule',
    },
    {
      icon: <ClipboardList size={20} />,
      label: 'Appointments',
      sub: 'Review visit status and patient timelines.',
      path: '/provider/appointments',
    },
    {
      icon: <Stethoscope size={20} />,
      label: 'Medical records',
      sub: 'Write and update consultation records.',
      path: '/provider/records',
    },
    {
      icon: <CircleDollarSign size={20} />,
      label: 'Earnings',
      sub: 'Inspect revenue trends and payout context.',
      path: '/provider/earnings',
    },
  ];

  return (
    <div className="dashboard-layout">
      <ProviderSidebar />
      <div className="dashboard-main">
        <Topbar title="Provider Dashboard" />
        <div className="page-content fade-in">
          <div className="dashboard-page">
            <section className="dashboard-hero dashboard-hero-provider">
              <div className="dashboard-hero-content">
                <span className="dashboard-kicker">
                  <Stethoscope size={15} />
                  Provider workspace
                </span>
                <h1 className="dashboard-hero-title">
                  Welcome back, Dr. {user?.fullName?.split(' ')[0] || 'Provider'}.
                </h1>
                <p className="dashboard-hero-copy">
                  Stay ahead of today&apos;s schedule, respond to cancellations quickly, and keep your clinic workflow
                  clean from first visit to record completion.
                </p>

                <div className="dashboard-hero-actions">
                  <button className="btn btn-primary" onClick={() => navigate('/provider/schedule')}>
                    Manage schedule
                  </button>
                  <button className="btn btn-outline" onClick={() => navigate('/provider/appointments')}>
                    Review appointments
                  </button>
                </div>

                <div className="dashboard-pill-row">
                  <span className={`dashboard-pill ${provider?.isVerified ? 'success' : 'warn'}`}>
                    {provider?.isVerified ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                    {provider?.isVerified ? 'Profile verified' : 'Verification pending'}
                  </span>
                  <span className="dashboard-pill info">
                    <CalendarDays size={14} />
                    {todayAppts.length} appointment{todayAppts.length === 1 ? '' : 's'} today
                  </span>
                  <span className="dashboard-pill success">
                    <CircleDollarSign size={14} />
                    Rs {revenue.toLocaleString()} tracked
                  </span>
                </div>
              </div>

              <div className="dashboard-highlight-stack">
                <div className="dashboard-highlight-card">
                  <div className="dashboard-highlight-head">
                    <span className="dashboard-highlight-label">Next patient</span>
                    <UserRound size={18} />
                  </div>
                  <div className="dashboard-highlight-value">
                    {loading ? '...' : nextAppointment ? formatTime(nextAppointment.startTime) : 'Free day'}
                  </div>
                  <p className="dashboard-highlight-copy">
                    {nextAppointment
                      ? `Appointment #${nextAppointment.appointmentId} via ${nextAppointment.modeOfConsultation}.`
                      : 'No active appointments are scheduled for today yet.'}
                  </p>
                </div>

                <div className="dashboard-highlight-card">
                  <div className="dashboard-highlight-head">
                    <span className="dashboard-highlight-label">Refund queue</span>
                    <AlertCircle size={18} />
                  </div>
                  <div className="dashboard-highlight-value">
                    {loading ? '...' : cancelledAppts.length}
                  </div>
                  <p className="dashboard-highlight-copy">
                    Cancelled appointments with automatic refund follow-up are grouped here for visibility.
                  </p>
                </div>
              </div>
            </section>

            {provider && !provider.isVerified && (
              <div className="dashboard-inline-banner warm">
                <ShieldAlert size={20} />
                <div>
                  <div className="dashboard-feed-title">Verification pending</div>
                  <div className="dashboard-feed-sub">
                    Your profile will appear in patient searches after admin approval. Keep your profile details up to
                    date while you wait.
                  </div>
                </div>
              </div>
            )}

            <div className="stats-grid">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-card dashboard-metric-card">
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
                    <div className="dashboard-surface-title">Today&apos;s schedule</div>
                    <div className="dashboard-surface-copy">
                      Your current day view with status updates and one-click completion.
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/provider/appointments')}>
                    View all <ArrowRight size={14} />
                  </button>
                </div>

                {loading ? (
                  <Loader />
                ) : todayAppts.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">OK</div>
                    <div className="empty-state-title">No appointments today</div>
                    <p className="text-muted">Use the time to adjust your availability or profile details.</p>
                  </div>
                ) : (
                  <div className="dashboard-feed-list">
                    {todayAppts.map((appointment) => (
                      <div key={appointment.appointmentId} className="dashboard-feed-item">
                        <div className="dashboard-date-tile compact">
                          <strong>{formatTime(appointment.startTime)}</strong>
                          <span>{appointment.modeOfConsultation}</span>
                        </div>
                        <div>
                          <div className="dashboard-feed-title">Patient #{appointment.patientId}</div>
                          <div className="dashboard-feed-sub">{appointment.serviceType}</div>
                          <div className="dashboard-feed-meta">
                            <span>Appointment #{appointment.appointmentId}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <StatusBadge status={appointment.status} />
                          {['SCHEDULED', 'CONFIRMED'].includes(appointment.status) && (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={actionLoading === appointment.appointmentId}
                              onClick={() => completeAppt(appointment.appointmentId, appointment.providerId)}
                            >
                              {actionLoading === appointment.appointmentId ? <span className="spinner" /> : 'Mark done'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {cancelledAppts.length > 0 && (
                  <div className="dashboard-surface">
                    <div className="dashboard-surface-header">
                      <div>
                        <div className="dashboard-surface-title">Refund notifications</div>
                        <div className="dashboard-surface-copy">
                          Cancelled appointments and refund status are surfaced here automatically.
                        </div>
                      </div>
                    </div>
                    <div className="dashboard-feed-list">
                      {cancelledAppts.map((appointment) => (
                        <div key={appointment.appointmentId} className="dashboard-feed-item">
                          <div className="dashboard-feed-icon warn">
                            <AlertCircle size={20} />
                          </div>
                          <div>
                            <div className="dashboard-feed-title">
                              {getPatientName(patientMap[appointment.patientId])}
                            </div>
                            <div className="dashboard-feed-sub">
                              Cancelled appointment #{appointment.appointmentId}
                            </div>
                            <div className="dashboard-feed-meta">
                              <span>{formatDate(appointment.appointmentDate)}</span>
                              <span>{formatTime(appointment.startTime)}</span>
                            </div>
                          </div>
                          <span className="dashboard-pill success">Refund processed</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="dashboard-surface">
                  <div className="dashboard-surface-header">
                    <div>
                      <div className="dashboard-surface-title">Quick actions</div>
                      <div className="dashboard-surface-copy">
                        Move quickly between schedule, clinical work, and earnings.
                      </div>
                    </div>
                  </div>
                  <div className="dashboard-surface-body">
                    <div className="dashboard-action-grid">
                      {quickActions.map((action) => (
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

                {provider && (
                  <div className="dashboard-surface">
                    <div className="dashboard-surface-header">
                      <div>
                        <div className="dashboard-surface-title">Profile snapshot</div>
                        <div className="dashboard-surface-copy">
                          A quick summary of how your profile is presented in the platform.
                        </div>
                      </div>
                    </div>
                    <div className="dashboard-surface-body">
                      <div className="dashboard-keyline">
                        <span>Specialization</span>
                        <strong>{provider.specialization || 'Pending'}</strong>
                      </div>
                      <div className="dashboard-keyline">
                        <span>Qualification</span>
                        <strong>{provider.qualification || 'Pending'}</strong>
                      </div>
                      <div className="dashboard-keyline">
                        <span>Clinic</span>
                        <strong>{provider.clinicName || 'Pending'}</strong>
                      </div>
                      <div className="dashboard-keyline">
                        <span>Rating</span>
                        <strong>{provider.avgRating ? `${provider.avgRating.toFixed(1)} / 5` : 'No ratings yet'}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
