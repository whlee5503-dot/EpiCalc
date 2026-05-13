import React, { useState, useMemo } from 'react';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';

interface Props { lang: Lang }

type SubCalc = 'ar' | 'sar' | 'cmr' | 'cfr' | 'aar';

// Wilson score CI for a proportion
function wilsonCI(k: number, n: number, z = 1.96): [number, number] {
  if (n <= 0) return [0, 0];
  const p = k / n;
  const denom = 1 + z * z / n;
  const centre = (p + z * z / (2 * n)) / denom;
  const margin = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / denom;
  return [Math.max(0, centre - margin) * 100, Math.min(100, centre + margin) * 100];
}

// WHO World Standard Population weights (8 age groups, each 12.5%)
const WHO_WEIGHTS = [0.0886, 0.0869, 0.0860, 0.0847, 0.0822, 0.0793, 0.0761, 0.0667, 0.0597, 0.0505, 0.0422, 0.0321, 0.0235, 0.0155, 0.0091, 0.0046, 0.0021];
// US 2000 Standard Population weights (17 age groups)
const US_WEIGHTS =  [0.0686, 0.0724, 0.0732, 0.0721, 0.0664, 0.0645, 0.0643, 0.0641, 0.0636, 0.0617, 0.0435, 0.0388, 0.0348, 0.0296, 0.0214, 0.0194, 0.0135];

interface Stratum { ageGroup: string; cases: string; population: string }
const DEFAULT_STRATA: Stratum[] = [
  { ageGroup: '0–14', cases: '12', population: '5000' },
  { ageGroup: '15–44', cases: '45', population: '20000' },
  { ageGroup: '45–64', cases: '38', population: '12000' },
  { ageGroup: '65+', cases: '62', population: '8000' },
];

