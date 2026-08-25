import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useResponsive from '../hooks/useResponsive';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import StatsRow from '../components/StatsRow';
import CameraGrid from '../components/CameraGrid';
import DetectionSummary from '../components/DetectionSummary';
import ChartsRow from '../components/ChartsRow';
import SystemPerf from '../components/SystemPerf';
import AlertsPanel from '../components/AlertsPanel';
import RecordingsPanel from '../components/RecordingsPanel';
import CamerasPage from './CamerasPage';
import GraphsPage from './GraphsPage';
import AlertsPage from './AlertsPage';
import EventsPage from './EventsPage';
import SettingsPage from './SettingsPage';
import LiveViewPage from './LiveViewPage';
import SystemPage from './SystemPage';
import LogsPage from './LogsPage';

// ── Static lookup tables (module scope so they aren't re-created on every render) ──
const EVENT_COLORS = {
  Fire: '#fb923c', Violence: '#f43f5e', Gun: '#f87171',
  Knife: '#facc15', Falling: '#a78bfa', Smoke: '#94a3b8',
  Theft_Mask: '#fbbf24', Normal: '#22c55e'
};
const EVENT_ICONS = {
  Fire: '🔥', Violence: '⚡', Gun: '🔫',
  Knife: '🔪', Falling: '🏃', Smoke: '💨',
  Theft_Mask: '🎭', Normal: '🛡️'
};

const FULL_WIDTH_PAGES = [
  'Cameras', 'Graphs', 'Alerts', 'Events',
  'Settings', 'Recordings', 'Live View', 'Logs', 'System'
];

const RECORDINGS_URL = 'http://localhost:8000/detections/recordings';
const RECORDINGS_POLL_MS = 5000;

