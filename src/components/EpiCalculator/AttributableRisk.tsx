import React, { useState, useMemo } from 'react';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';

interface Props { lang: Lang }
type SubCalc = 'af' | 'paf';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>
      {value}
    </div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

function afAccent(af: number): string {
  if (af < 0) return 'var(--color-primary)';
  if (af >= 50) return 'var(--color-danger)';
  if (af >= 25) return 'var(--color-accent)';
  return 'var(--color-info)';
}

// ── Attributable Fraction (AF%) ────────────────────────────────────────────────
const AFCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].attributableRisk;
  const tc = translations[lang].common;
  const [rr, setRr] = useState('2.5');
  const [showFormula, setShowFormula] = useState(false);

  const result = useMemo(() => {
    const r = parseFloat(rr);
    if (!isFinite(r) || r <= 0) return null;
    const af = ((r - 1) / r) * 100;
    return { af, rr: r };
  }, [rr]);

  const interp = useMemo((): string | null => {
    if (!result) return null;
    const { af } = result;
    if (af < 0)   return ts.afNeg;
    if (af >= 75) return ts.afVeryHigh;
    if (af >= 50) return ts.afHigh;
    if (af >= 25) return ts.afMod;
    return ts.afLow;
  }, [result, ts]);

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.tabAF}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.rrLabel}</label>
            <input
              type="number"
              className="bs-number-input"
              min={0.01}
              step={0.1}
              value={rr}
              onChange={e => setRr(e.target.value)}
            />
          </div>
        </div>

        {/* Collapsible formula */}
        <div className="formula-box">
          <button
            className="ds-formula-toggle"
            onClick={() => setShowFormula(v => !v)}
          >
            <span className="formula-box-title" style={{ marginBottom: 0 }}>
              {tc.formula}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {showFormula ? tc.showLess : tc.showMore}
            </span>
          </button>
          {showFormula && (
            <div className="formula-list" style={{ marginTop: 'var(--space-3)' }}>
              <div className="formula-row">
                <span className="formula-name">AF</span>
                <span className="formula-expr">= (RR − 1) / RR × 100</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">RR</span>
                <span className="formula-expr">= Risk(exposed) / Risk(unexposed)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">AF = 0</span>
                <span className="formula-expr">when RR = 1 (no association)</span>
              </div>
            </div>
          )}
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setRr('2.5')}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => setRr('')}>
            {ts.reset}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result ? (
          <>
            <div className="bs-stats-grid">
              <StatCard
                label={ts.afResult}
                value={`${result.af.toFixed(2)}%`}
                accent={afAccent(result.af)}
              />
              <StatCard
                label={ts.rrLabel}
                value={result.rr.toFixed(2)}
                accent="var(--color-info)"
              />
            </div>

            {interp && (
              <div className="bs-interp-card">
                <div className="bs-interp-title">{tc.interpretation}</div>
                <div className="bs-interp-body">{interp}</div>
              </div>
            )}

            <div className="bs-note">
              <span style={{ flexShrink: 0 }}>ℹ</span>
              <span>{ts.afNote}</span>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">AF%</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Population Attributable Fraction (PAF%) ────────────────────────────────────
const PAFCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].attributableRisk;
  const tc = translations[lang].common;
  const [rr, setRr] = useState('2.5');
  const [pe, setPe] = useState('30');
  const [showFormula, setShowFormula] = useState(false);

  const result = useMemo(() => {
    const r = parseFloat(rr);
    const p = parseFloat(pe) / 100;
    if (!isFinite(r) || !isFinite(p) || r <= 0 || p < 0 || p > 1) return null;
    const numer = p * (r - 1);
    const paf = (numer / (1 + numer)) * 100;
    const af  = ((r - 1) / r) * 100;
    return { paf, af, rr: r, pe: p * 100 };
  }, [rr, pe]);

  const interp = useMemo((): string | null => {
    if (!result) return null;
    const { paf } = result;
    if (paf < 0)   return ts.pafNeg;
    if (paf >= 50) return ts.pafHigh;
    if (paf >= 25) return ts.pafMod;
    return ts.pafLow;
  }, [result, ts]);

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.tabPAF}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.rrLabel}</label>
            <input
              type="number"
              className="bs-number-input"
              min={0.01}
              step={0.1}
              value={rr}
              onChange={e => setRr(e.target.value)}
            />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.peLabel}</label>
            <input
              type="number"
              className="bs-number-input"
              min={0}
              max={100}
              step={1}
              value={pe}
              onChange={e => setPe(e.target.value)}
            />
          </div>
        </div>

        {/* Collapsible formula */}
        <div className="formula-box">
          <button
            className="ds-formula-toggle"
            onClick={() => setShowFormula(v => !v)}
          >
            <span className="formula-box-title" style={{ marginBottom: 0 }}>
              {tc.formula}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {showFormula ? tc.showLess : tc.showMore}
            </span>
          </button>
          {showFormula && (
            <div className="formula-list" style={{ marginTop: 'var(--space-3)' }}>
              <div className="formula-row">
                <span className="formula-name">PAF</span>
                <span className="formula-expr">= Pe(RR−1) / [1+Pe(RR−1)] × 100</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">Pe</span>
                <span className="formula-expr">= proportion exposed (0–1)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">AF</span>
                <span className="formula-expr">= (RR−1) / RR × 100</span>
              </div>
            </div>
          )}
        </div>

        <div className="calc-actions">
          <button
            className="btn btn-secondary"
            onClick={() => { setRr('2.5'); setPe('30'); }}
          >
            {ts.loadExample}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setRr(''); setPe(''); }}
          >
            {ts.reset}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result ? (
          <>
            <div className="bs-stats-grid">
              <StatCard
                label={ts.pafResult}
                value={`${result.paf.toFixed(2)}%`}
                accent={afAccent(result.paf)}
              />
              <StatCard
                label={ts.afResult}
                value={`${result.af.toFixed(2)}%`}
                sub={ts.afResultHint}
                accent="var(--color-info)"
              />
            </div>

            {interp && (
              <div className="bs-interp-card">
                <div className="bs-interp-title">{tc.interpretation}</div>
                <div className="bs-interp-body">{interp}</div>
              </div>
            )}

            <div className="bs-note">
              <span style={{ flexShrink: 0 }}>ℹ</span>
              <span>{ts.pafNote}</span>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">PAF%</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main AttributableRisk component ───────────────────────────────────────────
const AttributableRisk: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].attributableRisk;
  const [sub, setSub] = useState<SubCalc>('af');

  return (
    <div>
      <div className="bs-subtab-bar epi-sub2-bar">
        {([
          ['af',  ts.tabAF],
          ['paf', ts.tabPAF],
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

      {sub === 'af'  && <AFCalc  lang={lang} />}
      {sub === 'paf' && <PAFCalc lang={lang} />}
    </div>
  );
};

export default AttributableRisk;
