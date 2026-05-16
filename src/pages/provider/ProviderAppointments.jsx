import React, { useState, useEffect, useCallback } from 'react';
import { ProviderSidebar, Topbar, StatusBadge, Loader } from '../../components/Layout';
import { appointmentAPI, recordAPI, providerAPI, notifAPI, getUser, formatDate, formatTime, authAPI } from '../../utils/api';

// Helper to get patient name from various field names
const getPatientName = (patient) => {
  if (!patient) return 'Patient';
  if (patient.fullName && !patient.fullName.includes('Patient')) return patient.fullName;
  if (patient.name && !patient.name.includes('Patient')) return patient.name;
  if (patient.firstName && !patient.firstName.includes('Patient')) return patient.firstName;
  return 'Patient';
};

function MedicalRecordModal({ appointment, onClose, onDone }) {
  const [form, setForm] = useState({ diagnosis: '', prescription: '', notes: '', followUpDate: '' });
  const [loading, setLoading] = useState(false);
  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    setLoading(true);
    try {
      await recordAPI.create({
        appointmentId: appointment.appointmentId,
        patientId: appointment.patientId,
        providerId: appointment.providerId,
        ...form,
        followUpDate: form.followUpDate || null,
      });
      onDone();
    } catch (e) { alert(e.response?.data?.message || 'Record creation failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <span className="modal-title">Create Medical Record</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="alert alert-info" style={{ fontSize: 13 }}>
            Creating record for Appointment #{appointment.appointmentId} · Patient #{appointment.patientId}
          </div>
          <div className="form-group">
            <label className="form-label">Diagnosis *</label>
            <input className="form-input" name="diagnosis" placeholder="e.g. Hypertension Stage 1"
              value={form.diagnosis} onChange={handle} required />
          </div>
          <div className="form-group">
            <label className="form-label">Prescription</label>
            <textarea className="form-textarea" name="prescription"
              placeholder="Tab Amlodipine 5mg — Once daily for 30 days..."
              value={form.prescription} onChange={handle} />
          </div>
          <div className="form-group">
            <label className="form-label">Clinical Notes</label>
            <textarea className="form-textarea" name="notes"
              placeholder="Patient presented with... BP: 140/90 mmHg..."
              value={form.notes} onChange={handle} />
          </div>
          <div className="form-group">
            <label className="form-label">Follow-up Date (optional)</label>
            <input className="form-input" type="date" name="followUpDate" value={form.followUpDate} onChange={handle} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !form.diagnosis}>
            {loading ? <span className="spinner" /> : 'Save Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProviderAppointments() {
  const user = getUser();
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerId, setProviderId] = useState(null);
  const [tab, setTab] = useState('all');
  const [recordModal, setRecordModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterDate, setFilterDate] = useState('');

  const loadPatientProfiles = useCallback(async (patientIds) => {
    if (!patientIds.length) return;

    const profileResults = await Promise.allSettled(
      patientIds.map(async (patientId) => {
        try {
          const patRes = await authAPI.getProfile(patientId, { timeout: 5000 });
          return [patientId, patRes.data];
        } catch (err) {
          console.warn(`Failed to fetch patient ${patientId}:`, err);
          return [patientId, { userId: patientId, fullName: `Patient #${patientId}` }];
        }
      })
    );

    setPatients((prev) => {
      const next = { ...prev };
      profileResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const [patientId, profile] = result.value;
          next[patientId] = profile;
        }
      });
      return next;
    });
  }, []);

  // ✅ BUG FIX: Extracted fetchAppointments into a useCallback so it can be
  // called manually (refresh button) and also on a polling interval.
  // Old code only fetched once on mount — new appointments booked after page
  // load (e.g. after Razorpay payment completes) were never shown.
  const fetchAppointments = useCallback(async (currentProviderId, showLoadingSpinner = false) => {
    if (!currentProviderId) return;
    if (showLoadingSpinner) setRefreshing(true);
    try {
      const r = await appointmentAPI.getByProvider(currentProviderId);
      const appts = r.data || [];
      setAppointments(appts);

      // Fetch patient details for any new patient IDs not already cached
      const uniquePatientIds = [...new Set(appts.map(a => a.patientId))];
      const newPatientIds = uniquePatientIds.filter(id => !patients[id]);
      void loadPatientProfiles(newPatientIds);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      if (showLoadingSpinner) setRefreshing(false);
    }
  }, [loadPatientProfiles, patients]);

  // Initial load — fetch provider ID then appointments
  useEffect(() => {
    providerAPI.getByUserId(user.userId).then(async r => {
      const pid = r.data.providerId;
      setProviderId(pid);

      const apptRes = await appointmentAPI.getByProvider(pid);
      const appts = apptRes.data || [];
      setAppointments(appts);
      setLoading(false);

      const uniquePatientIds = [...new Set(appts.map(a => a.patientId))];
      void loadPatientProfiles(uniquePatientIds);
    })
    .catch(() => {})
    .finally(() => setLoading(false));
  }, [loadPatientProfiles, user.userId]);

  // ✅ BUG FIX: Poll every 30 seconds to pick up newly booked appointments
  // without requiring a full page reload. This ensures that when a patient
  // completes payment (Razorpay callback → updateStatus("SCHEDULED")), the
  // provider sees the appointment appear automatically.
  useEffect(() => {
    if (!providerId) return;
    const interval = setInterval(() => {
      fetchAppointments(providerId, false);
    }, 30000); // poll every 30 seconds
    return () => clearInterval(interval);
  }, [providerId, fetchAppointments]);

  const complete = async (appointmentId, currentProviderId) => {
    setActionLoading(appointmentId);
    try {
      await appointmentAPI.complete(appointmentId, currentProviderId);
      // ✅ Update local state immediately — no need to wait for next poll
      setAppointments(prev =>
        prev.map(a => a.appointmentId === appointmentId ? { ...a, status: 'COMPLETED' } : a)
      );
    } catch (e) {
      alert(e.response?.data?.message || 'Error marking complete');
    } finally {
      setActionLoading(null);
    }
  };

  const cancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return;
    setActionLoading(id + 'c');
    try {
      await appointmentAPI.cancel(id);
      // ✅ Update local state immediately
      setAppointments(prev => prev.map(a => a.appointmentId === id ? { ...a, status: 'CANCELLED' } : a));

      const appt = appointments.find(a => a.appointmentId === id);

      // Notify provider via APP
      notifAPI.send({
        recipientId: user.userId,
        type: 'CANCELLATION',
        title: 'Appointment Cancelled',
        message: `You cancelled appointment #${id} scheduled for ${appt?.appointmentDate || ''}.`,
        channel: 'APP',
        relatedId: id,
        relatedType: 'APPOINTMENT'
      }).catch(() => {});

      // Notify patient via APP and EMAIL
      if (appt?.patientId) {
        notifAPI.send({
          recipientId: appt.patientId,
          type: 'CANCELLATION',
          title: 'Appointment Cancelled by Doctor',
          message: `Your appointment #${id} scheduled for ${appt?.appointmentDate || ''} has been cancelled by your doctor. Please rebook at your convenience.`,
          channel: 'APP',
          relatedId: id,
          relatedType: 'APPOINTMENT'
        }).catch(() => {});

        notifAPI.send({
          recipientId: appt.patientId,
          type: 'CANCELLATION',
          title: 'Your Appointment Was Cancelled - MediBook',
          message: `Your appointment #${id} scheduled for ${appt?.appointmentDate || ''} has been cancelled by your doctor. Please visit MediBook to rebook.`,
          channel: 'EMAIL',
          relatedId: id,
          relatedType: 'APPOINTMENT'
        }).catch(() => {});
      }

    } catch (e) { alert(e.response?.data?.message || 'Error'); }
    finally { setActionLoading(null); }
  };

  let filtered = tab === 'all' ? appointments : appointments.filter(a => a.status === tab);
  if (filterDate) filtered = filtered.filter(a => a.appointmentDate === filterDate);

  // Always exclude PENDING_PAYMENT from display
  filtered = filtered.filter(a => a.status !== 'PENDING_PAYMENT');

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="dashboard-layout">
      <ProviderSidebar />
      <div className="dashboard-main">
        <Topbar title="Appointments" />
        <div className="page-content fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <p className="page-title">Appointments</p>
              <p className="page-subtitle">
                {appointments.filter(a => a.status !== 'PENDING_PAYMENT').length} total appointments
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input className="form-input" type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                style={{ width: 170 }} />
              {filterDate && (
                <button className="btn btn-outline btn-sm" onClick={() => setFilterDate('')}>Clear</button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => setFilterDate(today)}>Today</button>
              {/* ✅ Manual refresh button so provider can instantly pull new appointments */}
              <button
                className="btn btn-outline btn-sm"
                onClick={() => fetchAppointments(providerId, true)}
                disabled={refreshing}
                title="Refresh appointments"
              >
                {refreshing ? <span className="spinner" /> : '↻ Refresh'}
              </button>
            </div>
          </div>

          <div className="tabs">
            {[
              { key: 'all', label: 'All' },
              { key: 'SCHEDULED', label: 'Scheduled' },
              { key: 'COMPLETED', label: 'Completed' },
              { key: 'CANCELLED', label: 'Cancelled' },
            ].map(t => (
              <div key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}
              </div>
            ))}
          </div>

          {loading ? <Loader /> : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <div className="empty-state-title">No appointments found</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(a => {
                const d = new Date(a.appointmentDate);
                return (
                  <div key={a.appointmentId} className="card">
                    <div style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div className="appt-date-box">
                        <div className="appt-day">{d.getDate()}</div>
                        <div className="appt-month">{d.toLocaleString('en', { month: 'short' })}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700 }}>👤 {getPatientName(patients[a.patientId])}</span>
                          <StatusBadge status={a.status} />
                          {a.modeOfConsultation === 'TELECONSULTATION' && (
                            <span className="badge badge-blue">🎥 Video</span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          <span>⏰ {formatTime(a.startTime)} – {formatTime(a.endTime)}</span>
                          <span>🩺 {a.serviceType}</span>
                          <span>Appt #{a.appointmentId}</span>
                        </div>
                        {a.notes && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                            "{a.notes}"
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                        {(a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && (
                          <>
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={actionLoading === a.appointmentId}
                              onClick={() => complete(a.appointmentId, a.providerId)}>
                              {actionLoading === a.appointmentId ? <span className="spinner" /> : '✓ Complete'}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={actionLoading === a.appointmentId + 'c'}
                              onClick={() => cancel(a.appointmentId)}>
                              Cancel
                            </button>
                          </>
                        )}
                        {a.status === 'COMPLETED' && (
                          <button className="btn btn-outline btn-sm" onClick={() => setRecordModal(a)}>
                            📋 Add Record
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {recordModal && (
        <MedicalRecordModal
          appointment={recordModal}
          onClose={() => setRecordModal(null)}
          onDone={() => { setRecordModal(null); alert('Medical record created!'); }}
        />
      )}
    </div>
  );
}
