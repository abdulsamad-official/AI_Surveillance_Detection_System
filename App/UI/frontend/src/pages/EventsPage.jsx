import React, { useState, useEffect, useRef } from 'react';
import { getDetections } from '../services/api';

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
  Medical_Mask:'#34d399',
  Normal:   '#22c55e'
};

const SEVERITY_COLORS = {
  High:   { color: '#f87171', bg: '#450a0a' },
  Medium: { color: '#fbbf24', bg: '#2d220a' },
  Low:    { color: '#4ade80', bg: '#0d2010' }
};

export default function EventsPage() {
  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [classFilter,  setClassFilter]  = useState('all');
  const [sortBy,       setSortBy]       = useState('newest');
  const [lastUpdate,   setLastUpdate]   = useState('');
  const intervalRef = useRef(null);

  const loadEvents = async () => {
    try {
      const res = await getDetections(200);
      setEvents(res.data.detections || []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('[Events] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    intervalRef.current = setInterval(loadEvents, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // ── Filter + Search + Sort ───────────────────────────────────
  const filtered = events
    .filter(e => {
      if (classFilter !== 'all' && e.class_name !== classFilter)
        return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          e.class_name?.toLowerCase().includes(s)  ||
          e.camera_name?.toLowerCase().includes(s) ||
          e.timestamp?.toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest')     return -1;
      if (sortBy === 'oldest')     return 1;
      if (sortBy === 'confidence') return b.confidence - a.confidence;
      return -1;
    });

  // ── Stats ────────────────────────────────────────────────────
  const total       = events.length;
  const threats     = events.filter(e =>
    ['Fire','Gun','Knife','Violence','Smoke','Falling','Theft_Mask']
    .includes(e.class_name)
  ).length;
  const highConf    = events.filter(e => e.confidence >= 0.8).length;
  const todayEvents = events.filter(e => {
    try {
      const d = new Date(e.timestamp?.replace(' ', 'T'));
      return d.toDateString() === new Date().toDateString();
    } catch { return false; }
  }).length;

  const btnStyle = (active, color = '#3b82f6') => ({
    background:   active ? `${color}22` : '#0a0e1a',
    border:       `1px solid ${active ? color : '#1e2d47'}`,
    color:        active ? color : '#64748b',
    padding:      '5px 12px',
    borderRadius: 6,
    fontSize:     10,
    fontWeight:   600,
    cursor:       'pointer'
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
            Events
          </h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
            All detection events — Updated: {lastUpdate}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={loadEvents} style={{
            background: '#151d2e', border: '1px solid #1e2d47',
            color: '#94a3b8', padding: '6px 12px',
            borderRadius: 6, fontSize: 11, cursor: 'pointer'
          }}>
            ↺ Refresh
          </button>
          {/* Export CSV */}
          <button
            onClick={() => {
              const csv = [
                ['ID','Class','Camera','Confidence','Severity','Timestamp'],
                ...events.map(e => [
                  e.id, e.class_name, e.camera_name,
                  e.confidence, e.severity, e.timestamp
                ])
              ].map(r => r.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement('a');
              a.href     = url;
              a.download = `events_${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              background: '#0d2010', border: '1px solid #166534',
              color: '#4ade80', padding: '6px 12px',
              borderRadius: 6, fontSize: 11,
              fontWeight: 600, cursor: 'pointer'
            }}
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 8, marginBottom: 14
      }}>
        {[
          { label: 'Total Events',   value: total,       color: '#60a5fa' },
          { label: 'Threat Events',  value: threats,     color: '#f87171' },
          { label: 'High Confidence',value: highConf,    color: '#fbbf24' },
          { label: 'Today',          value: todayEvents, color: '#22c55e' },
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

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 12,
        flexWrap: 'wrap', alignItems: 'center'
      }}>
        {/* Search */}
        <input
          placeholder="Search events..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: '#0a0e1a', border: '1px solid #1e2d47',
            borderRadius: 6, padding: '6px 12px',
            color: '#e2e8f0', fontSize: 11,
            outline: 'none', width: 200
          }}
        />

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

        {/* Sort */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { val: 'newest',     label: 'Newest' },
            { val: 'oldest',     label: 'Oldest' },
            { val: 'confidence', label: 'Confidence' }
          ].map(s => (
            <button
              key={s.val}
              onClick={() => setSortBy(s.val)}
              style={btnStyle(sortBy === s.val)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <span style={{ fontSize: 10, color: '#64748b', marginLeft: 'auto' }}>
          {filtered.length} events
        </span>
      </div>

      {/* Events Table */}
      {loading ? (
        <div style={{
          textAlign: 'center', padding: '40px 0',
          color: '#64748b', fontSize: 13
        }}>
          Loading events...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: '#64748b'
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No events found</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            {search || classFilter !== 'all'
              ? 'Try changing filters'
              : 'No detections recorded yet'}
          </div>
        </div>
      ) : (
        <div style={{
          background: '#151d2e', border: '1px solid #1e2d47',
          borderRadius: 8, overflow: 'hidden'
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 140px 100px 80px 80px 160px',
            padding: '8px 14px',
            background: '#1a2340',
            borderBottom: '1px solid #1e2d47',
            fontSize: 10, fontWeight: 700,
            color: '#64748b', textTransform: 'uppercase',
            letterSpacing: '.5px'
          }}>
            <span>#</span>
            <span>Class</span>
            <span>Camera</span>
            <span>Severity</span>
            <span>Conf</span>
            <span>Bbox</span>
            <span>Timestamp</span>
          </div>

          {/* Event Rows */}
          {filtered.map((event, i) => {
            const icon  = CLASS_ICONS[event.class_name]  || '⚠️';
            const color = CLASS_COLORS[event.class_name] || '#94a3b8';
            const sev   = SEVERITY_COLORS[event.severity] || SEVERITY_COLORS.Low;
            const hasBbox = event.bbox && event.bbox.length === 4;

            return (
              <div
                key={event.id || i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 140px 100px 80px 80px 160px',
                  padding: '9px 14px',
                  borderBottom: i < filtered.length - 1
                    ? '1px solid #1e2d4755' : 'none',
                  alignItems: 'center',
                  transition: 'background .15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a2340'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Index */}
                <span style={{ fontSize: 10, color: '#475569' }}>
                  {filtered.length - i}
                </span>

                {/* Class */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color }}>
                    {event.class_name?.replace('_', ' ')}
                  </span>
                </div>

                {/* Camera */}
                <span style={{
                  fontSize: 11, color: '#94a3b8',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {event.camera_name}
                </span>

                {/* Severity */}
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding: '3px 8px', borderRadius: 4,
                  background: sev.bg, color: sev.color,
                  display: 'inline-block', textAlign: 'center'
                }}>
                  {event.severity || 'Low'}
                </span>

                {/* Confidence */}
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 600,
                    color: event.confidence >= 0.8 ? '#4ade80' :
                           event.confidence >= 0.6 ? '#fbbf24' : '#94a3b8'
                  }}>
                    {((event.confidence || 0) * 100).toFixed(0)}%
                  </div>
                  <div style={{
                    height: 3, width: '60px',
                    background: '#1e2d47', borderRadius: 2, marginTop: 2
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${(event.confidence || 0) * 100}%`,
                      background: event.confidence >= 0.8 ? '#4ade80' :
                                  event.confidence >= 0.6 ? '#fbbf24' : '#94a3b8'
                    }} />
                  </div>
                </div>

                {/* Bbox */}
                <span style={{
                  fontSize: 9, color: '#64748b',
                  background: '#0a0e1a',
                  padding: '2px 5px', borderRadius: 3
                }}>
                  {hasBbox ? '✓ Box' : '—'}
                </span>

                {/* Timestamp */}
                <span style={{ fontSize: 10, color: '#64748b' }}>
                  {event.timestamp}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}