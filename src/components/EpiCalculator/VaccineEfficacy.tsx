import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';

interface Props { lang: Lang }
type SubCalc = 've' | 'hit' | 'nnv';

interface StatCardProps { label: string; value: React.ReactNode; sub?: string; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

// Log-based 95% CI for VE
function veCI(aru: number, arv: number): [number, number] {
  if (aru <= 0 || arv < 0 || arv >= aru) return [NaN, NaN];
  const rr = arv / aru;
  const n1 = Math.round(arv * 10000);
  const n2 = Math.round(aru * 10000);
  if (n1 <= 0 || n2 <= 0) return [NaN, NaN];
  const se = Math.sqrt(1 / n1 - 1 / 10000 + 1 / n2 - 1 / 10000);
  const lnRR = Math.log(rr);
  const lo = Math.exp(lnRR - 1.96 * se);
  const hi = Math.exp(lnRR + 1.96 * se);
  return [(1 - hi) * 100, (1 - lo) * 100];
}

// ─── Vaccine Efficacy ─────────────────────────────────────────────────────────
const VECalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].vaccineEfficacy;
  const tc = translations[lang].common;
  const [aru, setAru] = useState('18.5');
  const [arv, setArv] = useState('3.2');

  const result = useMemo(() => {
    const u = parseFloat(aru) / 100;
    const v = parseFloat(arv) / 100;
    if (!isFinite(u) || !isFinite(v) || u <= 0 || v < 0 || v > u) return null;
    const rr = v / u;
    const ve = (1 - rr) * 100;
    const [lo, hi] = veCI(u, v);
    return { ve, rr, lo, hi };
  }, [aru, arv]);

  return (
    <div className="bs-layout">
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.tabVE}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.aruLabel}</label>
            <input type="number" className="bs-number-input" min={0} max={100} step={0.1}
              value={aru} onChange={e => setAru(e.target.value)} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.arvLabel}</label>
            <input type="number" className="bs-number-input" min={0} max={100} step={0.1}
              value={arv} onChange={e => setArv(e.target.value)} />
          </div>
        </div>

        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">VE</span>
              <span className="formula-expr">= (1 − RR) × 100</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">RR</span>
              <span className="formula-expr">= ARV / ARU</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">VE</span>
              <span className="formula-expr">= (ARU − ARV) / ARU × 100</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => { setAru('18.5'); setArv('3.2'); }}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => { setAru(''); setArv(''); }}>
            {ts.reset}
          </button>
        </div>
      </div>

      <div className="bs-right">
        {result ? (
          <>
            <div className="bs-stats-grid">
              <StatCard
                label={ts.veResult}
                value={`${result.ve.toFixed(1)}%`}
                accent={result.ve >= 50 ? 'var(--color-primary)' : 'var(--color-danger)'} />
              <StatCard
                label={ts.rrLabel}
                value={result.rr.toFixed(3)}
                accent="var(--color-info)" />
            </div>
            {isFinite(result.lo) && (
              <div className="bs-ci-card">
                <span className="bs-ci-label">{ts.veCI}</span>
                <span className="bs-ci-value">
                  {result.lo.toFixed(1)}% – {result.hi.toFixed(1)}%
                </span>
                <span className="bs-ci-hint">95% CI (log method)</span>
              </div>
            )}
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">VE</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Herd Immunity Threshold ──────────────────────────────────────────────────
const HITCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].vaccineEfficacy;
  const tc = translations[lang].common;
  const [r0, setR0] = useState('3.0');

  const result = useMemo(() => {
    const R = parseFloat(r0);
    if (!isFinite(R) || R <= 1) return null;
    const hit = (1 - 1 / R) * 100;
    return { hit };
  }, [r0]);

  const curveData = useMemo(() => {
    const pts = [];
    for (let r = 1.1; r <= 20; r += 0.1) {
      pts.push({ r0: parseFloat(r.toFixed(1)), hit: parseFloat(((1 - 1 / r) * 100).toFixed(1)) });
    }
    return pts;
  }, []);

  const currentR0 = parseFloat(r0);

  return (
    <div className="bs-layout">
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.tabHIT}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.r0Label}</label>
            <input type="number" className="bs-number-input" min={1.01} max={50} step={0.1}
              value={r0} onChange={e => setR0(e.target.value)} />
          </div>
        </div>

        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">HIT</span>
              <span className="formula-expr">= 1 − (1 / R₀)</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setR0('3.0')}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => setR0('')}>
            {ts.reset}
          </button>
        </div>
      </div>

      <div className="bs-right">
        {result ? (
          <>
            <div className="bs-stats-grid">
              <StatCard
                label={ts.hitResult}
                value={`${result.hit.toFixed(1)}%`}
                accent="var(--color-primary)" />
              <StatCard
                label={ts.hitCoverage}
                value={`≥ ${result.hit.toFixed(1)}%`}
                sub={`R₀ = ${r0}`}
                accent="var(--color-accent)" />
            </div>

            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h3 className="bs-chart-title">{ts.hitCurveTitle}</h3>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={curveData} margin={{ top: 8, right: 16, bottom: 16, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="r0"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: ts.r0Axis, position: 'insideBottom', offset: -8, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    width={46}
                    label={{ value: ts.hitAxis, angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10, dx: -4 }}
                  />
                  <Tooltip
                    formatter={(v) => [`${Number(v).toFixed(1)}%`, ts.hitAxis]}
                    labelFormatter={(r) => `R₀ = ${r}`}
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                    }}
                  />
                  {isFinite(currentR0) && currentR0 > 1 && (
                    <ReferenceLine x={currentR0} stroke="var(--color-accent)" strokeDasharray="5 3" />
                  )}
                  {result && (
                    <ReferenceLine y={result.hit} stroke="var(--color-primary)" strokeDasharray="5 3" />
                  )}
                  <Line
                    type="monotone"
                    dataKey="hit"
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
            <div className="bs-empty-icon">HIT</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Number Needed to Vaccinate ───────────────────────────────────────────────
const NNVCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].vaccineEfficacy;
  const tc = translations[lang].common;
  const [aru, setAru] = useState('18.5');
  const [arv, setArv] = useState('3.2');

  const result = useMemo(() => {
    const u = parseFloat(aru) / 100;
    const v = parseFloat(arv) / 100;
    if (!isFinite(u) || !isFinite(v) || u <= 0 || v < 0 || v >= u) return null;
    const arr = u - v;
    const nnv = 1 / arr;
    return { nnv, arr: arr * 100 };
  }, [aru, arv]);

  return (
    <div className="bs-layout">
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.tabNNV}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.aruLabel}</label>
            <input type="number" className="bs-number-input" min={0} max={100} step={0.1}
              value={aru} onChange={e => setAru(e.target.value)} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.arvLabel}</label>
            <input type="number" className="bs-number-input" min={0} max={100} step={0.1}
              value={arv} onChange={e => setArv(e.target.value)} />
          </div>
        </div>

        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">NNV</span>
              <span className="formula-expr">= 1 / (ARU − ARV)</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">ARR</span>
              <span className="formula-expr">= ARU − ARV</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => { setAru('18.5'); setArv('3.2'); }}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => { setAru(''); setArv(''); }}>
            {ts.reset}
          </button>
        </div>
      </div>

      <div className="bs-right">
        {result ? (
          <div className="bs-stats-grid">
            <StatCard
              label={ts.nnvResult}
              value={result.nnv.toFixed(1)}
              sub={ts.nnvHint}
              accent="var(--color-primary)" />
            <StatCard
              label={ts.absRiskReduction}
              value={`${result.arr.toFixed(2)}%`}
              accent="var(--color-accent)" />
          </div>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">NNV</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main VaccineEfficacy component ───────────────────────────────────────────
const VaccineEfficacy: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].vaccineEfficacy;
  const [sub, setSub] = useState<SubCalc>('ve');

  return (
    <div>
      <div className="bs-subtab-bar epi-sub2-bar">
        {([
          ['ve',  ts.tabVE],
          ['hit', ts.tabHIT],
          ['nnv', ts.tabNNV],
        ] as [SubCalc, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`bs-subtab-btn${sub === key ? ' active' : ''}`}
            onClick={() => setSub(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === 've'  && <VECalc  lang={lang} />}
      {sub === 'hit' && <HITCalc lang={lang} />}
      {sub === 'nnv' && <NNVCalc lang={lang} />}
    </div>
  );
};

export default VaccineEfficacy;
