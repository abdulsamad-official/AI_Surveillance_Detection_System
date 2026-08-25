import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import CameraCard from '../components/CameraCard';
import AddCameraModal from '../components/AddCameraModal';

export default function CamerasPage() {
  const { cameras, stats } = useApp();
  const [showModal,  setShowModal]  = useState(false);
  const [filter,     setFilter]     = useState('all');

  const filtered = cameras.filter(c => {
    if (filter === 'online')  return c.status === 'online';
    if (filter === 'offline') return c.status === 'offline';
    return true;
  });

  const btnStyle = (active) => ({
    background: active ? '#3b82f6' : '#151d2e',
    border: `1px solid ${active ? '#3b82f6' : '#1e2d47'}`,
    color: active ? '#fff' : '#94a3b8',
    padding: '5px 14px', borderRadius: 6,
    fontSize: 11, fontWeight: 600, cursor: 'pointer'
  });

  return (
    <div style={{ padding: 20, height: '100%', overflowY: 'auto' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>Camera Management</h1>
          <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
            {stats.cameras_online || 0} online · {cameras.length} total · {6 - cameras.length} slots available
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
        >
          + Add Camera
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Total Cameras',    value: cameras.length,                                        color: '#60a5fa' },
          { label: 'Online',           value: cameras.filter(c => c.status === 'online').length,     color: '#4ade80' },
          { label: 'Offline',          value: cameras.filter(c => c.status === 'offline').length,    color: '#f87171' },
          { label: 'Slots Available',  value: 6 - cameras.length,                                   color: '#fbbf24' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#151d2e', border: '1px solid #1e2d47', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={btnStyle(filter === 'all')}     onClick={() => setFilter('all')}>All ({cameras.length})</button>
        <button style={btnStyle(filter === 'online')}  onClick={() => setFilter('online')}>Online ({cameras.filter(c => c.status === 'online').length})</button>
        <button style={btnStyle(filter === 'offline')} onClick={() => setFilter('offline')}>Offline ({cameras.filter(c => c.status === 'offline').length})</button>
      </div>

      {/* Camera Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {filtered.map(cam => (
          <CameraCard key={cam.id} camera={cam} showControls={true} />
        ))}

        {/* Add slots */}
        {filter === 'all' && Array.from({ length: Math.max(0, 6 - cameras.length) }).map((_, i) => (
          <div
            key={`slot-${i}`}
            onClick={() => setShowModal(true)}
            style={{
              background: '#151d2e', border: '1px dashed #253550',
              borderRadius: 8, height: 160,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#64748b', gap: 5
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.color = '#3b82f6'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#253550'; e.currentTarget.style.color = '#64748b'; }}
          >
            <span style={{ fontSize: 28 }}>+</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Add Camera</span>
            <span style={{ fontSize: 10 }}>Click to connect</span>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>No cameras found</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Try changing the filter or add a new camera</div>
        </div>
      )}

      {showModal && <AddCameraModal onClose={() => setShowModal(false)} />}
    </div>
  );
}