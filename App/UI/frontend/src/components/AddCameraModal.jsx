import React, { useState, useEffect, useRef } from 'react';
import { addCamera, uploadVideo } from '../services/api';
import { useApp } from '../context/AppContext';

export default function AddCameraModal({ onClose }) {
  const { refreshCameras }  = useApp();
  const [loading,    setLoading]    = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [detecting,  setDetecting]  = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [webcams,    setWebcams]    = useState([]);
  const [sourceType, setSourceType] = useState('none');
  const [customUrl,  setCustomUrl]  = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    name:     '',
    source:   '',
    location: ''
  });

  useEffect(() => { detectWebcams(); }, []);

  const detectWebcams = async () => {
    setDetecting(true);
    try {
      const res = await fetch('http://localhost:8000/cameras/detect-webcams');
      if (res.ok) {
        const data = await res.json();
        setWebcams(data.webcams || []);
      }
    } catch {
      setWebcams([{ index: 0, label: 'Webcam 0 (Default)' }]);
    } finally {
      setDetecting(false);
    }
  };

  const handleSourceType = (val) => {
    setSourceType(val);
    setError('');
    setUploadedFile(null);
    if (!['rtsp', 'http', 'custom', 'video', 'none'].includes(val)) {
      setForm(f => ({ ...f, source: val }));
    } else if (val === 'none') {
      setForm(f => ({ ...f, source: '' }));
    }
  };

  const handleVideoUpload = async (file) => {
    if (!file) return;

    const allowed = ['video/mp4', 'video/avi', 'video/mov',
                     'video/mkv', 'video/x-msvideo', 'video/quicktime'];
    const ext     = file.name.split('.').pop().toLowerCase();
    const allowedExts = ['mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv'];

    if (!allowedExts.includes(ext)) {
      setError('Only MP4, AVI, MOV, MKV files allowed');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await uploadVideo(formData);

      if (res.data.success) {
        setUploadedFile({
          name:     file.name,
          filepath: res.data.filepath,
          filename: res.data.filename
        });
        setForm(f => ({ ...f, source: res.data.filepath }));
        setUploadProgress(100);
        console.log('[Upload] Video uploaded:', res.data.filepath);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async () => {
    if (!form.name.trim())   return setError('Camera name is required');
    if (!form.source.trim()) return setError('Please select a source');

    setLoading(true);
    try {
      await addCamera({
        name:     form.name.trim(),
        source:   form.source.trim(),
        location: form.location.trim() || 'Unknown'
      });
      setSuccess('Camera added successfully!');
      await refreshCameras();
      setTimeout(() => onClose(), 1200);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add camera');
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ───────────────────────────────────────────────────
  const overlay = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,.85)',
    display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 1000
  };
  const modal = {
    background: '#111827', border: '1px solid #1e2d47',
    borderRadius: 12, padding: 24,
    width: 480, maxWidth: '95vw',
    maxHeight: '90vh', overflowY: 'auto'
  };
  const inputStyle = {
    width: '100%', background: '#0a0e1a',
    border: '1px solid #1e2d47', borderRadius: 6,
    padding: '8px 12px', color: '#e2e8f0',
    fontSize: 12, outline: 'none',
    marginBottom: 12, boxSizing: 'border-box'
  };

  const sourceBtn = (val, active) => ({
    flex:         1,
    padding:      '8px 6px',
    borderRadius: 6,
    border:       `1px solid ${active ? '#3b82f6' : '#1e2d47'}`,
    background:   active ? '#1e3a5f' : '#0a0e1a',
    color:        active ? '#60a5fa' : '#64748b',
    fontSize:     10, fontWeight: 600,
    cursor:       'pointer',
    textAlign:    'center',
    transition:   'all .15s'
  });

  return (
    <div
      style={overlay}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={modal}>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: 20
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
              Add New Camera
            </h2>
            <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0' }}>
              Connect webcam, IP stream, or upload video file
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: '#64748b', fontSize: 20, cursor: 'pointer'
            }}
          >✕</button>
        </div>

        {/* Camera Name */}
        <label style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 5 }}>
          Camera Name *
        </label>
        <input
          style={inputStyle}
          name="name"
          placeholder="e.g. Main Gate, Parking, Office"
          value={form.name}
          onChange={handleChange}
        />

        {/* Source Type */}
        <label style={{
          fontSize: 11, fontWeight: 600, color: '#94a3b8',
          display: 'block', marginBottom: 8
        }}>
          Source Type *
          {detecting && (
            <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6 }}>
              Detecting...
            </span>
          )}
        </label>

        {/* Source type buttons */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {[
            { val: 'webcam', label: '📷 Webcam'  },
            { val: 'video',  label: '🎬 Video'   },
            { val: 'rtsp',   label: '📡 RTSP'    },
            { val: 'http',   label: '🌐 HTTP'    },
            { val: 'custom', label: '⚙ Custom'   },
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => handleSourceType(opt.val)}
              style={sourceBtn(opt.val, sourceType === opt.val)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* ── WEBCAM ─────────────────────────────────────── */}
        {sourceType === 'webcam' && (
          <div style={{ marginBottom: 12 }}>
            {webcams.length === 0 ? (
              <div style={{
                padding: '12px', background: '#0a0e1a',
                border: '1px solid #1e2d47', borderRadius: 6,
                fontSize: 11, color: '#64748b', textAlign: 'center'
              }}>
                No webcams detected
              </div>
            ) : (
              webcams.map(cam => (
                <div
                  key={cam.index}
                  onClick={() => setForm(f => ({ ...f, source: String(cam.index) }))}
                  style={{
                    padding:      '10px 14px',
                    borderRadius: 6,
                    marginBottom: 6,
                    cursor:       'pointer',
                    border:       `1px solid ${form.source === String(cam.index) ? '#3b82f6' : '#1e2d47'}`,
                    background:   form.source === String(cam.index) ? '#1e3a5f' : '#0a0e1a',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          10
                  }}
                >
                  <span style={{ fontSize: 20 }}>📷</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize:   11, fontWeight: 600,
                      color:      form.source === String(cam.index) ? '#60a5fa' : '#e2e8f0'
                    }}>
                      {cam.label || `Webcam ${cam.index}`}
                    </div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>
                      Index {cam.index}
                    </div>
                  </div>
                  {form.source === String(cam.index) && (
                    <span style={{ color: '#60a5fa', fontSize: 16 }}>✓</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── VIDEO FILE ─────────────────────────────────── */}
        {sourceType === 'video' && (
          <div style={{ marginBottom: 12 }}>
            {!uploadedFile ? (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  border:         '2px dashed #253550',
                  borderRadius:   8,
                  padding:        '30px 20px',
                  textAlign:      'center',
                  cursor:         'pointer',
                  background:     '#0a0e1a',
                  transition:     'all .2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.background  = '#0d1728';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#253550';
                  e.currentTarget.style.background  = '#0a0e1a';
                }}
                onDragOver={e => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = '#3b82f6';
                }}
                onDrop={e => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleVideoUpload(file);
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 8 }}>🎬</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                  Click or drag & drop video file
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>
                  MP4, AVI, MOV, MKV, WMV, FLV supported
                </div>
                <div style={{
                  marginTop:    12,
                  background:   '#1e3a5f',
                  border:       '1px solid #253550',
                  color:        '#60a5fa',
                  padding:      '6px 16px',
                  borderRadius: 6,
                  fontSize:     11,
                  display:      'inline-block'
                }}>
                  Browse Files
                </div>
              </div>
            ) : (
              /* Uploaded file preview */
              <div style={{
                background:   '#0d2010',
                border:       '1px solid #166534',
                borderRadius: 8,
                padding:      '12px 14px'
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <span style={{ fontSize: 24 }}>🎬</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize:     11, fontWeight: 600,
                      color:        '#4ade80',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace:   'nowrap'
                    }}>
                      ✓ {uploadedFile.name}
                    </div>
                    <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>
                      Uploaded — ready to use
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setUploadedFile(null);
                      setForm(f => ({ ...f, source: '' }));
                      setUploadProgress(0);
                    }}
                    style={{
                      background: 'none', border: 'none',
                      color: '#64748b', cursor: 'pointer',
                      fontSize: 16
                    }}
                  >✕</button>
                </div>

                {/* Progress bar */}
                {uploadProgress > 0 && (
                  <div style={{
                    marginTop:  8, height: 3,
                    background: '#1e2d47', borderRadius: 2
                  }}>
                    <div style={{
                      width:      `${uploadProgress}%`,
                      height:     '100%',
                      background: '#22c55e', borderRadius: 2,
                      transition: 'width .3s'
                    }} />
                  </div>
                )}
              </div>
            )}

            {/* Uploading indicator */}
            {uploading && (
              <div style={{
                marginTop:  8, fontSize: 11,
                color:      '#60a5fa', textAlign: 'center'
              }}>
                ⏳ Uploading video...
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="video/*,.mp4,.avi,.mov,.mkv,.wmv,.flv"
              style={{ display: 'none' }}
              onChange={e => handleVideoUpload(e.target.files[0])}
            />
          </div>
        )}

        {/* ── RTSP / HTTP / CUSTOM ──────────────────────── */}
        {['rtsp', 'http', 'custom'].includes(sourceType) && (
          <div style={{ marginBottom: 12 }}>
            <input
              style={inputStyle}
              placeholder={
                sourceType === 'rtsp'   ? 'rtsp://admin:pass@192.168.1.100:554/stream' :
                sourceType === 'http'   ? 'http://192.168.1.100:8080/video' :
                'Enter any source URL or device path'
              }
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
            />
          </div>
        )}

        {/* Location */}
        <label style={{
          fontSize: 11, fontWeight: 600,
          color: '#94a3b8', display: 'block', marginBottom: 5
        }}>
          Location (optional)
        </label>
        <input
          style={inputStyle}
          name="location"
          placeholder="e.g. Main Gate, Parking Lot"
          value={form.location}
          onChange={handleChange}
        />

        {/* Preview */}
        <div style={{
          background: '#0a0e1a', border: '1px solid #1e2d47',
          borderRadius: 6, padding: '10px 12px', marginBottom: 14
        }}>
          <div style={{ fontSize: 10, color: '#64748b', marginBottom: 5, fontWeight: 600 }}>
            PREVIEW
          </div>
          <div style={{ fontSize: 11, color: '#e2e8f0', lineHeight: 1.8 }}>
            <span style={{ color: '#64748b' }}>Name: </span>
            {form.name || <span style={{ color: '#2a3a50' }}>—</span>}
            <br />
            <span style={{ color: '#64748b' }}>Source: </span>
            {form.source
              ? (sourceType === 'video'
                  ? `🎬 ${uploadedFile?.name || form.source}`
                  : form.source)
              : <span style={{ color: '#2a3a50' }}>—</span>
            }
            <br />
            <span style={{ color: '#64748b' }}>Location: </span>
            {form.location || <span style={{ color: '#2a3a50' }}>Unknown</span>}
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div style={{
            background: '#450a0a', border: '1px solid #7f1d1d',
            borderRadius: 6, padding: '8px 12px',
            marginBottom: 12, fontSize: 11, color: '#f87171'
          }}>
            ⚠ {error}
          </div>
        )}
        {success && (
          <div style={{
            background: '#0d2010', border: '1px solid #166534',
            borderRadius: 6, padding: '8px 12px',
            marginBottom: 12, fontSize: 11, color: '#4ade80'
          }}>
            ✓ {success}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, background: '#151d2e',
              border: '1px solid #1e2d47', color: '#94a3b8',
              padding: '9px', borderRadius: 6,
              fontSize: 12, fontWeight: 600, cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || uploading || !form.source}
            style={{
              flex:         2,
              background:   (loading || uploading || !form.source)
                ? '#1e2d47' : '#3b82f6',
              border:       'none',
              color:        (loading || uploading || !form.source)
                ? '#64748b' : '#fff',
              padding:      '9px', borderRadius: 6,
              fontSize:     12, fontWeight: 700,
              cursor:       (loading || uploading || !form.source)
                ? 'not-allowed' : 'pointer'
            }}
          >
            {uploading ? '⏳ Uploading...' :
             loading   ? '⏳ Adding...'   : '+ Add Camera'}
          </button>
        </div>

      </div>
    </div>
  );
}