import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcDescriptiveStats, calcHistBins } from './biostat';
import type { DescriptiveStatsResult } from './biostat';

interface Props { lang: Lang }

const EXAMPLE_RAW = '23, 45, 67, 34, 56, 78, 43, 55, 62, 48';

function parseValues(raw: string): number[] {
  return raw.split(',').map(s => parseFloat(s.trim())).filter(Number.isFinite);
}

function fmt(v: number, decimals = 4): string {
  if (!Number.isFinite(v)) return '—';
  return v.toFixed(decimals);
}

interface StatItemProps { label: string; value: string; accent?: string }
const StatItem: React.FC<StatItemProps> = ({ label, value, accent }) => (
  <div className="ds-stat-item">
    <div className="ds-stat-label">{label}</div>
    <div className="ds-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
  </div>
);

const BoxplotChart: React.FC<{ stats: DescriptiveStatsResult }> = ({ stats }) => {
  const { min, max, q1, q3, median } = stats;
  const range = max - min;
  if (range === 0) return null;

  const px = (v: number) => 10 + ((v - min) / range) * 80;
  const midY = 40;
  const boxH = 26;
  const top = midY - boxH / 2;
  const bot = midY + boxH / 2;
  const boxW = Math.max(px(q3) - px(q1), 0.5);

  return (
    <svg
      viewBox="0 0 100 72"
      style={{ width: '100%', height: 130 }}
      aria-label="box plot"
    >
      {/* Spine */}
      <line
        x1={px(min)} y1={midY} x2={px(max)} y2={midY}
        style={{ stroke: 'var(--text-muted)', strokeWidth: 1.5 }}
      />
      {/* Min tick */}
      <line
        x1={px(min)} y1={midY - 9} x2={px(min)} y2={midY + 9}
        style={{ stroke: 'var(--text-muted)', strokeWidth: 1.5 }}
      />
      {/* Max tick */}
      <line
        x1={px(max)} y1={midY - 9} x2={px(max)} y2={midY + 9}
        style={{ stroke: 'var(--text-muted)', strokeWidth: 1.5 }}
      />
      {/* IQR box */}
      <rect
        x={px(q1)} y={top} width={boxW} height={boxH}
        rx={1.5}
        style={{
          fill: 'var(--color-primary)',
          fillOpacity: 0.15,
          stroke: 'var(--color-primary)',
          strokeWidth: 1.5,
        }}
      />
      {/* Median line */}
      <line
        x1={px(median)} y1={top} x2={px(median)} y2={bot}
        style={{ stroke: 'var(--color-primary)', strokeWidth: 2.5 }}
      />

      {/* Value labels */}
      <text x={px(min)} y={bot + 11} textAnchor="middle"
        style={{ fontSize: 6, fill: 'var(--text-muted)', fontFamily: 'monospace' }}>
        {min.toFixed(1)}
      </text>
      <text x={px(q1)} y={top - 4} textAnchor="middle"
        style={{ fontSize: 5.5, fill: 'var(--text-muted)', fontFamily: 'monospace' }}>
        Q1={q1.toFixed(1)}
      </text>
      <text x={px(median)} y={bot + 11} textAnchor="middle"
        style={{ fontSize: 6.5, fill: 'var(--color-primary)', fontFamily: 'monospace', fontWeight: 700 }}>
        {median.toFixed(1)}
      </text>
      <text x={px(q3)} y={top - 4} textAnchor="middle"
        style={{ fontSize: 5.5, fill: 'var(--text-muted)', fontFamily: 'monospace' }}>
        Q3={q3.toFixed(1)}
      </text>
      <text x={px(max)} y={bot + 11} textAnchor="middle"
        style={{ fontSize: 6, fill: 'var(--text-muted)', fontFamily: 'monospace' }}>
        {max.toFixed(1)}
      </text>
    </svg>
  );
};

