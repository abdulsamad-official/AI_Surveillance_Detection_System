import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../services/api';

export default function ThresholdPanel() {
  const [settings, setSettings] = useState({
    pre_event_minutes:    10,
    post_event_minutes:   10,
    segment_minutes:      10,
    confidence_threshold: 0.50,
    detection_timeout:    10,
  });
  const [editing, setEditing] = useState(null);
  const [tempVal, setTempVal] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');

  // Load settings on mount
  useEffect(() => {
    getSettings()
      .then(res => setSettings(res.data.settings))
      .catch(() => {});
  }, []);

  const rows = [
    { label: 'Pre-Event Recording',  key: 'pre_event_minutes',    type: 'int',   min: 1,   max: 60  },
    { label: 'Post-Event Recording', key: 'post_event_minutes',   type: 'int',   min: 1,   max: 60  },
    { label: 'Segment Duration',     key: 'segment_minutes',      type: 'int',   min: 1,   max: 60  },
    { label: 'Confidence Threshold', key: 'confidence_threshold', type: 'float', min: 0.1, max: 1.0 },
    { label: 'Detection Timeout',    key: 'detection_timeout',    type: 'int',   min: 1,   max: 300 },
  ];

  const formatVal = (key, val) => {
    if (val === undefined || val === null) return '—';
    if (key === 'confidence_threshold') return val.toFixed(2);
    if (key === 'detection_timeout')    return `${val}s`;
    return `${val} min`;
  };

  const startEdit = (key, val) => {
    setEditing(key);
    setTempVal(String(val ?? ''));
    setError('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setTempVal('');
  };

  const confirmEdit = (row) => {
    const val = row.type === 'float'
      ? parseFloat(tempVal)
      : parseInt(tempVal);

    if (isNaN(val) || val < row.min || val > row.max) {
      setError(`${row.label}: must be between ${row.min} and ${row.max}`);
      return;
    }
    setSettings(prev => ({ ...prev, [row.key]: val }));
    setEditing(null);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ borderBottom: '1px solid #1e2d47', padding: '10px 12px', flexShrink: 0 }}>
      <div style={{
        fontSize:      11,
        fontWeight:    700,
        color:         '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '.5px',
        marginBottom:  8
      }}>
        Recording & Thresholds
      </div>

      {rows.map((row, i) => (
        <div key={i} style={{
          display:       'flex',
          justifyContent:'space-between',
          alignItems:    'center',
          padding:       '5px 0',
          borderBottom:  '1px solid #1e2d47'
        }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>{row.label}</span>

          {editing === row.key ? (
            /* Inline edit mode */
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number"
                value={tempVal}
                min={row.min}
                max={row.max}
                step={row.type === 'float' ? 0.05 : 1}
                onChange={e => setTempVal(e.target.value)}
                autoFocus
                style={{
                  width:        60,
                  background:   '#0a0e1a',
                  border:       '1px solid #3b82f6',
                  borderRadius: 4,
                  padding:      '2px 6px',
                  color:        '#e2e8f0',
                  fontSize:     11,
                  outline:      'none'
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter')  confirmEdit(row);
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
              <span
                onClick={() => confirmEdit(row)}
                style={{ fontSize: 14, cursor: 'pointer', color: '#4ade80' }}
                title="Confirm"
              >✓</span>
              <span
                onClick={cancelEdit}
                style={{ fontSize: 14, cursor: 'pointer', color: '#f87171' }}
                title="Cancel"
              >✕</span>
            </div>
          ) : (
            /* Display mode */
            <span style={{
              fontSize:   11,
              fontWeight: 600,
              color:      '#fff',
              display:    'flex',
              alignItems: 'center',
              gap:        6
            }}>
              {formatVal(row.key, settings[row.key])}
              <span
                onClick={() => startEdit(row.key, settings[row.key])}
                style={{ fontSize: 11, color: '#64748b', cursor: 'pointer' }}
                title="Edit"
              >✏️</span>
            </span>
          )}
        </div>
      ))}

      {/* Error message */}
      {error && (
        <div style={{
          fontSize:     10,
          color:        '#f87171',
          marginTop:    6,
          padding:      '4px 8px',
          background:   '#450a0a',
          borderRadius: 4
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          background:   saved ? '#0d2010' : saving ? '#1e2d47' : '#3b82f6',
          color:        saved ? '#4ade80' : saving ? '#64748b' : '#fff',
          border:       saved ? '1px solid #166534' : 'none',
          width:        '100%',
          padding:      '7px',
          borderRadius: 6,
          fontSize:     11,
          fontWeight:   700,
          cursor:       saving ? 'not-allowed' : 'pointer',
          marginTop:    8,
          transition:   'all .3s'
        }}
      >
        {saved ? '✓ Settings Saved!' : saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}