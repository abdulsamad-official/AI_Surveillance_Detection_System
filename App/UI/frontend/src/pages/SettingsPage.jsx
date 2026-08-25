import React, { useState, useEffect, useRef } from 'react';
import alertSound from '../utils/alertSound';
import {
  getAlertConfig,      updateAlertConfig,
  getSettings,         updateSettings,
  getClassVisibility,  updateClassVisibility,
  getClassThresholds,  updateClassThresholds,
  getEmailConfig,      updateEmailConfig,  testEmail,
} from '../services/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const CLASS_ICONS = {
  Normal:       '🛡️',
  Phone:        '📱',
  Medical_Mask: '😷',
  Fire:         '🔥',
  Smoke:        '💨',
  Gun:          '🔫',
  Knife:        '🔪',
  Falling:      '🏃',
  Violence:     '⚡',
  Theft_Mask:   '🎭',
};

const CLASS_COLORS = {
  Normal:       '#22c55e',
  Phone:        '#60a5fa',
  Medical_Mask: '#34d399',
  Fire:         '#fb923c',
  Smoke:        '#94a3b8',
  Gun:          '#f87171',
  Knife:        '#facc15',
  Falling:      '#a78bfa',
  Violence:     '#f43f5e',
  Theft_Mask:   '#fbbf24',
};

const RECORDING_ROWS = [
  { label: 'Pre-Event Recording',  key: 'pre_event_minutes',    unit: 'min', min: 1,   max: 30,  step: 1    },
  { label: 'Post-Event Recording', key: 'post_event_minutes',   unit: 'min', min: 1,   max: 30,  step: 1    },
  { label: 'Segment Duration',     key: 'segment_minutes',      unit: 'min', min: 1,   max: 60,  step: 1    },
  { label: 'Confidence Threshold', key: 'confidence_threshold', unit: '',    min: 0.1, max: 1.0, step: 0.05 },
  { label: 'Detection Timeout',    key: 'detection_timeout',    unit: 's',   min: 3,   max: 120, step: 1    },
];

const THRESHOLD_HINT = (val) => {
  if (val <= 0.30) return '🟢 Very sensitive — many detections';
  if (val <= 0.50) return '🟡 Balanced — recommended';
  if (val <= 0.70) return '🟠 Strict — only confident detections';
  return '🔴 Very strict — rare detections';
};

// ── Shared micro-components ───────────────────────────────────────────────────

const Toggle = ({ value, onChange, color = '#3b82f6' }) => (
  <div
    onClick={onChange}
    style={{
      width: 44, height: 24, borderRadius: 12, flexShrink: 0,
      background: value ? color : '#253550',
      position: 'relative', cursor: 'pointer', transition: 'background .2s',
    }}
  >
    <div style={{
      position: 'absolute', top: 4, left: value ? 22 : 4,
      width: 16, height: 16, borderRadius: '50%',
      background: '#fff', transition: 'left .2s',
    }} />
  </div>
);

// ── Shared styles ─────────────────────────────────────────────────────────────

