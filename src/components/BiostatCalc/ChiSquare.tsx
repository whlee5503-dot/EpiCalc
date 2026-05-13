import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcChiSquare, calcChiSquareCurve } from './biostat';

interface Props { lang: Lang }

const MAX_SIZE = 3;
const MIN_SIZE = 2;

const DEFAULT_OBSERVED = [[10, 20], [30, 40]];
const DEFAULT_ROW_LABELS = ['Row 1', 'Row 2'];
const DEFAULT_COL_LABELS = ['Col A', 'Col B'];

// Example: treatment vs outcome (chi2 ≈ 4.51, df=1, p ≈ 0.034)
const EXAMPLE_OBSERVED = [[40, 60], [55, 45]];
const EXAMPLE_ROW_LABELS = ['Control', 'Treatment'];
const EXAMPLE_COL_LABELS = ['Success', 'Failure'];

function fmtP(p: number): string {
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

interface StatCardProps { label: string; value: React.ReactNode; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
  </div>
);

interface TooltipPayload { dataKey: string; value: number }
interface CustomTooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: number }
const ChiTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const entry = payload.find((p) => p.dataKey === 'pdf');
  if (!entry) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: '6px',
      padding: '6px 10px',
      fontSize: '0.78rem',
      color: 'var(--text-primary)',
    }}>
      <div>χ² = {Number(label).toFixed(3)}</div>
      <div style={{ color: 'var(--text-muted)' }}>PDF = {entry.value.toFixed(4)}</div>
    </div>
  );
};

