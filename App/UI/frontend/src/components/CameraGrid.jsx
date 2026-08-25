import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import useResponsive from '../hooks/useResponsive';
import CameraCard from './CameraCard';
import AddCameraModal from './AddCameraModal';

const TOTAL_SLOTS = 6;

export default function CameraGrid() {
  const { cameras } = useApp();
  const { isMobile, isTablet } = useResponsive();
  const [showModal, setShowModal] = useState(false);

  const emptySlots = Math.max(0, TOTAL_SLOTS - cameras.length);

  const onlineCount = useMemo(
    () => cameras.filter(c => c.status === 'online').length,
    [cameras]
  );

  const gridCols = useMemo(() => {
    if (isMobile) return '1fr';
    if (isTablet) return 'repeat(2, 1fr)';
    return 'repeat(3, 1fr)';
  }, [isMobile, isTablet]);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ color: '#3b82f6', fontSize: 14 }}>📷</span>
        <span style={{
          fontSize:      11,
          fontWeight:    700,
          color:         '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '.5px'
        }}>
          Live Cameras
        </span>
        <span style={{ fontSize: 10, color: '#64748b', marginLeft: 4 }}>
          ({onlineCount} online)
        </span>
      </div>

      {/* Grid */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: gridCols,
        gap:                 8
      }}>
        {cameras.map(cam => (
          <CameraCard key={cam.id} camera={cam} showControls={true} />
        ))}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            onClick={openModal}
            style={{
              background:     '#151d2e',
              border:         '1px dashed #253550',
              borderRadius:   8,
              height:         isMobile ? 120 : 148,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         'pointer',
              color:          '#64748b',
              gap:            5,
              transition:     'all .2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.color = '#3b82f6';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#253550';
              e.currentTarget.style.color = '#64748b';
            }}
          >
            <span style={{ fontSize: 26 }}>+</span>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Add Camera</span>
            <span style={{ fontSize: 9 }}>Click to add new camera</span>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && <AddCameraModal onClose={closeModal} />}
    </div>
  );
}