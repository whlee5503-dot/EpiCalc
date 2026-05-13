import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import {
  ALPHA_OPTIONS, POWER_OPTIONS,
  calcSampleSize, calcPowerCurve,
} from './biostat';

interface Props { lang: Lang }

const DEFAULT = { p1: 0.05, p2: 0.03, alphaIdx: 1, powerIdx: 0 };
const EXAMPLE = { p1: 0.12, p2: 0.07, alphaIdx: 1, powerIdx: 0 };

interface StatCardProps { label: string; value: React.ReactNode; sub?: string; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

function fmtPct(v: number): string { return `${(v * 100).toFixed(1)}%`; }
function fmtN(n: number): string {
  return n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
}

const SampleSize: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const [s, setS] = useState(DEFAULT);

  const alpha = ALPHA_OPTIONS[s.alphaIdx];
  const power = POWER_OPTIONS[s.powerIdx];

  const result = useMemo(
    () => calcSampleSize(s.p1, s.p2, alpha.z, power.z),
    [s.p1, s.p2, alpha.z, power.z],
  );

  const curveData = useMemo(
    () => calcPowerCurve(s.p1, s.p2, alpha.z, result.valid ? result.n : 50),
    [s.p1, s.p2, alpha.z, result.valid, result.n],
  );

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.parameters}</div>

          <div className="bs-input-group">
            <label className="bs-label">{ts.p1}</label>
            <input
              type="number"
              className="bs-number-input"
              min={0.001} max={0.999} step={0.001}
              value={s.p1}
              onChange={(e) => setS(prev => ({ ...prev, p1: parseFloat(e.target.value) }))}
            />
          </div>

          <div className="bs-input-group">
            <label className="bs-label">{ts.p2}</label>
            <input
              type="number"
              className="bs-number-input"
              min={0.001} max={0.999} step={0.001}
              value={s.p2}
              onChange={(e) => setS(prev => ({ ...prev, p2: parseFloat(e.target.value) }))}
            />
          </div>

          <div className="bs-input-group">
            <label className="bs-label">{ts.alpha}</label>
            <select
              className="bs-select"
              value={s.alphaIdx}
              onChange={(e) => setS(prev => ({ ...prev, alphaIdx: parseInt(e.target.value) }))}
            >
              {ALPHA_OPTIONS.map((o, i) => (
                <option key={o.label} value={i}>{o.label} (Z = {o.z})</option>
              ))}
            </select>
          </div>

          <div className="bs-input-group">
            <label className="bs-label">{ts.power}</label>
            <select
              className="bs-select"
              value={s.powerIdx}
              onChange={(e) => setS(prev => ({ ...prev, powerIdx: parseInt(e.target.value) }))}
            >
              {POWER_OPTIONS.map((o, i) => (
                <option key={o.label} value={i}>{o.label} (Z = {o.z})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="formula-box">
          <div className="formula-box-title">{translations[lang].common.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">n</span>
              <span className="formula-expr">= (Z<sub>α/2</sub> + Z<sub>β</sub>)² × [p₁q₁ + p₂q₂] / (p₁−p₂)²</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">ARR</span>
              <span className="formula-expr">= |p₁ − p₂|</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">NNT</span>
              <span className="formula-expr">= 1 / ARR</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setS(EXAMPLE)}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => setS(DEFAULT)}>
            {ts.reset}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result.valid ? (
          <>
            <div className="bs-stats-grid">
              <StatCard
                label={ts.nPerGroup}
                value={result.n.toLocaleString()}
                sub={ts.perGroup}
                accent="var(--color-primary)"
              />
              <StatCard
                label={ts.totalN}
                value={result.total.toLocaleString()}
                sub="2 × n"
                accent="var(--color-info)"
              />
              <StatCard
                label={ts.arrLabel}
                value={fmtPct(result.arr)}
                accent="var(--color-accent)"
              />
              <StatCard
                label={ts.nntLabel}
                value={isFinite(result.nnt) ? result.nnt.toFixed(1) : '∞'}
                accent="var(--color-danger)"
              />
            </div>

            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.powerCurveTitle}</h2>
                <span className="bs-chart-sub">
                  n = {result.n.toLocaleString()} {ts.perGroup} @ {fmtPct(power.value)} power
                </span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={curveData} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="n"
                    tickFormatter={fmtN}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: ts.sampleSizeAxis, position: 'insideBottom', offset: -8, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    width={42}
                  />
                  <Tooltip
                    formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`, ts.powerAxis]}
                    labelFormatter={(n) => `n = ${Number(n).toLocaleString()}`}
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '4px' }} />
                  <ReferenceLine
                    y={power.value}
                    stroke="var(--color-accent)"
                    strokeDasharray="5 3"
                    label={{ value: ts.targetPower, position: 'insideTopLeft', fill: 'var(--color-accent)', fontSize: 10 }}
                  />
                  <ReferenceLine
                    x={result.n}
                    stroke="var(--color-primary)"
                    strokeDasharray="5 3"
                  />
                  <Line
                    type="monotone"
                    dataKey="power"
                    name={ts.powerAxis}
                    stroke="var(--color-primary)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">∿</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SampleSize;
