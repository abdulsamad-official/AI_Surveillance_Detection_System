import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCameras, getStats, getAlerts, getDetectionSummary } from '../services/api';
import wsService from '../services/websocket';
import alertSound from '../utils/alertSound';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [cameras,          setCameras]          = useState([]);
  const [stats,            setStats]            = useState({ cameras_online: 0, cameras_total: 0, total_detections: 0, active_alerts: 0 });
  const [alerts,           setAlerts]           = useState([]);
  const [detectionSummary, setDetectionSummary] = useState({});
  const [systemStats,      setSystemStats]      = useState({ cpu_usage: 0, memory_usage: 0, fps: 0, storage_used: 256, storage_total: 512, network_mbps: 0 });
  const [cameraDetections, setCameraDetections] = useState({});
  const [wsConnected,      setWsConnected]      = useState(false);
  const [loading,          setLoading]          = useState(true);
  const [backendOnline,    setBackendOnline]     = useState(true);

  const loadInitialData = useCallback(async () => {
    try {
      const [camsRes, statsRes, alertsRes, summaryRes] = await Promise.all([
        getCameras(),
        getStats(),
        getAlerts(),
        getDetectionSummary()
      ]);
      setCameras(camsRes.data.cameras             || []);
      setStats(statsRes.data                      || {});
      setAlerts(alertsRes.data.alerts             || []);
      setDetectionSummary(summaryRes.data.summary || {});
      setBackendOnline(true);
    } catch (err) {
      // ── Backend offline — show UI with empty data ─────────
      console.warn('[API] Backend not reachable — running in offline mode');
      setBackendOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // ── Try WebSocket — fail silently if backend offline ─────
    try {
      wsService.connect();
    } catch (e) {
      console.warn('[WS] Could not connect');
    }

    wsService.on('connected',    () => setWsConnected(true));
    wsService.on('disconnected', () => setWsConnected(false));

    wsService.on('initial_state', (data) => {
      if (data.cameras)           setCameras(data.cameras);
      if (data.detection_summary) setDetectionSummary(data.detection_summary);
      if (data.recent_alerts)     setAlerts(data.recent_alerts);
    });

    wsService.on('system_stats', (data) => {
      setSystemStats({
        cpu_usage:     data.cpu_usage     || 0,
        memory_usage:  data.memory_usage  || 0,
        fps:           data.fps           || 0,
        storage_used:  data.storage_used  || 256,
        storage_total: data.storage_total || 512,
        network_mbps:  data.network_mbps  || 0
      });

      // ── Play sound on new active alerts ──────────────────────
      const newActiveAlerts = data.active_alerts || 0;
      setStats(prev => {
        const prevActive = prev.active_alerts || 0;
        if (newActiveAlerts > prevActive) {
          // New alert came in — play sound
          alertSound.play('High');
        }
        return {
          ...prev,
          cameras_online:   data.cameras_online   ?? prev.cameras_online,
          cameras_total:    data.cameras_total    ?? prev.cameras_total,
          total_detections: data.total_detections ?? prev.total_detections,
          active_alerts:    newActiveAlerts
        };
      });

      if (data.detection_summary) setDetectionSummary(data.detection_summary);
      if (data.camera_detections) setCameraDetections(data.camera_detections);
    });

    return () => {
      try { wsService.disconnect(); } catch (e) {}
    };
  }, [loadInitialData]);

  const refreshCameras = async () => {
    try {
      const res = await getCameras();
      setCameras(res.data.cameras || []);
    } catch (e) {
      console.warn('[API] refreshCameras failed');
    }
  };

  const refreshAlerts = async () => {
    try {
      const res = await getAlerts();
      setAlerts(res.data.alerts || []);
    } catch (e) {
      console.warn('[API] refreshAlerts failed');
    }
  };

  return (
    <AppContext.Provider value={{
      cameras,          setCameras,     refreshCameras,
      stats,
      alerts,           refreshAlerts,
      detectionSummary,
      systemStats,
      cameraDetections,
      wsConnected,
      loading,
      backendOnline,
      loadInitialData
    }}>
      {/* Backend offline banner */}
      {!backendOnline && !loading && (
        <div style={{
          position:       'fixed',
          top:            0, left: 0, right: 0,
          background:     '#450a0a',
          color:          '#f87171',
          textAlign:      'center',
          padding:        '8px',
          fontSize:       12,
          fontWeight:     600,
          zIndex:         9999,
          borderBottom:   '1px solid #7f1d1d'
        }}>
          ⚠ Backend offline — Start backend:
          <code style={{ marginLeft: 8, background: '#2d0a0a', padding: '2px 8px', borderRadius: 4 }}>
            uvicorn main:app --reload --port 8000
          </code>
          <button
            onClick={loadInitialData}
            style={{
              marginLeft:   10,
              background:   '#7f1d1d',
              border:       'none',
              color:        '#f87171',
              padding:      '2px 10px',
              borderRadius: 4,
              cursor:       'pointer',
              fontSize:     11
            }}
          >
            Retry
          </button>
        </div>
      )}
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);