const ChiSquare: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;

  const [observed, setObserved] = useState<number[][]>(DEFAULT_OBSERVED);
  const [rowLabels, setRowLabels] = useState<string[]>(DEFAULT_ROW_LABELS);
  const [colLabels, setColLabels] = useState<string[]>(DEFAULT_COL_LABELS);
  const [showExpected, setShowExpected] = useState(false);

  const nrows = observed.length;
  const ncols = observed[0].length;

  const result = useMemo(() => calcChiSquare(observed), [observed]);
  const curve = useMemo(
    () => result.valid ? calcChiSquareCurve(result.chi2, result.df) : null,
    [result],
  );

  // Marginal totals (derived, not state)
  const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals = observed[0].map((_, j) => observed.reduce((s, r) => s + r[j], 0));
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  const updateCell = (i: number, j: number, raw: string) => {
    const v = Math.max(0, Math.floor(parseFloat(raw) || 0));
    setObserved(prev => {
      const next = prev.map(r => [...r]);
      next[i][j] = v;
      return next;
    });
  };

  const addRow = () => {
    if (nrows >= MAX_SIZE) return;
    setObserved(prev => [...prev, new Array(prev[0].length).fill(0)]);
    setRowLabels(prev => [...prev, `Row ${prev.length + 1}`]);
  };

  const removeRow = () => {
    if (nrows <= MIN_SIZE) return;
    setObserved(prev => prev.slice(0, -1));
    setRowLabels(prev => prev.slice(0, -1));
  };

  const addCol = () => {
    if (ncols >= MAX_SIZE) return;
    setObserved(prev => prev.map(row => [...row, 0]));
    setColLabels(prev => [...prev, `Col ${String.fromCharCode(65 + prev.length)}`]);
  };

  const removeCol = () => {
    if (ncols <= MIN_SIZE) return;
    setObserved(prev => prev.map(row => row.slice(0, -1)));
    setColLabels(prev => prev.slice(0, -1));
  };

  const loadExample = () => {
    setObserved(EXAMPLE_OBSERVED);
    setRowLabels(EXAMPLE_ROW_LABELS);
    setColLabels(EXAMPLE_COL_LABELS);
    setShowExpected(false);
  };

  const reset = () => {
    setObserved(DEFAULT_OBSERVED);
    setRowLabels(DEFAULT_ROW_LABELS);
    setColLabels(DEFAULT_COL_LABELS);
    setShowExpected(false);
  };

  // CSS grid: row-label col + ncols data cols + total col
  const gridCols = `80px repeat(${ncols}, minmax(0, 1fr)) 44px`;

  return (
    <div className="bs-layout">
      {/* ── Left: Table Input ── */}
      <div className="bs-left">

        {/* Observed / Expected toggle */}
        <div className="bs-chitbl-wrap">
          <div className="bs-tbl-toggle">
            <span className="bs-tbl-toggle-label">{ts.chiObserved}</span>
            <button
              className={`bs-tbl-view-btn${!showExpected ? ' active' : ''}`}
              onClick={() => setShowExpected(false)}
              aria-pressed={!showExpected}
            >
              {ts.chiObserved}
            </button>
            <button
              className={`bs-tbl-view-btn${showExpected ? ' active' : ''}`}
              onClick={() => setShowExpected(true)}
              disabled={!result.valid}
              aria-pressed={showExpected}
            >
              {ts.chiExpected}
            </button>
          </div>

          {/* Contingency table grid */}
          <div className="bs-chitbl" style={{ gridTemplateColumns: gridCols }}>

            {/* Header row: corner + col labels + total header */}
            <div className="bs-chitbl-corner" />
            {colLabels.map((label, j) => (
              <input
                key={j}
                className="bs-chitbl-label-input"
                value={label}
                onChange={(e) => setColLabels(prev => { const n = [...prev]; n[j] = e.target.value; return n; })}
              />
            ))}
            <div className="bs-chitbl-hdr">N</div>

            {/* Data rows */}
            {observed.map((row, i) => (
              <React.Fragment key={i}>
                <input
                  className="bs-chitbl-label-input bs-chitbl-row-lbl"
                  value={rowLabels[i]}
                  onChange={(e) => setRowLabels(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                />
                {row.map((cell, j) =>
                  showExpected && result.valid ? (
                    <div
                      key={j}
                      className={`bs-chitbl-exp${result.expected[i][j] < 5 ? ' bs-chitbl-exp--warn' : ''}`}
                      title={result.expected[i][j] < 5 ? 'E < 5' : undefined}
                    >
                      {result.expected[i][j].toFixed(1)}
                    </div>
                  ) : (
                    <input
                      key={j}
                      type="number"
                      className="bs-chitbl-cell"
                      min={0}
                      step={1}
                      value={cell}
                      onChange={(e) => updateCell(i, j, e.target.value)}
                    />
                  ),
                )}
                <div className="bs-chitbl-total">{rowTotals[i]}</div>
              </React.Fragment>
            ))}

            {/* Totals row */}
            <div className="bs-chitbl-hdr">N</div>
            {colTotals.map((t, j) => (
              <div key={j} className="bs-chitbl-total">{t}</div>
            ))}
            <div className="bs-chitbl-grand">{grandTotal}</div>
          </div>

          {/* Add / Remove controls */}
          <div className="bs-chitbl-controls">
            <button className="bs-tbl-btn" onClick={addRow} disabled={nrows >= MAX_SIZE}>
              {ts.chiAddRow}
            </button>
            <button className="bs-tbl-btn" onClick={addCol} disabled={ncols >= MAX_SIZE}>
              {ts.chiAddCol}
            </button>
            <button className="bs-tbl-btn" onClick={removeRow} disabled={nrows <= MIN_SIZE}>
              {ts.chiRemoveRow}
            </button>
            <button className="bs-tbl-btn" onClick={removeCol} disabled={ncols <= MIN_SIZE}>
              {ts.chiRemoveCol}
            </button>
          </div>
        </div>

        {/* Formula */}
        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">E<sub>ij</sub></span>
              <span className="formula-expr">= (R<sub>i</sub> × C<sub>j</sub>) / N</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">χ²</span>
              <span className="formula-expr">= Σ (O − E)² / E</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">df</span>
              <span className="formula-expr">= (r − 1)(c − 1)</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={loadExample}>{ts.loadExample}</button>
          <button className="btn btn-ghost" onClick={reset}>{ts.reset}</button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result.valid && curve ? (
          <>
            <div className={`bs-badge ${result.significant ? 'bs-badge--sig' : 'bs-badge--ns'}`}>
              {result.significant ? ts.significant : ts.notSignificant}
            </div>

            <div className="bs-stats-grid">
              <StatCard
                label={ts.chi2Stat}
                value={result.chi2.toFixed(3)}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.dfLabel}
                value={result.df}
                accent="var(--color-info)"
              />
              <StatCard
                label={ts.pValue}
                value={fmtP(result.pValue)}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard label="N" value={grandTotal} />
            </div>

            {result.hasSmallExpected && (
              <div className="bs-warning">
                <span className="bs-warning-icon">⚠</span>
                <span>{ts.chiSmallWarning}</span>
              </div>
            )}

            {/* χ² distribution chart */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.chiDistTitle}</h2>
                <span className="bs-chart-sub">df = {result.df}</span>
              </div>
              <div className="bs-legend-row">
                <span className="bs-legend-item">
                  <span className="bs-legend-dot" style={{ background: 'var(--color-danger)', opacity: 0.55 }} />
                  {ts.rejectionRegion} (α = 0.05)
                </span>
                <span className="bs-legend-item">
                  <span className="bs-legend-line" style={{ background: 'var(--color-accent)' }} />
                  {ts.chiObsLine} = {result.chi2.toFixed(3)}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={curve.data} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="x"
                    type="number"
                    domain={[0, curve.xMax]}
                    tickFormatter={(v) => Number(v).toFixed(1)}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: 'χ²', position: 'insideBottomRight', offset: -4, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    tickFormatter={(v) => v.toFixed(3)}
                    width={44}
                  />
                  <Tooltip content={<ChiTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="tail"
                    fill="var(--color-danger)"
                    fillOpacity={0.3}
                    stroke="none"
                    isAnimationActive={false}
                    legendType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="body"
                    fill="var(--color-primary)"
                    fillOpacity={0.12}
                    stroke="none"
                    isAnimationActive={false}
                    legendType="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="pdf"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                  <ReferenceLine
                    x={curve.xcrit}
                    stroke="var(--color-danger)"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                  />
                  <ReferenceLine
                    x={result.chi2}
                    stroke="var(--color-accent)"
                    strokeWidth={2.5}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">χ²</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChiSquare;
