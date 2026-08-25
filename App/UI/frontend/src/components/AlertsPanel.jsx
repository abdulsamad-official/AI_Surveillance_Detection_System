import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { acknowledgeAlert } from '../services/api';

const icons = {
  Fire:         '🔥',
  Violence:     '⚡',
  Gun:          '🔫',
  Knife:        '🔪',
  Falling:      '🏃',
  Smoke:        '💨',
  Theft_Mask:   '🎭',
  Phone:        '📱',
  Medical_Mask: '😷',
  Normal:       '🛡️'
};

const sevStyles = {
  High:   { color: '#f87171', bg: '#450a0a' },
  Medium: { color: '#fbbf24', bg: '#2d220a' },
  Low:    { color: '#4ade80', bg: '#0d2010' }
};

export default function AlertsPanel() {
  const { alerts, refreshAlerts } = useApp();

  useEffect(() => {
    refreshAlerts();
    const id = setInterval(refreshAlerts, 3000);
    return () => clearInterval(id);
  }, []);

  const handleAck = async (id) => {
    try {
      await acknowledgeAlert(id);
      await refreshAlerts();
    } catch (err) {
      console.error('Acknowledge failed:', err);
    }
  };

  const recent = [...alerts].slice(0, 5);

  return (
    <div style={{ marginBottom: 0 }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '10px 14px 8px',
        borderBottom:   '1px solid #1e2d47'
      }}>
        <span style={{
          fontSize:      11,
          fontWeight:    700,
          color:         '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '.5px'
        }}>
          Recent Alerts
        </span>
        <span
          style={{ fontSize: 10, color: '#3b82f6', cursor: 'pointer' }}
          onClick={() => window.dispatchEvent(
            new CustomEvent('navigate', { detail: 'Alerts' })
          )}
        >
          View All
        </span>
      </div>

      {/* Alert rows */}
      <div>
        {recent.length === 0 ? (
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            gap:            6,
            padding:        '16px 0',
            fontSize:       11,
            color:          '#4ade80'
          }}>
            <span>✅</span> No active alerts
          </div>
        ) : (
          recent.map((a, i) => {
            const sev = sevStyles[a.severity] || sevStyles.Low;
            return (
              <div
                key={a.id}
                onClick={() => handleAck(a.id)}
                title="Click to acknowledge"
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          10,
                  padding:      '8px 14px',
                  cursor:       'pointer',
                  borderBottom: i < recent.length - 1
                    ? '1px solid #1e2d47' : 'none',
                  opacity:      a.acknowledged ? 0.45 : 1,
                  transition:   'background .15s, opacity .3s',
                  background:   'transparent'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#0f1f35'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Icon badge */}
                <div style={{
                  width:          32,
                  height:         32,
                  borderRadius:   6,
                  background:     sev.bg,
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       16,
                  flexShrink:     0
                }}>
                  {icons[a.type] || '⚠️'}
                </div>

                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize:     11,
                    fontWeight:   600,
                    color:        sev.color,
                    whiteSpace:   'nowrap',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {a.type} Detected
                  </div>
                  <div style={{
                    fontSize:     10,
                    color:        '#64748b',
                    marginTop:    2,
                    whiteSpace:   'nowrap',
                    overflow:     'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {a.camera_name}
                  </div>
                </div>

                {/* Time + severity */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: '#64748b' }}>
                    {a.timestamp}
                  </div>
                  <span style={{
                    fontSize:    9,
                    fontWeight:  700,
                    padding:     '2px 6px',
                    borderRadius: 3,
                    background:  sev.bg,
                    color:       sev.color,
                    display:     'inline-block',
                    marginTop:   3
                  }}>
                    {a.severity}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}