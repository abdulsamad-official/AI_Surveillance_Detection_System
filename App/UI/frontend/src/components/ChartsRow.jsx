import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, LineElement, PointElement,
  LinearScale, CategoryScale, Filler, Tooltip, Legend
} from 'chart.js';
import useResponsive from '../hooks/useResponsive';
import { getGraphConfidence, getGraphTimeline, getClassVisibility } from '../services/api';

ChartJS.register(
  LineElement, PointElement,
  LinearScale, CategoryScale,
  Filler, Tooltip, Legend
);

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
  Theft_Mask:   '#fbbf24'
};

const THREAT_CLASSES = [
  'Fire', 'Smoke', 'Gun', 'Knife',
  'Falling', 'Violence', 'Theft_Mask'
];

const GRID_COLOR = '#1e2d47';
const TICK_STYLE = { color: '#64748b', font: { size: 9 } };

const TIME_OPTIONS = [
  { label: '1 Hour',   value: 1  },
  { label: '5 Hours',  value: 5  },
  { label: '12 Hours', value: 12 },
  { label: '1 Day',    value: 24 },
];

const REFRESH_MS = 3000;

// ── Static chart options — these never depend on props/state, so ──
// ── they're built once at module load instead of every render ────
const CONF_CHART_OPTIONS = {
  animation:  false,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display:  true,
      position: 'bottom',
      labels: {
        color:    '#64748b',
        font:     { size: 8 },
        boxWidth: 8,
        padding:  6
      }
    },
    tooltip: {
      callbacks: {
        label: ctx =>
          `${ctx.dataset.label}: ${ctx.parsed.y != null
            ? ctx.parsed.y.toFixed(2) : 'N/A'}`
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color:         '#64748b',
        font:          { size: 8 },
        maxTicksLimit: 8,
        maxRotation:   0
      },
      grid: { color: GRID_COLOR }
    },
    y: {
      min:   0,
      max:   1,
      ticks: { ...TICK_STYLE, stepSize: .25 },
      grid:  { color: GRID_COLOR }
    }
  }
};

const TIME_CHART_OPTIONS = {
  animation:  false,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => `Detections: ${ctx.parsed.y}`
      }
    }
  },
  scales: {
    x: {
      ticks: {
        color:         '#64748b',
        font:          { size: 8 },
        maxTicksLimit: 8,
        maxRotation:   0
      },
      grid: { color: GRID_COLOR }
    },
    y: {
      min:   0,
      ticks: { ...TICK_STYLE },
      grid:  { color: GRID_COLOR }
    }
  }
};

const SELECT_STYLE = {
  background:   '#1a2340',
  border:       '1px solid #253550',
  color:        '#94a3b8',
  fontSize:     10,
  padding:      '3px 6px',
  borderRadius: 4,
  cursor:       'pointer',
  outline:      'none'
};

