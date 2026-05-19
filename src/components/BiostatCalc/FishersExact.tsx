import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcFishersExact } from './biostat';

interface Props { lang: Lang }

interface Cells { a: number; b: number; c: number; d: number }

const DEFAULT_CELLS: Cells = { a: 5, b: 5, c: 5, d: 5 };
const EXAMPLE_CELLS: Cells = { a: 8, b: 2, c: 1, d: 9 };

function fmtP(p: number): string {
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

function fmtOR(or: number): string {
  if (isNaN(or)) return '—';
  if (!isFinite(or)) return '∞';
  return or.toFixed(2);
}

function fmtCI(v: number): string {
  if (!isFinite(v) || isNaN(v)) return '—';
  return v.toFixed(2);
}

interface StatCardProps { label: string; value: React.ReactNode; sub?: string; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

const FishersExact: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;
  const [cells, setCells] = useState<Cells>(EXAMPLE_CELLS);
  const [showFormula, setShowFormula] = useState(false);

  const { a, b, c, d } = cells;
  const r1 = a + b, r2 = c + d;
  const c1 = a + c, c2 = b + d;
  const n  = a + b + c + d;

  const result = useMemo(() => calcFishersExact(a, b, c, d), [a, b, c, d]);

  const updateCell = (key: keyof Cells, raw: string) => {
    const v = Math.max(0, Math.floor(parseFloat(raw) || 0));
    setCells(prev => ({ ...prev, [key]: v }));
  };

  // Mosaic data: row-wise percentages (Disease+ vs Disease−)
  const mosaicData = useMemo(() => {
    if (r1 === 0 && r2 === 0) return [];
    return [
      {
        group: ts.feExposed,
        pos:   r1 > 0 ? parseFloat((a / r1 * 100).toFixed(1)) : 0,
        neg:   r1 > 0 ? parseFloat((b / r1 * 100).toFixed(1)) : 0,
      },
      {
        group: ts.feUnexposed,
        pos:   r2 > 0 ? parseFloat((c / r2 * 100).toFixed(1)) : 0,
        neg:   r2 > 0 ? parseFloat((d / r2 * 100).toFixed(1)) : 0,
      },
    ];
  }, [a, b, c, d, r1, r2, ts.feExposed, ts.feUnexposed]);

  // Expected cell counts for the note indicator
  const expA = n > 0 ? r1 * c1 / n : 0;
  const expB = n > 0 ? r1 * c2 / n : 0;
  const expC = n > 0 ? r2 * c1 / n : 0;
  const expD = n > 0 ? r2 * c2 / n : 0;
  const hasSmallExpected = [expA, expB, expC, expD].some(e => e > 0 && e < 5);

  const pct = (num: number, denom: number) =>
    denom > 0 ? `${(num / denom * 100).toFixed(1)}%` : '—';

  const gridCols = '80px 1fr 1fr 44px';

  const ciAvailable = !isNaN(result.orCiLow) && isFinite(result.orCiLow);

  return (
    <div className="bs-layout">
      {/* ── Left: Table Input ── */}
      <div className="bs-left">
        <div className="bs-chitbl-wrap">
          <div className="bs-chitbl" style={{ gridTemplateColumns: gridCols }}>
            {/* Header row */}
            <div className="bs-chitbl-corner" />
            <div className="bs-chitbl-hdr">{ts.feDiseasePos}</div>
            <div className="bs-chitbl-hdr">{ts.feDiseaseNeg}</div>
            <div className="bs-chitbl-hdr">N</div>

            {/* Row 1: Exposed */}
            <div className="bs-chitbl-hdr" style={{ textAlign: 'left', justifyContent: 'flex-start', paddingLeft: 4 }}>
              {ts.feExposed}
            </div>
            <input
              type="number" className="bs-chitbl-cell" min={0} step={1}
              value={a} title="a" onChange={e => updateCell('a', e.target.value)}
            />
            <input
              type="number" className="bs-chitbl-cell" min={0} step={1}
              value={b} title="b" onChange={e => updateCell('b', e.target.value)}
            />
            <div className="bs-chitbl-total">{r1}</div>

            {/* Row 2: Unexposed */}
            <div className="bs-chitbl-hdr" style={{ textAlign: 'left', justifyContent: 'flex-start', paddingLeft: 4 }}>
              {ts.feUnexposed}
            </div>
            <input
              type="number" className="bs-chitbl-cell" min={0} step={1}
              value={c} title="c" onChange={e => updateCell('c', e.target.value)}
            />
            <input
              type="number" className="bs-chitbl-cell" min={0} step={1}
              value={d} title="d" onChange={e => updateCell('d', e.target.value)}
            />
            <div className="bs-chitbl-total">{r2}</div>

            {/* Totals row */}
            <div className="bs-chitbl-hdr">N</div>
            <div className="bs-chitbl-total">{c1}</div>
            <div className="bs-chitbl-total">{c2}</div>
            <div className="bs-chitbl-grand">{n}</div>
          </div>
        </div>

        {/* Collapsible formula */}
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
                <span className="formula-name">P</span>
                <span className="formula-expr">
                  = (a+b)!(c+d)!(a+c)!(b+d)! / (n! · a! · b! · c! · d!)
                </span>
              </div>
              <div className="formula-row">
                <span className="formula-name">p</span>
                <span className="formula-expr">= Σ P(k) for all k where P(k) ≤ P(obs)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">OR</span>
                <span className="formula-expr">= (a × d) / (b × c)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">95% CI</span>
                <span className="formula-expr">= e<sup>ln(OR) ± 1.96√(1/a+1/b+1/c+1/d)</sup></span>
              </div>
            </div>
          )}
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setCells(EXAMPLE_CELLS)}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => setCells(DEFAULT_CELLS)}>
            {ts.reset}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {/* Note — always visible */}
        <div className={`bs-note${hasSmallExpected ? ' bs-note--active' : ''}`}>
          <span style={{ flexShrink: 0 }}>ℹ</span>
          <span>{ts.feNote}</span>
        </div>

        {result.valid ? (
          <>
            <div className={`bs-badge ${result.significant ? 'bs-badge--sig' : 'bs-badge--ns'}`}>
              {result.significant ? ts.feSignificant : ts.feNotSignificant}
            </div>

            <div className="bs-stats-grid">
              <StatCard
                label={ts.feOR}
                value={fmtOR(result.or)}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.pValue}
                sub={`n = ${result.n}`}
                value={fmtP(result.pValue)}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
            </div>

            {/* CI for OR */}
            <div className="bs-ci-card">
              <span className="bs-ci-label">{ts.ci95} (OR)</span>
              <span className="bs-ci-value">
                {ciAvailable
                  ? `[${fmtCI(result.orCiLow)}, ${fmtCI(result.orCiHigh)}]`
                  : '— (zero cell)'}
              </span>
              {ciAvailable && (
                <span className="bs-ci-hint">
                  {result.orCiLow > 1 || result.orCiHigh < 1 ? ts.feORCIExcl1 : ts.feORCIIncl1}
                </span>
              )}
            </div>

            {/* 2×2 table with row percentages */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.feTableTitle}</h2>
                <span className="bs-chart-sub">n = {result.n}</span>
              </div>
              <div className="bs-chitbl" style={{ gridTemplateColumns: gridCols }}>
                <div className="bs-chitbl-corner" />
                <div className="bs-chitbl-hdr">{ts.feDiseasePos}</div>
                <div className="bs-chitbl-hdr">{ts.feDiseaseNeg}</div>
                <div className="bs-chitbl-hdr">N</div>

                <div className="bs-chitbl-hdr" style={{ textAlign: 'left', justifyContent: 'flex-start', paddingLeft: 4 }}>
                  {ts.feExposed}
                </div>
                <div className="fe-cell">
                  <span className="fe-cell-count">{a}</span>
                  <span className="fe-cell-pct">{pct(a, r1)}</span>
                </div>
                <div className="fe-cell">
                  <span className="fe-cell-count">{b}</span>
                  <span className="fe-cell-pct">{pct(b, r1)}</span>
                </div>
                <div className="bs-chitbl-total">{r1}</div>

                <div className="bs-chitbl-hdr" style={{ textAlign: 'left', justifyContent: 'flex-start', paddingLeft: 4 }}>
                  {ts.feUnexposed}
                </div>
                <div className="fe-cell">
                  <span className="fe-cell-count">{c}</span>
                  <span className="fe-cell-pct">{pct(c, r2)}</span>
                </div>
                <div className="fe-cell">
                  <span className="fe-cell-count">{d}</span>
                  <span className="fe-cell-pct">{pct(d, r2)}</span>
                </div>
                <div className="bs-chitbl-total">{r2}</div>

                <div className="bs-chitbl-hdr">N</div>
                <div className="bs-chitbl-total">{c1}</div>
                <div className="bs-chitbl-total">{c2}</div>
                <div className="bs-chitbl-grand">{n}</div>
              </div>
            </div>

            {/* Mosaic-style stacked bar chart */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.feMosaicTitle}</h2>
              </div>
              <div className="bs-legend-row">
                <span className="bs-legend-item">
                  <span className="bs-legend-dot" style={{ background: 'var(--color-danger)', opacity: 0.75 }} />
                  {ts.feDiseasePos}
                </span>
                <span className="bs-legend-item">
                  <span className="bs-legend-dot" style={{ background: 'var(--color-info)', opacity: 0.35 }} />
                  {ts.feDiseaseNeg}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={mosaicData}
                  margin={{ top: 8, right: 16, bottom: 16, left: 8 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="group" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${typeof value === 'number' ? value.toFixed(1) : value}%`,
                    ]}
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Bar
                    dataKey="pos"
                    name={ts.feDiseasePos}
                    stackId="a"
                    fill="var(--color-danger)"
                    fillOpacity={0.75}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="pos"
                      position="inside"
                      formatter={(v: unknown) => typeof v === 'number' && v >= 8 ? `${v}%` : ''}
                      style={{ fill: 'white', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)' }}
                    />
                  </Bar>
                  <Bar
                    dataKey="neg"
                    name={ts.feDiseaseNeg}
                    stackId="a"
                    fill="var(--color-info)"
                    fillOpacity={0.35}
                    isAnimationActive={false}
                  >
                    <LabelList
                      dataKey="neg"
                      position="inside"
                      formatter={(v: unknown) => typeof v === 'number' && v >= 8 ? `${v}%` : ''}
                      style={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font-mono)' }}
                    />
                    {mosaicData.map((_, i) => (
                      <Cell key={i} fillOpacity={0.3} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">2×2</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FishersExact;
