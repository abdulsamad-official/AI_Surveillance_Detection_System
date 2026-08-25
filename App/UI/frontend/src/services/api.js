import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
});

// ── System ───────────────────────────────────────────────────────
export const getHealth = () => api.get('/health');
export const getStats  = () => api.get('/stats');

// ── Cameras ──────────────────────────────────────────────────────
export const getCameras      = ()         => api.get('/cameras/');
export const getCamera       = (id)       => api.get(`/cameras/${id}`);
export const addCamera       = (data)     => api.post('/cameras/', data);
export const updateCamera    = (id, data) => api.put(`/cameras/${id}`, data);
export const deleteCamera    = (id)       => api.delete(`/cameras/${id}`);
export const getCameraStatus = (id)       => api.get(`/cameras/${id}/status`);

// ── Detections ───────────────────────────────────────────────────
export const getDetections       = (limit = 50) => api.get(`/detections/?limit=${limit}`);
export const getDetectionSummary = ()            => api.get('/detections/summary');
export const getAlerts           = (limit = 20)  => api.get(`/detections/alerts?limit=${limit}`);
export const addDetection        = (data)        => api.post('/detections/', data);
export const acknowledgeAlert    = (id)          => api.put(`/detections/alerts/${id}/acknowledge`);

// ── Settings ─────────────────────────────────────────────────────
export const getSettings    = ()     => api.get('/detections/settings');
export const updateSettings = (data) => api.put('/detections/settings', data);

// ── Recordings ───────────────────────────────────────────────────
export const getRecordings       = ()         => api.get('/detections/recordings');
export const getActiveRecordings = ()         => api.get('/detections/recordings/active');
export const downloadRecording   = (filename) =>
  `${BASE_URL}/detections/recordings/download/${filename}`;

// ── Graphs ───────────────────────────────────────────────────────
export const getGraphSummary    = () => api.get('/detections/graphs/summary');
export const getGraphConfidence = (hours = 1) =>
  api.get(`/detections/graphs/confidence?hours=${hours}`);

export const getGraphTimeline = (hours = 1) =>
  api.get(`/detections/graphs/timeline?hours=${hours}`);

export default api;
// ── Alerts ───────────────────────────────────────────────────────
export const getAlertConfig    = ()         => api.get('/detections/alerts/config');
export const updateAlertConfig = (data)     => api.put('/detections/alerts/config', data);
export const getAlertsFiltered = (params)   => api.get('/detections/alerts/filter', { params });
export const clearAllAlerts    = ()         => api.delete('/detections/alerts/clear');
export const getLogs   = (params) => api.get('/detections/logs', { params });
export const clearLogs = ()        => api.delete('/detections/logs/clear');
// ── Users ─────────────────────────────────────────────────────
export const getUsers        = ()              => api.get('/users/');
export const getCurrentUser  = ()              => api.get('/users/me');
export const loginUser       = (data)          => api.post('/users/login', data);
export const addUser         = (data)          => api.post('/users/', data);
export const updateUser      = (id, data)      => api.put(`/users/${id}`, data);
export const deleteUser      = (id)            => api.delete(`/users/${id}`);
export const changePassword  = (id, data)      => api.put(`/users/${id}/password`, data);

export const getClassVisibility    = ()     => api.get('/detections/classes/visibility');
export const updateClassVisibility = (data) => api.put('/detections/classes/visibility', data);

export const getClassThresholds    = ()     => api.get('/detections/classes/thresholds');
export const updateClassThresholds = (data) => api.put('/detections/classes/thresholds', data);

export const uploadVideo = (formData) =>
  api.post('/cameras/upload-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

export const getEmailConfig    = ()     => api.get('/detections/email/config');
export const updateEmailConfig = (data) => api.put('/detections/email/config', data);
export const testEmail         = ()     => api.post('/detections/email/test');
export const resetEmailCounters= ()     => api.delete('/detections/email/counters/reset');