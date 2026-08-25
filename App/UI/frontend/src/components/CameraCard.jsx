import React, { useState } from 'react';
import { deleteCamera, updateCamera } from '../services/api';
import { useApp } from '../context/AppContext';

const detColors = {
  Normal:   '#22c55e',
  Phone:    '#60a5fa',
  Medical_Mask:   '#34d399',
  Fire:     '#ef4444',
  Smoke:    '#94a3b8',
  Gun:      '#f87171',
  Knife:    '#facc15',
  Falling:  '#a78bfa',
  Violence: '#a855f7',
  Theft_Mask:  '#fbbf24'
};

const threatBorder = {
  Fire:     '#7f1d1d',
  Violence: '#7f1d3f',
  Gun:      '#7f1d1d',
  Knife:    '#7f6d00',
  Theft_Mask:  '#7f5900'
};

// ── Fullscreen overlay ───────────────────────────────────────────
function FullscreenView({ camera, lastClass, lastConf, onClose }) {
  const streamUrl = `http://localhost:8000/cameras/${camera.id}/stream`;
  const detColor  = detColors[lastClass] || '#22c55e';

  return (
    <div
      onClick={onClose}
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(0,0,0,.92)',
        zIndex:         9999,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center'
      }}
    >
      {/* Header */}
      <div style={{
        width:          '90vw',
        maxWidth:       960,
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
            {camera.name}
          </span>
          <span style={{
            background:   `${detColor}22`,
            border:       `1px solid ${detColor}`,
            color:        detColor,
            fontSize:     11,
            fontWeight:   700,
            padding:      '3px 10px',
            borderRadius: 4
          }}>
            {lastClass}{lastConf > 0 ? ` ${lastConf.toFixed(2)}` : ''}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#22c55e' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e', display: 'inline-block',
              animation: 'livePulse 1.5s infinite'
            }} />
            Live
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background:   '#1e2d47',
            border:       '1px solid #253550',
            color:        '#e2e8f0',
            fontSize:     13,
            fontWeight:   700,
            padding:      '6px 16px',
            borderRadius: 6,
            cursor:       'pointer'
          }}
        >✕ Close</button>
      </div>

      {/* Stream with boxes already drawn by backend */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:        '90vw',
          maxWidth:     960,
          position:     'relative',
          borderRadius: 10,
          overflow:     'hidden',
          border:       `1px solid ${detColor}44`
        }}
      >
        <img
          src={streamUrl}
          alt={camera.name}
          style={{
            width:          '100%',
            display:        'block',
            imageRendering: 'auto'
          }}
        />

        {/* Bottom info */}
        <div style={{
          position:       'absolute',
          bottom:         0, left: 0, right: 0,
          background:     'rgba(0,0,0,.7)',
          padding:        '8px 14px',
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center'
        }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>
            📍 {camera.location || 'Unknown'}
          </span>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            {camera.detections || 0} detections today
          </span>
        </div>
      </div>

      <p style={{ fontSize: 10, color: '#64748b', marginTop: 10 }}>
        Click anywhere outside to close
      </p>
    </div>
  );
}

