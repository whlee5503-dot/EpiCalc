import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Scatter, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcLinearRegression } from './biostat';

interface Props { lang: Lang }

const EXAMPLE_X = '1, 2, 3, 4, 5, 6, 7, 8, 9, 10';
const EXAMPLE_Y = '2.1, 3.9, 6.2, 7.8, 10.1, 11.9, 14.2, 15.8, 18.1, 19.9';

function parseValues(raw: string): number[] {
  return raw.split(',').map(s => parseFloat(s.trim())).filter(Number.isFinite);
}

function fmtP(p: number): string {
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

function fmtN(v: number, d = 4): string {
  return v.toFixed(d);
}

interface StatCardProps { label: string; value: React.ReactNode; sub?: string; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

const LinearRegression: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;
  const [rawX, setRawX] = useState(EXAMPLE_X);
  const [rawY, setRawY] = useState(EXAMPLE_Y);
  const [showFormula, setShowFormula] = useState(false);

  const xVals = useMemo(() => parseValues(rawX), [rawX]);
  const yVals = useMemo(() => parseValues(rawY), [rawY]);
  const result = useMemo(() => calcLinearRegression(xVals, yVals), [xVals, yVals]);

  const nMismatch = xVals.length > 0 && yVals.length > 0 && xVals.length !== yVals.length;

  const fitLabel = result.rSquared > 0.7
    ? ts.lrStrongFit
    : result.rSquared >= 0.4
    ? ts.lrModerateFit
    : ts.lrWeakFit;

  const eqLabel = useMemo(() => {
    if (!result.valid) return '';
    const b0 = fmtN(result.intercept, 3);
    const sign = result.slope >= 0 ? '+' : '−';
    const absB1 = fmtN(Math.abs(result.slope), 3);
    return `Ŷ = ${b0} ${sign} ${absB1}X`;
  }, [result]);

  // Scatter + regression line data
  const { scatterData, regressionData } = useMemo(() => {
    if (!result.valid) return { scatterData: [], regressionData: [] };
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    return {
      scatterData: xVals.map((x, i) => ({ x, y: yVals[i] })),
      regressionData: [
        { x: minX, regY: result.intercept + result.slope * minX },
        { x: maxX, regY: result.intercept + result.slope * maxX },
      ],
    };
  }, [result, xVals, yVals]);

  // Residual plot data
  const residualData = useMemo(() => {
    if (!result.valid) return [];
    return result.fitted.map((f, i) => ({
      fitted: parseFloat(f.toFixed(4)),
      resid: parseFloat(result.residuals[i].toFixed(4)),
    }));
  }, [result]);

  const xDomain = useMemo(() => {
    if (!result.valid) return ['auto', 'auto'] as const;
    const pad = (Math.max(...xVals) - Math.min(...xVals)) * 0.1 || 1;
    return [Math.min(...xVals) - pad, Math.max(...xVals) + pad] as const;
  }, [result.valid, xVals]);

  const yDomain = useMemo(() => {
    if (!result.valid) return ['auto', 'auto'] as const;
    const pad = (Math.max(...yVals) - Math.min(...yVals)) * 0.1 || 1;
    return [Math.min(...yVals) - pad, Math.max(...yVals) + pad] as const;
  }, [result.valid, yVals]);

  const tooltipStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '0.78rem',
    color: 'var(--text-primary)',
  };

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        <div className="bs-group-card">
          <div className="bs-group-title" style={{ color: 'var(--color-info)' }}>{ts.lrIndepVar}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.lrIndepVar}</label>
            <textarea
              className="bs-textarea"
              value={rawX}
              onChange={e => setRawX(e.target.value)}
              placeholder="e.g. 1, 2, 3, 4, 5"
              spellCheck={false}
              rows={3}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
              {xVals.length > 0 ? `n = ${xVals.length}` : ''}
            </div>
          </div>
        </div>

        <div className="bs-group-card">
          <div className="bs-group-title">{ts.lrDepVar}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.lrDepVar}</label>
            <textarea
              className="bs-textarea"
              value={rawY}
              onChange={e => setRawY(e.target.value)}
              placeholder="e.g. 2.1, 3.9, 6.2, 7.8"
              spellCheck={false}
              rows={3}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
              {yVals.length > 0 ? `n = ${yVals.length}` : ''}
            </div>
          </div>
        </div>

        {nMismatch && (
          <div className="bs-warning">
            <span className="bs-warning-icon">⚠</span>
            <span>{ts.lrNMismatch}</span>
          </div>
        )}

        <div className="formula-box">
          <button className="ds-formula-toggle" onClick={() => setShowFormula(s => !s)}>
            <span className="formula-box-title" style={{ margin: 0 }}>{tc.formula}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {showFormula ? tc.showLess : tc.showMore}
            </span>
          </button>
          {showFormula && (
            <div className="formula-list" style={{ marginTop: 'var(--space-3)' }}>
              <div className="formula-row">
                <span className="formula-name">β₁</span>
                <span className="formula-expr">= Σ(xᵢ−x̄)(yᵢ−ȳ) / Σ(xᵢ−x̄)²</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">β₀</span>
                <span className="formula-expr">= ȳ − β₁x̄</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">R²</span>
                <span className="formula-expr">= 1 − SS<sub>res</sub> / SS<sub>tot</sub></span>
              </div>
              <div className="formula-row">
                <span className="formula-name">Adj R²</span>
                <span className="formula-expr">= 1 − (1−R²)(n−1)/(n−2)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">SE</span>
                <span className="formula-expr">= √(SS<sub>res</sub> / (n−2))</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">t<sub>β₁</sub></span>
                <span className="formula-expr">= β₁ / SE<sub>β₁</sub>,  df = n−2</span>
              </div>
            </div>
          )}
        </div>

        <div className="calc-actions">
          <button
            className="btn btn-secondary"
            onClick={() => { setRawX(EXAMPLE_X); setRawY(EXAMPLE_Y); }}
          >
            {ts.loadExample}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setRawX(''); setRawY(''); }}
          >
            {ts.reset}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result.valid ? (
          <>
            <div className={`bs-badge ${result.pSlope < 0.05 ? 'bs-badge--sig' : 'bs-badge--ns'}`}>
              {result.pSlope < 0.05 ? ts.lrSigLinear : ts.lrNotSigLinear}
            </div>

            {/* Equation banner */}
            <div className="bs-ci-card" style={{ justifyContent: 'center' }}>
              <span className="bs-ci-label">{ts.lrEquation}</span>
              <span className="bs-ci-value" style={{ fontSize: '1.15rem' }}>{eqLabel}</span>
            </div>

            <div className="bs-stats-grid">
              <StatCard
                label={ts.lrSlope}
                value={fmtN(result.slope)}
                sub={`p = ${fmtP(result.pSlope)}`}
                accent={result.pSlope < 0.05 ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.lrIntercept}
                value={fmtN(result.intercept)}
                sub={`p = ${fmtP(result.pIntercept)}`}
                accent="var(--color-info)"
              />
              <StatCard
                label="R²"
                value={result.rSquared.toFixed(4)}
                sub={`${ts.lrAdjRSquared}: ${result.adjRSquared.toFixed(4)}`}
                accent="var(--color-accent)"
              />
              <StatCard
                label={ts.lrFStat}
                value={result.fStat.toFixed(3)}
                sub={`p = ${fmtP(result.pF)}`}
                accent={result.pF < 0.05 ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.lrSE}
                value={fmtN(result.se)}
                sub={`n = ${result.n}`}
                accent="var(--color-info)"
              />
            </div>

            {/* Slope CI */}
            <div className="bs-ci-card">
              <span className="bs-ci-label">{ts.ci95} ({ts.lrSlope})</span>
              <span className="bs-ci-value">
                [{fmtN(result.ciSlopeLow)},&nbsp;{fmtN(result.ciSlopeHigh)}]
              </span>
              <span className="bs-ci-hint">
                {result.ciSlopeLow > 0 || result.ciSlopeHigh < 0 ? ts.ciExcludes0 : ts.ciIncludes0}
              </span>
            </div>

            {/* Interpretation */}
            <div className="bs-interp-card" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="bs-interp-title">{ts.lrInterpTitle}</div>
              <div className="bs-interp-body">
                <strong>{fitLabel}</strong>
                {' '}(R² = {result.rSquared.toFixed(3)})
              </div>
              <div className="bs-interp-note" style={{ marginTop: 'var(--space-2)', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2)' }}>
                {ts.lrNote}
              </div>
            </div>

            {/* Scatter + regression line */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.lrScatterTitle}</h2>
                <span className="bs-chart-sub">{eqLabel}</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart margin={{ top: 12, right: 24, bottom: 32, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={xDomain}
                    name={ts.lrIndepVar}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: ts.lrIndepVar, position: 'insideBottom', offset: -18, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={yDomain}
                    name={ts.lrDepVar}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    width={48}
                    label={{ value: ts.lrDepVar, angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : value,
                      name === 'y' ? ts.lrDepVar : ts.lrIndepVar,
                    ]}
                  />
                  <Scatter
                    name="data"
                    data={scatterData}
                    fill="var(--color-primary)"
                    fillOpacity={0.75}
                    isAnimationActive={false}
                  />
                  <Line
                    data={regressionData}
                    type="linear"
                    dataKey="regY"
                    stroke="var(--color-danger)"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Residual plot */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.lrFittedVsResid}</h2>
                <span className="bs-chart-sub">n = {result.n}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart
                  data={residualData}
                  margin={{ top: 12, right: 24, bottom: 32, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    type="number"
                    dataKey="fitted"
                    name={ts.lrFittedLabel}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: ts.lrFittedLabel, position: 'insideBottom', offset: -18, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="resid"
                    name={ts.lrResidualLabel}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    width={48}
                    label={{ value: ts.lrResidualLabel, angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(4) : value,
                      name === 'resid' ? ts.lrResidualLabel : ts.lrFittedLabel,
                    ]}
                  />
                  <ReferenceLine y={0} stroke="var(--color-danger)" strokeWidth={1.5} strokeDasharray="5 3" />
                  <Scatter
                    name="residuals"
                    data={residualData}
                    fill="var(--color-info)"
                    fillOpacity={0.75}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">β</div>
            <div className="bs-empty-text">
              {nMismatch ? ts.lrNMismatch : ts.invalidInput}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LinearRegression;