interface StatCardProps { label: string; value: React.ReactNode; sub?: string; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

// ─── Attack Rate ──────────────────────────────────────────────────────────────
const ARCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].attackRate;
  const tc = translations[lang].common;
  const [cases, setCases] = useState('85');
  const [pop, setPop] = useState('1000');

  const result = useMemo(() => {
    const k = parseFloat(cases);
    const n = parseFloat(pop);
    if (!isFinite(k) || !isFinite(n) || n <= 0 || k < 0 || k > n) return null;
    const ar = (k / n) * 100;
    const [lo, hi] = wilsonCI(k, n);
    return { ar, lo, hi };
  }, [cases, pop]);

  return (
    <div className="bs-layout">
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.tabAR}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.cases}</label>
            <input type="number" className="bs-number-input" min={0} value={cases}
              onChange={e => setCases(e.target.value)} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.popAtRisk}</label>
            <input type="number" className="bs-number-input" min={1} value={pop}
              onChange={e => setPop(e.target.value)} />
          </div>
        </div>

        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">AR</span>
              <span className="formula-expr">= (cases / pop at risk) × 100</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">95% CI</span>
              <span className="formula-expr">Wilson score interval</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => { setCases('85'); setPop('1000'); }}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => { setCases(''); setPop(''); }}>
            {ts.reset}
          </button>
        </div>
      </div>

      <div className="bs-right">
        {result ? (
          <div className="bs-stats-grid">
            <StatCard label={ts.arResult} value={`${result.ar.toFixed(2)}%`} accent="var(--color-primary)" />
            <StatCard label={ts.arCI}
              value={`${result.lo.toFixed(2)}% – ${result.hi.toFixed(2)}%`}
              sub="Wilson score"
              accent="var(--color-info)" />
          </div>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">AR</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Secondary Attack Rate ────────────────────────────────────────────────────
const SARCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].attackRate;
  const tc = translations[lang].common;
  const [secondary, setSecondary] = useState('12');
  const [contacts, setContacts] = useState('80');

  const result = useMemo(() => {
    const k = parseFloat(secondary);
    const n = parseFloat(contacts);
    if (!isFinite(k) || !isFinite(n) || n <= 0 || k < 0 || k > n) return null;
    const sar = (k / n) * 100;
    const [lo, hi] = wilsonCI(k, n);
    return { sar, lo, hi };
  }, [secondary, contacts]);

  return (
    <div className="bs-layout">
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.tabSAR}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.secondaryCases}</label>
            <input type="number" className="bs-number-input" min={0} value={secondary}
              onChange={e => setSecondary(e.target.value)} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.totalContacts}</label>
            <input type="number" className="bs-number-input" min={1} value={contacts}
              onChange={e => setContacts(e.target.value)} />
          </div>
        </div>

        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">SAR</span>
              <span className="formula-expr">= (2° cases / contacts) × 100</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => { setSecondary('12'); setContacts('80'); }}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => { setSecondary(''); setContacts(''); }}>
            {ts.reset}
          </button>
        </div>
      </div>

      <div className="bs-right">
        {result ? (
          <div className="bs-stats-grid">
            <StatCard label={ts.sarResult} value={`${result.sar.toFixed(2)}%`} accent="var(--color-primary)" />
            <StatCard label={ts.arCI}
              value={`${result.lo.toFixed(2)}% – ${result.hi.toFixed(2)}%`}
              sub="Wilson score"
              accent="var(--color-info)" />
          </div>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">SAR</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Crude Mortality Rate ─────────────────────────────────────────────────────
const CMRCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].attackRate;
  const tc = translations[lang].common;
  const [deaths, setDeaths] = useState('250');
  const [pop, setPop] = useState('100000');
  const [years, setYears] = useState('1');
  const [scale, setScale] = useState<1000 | 100000>(1000);

  const result = useMemo(() => {
    const d = parseFloat(deaths);
    const n = parseFloat(pop);
    const y = parseFloat(years);
    if (!isFinite(d) || !isFinite(n) || !isFinite(y) || n <= 0 || y <= 0 || d < 0) return null;
    const cmr = (d / (n * y)) * scale;
    return { cmr, scale };
  }, [deaths, pop, years, scale]);

  return (
    <div className="bs-layout">
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.tabCMR}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.deaths}</label>
            <input type="number" className="bs-number-input" min={0} value={deaths}
              onChange={e => setDeaths(e.target.value)} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.population}</label>
            <input type="number" className="bs-number-input" min={1} value={pop}
              onChange={e => setPop(e.target.value)} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.timePeriod}</label>
            <input type="number" className="bs-number-input" min={0.01} step={0.1} value={years}
              onChange={e => setYears(e.target.value)} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.rateScale}</label>
            <select className="bs-select" value={scale}
              onChange={e => setScale(Number(e.target.value) as 1000 | 100000)}>
              <option value={1000}>{ts.rateScalePer1k}</option>
              <option value={100000}>{ts.rateScalePer100k}</option>
            </select>
          </div>
        </div>

        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">CMR</span>
              <span className="formula-expr">= deaths / (pop × years) × {scale.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary"
            onClick={() => { setDeaths('250'); setPop('100000'); setYears('1'); }}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost"
            onClick={() => { setDeaths(''); setPop(''); setYears(''); }}>
            {ts.reset}
          </button>
        </div>
      </div>

      <div className="bs-right">
        {result ? (
          <div className="bs-stats-grid">
            <StatCard
              label={ts.cmrResult}
              value={result.cmr.toFixed(2)}
              sub={scale === 1000 ? ts.rateScalePer1k : ts.rateScalePer100k}
              accent="var(--color-primary)" />
          </div>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">CMR</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Case Fatality Rate ───────────────────────────────────────────────────────
const CFRCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].attackRate;
  const tc = translations[lang].common;
  const [deaths, setDeaths] = useState('45');
  const [cases, setCases] = useState('500');

  const result = useMemo(() => {
    const d = parseFloat(deaths);
    const c = parseFloat(cases);
    if (!isFinite(d) || !isFinite(c) || c <= 0 || d < 0 || d > c) return null;
    const cfr = (d / c) * 100;
    const [lo, hi] = wilsonCI(d, c);
    return { cfr, lo, hi };
  }, [deaths, cases]);

  return (
    <div className="bs-layout">
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.tabCFR}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.deaths}</label>
            <input type="number" className="bs-number-input" min={0} value={deaths}
              onChange={e => setDeaths(e.target.value)} />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.confirmedCases}</label>
            <input type="number" className="bs-number-input" min={1} value={cases}
              onChange={e => setCases(e.target.value)} />
          </div>
        </div>

        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">CFR</span>
              <span className="formula-expr">= (deaths / cases) × 100</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => { setDeaths('45'); setCases('500'); }}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => { setDeaths(''); setCases(''); }}>
            {ts.reset}
          </button>
        </div>
      </div>

      <div className="bs-right">
        {result ? (
          <div className="bs-stats-grid">
            <StatCard label={ts.cfrResult} value={`${result.cfr.toFixed(2)}%`} accent="var(--color-danger)" />
            <StatCard label={ts.arCI}
              value={`${result.lo.toFixed(2)}% – ${result.hi.toFixed(2)}%`}
              sub="Wilson score"
              accent="var(--color-info)" />
          </div>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">CFR</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Age-Adjusted Rate ────────────────────────────────────────────────────────
const AARCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].attackRate;
  const tc = translations[lang].common;
  const [strata, setStrata] = useState<Stratum[]>(DEFAULT_STRATA);
  const [stdType, setStdType] = useState<'who' | 'us'>('who');

  const result = useMemo(() => {
    const weights = stdType === 'who' ? WHO_WEIGHTS : US_WEIGHTS;
    const rows = strata.map(s => ({
      cases: parseFloat(s.cases),
      pop: parseFloat(s.population),
    }));
    if (rows.some(r => !isFinite(r.cases) || !isFinite(r.pop) || r.pop <= 0 || r.cases < 0)) return null;

    let aar = 0;
    let totalWeight = 0;
    rows.forEach((r, i) => {
      const w = weights[i] ?? (1 / strata.length);
      const rate = r.cases / r.pop;
      aar += rate * w;
      totalWeight += w;
    });
    if (totalWeight > 0) aar /= totalWeight;
    return { aar: aar * 100000 };
  }, [strata, stdType]);

  const updateStratum = (i: number, field: keyof Stratum, val: string) => {
    setStrata(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  return (
    <div className="bs-layout">
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="sir-section-label">{ts.tabAAR}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.stdPopType}</label>
            <select className="bs-select" value={stdType}
              onChange={e => setStdType(e.target.value as 'who' | 'us')}>
              <option value="who">{ts.whoStd}</option>
              <option value="us">{ts.usStd}</option>
            </select>
          </div>
        </div>

        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">AAR</span>
              <span className="formula-expr">= Σ(rate_i × w_i) × 100,000</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">w_i</span>
              <span className="formula-expr">= standard pop weight</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setStrata(DEFAULT_STRATA)}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost"
            onClick={() => setStrata([{ ageGroup: '', cases: '', population: '' }])}>
            {ts.reset}
          </button>
        </div>
      </div>

      <div className="bs-right">
        {/* Strata table */}
        <div className="aar-strata-card">
          <div className="aar-strata-header">
            <span>{ts.ageGroup}</span>
            <span>{ts.casesCol}</span>
            <span>{ts.popCol}</span>
          </div>
          {strata.map((s, i) => (
            <div key={i} className="aar-strata-row">
              <input className="bs-number-input aar-cell" placeholder={ts.ageGroup}
                value={s.ageGroup}
                onChange={e => updateStratum(i, 'ageGroup', e.target.value)} />
              <input type="number" className="bs-number-input aar-cell" min={0}
                value={s.cases}
                onChange={e => updateStratum(i, 'cases', e.target.value)} />
              <input type="number" className="bs-number-input aar-cell" min={1}
                value={s.population}
                onChange={e => updateStratum(i, 'population', e.target.value)} />
            </div>
          ))}
          <div className="aar-strata-controls">
            <button className="bs-tbl-btn"
              onClick={() => setStrata(prev => [...prev, { ageGroup: '', cases: '', population: '' }])}>
              {ts.addStratum}
            </button>
            <button className="bs-tbl-btn" disabled={strata.length <= 1}
              onClick={() => setStrata(prev => prev.slice(0, -1))}>
              {ts.removeStratum}
            </button>
          </div>
        </div>

        {result ? (
          <div className="bs-stats-grid">
            <StatCard
              label={ts.aarResult}
              value={result.aar.toFixed(2)}
              sub={ts.aarUnit}
              accent="var(--color-primary)" />
          </div>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">AAR</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main AttackRate component ────────────────────────────────────────────────
const AttackRate: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].attackRate;
  const [sub, setSub] = useState<SubCalc>('ar');

  return (
    <div>
      <div className="bs-subtab-bar epi-sub2-bar">
        {([
          ['ar',  ts.tabAR],
          ['sar', ts.tabSAR],
          ['cmr', ts.tabCMR],
          ['cfr', ts.tabCFR],
          ['aar', ts.tabAAR],
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

      {sub === 'ar'  && <ARCalc  lang={lang} />}
      {sub === 'sar' && <SARCalc lang={lang} />}
      {sub === 'cmr' && <CMRCalc lang={lang} />}
      {sub === 'cfr' && <CFRCalc lang={lang} />}
      {sub === 'aar' && <AARCalc lang={lang} />}
    </div>
  );
};

export default AttackRate;
