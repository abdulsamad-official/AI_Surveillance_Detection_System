import React from 'react';

const navItems = [
  { icon: '⊞', label: 'Dashboard' },
  { icon: '👁', label: 'Live View' },
  { icon: '📷', label: 'Cameras' },
  { icon: '📅', label: 'Events' },
  { icon: '🎥', label: 'Recordings' },
  { icon: '📊', label: 'Graphs' },
  { icon: '🔔', label: 'Alerts' },
  { icon: '⚙',  label: 'Settings' },
  // { icon: '👤', label: 'Users' },
  { icon: '📄', label: 'Logs' },
  { icon: '🖥',  label: 'System' },
];

const features = [
  { color: '#1e3a5f', tc: '#60a5fa', label: 'Multi-Camera Monitoring',     desc: 'Add 1, 2, or more IP/USB cameras with live status.' },
  { color: '#2d0a0a', tc: '#f87171', label: 'Smart Threat Detection',       desc: 'Detects multiple classes with color-coded alerts.' },
  { color: '#0f2d25', tc: '#34d399', label: 'Intelligent Recording',        desc: 'Records 10 min before & after threat (20 min total).' },
  { color: '#2d1a0a', tc: '#fb923c', label: 'Automatic Video Management',   desc: 'Auto-deletes normal videos after 10 min.' },
  { color: '#2d220a', tc: '#fbbf24', label: 'Real-time Analytics',          desc: 'Interactive graphs for all detection classes.' },
  { color: '#1e1040', tc: '#c084fc', label: 'High Performance & Optimized', desc: 'CPU optimized inference with minimal latency.' },
];

// ── Props se activePage aur setActivePage lo ─────────────────────
export default function Sidebar({ activePage, setActivePage }) {

  return (
    <div style={{
      background:    '#111827',
      borderRight:   '1px solid #1e2d47',
      display:       'flex',
      flexDirection: 'column',
      overflowY:     'auto',
      // Without an explicit height, a flex child sizes to its content
      // instead of its parent, so overflowY:auto never actually
      // triggers — the sidebar just grows and pushes the page down.
      // height + minHeight:0 clips it to the parent's height so it
      // scrolls independently of the main content.
      height:        '100%',
      minHeight:     0,
      fontSize:      '12px'
    }}>

      {/* ── 1. Logo ───────────────────────────────────────── */}
      <div style={{ padding: '14px 12px', borderBottom: '1px solid #1e2d47', flexShrink: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>
          REAL-TIME BRAWL<br />DETECTION SYSTEM
        </div>
        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px' }}>
          AI Powered Video Analytics for Safety & Security
        </div>
      </div>

      {/* ── 2. Navigation ─────────────────────────────────── */}
      <div style={{ padding: '8px 0', borderBottom: '1px solid #1e2d47', flexShrink: 0 }}>
        {navItems.map((item, i) => (
          <div
            key={i}
            onClick={() => setActivePage(item.label)}
            style={{
              display:     'flex',
              alignItems:  'center',
              gap:         8,
              padding:     '8px 16px',
              cursor:      'pointer',
              color:       activePage === item.label ? '#60a5fa' : '#94a3b8',
              background:  activePage === item.label ? '#1e3a5f' : 'transparent',
              borderRight: activePage === item.label
                ? '2px solid #3b82f6'
                : '2px solid transparent',
              fontSize:    12,
              transition:  'all .15s'
            }}
            onMouseEnter={e => {
              if (activePage !== item.label) {
                e.currentTarget.style.background = '#151d2e';
                e.currentTarget.style.color      = '#e2e8f0';
              }
            }}
            onMouseLeave={e => {
              if (activePage !== item.label) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color      = '#94a3b8';
              }
            }}
          >
            <span style={{ width: 16, fontSize: 14 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      {/* ── 3. Key Features ───────────────────────────────── */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2d47', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: '8px' }}>
          Key Features
        </div>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: f.color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.tc, fontSize: 10 }}>●</div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#93c5fd' }}>{f.label}</div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: 1, lineHeight: 1.4 }}>{f.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 4. Tech & Performance ─────────────────────────── */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #1e2d47', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: '6px' }}>
          Tech & Performance
        </div>
        {[
          'YOLO11m Model Integration',
          'Optimized Inference (ONNX / OpenVINO)',
          'Multi-threaded Processing',
          'Frame Skipping & Batch Processing',
          'Efficient Memory & CPU Usage',
          'Real-time Alerts & Notifications',
        ].map((t, i) => (
          <div key={i} style={{ fontSize: '9px', color: '#94a3b8', marginBottom: 3, paddingLeft: 10, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, color: '#3b82f6' }}>•</span>{t}
          </div>
        ))}
      </div>

      {/* ── 5. Additional Features ────────────────────────── */}
      <div style={{ padding: '10px 12px', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: '6px' }}>
          Additional Features
        </div>
        {[
          // 'User Authentication & Role Management',
          'Event Search & Filter',
          'Download & Share Records',
          'Email / Telegram / SMS Alerts',
          'System Logs & Audit Trail',
          'Dark / Light Mode',
          'Responsive Design (Desktop & Mobile)',
        ].map((t, i) => (
          <div key={i} style={{ fontSize: '9px', color: '#94a3b8', marginBottom: 3, paddingLeft: 10, position: 'relative' }}>
            <span style={{ position: 'absolute', left: 0, color: '#3b82f6' }}>•</span>{t}
          </div>
        ))}
      </div>

    </div>
  );
}