import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcZTestOneSample, calcZTestTwoSample, calcZDistCurve } from './biostat';

interface Props { lang: Lang }
type ZMode = 'one' | 'two';

interface OneSampleState { xbar: number; mu0: number; sigma: number; n: number }
interface TwoSampleState { mean1: number; sigma1: number; n1: number; mean2: number; sigma2: number; n2: number }

const DEFAULT_ONE: OneSampleState = { xbar: 100, mu0: 100, sigma: 15, n: 30 };
const EXAMPLE_ONE: OneSampleState = { xbar: 105, mu0: 100, sigma: 15, n: 25 };
const DEFAULT_TWO: TwoSampleState = { mean1: 80, sigma1: 10, n1: 30, mean2: 80, sigma2: 12, n2: 30 };
const EXAMPLE_TWO: TwoSampleState = { mean1: 85, sigma1: 10, n1: 40, mean2: 78, sigma2: 12, n2: 35 };

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
interface ZTooltipProps { active?: boolean; payload?: TooltipPayload[]; label?: number }
const ZDistTooltip: React.FC<ZTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const entry = payload.find(p => p.dataKey === 'pdf');
  if (!entry) return null;
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
      borderRadius: '6px', padding: '6px 10px', fontSize: '0.78rem', color: 'var(--text-primary)',
    }}>
      <div>z = {Number(label).toFixed(3)}</div>
      <div style={{ color: 'var(--text-muted)' }}>PDF = {entry.value.toFixed(4)}</div>
    </div>
  );
};

