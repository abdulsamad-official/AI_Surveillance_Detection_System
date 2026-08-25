import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const ADMIN_MENU_ITEMS = [
  { icon: '⚙',  label: 'Settings', page: 'Settings' },
  { icon: '📄', label: 'Logs',     page: 'Logs'     },
  { icon: '🖥', label: 'System',   page: 'System'   },
];

const pad = (v) => v.toString().padStart(2, '0');

export default function TopBar({
  activePage, setActivePage,
  onMenuClick, isMobile
}) {
  const { alerts, wsConnected } = useApp();
  const [time,     setTime]     = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const unreadAlerts = useMemo(
    () => alerts.filter(a => !a.acknowledged).length,
    [alerts]
  );

  // Navigate helper — prefers the setActivePage prop (updates state
  // directly), but falls back to the global "navigate" event so the
  // bar still works even if a parent doesn't wire the prop up.
  const navigateTo = useCallback((page) => {
    if (setActivePage) {
      setActivePage(page);
    } else {
      window.dispatchEvent(new CustomEvent('navigate', { detail: page }));
    }
  }, [setActivePage]);

  useEffect(() => {
    const tick = () => {
      const n  = new Date();
      let h    = n.getHours();
      const ap = h >= 12 ? 'PM' : 'AM';
      h        = h % 12 || 12;
      const m  = pad(n.getMinutes());
      const s  = pad(n.getSeconds());

      setTime(
        isMobile
          ? `${pad(h)}:${m}:${s} ${ap}`
          : `${MONTHS[n.getMonth()]} ${n.getDate()}, ${n.getFullYear()}  |  ${pad(h)}:${m}:${s} ${ap}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isMobile]);

  return (
    <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        isMobile ? '8px 12px' : '10px 20px',
        borderBottom:   '1px solid #1e2d47',
        background:     '#111827',
        flexShrink:     0,
        height:         isMobile ? 48 : 54,
        gap:            8
      }}>

        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 10 }}>

          {/* Hamburger — mobile only */}
          {isMobile && (
            <button
              onClick={onMenuClick}
              style={{
                background: 'none', border: 'none',
                color: '#94a3b8', fontSize: 22,
                cursor: 'pointer', padding: '2px 4px',
                flexShrink: 0
              }}
            >
              ☰
            </button>
          )}

          {/* Logo */}
          <div style={{
            width: 28, height: 28,
            borderRadius: '50%',
            border: '2px solid #3b82f6',
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0
          }}>
            <span style={{ fontSize: 14, color: '#3b82f6' }}>🛡</span>
          </div>

          {!isMobile && (
            <span style={{
              fontSize:      14,
              fontWeight:    700,
              color:         '#3b82f6',
              letterSpacing: '.5px',
              whiteSpace:    'nowrap'
            }}>
              BRAWL DETECTION SYSTEM
            </span>
          )}

          {/* Connection status */}
          <span style={{
            fontSize:     9,
            background:   wsConnected ? '#0d2010' : '#2d0a0a',
            color:        wsConnected ? '#4ade80' : '#f87171',
            padding:      '2px 6px',
            borderRadius: 10,
            fontWeight:   600,
            whiteSpace:   'nowrap'
          }}>
            {wsConnected ? '● LIVE' : (isMobile ? '● OFF' : '● OFFLINE')}
          </span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 16 }}>

          {/* Clock — hidden on mobile to save space */}
          {!isMobile && (
            <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>
              {time}
            </span>
          )}

          {/* Bell with badge */}
          <div
            style={{ position: 'relative', cursor: 'pointer' }}
            onClick={() => navigateTo('Alerts')}
          >
            <span style={{ fontSize: isMobile ? 18 : 20, color: '#94a3b8' }}>🔔</span>
            {unreadAlerts > 0 && (
              <span style={{
                position:       'absolute',
                top:            -5, right: -5,
                background:     '#ef4444',
                color:          '#fff',
                fontSize:       9,
                fontWeight:     700,
                width:          16, height: 16,
                borderRadius:   '50%',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                border:         '2px solid #111827'
              }}>
                {unreadAlerts > 9 ? '9+' : unreadAlerts}
              </span>
            )}
          </div>

          {/* Admin menu */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowMenu(!showMenu)}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          6,
                cursor:       'pointer',
                padding:      '4px 8px',
                borderRadius: 8,
                background:   showMenu ? '#1e2d47' : 'transparent'
              }}
            >
              <div style={{
                width:          28, height: 28,
                borderRadius:   '50%',
                background:     '#1e3a5f',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                fontSize:       13, fontWeight: 700,
                color:          '#60a5fa'
              }}>A</div>
              {!isMobile && (
                <span style={{ fontSize: 13, color: '#e2e8f0' }}>Admin</span>
              )}
              <span style={{ fontSize: 10, color: '#64748b' }}>▾</span>
            </div>

            {/* Dropdown */}
            {showMenu && (
              <div style={{
                position:     'absolute',
                top:          '110%', right: 0,
                background:   '#0f172a',
                border:       '1px solid #253550',
                borderRadius: 10,
                overflow:     'hidden',
                zIndex:       500,
                minWidth:     160,
                boxShadow:    '0 8px 30px rgba(0,0,0,.8)'
              }}>
                <div style={{
                  padding:      '10px 14px',
                  borderBottom: '1px solid #1e2d47'
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                    Admin User
                  </div>
                  <span style={{
                    fontSize:    9, fontWeight: 700,
                    background:  '#450a0a', color: '#f87171',
                    padding:     '1px 6px', borderRadius: 3,
                    display:     'inline-block', marginTop: 4
                  }}>Admin</span>
                </div>
                {ADMIN_MENU_ITEMS.map((item, i) => (
                  <div
                    key={item.page}
                    onClick={() => {
                      navigateTo(item.page);
                      setShowMenu(false);
                    }}
                    style={{
                      padding:      '10px 16px',
                      fontSize:     12,
                      color:        '#94a3b8',
                      cursor:       'pointer',
                      display:      'flex',
                      alignItems:   'center',
                      gap:          10,
                      borderBottom: i < ADMIN_MENU_ITEMS.length - 1 ? '1px solid #1e2d47' : 'none'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a2340'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {item.icon} {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
  );
}