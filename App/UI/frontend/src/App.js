import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import alertSound from './utils/alertSound';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background:     '#0a0e1a',
          color:          '#f87171',
          minHeight:      '100vh',
          display:        'flex',
          flexDirection:  'column',
          alignItems:     'center',
          justifyContent: 'center',
          padding:        20
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </div>
          <div style={{
            fontSize:     12, color: '#94a3b8',
            background:   '#151d2e', padding: '10px 16px',
            borderRadius: 6, marginBottom: 16,
            maxWidth:     600, wordBreak: 'break-all'
          }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background:   '#3b82f6', border: 'none',
              color:        '#fff', padding: '8px 20px',
              borderRadius: 6, cursor: 'pointer',
              fontSize:     13, fontWeight: 600
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoadingScreen() {
  return (
    <div style={{
      background:     '#0a0e1a',
      minHeight:      '100vh',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      gap:            16
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 36 }}>🛡</span>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#3b82f6' }}>
            BRAWL DETECTION SYSTEM
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            AI Powered Video Analytics
          </div>
        </div>
      </div>
      <div style={{
        width: 240, height: 3,
        background: '#1e2d47', borderRadius: 2, overflow: 'hidden'
      }}>
        <div style={{
          height: '100%', background: '#3b82f6',
          borderRadius: 2, animation: 'loadBar 1.5s ease infinite'
        }} />
      </div>
      <style>{`
        @keyframes loadBar {
          0%   { width: 0%;  margin-left: 0%   }
          50%  { width: 60%; margin-left: 20%  }
          100% { width: 0%;  margin-left: 100% }
        }
      `}</style>
      <div style={{ fontSize: 11, color: '#64748b' }}>
        Connecting to backend...
      </div>
    </div>
  );
}

function AppInner() {
  const { loading } = useApp();

  // ── Pre-warm AudioContext on first interaction ─────────────
  useEffect(() => {
    const initAudio = () => {
      try {
        alertSound.init();
        // Silent warmup — no sound
        const ctx  = alertSound.audioContext;
        if (ctx) {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.01);
          console.log('[Audio] Pre-warmed successfully');
        }
      } catch (e) {}
    };

    // Fire on any interaction
    document.addEventListener('click',     initAudio, { once: true });
    document.addEventListener('keydown',   initAudio, { once: true });
    document.addEventListener('mousemove', initAudio, { once: true });

    return () => {
      document.removeEventListener('click',     initAudio);
      document.removeEventListener('keydown',   initAudio);
      document.removeEventListener('mousemove', initAudio);
    };
  }, []);

  if (loading) return <LoadingScreen />;
  return <Dashboard />;
}

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;