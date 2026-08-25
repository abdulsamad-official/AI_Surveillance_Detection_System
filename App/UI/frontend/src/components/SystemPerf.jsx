import React from 'react';
import { useApp } from '../context/AppContext';

export default function SystemPerf() {
  const { systemStats, wsConnected } = useApp();

  const storageUsed  = systemStats.storage_used  || 0;
  const storageTotal = systemStats.storage_total || 256;
  const storagePct   = Math.round((storageUsed / storageTotal) * 100);

  const bars = [
    { label: 'CPU Usage',    val: systemStats.cpu_usage    || 0, color: '#3b82f6', unit: '%' },
    { label: 'Memory Usage', val: systemStats.memory_usage || 0, color: '#f97316', unit: '%' },
  ];

  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: 'auto 1fr 1fr auto auto',
      gap:                 1,
      background:          '#1e2d47',
      borderRadius:        6,
      overflow:            'hidden',
      marginBottom:        8
    }}>
      {/* Label */}
      <div style={{
        background: '#111827', padding: '7px 12px',
        display: 'flex', alignItems: 'center'
      }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
          System Performance
        </span>
      </div>

      {/* CPU + Memory bars */}
      {bars.map((b, i) => (
        <div key={i} style={{ background: '#111827', padding: '6px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 9, color: '#64748b' }}>{b.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
              {b.val.toFixed(1)}{b.unit}
            </span>
          </div>
          <div style={{ background: '#1e2d47', borderRadius: 2, height: 4 }}>
            <div style={{
              width:        `${Math.min(b.val, 100)}%`,
              height:       '100%',
              background:   b.val > 85 ? '#ef4444' : b.val > 70 ? '#f97316' : b.color,
              borderRadius: 2,
              transition:   'width .5s ease'
            }} />
          </div>
        </div>
      ))}

      {/* FPS + Storage */}
      <div style={{
        background: '#111827', padding: '6px 12px',
        display: 'flex', alignItems: 'center', gap: 14
      }}>
        <div>
          <div style={{ fontSize: 9, color: '#64748b' }}>FPS</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
            {systemStats.fps || 0}
          </div>
        </div>
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: 2
          }}>
            <span style={{ fontSize: 9, color: '#64748b' }}>Storage</span>
            <span style={{ fontSize: 9, color: '#64748b', marginLeft: 8 }}>
              {storagePct}%
            </span>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
            {storageUsed} / {storageTotal} GB
          </div>
          {/* Storage bar */}
          <div style={{
            width: 80, height: 3,
            background: '#1e2d47', borderRadius: 2
          }}>
            <div style={{
              width:        `${storagePct}%`,
              height:       '100%',
              background:   storagePct > 90 ? '#ef4444' :
                            storagePct > 75 ? '#f97316' : '#a78bfa',
              borderRadius: 2,
              transition:   'width .5s ease'
            }} />
          </div>
        </div>
      </div>

      {/* Network + Live */}
      <div style={{
        background: '#111827', padding: '6px 12px',
        display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div>
          <div style={{ fontSize: 9, color: '#64748b' }}>Network</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
            {systemStats.network_mbps || 0} Mbps
          </div>
        </div>
        <span style={{
          background:   wsConnected ? '#0d2010' : '#2d0a0a',
          color:        wsConnected ? '#4ade80' : '#fb923c',
          fontSize:     9, padding: '2px 8px',
          borderRadius: 10, whiteSpace: 'nowrap',
          fontWeight:   600
        }}>
          {wsConnected ? '● Live' : '● Off'}
        </span>
        <span style={{ fontSize: 9, color: '#64748b' }}>v1.0.0</span>
      </div>
    </div>
  );
}