const DescriptiveStats: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;
  const [raw, setRaw] = useState(EXAMPLE_RAW);
  const [showFormula, setShowFormula] = useState(false);

  const values = useMemo(() => parseValues(raw), [raw]);
  const stats = useMemo(() => calcDescriptiveStats(values), [values]);
  const histData = useMemo(() => (stats.valid ? calcHistBins(values) : []), [values, stats.valid]);

  return (
    <div className="bs-layout">
      {/* ── Left: Input ── */}
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="bs-input-group">
            <label className="bs-label">{ts.dsInputLabel}</label>
            <textarea
              className="bs-textarea"
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder="e.g. 23, 45, 67, 34"
              spellCheck={false}
              rows={4}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
              {values.length > 0 ? `n = ${values.length}` : ''}
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setRaw(EXAMPLE_RAW)}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => setRaw('')}>
            {ts.reset}
          </button>
        </div>

        {/* Collapsible formula */}
        <div className="formula-box">
          <button
            className="ds-formula-toggle"
            onClick={() => setShowFormula(s => !s)}
          >
            <span className="formula-box-title" style={{ margin: 0 }}>{tc.formula}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {showFormula ? tc.showLess : tc.showMore}
            </span>
          </button>
          {showFormula && (
            <div className="formula-list" style={{ marginTop: 'var(--space-3)' }}>
              <div className="formula-row">
                <span className="formula-name">x̄</span>
                <span className="formula-expr">= Σx / n</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">s</span>
                <span className="formula-expr">= √[Σ(x − x̄)² / (n−1)]</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">CV</span>
                <span className="formula-expr">= (s / |x̄|) × 100%</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">g₁</span>
                <span className="formula-expr">= [n/((n−1)(n−2))] · Σ((x−x̄)/s)³</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">g₂</span>
                <span className="formula-expr">= [n(n+1)/((n−1)(n−2)(n−3))] · Σ((x−x̄)/s)⁴ − 3(n−1)²/((n−2)(n−3))</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {stats.valid ? (
          <>
            {/* Central Tendency */}
            <div className="ds-section-card">
              <div className="ds-section-title">{ts.dsCentralTendency}</div>
              <div className="ds-stat-grid">
                <StatItem label={ts.dsMean} value={fmt(stats.mean, 4)} accent="var(--color-primary)" />
                <StatItem label={ts.dsMedian} value={fmt(stats.median, 4)} />
                <StatItem
                  label={ts.dsMode}
                  value={stats.mode.length === 0
                    ? ts.dsNoMode
                    : stats.mode.map(m => m.toFixed(2)).join(', ')}
                />
              </div>
            </div>

            {/* Dispersion */}
            <div className="ds-section-card">
              <div className="ds-section-title">{ts.dsDispersion}</div>
              <div className="ds-stat-grid">
                <StatItem label={ts.dsSD} value={fmt(stats.sd, 4)} accent="var(--color-info)" />
                <StatItem label={ts.dsVariance} value={fmt(stats.variance, 4)} />
                <StatItem label={ts.dsRange} value={fmt(stats.range, 4)} />
                <StatItem label={ts.dsIQR} value={fmt(stats.iqr, 4)} />
                <StatItem
                  label={ts.dsCV}
                  value={Number.isFinite(stats.cv) ? stats.cv.toFixed(2) + '%' : '—'}
                />
              </div>
            </div>

            {/* Distribution */}
            <div className="ds-section-card">
              <div className="ds-section-title">{ts.dsDistribution}</div>
              <div className="ds-stat-grid ds-stat-grid--4col">
                <StatItem label={ts.dsMin} value={fmt(stats.min, 2)} />
                <StatItem label={ts.dsMax} value={fmt(stats.max, 2)} />
                <StatItem label={ts.dsQ1} value={fmt(stats.q1, 4)} />
                <StatItem label={ts.dsQ3} value={fmt(stats.q3, 4)} />
                <StatItem
                  label={ts.dsSkewness}
                  value={fmt(stats.skewness, 4)}
                  accent={Math.abs(stats.skewness) > 1 ? 'var(--color-accent)' : undefined}
                />
                <StatItem label={ts.dsKurtosis} value={fmt(stats.kurtosis, 4)} />
                <StatItem label={ts.dsN} value={String(stats.n)} accent="var(--color-info)" />
              </div>
            </div>

            {/* Histogram */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.dsHistogram}</h2>
                <span className="bs-chart-sub">n = {stats.n}, Sturges bins</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={histData} margin={{ top: 8, right: 16, bottom: 44, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="bin"
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    allowDecimals={false}
                    label={{
                      value: ts.dsFrequency,
                      angle: -90,
                      position: 'insideLeft',
                      fill: 'var(--text-muted)',
                      fontSize: 10,
                      dy: 40,
                    }}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value) => [value, ts.dsFrequency]}
                    labelFormatter={(_label, payload) => {
                      const entry = payload?.[0]?.payload as { range?: string } | undefined;
                      return entry?.range ?? String(_label);
                    }}
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Bar
                    dataKey="count"
                    fill="var(--color-primary)"
                    fillOpacity={0.7}
                    isAnimationActive={false}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Box Plot */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.dsBoxplot}</h2>
                <span className="bs-chart-sub">IQR = {fmt(stats.iqr, 2)}</span>
              </div>
              <BoxplotChart stats={stats} />
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">σ</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DescriptiveStats;