const S = {
  section:      { background: '#151d2e', border: '1px solid #1e2d47', borderRadius: 8, padding: 16, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid #1e2d47', display: 'flex', alignItems: 'center', gap: 8 },
  row:          { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e2d4740' },
  label:        { fontSize: 12, color: '#94a3b8' },
  input:        { background: '#0a0e1a', border: '1px solid #1e2d47', borderRadius: 5, padding: '5px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none', width: 100 },
  inputFull:    { background: '#0a0e1a', border: '1px solid #1e2d47', borderRadius: 5, padding: '5px 10px', color: '#e2e8f0', fontSize: 12, outline: 'none', width: '100%', marginBottom: 10 },
  subText:      { fontSize: 10, color: '#475569', marginTop: 2 },
  valueText:    { fontSize: 12, fontWeight: 700, color: '#60a5fa', minWidth: 55 },
  labelBlock:   { fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 5 },
};

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [alertConfig,   setAlertConfig]   = useState(null);
  const [sysSettings,   setSysSettings]   = useState(null);
  const [visibility,    setVisibility]    = useState({});
  const [thresholds,    setThresholds]    = useState({});
  const [soundSettings, setSoundSettings] = useState(alertSound.settings);
  const [emailCfg,      setEmailCfg]      = useState({});
  const [saving,        setSaving]        = useState('');
  const [saved,         setSaved]         = useState('');
  const [testing,       setTesting]       = useState(false);
  const [testingEmail,  setTestingEmail]  = useState(false);
  const [testResult,    setTestResult]    = useState('');
  const fileRef = useRef(null);

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [cfgRes, sysRes, visRes, thrRes, emailRes] = await Promise.all([
          getAlertConfig(), getSettings(), getClassVisibility(),
          getClassThresholds(), getEmailConfig(),
        ]);
        setAlertConfig(cfgRes.data.config       || {});
        setSysSettings(sysRes.data.settings     || {});
        setVisibility( visRes.data.visibility   || {});
        setThresholds( thrRes.data.thresholds   || {});
        setEmailCfg(   emailRes.data.config     || {});
      } catch (err) {
        console.warn('[Settings] Load failed:', err);
      }
    })();
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const flashSaved = (key) => { setSaved(key); setTimeout(() => setSaved(''), 2000); };

  const withSave = (key, fn) => async () => {
    setSaving(key);
    try   { await fn(); flashSaved(key); }
    catch (err) { console.warn(`[Settings] Save "${key}" failed:`, err); }
    finally     { setSaving(''); }
  };

  const saveAlertConfig   = withSave('alert', () => updateAlertConfig(alertConfig));
  const saveSysSettings   = withSave('sys',   () => updateSettings(sysSettings));
  const saveVisibility    = withSave('vis',   () => updateClassVisibility(visibility));
  const saveThresholds    = withSave('thr',   () => updateClassThresholds(thresholds));
  const saveEmail         = withSave('email', () => updateEmailConfig(emailCfg));
  const saveSoundSettings = () => { alertSound.saveSettings(soundSettings); flashSaved('sound'); };

  const testSound = () => {
    setTesting(true);
    alertSound.test(soundSettings.soundType);
    setTimeout(() => setTesting(false), 3000);
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setTestResult('');
    try {
      await testEmail();
      setTestResult('success');
    } catch {
      setTestResult('failed');
    } finally {
      setTestingEmail(false);
      setTimeout(() => setTestResult(''), 4000);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await alertSound.loadCustomFile(file);
      setSoundSettings(prev => ({ ...prev, soundType: 'custom', customFile: file.name }));
    } catch {
      alert('Failed to load audio file. Use MP3 or WAV.');
    }
  };

  const resetThresholds = () => {
    const reset = {};
    Object.keys(CLASS_ICONS).forEach(cls => { reset[cls] = 0.50; });
    setThresholds(reset);
  };

  // Save button helpers
  const saveBtnStyle = (key) => ({
    background:   saved === key ? '#0d2010' : saving === key ? '#1e2d47' : '#3b82f6',
    border:       saved === key ? '1px solid #166534' : 'none',
    color:        saved === key ? '#4ade80' : saving === key ? '#64748b' : '#fff',
    padding:      '7px 18px', borderRadius: 6, fontSize: 11,
    fontWeight:   700, cursor: saving === key ? 'not-allowed' : 'pointer', marginTop: 12,
  });

  const saveBtnLabel = (key, label) =>
    saved === key ? '✓ Saved!' : saving === key ? 'Saving...' : label;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!alertConfig || !sysSettings) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
      Loading settings...
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Settings</h2>
        <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
          Configure system behavior, alerts, and notifications
        </p>
      </div>

      {/* ── 1. Recording Settings ──────────────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>🎬 Recording Settings</div>

        {RECORDING_ROWS.map((row) => (
          <div key={row.key} style={S.row}>
            <div>
              <span style={S.label}>{row.label}</span>
              {row.key === 'detection_timeout' && (
                <div style={S.subText}>No detection ke baad Normal status show hone ka time</div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range"
                min={row.min} max={row.max} step={row.step}
                value={sysSettings[row.key] ?? row.min}
                onChange={e => setSysSettings(prev => ({
                  ...prev,
                  [row.key]: row.step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value),
                }))}
                style={{ width: 120 }}
              />
              <span style={S.valueText}>{sysSettings[row.key]}{row.unit}</span>
            </div>
          </div>
        ))}

        <button onClick={saveSysSettings} style={saveBtnStyle('sys')}>
          {saveBtnLabel('sys', 'Save Recording Settings')}
        </button>
      </div>

      {/* ── 2. Class Visibility ────────────────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>👁 Class Visibility — Show/Hide Classes</div>
        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
          Disabled classes will be completely hidden from detections, alerts, summary, and graphs.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {Object.entries(CLASS_ICONS).map(([cls, icon]) => {
            const enabled = visibility[cls] ?? true;
            const color   = CLASS_COLORS[cls] || '#94a3b8';
            return (
              <div key={cls} style={{
                background: enabled ? `${color}11` : '#0a0e1a',
                border:     `1px solid ${enabled ? color + '44' : '#1e2d47'}`,
                borderRadius: 8, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10,
                transition: 'all .2s', opacity: enabled ? 1 : 0.5,
              }}>
                <Toggle value={enabled} color={color}
                  onChange={() => setVisibility(prev => ({ ...prev, [cls]: !enabled }))} />
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: enabled ? color : '#64748b' }}>
                    {cls.replace('_', ' ')}
                  </div>
                  <div style={S.subText}>{enabled ? 'Active — showing in all panels' : 'Hidden — disabled everywhere'}</div>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 3, flexShrink: 0,
                  background: enabled ? `${color}22` : '#1e2d47',
                  color:      enabled ? color : '#475569',
                }}>
                  {enabled ? 'ON' : 'OFF'}
                </span>
              </div>
            );
          })}
        </div>

        <button onClick={saveVisibility} style={saveBtnStyle('vis')}>
          {saveBtnLabel('vis', 'Save Visibility Settings')}
        </button>
      </div>

      {/* ── 3. Email Alert Settings ────────────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>📧 Email Alert Settings</div>
        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>
          Gmail SMTP use hoga — bilkul free.
          Gmail App Password use karo (normal password nahi chalega).
        </p>

        {/* Enable toggle */}
        <div style={S.row}>
          <div>
            <span style={S.label}>Email Alerts</span>
            <div style={S.subText}>Threat detect hone pe automatic email bhejo</div>
          </div>
          <Toggle
            value={!!emailCfg.enabled}
            onChange={() => setEmailCfg(p => ({ ...p, enabled: !p.enabled }))}
          />
        </div>

        {/* Sender email */}
        <div style={{ marginTop: 10 }}>
          <label style={S.labelBlock}>Your Gmail Address (Sender)</label>
          <input
            type="email" placeholder="yourname@gmail.com"
            value={emailCfg.sender_email || ''}
            onChange={e => setEmailCfg(p => ({ ...p, sender_email: e.target.value }))}
            style={S.inputFull}
          />
        </div>

        {/* App password */}
        <div>
          <label style={S.labelBlock}>
            Gmail App Password{' '}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer"
              style={{ color: '#3b82f6', fontSize: 10, marginLeft: 8, fontWeight: 400 }}>
              Get App Password ↗
            </a>
          </label>
          <input
            type="password"
            placeholder={emailCfg.password_set ? '●●●●●●●●●●●● (already set)' : 'xxxx xxxx xxxx xxxx'}
            onChange={e => setEmailCfg(p => ({ ...p, sender_password: e.target.value }))}
            style={S.inputFull}
          />
          <div style={{ fontSize: 9, color: '#475569', marginTop: -8, marginBottom: 10 }}>
            Gmail → Settings → Security → 2-Step Verification ON → App Passwords → Generate
          </div>
        </div>

        {/* Receiver email */}
        <div>
          <label style={S.labelBlock}>Alert Receiver Email</label>
          <input
            type="email" placeholder="receiver@gmail.com"
            value={emailCfg.receiver_email || ''}
            onChange={e => setEmailCfg(p => ({ ...p, receiver_email: e.target.value }))}
            style={S.inputFull}
          />
        </div>

        {/* Detection count slider */}
        <div style={S.row}>
          <div>
            <span style={S.label}>Send Email After</span>
            <div style={S.subText}>Kitne detections ke baad email bhejo</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min="1" max="20" step="1"
              value={emailCfg.detection_count || 3}
              onChange={e => setEmailCfg(p => ({ ...p, detection_count: parseInt(e.target.value) }))}
              style={{ width: 120 }}
            />
            <span style={{ ...S.valueText, minWidth: 80 }}>
              {emailCfg.detection_count || 3} detections
            </span>
          </div>
        </div>

        {/* Cooldown slider */}
        <div style={S.row}>
          <div>
            <span style={S.label}>Email Cooldown</span>
            <div style={S.subText}>2 emails ke beech minimum gap</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min="1" max="120" step="1"
              value={emailCfg.cooldown_minutes || 30}
              onChange={e => setEmailCfg(p => ({ ...p, cooldown_minutes: parseInt(e.target.value) }))}
              style={{ width: 120 }}
            />
            <span style={{ ...S.valueText, minWidth: 80 }}>
              {emailCfg.cooldown_minutes || 30} min
            </span>
          </div>
        </div>

        {/* Info box */}
        <div style={{
          background: '#0a0e1a', border: '1px solid #1e2d47', borderRadius: 6,
          padding: '10px 14px', margin: '10px 0 12px', fontSize: 11, color: '#64748b', lineHeight: 1.7,
        }}>
          <div style={{ color: '#fbbf24', fontWeight: 600, marginBottom: 4 }}>⚙ Current Settings:</div>
          Email after{' '}
          <strong style={{ color: '#60a5fa' }}>{emailCfg.detection_count || 3} detections</strong>
          {' '}with{' '}
          <strong style={{ color: '#60a5fa' }}>{emailCfg.cooldown_minutes || 30} min</strong>
          {' '}cooldown.<br />
          Example: Fire detected 3 times → email sent → next email after {emailCfg.cooldown_minutes || 30} minutes.
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleTestEmail}
            disabled={testingEmail}
            style={{
              background:   testResult === 'success' ? '#0d2010' : testResult === 'failed' ? '#450a0a' : '#1e3a5f',
              border:       `1px solid ${testResult === 'success' ? '#166534' : testResult === 'failed' ? '#7f1d1d' : '#253550'}`,
              color:        testResult === 'success' ? '#4ade80' : testResult === 'failed' ? '#f87171' : '#60a5fa',
              padding: '7px 14px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              cursor: testingEmail ? 'not-allowed' : 'pointer',
            }}
          >
            {testingEmail ? '⏳ Sending...' : testResult === 'success' ? '✓ Email Sent!' : testResult === 'failed' ? '✗ Failed' : '📧 Send Test Email'}
          </button>
          <button onClick={saveEmail} style={saveBtnStyle('email')}>
            {saveBtnLabel('email', 'Save Email Settings')}
          </button>
        </div>
      </div>

      {/* ── 4. Alert Class Config ──────────────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>🚨 Alert Classes — Enable/Disable per Class</div>
        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
          Toggle which classes trigger alerts. Severity can also be changed.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {Object.entries(CLASS_ICONS).map(([cls, icon]) => {
            const enabled  = alertConfig.enabled_classes?.[cls] ?? false;
            const severity = alertConfig.severity_map?.[cls]    || 'Low';
            const color    = CLASS_COLORS[cls];
            return (
              <div key={cls} style={{
                background: enabled ? `${color}11` : '#0a0e1a',
                border:     `1px solid ${enabled ? color + '44' : '#1e2d47'}`,
                borderRadius: 8, padding: '10px 12px',
                display: 'flex', alignItems: 'center', gap: 10, transition: 'all .2s',
              }}>
                <Toggle value={enabled} color={color}
                  onChange={() => setAlertConfig(prev => ({
                    ...prev,
                    enabled_classes: { ...prev.enabled_classes, [cls]: !enabled },
                  }))}
                />
                <span style={{ fontSize: 16 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: enabled ? color : '#64748b' }}>
                    {cls.replace('_', ' ')}
                  </div>
                </div>
                <select
                  value={severity}
                  onChange={e => setAlertConfig(prev => ({
                    ...prev,
                    severity_map: { ...prev.severity_map, [cls]: e.target.value },
                  }))}
                  style={{
                    background: '#0a0e1a', border: '1px solid #1e2d47', outline: 'none',
                    color:      severity === 'High' ? '#f87171' : severity === 'Medium' ? '#fbbf24' : '#4ade80',
                    fontSize: 10, padding: '3px 6px', borderRadius: 4, cursor: 'pointer',
                  }}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            );
          })}
        </div>

        <button onClick={saveAlertConfig} style={saveBtnStyle('alert')}>
          {saveBtnLabel('alert', 'Save Alert Config')}
        </button>
      </div>

      {/* ── 5. Per-Class Confidence Thresholds ────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>🎯 Per-Class Confidence Thresholds</div>
        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>
          Har class ka alag confidence threshold set karo.
          Agar Fire ka threshold 0.30 hai to 30% confidence pe bhi detect karega.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          {Object.entries(CLASS_ICONS)
            .filter(([cls]) => visibility[cls] !== false)
            .map(([cls, icon]) => {
              const color = CLASS_COLORS[cls] || '#94a3b8';
              const val   = thresholds[cls]   ?? 0.50;
              return (
                <div key={cls} style={{
                  background: '#0a0e1a', border: '1px solid #1e2d47', borderRadius: 8, padding: '10px 14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{icon}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color }}>{cls.replace('_', ' ')}</span>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color,
                      background: `${color}22`, border: `1px solid ${color}44`,
                      padding: '3px 10px', borderRadius: 5, minWidth: 45, textAlign: 'center',
                    }}>
                      {val.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range" min="0.10" max="0.95" step="0.05" value={val}
                    onChange={e => setThresholds(prev => ({ ...prev, [cls]: parseFloat(e.target.value) }))}
                    style={{ width: '100%', accentColor: color, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: '#475569' }}>0.10 (Sensitive)</span>
                    <span style={{ fontSize: 9, color: '#475569' }}>0.95 (Strict)</span>
                  </div>
                  <div style={{ fontSize: 9, color: '#475569', marginTop: 5, textAlign: 'center' }}>
                    {THRESHOLD_HINT(val)}
                  </div>
                </div>
              );
            })}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={resetThresholds} style={{
            background: '#151d2e', border: '1px solid #1e2d47', color: '#94a3b8',
            padding: '7px 14px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
          }}>
            ↺ Reset All to 0.50
          </button>
          <button onClick={saveThresholds} style={saveBtnStyle('thr')}>
            {saveBtnLabel('thr', '🎯 Save Thresholds')}
          </button>
        </div>
      </div>

      {/* ── 6. Sound Settings ─────────────────────────────────────────────── */}
      <div style={S.section}>
        <div style={S.sectionTitle}>🔔 Alert Sound Settings</div>

        <div style={S.row}>
          <span style={S.label}>Sound Alerts Enabled</span>
          <Toggle value={soundSettings.enabled}
            onChange={() => setSoundSettings(prev => ({ ...prev, enabled: !prev.enabled }))} />
        </div>

        <div style={S.row}>
          <span style={S.label}>Volume</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12 }}>🔇</span>
            <input type="range" min="0" max="1" step="0.1"
              value={soundSettings.volume}
              onChange={e => setSoundSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))}
              style={{ width: 120 }}
            />
            <span style={{ fontSize: 12 }}>🔊</span>
            <span style={{ ...S.valueText, minWidth: 35 }}>{Math.round(soundSettings.volume * 100)}%</span>
          </div>
        </div>

        <div style={{ ...S.row, alignItems: 'flex-start', paddingTop: 10 }}>
          <span style={S.label}>Sound Type</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[
                { id: 'beep', label: '🔵 Beep' }, { id: 'alarm', label: '🔴 Alarm' },
                { id: 'siren', label: '🚨 Siren' }, { id: 'custom', label: '📁 Custom' },
              ].map(({ id, label }) => (
                <button key={id}
                  onClick={() => setSoundSettings(prev => ({ ...prev, soundType: id }))}
                  style={{
                    background:    soundSettings.soundType === id ? '#1e3a5f' : '#0a0e1a',
                    border:        `1px solid ${soundSettings.soundType === id ? '#3b82f6' : '#1e2d47'}`,
                    color:         soundSettings.soundType === id ? '#60a5fa' : '#64748b',
                    padding:       '5px 12px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
                    fontWeight:    soundSettings.soundType === id ? 600 : 400,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {soundSettings.soundType === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: '#64748b' }}>{soundSettings.customFile || 'No file loaded'}</span>
                <button onClick={() => fileRef.current?.click()} style={{
                  background: '#1e3a5f', border: '1px solid #253550', color: '#60a5fa',
                  padding: '4px 10px', borderRadius: 4, fontSize: 10, cursor: 'pointer',
                }}>
                  📁 Upload Sound
                </button>
                <input ref={fileRef} type="file" accept="audio/*"
                  style={{ display: 'none' }} onChange={handleFileUpload} />
              </div>
            )}
          </div>
        </div>

        <div style={S.row}>
          <div>
            <span style={S.label}>Alert Duration</span>
            <div style={S.subText}>How long to keep playing the alert</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min="5" max="120" step="5"
              value={soundSettings.duration}
              onChange={e => setSoundSettings(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
              style={{ width: 120 }}
            />
            <span style={S.valueText}>{soundSettings.duration}s</span>
          </div>
        </div>

        <div style={S.row}>
          <span style={S.label}>Repeat Alert</span>
          <Toggle value={soundSettings.repeat}
            onChange={() => setSoundSettings(prev => ({ ...prev, repeat: !prev.repeat }))} />
        </div>

        {soundSettings.repeat && (
          <div style={S.row}>
            <div>
              <span style={S.label}>Repeat Every</span>
              <div style={S.subText}>Interval between repeated alerts</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="range" min="3" max="60" step="1"
                value={soundSettings.repeatInterval}
                onChange={e => setSoundSettings(prev => ({ ...prev, repeatInterval: parseInt(e.target.value) }))}
                style={{ width: 120 }}
              />
              <span style={S.valueText}>{soundSettings.repeatInterval}s</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={testSound} disabled={testing} style={{
            background: testing ? '#1a2340' : '#1e3a5f', border: '1px solid #253550',
            color: testing ? '#64748b' : '#60a5fa',
            padding: '7px 16px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            {testing ? '🔊 Playing...' : '▶ Test Sound'}
          </button>
          <button onClick={saveSoundSettings} style={saveBtnStyle('sound')}>
            {saveBtnLabel('sound', 'Save Sound Settings')}
          </button>
        </div>
      </div>

     
    </div>
  );
}