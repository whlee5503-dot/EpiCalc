import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Scatter, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcCorrelation } from './biostat';

interface Props { lang: Lang }

const EXAMPLE_X = '160, 165, 170, 175, 180, 155, 168, 172, 163, 178';
const EXAMPLE_Y = '55, 60, 68, 72, 80, 50, 65, 70, 58, 75';

function parseValues(raw: string): number[] {
  return raw.split(',').map(s => parseFloat(s.trim())).filter(Number.isFinite);
}

function fmtP(p: number): string {
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

function fmtR(r: number): string {
  return r.toFixed(4);
}

interface StatCardProps { label: string; value: React.ReactNode; sub?: string; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

const Correlation: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;
  const [rawX, setRawX] = useState(EXAMPLE_X);
  const [rawY, setRawY] = useState(EXAMPLE_Y);
  const [showFormula, setShowFormula] = useState(false);

  const xVals = useMemo(() => parseValues(rawX), [rawX]);
  const yVals = useMemo(() => parseValues(rawY), [rawY]);
  const result = useMemo(() => calcCorrelation(xVals, yVals), [xVals, yVals]);

  const nMismatch = xVals.length > 0 && yVals.length > 0 && xVals.length !== yVals.length;

  const absR = Math.abs(result.pearsonR);
  const strength = absR > 0.7
    ? ts.corrStrong
    : absR >= 0.4
    ? ts.corrModerate
    : absR >= 0.2
    ? ts.corrWeak
    : ts.corrVeryWeak;
  const direction = result.pearsonR >= 0 ? ts.corrPositive : ts.corrNegative;

  // Scatter data + regression line
  const { scatterData, regressionData } = useMemo(() => {
    if (!result.valid) return { scatterData: [], regressionData: [] };
    const n = xVals.length;
    const meanX = xVals.reduce((s, v) => s + v, 0) / n;
    const meanY = yVals.reduce((s, v) => s + v, 0) / n;
    let sX2 = 0, sXY = 0;
    for (let i = 0; i < n; i++) {
      sX2 += (xVals[i] - meanX) ** 2;
      sXY += (xVals[i] - meanX) * (yVals[i] - meanY);
    }
    const b = sX2 === 0 ? 0 : sXY / sX2;
    const a = meanY - b * meanX;
    const minX = Math.min(...xVals);
    const maxX = Math.max(...xVals);
    return {
      scatterData: xVals.map((x, i) => ({ x, y: yVals[i] })),
      regressionData: [
        { x: minX, regY: a + b * minX },
        { x: maxX, regY: a + b * maxX },
      ],
    };
  }, [result.valid, xVals, yVals]);

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

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        <div className="bs-group-card">
          <div className="bs-group-title" style={{ color: 'var(--color-info)' }}>{ts.corrVarX}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.corrVarX}</label>
            <textarea
              className="bs-textarea"
              value={rawX}
              onChange={e => setRawX(e.target.value)}
              placeholder="e.g. 160, 165, 170"
              spellCheck={false}
              rows={3}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
              {xVals.length > 0 ? `n = ${xVals.length}` : ''}
            </div>
          </div>
        </div>

        <div className="bs-group-card">
          <div className="bs-group-title">{ts.corrVarY}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.corrVarY}</label>
            <textarea
              className="bs-textarea"
              value={rawY}
              onChange={e => setRawY(e.target.value)}
              placeholder="e.g. 55, 60, 68"
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
            <span>{ts.corrNMismatch}</span>
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
                <span className="formula-name">r</span>
                <span className="formula-expr">= Σ(xᵢ−x̄)(yᵢ−ȳ) / √[Σ(xᵢ−x̄)² · Σ(yᵢ−ȳ)²]</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">ρ</span>
                <span className="formula-expr">= 1 − 6Σd²ᵢ / n(n²−1)  <em style={{ fontSize: '0.7rem', opacity: 0.7 }}>(ties: rank mean)</em></span>
              </div>
              <div className="formula-row">
                <span className="formula-name">t</span>
                <span className="formula-expr">= r√(n−2) / √(1−r²),  df = n−2</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">95% CI</span>
                <span className="formula-expr">= tanh(atanh(r) ± 1.96/√(n−3))</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">R²</span>
                <span className="formula-expr">= r²</span>
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
            <div className={`bs-badge ${result.pValue < 0.05 ? 'bs-badge--sig' : 'bs-badge--ns'}`}>
              {result.pValue < 0.05 ? ts.significant : ts.notSignificant}
            </div>

            <div className="bs-stats-grid">
              <StatCard
                label={ts.corrPearsonR}
                value={fmtR(result.pearsonR)}
                sub={`p = ${fmtP(result.pValue)}`}
                accent={result.pValue < 0.05 ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.corrSpearmanRho}
                value={fmtR(result.spearmanRho)}
                sub={`n = ${result.n}`}
                accent="var(--color-info)"
              />
              <StatCard
                label={ts.corrRSquared}
                value={(result.rSquared * 100).toFixed(1) + '%'}
                sub={`R² = ${result.rSquared.toFixed(4)}`}
                accent="var(--color-accent)"
              />
              <StatCard
                label={ts.corrTStat}
                value={result.tStat.toFixed(3)}
                sub={`df = ${result.n - 2}`}
                accent={result.pValue < 0.05 ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
            </div>

            <div className="bs-ci-card">
              <span className="bs-ci-label">{ts.corrCI}</span>
              <span className="bs-ci-value">
                [{fmtR(result.ciLow)},&nbsp;{fmtR(result.ciHigh)}]
              </span>
              <span className="bs-ci-hint">
                {result.ciLow > 0 || result.ciHigh < 0 ? ts.ciExcludes0 : ts.ciIncludes0}
              </span>
            </div>

            {/* Interpretation */}
            <div className="bs-interp-card" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="bs-interp-title">{ts.corrInterpTitle}</div>
              <div className="bs-interp-body">
                <strong>{direction} {strength}</strong>
                {' '}(|r| = {absR.toFixed(3)})
              </div>
              <div className="bs-interp-note" style={{ marginTop: 'var(--space-2)', fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-2)' }}>
                {ts.corrNote}
              </div>
            </div>

            {/* Scatter plot */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.corrScatterTitle}</h2>
                <span className="bs-chart-sub">r = {fmtR(result.pearsonR)}, p = {fmtP(result.pValue)}</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart margin={{ top: 12, right: 24, bottom: 32, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={xDomain}
                    name={ts.corrVarX}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: ts.corrVarX, position: 'insideBottom', offset: -18, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={yDomain}
                    name={ts.corrVarY}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    width={44}
                    label={{ value: ts.corrVarY, angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                    }}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(2) : value,
                      name === 'y' ? ts.corrVarY : ts.corrVarX,
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
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">r</div>
            <div className="bs-empty-text">
              {nMismatch ? ts.corrNMismatch : ts.invalidInput}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Correlation;