const ZTest: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;
  const [mode, setMode] = useState<ZMode>('one');
  const [one, setOne] = useState<OneSampleState>(DEFAULT_ONE);
  const [two, setTwo] = useState<TwoSampleState>(DEFAULT_TWO);

  const result = useMemo(() => {
    if (mode === 'one') return calcZTestOneSample(one.xbar, one.mu0, one.sigma, one.n);
    return calcZTestTwoSample(two.mean1, two.sigma1, two.n1, two.mean2, two.sigma2, two.n2);
  }, [mode, one, two]);

  const curve = useMemo(() => result.valid ? calcZDistCurve(result.z) : null, [result]);

  const setOneField = (key: keyof OneSampleState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setOne(prev => ({ ...prev, [key]: v }));
  };
  const setTwoField = (key: keyof TwoSampleState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) setTwo(prev => ({ ...prev, [key]: v }));
  };

  const loadExample = () => { if (mode === 'one') setOne(EXAMPLE_ONE); else setTwo(EXAMPLE_TWO); };
  const reset = () => { if (mode === 'one') setOne(DEFAULT_ONE); else setTwo(DEFAULT_TWO); };

  const diffLabel = mode === 'one' ? 'x̄ − μ₀' : 'x̄₁ − x̄₂';

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        {/* Mode selector */}
        <div className="bs-group-card">
          <div className="bs-group-title">{ts.zMode}</div>
          <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap' }}>
            {(['one', 'two'] as ZMode[]).map(m => (
              <label
                key={m}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  cursor: 'pointer', fontSize: '0.875rem',
                  color: mode === m ? 'var(--color-primary)' : 'var(--text-secondary)',
                  fontWeight: mode === m ? 600 : 400,
                }}
              >
                <input type="radio" name="zmode" value={m} checked={mode === m} onChange={() => setMode(m)} />
                {m === 'one' ? ts.zOneSample : ts.zTwoSample}
              </label>
            ))}
          </div>
        </div>

        {/* One-sample inputs */}
        {mode === 'one' && (
          <div className="bs-group-card">
            <div className="bs-group-title">{ts.zOneSample}</div>
            <div className="bs-group-grid">
              <div className="bs-input-group">
                <label className="bs-label">{ts.zSampleMean}</label>
                <input type="number" className="bs-number-input" step="any" value={one.xbar} onChange={setOneField('xbar')} />
              </div>
              <div className="bs-input-group">
                <label className="bs-label">{ts.zPopMean}</label>
                <input type="number" className="bs-number-input" step="any" value={one.mu0} onChange={setOneField('mu0')} />
              </div>
              <div className="bs-input-group">
                <label className="bs-label">{ts.zPopSD}</label>
                <input type="number" className="bs-number-input" min={0.001} step="any" value={one.sigma} onChange={setOneField('sigma')} />
              </div>
              <div className="bs-input-group">
                <label className="bs-label">{ts.nLabel}</label>
                <input type="number" className="bs-number-input" min={1} step={1} value={one.n} onChange={setOneField('n')} />
              </div>
            </div>
          </div>
        )}

        {/* Two-sample inputs */}
        {mode === 'two' && (
          <>
            <div className="bs-group-card">
              <div className="bs-group-title">{ts.group1}</div>
              <div className="bs-group-grid">
                <div className="bs-input-group">
                  <label className="bs-label">{ts.meanLabel}</label>
                  <input type="number" className="bs-number-input" step="any" value={two.mean1} onChange={setTwoField('mean1')} />
                </div>
                <div className="bs-input-group">
                  <label className="bs-label">{ts.zPopSD}</label>
                  <input type="number" className="bs-number-input" min={0.001} step="any" value={two.sigma1} onChange={setTwoField('sigma1')} />
                </div>
                <div className="bs-input-group">
                  <label className="bs-label">{ts.nLabel}</label>
                  <input type="number" className="bs-number-input" min={1} step={1} value={two.n1} onChange={setTwoField('n1')} />
                </div>
              </div>
            </div>
            <div className="bs-group-card">
              <div className="bs-group-title">{ts.group2}</div>
              <div className="bs-group-grid">
                <div className="bs-input-group">
                  <label className="bs-label">{ts.meanLabel}</label>
                  <input type="number" className="bs-number-input" step="any" value={two.mean2} onChange={setTwoField('mean2')} />
                </div>
                <div className="bs-input-group">
                  <label className="bs-label">{ts.zPopSD}</label>
                  <input type="number" className="bs-number-input" min={0.001} step="any" value={two.sigma2} onChange={setTwoField('sigma2')} />
                </div>
                <div className="bs-input-group">
                  <label className="bs-label">{ts.nLabel}</label>
                  <input type="number" className="bs-number-input" min={1} step={1} value={two.n2} onChange={setTwoField('n2')} />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Educational note */}
        <div className="bs-warning" style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border-color-light)', color: 'var(--text-muted)' }}>
          <span className="bs-warning-icon">ℹ</span>
          <span>{ts.zNote}</span>
        </div>

        {/* Formula */}
        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            {mode === 'one' ? (
              <div className="formula-row">
                <span className="formula-name">z</span>
                <span className="formula-expr">= (x̄ − μ₀) / (σ / √n)</span>
              </div>
            ) : (
              <div className="formula-row">
                <span className="formula-name">z</span>
                <span className="formula-expr">= (x̄₁ − x̄₂) / √(σ₁²/n₁ + σ₂²/n₂)</span>
              </div>
            )}
            <div className="formula-row">
              <span className="formula-name">p</span>
              <span className="formula-expr">= 2 × P(Z {'>'} |z|)</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">95% CI</span>
              <span className="formula-expr">= diff ± 1.96 × SE</span>
            </div>
          </div>
        </div>

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
                label={ts.zStat}
                value={result.z.toFixed(3)}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard label="df" value="∞" accent="var(--color-info)" />
              <StatCard
                label={ts.pValue}
                value={fmtP(result.pValue)}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard label={diffLabel} value={result.meanDiff.toFixed(3)} />
            </div>

            <div className="bs-ci-card">
              <span className="bs-ci-label">{ts.ci95} ({diffLabel})</span>
              <span className="bs-ci-value">
                [{result.ciLow.toFixed(3)},&nbsp;{result.ciHigh.toFixed(3)}]
              </span>
              <span className="bs-ci-hint">
                {result.ciLow > 0 || result.ciHigh < 0 ? '✓ excludes 0' : '✗ includes 0'}
              </span>
            </div>

            {/* Z distribution chart */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.zDistTitle}</h2>
                <span className="bs-chart-sub">N(0, 1)</span>
              </div>
              <div className="bs-legend-row">
                <span className="bs-legend-item">
                  <span className="bs-legend-dot" style={{ background: 'var(--color-danger)', opacity: 0.55 }} />
                  {ts.rejectionRegion} (α = 0.05)
                </span>
                <span className="bs-legend-item">
                  <span className="bs-legend-line" style={{ background: 'var(--color-accent)' }} />
                  {ts.observedZ} = {result.z.toFixed(3)}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={curve.data} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="z"
                    type="number"
                    domain={[-curve.zRange, curve.zRange]}
                    tickFormatter={v => Number(v).toFixed(1)}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: 'z', position: 'insideBottomRight', offset: -4, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => v.toFixed(2)} width={44} />
                  <Tooltip content={<ZDistTooltip />} />
                  <Area type="monotone" dataKey="tail" fill="var(--color-danger)" fillOpacity={0.3} stroke="none" isAnimationActive={false} legendType="none" />
                  <Area type="monotone" dataKey="body" fill="var(--color-primary)" fillOpacity={0.12} stroke="none" isAnimationActive={false} legendType="none" />
                  <Line type="monotone" dataKey="pdf" stroke="var(--color-primary)" strokeWidth={2} dot={false} isAnimationActive={false} legendType="none" />
                  <ReferenceLine x={curve.zcrit} stroke="var(--color-danger)" strokeWidth={1} strokeDasharray="4 2" />
                  <ReferenceLine x={-curve.zcrit} stroke="var(--color-danger)" strokeWidth={1} strokeDasharray="4 2" />
                  <ReferenceLine x={result.z} stroke="var(--color-accent)" strokeWidth={2.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">Z</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZTest;
