import React, { useState, useMemo } from 'react';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';

interface Props { lang: Lang }

const DEFAULT = { deaths: '50000', lifeExp: '32', cases: '200000', dw: '0.35', duration: '5' };
const EMPTY   = { deaths: '', lifeExp: '', cases: '', dw: '', duration: '' };

interface StatCardProps { label: string; value: React.ReactNode; sub?: string; accent?: string; wide?: boolean }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent, wide }) => (
  <div className={`bs-stat-card${wide ? ' bs-stat-card--wide' : ''}`}>
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

function fmtLarge(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(1);
}

const BurdenOfDisease: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].burden;
  const tc = translations[lang].common;
  const [s, setS] = useState(DEFAULT);

  const set = (field: keyof typeof DEFAULT) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS(prev => ({ ...prev, [field]: e.target.value }));

  const result = useMemo(() => {
    const deaths  = parseFloat(s.deaths);
    const lifeExp = parseFloat(s.lifeExp);
    const cases   = parseFloat(s.cases);
    const dw      = parseFloat(s.dw);
    const dur     = parseFloat(s.duration);

    if ([deaths, lifeExp, cases, dw, dur].some(v => !isFinite(v) || v < 0)) return null;
    if (dw > 1) return null;

    const yll  = deaths * lifeExp;
    const yld  = cases * dw * dur;
    const daly = yll + yld;
    return { yll, yld, daly, pctYLL: (yll / daly) * 100, pctYLD: (yld / daly) * 100 };
  }, [s]);

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.dalyTitle}</div>

          <div className="bs-input-group">
            <label className="bs-label">{ts.deaths}</label>
            <input type="number" className="bs-number-input" min={0} value={s.deaths} onChange={set('deaths')} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.lifeExpectancy}</label>
            <input type="number" className="bs-number-input" min={0} step={0.1} value={s.lifeExp} onChange={set('lifeExp')} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.cases}</label>
            <input type="number" className="bs-number-input" min={0} value={s.cases} onChange={set('cases')} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.disabilityWeight}</label>
            <input type="number" className="bs-number-input" min={0} max={1} step={0.01} value={s.dw} onChange={set('dw')} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.duration}</label>
            <input type="number" className="bs-number-input" min={0} step={0.1} value={s.duration} onChange={set('duration')} />
          </div>
        </div>

        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">DALY</span>
              <span className="formula-expr">= YLL + YLD</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">YLL</span>
              <span className="formula-expr">= deaths × life exp.</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">YLD</span>
              <span className="formula-expr">= cases × DW × duration</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setS(DEFAULT)}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => setS(EMPTY)}>
            {ts.reset}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result ? (
          <>
            {/* Main DALY result */}
            <div className="daly-hero-card">
              <div className="bs-stat-label">{ts.dalyTitle}</div>
              <div className="daly-hero-value">{fmtLarge(result.daly)}</div>
              <div className="daly-hero-sub">DALYs</div>
            </div>

            {/* YLL + YLD breakdown */}
            <div className="bs-stats-grid">
              <StatCard
                label={ts.yllTitle}
                value={fmtLarge(result.yll)}
                sub={`${result.pctYLL.toFixed(1)}% of DALYs`}
                accent="var(--color-danger)" />
              <StatCard
                label={ts.yldTitle}
                value={fmtLarge(result.yld)}
                sub={`${result.pctYLD.toFixed(1)}% of DALYs`}
                accent="var(--color-info)" />
            </div>

            {/* DALY bar breakdown */}
            <div className="daly-bar-card">
              <div className="daly-bar-label">
                <span style={{ color: 'var(--color-danger)' }}>YLL {result.pctYLL.toFixed(0)}%</span>
                <span style={{ color: 'var(--color-info)' }}>YLD {result.pctYLD.toFixed(0)}%</span>
              </div>
              <div className="daly-bar">
                <div className="daly-bar__yll" style={{ width: `${result.pctYLL}%` }} />
                <div className="daly-bar__yld" style={{ width: `${result.pctYLD}%` }} />
              </div>
            </div>

            {/* Note */}
            <div className="bs-warning" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-surface-2)', color: 'var(--text-secondary)' }}>
              <span className="bs-warning-icon">ℹ</span>
              <span>{ts.dalyNote}</span>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">DALY</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BurdenOfDisease;
