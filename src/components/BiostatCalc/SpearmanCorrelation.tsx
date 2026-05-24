import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Scatter, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcSpearman } from './biostat';

interface Props { lang: Lang }

// ── Example data (15 rows, moderate positive correlation) ─────────────────────
const EXAMPLE_RAW = `2, 3
4, 5
3, 4
6, 7
5, 6
8, 9
7, 7
9, 10
1, 2
10, 8
4, 6
6, 5
8, 10
3, 3
7, 9`;

function parseXY(raw: string): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  raw.split('\n').forEach(line => {
    const parts = line.trim().split(/[,\t\s]+/).map(s => parseFloat(s.trim()));
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      x.push(parts[0]);
      y.push(parts[1]);
    }
  });
  return { x, y };
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

// ── Component ─────────────────────────────────────────────────────────────────
const SpearmanCorrelation: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;

  const [raw, setRaw] = useState(EXAMPLE_RAW);
  const [varNameX, setVarNameX] = useState('Variable X');
  const [varNameY, setVarNameY] = useState('Variable Y');
  const [showFormula, setShowFormula] = useState(false);
  const [showInterp, setShowInterp] = useState(true);
  const [showRankTable, setShowRankTable] = useState(false);

  const { x, y } = useMemo(() => parseXY(raw), [raw]);
  const result = useMemo(() => calcSpearman(x, y), [x, y]);

  // Strength label
  const absRs = Math.abs(result.rs);
  const strength = absRs >= 0.8
    ? ts.spVeryStrong
    : absRs >= 0.6
    ? ts.spStrong
    : absRs >= 0.4
    ? ts.spModerate
    : absRs >= 0.2
    ? ts.spWeak
    : ts.spNegligible;
  const direction = result.rs >= 0 ? ts.corrPositive : ts.corrNegative;

  // Scatter data
  const scatterData = useMemo(() => {
    if (!result.valid) return [];
    return x.map((xi, i) => ({ x: xi, y: y[i] }));
  }, [result.valid, x, y]);

  // Regression line (Pearson on original x, y — for visual reference)
  const regressionData = useMemo(() => {
    if (!result.valid || x.length < 2) return [];
    const n = x.length;
    const mx = x.reduce((s, v) => s + v, 0) / n;
    const my = y.reduce((s, v) => s + v, 0) / n;
    let sxy = 0, sx2 = 0;
    for (let i = 0; i < n; i++) {
      sxy += (x[i] - mx) * (y[i] - my);
      sx2 += (x[i] - mx) ** 2;
    }
    if (sx2 === 0) return [];
    const b = sxy / sx2;
    const a = my - b * mx;
    const xMin = Math.min(...x);
    const xMax = Math.max(...x);
    return [
      { x: xMin, regY: a + b * xMin },
      { x: xMax, regY: a + b * xMax },
    ];
  }, [result.valid, x, y]);

  const xDomain = useMemo(() => {
    if (!result.valid) return ['auto', 'auto'] as const;
    const pad = (Math.max(...x) - Math.min(...x)) * 0.1 || 1;
    return [Math.min(...x) - pad, Math.max(...x) + pad] as const;
  }, [result.valid, x]);

  const yDomain = useMemo(() => {
    if (!result.valid) return ['auto', 'auto'] as const;
    const pad = (Math.max(...y) - Math.min(...y)) * 0.1 || 1;
    return [Math.min(...y) - pad, Math.max(...y) + pad] as const;
  }, [result.valid, y]);

  // Interpretation
  const interpText = useMemo(() => {
    if (!result.valid) return '';
    const rs = fmtN(result.rs, 4);
    const p = fmtP(result.pValue);
    const sig = result.pValue < 0.05;
    const xn = varNameX || 'Variable X';
    const yn = varNameY || 'Variable Y';
    if (lang === 'ko') {
      return `스피어만 상관계수 rₛ = ${rs}는 ${xn}와 ${yn} 간 ${direction} ${strength}를 나타냅니다 (p = ${p}). ` +
        (sig ? '이는 통계적으로 유의합니다.' : '이는 통계적으로 유의하지 않습니다.');
    }
    return `Spearman's rₛ = ${rs} indicates a ${direction.toLowerCase()} ${strength.toLowerCase()} between ${xn} and ${yn} (p = ${p}). ` +
      (sig ? 'This is statistically significant.' : 'This is not statistically significant.');
  }, [result, lang, direction, strength, varNameX, varNameY]);

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

        {/* Variable name inputs */}
        <div className="bs-group-card">
          <div className="bs-group-title" style={{ color: 'var(--color-info)' }}>{ts.spVarNames}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.spVarX}</label>
            <input
              className="bs-number-input"
              style={{ fontFamily: 'var(--font-sans)', letterSpacing: 0 }}
              value={varNameX}
              onChange={e => setVarNameX(e.target.value)}
              placeholder="Variable X"
            />
          </div>
          <div className="bs-input-group" style={{ marginTop: 'var(--space-2)' }}>
            <label className="bs-label">{ts.spVarY}</label>
            <input
              className="bs-number-input"
              style={{ fontFamily: 'var(--font-sans)', letterSpacing: 0 }}
              value={varNameY}
              onChange={e => setVarNameY(e.target.value)}
              placeholder="Variable Y"
            />
          </div>
        </div>

        {/* Data textarea */}
        <div className="bs-group-card">
          <div className="bs-group-title">{ts.spDataLabel}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.spDataHint}</label>
            <textarea
              className="bs-textarea"
              value={raw}
              onChange={e => setRaw(e.target.value)}
              placeholder={'x, y\n2, 3\n4, 5\n...'}
              spellCheck={false}
              rows={10}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
              {x.length > 0 ? `n = ${x.length}` : ''}
            </div>
          </div>
        </div>

        {/* Formula */}
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
                <span className="formula-name">rₛ</span>
                <span className="formula-expr">= Pearson(rank<sub>X</sub>, rank<sub>Y</sub>)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name"></span>
                <span className="formula-expr">= Σ(rX<sub>i</sub>−r̄X)(rY<sub>i</sub>−r̄Y) / √[Σ(rX<sub>i</sub>−r̄X)² · Σ(rY<sub>i</sub>−r̄Y)²]</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">t</span>
                <span className="formula-expr">= rₛ × √((n−2) / (1−rₛ²)),  df = n−2</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">95% CI</span>
                <span className="formula-expr">= tanh(atanh(rₛ) ± 1.96/√(n−3))</span>
              </div>
            </div>
          )}
        </div>

        <div className="bs-note">
          <span>ℹ</span>
          <span>{ts.spNote}</span>
        </div>

        {/* Actions */}
        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setRaw(EXAMPLE_RAW)}>{ts.loadExample}</button>
          <button className="btn btn-ghost" onClick={() => setRaw('')}>{ts.reset}</button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result.valid ? (
          <>
            <div className={`bs-badge ${result.pValue < 0.05 ? 'bs-badge--sig' : 'bs-badge--ns'}`}>
              {result.pValue < 0.05 ? ts.significant : ts.notSignificant}
            </div>

            {/* Stats grid */}
            <div className="bs-stats-grid">
              <StatCard
                label={ts.spRsStat}
                value={fmtN(result.rs)}
                sub={`${direction} ${strength}`}
                accent={result.pValue < 0.05 ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.pValue}
                value={fmtP(result.pValue)}
                sub={`n = ${result.n}`}
                accent={result.pValue < 0.05 ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.tStat}
                value={fmtN(result.t, 3)}
                sub={`df = ${result.df}`}
              />
              <StatCard
                label={ts.spCI95}
                value={`[${fmtN(result.ciLow, 3)}, ${fmtN(result.ciHigh, 3)}]`}
                sub={result.ciLow > 0 || result.ciHigh < 0 ? ts.ciExcludes0 : ts.ciIncludes0}
                accent={result.pValue < 0.05 ? 'var(--color-accent)' : undefined}
              />
            </div>

            {/* Strength badge */}
            <div className="bs-ci-card">
              <span className="bs-ci-label">{ts.spStrengthLabel}</span>
              <span className="bs-ci-value" style={{ color: 'var(--color-primary)' }}>
                {direction} {strength}
              </span>
              <span className="bs-ci-hint">
                |rₛ| = {absRs.toFixed(4)}
              </span>
            </div>

            {/* Scatter plot */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.spScatterTitle}</h2>
                <span className="bs-chart-sub">
                  rₛ = {fmtN(result.rs)},  p = {fmtP(result.pValue)}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart margin={{ top: 12, right: 24, bottom: 32, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={xDomain}
                    name={varNameX || 'X'}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: varNameX || 'X', position: 'insideBottom', offset: -18, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={yDomain}
                    name={varNameY || 'Y'}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    width={44}
                    label={{ value: varNameY || 'Y', angle: -90, position: 'insideLeft', offset: 10, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(2) : value,
                      name === 'y' ? (varNameY || 'Y') : (varNameX || 'X'),
                    ]}
                  />
                  <Scatter
                    name="data"
                    data={scatterData}
                    fill="var(--color-primary)"
                    fillOpacity={0.75}
                    r={5}
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
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
                {lang === 'ko' ? '— OLS 추세선 (시각적 참고용)' : '— OLS trend line (visual reference)'}
              </div>
            </div>

            {/* Rank comparison table */}
            <div className="bs-chart-card" style={{ padding: 'var(--space-3) var(--space-5)' }}>
              <button className="ds-formula-toggle" onClick={() => setShowRankTable(s => !s)}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {ts.spRankTableTitle}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {showRankTable ? tc.showLess : tc.showMore}
                </span>
              </button>
              {showRankTable && (
                <div style={{ overflowX: 'auto', marginTop: 'var(--space-3)' }}>
                  <table className="anova-table">
                    <thead>
                      <tr>
                        <th>i</th>
                        <th>{varNameX || 'X'}</th>
                        <th>{varNameY || 'Y'}</th>
                        <th>rank<sub>X</sub></th>
                        <th>rank<sub>Y</sub></th>
                        <th>d</th>
                        <th>d²</th>
                      </tr>
                    </thead>
                    <tbody>
                      {x.map((xi, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{xi}</td>
                          <td>{y[i]}</td>
                          <td style={{ color: 'var(--color-primary)' }}>{fmtN(result.rankX[i], 1)}</td>
                          <td style={{ color: 'var(--color-info)' }}>{fmtN(result.rankY[i], 1)}</td>
                          <td>{fmtN(result.d[i], 1)}</td>
                          <td style={{ color: result.d2[i] > 0 ? 'var(--color-accent)' : 'var(--text-muted)' }}>
                            {fmtN(result.d2[i], 2)}
                          </td>
                        </tr>
                      ))}
                      <tr style={{ fontWeight: 700, borderTop: '2px solid var(--border-color)' }}>
                        <td colSpan={6} style={{ textAlign: 'right' }}>Σd²</td>
                        <td style={{ color: 'var(--color-accent)' }}>
                          {fmtN(result.d2.reduce((s, v) => s + v, 0), 2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Interpretation */}
            <div className="bs-interp-card">
              <button className="ds-formula-toggle" onClick={() => setShowInterp(s => !s)}>
                <span className="bs-interp-title" style={{ margin: 0 }}>{ts.spInterpTitle}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {showInterp ? tc.showLess : tc.showMore}
                </span>
              </button>
              {showInterp && (
                <div className="bs-interp-body" style={{ marginTop: 'var(--space-3)' }}>
                  {interpText}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">rₛ</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpearmanCorrelation;
