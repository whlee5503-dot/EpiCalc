import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Line, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcLogisticRegression } from './biostat';

interface Props { lang: Lang }

// ── Example data ──────────────────────────────────────────────────────────────
// Age data with deliberate overlap to avoid perfect separation
const EXAMPLE_DATA = `0,25
0,30
1,45
1,50
0,35
1,55
1,60
0,28
1,48
0,32
1,52
1,65
0,22
1,58
0,38
1,40
0,47
0,42
1,36
0,53`;

const EXAMPLE_OUTCOME_NAME = 'Disease';
const EXAMPLE_X_NAMES = ['Age', '', ''];

// ── Helpers ───────────────────────────────────────────────────────────────────
interface ParsedData { X: number[][]; y: number[]; p: number }

function parseLRData(raw: string): ParsedData | null {
  const X: number[][] = [];
  const y: number[] = [];

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[,\t]+/).map(s => s.trim());
    if (parts.length < 2) continue;
    const outcome = parseFloat(parts[0]);
    if (!Number.isFinite(outcome) || (outcome !== 0 && outcome !== 1)) continue;
    const preds = parts.slice(1).map(parseFloat);
    if (preds.some(v => !Number.isFinite(v))) continue;
    y.push(outcome);
    X.push(preds);
  }

  if (y.length < 6 || X.length === 0) return null;
  const p = X[0].length;
  if (p === 0 || X.some(row => row.length !== p)) return null;
  return { X, y, p };
}

