import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getClassVisibility } from '../services/api';

const classConfig = {
  Normal:   { icon: '🛡️', color: '#22c55e' },
  Phone:    { icon: '📱', color: '#60a5fa' },
  Medical_Mask:     { icon: '😷', color: '#34d399' },
  Fire:     { icon: '🔥', color: '#fb923c' },
  Smoke:    { icon: '💨', color: '#94a3b8' },
  Gun:      { icon: '🔫', color: '#f87171' },
  Knife:    { icon: '🔪', color: '#facc15' },
  Falling:  { icon: '🏃', color: '#a78bfa' },
  Violence: { icon: '⚡', color: '#f43f5e' },
  Theft_Mask:    { icon: '🎭', color: '#fbbf24' },
};

export default function DetectionSummary() {
  const { detectionSummary } = useApp();
  const [visibility, setVisibility] = useState({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getClassVisibility();
        setVisibility(res.data.visibility || {});
      } catch (e) {}
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  // Only show enabled classes
  const classes = Object.entries(classConfig)
    .filter(([key]) => visibility[key] !== false)
    .map(([key, cfg]) => ({
      label: key.replace('_', ' '),
      count: detectionSummary[key] || 0,
      ...cfg
    }));

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        fontSize: 11, fontWeight: 700,
        color: '#94a3b8', textTransform: 'uppercase',
        letterSpacing: '.5px', marginBottom: 8
      }}>
        Detection Summary
        <span style={{ color: '#64748b', fontWeight: 400, textTransform: 'none' }}>
          {' '}(Today)
        </span>
      </div>
      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 4 }}>
        {classes.map((c, i) => (
          <div key={i} style={{
            background:   '#151d2e',
            border:       '1px solid #1e2d47',
            borderRadius: 6,
            padding:      '8px 10px',
            textAlign:    'center',
            minWidth:     70,
            flexShrink:   0
          }}>
            <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>
              {c.icon}
            </span>
            <span style={{
              fontSize:      9,
              fontWeight:    600,
              textTransform: 'uppercase',
              color:         c.color,
              display:       'block'
            }}>
              {c.label}
            </span>
            <span style={{
              fontSize:   18,
              fontWeight: 700,
              color:      c.color,
              display:    'block',
              marginTop:  2
            }}>
              {c.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}