import React, { useState, useEffect, useRef } from 'react';
import { getLogs, clearLogs } from '../services/api';

const LEVEL_STYLES = {
  SUCCESS: { color: '#4ade80', bg: '#0d2010', icon: '✅' },
  INFO:    { color: '#60a5fa', bg: '#0a1628', icon: 'ℹ️' },
  WARNING: { color: '#fbbf24', bg: '#2d220a', icon: '⚠️' },
  ERROR:   { color: '#f87171', bg: '#450a0a', icon: '❌' }
};

const MODULES = [
  'all', 'System', 'Camera', 'Detection',
  'Backend', 'Model', 'WebSocket', 'Recorder', 'Email'
];

export default function LogsPage() {
  const [logs,        setLogs]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [levelFilter, setLevelFilter] = useState('all');
  const [moduleFilter,setModuleFilter]= useState('all');
  const [search,      setSearch]      = useState('');
  const [autoScroll,  setAutoScroll]  = useState(true);
  const [clearing,    setClearing]    = useState(false);
  const [lastUpdate,  setLastUpdate]  = useState('');
  const bottomRef   = useRef(null);
  const intervalRef = useRef(null);

  const loadLogs = async () => {
    try {
      const res = await getLogs({
        level:  levelFilter,
        module: moduleFilter,
        search,
        limit:  200
      });
      setLogs(res.data.logs || []);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('[Logs] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    intervalRef.current = setInterval(loadLogs, 3000);
    return () => clearInterval(intervalRef.current);
  }, [levelFilter, moduleFilter, search]);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleClear = async () => {
    if (!window.confirm('Clear all logs?')) return;
    setClearing(true);
    try {
      await clearLogs();
      setLogs([]);
    } catch (err) {
      console.warn('[Logs] Clear failed:', err);
    } finally {
      setClearing(false);
    }
  };

  // Stats
  const counts = {
    SUCCESS: logs.filter(l => l.level === 'SUCCESS').length,
    INFO:    logs.filter(l => l.level === 'INFO').length,
    WARNING: logs.filter(l => l.level === 'WARNING').length,
    ERROR:   logs.filter(l => l.level === 'ERROR').length,
  };

  const btnStyle = (active, color = '#3b82f6') => ({
    background:   active ? `${color}22` : '#0a0e1a',
    border:       `1px solid ${active ? color : '#1e2d47'}`,
    color:        active ? color : '#64748b',
    padding:      '4px 10px', borderRadius: 5,
    fontSize:     10, fontWeight: 600, cursor: 'pointer'
  });

  return (
    <div style={{
      padding:       '14px 16px',
      height:        '100%',
      display:       'flex',
      flexDirection: 'column',
      overflow:      'hidden'
    }}>

      {/* Header */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   12,
        flexShrink:     0
      }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
            System Logs
          </h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
            Audit trail — {logs.length} entries — Updated: {lastUpdate}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Auto scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            style={{
              background:   autoScroll ? '#0d2010' : '#151d2e',
              border:       `1px solid ${autoScroll ? '#166534' : '#1e2d47'}`,
              color:        autoScroll ? '#4ade80' : '#64748b',
              padding:      '6px 12px', borderRadius: 6,
              fontSize:     11, cursor: 'pointer'
            }}
          >
            {autoScroll ? '⬇ Auto Scroll ON' : '⬇ Auto Scroll OFF'}
          </button>
          <button onClick={loadLogs} style={{
            background: '#151d2e', border: '1px solid #1e2d47',
            color: '#94a3b8', padding: '6px 12px',
            borderRadius: 6, fontSize: 11, cursor: 'pointer'
          }}>
            ↺ Refresh
          </button>
          <button
            onClick={handleClear}
            disabled={clearing}
            style={{
              background: '#2d0a0a', border: '1px solid #7f1d1d',
              color: '#f87171', padding: '6px 12px',
              borderRadius: 6, fontSize: 11, cursor: 'pointer'
            }}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex', gap: 8,
        marginBottom: 10, flexShrink: 0
      }}>
        {Object.entries(LEVEL_STYLES).map(([level, style]) => (
          <div key={level} style={{
            background:   style.bg,
            border:       `1px solid ${style.color}44`,
            borderRadius: 6, padding: '6px 12px',
            display:      'flex', alignItems: 'center', gap: 6
          }}>
            <span style={{ fontSize: 12 }}>{style.icon}</span>
            <span style={{ fontSize: 10, color: style.color, fontWeight: 600 }}>
              {level}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: style.color }}>
              {counts[level]}
            </span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 10,
        flexShrink: 0, flexWrap: 'wrap', alignItems: 'center'
      }}>
        {/* Search */}
        <input
          placeholder="Search logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background:   '#0a0e1a',
            border:       '1px solid #1e2d47',
            borderRadius: 6, padding: '5px 12px',
            color:        '#e2e8f0', fontSize: 11,
            outline:      'none', width: 200
          }}
        />

        {/* Level filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {['all','SUCCESS','INFO','WARNING','ERROR'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              style={btnStyle(
                levelFilter === lvl,
                lvl === 'SUCCESS' ? '#4ade80' :
                lvl === 'INFO'    ? '#60a5fa' :
                lvl === 'WARNING' ? '#fbbf24' :
                lvl === 'ERROR'   ? '#f87171' : '#3b82f6'
              )}
            >
              {lvl === 'all' ? 'All' : lvl}
            </button>
          ))}
        </div>

        {/* Module filter */}
        <select
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          style={{
            background:   '#0a0e1a',
            border:       '1px solid #1e2d47',
            color:        '#94a3b8', fontSize: 11,
            padding:      '5px 10px', borderRadius: 6,
            cursor:       'pointer', outline: 'none'
          }}
        >
          {MODULES.map(m => (
            <option key={m} value={m}>
              {m === 'all' ? 'All Modules' : m}
            </option>
          ))}
        </select>
      </div>

      {/* Logs list */}
      <div style={{
        flex:         1,
        overflowY:    'auto',
        background:   '#0a0e1a',
        border:       '1px solid #1e2d47',
        borderRadius: 8,
        fontFamily:   'monospace',
        fontSize:     11
      }}>
        {loading ? (
          <div style={{
            textAlign: 'center', padding: '40px 0', color: '#64748b'
          }}>
            Loading logs...
          </div>
        ) : logs.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 0', color: '#64748b'
          }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>📄</div>
            <div>No logs found</div>
          </div>
        ) : (
          <>
            {[...logs].reverse().map((log, i) => {
              const style = LEVEL_STYLES[log.level] || LEVEL_STYLES.INFO;
              return (
                <div
                  key={log.id || i}
                  style={{
                    display:      'flex',
                    alignItems:   'flex-start',
                    gap:          10,
                    padding:      '6px 12px',
                    borderBottom: '1px solid #1e2d4722',
                    transition:   'background .15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#111827'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Timestamp */}
                  <span style={{
                    fontSize:   10, color: '#475569',
                    flexShrink: 0, minWidth: 140
                  }}>
                    {log.timestamp}
                  </span>

                  {/* Level badge */}
                  <span style={{
                    fontSize:     9, fontWeight: 700,
                    padding:      '1px 6px', borderRadius: 3,
                    background:   style.bg, color: style.color,
                    flexShrink:   0, minWidth: 65,
                    textAlign:    'center'
                  }}>
                    {log.level}
                  </span>

                  {/* Module */}
                  <span style={{
                    fontSize:   10, color: '#3b82f6',
                    flexShrink: 0, minWidth: 80
                  }}>
                    [{log.module}]
                  </span>

                  {/* Message */}
                  <span style={{ color: '#94a3b8', flex: 1 }}>
                    {log.message}
                  </span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
}