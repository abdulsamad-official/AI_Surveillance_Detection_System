import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import useResponsive from '../hooks/useResponsive';

function AnimatedNumber({ value, color, fontSize }) {
  // Value already comes from context state, so we just render it —
  // the "animation" is the CSS color transition below.
  return (
    <div style={{
      fontSize,
      fontWeight: 700,
      color,
      lineHeight: 1.15,
      transition: 'color .3s'
    }}>
      {value}
    </div>
  );
}

export default function StatsRow() {
  const { stats, wsConnected } = useApp();
  const { isMobile } = useResponsive();

  const items = useMemo(() => [
    {
      icon:     '📷',
      label:    'Cameras',
      value:    `${stats.cameras_online || 0} / ${stats.cameras_total || 0}`,
      sub:      'Online',
      subColor: '#3b82f6',
      accent:   '#3b82f6',
      onClick:  null
    },
    {
      icon:     '🔍',
      label:    'Total Detections',
      value:    stats.total_detections || 0,
      sub:      'Today',
      subColor: '#64748b',
      accent:   '#a78bfa',
      onClick:  null
    },
    {
      icon:     '🚨',
      label:    'Active Alerts',
      value:    stats.active_alerts || 0,
      sub:      'View All',
      subColor: (stats.active_alerts || 0) > 0 ? '#ef4444' : '#64748b',
      valColor: (stats.active_alerts || 0) > 0 ? '#ef4444' : '#22c55e',
      accent:   (stats.active_alerts || 0) > 0 ? '#ef4444' : '#22c55e',
      onClick:  () => window.dispatchEvent(
        new CustomEvent('navigate', { detail: 'Alerts' })
      )
    },
    {
      icon:     '💚',
      label:    'System Status',
      value:    wsConnected ? 'Healthy' : 'Offline',
      sub:      wsConnected ? 'All Systems Operational' : 'Reconnecting...',
      subColor: '#64748b',
      valColor: wsConnected ? '#22c55e' : '#f97316',
      accent:   wsConnected ? '#22c55e' : '#f97316',
      onClick:  null
    },
  ], [stats, wsConnected]);

  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap:                 10,
      padding:             isMobile ? '10px 10px 4px' : '14px 16px 6px',
      flexShrink:          0
    }}>
      {items.map((s, i) => (
        <div
          key={i}
          onClick={s.onClick || undefined}
          style={{
            position:     'relative',
            background:   '#111827',
            border:       '1px solid #1e2d47',
            borderRadius: 12,
            padding:      isMobile ? '10px 12px' : '14px 16px',
            display:      'flex',
            alignItems:   'center',
            gap:          isMobile ? 10 : 14,
            cursor:       s.onClick ? 'pointer' : 'default',
            overflow:     'hidden',
            transition:   'transform .15s ease, border-color .15s ease, box-shadow .15s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform   = 'translateY(-2px)';
            e.currentTarget.style.borderColor = s.accent + '55';
            e.currentTarget.style.boxShadow   = `0 8px 20px -8px ${s.accent}55`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform   = 'translateY(0)';
            e.currentTarget.style.borderColor = '#1e2d47';
            e.currentTarget.style.boxShadow   = 'none';
          }}
        >
          {/* Accent glow strip */}
          <div style={{
            position:   'absolute',
            top: 0, left: 0, right: 0,
            height:     2,
            background: `linear-gradient(90deg, ${s.accent}, transparent)`
          }} />

          {/* Icon badge */}
          <div style={{
            width:          isMobile ? 36 : 42,
            height:         isMobile ? 36 : 42,
            borderRadius:   10,
            background:     s.accent + '1f',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       isMobile ? 17 : 20,
            flexShrink:     0
          }}>
            {s.icon}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize:      isMobile ? 9 : 10,
              color:         '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '.4px',
              fontWeight:    600
            }}>
              {s.label}
            </div>
            <AnimatedNumber
              value={s.value}
              color={s.valColor || '#fff'}
              fontSize={isMobile ? 16 : 20}
            />
            <div
              style={{
                fontSize:   isMobile ? 9 : 10.5,
                color:      s.subColor,
                marginTop:  2,
                fontWeight: s.onClick ? 600 : 400,
                transition: 'color .15s'
              }}
            >
              {s.sub}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}