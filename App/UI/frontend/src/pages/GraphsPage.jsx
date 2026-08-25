import React, { useState, useEffect, useRef } from 'react';
import { getGraphSummary, getGraphConfidence, getGraphTimeline } from '../services/api';
import { useApp } from '../context/AppContext';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement, BarElement, PointElement,
  LinearScale, CategoryScale,
  Filler, Tooltip, Legend
} from 'chart.js';

ChartJS.register(
  LineElement, BarElement, PointElement,
  LinearScale, CategoryScale,
  Filler, Tooltip, Legend
);

const gridColor = '#1e2d47';
const tickStyle = { color: '#64748b', font: { size: 9 } };

const CLASS_COLORS = {
  Normal:   '#22c55e',
  Phone:    '#60a5fa',
  Medical_Mask:'#34d399',
  Fire:     '#fb923c',
  Smoke:    '#94a3b8',
  Gun:      '#f87171',
  Knife:    '#facc15',
  Falling:  '#a78bfa',
  Violence: '#f43f5e',
  Theft_Mask:  '#fbbf24'
};

export default function GraphsPage() {
  const { detectionSummary } = useApp();

  const [confidence,     setConfidence]     = useState({});
  const [timeline,       setTimeline]       = useState({ labels: [], counts: [] });
  const [summaryFromApi, setSummaryFromApi] = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [lastUpdate,     setLastUpdate]     = useState('');
  const [confHours,      setConfHours]      = useState(1);
  const [timeHours,      setTimeHours]      = useState(1);
  const intervalRef = useRef(null);

  const loadData = async () => {
    try {
      const [sumRes, confRes, timeRes] = await Promise.all([
        getGraphSummary(),
        getGraphConfidence(confHours),
        getGraphTimeline(timeHours)
      ]);

      // Summary from API — attach color for chart use
      const apiSummary = (sumRes.data.data || []).map(s => ({
        ...s,
        count: Number(s.count) || 0,
        color: CLASS_COLORS[s.class_name] || '#ffffff'
      }));
      setSummaryFromApi(apiSummary);

      setConfidence(confRes.data.classes || {});
      setTimeline({
        labels: timeRes.data.labels || [],
        counts: timeRes.data.counts || []
      });
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (err) {
      console.warn('[Graphs] Failed to load:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, 3000);
    return () => clearInterval(intervalRef.current);
  }, [confHours, timeHours]);

  // ── Summary — prefer API data; fall back to WebSocket context ─
  const summaryData = summaryFromApi.length > 0
    ? summaryFromApi
    : Object.entries(detectionSummary).length > 0
      ? Object.entries(detectionSummary).map(([cls, count]) => ({
          class_name: cls,
          count:      Number(count) || 0,
          color:      CLASS_COLORS[cls] || '#ffffff'
        }))
      : Object.keys(CLASS_COLORS).map(cls => ({
          class_name: cls,
          count:      0,
          color:      CLASS_COLORS[cls]
        }));

  // ── Confidence chart ─────────────────────────────────────────
  const confLabels = Object.values(confidence)[0]
    ?.map(p => p.time_label) || [];

  const confDatasets = Object.keys(CLASS_COLORS)
    .map(cls => {
      const points = confidence[cls] || [];
      const color  = CLASS_COLORS[cls];
      return {
        label:       cls,
        data:        points.map(p => p.confidence),
        borderColor: color,
        borderWidth: 1.5,
        pointRadius: confLabels.length < 30 ? 2 : 0,
        fill:        false,
        tension:     0.4,
        spanGaps:    true
      };
    });

  const confChartData = {
    labels:   confLabels,
    datasets: confDatasets
  };

  // ── Timeline chart ───────────────────────────────────────────
  const timelineChartData = {
    labels:   timeline.labels,
    datasets: [{
      label:           'Detections',
      data:            timeline.counts,
      borderColor:     '#3b82f6',
      borderWidth:     2,
      fill:            true,
      backgroundColor: 'rgba(59,130,246,.08)',
      pointRadius:     0,
      tension:         0.4
    }]
  };

  // ── Summary bar chart ────────────────────────────────────────
  const summaryChartData = {
    labels:   summaryData.map(s => s.class_name.replace('_', ' ')),
    datasets: [{
      label:           'Count',
      data:            summaryData.map(s => s.count),
      backgroundColor: summaryData.map(s => `${s.color}cc`),
      borderColor:     summaryData.map(s => s.color),
      borderWidth:     1,
      borderRadius:    4
    }]
  };

  // ── Chart options ────────────────────────────────────────────
  const baseOpts = {
    animation:  false,
    responsive: true,
    plugins:    { legend: { display: false } },
    scales: {
      x: { ticks: { ...tickStyle, maxTicksLimit: 8 }, grid: { color: gridColor } },
      y: { ticks: tickStyle,                          grid: { color: gridColor } }
    }
  };

  const confOpts = {
    ...baseOpts,
    plugins: {
      legend: {
        display:  true,
        position: 'bottom',
        labels:   {
          color:    '#64748b',
          font:     { size: 9 },
          boxWidth: 10,
          padding:  8
        }
      }
    },
    scales: {
      x: { ticks: tickStyle, grid: { color: gridColor } },
      y: {
        min:   0,
        max:   1,
        ticks: { ...tickStyle, stepSize: .25 },
        grid:  { color: gridColor }
      }
    }
  };

  // ── Stats ────────────────────────────────────────────────────
  const threatClasses = ['Fire', 'Gun', 'Knife', 'Violence', 'Smoke', 'Falling', 'Theft_Mask'];

  const totalDetections = summaryData.reduce((a, b) => a + b.count, 0);
  const threatEvents    = summaryData
    .filter(s => threatClasses.includes(s.class_name))
    .reduce((a, b) => a + b.count, 0);
  const normalEvents    = summaryData.find(s => s.class_name === 'Normal')?.count || 0;
  const activeClasses   = summaryData.filter(s => s.count > 0).length;

  if (loading) {
    return (
      <div style={{
        flex: 1, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        color: '#64748b', fontSize: 13
      }}>
        Loading graphs...
      </div>
    );
  }

  return (
    <div style={{ padding: '14px 16px', height: '100%', overflowY: 'auto' }}>

      {/* ── Header ───────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   16
      }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
            Analytics & Graphs
          </h2>
          <p style={{ fontSize: 11, color: '#64748b', margin: '3px 0 0' }}>
            Real-time detection analytics — auto refresh every 3s
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdate && (
            <span style={{ fontSize: 10, color: '#64748b' }}>
              Updated: {lastUpdate}
            </span>
          )}
          <button
            onClick={loadData}
            style={{
              background:   '#151d2e',
              border:       '1px solid #1e2d47',
              color:        '#94a3b8',
              padding:      '5px 12px',
              borderRadius: 6,
              fontSize:     11,
              cursor:       'pointer'
            }}
          >
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* ── Stats row ────────────────────────────────────────── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(4,1fr)',
        gap:                 8,
        marginBottom:        14
      }}>
        {[
          { label: 'Total Detections', value: totalDetections, color: '#60a5fa' },
          { label: 'Threat Events',    value: threatEvents,    color: '#f87171' },
          { label: 'Normal Events',    value: normalEvents,    color: '#22c55e' },
          { label: 'Classes Active',   value: activeClasses,   color: '#a78bfa' },
        ].map((stat, i) => (
          <div key={i} style={{
            background:   '#151d2e',
            border:       '1px solid #1e2d47',
            borderRadius: 8,
            padding:      '10px 14px'
          }}>
            <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts row ───────────────────────────────────────── */}
      <div style={{
        display:             'grid',
        gridTemplateColumns: '1fr 1fr',
        gap:                 12,
        marginBottom:        12
      }}>

        {/* Confidence Score */}
        <div style={{
          background:   '#151d2e',
          border:       '1px solid #1e2d47',
          borderRadius: 8,
          padding:      12
        }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   10
          }}>
            <span style={{
              fontSize:      11,
              fontWeight:    700,
              color:         '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '.5px'
            }}>
              Confidence Score Graph
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                value={confHours}
                onChange={e => setConfHours(Number(e.target.value))}
                style={{
                  background:   '#0a0e1a',
                  border:       '1px solid #1e2d47',
                  color:        '#94a3b8',
                  borderRadius: 4,
                  fontSize:     9,
                  padding:      '2px 4px',
                  cursor:       'pointer'
                }}
              >
                <option value={1}>1h</option>
                <option value={6}>6h</option>
                <option value={24}>24h</option>
              </select>
              <span style={{
                fontSize:     9,
                color:        '#22c55e',
                background:   '#0d2010',
                padding:      '2px 6px',
                borderRadius: 4
              }}>
                ● Live
              </span>
            </div>
          </div>

          {Object.keys(confidence).length === 0 ? (
            <div style={{
              height:         160,
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'center',
              justifyContent: 'center',
              color:          '#64748b',
              fontSize:       11,
              gap:            6
            }}>
              <span style={{ fontSize: 24 }}>📊</span>
              No threat detections yet
            </div>
          ) : (
            <Line
              data={confChartData}
              options={confOpts}
              height={160}
            />
          )}
        </div>

        {/* Detections Over Time */}
        <div style={{
          background:   '#151d2e',
          border:       '1px solid #1e2d47',
          borderRadius: 8,
          padding:      12
        }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   10
          }}>
            <span style={{
              fontSize:      11,
              fontWeight:    700,
              color:         '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '.5px'
            }}>
              Detections Over Time
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                value={timeHours}
                onChange={e => setTimeHours(Number(e.target.value))}
                style={{
                  background:   '#0a0e1a',
                  border:       '1px solid #1e2d47',
                  color:        '#94a3b8',
                  borderRadius: 4,
                  fontSize:     9,
                  padding:      '2px 4px',
                  cursor:       'pointer'
                }}
              >
                <option value={1}>1h</option>
                <option value={6}>6h</option>
                <option value={24}>24h</option>
              </select>
              <span style={{
                fontSize:     9,
                color:        '#60a5fa',
                background:   '#0a1628',
                padding:      '2px 6px',
                borderRadius: 4
              }}>
                Today
              </span>
            </div>
          </div>
          <Line
            data={timelineChartData}
            options={baseOpts}
            height={160}
          />
        </div>

      </div>

      {/* ── Summary Bar Chart ─────────────────────────────────── */}
      <div style={{
        background:   '#151d2e',
        border:       '1px solid #1e2d47',
        borderRadius: 8,
        padding:      12
      }}>
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   10
        }}>
          <span style={{
            fontSize:      11,
            fontWeight:    700,
            color:         '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '.5px'
          }}>
            Detection Summary — All Classes
          </span>
          <span style={{
            fontSize:     9,
            color:        '#fbbf24',
            background:   '#2d220a',
            padding:      '2px 6px',
            borderRadius: 4
          }}>
            Live via WebSocket
          </span>
        </div>

        {totalDetections === 0 ? (
          <div style={{
            height:         80,
            display:        'flex',
            flexDirection:  'column',
            alignItems:     'center',
            justifyContent: 'center',
            color:          '#64748b',
            fontSize:       11,
            gap:            4
          }}>
            <span style={{ fontSize: 20 }}>📡</span>
            No detections yet today
          </div>
        ) : (
          <Bar
            data={summaryChartData}
            options={baseOpts}
            height={80}
          />
        )}
      </div>

    </div>
  );
}