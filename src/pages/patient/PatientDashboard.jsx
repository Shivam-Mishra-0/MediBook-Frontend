import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Search,
  ShieldCheck,
  Star,
  Stethoscope,
} from 'lucide-react';
import { Loader, PatientSidebar, StatusBadge, Topbar } from '../../components/Layout';
import {
  appointmentAPI,
  formatDate,
  formatTime,
  getUser,
  paymentAPI,
  providerAPI,
  recordAPI,
  reviewAPI,
} from '../../utils/api';

const getDoctorName = (provider) => {
  if (!provider) return 'Doctor';
  if (provider.fullName && !provider.fullName.includes('Provider')) return provider.fullName;
  if (provider.name && !provider.name.includes('Provider')) return provider.name;
  if (provider.firstName && !provider.firstName.includes('Provider')) return provider.firstName;
  if (provider.doctorName && !provider.doctorName.includes('Provider')) return provider.doctorName;
  return 'Doctor';
};

export default function PatientDashboard() {
  const navigate = useNavigate();
  const user = getUser();

  const [upcoming, setUpcoming] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [records, setRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [providers, setProviders] = useState({});
  const [reviewableAppts, setReviewableAppts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [upcomingResponse, recordsResponse, paymentsResponse, appointmentsResponse] = await Promise.all([
          appointmentAPI.getUpcoming(user.userId),
          recordAPI.getByPatient(user.userId),
          paymentAPI.getByPatient(user.userId),
          appointmentAPI.getByPatient(user.userId),
        ]);

        const upcomingAppts = upcomingResponse.data || [];
        const allAppointments = appointmentsResponse.data || [];
        const completedAppts = allAppointments.filter((appointment) => appointment.status === 'COMPLETED');

        setUpcoming(upcomingAppts);
        setCompleted(completedAppts);
        setRecords(recordsResponse.data || []);
        setPayments(paymentsResponse.data || []);

        const allProviderIds = [
          ...new Set([
            ...upcomingAppts.map((appointment) => appointment.providerId),
            ...completedAppts.map((appointment) => appointment.providerId),
          ]),
        ];

        const providerMap = {};
        for (const providerId of allProviderIds) {
          try {
            const providerResponse = await providerAPI.getById(providerId);
            providerMap[providerId] = providerResponse.data;
          } catch (error) {
            providerMap[providerId] = { providerId, fullName: `Doctor #${providerId}` };
          }
        }
        setProviders(providerMap);

        const userReviews = await reviewAPI.getByPatient(user.userId).catch(() => ({ data: [] }));
        const reviewedApptIds = new Set(userReviews.data?.map((review) => review.appointmentId) || []);
        const reviewable = completedAppts.filter((appointment) => !reviewedApptIds.has(appointment.appointmentId));
        setReviewableAppts(reviewable);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user.userId]);

  const totalSpent = payments
    .filter((payment) => payment.status === 'SUCCESS')
    .reduce((sum, payment) => sum + (payment.amount || 0), 0);
  const successfulPayments = payments.filter((payment) => payment.status === 'SUCCESS').length;
  const nextAppointment = upcoming[0];
  const latestRecord = records[0];

  const stats = [
    {
      icon: <CalendarDays size={22} />,
      label: 'Upcoming visits',
      value: upcoming.length,
      cls: 'stat-icon-blue',
      action: () => navigate('/patient/appointments'),
    },
    {
      icon: <FileText size={22} />,
      label: 'Medical records',
      value: records.length,
      cls: 'stat-icon-green',
      action: () => navigate('/patient/records'),
    },
    {
      icon: <CircleDollarSign size={22} />,
      label: 'Payments',
      value: payments.length,
      cls: 'stat-icon-yellow',
      action: () => navigate('/patient/payments'),
    },
    {
      icon: <CheckCircle2 size={22} />,
      label: 'Completed visits',
      value: completed.length,
      cls: 'stat-icon-red',
      action: () => navigate('/patient/appointments'),
    },
  ];

  const quickActions = [
    {
      icon: <Search size={20} />,
      label: 'Find a doctor',
      sub: 'Search specialists and compare profiles.',
      action: () => navigate('/find-doctors'),
    },
    {
      icon: <CalendarDays size={20} />,
      label: 'Appointments',
      sub: 'View bookings, status changes, and follow-ups.',
      action: () => navigate('/patient/appointments'),
    },
    {
      icon: <FileText size={20} />,
      label: 'Medical records',
      sub: 'Open diagnoses, prescriptions, and notes.',
      action: () => navigate('/patient/records'),
    },
    {
      icon: <CircleDollarSign size={20} />,
      label: 'Payment history',
      sub: 'Review spending and completed transactions.',
      action: () => navigate('/patient/payments'),
    },
  ];

  return (
    <div className="dashboard-layout">
      <PatientSidebar />

      <div className="dashboard-main">
        <Topbar title="Patient Dashboard" />
        <div className="page-content fade-in">
          <div className="dashboard-page">
            <section className="dashboard-hero dashboard-hero-patient">
              <div className="dashboard-hero-content">
                <span className="dashboard-kicker">
                  <ShieldCheck size={15} />
                  Patient workspace
                </span>
                <h1 className="dashboard-hero-title">Good to see you, {user?.fullName?.split(' ')[0] || 'there'}.</h1>
                <p className="dashboard-hero-copy">
                  Keep appointments, records, and payment history aligned so every next step in your care journey feels
                  simple and visible.
                </p>

                <div className="dashboard-hero-actions">
                  <button className="btn btn-primary" onClick={() => navigate('/find-doctors')}>
                    Find a doctor
                  </button>
                  <button className="btn btn-outline" onClick={() => navigate('/patient/appointments')}>
                    Open appointments
                  </button>
                </div>

                <div className="dashboard-pill-row">
                  <span className="dashboard-pill info">
                    <Clock3 size={14} />
                    {loading ? 'Loading next visit' : `${upcoming.length} upcoming appointment${upcoming.length === 1 ? '' : 's'}`}
                  </span>
                  <span className="dashboard-pill success">
                    <CircleDollarSign size={14} />
                    Rs {totalSpent.toLocaleString()} total spent
                  </span>
                  <span className="dashboard-pill warn">
                    <Star size={14} />
                    {reviewableAppts.length} review opportunity{reviewableAppts.length === 1 ? '' : 'ies'}
                  </span>
                </div>
              </div>

              <div className="dashboard-highlight-stack">
                <div className="dashboard-highlight-card">
                  <div className="dashboard-highlight-head">
                    <span className="dashboard-highlight-label">Next appointment</span>
                    <CalendarDays size={18} />
                  </div>
                  <div className="dashboard-highlight-value">
                    {loading ? '...' : nextAppointment ? formatDate(nextAppointment.appointmentDate) : 'No visit booked'}
                  </div>
                  <p className="dashboard-highlight-copy">
                    {nextAppointment
                      ? `With Dr. ${getDoctorName(providers[nextAppointment.providerId])} at ${formatTime(nextAppointment.startTime)}.`
                      : 'Start by finding a doctor and reserving your next slot.'}
                  </p>
                </div>

                <div className="dashboard-highlight-card">
                  <div className="dashboard-highlight-head">
                    <span className="dashboard-highlight-label">Latest record</span>
                    <FileText size={18} />
                  </div>
                  <div className="dashboard-highlight-value">
                    {loading ? '...' : latestRecord?.diagnosis || 'No records yet'}
                  </div>
                  <p className="dashboard-highlight-copy">
                    {latestRecord
                      ? `Updated ${formatDate(latestRecord.createdAt)}. Open your records to review details.`
                      : 'Records appear here after completed consultations.'}
                  </p>
                </div>
              </div>
            </section>

            {reviewableAppts.length > 0 && (
              <div className="dashboard-inline-banner warm">
                <Star size={20} />
                <div style={{ flex: 1 }}>
                  <div className="dashboard-feed-title">
                    Review unlocked for {reviewableAppts.length} completed appointment{reviewableAppts.length === 1 ? '' : 's'}
                  </div>
                  <div className="dashboard-feed-sub">
                    Share feedback to help other patients choose with confidence.
                  </div>
                  <div className="dashboard-cta-row" style={{ marginTop: 12 }}>
                    {reviewableAppts.slice(0, 2).map((appointment) => (
                      <button
                        key={appointment.appointmentId}
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate('/patient/appointments')}
                      >
                        Review Dr. {getDoctorName(providers[appointment.providerId])}
                      </button>
                    ))}
                    {reviewableAppts.length > 2 && (
                      <button className="btn btn-outline btn-sm" onClick={() => navigate('/patient/appointments')}>
                        +{reviewableAppts.length - 2} more
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="stats-grid">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="stat-card dashboard-metric-card"
                  style={{ cursor: 'pointer' }}
                  onClick={stat.action}
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
                    <div className="dashboard-surface-title">Upcoming appointments</div>
                    <div className="dashboard-surface-copy">
                      Your next bookings are grouped here for quick review and follow-up.
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patient/appointments')}>
                    View all <ArrowRight size={14} />
                  </button>
                </div>

                {loading ? (
                  <Loader text="Loading appointments..." />
                ) : upcoming.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">+</div>
                    <div className="empty-state-title">No upcoming appointments</div>
                    <button className="btn btn-primary btn-sm mt-2" onClick={() => navigate('/find-doctors')}>
                      Book your first visit
                    </button>
                  </div>
                ) : (
                  <div className="dashboard-feed-list">
                    {upcoming.slice(0, 4).map((appointment) => (
                      <div key={appointment.appointmentId} className="dashboard-feed-item">
                        <div className="dashboard-date-tile">
                          <strong>{new Date(appointment.appointmentDate).getDate()}</strong>
                          <span>
                            {new Date(appointment.appointmentDate).toLocaleString('en', { month: 'short' })}
                          </span>
                        </div>
                        <div>
                          <div className="dashboard-feed-title">
                            Dr. {getDoctorName(providers[appointment.providerId])}
                          </div>
                          <div className="dashboard-feed-sub">Appointment #{appointment.appointmentId}</div>
                          <div className="dashboard-feed-meta">
                            <span>{formatTime(appointment.startTime)}</span>
                            <span>{appointment.modeOfConsultation}</span>
                          </div>
                        </div>
                        <StatusBadge status={appointment.status} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="dashboard-surface">
                <div className="dashboard-surface-header">
                  <div>
                    <div className="dashboard-surface-title">Recent medical records</div>
                    <div className="dashboard-surface-copy">
                      Review the latest diagnoses, notes, and follow-up details.
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate('/patient/records')}>
                    View all <ArrowRight size={14} />
                  </button>
                </div>

                {loading ? (
                  <Loader text="Loading records..." />
                ) : records.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">i</div>
                    <div className="empty-state-title">No records yet</div>
                    <p className="text-muted">Records appear after completed consultations.</p>
                  </div>
                ) : (
                  <div className="dashboard-feed-list">
                    {records.slice(0, 4).map((record) => (
                      <div key={record.recordId} className="dashboard-feed-item">
                        <div className="dashboard-feed-icon success">
                          <Stethoscope size={20} />
                        </div>
                        <div>
                          <div className="dashboard-feed-title">{record.diagnosis || 'Diagnosis pending'}</div>
                          <div className="dashboard-feed-sub">
                            Recorded on {formatDate(record.createdAt)}
                          </div>
                          {record.followUpDate && (
                            <div className="dashboard-feed-meta">
                              <span>Follow-up: {formatDate(record.followUpDate)}</span>
                            </div>
                          )}
                        </div>
                        <ArrowRight size={16} style={{ color: 'var(--text-light)' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="dashboard-surface">
              <div className="dashboard-surface-header">
                <div>
                  <div className="dashboard-surface-title">Quick actions</div>
                  <div className="dashboard-surface-copy">
                    Jump to the parts of your healthcare workflow you use most.
                  </div>
                </div>
              </div>
              <div className="dashboard-surface-body">
                <div className="dashboard-action-grid dashboard-action-grid-two">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      className="dashboard-action-card"
                      onClick={action.action}
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

                <div className="dashboard-inline-banner" style={{ marginTop: 20 }}>
                  <CircleDollarSign size={18} />
                  <div>
                    <div className="dashboard-feed-title">Payment snapshot</div>
                    <div className="dashboard-feed-sub">
                      {successfulPayments} successful payment{successfulPayments === 1 ? '' : 's'} recorded so far.
                    </div>
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