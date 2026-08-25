import React, { useState, useEffect } from 'react';
import {
  getUsers, addUser, updateUser,
  deleteUser, changePassword
} from '../services/api';

const ROLE_COLORS = {
  Admin:    { color: '#f87171', bg: '#450a0a' },
  Operator: { color: '#fbbf24', bg: '#2d220a' },
  Viewer:   { color: '#4ade80', bg: '#0d2010' }
};

const ROLE_PERMISSIONS = {
  Admin:    ['View', 'Add Camera', 'Delete Camera', 'Manage Users', 'Settings', 'Export'],
  Operator: ['View', 'Add Camera', 'Acknowledge Alerts', 'Export'],
  Viewer:   ['View Only']
};

export default function UsersPage() {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [editUser,    setEditUser]    = useState(null);
  const [changePwd,   setChangePwd]   = useState(null);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');

  const [addForm, setAddForm] = useState({
    name: '', username: '', password: '',
    role: 'Operator', email: ''
  });
  const [pwdForm, setPwdForm] = useState({
    new_password: '', confirm: ''
  });

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const res = await getUsers();
      setUsers(res.data.users || []);
    } catch (err) {
      console.warn('[Users] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAddUser = async () => {
    if (!addForm.name || !addForm.username || !addForm.password) {
      setError('Name, username and password required');
      return;
    }
    if (addForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    try {
      await addUser(addForm);
      await loadUsers();
      setShowAdd(false);
      setAddForm({ name: '', username: '', password: '', role: 'Operator', email: '' });
      showSuccess('User created successfully!');
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      await updateUser(user.id, {
        status: user.status === 'active' ? 'disabled' : 'active'
      });
      await loadUsers();
    } catch (err) {
      console.warn('[Users] Toggle failed:', err);
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.username}"?`)) return;
    try {
      await deleteUser(user.id);
      await loadUsers();
      showSuccess('User deleted');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete');
    }
  };

  const handleChangePassword = async () => {
    if (!pwdForm.new_password || pwdForm.new_password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (pwdForm.new_password !== pwdForm.confirm) {
      setError('Passwords do not match');
      return;
    }
    try {
      await changePassword(changePwd.id, {
        new_password: pwdForm.new_password
      });
      setChangePwd(null);
      setPwdForm({ new_password: '', confirm: '' });
      showSuccess('Password changed!');
      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to change password');
    }
  };

  const inputStyle = {
    background:   '#0a0e1a', border: '1px solid #1e2d47',
    borderRadius: 6, padding: '7px 12px',
    color:        '#e2e8f0', fontSize: 11,
    outline:      'none', width: '100%',
    marginBottom: 10, boxSizing: 'border-box'
  };

  const modalStyle = {
    position:       'fixed', inset: 0,
    background:     'rgba(0,0,0,.8)',
    display:        'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000
  };

  const modalBoxStyle = {
    background:   '#111827', border: '1px solid #1e2d47',
    borderRadius: 12, padding: 24,
    width:        400, maxWidth: '95vw'
  };

  return (
    <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14
      }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
            Users
          </h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
            Manage system users and permissions
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setError(''); }}
          style={{
            background: '#3b82f6', border: 'none',
            color: '#fff', padding: '7px 16px',
            borderRadius: 6, fontSize: 11,
            fontWeight: 700, cursor: 'pointer'
          }}
        >
          + Add User
        </button>
      </div>

      {/* Success/Error */}
      {success && (
        <div style={{
          background: '#0d2010', border: '1px solid #166534',
          borderRadius: 6, padding: '8px 14px',
          color: '#4ade80', fontSize: 11, marginBottom: 12
        }}>✓ {success}</div>
      )}
      {error && (
        <div style={{
          background: '#450a0a', border: '1px solid #7f1d1d',
          borderRadius: 6, padding: '8px 14px',
          color: '#f87171', fontSize: 11, marginBottom: 12
        }}>⚠ {error}</div>
      )}

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 8, marginBottom: 16
      }}>
        {['Admin', 'Operator', 'Viewer'].map(role => {
          const style = ROLE_COLORS[role];
          const count = users.filter(u => u.role === role).length;
          return (
            <div key={role} style={{
              background:   '#151d2e', border: `1px solid ${style.color}33`,
              borderRadius: 8, padding: '12px 14px',
              display:      'flex', alignItems: 'center', gap: 10
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: style.bg, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 18
              }}>
                {role === 'Admin' ? '👑' : role === 'Operator' ? '🔧' : '👁'}
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{role}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: style.color }}>
                  {count}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Users table */}
      <div style={{
        background:   '#151d2e', border: '1px solid #1e2d47',
        borderRadius: 8, overflow: 'hidden'
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 120px 100px 100px 140px 120px',
          padding: '8px 14px', background: '#1a2340',
          borderBottom: '1px solid #1e2d47',
          fontSize: 10, fontWeight: 700,
          color: '#64748b', textTransform: 'uppercase',
          letterSpacing: '.5px'
        }}>
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
          <span>Permissions</span>
          <span>Last Login</span>
          <span>Actions</span>
        </div>

        {/* User rows */}
        {loading ? (
          <div style={{
            textAlign: 'center', padding: '30px',
            color: '#64748b', fontSize: 11
          }}>Loading users...</div>
        ) : users.map((user, i) => {
          const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.Viewer;
          const perms     = ROLE_PERMISSIONS[user.role] || [];

          return (
            <div
              key={user.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 120px 100px 100px 140px 120px',
                padding: '12px 14px',
                borderBottom: i < users.length - 1 ? '1px solid #1e2d4755' : 'none',
                alignItems: 'center'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1a2340'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* User info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: roleStyle.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                  color: roleStyle.color, flexShrink: 0
                }}>
                  {user.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    @{user.username}
                  </div>
                </div>
              </div>

              {/* Role */}
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: '3px 8px', borderRadius: 4,
                background: roleStyle.bg, color: roleStyle.color,
                display: 'inline-block', textAlign: 'center'
              }}>
                {user.role}
              </span>

              {/* Status */}
              <span style={{
                fontSize: 10, fontWeight: 600,
                color: user.status === 'active' ? '#22c55e' : '#64748b'
              }}>
                {user.status === 'active' ? '● Active' : '● Disabled'}
              </span>

              {/* Permissions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {perms.slice(0, 2).map((p, j) => (
                  <span key={j} style={{
                    fontSize: 8, color: '#64748b',
                    background: '#0a0e1a', padding: '2px 5px',
                    borderRadius: 3, border: '1px solid #1e2d47'
                  }}>
                    {p}
                  </span>
                ))}
                {perms.length > 2 && (
                  <span style={{
                    fontSize: 8, color: '#475569',
                    padding: '2px 4px'
                  }}>+{perms.length - 2}</span>
                )}
              </div>

              {/* Last login */}
              <span style={{ fontSize: 10, color: '#64748b' }}>
                {user.last_login}
              </span>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4 }}>
                {/* Toggle status */}
                <button
                  onClick={() => handleToggleStatus(user)}
                  title={user.status === 'active' ? 'Disable' : 'Enable'}
                  style={{
                    background:   user.status === 'active' ? '#2d220a' : '#0d2010',
                    border:       'none',
                    color:        user.status === 'active' ? '#fbbf24' : '#4ade80',
                    padding:      '4px 8px', borderRadius: 4,
                    fontSize:     10, cursor: 'pointer'
                  }}
                >
                  {user.status === 'active' ? '⏸' : '▶'}
                </button>

                {/* Change password */}
                <button
                  onClick={() => { setChangePwd(user); setError(''); }}
                  title="Change Password"
                  style={{
                    background: '#1e3a5f', border: 'none',
                    color: '#60a5fa', padding: '4px 8px',
                    borderRadius: 4, fontSize: 10, cursor: 'pointer'
                  }}
                >
                  🔑
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(user)}
                  title="Delete User"
                  style={{
                    background: '#2d0a0a', border: 'none',
                    color: '#f87171', padding: '4px 8px',
                    borderRadius: 4, fontSize: 10, cursor: 'pointer'
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Add User Modal ──────────────────────────────────── */}
      {showAdd && (
        <div style={modalStyle} onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div style={modalBoxStyle}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginBottom: 18
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
                Add New User
              </h3>
              <button onClick={() => setShowAdd(false)} style={{
                background: 'none', border: 'none',
                color: '#64748b', fontSize: 18, cursor: 'pointer'
              }}>✕</button>
            </div>

            {error && (
              <div style={{
                background: '#450a0a', borderRadius: 6,
                padding: '8px 12px', color: '#f87171',
                fontSize: 11, marginBottom: 10
              }}>⚠ {error}</div>
            )}

            <input
              placeholder="Full Name *"
              value={addForm.name}
              onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="Username *"
              value={addForm.username}
              onChange={e => setAddForm(p => ({ ...p, username: e.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="Password * (min 6 chars)"
              type="password"
              value={addForm.password}
              onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="Email (optional)"
              value={addForm.email}
              onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
              style={inputStyle}
            />

            <label style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 5 }}>
              Role
            </label>
            <select
              value={addForm.role}
              onChange={e => setAddForm(p => ({ ...p, role: e.target.value }))}
              style={{ ...inputStyle }}
            >
              <option value="Admin">Admin</option>
              <option value="Operator">Operator</option>
              <option value="Viewer">Viewer</option>
            </select>

            {/* Permissions preview */}
            <div style={{
              background: '#0a0e1a', borderRadius: 6,
              padding: '8px 12px', marginBottom: 14
            }}>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 5 }}>
                Permissions:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {(ROLE_PERMISSIONS[addForm.role] || []).map((p, i) => (
                  <span key={i} style={{
                    fontSize: 9, color: '#60a5fa',
                    background: '#1e3a5f', padding: '2px 7px',
                    borderRadius: 3
                  }}>{p}</span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowAdd(false)} style={{
                flex: 1, background: '#151d2e',
                border: '1px solid #1e2d47', color: '#94a3b8',
                padding: '8px', borderRadius: 6,
                fontSize: 11, cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={handleAddUser} style={{
                flex: 2, background: '#3b82f6', border: 'none',
                color: '#fff', padding: '8px', borderRadius: 6,
                fontSize: 11, fontWeight: 700, cursor: 'pointer'
              }}>+ Add User</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ───────────────────────────── */}
      {changePwd && (
        <div style={modalStyle} onClick={e => e.target === e.currentTarget && setChangePwd(null)}>
          <div style={modalBoxStyle}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginBottom: 18
            }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: 0 }}>
                Change Password — {changePwd.username}
              </h3>
              <button onClick={() => setChangePwd(null)} style={{
                background: 'none', border: 'none',
                color: '#64748b', fontSize: 18, cursor: 'pointer'
              }}>✕</button>
            </div>

            {error && (
              <div style={{
                background: '#450a0a', borderRadius: 6,
                padding: '8px 12px', color: '#f87171',
                fontSize: 11, marginBottom: 10
              }}>⚠ {error}</div>
            )}

            <input
              placeholder="New Password (min 6 chars)"
              type="password"
              value={pwdForm.new_password}
              onChange={e => setPwdForm(p => ({ ...p, new_password: e.target.value }))}
              style={inputStyle}
            />
            <input
              placeholder="Confirm New Password"
              type="password"
              value={pwdForm.confirm}
              onChange={e => setPwdForm(p => ({ ...p, confirm: e.target.value }))}
              style={inputStyle}
            />

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setChangePwd(null)} style={{
                flex: 1, background: '#151d2e',
                border: '1px solid #1e2d47', color: '#94a3b8',
                padding: '8px', borderRadius: 6,
                fontSize: 11, cursor: 'pointer'
              }}>Cancel</button>
              <button onClick={handleChangePassword} style={{
                flex: 2, background: '#3b82f6', border: 'none',
                color: '#fff', padding: '8px', borderRadius: 6,
                fontSize: 11, fontWeight: 700, cursor: 'pointer'
              }}>🔑 Change Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}