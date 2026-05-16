import React, { useState, useEffect } from 'react';
import { AdminSidebar, Topbar, Loader } from '../../components/Layout';
import { authAPI, formatDate } from '../../utils/api';
import { Search, UserX, UserCheck, Trash2 } from 'lucide-react';

export default function AdminUsers() {
  // Note: The backend provides user data via provider/auth endpoints.
  // We simulate a users view by loading all providers' user IDs.
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Mock users for demonstration (real implementation would require /users/all endpoint)
  const [users] = useState([
    { userId: 1, fullName: 'Admin User', email: 'admin@medibook.com', role: 'Admin', isActive: true, createdAt: '2026-01-01' },
    { userId: 2, fullName: 'Dr. Priya Sharma', email: 'priya@example.com', role: 'Provider', isActive: true, createdAt: '2026-01-10' },
    { userId: 3, fullName: 'Rahul Verma', email: 'rahul@example.com', role: 'Patient', isActive: true, createdAt: '2026-01-15' },
    { userId: 4, fullName: 'Dr. Arjun Mehta', email: 'arjun@example.com', role: 'Provider', isActive: true, createdAt: '2026-02-01' },
    { userId: 5, fullName: 'Sneha Patel', email: 'sneha@example.com', role: 'Patient', isActive: false, createdAt: '2026-02-10' },
    { userId: 6, fullName: 'Dr. Kavita Nair', email: 'kavita@example.com', role: 'Provider', isActive: true, createdAt: '2026-02-15' },
    { userId: 7, fullName: 'Aditya Kumar', email: 'aditya@example.com', role: 'Patient', isActive: true, createdAt: '2026-03-01' },
  ]);

  const [localUsers, setLocalUsers] = useState(users);
  const [tab, setTab] = useState('all');

  const filtered = localUsers.filter(u => {
    const matchesSearch = !search || u.fullName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesTab = tab === 'all' || u.role === tab;
    return matchesSearch && matchesTab;
  });

  const deactivate = async (userId) => {
    if (!confirm('Deactivate this user account?')) return;
    setActionLoading(userId + 'd');
    try {
      await authAPI.deactivate(userId);
      setLocalUsers(prev => prev.map(u => u.userId === userId ? { ...u, isActive: false } : u));
    } catch (e) { alert(e.response?.data?.message || 'Error'); }
    finally { setActionLoading(null); }
  };

  const changePassword = async (userId) => {
    const pwd = prompt('Enter new password:');
    if (!pwd) return;
    try {
      await authAPI.changePassword(userId, pwd);
      alert('Password updated!');
    } catch (e) { alert('Error updating password.'); }
  };

  const roleColor = { Admin: 'badge-red', Provider: 'badge-blue', Patient: 'badge-green' };

  return (
    <div className="dashboard-layout">
      <AdminSidebar />
      <div className="dashboard-main">
        <Topbar title="User Management" />
        <div className="page-content fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div>
              <p className="page-title">User Management</p>
              <p className="page-subtitle">{localUsers.length} total users on the platform</p>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Users', value: localUsers.length, icon: '👥', cls: 'stat-icon-blue' },
              { label: 'Patients', value: localUsers.filter(u => u.role === 'Patient').length, icon: '🤒', cls: 'stat-icon-green' },
              { label: 'Providers', value: localUsers.filter(u => u.role === 'Provider').length, icon: '👨‍⚕️', cls: 'stat-icon-yellow' },
              { label: 'Inactive', value: localUsers.filter(u => !u.isActive).length, icon: '🔴', cls: 'stat-icon-red' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div className={`stat-icon ${s.cls}`} style={{ fontSize: 22 }}>{s.icon}</div>
                <div>
                  <div className="stat-value">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-input" style={{ paddingLeft: 38 }} placeholder="Search by name or email..."
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none', background: 'var(--bg)', borderRadius: 8, padding: '4px' }}>
              {['all', 'Patient', 'Provider', 'Admin'].map(t => (
                <div key={t} className={`tab ${tab === t ? 'active' : ''}`} style={{ borderRadius: 6 }} onClick={() => setTab(t)}>
                  {t === 'all' ? 'All' : t}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">👥</div><div className="empty-state-title">No users found</div></div></td></tr>
                  ) : filtered.map(u => (
                    <tr key={u.userId}>
                      <td>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>
                            {u.fullName[0]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{u.fullName}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {u.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 14 }}>{u.email}</td>
                      <td><span className={`badge ${roleColor[u.role] || 'badge-gray'}`}>{u.role}</span></td>
                      <td>
                        <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                          {u.isActive ? '● Active' : '● Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{formatDate(u.createdAt)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {u.isActive && u.role !== 'Admin' && (
                            <button className="btn btn-danger btn-sm" onClick={() => deactivate(u.userId)}
                              disabled={actionLoading === u.userId + 'd'} title="Deactivate">
                              <UserX size={13} />
                            </button>
                          )}
                          <button className="btn btn-outline btn-sm" onClick={() => changePassword(u.userId)} title="Reset Password">
                            🔑
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