export default function ChartsRow() {
  const { isMobile } = useResponsive();
  const [confidence, setConfidence] = useState({});
  const [timeline,   setTimeline]   = useState({ labels: [], counts: [] });
  const [confHours,  setConfHours]  = useState(1);
  const [timeHours,  setTimeHours]  = useState(1);
  const [confClass,  setConfClass]  = useState('all');
  const [visibility, setVisibility] = useState({});
  const intervalRef = useRef(null);

  // ── Load class visibility once ───────────────────────────────
  useEffect(() => {
    const loadVis = async () => {
      try {
        const res = await getClassVisibility();
        setVisibility(res.data.visibility || {});
      } catch (e) {}
    };
    loadVis();
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [confRes, timeRes] = await Promise.all([
        getGraphConfidence(confHours),
        getGraphTimeline(timeHours)
      ]);
      setConfidence(confRes.data.classes || {});
      setTimeline({
        labels: timeRes.data.labels || [],
        counts: timeRes.data.counts || []
      });
    } catch (err) {
      console.warn('[ChartsRow] Load failed:', err);
    }
  }, [confHours, timeHours]);

  // Reload when hours change, then auto-refresh on an interval.
  // Combined into one effect so there's a single fetch cycle instead
  // of two effects independently calling loadData on the same deps.
  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(loadData, REFRESH_MS);
    return () => clearInterval(intervalRef.current);
  }, [loadData]);

  // ── Filter CLASS_COLORS by visibility ────────────────────────
  const visibleColors = useMemo(() => Object.fromEntries(
    Object.entries(CLASS_COLORS).filter(
      ([cls]) => visibility[cls] !== false
    )
  ), [visibility]);

  // ── Confidence chart data ────────────────────────────────────
  const confLabels = useMemo(
    () => confidence[Object.keys(confidence)[0]]?.map(p => p.time_label) || [],
    [confidence]
  );

  const confDatasets = useMemo(() => Object.keys(visibleColors)
    .filter(cls => confClass === 'all' || cls === confClass)
    .map(cls => {
      const points = confidence[cls] || [];
      const color  = visibleColors[cls];
      const data   = points.map(p => p.confidence);

      return {
        label:                cls,
        data,
        borderColor:          color,
        backgroundColor:      color + '22',
        borderWidth:          1.5,
        pointRadius:          confLabels.length < 30 ? 2 : 0,
        pointBackgroundColor: color,
        fill:                 false,
        tension:              0.4,
        spanGaps:             true
      };
    }), [visibleColors, confClass, confidence, confLabels]);

  const confChartData = useMemo(() => ({
    labels:   confLabels,
    datasets: confDatasets
  }), [confLabels, confDatasets]);

  // ── Timeline chart data ──────────────────────────────────────
  const timelineChartData = useMemo(() => ({
    labels:   timeline.labels,
    datasets: [{
      label:                'Detections',
      data:                 timeline.counts,
      borderColor:          '#3b82f6',
      borderWidth:          2,
      fill:                 true,
      backgroundColor:      'rgba(59,130,246,.15)',
      pointRadius:          timeline.labels.length < 20 ? 3 : 0,
      pointBackgroundColor: '#3b82f6',
      tension:              0.4
    }]
  }), [timeline]);

  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap:                 8,
      marginBottom:        10
    }}>

      {/* ── Confidence Score Graph ──────────────────────────── */}
      <div style={{
        background:   '#151d2e',
        border:       '1px solid #1e2d47',
        borderRadius: 8,
        padding:      10
      }}>
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   6,
          flexWrap:       isMobile ? 'wrap' : 'nowrap',
          gap:            6
        }}>
          <span style={{
            fontSize:      11, fontWeight: 700,
            color:         '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '.5px'
          }}>
            Confidence Score Graph
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {/* Class filter — only visible classes */}
            <select
              style={SELECT_STYLE}
              value={confClass}
              onChange={e => setConfClass(e.target.value)}
            >
              <option value="all">All Classes</option>
              {Object.keys(visibleColors).map(cls => (
                <option key={cls} value={cls}>
                  {cls.replace('_', ' ')}
                </option>
              ))}
            </select>

            {/* Time filter */}
            <select
              style={SELECT_STYLE}
              value={confHours}
              onChange={e => setConfHours(Number(e.target.value))}
            >
              {TIME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {confDatasets.length === 0 ? (
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
            No detections in selected time range
          </div>
        ) : (
          <div style={{ height: isMobile ? 180 : 200 }}>
            <Line data={confChartData} options={CONF_CHART_OPTIONS} />
          </div>
        )}
      </div>

      {/* ── Detections Over Time ────────────────────────────── */}
      <div style={{
        background:   '#151d2e',
        border:       '1px solid #1e2d47',
        borderRadius: 8,
        padding:      10
      }}>
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   6
        }}>
          <span style={{
            fontSize:      11, fontWeight: 700,
            color:         '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '.5px'
          }}>
            Detections Over Time
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <select
              style={SELECT_STYLE}
              value={timeHours}
              onChange={e => setTimeHours(Number(e.target.value))}
            >
              {TIME_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ height: isMobile ? 180 : 200 }}>
          <Line data={timelineChartData} options={TIME_CHART_OPTIONS} />
        </div>
      </div>

    </div>
  );
}