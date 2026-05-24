import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Line, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import {
  calcKaplanMeier, calcLogRank,
  type KMDataPoint,
} from './biostat';

interface Props { lang: Lang }

// ── Example data ──────────────────────────────────────────────────────────────
const EXAMPLE_A =
  `5,1\n8,0\n10,1\n12,1\n15,0\n18,1\n20,0\n22,1\n25,1\n30,0\n35,1\n40,0\n45,1`;

const EXAMPLE_B =
  `3,1\n7,0\n9,1\n14,1\n17,0\n21,1\n24,0\n28,1\n32,1\n38,0\n42,1\n48,0\n50,1`;

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseKMData(raw: string): KMDataPoint[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .flatMap(line => {
      const parts = line.split(/[,\t\s]+/).map(s => s.trim()).filter(Boolean);
      if (parts.length < 2) return [];
      const time = parseFloat(parts[0]);
      const event = parseFloat(parts[1]);
      if (!Number.isFinite(time) || !Number.isFinite(event)) return [];
      if (event !== 0 && event !== 1) return [];
      return [{ time, event }];
    });
}

function fmtP(p: number): string {
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

function fmtN(v: number, d = 3): string {
  return v.toFixed(d);
}

// ── Censored mark custom shape ────────────────────────────────────────────────
function CensoredMark(props: object) {
  const { cx = 0, cy = 0, fill = 'var(--color-primary)' } = props as { cx?: number; cy?: number; fill?: string };
  if (!cx && !cy) return null;
  const s = 5;
  return (
    <g>
      <line x1={cx - s} y1={cy} x2={cx + s} y2={cy} stroke={fill} strokeWidth={2.5} />
      <line x1={cx} y1={cy - s} x2={cx} y2={cy + s} stroke={fill} strokeWidth={2.5} />
    </g>
  );
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
const KaplanMeier: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;

  const [rawA, setRawA] = useState(EXAMPLE_A);
  const [rawB, setRawB] = useState(EXAMPLE_B);
  const [showGroupB, setShowGroupB] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showInterp, setShowInterp] = useState(true);

  const dataA = useMemo(() => parseKMData(rawA), [rawA]);
  const dataB = useMemo(() => (showGroupB ? parseKMData(rawB) : []), [showGroupB, rawB]);

  const resultA = useMemo(() => calcKaplanMeier(dataA), [dataA]);
  const resultB = useMemo(
    () => (showGroupB && dataB.length >= 2 ? calcKaplanMeier(dataB) : null),
    [showGroupB, dataB],
  );
  const logRank = useMemo(
    () =>
      showGroupB && resultA.valid && resultB?.valid
        ? calcLogRank(dataA, dataB)
        : null,
    [showGroupB, resultA.valid, resultB, dataA, dataB],
  );

  // X-axis domain spanning both groups
  const xMax = useMemo(() => {
    const maxA = resultA.valid ? Math.max(...resultA.chartData.map(d => d.time)) : 0;
    const maxB = resultB?.valid ? Math.max(...resultB.chartData.map(d => d.time)) : 0;
    return Math.max(maxA, maxB, 10) * 1.08;
  }, [resultA, resultB]);

  const tooltipStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '0.78rem',
    color: 'var(--text-primary)',
  };

  // Interpretation text
  const interpText = useMemo(() => {
    if (!resultA.valid) return '';
    const medA = resultA.medianSurvival !== null
      ? `${resultA.medianSurvival}`
      : ts.kmNotReached;

    if (!showGroupB || !resultB?.valid || !logRank?.valid) {
      // Single group
      if (lang === 'ko') {
        return `총 ${resultA.n}명의 피험자 중 ${resultA.totalEvents}개의 사건이 관찰되었습니다. ` +
          `중앙 생존 시간은 ${medA}${medA !== ts.kmNotReached ? '일' : ''}입니다.` +
          (resultA.medianSurvival === null ? ' 50%를 초과한 피험자가 연구 종료 시점까지 생존하였습니다.' : '');
      }
      return `Among ${resultA.n} subjects, ${resultA.totalEvents} events were observed. ` +
        `The median survival time is ${medA}${medA !== ts.kmNotReached ? ' days' : ''}.` +
        (resultA.medianSurvival === null ? ' More than 50% of subjects survived beyond the observation period.' : '');
    }

    // Two groups
    const medB = resultB.medianSurvival !== null
      ? `${resultB.medianSurvival}`
      : ts.kmNotReached;
    const sig = logRank.significant;
    const pStr = fmtP(logRank.pValue);

    if (lang === 'ko') {
      return `그룹 A (n=${resultA.n}, 사건=${resultA.totalEvents}, 중앙 생존=${medA}) vs ` +
        `그룹 B (n=${resultB.n}, 사건=${resultB.totalEvents}, 중앙 생존=${medB}). ` +
        `Log-rank 검정: χ²=${fmtN(logRank.chi2)}, p=${pStr}. ` +
        (sig ? ts.kmSig : ts.kmNS);
    }
    return `Group A (n=${resultA.n}, events=${resultA.totalEvents}, median=${medA}) vs ` +
      `Group B (n=${resultB.n}, events=${resultB.totalEvents}, median=${medB}). ` +
      `Log-rank test: χ²=${fmtN(logRank.chi2)}, p=${pStr}. ` +
      (sig ? ts.kmSig : ts.kmNS);
  }, [resultA, resultB, logRank, showGroupB, ts, lang]);

  const isValid = resultA.valid;
  const isTwoGroup = showGroupB && resultB?.valid;
  const badgeSig = logRank?.significant ?? false;

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">

        {/* Group A input */}
        <div className="bs-group-card">
          <div className="bs-group-title" style={{ color: 'var(--color-primary)' }}>
            {isTwoGroup ? ts.kmGroupA : ts.kmDataLabel}
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.kmDataHint}</label>
            <textarea
              className="bs-textarea"
              value={rawA}
              onChange={e => setRawA(e.target.value)}
              placeholder={'time,event\n5,1\n8,0\n...'}
              spellCheck={false}
              rows={8}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
              {dataA.length > 0 ? `n = ${dataA.length}, events = ${dataA.filter(d => d.event === 1).length}` : ''}
            </div>
          </div>
        </div>

        {/* Two-group toggle */}
        <div className="bs-input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 'var(--space-3)' }}>
          <input
            type="checkbox"
            id="km-two-groups"
            checked={showGroupB}
            onChange={e => setShowGroupB(e.target.checked)}
            style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
          />
          <label htmlFor="km-two-groups" className="bs-label" style={{ cursor: 'pointer', marginBottom: 0 }}>
            {ts.kmEnableTwoGroups}
          </label>
        </div>

        {/* Group B input (conditional) */}
        {showGroupB && (
          <div className="bs-group-card">
            <div className="bs-group-title" style={{ color: 'var(--color-info)' }}>
              {ts.kmGroupB}
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.kmDataHint}</label>
              <textarea
                className="bs-textarea"
                value={rawB}
                onChange={e => setRawB(e.target.value)}
                placeholder={'time,event\n3,1\n7,0\n...'}
                spellCheck={false}
                rows={8}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
                {dataB.length > 0 ? `n = ${dataB.length}, events = ${dataB.filter(d => d.event === 1).length}` : ''}
              </div>
            </div>
          </div>
        )}

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
                <span className="formula-name">S(t<sub>i</sub>)</span>
                <span className="formula-expr">= S(t<sub>i−1</sub>) × (1 − d<sub>i</sub>/n<sub>i</sub>)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">Greenwood</span>
                <span className="formula-expr">= Σ d<sub>i</sub> / (n<sub>i</sub>(n<sub>i</sub>−d<sub>i</sub>))</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">95% CI</span>
                <span className="formula-expr">= S(t)<sup>exp(±1.96√Var/|ln S|)</sup></span>
              </div>
              <div className="formula-row">
                <span className="formula-name">Log-rank χ²</span>
                <span className="formula-expr">= (Σ(O<sub>A</sub>−E<sub>A</sub>))² / ΣV<sub>i</sub></span>
              </div>
              <div className="formula-row">
                <span className="formula-name">E<sub>A,i</sub></span>
                <span className="formula-expr">= n<sub>A,i</sub> × d<sub>i</sub> / (n<sub>A,i</sub>+n<sub>B,i</sub>)</span>
              </div>
            </div>
          )}
        </div>

        {/* Note */}
        <div className="bs-note">
          <span>ℹ</span>
          <span>{ts.kmNote}</span>
        </div>

        {/* Actions */}
        <div className="calc-actions">
          <button
            className="btn btn-secondary"
            onClick={() => { setRawA(EXAMPLE_A); setRawB(EXAMPLE_B); }}
          >
            {ts.loadExample}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setRawA(''); setRawB(''); }}
          >
            {ts.reset}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {isValid ? (
          <>
            {/* Badge – only meaningful for two-group comparison */}
            {isTwoGroup && logRank?.valid && (
              <div className={`bs-badge ${badgeSig ? 'bs-badge--sig' : 'bs-badge--ns'}`}>
                {badgeSig ? ts.kmSig : ts.kmNS}
              </div>
            )}

            {/* Stats grid */}
            <div className="bs-stats-grid">
              <StatCard
                label={isTwoGroup ? `${ts.kmMedianSurvival} (A)` : ts.kmMedianSurvival}
                value={resultA.medianSurvival !== null ? String(resultA.medianSurvival) : ts.kmNotReached}
                sub={`n=${resultA.n}, events=${resultA.totalEvents}`}
                accent="var(--color-primary)"
              />
              {isTwoGroup && resultB && (
                <StatCard
                  label={`${ts.kmMedianSurvival} (B)`}
                  value={resultB.medianSurvival !== null ? String(resultB.medianSurvival) : ts.kmNotReached}
                  sub={`n=${resultB.n}, events=${resultB.totalEvents}`}
                  accent="var(--color-info)"
                />
              )}
              {isTwoGroup && logRank?.valid && (
                <>
                  <StatCard
                    label={ts.kmLogRankChi2}
                    value={fmtN(logRank.chi2)}
                    sub={`df = 1`}
                    accent={logRank.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
                  />
                  <StatCard
                    label={ts.pValue}
                    value={fmtP(logRank.pValue)}
                    sub={`O_A=${logRank.observedA}, E_A=${fmtN(logRank.expectedA, 1)}`}
                    accent={logRank.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
                  />
                </>
              )}
            </div>

            {/* KM Survival Curve */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.kmCurveTitle}</h2>
                {isTwoGroup ? (
                  <div className="bs-legend-row" style={{ margin: 0 }}>
                    <span className="bs-legend-item">
                      <span className="bs-legend-line" style={{ background: 'var(--color-primary)' }} />
                      {ts.kmGroupA}
                    </span>
                    <span className="bs-legend-item">
                      <span className="bs-legend-line" style={{ background: 'var(--color-info)' }} />
                      {ts.kmGroupB}
                    </span>
                  </div>
                ) : (
                  <span className="bs-chart-sub">
                    n={resultA.n}, events={resultA.totalEvents}
                  </span>
                )}
              </div>

              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart margin={{ top: 12, right: 28, bottom: 32, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    type="number"
                    dataKey="time"
                    domain={[0, xMax]}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: ts.kmTimeCol, position: 'insideBottom', offset: -18, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    domain={[0, 1.05]}
                    tickFormatter={v => v.toFixed(1)}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    width={44}
                    label={{ value: ts.kmSurvivalCol, angle: -90, position: 'insideLeft', offset: 12, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [
                      typeof value === 'number' ? value.toFixed(3) : String(value ?? ''),
                      name,
                    ]}
                    labelFormatter={(label) => `${ts.kmTimeCol}: ${label}`}
                  />

                  {/* Median reference line */}
                  <ReferenceLine y={0.5} strokeDasharray="4 3" stroke="var(--color-accent)" strokeWidth={1} />

                  {/* Group A – survival */}
                  <Line
                    data={resultA.chartData}
                    type="stepAfter"
                    dataKey="survival"
                    name={isTwoGroup ? ts.kmGroupA : ts.kmSurvivalCol}
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                  {/* Group A – CI (single group only) */}
                  {!isTwoGroup && (
                    <>
                      <Line
                        data={resultA.chartData}
                        type="stepAfter"
                        dataKey="ciHigh"
                        name="95% CI upper"
                        stroke="var(--color-primary)"
                        strokeWidth={1}
                        strokeDasharray="4 2"
                        strokeOpacity={0.5}
                        dot={false}
                        isAnimationActive={false}
                        legendType="none"
                      />
                      <Line
                        data={resultA.chartData}
                        type="stepAfter"
                        dataKey="ciLow"
                        name="95% CI lower"
                        stroke="var(--color-primary)"
                        strokeWidth={1}
                        strokeDasharray="4 2"
                        strokeOpacity={0.5}
                        dot={false}
                        isAnimationActive={false}
                        legendType="none"
                      />
                    </>
                  )}
                  {/* Group A – censored marks */}
                  <Scatter
                    data={resultA.censoredPoints}
                    dataKey="survival"
                    fill="var(--color-primary)"
                    shape={CensoredMark}
                    isAnimationActive={false}
                    name="Censored A"
                    legendType="none"
                  />

                  {/* Group B (if two-group) */}
                  {isTwoGroup && resultB && (
                    <>
                      <Line
                        data={resultB.chartData}
                        type="stepAfter"
                        dataKey="survival"
                        name={ts.kmGroupB}
                        stroke="var(--color-info)"
                        strokeWidth={2.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                      <Scatter
                        data={resultB.censoredPoints}
                        dataKey="survival"
                        fill="var(--color-info)"
                        shape={CensoredMark}
                        isAnimationActive={false}
                        name="Censored B"
                        legendType="none"
                      />
                    </>
                  )}
                </ComposedChart>
              </ResponsiveContainer>

              {/* Legend for CI when single group */}
              {!isTwoGroup && (
                <div className="bs-legend-row" style={{ marginTop: 'var(--space-2)', justifyContent: 'flex-end' }}>
                  <span className="bs-legend-item">
                    <span className="bs-legend-line" style={{ background: 'var(--color-primary)' }} />
                    S(t)
                  </span>
                  <span className="bs-legend-item">
                    <span className="bs-legend-line" style={{ background: 'var(--color-primary)', opacity: 0.5 }} />
                    95% CI
                  </span>
                  <span className="bs-legend-item">
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', fontWeight: 700, marginRight: 4, fontSize: '0.85rem' }}>+</span>
                    {lang === 'ko' ? '중도절단' : 'Censored'}
                  </span>
                </div>
              )}
            </div>

            {/* Survival Table toggle */}
            <div className="bs-chart-card" style={{ padding: 'var(--space-3) var(--space-5)' }}>
              <button
                className="ds-formula-toggle"
                onClick={() => setShowTable(s => !s)}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  {ts.kmTableTitle} {isTwoGroup ? `— ${ts.kmGroupA}` : ''}
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {showTable ? ts.kmHideTable : ts.kmShowTable}
                </span>
              </button>
              {showTable && (
                <div style={{ overflowX: 'auto', marginTop: 'var(--space-3)' }}>
                  <table className="anova-table">
                    <thead>
                      <tr>
                        <th>{ts.kmTimeCol}</th>
                        <th>{ts.kmNAtRiskCol}</th>
                        <th>{ts.kmEventsCol}</th>
                        <th>{ts.kmCensoredCol}</th>
                        <th>{ts.kmSurvivalCol}</th>
                        <th>{ts.kmCI95Col}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultA.rows.map((row, i) => (
                        <tr key={i}>
                          <td>{row.time}</td>
                          <td>{row.nAtRisk}</td>
                          <td>{row.events}</td>
                          <td>{row.censored}</td>
                          <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{fmtN(row.survival)}</td>
                          <td>[{fmtN(row.ciLow)}, {fmtN(row.ciHigh)}]</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {isTwoGroup && resultB && (
                    <>
                      <div style={{
                        marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)',
                        fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-info)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>
                        {ts.kmGroupB}
                      </div>
                      <table className="anova-table">
                        <thead>
                          <tr>
                            <th>{ts.kmTimeCol}</th>
                            <th>{ts.kmNAtRiskCol}</th>
                            <th>{ts.kmEventsCol}</th>
                            <th>{ts.kmCensoredCol}</th>
                            <th>{ts.kmSurvivalCol}</th>
                            <th>{ts.kmCI95Col}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultB.rows.map((row, i) => (
                            <tr key={i}>
                              <td>{row.time}</td>
                              <td>{row.nAtRisk}</td>
                              <td>{row.events}</td>
                              <td>{row.censored}</td>
                              <td style={{ fontWeight: 600, color: 'var(--color-info)' }}>{fmtN(row.survival)}</td>
                              <td>[{fmtN(row.ciLow)}, {fmtN(row.ciHigh)}]</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Interpretation */}
            <div className="bs-interp-card">
              <button className="ds-formula-toggle" onClick={() => setShowInterp(s => !s)}>
                <span className="bs-interp-title" style={{ margin: 0 }}>{ts.kmInterpTitle}</span>
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
            <div className="bs-empty-icon">S(t)</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KaplanMeier;