function fmtP(p: number): string {
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

function fmtN(v: number, d = 4): string {
  if (!Number.isFinite(v)) return '—';
  return v.toFixed(d);
}

// ── StatCard ──────────────────────────────────────────────────────────────────
interface StatCardProps { label: string; value: React.ReactNode; sub?: string; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
const LogisticRegression: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;

  const [rawData, setRawData] = useState(EXAMPLE_DATA);
  const [outcomeName, setOutcomeName] = useState(EXAMPLE_OUTCOME_NAME);
  const [xNames, setXNames] = useState<[string, string, string]>(
    [EXAMPLE_X_NAMES[0], EXAMPLE_X_NAMES[1], EXAMPLE_X_NAMES[2]],
  );
  const [showFormula, setShowFormula] = useState(false);
  const [showInterp, setShowInterp] = useState(true);

  const parsed = useMemo(() => parseLRData(rawData), [rawData]);

  const result = useMemo(() => {
    if (!parsed) return null;
    const vn = xNames.slice(0, parsed.p).map((name, i) => name.trim() || `X${i + 1}`);
    return calcLogisticRegression(parsed.X, parsed.y, vn);
  }, [parsed, xNames]);

  // Sigmoid curve data (only when p=1 predictor)
  const sigmoidData = useMemo(() => {
    if (!result?.valid || parsed?.p !== 1) return null;
    const xs = parsed!.X.map(row => row[0]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const range = maxX - minX || 1;
    const b0 = result.coefficients[0].beta;
    const b1 = result.coefficients[1].beta;
    const curve = Array.from({ length: 80 }, (_, i) => {
      const x = minX - range * 0.1 + (i / 79) * range * 1.2;
      const prob = 1 / (1 + Math.exp(-(b0 + b1 * x)));
      return { x: parseFloat(x.toFixed(3)), prob: parseFloat(prob.toFixed(4)) };
    });
    const scatter0 = parsed!.X
      .map((row, i) => ({ x: row[0], actual: parsed!.y[i] }))
      .filter(d => d.actual === 0);
    const scatter1 = parsed!.X
      .map((row, i) => ({ x: row[0], actual: parsed!.y[i] }))
      .filter(d => d.actual === 1);
    return { curve, scatter0, scatter1 };
  }, [result, parsed]);

  // Interpretation text
  const interpText = useMemo(() => {
    if (!result?.valid) return '';
    const sig = result.lrtPValue < 0.05;
    const aucLabel =
      result.auc >= 0.8
        ? ts.lgrGoodDisc
        : result.auc >= 0.7
        ? ts.lgrModDisc
        : ts.lgrPoorDisc;

    // Focus on the first non-intercept predictor
    const pred1 = result.coefficients.find(c => c.name !== 'Intercept' && c.name !== ts.lgrIntercept);
    const predLine = pred1
      ? lang === 'ko'
        ? `${pred1.name} 1단위 증가는 결과 발생 오즈 ${pred1.or >= 1 ? '증가' : '감소'}와 연관됩니다 ` +
          `(OR=${fmtN(pred1.or, 2)}, 95% CI: ${fmtN(pred1.orCiLow, 2)}–${fmtN(pred1.orCiHigh, 2)}, p=${fmtP(pred1.pValue)}).`
        : `A one-unit increase in ${pred1.name} is associated with ${pred1.or >= 1 ? 'higher' : 'lower'} odds ` +
          `(OR=${fmtN(pred1.or, 2)}, 95% CI: ${fmtN(pred1.orCiLow, 2)}–${fmtN(pred1.orCiHigh, 2)}, p=${fmtP(pred1.pValue)}).`
      : '';

    if (lang === 'ko') {
      return `${sig ? ts.lgrSig : ts.lgrNS} (LRT χ²=${fmtN(result.lrtChi2, 2)}, p=${fmtP(result.lrtPValue)}). ` +
        `${predLine} ` +
        `모델은 분산의 약 ${(result.nagelkerkeR2 * 100).toFixed(1)}%를 설명합니다 (Nagelkerke R²=${fmtN(result.nagelkerkeR2, 3)}). ` +
        `AUC=${fmtN(result.auc, 3)} — ${aucLabel}.`;
    }
    return `${sig ? ts.lgrSig : ts.lgrNS} (LRT χ²=${fmtN(result.lrtChi2, 2)}, p=${fmtP(result.lrtPValue)}). ` +
      `${predLine} ` +
      `The model explains approximately ${(result.nagelkerkeR2 * 100).toFixed(1)}% of variance (Nagelkerke R²=${fmtN(result.nagelkerkeR2, 3)}). ` +
      `AUC=${fmtN(result.auc, 3)} — ${aucLabel}.`;
  }, [result, ts, lang]);

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

        {/* Variable names */}
        <div className="bs-group-card">
          <div className="bs-group-title">{lang === 'ko' ? '변수명' : 'Variable Names'}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.lgrOutcomeName}</label>
            <input
              type="text"
              className="bs-number-input"
              value={outcomeName}
              onChange={e => setOutcomeName(e.target.value)}
              placeholder={lang === 'ko' ? '결과 변수명' : 'Outcome name'}
            />
          </div>
          {(['lgrX1Name', 'lgrX2Name', 'lgrX3Name'] as const).map((key, i) => (
            <div className="bs-input-group" key={i}>
              <label className="bs-label">{ts[key]}</label>
              <input
                type="text"
                className="bs-number-input"
                value={xNames[i]}
                onChange={e => {
                  const next: [string, string, string] = [...xNames] as [string, string, string];
                  next[i] = e.target.value;
                  setXNames(next);
                }}
                placeholder={`X${i + 1}`}
              />
            </div>
          ))}
        </div>

        {/* Data input */}
        <div className="bs-group-card">
          <div className="bs-group-title" style={{ color: 'var(--color-primary)' }}>
            {ts.lgrDataLabel}
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.lgrDataHint}</label>
            <textarea
              className="bs-textarea"
              value={rawData}
              onChange={e => setRawData(e.target.value)}
              placeholder={'0,25\n1,45\n0,30\n...'}
              spellCheck={false}
              rows={10}
            />
            {parsed && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
                {`n = ${parsed.y.length}, p = ${parsed.p}, events = ${parsed.y.reduce((s, v) => s + v, 0)}`}
              </div>
            )}
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
                <span className="formula-name">p(x)</span>
                <span className="formula-expr">= 1 / (1 + e<sup>−(β₀+β₁x₁+...)</sup>)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">ℓ(β)</span>
                <span className="formula-expr">= Σ[yᵢ log pᵢ + (1−yᵢ) log(1−pᵢ)]</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">OR<sub>j</sub></span>
                <span className="formula-expr">= exp(β<sub>j</sub>)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">SE(β<sub>j</sub>)</span>
                <span className="formula-expr">= √[(X<sup>T</sup>WX)<sup>−1</sup>]<sub>jj</sub></span>
              </div>
              <div className="formula-row">
                <span className="formula-name">LRT χ²</span>
                <span className="formula-expr">= −2(ℓ<sub>null</sub> − ℓ<sub>model</sub>)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">Nagelkerke R²</span>
                <span className="formula-expr">= (1−e<sup>(D₁−D₀)/n</sup>) / (1−e<sup>−D₀/n</sup>)</span>
              </div>
            </div>
          )}
        </div>

        {/* Note */}
        <div className="bs-note">
          <span>ℹ</span>
          <span>{ts.lgrNote}</span>
        </div>

        {/* Actions */}
        <div className="calc-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setRawData(EXAMPLE_DATA);
              setOutcomeName(EXAMPLE_OUTCOME_NAME);
              setXNames([EXAMPLE_X_NAMES[0], EXAMPLE_X_NAMES[1], EXAMPLE_X_NAMES[2]]);
            }}
          >
            {ts.loadExample}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setRawData(''); }}
          >
            {ts.reset}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result?.valid ? (
          <>
            {/* Convergence warning */}
            {!result.converged && (
              <div className="bs-warning">
                <span className="bs-warning-icon">⚠</span>
                <span>{ts.lgrConvergenceWarn}</span>
              </div>
            )}

            {/* LRT badge */}
            <div className={`bs-badge ${result.lrtPValue < 0.05 ? 'bs-badge--sig' : 'bs-badge--ns'}`}>
              {result.lrtPValue < 0.05 ? ts.lgrSig : ts.lgrNS}
            </div>

            {/* Model fit stats */}
            <div className="bs-stats-grid">
              <StatCard
                label={ts.lgrAUC}
                value={fmtN(result.auc, 3)}
                sub={result.auc >= 0.8 ? ts.lgrGoodDisc : result.auc >= 0.7 ? ts.lgrModDisc : ts.lgrPoorDisc}
                accent={result.auc >= 0.8 ? 'var(--color-primary)' : result.auc >= 0.7 ? 'var(--color-accent)' : 'var(--color-danger)'}
              />
              <StatCard
                label={ts.lgrNagelkerke}
                value={fmtN(result.nagelkerkeR2, 3)}
                sub={`n = ${result.n}`}
                accent="var(--color-info)"
              />
              <StatCard
                label={ts.lgrLRT}
                value={fmtN(result.lrtChi2, 2)}
                sub={`df=${result.lrtDf}, p=${fmtP(result.lrtPValue)}`}
                accent={result.lrtPValue < 0.05 ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.lgrAIC}
                value={fmtN(result.aic, 1)}
                sub={`ℓ = ${fmtN(result.logLik, 2)}`}
                accent="var(--color-info)"
              />
            </div>

            {/* Coefficient Table */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.lgrCoefTable}</h2>
                <span className="bs-chart-sub">{outcomeName || 'Outcome'}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="anova-table" style={{ minWidth: 520 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>{ts.lgrVariable}</th>
                      <th>{ts.lgrBeta}</th>
                      <th>{ts.lgrSELabel}</th>
                      <th>{ts.lgrZStat}</th>
                      <th>{ts.lgrPVal}</th>
                      <th>{ts.lgrOR}</th>
                      <th>{ts.lgrORCI}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.coefficients.map((coef, i) => (
                      <tr
                        key={i}
                        style={coef.significant && i > 0
                          ? { background: 'color-mix(in srgb, var(--color-primary) 6%, transparent)' }
                          : undefined}
                      >
                        <td className="anova-table__source">
                          {coef.name === 'Intercept' ? (lang === 'ko' ? ts.lgrIntercept : coef.name) : coef.name}
                          {coef.significant && i > 0 && <span style={{ marginLeft: '0.4em', color: 'var(--color-danger)', fontWeight: 700 }}>*</span>}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{fmtN(coef.beta)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{fmtN(coef.se)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: coef.significant && i > 0 ? 'var(--color-danger)' : undefined }}>
                          {fmtN(coef.z, 3)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: coef.significant && i > 0 ? 'var(--color-danger)' : undefined }}>
                          {fmtP(coef.pValue)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: coef.significant && i > 0 ? 700 : undefined }}>
                          {i === 0 ? '—' : fmtN(coef.or, 3)}
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                          {i === 0 ? '—' : `[${fmtN(coef.orCiLow, 3)}, ${fmtN(coef.orCiHigh, 3)}]`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
                  * p &lt; 0.05
                </div>
              </div>
            </div>

            {/* ROC Curve */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.lgrROCTitle}</h2>
                <span className="bs-chart-sub">AUC = {fmtN(result.auc, 3)}</span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart
                  data={result.rocPoints}
                  margin={{ top: 12, right: 24, bottom: 36, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="fpr"
                    type="number"
                    domain={[0, 1]}
                    tickFormatter={v => v.toFixed(1)}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: '1 − Specificity (FPR)', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    dataKey="tpr"
                    type="number"
                    domain={[0, 1]}
                    tickFormatter={v => v.toFixed(1)}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    width={44}
                    label={{ value: 'Sensitivity (TPR)', angle: -90, position: 'insideLeft', offset: 12, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [
                      typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                    ]}
                    labelFormatter={(label) => `FPR: ${Number(label).toFixed(3)}`}
                  />
                  {/* Diagonal reference */}
                  <Line
                    data={[{ fpr: 0, diag: 0 }, { fpr: 1, diag: 1 }]}
                    dataKey="diag"
                    type="linear"
                    stroke="var(--border-color)"
                    strokeDasharray="5 3"
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                  {/* ROC curve */}
                  <Line
                    dataKey="tpr"
                    type="monotone"
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                    name="ROC"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Predicted Probability Curve (single predictor only) */}
            {sigmoidData && parsed?.p === 1 && (
              <div className="bs-chart-card">
                <div className="bs-chart-header">
                  <h2 className="bs-chart-title">{ts.lgrSigmoidTitle}</h2>
                  <span className="bs-chart-sub">{xNames[0] || 'X1'} → {ts.lgrProbability}</span>
                </div>
                <div className="bs-legend-row">
                  <span className="bs-legend-item">
                    <span className="bs-legend-line" style={{ background: 'var(--color-info)' }} />
                    {ts.lgrProbability}
                  </span>
                  <span className="bs-legend-item">
                    <span className="bs-legend-dot" style={{ background: 'var(--color-primary)', borderRadius: '50%' }} />
                    {outcomeName || 'Outcome'} = 1
                  </span>
                  <span className="bs-legend-item">
                    <span className="bs-legend-dot" style={{ background: 'var(--color-danger)', borderRadius: '50%' }} />
                    {outcomeName || 'Outcome'} = 0
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart margin={{ top: 12, right: 24, bottom: 36, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={['auto', 'auto']}
                      tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                      label={{ value: xNames[0] || 'X1', position: 'insideBottom', offset: -20, fill: 'var(--text-muted)', fontSize: 11 }}
                    />
                    <YAxis
                      type="number"
                      domain={[-0.1, 1.15]}
                      tickFormatter={v => v.toFixed(1)}
                      tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                      width={44}
                      label={{ value: ts.lgrProbability, angle: -90, position: 'insideLeft', offset: 12, fill: 'var(--text-muted)', fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value, name) => [
                        typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                        name,
                      ]}
                    />
                    {/* Sigmoid curve */}
                    <Line
                      data={sigmoidData.curve}
                      type="monotone"
                      dataKey="prob"
                      name={ts.lgrProbability}
                      stroke="var(--color-info)"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    {/* Actual outcome = 1 */}
                    <Scatter
                      data={sigmoidData.scatter1}
                      dataKey="actual"
                      name={`${outcomeName || 'Outcome'} = 1`}
                      fill="var(--color-primary)"
                      fillOpacity={0.8}
                      isAnimationActive={false}
                    />
                    {/* Actual outcome = 0 */}
                    <Scatter
                      data={sigmoidData.scatter0}
                      dataKey="actual"
                      name={`${outcomeName || 'Outcome'} = 0`}
                      fill="var(--color-danger)"
                      fillOpacity={0.8}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Interpretation */}
            <div className="bs-interp-card">
              <button className="ds-formula-toggle" onClick={() => setShowInterp(s => !s)}>
                <span className="bs-interp-title" style={{ margin: 0 }}>{ts.lgrInterpTitle}</span>
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
            <div className="bs-empty-icon">OR</div>
            <div className="bs-empty-text">
              {parsed === null ? ts.invalidInput : ts.invalidInput}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogisticRegression;
