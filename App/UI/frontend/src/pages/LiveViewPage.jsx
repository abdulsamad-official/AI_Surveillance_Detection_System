import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const detColors = {
  Normal:       '#22c55e', Phone:        '#60a5fa',
  Medical_Mask: '#34d399', Fire:         '#ef4444',
  Smoke:        '#94a3b8', Gun:          '#f87171',
  Knife:        '#facc15', Falling:      '#a78bfa',
  Violence:     '#a855f7', Theft_Mask:   '#fbbf24'
};

function CameraFeed({ camera, liveDet, size = 'normal' }) {
  const [imgError, setImgError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const isOnline  = camera.status === 'online';
  const lastClass = liveDet?.class_name || 'Normal';
  const lastConf  = liveDet?.confidence || 0;
  const detColor  = detColors[lastClass] || '#22c55e';
  const streamUrl = `http://localhost:8000/cameras/${camera.id}/stream`;

  const height = size === 'large' ? 320 : size === 'medium' ? 220 : 160;

  return (
    <>
      {/* Fullscreen */}
      {fullscreen && (
        <div
          onClick={() => setFullscreen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,.95)',
            zIndex: 9999, display: 'flex',
            flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div style={{
            width: '90vw', maxWidth: 960,
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>
                {camera.name}
              </span>
              <span style={{
                background: `${detColor}22`, border: `1px solid ${detColor}`,
                color: detColor, fontSize: 11, fontWeight: 700,
                padding: '3px 10px', borderRadius: 4
              }}>
                {lastClass}{lastConf > 0 ? ` ${lastConf.toFixed(2)}` : ''}
              </span>
            </div>
            <button onClick={() => setFullscreen(false)} style={{
              background: '#1e2d47', border: '1px solid #253550',
              color: '#e2e8f0', fontSize: 13, fontWeight: 700,
              padding: '6px 16px', borderRadius: 6, cursor: 'pointer'
            }}>✕ Close</button>
          </div>
          <div onClick={e => e.stopPropagation()} style={{
            width: '90vw', maxWidth: 960,
            borderRadius: 10, overflow: 'hidden',
            border: `1px solid ${detColor}44`
          }}>
            <img
              src={streamUrl}
              alt={camera.name}
              style={{ width: '100%', display: 'block' }}
            />
          </div>
          <p style={{ fontSize: 10, color: '#64748b', marginTop: 10 }}>
            Click anywhere outside to close
          </p>
        </div>
      )}

      {/* Camera card */}
      <div style={{
        background:   '#151d2e',
        border:       `1px solid ${isOnline ? detColors[lastClass] + '44' || '#1e2d47' : '#1e2d47'}`,
        borderRadius: 8, overflow: 'hidden',
        transition:   'border-color .3s'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '6px 10px',
          background: '#1a2340'
        }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#e2e8f0' }}>
            {camera.name}
          </span>
          {isOnline ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#22c55e' }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#22c55e', display: 'inline-block',
                animation: 'livePulse 1.5s infinite'
              }} />
              Live
              <style>{`@keyframes livePulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
            </span>
          ) : (
            <span style={{ fontSize: 9, color: '#64748b' }}>● Offline</span>
          )}
        </div>

        {/* Feed */}
        <div
          onClick={() => isOnline && setFullscreen(true)}
          style={{
            height, background: '#080f1a',
            position: 'relative', overflow: 'hidden',
            cursor: isOnline ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {isOnline ? (
            <>
              {!imgError ? (
                <img
                  src={streamUrl}
                  alt={camera.name}
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover', display: 'block',
                    transform: 'translateZ(0)'
                  }}
                  onError={() => setImgError(true)}
                  onLoad={()  => setImgError(false)}
                />
              ) : (
                <div style={{
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 6
                }}>
                  <span style={{ fontSize: 22 }}>📷</span>
                  <span style={{ fontSize: 10, color: '#64748b' }}>
                    Stream unavailable
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setImgError(false); }}
                    style={{
                      background: '#1e3a5f', border: '1px solid #253550',
                      color: '#60a5fa', fontSize: 9,
                      padding: '3px 8px', borderRadius: 4, cursor: 'pointer'
                    }}
                  >↺ Retry</button>
                </div>
              )}

              {/* Detection label */}
              {!imgError && (
                <div style={{
                  position: 'absolute', top: 6, left: 6,
                  background: `${detColor}22`,
                  border: `1px solid ${detColor}`,
                  borderRadius: 4, padding: '2px 7px',
                  fontSize: 9, fontWeight: 700, color: detColor,
                  pointerEvents: 'none'
                }}>
                  {lastClass}{lastConf > 0 ? ` ${lastConf.toFixed(2)}` : ''}
                </div>
              )}

              {/* Location */}
              {camera.location && !imgError && (
                <div style={{
                  position: 'absolute', bottom: 4, left: 4,
                  background: 'rgba(0,0,0,.6)',
                  color: '#94a3b8', fontSize: 8,
                  padding: '2px 5px', borderRadius: 3,
                  pointerEvents: 'none'
                }}>
                  📍 {camera.location}
                </div>
              )}

              {/* Expand */}
              {!imgError && (
                <div style={{
                  position: 'absolute', bottom: 4, right: 4,
                  background: 'rgba(0,0,0,.6)',
                  color: '#94a3b8', fontSize: 8,
                  padding: '2px 5px', borderRadius: 3,
                  pointerEvents: 'none'
                }}>
                  ⛶ expand
                </div>
              )}
            </>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 6
            }}>
              <span style={{ fontSize: 28, opacity: .3 }}>📷</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>Offline</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '5px 10px',
          background: '#1a2340'
        }}>
          <span style={{ fontSize: 10, color: '#64748b' }}>
            {camera.location || 'Unknown'}
          </span>
          <span style={{
            fontSize: 10, color: '#60a5fa', fontWeight: 600
          }}>
            {camera.detections > 0 ? `${camera.detections} det` : '—'}
          </span>
        </div>
      </div>
    </>
  );
}

export default function LiveViewPage() {
  const { cameras, cameraDetections, stats } = useApp();
  const [layout, setLayout] = useState('grid');  // grid, large, single
  const [selectedCam, setSelectedCam] = useState(null);

  const onlineCams  = cameras.filter(c => c.status === 'online');
  const offlineCams = cameras.filter(c => c.status === 'offline');

  const getCamSize = () => {
    if (layout === 'large')  return 'large';
    if (layout === 'single') return 'large';
    return onlineCams.length <= 2 ? 'large' : onlineCams.length <= 4 ? 'medium' : 'normal';
  };

  const getGridCols = () => {
    if (layout === 'single') return '1fr';
    if (layout === 'large')  return 'repeat(2,1fr)';
    if (onlineCams.length <= 1) return '1fr';
    if (onlineCams.length <= 2) return 'repeat(2,1fr)';
    return 'repeat(3,1fr)';
  };

  const displayCams = layout === 'single' && selectedCam
    ? cameras.filter(c => c.id === selectedCam)
    : layout === 'large'
      ? onlineCams
      : cameras;

  return (
    <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 14
      }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
            Live View
          </h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
            {onlineCams.length} online · {offlineCams.length} offline
          </p>
        </div>

        {/* Layout buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { val: 'grid',   label: '⊞ Grid'   },
            { val: 'large',  label: '⊟ Large'  },
            { val: 'single', label: '⊡ Single' },
          ].map(btn => (
            <button
              key={btn.val}
              onClick={() => setLayout(btn.val)}
              style={{
                background:   layout === btn.val ? '#1e3a5f' : '#151d2e',
                border:       `1px solid ${layout === btn.val ? '#3b82f6' : '#1e2d47'}`,
                color:        layout === btn.val ? '#60a5fa' : '#64748b',
                padding:      '5px 12px', borderRadius: 6,
                fontSize:     11, fontWeight: 600, cursor: 'pointer'
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Single mode — camera selector */}
      {layout === 'single' && (
        <div style={{
          display: 'flex', gap: 6, marginBottom: 12,
          flexWrap: 'wrap'
        }}>
          {cameras.map(cam => (
            <button
              key={cam.id}
              onClick={() => setSelectedCam(cam.id)}
              style={{
                background:   selectedCam === cam.id ? '#1e3a5f' : '#151d2e',
                border:       `1px solid ${selectedCam === cam.id ? '#3b82f6' : '#1e2d47'}`,
                color:        selectedCam === cam.id ? '#60a5fa' : '#64748b',
                padding:      '5px 12px', borderRadius: 6,
                fontSize:     10, cursor: 'pointer',
                display:      'flex', alignItems: 'center', gap: 5
              }}
            >
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: cam.status === 'online' ? '#22c55e' : '#64748b',
                display: 'inline-block'
              }} />
              {cam.name}
            </button>
          ))}
        </div>
      )}

      {/* No cameras */}
      {cameras.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '80px 0', color: '#64748b'
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
            No cameras added
          </div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            Add cameras from the Cameras page
          </div>
        </div>
      )}

      {/* Camera grid */}
      {cameras.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: getGridCols(),
          gap: 10
        }}>
          {displayCams.map(cam => (
            <CameraFeed
              key={cam.id}
              camera={cam}
              liveDet={cameraDetections?.[cam.id]}
              size={getCamSize()}
            />
          ))}
        </div>
      )}

      {/* Offline cameras list */}
      {offlineCams.length > 0 && layout === 'grid' && (
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '.5px',
            marginBottom: 8
          }}>
            Offline Cameras ({offlineCams.length})
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {offlineCams.map(cam => (
              <div key={cam.id} style={{
                background:   '#151d2e',
                border:       '1px solid #1e2d47',
                borderRadius: 6, padding: '8px 14px',
                display:      'flex', alignItems: 'center', gap: 8
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#64748b', display: 'inline-block'
                }} />
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  {cam.name}
                </span>
                <span style={{
                  fontSize: 9, color: '#475569',
                  background: '#0a0e1a', padding: '2px 6px',
                  borderRadius: 3
                }}>
                  {cam.location || 'Unknown'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}