// ── Placeholder for pages not built yet (kept from original) ─────
function ComingSoon({ title, icon, description }) {
  return (
    <div style={{
      flex:           1,
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      color:          '#64748b',
      gap:            12
    }}>
      <div style={{ fontSize: 52 }}>{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', maxWidth: 300 }}>
        {description}
      </div>
      <div style={{
        background:   '#151d2e',
        border:       '1px solid #1e2d47',
        borderRadius: 8,
        padding:      '8px 20px',
        fontSize:     11,
        color:        '#3b82f6',
        marginTop:    8
      }}>
        Coming in Day 10
      </div>
    </div>
  );
}

// ── Single recording card, memoized so re-renders of the list ────
// ── (e.g. from polling) don't re-render every card unnecessarily ─
const RecordingCard = React.memo(function RecordingCard({ rec, isMobile }) {
  const color = EVENT_COLORS[rec.event_type] || '#94a3b8';
  const icon  = EVENT_ICONS[rec.event_type]  || '⚠️';

  const handleDownload = useCallback(() => {
    const a = document.createElement('a');
    a.href = `${RECORDINGS_URL}/download/${rec.filename}`;
    a.download = rec.filename;
    a.click();
  }, [rec.filename]);

  return (
    <div style={{
      background:   '#151d2e',
      border:       `1px solid ${color}33`,
      borderRadius: 8,
      overflow:     'hidden'
    }}>
      {/* Thumbnail */}
      <div style={{
        position:       'relative',
        height:         isMobile ? 90 : 120,
        background:     `linear-gradient(135deg, #0a0e1a, ${color}22)`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       isMobile ? 36 : 40
      }}>
        {icon}
        {rec.status === 'recording' && (
          <span style={{
            position:     'absolute',
            top:          8, right: 8,
            background:   '#450a0a',
            color:        '#f87171',
            fontSize:     9,
            padding:      '2px 6px',
            borderRadius: 3,
            fontWeight:   700
          }}>● REC</span>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color }}>
          {rec.event_type} Detected
        </div>
        <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
          {rec.camera_name}
        </div>
        <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
          {rec.timestamp}
        </div>
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginTop:      8
        }}>
          <span style={{ fontSize: 10, color: '#64748b' }}>
            {rec.duration} {rec.size_mb > 0 ? `• ${rec.size_mb} MB` : ''}
          </span>
          {rec.status === 'complete' && (
            <button
              onClick={handleDownload}
              style={{
                background:   '#1e3a5f',
                border:       '1px solid #253550',
                color:        '#60a5fa',
                padding:      '4px 10px',
                borderRadius: 4,
                fontSize:     10,
                cursor:       'pointer'
              }}
            >
              ⬇ Download
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ── Recordings Page — shows all recordings, responsive + polled ──
function RecordingsPage() {
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isMobile } = useResponsive();
  const abortRef = useRef(null);

  const loadRecordings = useCallback(async () => {
    // Cancel any in-flight request before starting a new one so slow
    // responses can't race ahead of newer ones and show stale data.
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(RECORDINGS_URL, { signal: controller.signal });
      const data = await res.json();
      setRecordings(data.recordings || []);
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn('[Recordings] Load failed');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecordings();
    const id = setInterval(loadRecordings, RECORDINGS_POLL_MS);
    return () => {
      clearInterval(id);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadRecordings]);

  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 12
  }), [isMobile]);

  return (
    <div style={{ padding: isMobile ? '10px' : '14px 16px', height: '100%', overflowY: 'auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: isMobile ? 14 : 16, fontWeight: 700, color: '#fff', margin: 0 }}>
          Recordings
        </h2>
        <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
          All event recordings — {recordings.length} total
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Loading recordings...
        </div>
      ) : recordings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🎬</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>
            No recordings yet
          </div>
          <div style={{ fontSize: 11, marginTop: 4 }}>
            Recordings appear when threats are detected
          </div>
        </div>
      ) : (
        <div style={gridStyle}>
          {recordings.map((rec, i) => (
            <RecordingCard key={rec.filename || i} rec={rec} isMobile={isMobile} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main dashboard content (extracted so it can be memoized) ─────
const DashboardHome = React.memo(function DashboardHome({ isMobile }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '8px' : '10px 12px' }}>
      <CameraGrid />
      <DetectionSummary />
      <ChartsRow />
      <SystemPerf />
    </div>
  );
});

export default function Dashboard() {
  const [activePage, setActivePage] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile, isDesktop, isLarge } = useResponsive();

  // Single source of truth for page navigation — handles both the
  // custom "navigate" window event and closing the mobile sidebar.
  const goToPage = useCallback((page) => {
    setActivePage(page);
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    const handler = (e) => goToPage(e.detail);
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, [goToPage]);

  const isFullWidth = FULL_WIDTH_PAGES.includes(activePage);
  const showRightPanel = !isFullWidth && isDesktop;
  const showSidebar = isDesktop || sidebarOpen;

  const renderMain = () => {
    switch (activePage) {
      case 'Dashboard':
        return <DashboardHome isMobile={isMobile} />;
      case 'Live View':
        return <LiveViewPage />;
      case 'Cameras':
        return <CamerasPage />;
      case 'Events':
        return <EventsPage />;
      case 'Recordings':
        return <RecordingsPage />;
      case 'Graphs':
        return <GraphsPage />;
      case 'Alerts':
        return <AlertsPage />;
      case 'Settings':
        return <SettingsPage />;
      case 'Logs':
        return <LogsPage />;
      case 'System':
        return <SystemPage />;
      default:
        // Preserves the original "under construction" fallback for any
        // page that isn't wired up yet, instead of silently showing
        // the dashboard.
        return (
          <ComingSoon
            title={activePage}
            icon="🔧"
            description="404 - This page is still under construction. Please check back later!"
          />
        );
    }
  };

  return (
    <div style={{
      display:    'flex',
      height:     '100vh',
      overflow:   'hidden',
      background: '#0a0e1a',
      position:   'relative'
    }}>

      {/* ── Mobile overlay ───────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position:   'fixed', inset: 0,
            background: 'rgba(0,0,0,.7)',
            zIndex:     999
          }}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────── */}
      {showSidebar && (
        <div style={{
          width:      isMobile ? 240 : isLarge ? 220 : 200,
          flexShrink: 0,
          position:   isMobile ? 'fixed' : 'relative',
          left:       isMobile ? (sidebarOpen ? 0 : -260) : 0,
          top:        0, bottom: 0,
          zIndex:     isMobile ? 1000 : 1,
          transition: 'left .3s ease',
          height:     '100%'
        }}>
          <Sidebar
            activePage={activePage}
            setActivePage={goToPage}
          />
        </div>
      )}

      {/* ── Main content ──────────────────────────────────────── */}
      <div style={{
        flex:          1,
        display:       'flex',
        flexDirection: 'column',
        overflow:      'hidden',
        minWidth:      0
      }}>
        <TopBar
          activePage={activePage}
          setActivePage={setActivePage}
          onMenuClick={() => setSidebarOpen((open) => !open)}
          isMobile={isMobile}
        />
        <StatsRow />
        {renderMain()}
      </div>

      {/* ── Right panel — desktop only ────────────────────────── */}
      {showRightPanel && (
        <div style={{
          width:         isLarge ? 300 : 280,
          flexShrink:    0,
          background:    '#111827',
          borderLeft:    '1px solid #1e2d47',
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden'
        }}>
          <AlertsPanel />
          <RecordingsPanel />
        </div>
      )}
    </div>
  );
}