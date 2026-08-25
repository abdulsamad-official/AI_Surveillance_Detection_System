import React, { useState, useEffect } from 'react';
import { getRecordings, downloadRecording } from '../services/api';

const eventIcons = {
  Fire:       '🔥',
  Violence:   '⚡',
  Gun:        '🔫',
  Knife:      '🔪',
  Falling:    '🏃',
  Smoke:      '💨',
  Theft_Mask: '🎭',
  Normal:     '🛡️'
};

const eventColors = {
  Fire:       '#fb923c',
  Violence:   '#f43f5e',
  Gun:        '#f87171',
  Knife:      '#facc15',
  Falling:    '#a78bfa',
  Smoke:      '#94a3b8',
  Theft_Mask: '#fbbf24',
  Normal:     '#22c55e'
};

const thumbBg = {
  Fire:       'linear-gradient(135deg,#1a0500,#3d0f00)',
  Violence:   'linear-gradient(135deg,#0a0010,#200530)',
  Gun:        'linear-gradient(135deg,#0a0a00,#1a1000)',
  Knife:      'linear-gradient(135deg,#1a1000,#2d1f00)',
  Falling:    'linear-gradient(135deg,#0a0020,#1a0a40)',
  Smoke:      'linear-gradient(135deg,#0a0a0a,#1a1a1a)',
  Theft_Mask: 'linear-gradient(135deg,#1a1000,#2d1a00)',
  Normal:     'linear-gradient(135deg,#001a05,#003010)'
};

export default function RecordingsPanel() {
  const [recordings, setRecordings] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [active,     setActive]     = useState({});

  useEffect(() => {
    loadRecordings();
    const id = setInterval(loadRecordings, 5000);
    return () => clearInterval(id);
  }, []);

  const loadRecordings = async () => {
    try {
      const res = await getRecordings();
      setRecordings(res.data.recordings || []);
    } catch (err) {
      console.error('[Recordings] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (filename) => {
    const url = downloadRecording(filename);
    const a   = document.createElement('a');
    a.href    = url;
    a.download = filename;
    a.click();
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>

      {/* Header */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   8
      }}>
        <span style={{
          fontSize:      11,
          fontWeight:    700,
          color:         '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '.5px'
        }}>
          Recent Recordings
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            onClick={loadRecordings}
            style={{ fontSize: 12, cursor: 'pointer', color: '#64748b' }}
            title="Refresh"
          >↺</span>
          {/* // Replace "View All" span: */}
          <span
            style={{ fontSize: 10, color: '#3b82f6', cursor: 'pointer' }}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'Recordings' }));
            }}
          >
            View All
          </span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '16px 0', color: '#64748b', fontSize: 11 }}>
          Loading recordings...
        </div>
      )}

      {/* Empty state */}
      {!loading && recordings.length === 0 && (
        <div style={{
          textAlign:  'center',
          padding:    '20px 0',
          color:      '#64748b'
        }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>🎬</div>
          <div style={{ fontSize: 11, fontWeight: 600 }}>No recordings yet</div>
          <div style={{ fontSize: 10, marginTop: 3 }}>
            Recordings appear when threats are detected
          </div>
        </div>
      )}

      {/* Recordings list */}
      {recordings.map((rec, i) => {
        const color = eventColors[rec.event_type] || '#94a3b8';
        const icon  = eventIcons[rec.event_type]  || '⚠️';
        const bg    = thumbBg[rec.event_type]     || thumbBg.Normal;

        return (
          <div
            key={rec.id || i}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              padding:      '7px 0',
              borderBottom: i < recordings.length - 1
                ? '1px solid #1e2d47' : 'none'
            }}
          >
            {/* Thumbnail */}
            <div style={{
              width:          50,
              height:         34,
              borderRadius:   4,
              background:     bg,
              flexShrink:     0,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              fontSize:       16,
              border:         `1px solid ${color}33`,
              position:       'relative'
            }}>
              {icon}
              {/* Recording indicator */}
              {rec.status === 'recording' && (
                <span style={{
                  position:     'absolute',
                  top:          2, right: 2,
                  width:        6, height: 6,
                  borderRadius: '50%',
                  background:   '#ef4444',
                  animation:    'livePulse 1s infinite'
                }} />
              )}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize:   11,
                fontWeight: 600,
                color:      color,
                display:    'flex',
                alignItems: 'center',
                gap:        5
              }}>
                {rec.event_type} Detected
                {rec.status === 'recording' && (
                  <span style={{
                    fontSize:     9,
                    background:   '#450a0a',
                    color:        '#f87171',
                    padding:      '1px 5px',
                    borderRadius: 3
                  }}>● REC</span>
                )}
              </div>
              <div style={{
                fontSize:     10,
                color:        '#64748b',
                marginTop:    1,
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                whiteSpace:   'nowrap'
              }}>
                {rec.camera_name}
              </div>
              <div style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>
                {rec.timestamp}
                {rec.size_mb > 0 && (
                  <span style={{ marginLeft: 6 }}>
                    {rec.size_mb} MB
                  </span>
                )}
              </div>
            </div>

            {/* Duration */}
            <span style={{
              fontSize:    10,
              color:       rec.status === 'recording' ? '#f87171' : '#64748b',
              marginRight: 4,
              flexShrink:  0
            }}>
              {rec.duration}
            </span>

            {/* Download — only when complete */}
            {rec.status === 'complete' ? (
              <span
                onClick={() => handleDownload(rec.filename)}
                title="Download"
                style={{
                  fontSize:   18,
                  color:      '#3b82f6',
                  cursor:     'pointer',
                  flexShrink: 0
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                onMouseLeave={e => e.currentTarget.style.color = '#3b82f6'}
              >⬇</span>
            ) : (
              <span style={{ fontSize: 11, color: '#64748b', flexShrink: 0 }}>
                ⏺
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}