import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

export default function SystemPage() {
  const { systemStats, wsConnected, stats } = useApp();
  const [health,    setHealth]    = useState(null);
  const [perfStats, setPerfStats] = useState(null);
  const [bufStats,  setBufStats]  = useState(null);
  const [loading,   setLoading]   = useState(true);

  const loadData = async () => {
    try {
      const [healthRes, perfRes, bufRes] = await Promise.all([
        fetch('http://localhost:8000/health').then(r => r.json()),
        fetch('http://localhost:8000/cameras/debug/performance').then(r => r.json()),
        fetch('http://localhost:8000/cameras/debug/buffer-stats').then(r => r.json())
      ]);
      setHealth(healthRes);
      setPerfStats(perfRes);
      setBufStats(bufRes);
    } catch (err) {
      console.warn('[System] Load failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 3000);
    return () => clearInterval(id);
  }, []);

  const cardStyle = {
    background:   '#151d2e',
    border:       '1px solid #1e2d47',
    borderRadius: 8,
    padding:      14,
    marginBottom: 12
  };

  const titleStyle = {
    fontSize:      12,
    fontWeight:    700,
    color:         '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '.5px',
    marginBottom:  12,
    paddingBottom: 8,
    borderBottom:  '1px solid #1e2d47'
  };

  const rowStyle = {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        '6px 0',
    borderBottom:   '1px solid #1e2d4740',
    fontSize:       12
  };

  const BarChart = ({ value, max = 100, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 120, height: 6,
        background: '#1e2d47', borderRadius: 3, overflow: 'hidden'
      }}>
        <div style={{
          width:        `${Math.min((value / max) * 100, 100)}%`,
          height:       '100%',
          background:   color,
          borderRadius: 3,
          transition:   'width .5s ease'
        }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 40 }}>
        {typeof value === 'number' ? `${value.toFixed(1)}%` : value}
      </span>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        flex: 1, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#64748b'
      }}>
        Loading system info...
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
          System
        </h2>
        <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
          System health, performance & diagnostics
        </p>
      </div>

      {/* Status cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
        gap: 8, marginBottom: 14
      }}>
        {[
          {
            label: 'System Status',
            value: wsConnected ? 'Healthy' : 'Offline',
            color: wsConnected ? '#22c55e' : '#f87171',
            icon:  wsConnected ? '✅' : '❌'
          },
          {
            label: 'Cameras Online',
            value: `${stats.cameras_online || 0} / ${stats.cameras_total || 0}`,
            color: '#60a5fa',
            icon:  '📷'
          },
          {
            label: 'Total Detections',
            value: stats.total_detections || 0,
            color: '#a78bfa',
            icon:  '🔍'
          },
          {
            label: 'Active Alerts',
            value: stats.active_alerts || 0,
            color: (stats.active_alerts || 0) > 0 ? '#f87171' : '#22c55e',
            icon:  '🚨'
          }
        ].map((s, i) => (
          <div key={i} style={{
            background: '#151d2e', border: '1px solid #1e2d47',
            borderRadius: 8, padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <span style={{ fontSize: 22 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 10, color: '#64748b' }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Resource Usage */}
        <div style={cardStyle}>
          <div style={titleStyle}>💻 Resource Usage</div>
          <div style={rowStyle}>
            <span style={{ color: '#94a3b8' }}>CPU Usage</span>
            <BarChart
              value={systemStats.cpu_usage || 0}
              color='#3b82f6'
            />
          </div>
          <div style={rowStyle}>
            <span style={{ color: '#94a3b8' }}>Memory Usage</span>
            <BarChart
              value={systemStats.memory_usage || 0}
              color='#f97316'
            />
          </div>
          <div style={rowStyle}>
            <span style={{ color: '#94a3b8' }}>Storage</span>
            <BarChart
              value={systemStats.storage_used || 256}
              max={systemStats.storage_total || 512}
              color='#a78bfa'
            />
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={{ color: '#94a3b8' }}>Network</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>
              {systemStats.network_mbps || 0} Mbps
            </span>
          </div>
        </div>

        {/* AI Performance */}
        <div style={cardStyle}>
          <div style={titleStyle}>🤖 AI Performance</div>
          <div style={rowStyle}>
            <span style={{ color: '#94a3b8' }}>Current FPS</span>
            <span style={{
              fontSize: 16, fontWeight: 700,
              color: (perfStats?.performance?.current_fps || 0) > 10
                ? '#22c55e' : '#f87171'
            }}>
              {perfStats?.performance?.current_fps || 0}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={{ color: '#94a3b8' }}>Avg Inference</span>
            <span style={{
              fontSize: 13, fontWeight: 700,
              color: (perfStats?.performance?.avg_inference_ms || 0) < 200
                ? '#22c55e' : '#fbbf24'
            }}>
              {perfStats?.performance?.avg_inference_ms || 0}ms
            </span>
          </div>
          <div style={rowStyle}>
            <span style={{ color: '#94a3b8' }}>Active Cameras</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>
              {perfStats?.active || 0}
            </span>
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={{ color: '#94a3b8' }}>Stream FPS</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>
              {systemStats.fps || 0}
            </span>
          </div>
        </div>

        {/* Buffer Stats */}
        <div style={cardStyle}>
          <div style={titleStyle}>💾 Buffer Stats</div>
          {bufStats && Object.keys(bufStats.stats || {}).length > 0 ? (
            Object.entries(bufStats.stats).map(([camId, stat], i) => (
              <div key={i} style={rowStyle}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>
                  {camId}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 80, height: 4,
                    background: '#1e2d47', borderRadius: 2
                  }}>
                    <div style={{
                      width:      `${stat.usage_pct}%`,
                      height:     '100%',
                      background: '#3b82f6',
                      borderRadius: 2
                    }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#60a5fa' }}>
                    {stat.frames} frames ({stat.seconds}s)
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div style={{
              textAlign: 'center', padding: '20px 0',
              color: '#64748b', fontSize: 11
            }}>
              No active buffers
            </div>
          )}
        </div>

        {/* System Info */}
        <div style={cardStyle}>
          <div style={titleStyle}>ℹ️ System Info</div>
          {[
            { label: 'Version',       value: 'v1.0.0' },
            { label: 'Model',         value: 'YOLO11m (ONNX)' },
            { label: 'Backend',       value: 'FastAPI + Uvicorn' },
            { label: 'Frontend',      value: 'React.js + Tailwind' },
            { label: 'WebSocket',     value: wsConnected ? '● Connected' : '● Disconnected' },
            { label: 'Max Cameras',   value: '6' },
            { label: 'Uptime',        value: health?.timestamp || '—' },
          ].map((item, i) => (
            <div key={i} style={{
              ...rowStyle,
              borderBottom: i < 6 ? '1px solid #1e2d4740' : 'none'
            }}>
              <span style={{ color: '#94a3b8' }}>{item.label}</span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                color: item.label === 'WebSocket'
                  ? wsConnected ? '#22c55e' : '#f87171'
                  : '#e2e8f0'
              }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* Refresh button */}
      <button
        onClick={loadData}
        style={{
          background:   '#151d2e',
          border:       '1px solid #1e2d47',
          color:        '#94a3b8',
          padding:      '8px 20px',
          borderRadius: 6,
          fontSize:     11,
          cursor:       'pointer',
          marginTop:    4
        }}
      >
        ↺ Refresh
      </button>
    </div>
  );
}