// ── Main Card ────────────────────────────────────────────────────
export default function CameraCard({ camera }) {
  const { refreshCameras, cameraDetections } = useApp();

  const [deleting,   setDeleting]   = useState(false);
  const [toggling,   setToggling]   = useState(false);
  const [showMenu,   setShowMenu]   = useState(false);
  const [imgError,   setImgError]   = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const isOnline = camera.status === 'online';

  // ── Live detection from WebSocket ───────────────────────────
  const liveDet   = cameraDetections?.[camera.id] || {};
  const lastClass = liveDet.class_name || 'Normal';
  const lastConf  = liveDet.confidence || 0.0;
  const detColor  = detColors[lastClass] || '#22c55e';
  const borderCol = isOnline
    ? (threatBorder[lastClass] || '#1e2d47')
    : '#1e2d47';

  const streamUrl = `http://localhost:8000/cameras/${camera.id}/stream`;

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${camera.name}"?`)) return;
    setDeleting(true);
    try {
      await deleteCamera(camera.id);
      await refreshCameras();
    } catch {
      alert('Failed to delete camera');
    } finally {
      setDeleting(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      await updateCamera(camera.id, {
        status: isOnline ? 'offline' : 'online'
      });
      await refreshCameras();
    } catch {
      alert('Failed to update camera');
    } finally {
      setToggling(false);
      setShowMenu(false);
    }
  };

  return (
    <>
      {/* Fullscreen overlay */}
      {fullscreen && (
        <FullscreenView
          camera={camera}
          lastClass={lastClass}
          lastConf={lastConf}
          onClose={() => setFullscreen(false)}
        />
      )}

      <div style={{
        background:   '#151d2e',
        border:       `1px solid ${borderCol}`,
        borderRadius: 8,
        overflow:     'hidden',
        opacity:      deleting ? 0.5 : 1,
        position:     'relative',
        transition:   'border-color .4s, opacity .3s'
      }}>

        {/* ── HEADER ─────────────────────────────────────────── */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          padding:        '6px 10px',
          background:     '#000207'
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#e2e8f0' }}>
            {camera.name}
          </span>
          {isOnline ? (
            <span style={{
              display:    'flex',
              alignItems: 'center',
              gap:        3,
              fontSize:   9,
              color:      '#22c55e'
            }}>
              <span style={{
                width:      6, height: 6,
                borderRadius: '50%',
                background:   '#22c55e',
                display:      'inline-block',
                animation:    'livePulse 1.5s infinite'
              }} />
              Live
              <style>{`
                @keyframes livePulse {
                  0%,100% { opacity: 1; }
                  50%     { opacity: .3; }
                }
              `}</style>
            </span>
          ) : (
            <span style={{
              display:    'flex',
              alignItems: 'center',
              gap:        3,
              fontSize:   9,
              color:      '#64748b'
            }}>
              <span style={{
                width:        6, height: 6,
                borderRadius: '50%',
                background:   '#64748b',
                display:      'inline-block'
              }} />
              Offline
            </span>
          )}
        </div>

        {/* ── FEED ───────────────────────────────────────────── */}
        <div
          onClick={() => isOnline && setFullscreen(true)}
          style={{
            height:     120,
            position:   'relative',
            background: '#080f1a',
            overflow:   'hidden',
            cursor:     isOnline ? 'pointer' : 'default',
            display:    'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isOnline ? (
            <>
              {!imgError ? (
                <>
                  {/* MJPEG stream — boxes drawn by backend (no flicker) */}
                  <img
                    src={streamUrl}
                    alt={camera.name}
                    style={{
                      width:          '100%',
                      height:         '100%',
                      objectFit:      'cover',
                      display:        'block',
                      imageRendering: 'auto',
                      // GPU acceleration — prevents flicker
                      transform:      'translateZ(0)',
                      willChange:     'contents'
                    }}
                    onError={() => setImgError(true)}
                    onLoad={()  => setImgError(false)}
                  />

                  {/* Detection label overlay */}
                  <div style={{
                    position:     'absolute',
                    top:          6,
                    left:         6,
                    background:   `${detColor}22`,
                    border:       `1px solid ${detColor}`,
                    borderRadius: 4,
                    padding:      '2px 7px',
                    fontSize:     9,
                    fontWeight:   700,
                    color:        detColor,
                    pointerEvents:'none',
                    transition:   'color .3s, border-color .3s'
                  }}>
                    {lastClass}{lastConf > 0 ? ` ${lastConf.toFixed(2)}` : ''}
                  </div>

                  {/* Expand hint */}
                  <div style={{
                    position:     'absolute',
                    bottom:       4, right: 4,
                    background:   'rgba(0,0,0,.55)',
                    color:        '#94a3b8',
                    fontSize:     8,
                    padding:      '2px 5px',
                    borderRadius: 3,
                    pointerEvents:'none'
                  }}>
                    ⛶ expand
                  </div>

                  {/* Location */}
                  {camera.location && (
                    <div style={{
                      position:     'absolute',
                      bottom:       4, left: 4,
                      background:   'rgba(0,0,0,.55)',
                      color:        '#94a3b8',
                      fontSize:     8,
                      padding:      '2px 5px',
                      borderRadius: 3,
                      pointerEvents:'none'
                    }}>
                      📍 {camera.location}
                    </div>
                  )}
                </>
              ) : (
                /* Stream error fallback */
                <div style={{
                  display:       'flex',
                  flexDirection: 'column',
                  alignItems:    'center',
                  gap:           6
                }}>
                  <span style={{ fontSize: 22 }}>📷</span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>
                    Stream unavailable
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setImgError(false); }}
                    style={{
                      background:   '#1e3a5f',
                      border:       '1px solid #253550',
                      color:        '#60a5fa',
                      fontSize:     9,
                      padding:      '3px 8px',
                      borderRadius: 4,
                      cursor:       'pointer'
                    }}
                  >↺ Retry</button>
                </div>
              )}
            </>
          ) : (
            /* Offline state */
            <div style={{
              display:       'flex',
              flexDirection: 'column',
              alignItems:    'center',
              gap:           6
            }}>
              <span style={{ fontSize: 24, opacity: .4 }}>📷</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>[ Offline ]</span>
            </div>
          )}
        </div>

        {/* ── FOOTER ─────────────────────────────────────────── */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          padding:        '5px 10px',
          background:     '#000206',
          position:       'relative'
        }}>

          {/* Expand button */}
          <span
            title="Expand view"
            onClick={() => isOnline && setFullscreen(true)}
            style={{
              fontSize:   15,
              cursor:     isOnline ? 'pointer' : 'default',
              color:      isOnline ? '#64748b' : '#2a3a50',
              transition: 'color .15s'
            }}
            onMouseEnter={e => { if (isOnline) e.currentTarget.style.color = '#60a5fa'; }}
            onMouseLeave={e => { e.currentTarget.style.color = isOnline ? '#64748b' : '#2a3a50'; }}
          >⛶</span>

          {/* Detection count */}
          <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600 }}>
            {camera.detections > 0
              ? `${camera.detections} det`
              : <span style={{ color: '#2a3a50' }}>—</span>
            }
          </span>

          {/* Options menu */}
          <span
            onClick={() => setShowMenu(!showMenu)}
            style={{
              fontSize:   16,
              cursor:     'pointer',
              fontWeight: 700,
              color:      showMenu ? '#60a5fa' : '#64748b',
              transition: 'color .15s'
            }}
          >⋯</span>

          {/* Signal bars */}
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            {[4, 6, 8, 10].map((h, i) => (
              <span key={i} style={{
                width:        3, height: h,
                background:   isOnline ? '#22c55e' : '#253550',
                borderRadius: 1,
                display:      'block',
                opacity:      isOnline ? 1 : 0.4
              }} />
            ))}
          </div>

          {/* Dropdown menu */}
          {showMenu && (
            <div style={{
              position:     'absolute',
              bottom:       '110%', right: 0,
              background:   '#0f172a',
              border:       '1px solid #253550',
              borderRadius: 8,
              overflow:     'hidden',
              zIndex:       200,
              minWidth:     160,
              boxShadow:    '0 8px 24px rgba(0,0,0,.7)'
            }}>
              {isOnline && (
                <div
                  onClick={() => { setFullscreen(true); setShowMenu(false); }}
                  style={{ padding: '10px 14px', fontSize: 11, color: '#60a5fa', cursor: 'pointer', borderBottom: '1px solid #1e2d47' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1a2340'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >⛶ Expand View</div>
              )}
              <div
                onClick={handleToggle}
                style={{
                  padding:      '10px 14px',
                  fontSize:     11,
                  color:        isOnline ? '#fbbf24' : '#4ade80',
                  cursor:       toggling ? 'not-allowed' : 'pointer',
                  borderBottom: '1px solid #1e2d47'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a2340'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {toggling
                  ? '⏳ Updating...'
                  : isOnline ? '⏸ Set Offline' : '▶ Set Online'
                }
              </div>
              <div
                onClick={handleDelete}
                style={{
                  padding:  '10px 14px',
                  fontSize: 11,
                  color:    '#f87171',
                  cursor:   deleting ? 'not-allowed' : 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1a2340'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >🗑 Delete Camera</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}