import React, { useState, useEffect, useRef } from 'react';
import { getAlertsFiltered, acknowledgeAlert, clearAllAlerts } from '../services/api';

const SEVERITY_COLORS = {
  High:   { color: '#f87171', bg: '#450a0a', border: '#7f1d1d' },
  Medium: { color: '#fbbf24', bg: '#2d220a', border: '#7f5900' },
  Low:    { color: '#4ade80', bg: '#0d2010', border: '#166534' }
};

const CLASS_ICONS = {
  Fire:     '🔥',
  Violence: '⚡',
  Gun:      '🔫',
  Knife:    '🔪',
  Falling:  '🏃',
  Smoke:    '💨',
  Theft_Mask:  '🎭',
  Phone:    '📱',
  Medical_Mask:'😷',
  Normal:   '🛡️'
};

const CLASS_COLORS = {
  Fire:     '#fb923c',
  Violence: '#f43f5e',
  Gun:      '#f87171',
  Knife:    '#facc15',
  Falling:  '#a78bfa',
  Smoke:    '#94a3b8',
  Theft_Mask:  '#fbbf24',
  Phone:    '#60a5fa',
  Medical_Mask:'#{34d399',
  Normal:   '#22c55e'
};

export default function AlertsPage() {
  const [alerts,        setAlerts]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [severityFilter,setSeverityFilter]= useState('all');
  const [classFilter,   setClassFilter]   = useState('all');
  const [search,        setSearch]        = useState('');
  const [clearing,      setClearing]      = useState(false);
  const [lastUpdate,    setLastUpdate]    = useState('');
  const intervalRef = useRef(null);

  const loadAlerts = async () => {
    try {
      const res = await getAlertsFiltered({
        severity: severityFilter,
        cls:      classFilter,
        search,
        limit:    100
      });
      setAlerts(res.data.alerts || []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('[Alerts] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    intervalRef.current = setInterval(loadAlerts, 3000);
    return () => clearInterval(intervalRef.current);
  }, [severityFilter, classFilter, search]);

  const handleAck = async (id) => {
    try {
      await acknowledgeAlert(id);
      setAlerts(prev =>
        prev.map(a => a.id === id ? { ...a, acknowledged: true } : a)
      );
    } catch (err) {
      console.warn('[Alerts] Ack failed:', err);
    }
  };

  const handleAckAll = async () => {
    try {
      const unacked = alerts.filter(a => !a.acknowledged);
      await Promise.all(unacked.map(a => acknowledgeAlert(a.id)));
      setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })));
    } catch (err) {
      console.warn('[Alerts] AckAll failed:', err);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Clear all alerts?')) return;
    setClearing(true);
    try {
      await clearAllAlerts();
      setAlerts([]);
    } catch (err) {
      console.warn('[Alerts] Clear failed:', err);
    } finally {
      setClearing(false);
    }
  };

  // Stats
  const total    = alerts.length;
  const high     = alerts.filter(a => a.severity === 'High').length;
  const medium   = alerts.filter(a => a.severity === 'Medium').length;
  const unacked  = alerts.filter(a => !a.acknowledged).length;

  const btnStyle = (active, color = '#3b82f6') => ({
    background:   active ? `${color}22` : '#0a0e1a',
    border:       `1px solid ${active ? color : '#1e2d47'}`,
    color:        active ? color : '#64748b',
    padding:      '5px 12px',
    borderRadius: 6,
    fontSize:     10,
    fontWeight:   600,
    cursor:       'pointer',
    transition:   'all .15s'
  });

  return (
    <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14
      }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
            Alerts
          </h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
            Real-time threat alerts — Updated: {lastUpdate}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleAckAll} style={{
            background: '#1e3a5f', border: '1px solid #253550',
            color: '#60a5fa', padding: '6px 12px',
            borderRadius: 6, fontSize: 11,
            fontWeight: 600, cursor: 'pointer'
          }}>
            ✓ Ack All
          </button>
          <button
            onClick={handleClear}
            disabled={clearing}
            style={{
              background: '#2d0a0a', border: '1px solid #7f1d1d',
              color: '#f87171', padding: '6px 12px',
              borderRadius: 6, fontSize: 11,
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            🗑 Clear All
          </button>
          <button onClick={loadAlerts} style={{
            background: '#151d2e', border: '1px solid #1e2d47',
            color: '#94a3b8', padding: '6px 12px',
            borderRadius: 6, fontSize: 11, cursor: 'pointer'
          }}>
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 8, marginBottom: 14
      }}>
        {[
          { label: 'Total Alerts',  value: total,   color: '#60a5fa' },
          { label: 'High Severity', value: high,    color: '#f87171' },
          { label: 'Medium',        value: medium,  color: '#fbbf24' },
          { label: 'Unacknowledged',value: unacked, color: '#a78bfa' },
        ].map((s, i) => (
          <div key={i} style={{
            background: '#151d2e', border: '1px solid #1e2d47',
            borderRadius: 8, padding: '10px 14px'
          }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 12,
        flexWrap: 'wrap', alignItems: 'center'
      }}>
        {/* Search */}
        <input
          placeholder="Search alerts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: '#0a0e1a', border: '1px solid #1e2d47',
            borderRadius: 6, padding: '6px 12px',
            color: '#e2e8f0', fontSize: 11, outline: 'none',
            width: 200
          }}
        />

        {/* Severity filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['all','High','Medium','Low'].map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              style={btnStyle(
                severityFilter === sev,
                sev === 'High'   ? '#f87171' :
                sev === 'Medium' ? '#fbbf24' :
                sev === 'Low'    ? '#4ade80' : '#3b82f6'
              )}
            >
              {sev === 'all' ? 'All Severity' : sev}
            </button>
          ))}
        </div>

        {/* Class filter */}
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          style={{
            background: '#0a0e1a', border: '1px solid #1e2d47',
            color: '#94a3b8', fontSize: 11,
            padding: '6px 10px', borderRadius: 6,
            cursor: 'pointer', outline: 'none'
          }}
        >
          <option value="all">All Classes</option>
          {Object.keys(CLASS_ICONS).map(cls => (
            <option key={cls} value={cls}>{cls.replace('_',' ')}</option>
          ))}
        </select>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div style={{
          textAlign: 'center', padding: '40px 0',
          color: '#64748b', fontSize: 13
        }}>
          Loading alerts...
        </div>
      ) : alerts.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: '#64748b'
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No alerts found</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            {search || severityFilter !== 'all' || classFilter !== 'all'
              ? 'Try changing filters'
              : 'System is running normally'}
          </div>
        </div>
      ) : (
        <div style={{
          background: '#151d2e', border: '1px solid #1e2d47',
          borderRadius: 8, overflow: 'hidden'
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 120px 100px 80px 140px 100px',
            padding: '8px 14px',
            background: '#1a2340',
            borderBottom: '1px solid #1e2d47',
            fontSize: 10, fontWeight: 700,
            color: '#64748b', textTransform: 'uppercase',
            letterSpacing: '.5px'
          }}>
            <span>#</span>
            <span>Event</span>
            <span>Camera</span>
            <span>Severity</span>
            <span>Conf</span>
            <span>Time</span>
            <span>Action</span>
          </div>

          {/* Alert rows */}
          {alerts.map((alert, i) => {
            const sev   = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.Low;
            const icon  = CLASS_ICONS[alert.type]         || '⚠️';
            const color = CLASS_COLORS[alert.type]        || '#94a3b8';

            return (
              <div
                key={alert.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 120px 100px 80px 140px 100px',
                  padding: '10px 14px',
                  borderBottom: i < alerts.length - 1 ? '1px solid #1e2d4755' : 'none',
                  background: alert.acknowledged
                    ? 'transparent'
                    : `${sev.bg}44`,
                  alignItems: 'center',
                  opacity: alert.acknowledged ? 0.6 : 1,
                  transition: 'opacity .3s'
                }}
              >
                {/* Index */}
                <span style={{ fontSize: 10, color: '#475569' }}>
                  {alerts.length - i}
                </span>

                {/* Event type */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color }}>
                      {alert.type} Detected
                    </div>
                    {alert.acknowledged && (
                      <div style={{ fontSize: 9, color: '#4ade80' }}>
                        ✓ Acknowledged
                      </div>
                    )}
                  </div>
                </div>

                {/* Camera */}
                <span style={{
                  fontSize: 11, color: '#94a3b8',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {alert.camera_name}
                </span>

                {/* Severity badge */}
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: '3px 8px', borderRadius: 4,
                  background: sev.bg, color: sev.color,
                  border: `1px solid ${sev.border}`,
                  display: 'inline-block', textAlign: 'center'
                }}>
                  {alert.severity}
                </span>

                {/* Confidence */}
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  {(alert.confidence * 100).toFixed(0)}%
                </span>

                {/* Timestamp */}
                <span style={{ fontSize: 10, color: '#64748b' }}>
                  {alert.timestamp}
                </span>

                {/* Action */}
                {!alert.acknowledged ? (
                  <button
                    onClick={() => handleAck(alert.id)}
                    style={{
                      background:   '#1e3a5f',
                      border:       '1px solid #253550',
                      color:        '#60a5fa',
                      padding:      '4px 10px',
                      borderRadius: 4,
                      fontSize:     10,
                      fontWeight:   600,
                      cursor:       'pointer'
                    }}
                  >
                    ✓ Ack
                  </button>
                ) : (
                  <span style={{ fontSize: 10, color: '#4ade80' }}>
                    ✓ Done
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}