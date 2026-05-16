import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveAuth } from '../../utils/api';

export default function OAuth2Callback() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userId = params.get('userId');
    const role = params.get('role');
    const name = params.get('fullName') || params.get('name');
    const email = params.get('email');

    if (!token || !userId || !role) {
      setError('Missing authentication parameters. Please try logging in again.');
      return;
    }

    try {
      saveAuth(token, {
        userId: parseInt(userId),
        fullName: decodeURIComponent(name || ''),
        email: decodeURIComponent(email || ''),
        role,
      });

      // Navigate based on role
      if (role === 'Patient') {
        navigate('/patient', { replace: true });
      } else if (role === 'Provider') {
        navigate('/provider', { replace: true });
      } else if (role === 'Admin') {
        navigate('/admin', { replace: true });
      } else {
        setError('Unknown role: ' + role);
      }
    } catch (err) {
      setError('Failed to process login: ' + err.message);
    }
  }, [navigate]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '20px',
        background: 'var(--bg)',
      }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: 'var(--text)' }}>
            Authentication Failed
          </h2>
          <div className="alert alert-error" style={{ marginBottom: '20px', fontSize: '13px' }}>
            {error}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/login', { replace: true })}
            style={{ width: '100%' }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      background: 'var(--bg)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <span className="spinner" style={{ marginBottom: '20px', display: 'block' }} />
        <p style={{ fontSize: '16px', color: 'var(--text)', fontWeight: 500 }}>
          Signing you in with Google...
        </p>
      </div>
    </div>
  );
}
