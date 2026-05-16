import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  FileText,
  CreditCard,
  Users,
  LogOut,
  Bell,
  Search,
  ClipboardList,
  TrendingUp,
  UserCheck,
  UserCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { getUser, clearAuth, notifAPI, getInitials } from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import medicalLogo from '../assets/medical-logo.png';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}

export function NotificationBell() {
  const user = getUser();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef();

  const fetchNotifs = () => {
    notifAPI.getByRecipient(user.userId)
      .then((r) => setNotifs(r.data.slice(0, 8)))
      .catch(() => {});
    notifAPI.getUnreadCount(user.userId)
      .then((r) => setUnread(r.data.unreadCount || 0))
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifs();
  }, []);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAll = async () => {
    await notifAPI.markAllRead(user.userId).catch(() => {});
    setUnread(0);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="dropdown" ref={ref}>
      <button
        className="notif-btn"
        onClick={() => {
          const opening = !open;
          setOpen(opening);
          if (opening) fetchNotifs();
        }}
      >
        <Bell size={18} />
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Notifications</span>
            {unread > 0 && (
              <button onClick={handleMarkAll} style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                Mark all read
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              <Bell size={28} style={{ marginBottom: 8, opacity: 0.3 }} />
              <br />
              No notifications
            </div>
          ) : (
            notifs.map((n) => (
              <div
                key={n.notificationId}
                className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                onClick={() => notifAPI.markRead(n.notificationId).catch(() => {})}
              >
                <div className="notif-title">{n.title}</div>
                <div className="notif-msg">{n.message}</div>
                <div className="notif-time">{n.sentAt ? new Date(n.sentAt).toLocaleString('en-IN') : ''}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function PatientSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const isActive = (p) => location.pathname === p;

  const logout = () => {
    clearAuth();
    navigate('/');
  };

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/patient' },
    { icon: <Calendar size={18} />, label: 'My Appointments', path: '/patient/appointments' },
    { icon: <FileText size={18} />, label: 'Medical Records', path: '/patient/records' },
    { icon: <CreditCard size={18} />, label: 'Payments', path: '/patient/payments' },
    { icon: <Search size={18} />, label: 'Find Doctors', path: '/find-doctors' },
    { icon: <UserCircle size={18} />, label: 'My Profile', path: '/patient/profile' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo"><span className="brand-emblem"><img src={medicalLogo} alt="" className="medical-brand-icon" /></span> Medi<span>Book</span></div>
        <div className="sidebar-brand-sub">Patient Portal</div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map((item) => (
          <div
            key={item.path}
            className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={logout}>
          <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{getInitials(user?.fullName)}</div>
          <div>
            <div className="sidebar-user-name">{user?.fullName || 'Patient'}</div>
            <div className="sidebar-user-role">Patient</div>
          </div>
          <LogOut size={16} style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)' }} />
        </div>
      </div>
    </aside>
  );
}

export function ProviderSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const isActive = (p) => location.pathname === p;
  const logout = () => {
    clearAuth();
    navigate('/');
  };

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/provider' },
    { icon: <Calendar size={18} />, label: 'My Schedule', path: '/provider/schedule' },
    { icon: <ClipboardList size={18} />, label: 'Appointments', path: '/provider/appointments' },
    { icon: <FileText size={18} />, label: 'Medical Records', path: '/provider/records' },
    { icon: <TrendingUp size={18} />, label: 'Earnings', path: '/provider/earnings' },
    { icon: <UserCircle size={18} />, label: 'My Profile', path: '/provider/profile' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo"><span className="brand-emblem"><img src={medicalLogo} alt="" className="medical-brand-icon" /></span> Medi<span>Book</span></div>
        <div className="sidebar-brand-sub">Provider Portal</div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {navItems.map((item) => (
          <div
            key={item.path}
            className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={logout}>
          <div className="avatar" style={{ width: 36, height: 36, fontSize: 14, background: 'var(--secondary-light)', color: 'var(--secondary)' }}>{getInitials(user?.fullName)}</div>
          <div>
            <div className="sidebar-user-name">{user?.fullName || 'Doctor'}</div>
            <div className="sidebar-user-role">Provider</div>
          </div>
          <LogOut size={16} style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)' }} />
        </div>
      </div>
    </aside>
  );
}

export function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();
  const isActive = (p) => location.pathname === p;
  const logout = () => {
    clearAuth();
    navigate('/');
  };

  const navItems = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/admin' },
    { icon: <Users size={18} />, label: 'Users', path: '/admin/users' },
    { icon: <UserCheck size={18} />, label: 'Providers', path: '/admin/providers' },
    { icon: <Calendar size={18} />, label: 'Appointments', path: '/admin/appointments' },
    { icon: <CreditCard size={18} />, label: 'Payments', path: '/admin/payments' },
    { icon: <UserCircle size={18} />, label: 'My Profile', path: '/admin/profile' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo"><span className="brand-emblem"><img src={medicalLogo} alt="" className="medical-brand-icon" /></span> Medi<span>Book</span></div>
        <div className="sidebar-brand-sub">Admin Panel</div>
      </div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Management</div>
        {navItems.map((item) => (
          <div
            key={item.path}
            className={`sidebar-link ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={logout}>
          <div className="avatar" style={{ width: 36, height: 36, fontSize: 14, background: 'var(--warning-light)', color: 'var(--warning)' }}>{getInitials(user?.fullName)}</div>
          <div>
            <div className="sidebar-user-name">{user?.fullName || 'Admin'}</div>
            <div className="sidebar-user-role">Administrator</div>
          </div>
          <LogOut size={16} style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)' }} />
        </div>
      </div>
    </aside>
  );
}

export function Topbar({ title }) {
  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>
      <div className="topbar-actions">
        <ThemeToggle />
        <NotificationBell />
      </div>
    </div>
  );
}

export function Stars({ rating = 0, size = 14 }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= Math.round(rating) ? 'star' : 'star star-empty'} style={{ fontSize: size }}>★</span>
      ))}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    SCHEDULED: 'badge-blue',
    COMPLETED: 'badge-green',
    CANCELLED: 'badge-red',
    NO_SHOW: 'badge-yellow',
    SUCCESS: 'badge-green',
    FAILED: 'badge-red',
    REFUNDED: 'badge-gray',
    PENDING: 'badge-yellow',
    true: 'badge-green',
    false: 'badge-red',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{String(status)}</span>;
}

export function Loader({ text = 'Loading...' }) {
  return (
    <div className="page-loader">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner spinner-dark" style={{ margin: '0 auto 12px' }}></div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{text}</p>
      </div>
    </div>
  );
}

let _setToast = null;
export function ToastContainer() {
  const [toast, setToast] = useState(null);
  _setToast = setToast;

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  if (!toast) return null;
  const types = { success: 'alert-success', error: 'alert-error', info: 'alert-info', warning: 'alert-warning' };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, minWidth: 280, maxWidth: 400, animation: 'slideInRight 0.3s cubic-bezier(.34,1.56,.64,1)' }}>
      <style>{`@keyframes slideInRight { from { opacity:0; transform: translateX(40px) scale(0.96); } to { opacity:1; transform: translateX(0) scale(1); } }`}</style>
      <div className={`alert ${types[toast.type] || 'alert-info'}`} style={{ boxShadow: 'var(--shadow-lg)' }}>
        {toast.type === 'success' ? 'OK' : toast.type === 'error' ? 'X' : 'i'}
        <span>{toast.message}</span>
      </div>
    </div>
  );
}

export const toast = {
  success: (msg) => _setToast?.({ type: 'success', message: msg }),
  error: (msg) => _setToast?.({ type: 'error', message: msg }),
  info: (msg) => _setToast?.({ type: 'info', message: msg }),
};

export function PublicNav() {
  const navigate = useNavigate();
  const user = getUser();

  const getDashPath = () => {
    if (!user) return '/login';
    if (user.role === 'Patient') return '/patient';
    if (user.role === 'Provider') return '/provider';
    if (user.role === 'Admin') return '/admin';
    return '/';
  };

  return (
    <nav className="topnav">
      <div className="container topnav-inner">
        <div className="topnav-logo topnav-logo-premium" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <span className="brand-emblem"><img src={medicalLogo} alt="" className="medical-brand-icon" /></span>
          <span className="topnav-logo-text">
            Medi<span>Book</span>
          </span>
        </div>
        <div className="topnav-links">
          <span className="topnav-link" onClick={() => navigate('/find-doctors')} style={{ cursor: 'pointer' }}>Find Doctors</span>
          <ThemeToggle />
          {user ? (
            <button className="btn btn-primary btn-sm" onClick={() => navigate(getDashPath())}>Dashboard</button>
          ) : (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/login')}>Login</button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>Sign Up</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
