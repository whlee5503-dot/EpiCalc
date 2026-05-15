import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcTTest, calcTDistCurve } from './biostat';

interface Props { lang: Lang }

interface Group { mean: number; sd: number; n: number }

const DEFAULT_G1: Group = { mean: 120, sd: 15, n: 25 };
const DEFAULT_G2: Group = { mean: 130, sd: 18, n: 25 };
const EXAMPLE_G1: Group = { mean: 4.2, sd: 1.1, n: 30 };
const EXAMPLE_G2: Group = { mean: 3.5, sd: 0.9, n: 30 };

interface StatCardProps { label: string; value: React.ReactNode; sub?: string; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

function fmtP(p: number): string {
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

interface TooltipPayload { dataKey: string; value: number }
interface CustomTooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: number }
const TDistTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const pdfEntry = payload.find((p) => p.dataKey === 'pdf');
  if (!pdfEntry) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-color)',
      borderRadius: '6px',
      padding: '6px 10px',
      fontSize: '0.78rem',
      color: 'var(--text-primary)',
    }}>
      <div>t = {Number(label).toFixed(3)}</div>
      <div style={{ color: 'var(--text-muted)' }}>PDF = {pdfEntry.value.toFixed(4)}</div>
    </div>
  );
};

interface GroupInputProps {
  title: string;
  group: Group;
  onChange: (g: Group) => void;
  ts: { meanLabel: string; sdLabel: string; nLabel: string };
}
const GroupInput: React.FC<GroupInputProps> = ({ title, group, onChange, ts }) => {
  const set = (key: keyof Group) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) onChange({ ...group, [key]: v });
  };
  return (
    <div className="bs-group-card">
      <div className="bs-group-title">{title}</div>
      <div className="bs-group-grid">
        <div className="bs-input-group">
          <label className="bs-label">{ts.meanLabel}</label>
          <input type="number" className="bs-number-input" step="any" value={group.mean} onChange={set('mean')} />
        </div>
        <div className="bs-input-group">
          <label className="bs-label">{ts.sdLabel}</label>
          <input type="number" className="bs-number-input" min={0} step="any" value={group.sd} onChange={set('sd')} />
        </div>
        <div className="bs-input-group">
          <label className="bs-label">{ts.nLabel}</label>
          <input type="number" className="bs-number-input" min={2} step={1} value={group.n} onChange={set('n')} />
        </div>
      </div>
    </div>
  );
};

const TTest: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;
  const [g1, setG1] = useState<Group>(DEFAULT_G1);
  const [g2, setG2] = useState<Group>(DEFAULT_G2);

  const result = useMemo(
    () => calcTTest(g1.mean, g1.sd, g1.n, g2.mean, g2.sd, g2.n),
    [g1, g2],
  );

  const curve = useMemo(
    () => result.valid ? calcTDistCurve(result.df, result.t) : null,
    [result],
  );

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        <GroupInput
          title={ts.group1}
          group={g1}
          onChange={setG1}
          ts={ts}
        />
        <GroupInput
          title={ts.group2}
          group={g2}
          onChange={setG2}
          ts={ts}
        />

        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">s<sub>p</sub>²</span>
              <span className="formula-expr">= [(n₁−1)s₁² + (n₂−1)s₂²] / (n₁+n₂−2)</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">t</span>
              <span className="formula-expr">= (x̄₁ − x̄₂) / (s<sub>p</sub> × √(1/n₁ + 1/n₂))</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">df</span>
              <span className="formula-expr">= n₁ + n₂ − 2</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => { setG1(EXAMPLE_G1); setG2(EXAMPLE_G2); }}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => { setG1(DEFAULT_G1); setG2(DEFAULT_G2); }}>
            {ts.reset}
          </button>
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
                label={ts.tStat}
                value={result.t.toFixed(3)}
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
              <StatCard
                label={ts.meanDiff}
                value={result.meanDiff.toFixed(3)}
              />
            </div>

            <div className="bs-ci-card">
              <span className="bs-ci-label">{ts.ci95}</span>
              <span className="bs-ci-value">
                [{result.ciLow.toFixed(3)},&nbsp;{result.ciHigh.toFixed(3)}]
              </span>
              <span className="bs-ci-hint">
                {result.ciLow > 0 || result.ciHigh < 0 ? ts.ciExcludes0 : ts.ciIncludes0}
              </span>
            </div>

            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.tDistTitle}</h2>
                <span className="bs-chart-sub">df = {result.df}</span>
              </div>
              <div className="bs-legend-row">
                <span className="bs-legend-item">
                  <span className="bs-legend-dot" style={{ background: 'var(--color-danger)', opacity: 0.55 }} />
                  {ts.rejectionRegion} (α = 0.05)
                </span>
                <span className="bs-legend-item">
                  <span className="bs-legend-line" style={{ background: 'var(--color-accent)' }} />
                  {ts.observedT} = {result.t.toFixed(3)}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={curve.data} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="t"
                    type="number"
                    domain={[-curve.tRange, curve.tRange]}
                    tickFormatter={(v) => Number(v).toFixed(1)}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: 't', position: 'insideBottomRight', offset: -4, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    tickFormatter={(v) => v.toFixed(2)}
                    width={44}
                  />
                  <Tooltip content={<TDistTooltip />} />
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
                    x={curve.tcrit}
                    stroke="var(--color-danger)"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                  />
                  <ReferenceLine
                    x={-curve.tcrit}
                    stroke="var(--color-danger)"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                  />
                  <ReferenceLine
                    x={result.t}
                    stroke="var(--color-accent)"
                    strokeWidth={2.5}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">t</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TTest;
