import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import {
  calcIngestionCDI, calcInhalationCDI, calcDermalCDI,
  calcHQ, interpretHQ,
  calcCancerRisk, interpretCancerRisk, formatSciParts, riskToScalePosition,
  calcQALY, calcTotalYears, calcQALYLoss,
} from '../../utils/envHealth';
import type { ExposureRoute, HQLevel, CancerRiskLevel, HealthState } from '../../utils/envHealth';
import './EnvHealthRisk.css';

interface Props { lang: Lang }
type SubTab = 'qaly' | 'hq' | 'cancer';

// ─── Shared mini-components ──────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

// ─── QALY Calculator ─────────────────────────────────────────────────────────

const QALY_EXAMPLE: HealthState[] = [
  { id: '1', label: 'Full Health',        utility: 1.00, years: 10 },
  { id: '2', label: 'Mild Illness',       utility: 0.72, years: 5  },
  { id: '3', label: 'Severe Disability',  utility: 0.32, years: 3  },
];

const QALY_EMPTY: HealthState[] = [
  { id: '1', label: '', utility: 1, years: 1 },
];

let nextId = 100;

const QALYCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].envHealth;
  const tc = translations[lang].common;
  const [states, setStates] = useState<HealthState[]>(QALY_EXAMPLE);
  const [showFormula, setShowFormula] = useState(false);

  const addState = useCallback(() => {
    setStates(prev => [
      ...prev,
      { id: String(++nextId), label: '', utility: 0.5, years: 1 },
    ]);
  }, []);

  const removeState = useCallback((id: string) => {
    setStates(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateState = useCallback(
    (id: string, field: keyof HealthState, raw: string | number) => {
      setStates(prev => prev.map(s => {
        if (s.id !== id) return s;
        if (field === 'label') return { ...s, label: raw as string };
        const v = typeof raw === 'number' ? raw : parseFloat(raw as string);
        return { ...s, [field]: isFinite(v) ? v : (s[field] as number) };
      }));
    },
    [],
  );

  const result = useMemo(() => {
    const valid = states.every(
      s => isFinite(s.utility) && s.utility >= 0 && s.utility <= 1 &&
           isFinite(s.years) && s.years >= 0,
    );
    if (!valid || states.length === 0) return null;
    const qaly      = calcQALY(states);
    const totalYrs  = calcTotalYears(states);
    const loss      = calcQALYLoss(states);
    const chartData = states.map(s => ({
      name: s.label || `State ${s.id}`,
      qaly: parseFloat((s.utility * s.years).toFixed(3)),
      loss: parseFloat(((1 - s.utility) * s.years).toFixed(3)),
    }));
    return { qaly, totalYrs, loss, chartData };
  }, [states]);

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        {/* Health states table */}
        <div className="eh-states-wrap">
          <div className="eh-section-label" style={{ marginBottom: 'var(--space-3)' }}>
            {ts.tabQALY}
          </div>

          <div className="eh-states-header">
            <span>{ts.qalyLabel}</span>
            <span>{ts.qalyUtility}</span>
            <span>{ts.qalyYears}</span>
            <span></span>
          </div>

          {states.map(s => (
            <div key={s.id} className="eh-state-row">
              <input
                type="text"
                className="bs-number-input"
                placeholder={ts.qalyLabel}
                value={s.label}
                onChange={e => updateState(s.id, 'label', e.target.value)}
              />
              <input
                type="number"
                className="bs-number-input"
                min={0} max={1} step={0.01}
                value={s.utility}
                onChange={e => updateState(s.id, 'utility', e.target.value)}
              />
              <input
                type="number"
                className="bs-number-input"
                min={0} step={0.5}
                value={s.years}
                onChange={e => updateState(s.id, 'years', e.target.value)}
              />
              <button
                className="bs-tbl-btn"
                onClick={() => removeState(s.id)}
                disabled={states.length <= 1}
                title={ts.qalyRemoveState}
              >
                −
              </button>
            </div>
          ))}

          <div className="eh-state-controls">
            <button className="bs-tbl-btn" onClick={addState}>
              {ts.qalyAddState}
            </button>
          </div>
        </div>

        {/* Formula box */}
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
                <span className="formula-name">QALY</span>
                <span className="formula-expr">= Σ (utility × years)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">Loss</span>
                <span className="formula-expr">= Σ years − QALY</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">u</span>
                <span className="formula-expr">= 0 (death) … 1 (perfect health)</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="calc-actions">
          <button
            className="btn btn-secondary"
            onClick={() => setStates(QALY_EXAMPLE.map(s => ({ ...s })))}
          >
            {ts.loadExample}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => setStates(QALY_EMPTY.map(s => ({ ...s })))}
          >
            {ts.reset}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result ? (
          <>
            {/* Hero QALY value */}
            <div className="eh-qaly-hero">
              <div className="bs-stat-label">{ts.qalyTotal}</div>
              <div className="eh-qaly-hero-value">{result.qaly.toFixed(2)}</div>
              <div className="eh-qaly-hero-sub">QALYs</div>
            </div>

            {/* Stats grid */}
            <div className="bs-stats-grid">
              <StatCard
                label={ts.qalyLoss}
                value={result.loss.toFixed(2)}
                sub="QALYs"
                accent="var(--color-danger)"
              />
              <StatCard
                label={ts.qalyTotalYears}
                value={result.totalYrs.toFixed(1)}
                sub={lang === 'ko' ? '년' : 'years'}
                accent="var(--color-info)"
              />
            </div>

            {/* Bar chart */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <span className="bs-chart-title">{ts.qalyChartTitle}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={result.chartData} barSize={36}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-color)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    label={{
                      value: lang === 'ko' ? '년' : 'years',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fill: 'var(--text-muted)', fontSize: 11 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}
                  />
                  <Bar
                    dataKey="qaly"
                    name={ts.qalyBarQALY}
                    stackId="a"
                    fill="var(--color-primary)"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="loss"
                    name={ts.qalyBarLoss}
                    stackId="a"
                    fill="var(--eh-loss)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Note */}
            <div className="bs-note">
              <span style={{ flexShrink: 0 }}>ℹ</span>
              <span>{ts.qalyNote}</span>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">QALY</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Hazard Quotient Calculator ───────────────────────────────────────────────

interface IngFields {
  C: string; IR: string; EF: string; ED: string; BW: string; AT: string; RfD: string;
}
interface InhFields {
  Ca: string; IR: string; ET: string; EF: string; ED: string; BW: string; AT: string; RfD: string;
}
interface DrmFields {
  C: string; SA: string; AF: string; ABS: string; EF: string; ED: string; BW: string; AT: string; RfD: string;
}

const ING_EXAMPLE: IngFields = {
  C: '0.1', IR: '2', EF: '250', ED: '30', BW: '70', AT: '10950', RfD: '0.003',
};
const INH_EXAMPLE: InhFields = {
  Ca: '0.01', IR: '1.25', ET: '8', EF: '250', ED: '25', BW: '70', AT: '9125', RfD: '0.005',
};
const DRM_EXAMPLE: DrmFields = {
  C: '0.005', SA: '5000', AF: '0.2', ABS: '0.1', EF: '60', ED: '25', BW: '70', AT: '9125', RfD: '0.003',
};

const ING_EMPTY: IngFields  = { C: '', IR: '', EF: '', ED: '', BW: '', AT: '', RfD: '' };
const INH_EMPTY: InhFields  = { Ca: '', IR: '', ET: '', EF: '', ED: '', BW: '', AT: '', RfD: '' };
const DRM_EMPTY: DrmFields  = { C: '', SA: '', AF: '', ABS: '', EF: '', ED: '', BW: '', AT: '', RfD: '' };

function hqLevelColor(level: HQLevel): string {
  if (level === 'concern') return 'var(--color-danger)';
  if (level === 'caution') return 'var(--color-accent)';
  return 'var(--color-primary)';
}

const HQCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].envHealth;
  const tc = translations[lang].common;
  const [route, setRoute] = useState<ExposureRoute>('ingestion');
  const [ing, setIng] = useState<IngFields>(ING_EXAMPLE);
  const [inh, setInh] = useState<InhFields>(INH_EXAMPLE);
  const [drm, setDrm] = useState<DrmFields>(DRM_EXAMPLE);
  const [showFormula, setShowFormula] = useState(false);

  const result = useMemo(() => {
    let cdi: number;
    let rfd: number;
    if (route === 'ingestion') {
      const p = { C: +ing.C, IR: +ing.IR, EF: +ing.EF, ED: +ing.ED, BW: +ing.BW, AT: +ing.AT };
      rfd = +ing.RfD;
      if (Object.values(p).some(v => !isFinite(v) || v < 0)) return null;
      cdi = calcIngestionCDI(p);
    } else if (route === 'inhalation') {
      const p = { Ca: +inh.Ca, IR: +inh.IR, ET: +inh.ET, EF: +inh.EF, ED: +inh.ED, BW: +inh.BW, AT: +inh.AT };
      rfd = +inh.RfD;
      if (Object.values(p).some(v => !isFinite(v) || v < 0)) return null;
      cdi = calcInhalationCDI(p);
    } else {
      const p = { C: +drm.C, SA: +drm.SA, AF: +drm.AF, ABS: +drm.ABS, EF: +drm.EF, ED: +drm.ED, BW: +drm.BW, AT: +drm.AT };
      rfd = +drm.RfD;
      if (Object.values(p).some(v => !isFinite(v) || v < 0) || p.ABS > 1) return null;
      cdi = calcDermalCDI(p);
    }
    if (!isFinite(rfd) || rfd <= 0) return null;
    const hq = calcHQ(cdi, rfd);
    if (!isFinite(hq)) return null;
    const level = interpretHQ(hq);
    return { cdi, rfd, hq, level };
  }, [route, ing, inh, drm]);

  const loadExample = () => {
    if (route === 'ingestion')   setIng(ING_EXAMPLE);
    if (route === 'inhalation')  setInh(INH_EXAMPLE);
    if (route === 'dermal')      setDrm(DRM_EXAMPLE);
  };
  const resetAll = () => {
    if (route === 'ingestion')   setIng(ING_EMPTY);
    if (route === 'inhalation')  setInh(INH_EMPTY);
    if (route === 'dermal')      setDrm(DRM_EMPTY);
  };

  // Typed setter helpers
  type Setter<T> = React.Dispatch<React.SetStateAction<T>>;
  function field<T>(setter: Setter<T>, key: keyof T) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setter(prev => ({ ...prev, [key]: e.target.value }));
  }

  const hqDesc = result
    ? (result.level === 'concern'
        ? ts.hqConcernDesc
        : result.level === 'caution'
          ? ts.hqCautionDesc
          : ts.hqSafeDesc)
    : '';

  const trafficItems: { level: HQLevel; label: string; className: string }[] = [
    { level: 'concern', label: ts.hqConcernLabel, className: 'eh-light-cell--concern' },
    { level: 'caution', label: ts.hqCautionLabel, className: 'eh-light-cell--caution' },
    { level: 'safe',    label: ts.hqSafeLabel,    className: 'eh-light-cell--safe'    },
  ];

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        {/* Route selector */}
        <div className="bs-input-panel">
          <div className="bs-input-group">
            <label className="bs-label">{ts.hqRouteLabel}</label>
            <div className="eh-route-bar">
              {(['ingestion', 'inhalation', 'dermal'] as ExposureRoute[]).map(r => (
                <button
                  key={r}
                  className={`eh-route-btn${route === r ? ' active' : ''}`}
                  onClick={() => setRoute(r)}
                >
                  {r === 'ingestion' ? ts.hqIngestion
                    : r === 'inhalation' ? ts.hqInhalation
                    : ts.hqDermal}
                </button>
              ))}
            </div>
          </div>

          <div className="eh-section-label" style={{ marginTop: 'var(--space-2)' }}>
            CDI {lang === 'ko' ? '입력' : 'Inputs'}
          </div>

          {/* Ingestion inputs */}
          {route === 'ingestion' && (<>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqC} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqCUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={0.001} value={ing.C} onChange={field(setIng, 'C')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqIR} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqIRUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={0.1} value={ing.IR} onChange={field(setIng, 'IR')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqEF} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqEFUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} max={365} step={1} value={ing.EF} onChange={field(setIng, 'EF')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqED} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqEDUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={1} value={ing.ED} onChange={field(setIng, 'ED')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqBW} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqBWUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={1} value={ing.BW} onChange={field(setIng, 'BW')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqAT} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqATUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={365} value={ing.AT} onChange={field(setIng, 'AT')} />
            </div>
            <div className="bs-input-group" style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: 'var(--space-3)' }}>
              <label className="bs-label">{ts.hqRfD} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqRfDUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={0.0001} value={ing.RfD} onChange={field(setIng, 'RfD')} />
            </div>
          </>)}

          {/* Inhalation inputs */}
          {route === 'inhalation' && (<>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqCa} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqCaUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={0.001} value={inh.Ca} onChange={field(setInh, 'Ca')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqIRInhale} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqIRInhaleUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={0.1} value={inh.IR} onChange={field(setInh, 'IR')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqET} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqETUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} max={24} step={0.5} value={inh.ET} onChange={field(setInh, 'ET')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqEF} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqEFUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} max={365} step={1} value={inh.EF} onChange={field(setInh, 'EF')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqED} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqEDUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={1} value={inh.ED} onChange={field(setInh, 'ED')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqBW} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqBWUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={1} value={inh.BW} onChange={field(setInh, 'BW')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqAT} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqATUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={365} value={inh.AT} onChange={field(setInh, 'AT')} />
            </div>
            <div className="bs-input-group" style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: 'var(--space-3)' }}>
              <label className="bs-label">{ts.hqRfD} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqRfDUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={0.0001} value={inh.RfD} onChange={field(setInh, 'RfD')} />
            </div>
          </>)}

          {/* Dermal inputs */}
          {route === 'dermal' && (<>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqCSoil} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqCSoilUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={0.001} value={drm.C} onChange={field(setDrm, 'C')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqSA} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqSAUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={100} value={drm.SA} onChange={field(setDrm, 'SA')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqAF} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqAFUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={0.01} value={drm.AF} onChange={field(setDrm, 'AF')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqABS} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(0–1)</span></label>
              <input type="number" className="bs-number-input" min={0} max={1} step={0.01} value={drm.ABS} onChange={field(setDrm, 'ABS')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqEF} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqEFDermalUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={1} value={drm.EF} onChange={field(setDrm, 'EF')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqED} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqEDUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={1} value={drm.ED} onChange={field(setDrm, 'ED')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqBW} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqBWUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={1} value={drm.BW} onChange={field(setDrm, 'BW')} />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.hqAT} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqATUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={365} value={drm.AT} onChange={field(setDrm, 'AT')} />
            </div>
            <div className="bs-input-group" style={{ borderTop: '1px solid var(--border-color-light)', paddingTop: 'var(--space-3)' }}>
              <label className="bs-label">{ts.hqRfD} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.hqRfDUnit})</span></label>
              <input type="number" className="bs-number-input" min={0} step={0.0001} value={drm.RfD} onChange={field(setDrm, 'RfD')} />
            </div>
          </>)}
        </div>

        {/* Formula box */}
        <div className="formula-box">
          <button
            className="ds-formula-toggle"
            onClick={() => setShowFormula(v => !v)}
          >
            <span className="formula-box-title" style={{ marginBottom: 0 }}>{tc.formula}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {showFormula ? tc.showLess : tc.showMore}
            </span>
          </button>
          {showFormula && (
            <div className="formula-list" style={{ marginTop: 'var(--space-3)' }}>
              <div className="formula-row">
                <span className="formula-name">HQ</span>
                <span className="formula-expr">= CDI / RfD</span>
              </div>
              {route === 'ingestion' && (
                <div className="formula-row">
                  <span className="formula-name">CDI</span>
                  <span className="formula-expr">= (C·IR·EF·ED) / (BW·AT)</span>
                </div>
              )}
              {route === 'inhalation' && (
                <div className="formula-row">
                  <span className="formula-name">CDI</span>
                  <span className="formula-expr">= (Ca·IR·ET·EF·ED) / (BW·AT)</span>
                </div>
              )}
              {route === 'dermal' && (
                <div className="formula-row">
                  <span className="formula-name">CDI</span>
                  <span className="formula-expr">= (C·SA·AF·ABS·EF·ED) / (BW·AT)</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={loadExample}>{ts.loadExample}</button>
          <button className="btn btn-ghost" onClick={resetAll}>{ts.reset}</button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result ? (
          <>
            {/* CDI result */}
            <div className="eh-cdi-row">
              <span className="eh-cdi-label">{ts.hqCDI}</span>
              <span className="eh-cdi-value">{result.cdi.toExponential(3)}</span>
            </div>

            {/* HQ result */}
            <div className="bs-stats-grid">
              <StatCard
                label={ts.hqResult}
                value={result.hq.toFixed(4)}
                accent={hqLevelColor(result.level)}
              />
              <StatCard
                label={ts.hqRfD}
                value={result.rfd}
                sub={ts.hqRfDUnit}
                accent="var(--color-info)"
              />
            </div>

            {/* Traffic light */}
            <div className="eh-traffic">
              <div className="eh-traffic-title">{ts.hqResult}</div>
              <div className="eh-traffic-lights">
                {trafficItems.map(item => (
                  <div
                    key={item.level}
                    className={`eh-light-cell ${item.className}${result.level === item.level ? ' active' : ''}`}
                  >
                    <div className="eh-light-circle" />
                    <div className="eh-light-label">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* HQ badge + interpretation */}
            <div className={`eh-interp-card eh-interp-card--${result.level}`}>
              <div className="eh-interp-title">
                <span className={`eh-risk-badge eh-risk-badge--${result.level}`}>
                  {result.level === 'concern' ? ts.hqConcernLabel
                    : result.level === 'caution' ? ts.hqCautionLabel
                    : ts.hqSafeLabel}
                </span>
              </div>
              <div className="eh-interp-body" style={{ marginTop: 'var(--space-3)' }}>
                {hqDesc}
              </div>
            </div>

            {/* Note */}
            <div className="bs-note">
              <span style={{ flexShrink: 0 }}>ℹ</span>
              <span>{ts.hqNote}</span>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">HQ</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Cancer Risk Calculator ───────────────────────────────────────────────────

interface CancerFields { CDI: string; CSF: string }
const CR_EXAMPLE: CancerFields = { CDI: '0.000025', CSF: '1.5' };
const CR_EMPTY:   CancerFields = { CDI: '', CSF: '' };

function crLevelColor(level: CancerRiskLevel): string {
  if (level === 'concern')    return 'var(--color-danger)';
  if (level === 'acceptable') return 'var(--color-info)';
  return 'var(--color-primary)';
}

const CancerRiskCalc: React.FC<{ lang: Lang }> = ({ lang }) => {
  const ts = translations[lang].envHealth;
  const tc = translations[lang].common;
  const [fields, setFields] = useState<CancerFields>(CR_EXAMPLE);
  const [showFormula, setShowFormula] = useState(false);

  const set = (key: keyof CancerFields) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields(prev => ({ ...prev, [key]: e.target.value }));

  const result = useMemo(() => {
    const cdi = parseFloat(fields.CDI);
    const csf = parseFloat(fields.CSF);
    if (!isFinite(cdi) || cdi < 0 || !isFinite(csf) || csf < 0) return null;
    const risk  = calcCancerRisk(cdi, csf);
    const level = interpretCancerRisk(risk);
    const [m, e] = formatSciParts(risk);
    const pos   = riskToScalePosition(risk);
    return { risk, level, mantissa: m, exponent: e, pos };
  }, [fields]);

  const crDesc = result
    ? (result.level === 'concern'
        ? ts.crConcernDesc
        : result.level === 'acceptable'
          ? ts.crAcceptableDesc
          : ts.crNegligibleDesc)
    : '';

  const crBadgeLabel = result
    ? (result.level === 'concern'
        ? ts.crConcernLabel
        : result.level === 'acceptable'
          ? ts.crAcceptableLabel
          : ts.crNegligibleLabel)
    : '';

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        <div className="bs-input-panel">
          <div className="eh-section-label">{ts.tabCancer}</div>
          <div className="bs-input-group">
            <label className="bs-label">
              {ts.crCDI}{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.crCDIUnit})</span>
            </label>
            <input
              type="number" className="bs-number-input"
              min={0} step={0.000001}
              value={fields.CDI}
              onChange={set('CDI')}
            />
          </div>
          <div className="bs-input-group">
            <label className="bs-label">
              {ts.crCSF}{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({ts.crCSFUnit})</span>
            </label>
            <input
              type="number" className="bs-number-input"
              min={0} step={0.01}
              value={fields.CSF}
              onChange={set('CSF')}
            />
          </div>
        </div>

        {/* Formula box */}
        <div className="formula-box">
          <button
            className="ds-formula-toggle"
            onClick={() => setShowFormula(v => !v)}
          >
            <span className="formula-box-title" style={{ marginBottom: 0 }}>{tc.formula}</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {showFormula ? tc.showLess : tc.showMore}
            </span>
          </button>
          {showFormula && (
            <div className="formula-list" style={{ marginTop: 'var(--space-3)' }}>
              <div className="formula-row">
                <span className="formula-name">Risk</span>
                <span className="formula-expr">= CDI × CSF</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">CDI</span>
                <span className="formula-expr">= mg/kg-day (lifetime avg.)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">CSF</span>
                <span className="formula-expr">= (mg/kg-day)⁻¹</span>
              </div>
            </div>
          )}
        </div>

        {/* Risk thresholds reference */}
        <div className="formula-box">
          <div className="formula-box-title">{lang === 'ko' ? '위험도 기준' : 'Risk Thresholds'}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name" style={{ color: 'var(--color-danger)', minWidth: 60 }}>{'> 10⁻⁴'}</span>
              <span className="formula-expr">{ts.crConcernLabel}</span>
            </div>
            <div className="formula-row">
              <span className="formula-name" style={{ color: 'var(--color-info)', minWidth: 60 }}>10⁻⁶–10⁻⁴</span>
              <span className="formula-expr">{ts.crAcceptableLabel}</span>
            </div>
            <div className="formula-row">
              <span className="formula-name" style={{ color: 'var(--color-primary)', minWidth: 60 }}>{'< 10⁻⁶'}</span>
              <span className="formula-expr">{ts.crNegligibleLabel}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setFields(CR_EXAMPLE)}>{ts.loadExample}</button>
          <button className="btn btn-ghost" onClick={() => setFields(CR_EMPTY)}>{ts.reset}</button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result ? (
          <>
            {/* Scientific notation display */}
            <div className="eh-sci-card">
              <div className="eh-sci-label">{ts.crResult}</div>
              <div
                className="eh-sci-value"
                style={{ color: crLevelColor(result.level) }}
              >
                {result.mantissa} × 10<sup>{result.exponent}</sup>
              </div>
              <span className={`eh-risk-badge eh-risk-badge--${result.level}`}>
                {crBadgeLabel}
              </span>
            </div>

            {/* Risk scale */}
            <div className="eh-scale-card">
              <div className="eh-scale-title">
                {lang === 'ko' ? '위험도 척도 (로그)' : 'Risk Scale (Log)'}
              </div>
              <div className="eh-scale-track">
                <div className="eh-scale-zone eh-scale-zone--negligible" />
                <div className="eh-scale-zone eh-scale-zone--acceptable" />
                <div className="eh-scale-zone eh-scale-zone--concern" />
                <div className="eh-scale-marker-wrap" style={{ left: `${result.pos}%` }}>
                  <div className="eh-scale-marker" />
                </div>
              </div>
              <div className="eh-scale-labels">
                <span>10⁻⁸</span>
                <span>10⁻⁶</span>
                <span>10⁻⁴</span>
                <span>10⁻²</span>
              </div>
              <div className="eh-scale-zone-labels">
                <div className="eh-scale-zone-label" style={{ color: 'var(--color-primary)' }}>{ts.crNegligibleLabel}</div>
                <div className="eh-scale-zone-label" style={{ color: 'var(--color-accent)' }}>{ts.crAcceptableLabel}</div>
                <div className="eh-scale-zone-label" style={{ color: 'var(--color-danger)' }}>{ts.crConcernLabel}</div>
              </div>
            </div>

            {/* Interpretation */}
            <div className={`eh-interp-card eh-interp-card--${result.level}`}>
              <div className="eh-interp-title">{tc.interpretation}</div>
              <div className="eh-interp-body">{crDesc}</div>
            </div>

            {/* Note */}
            <div className="bs-note">
              <span style={{ flexShrink: 0 }}>ℹ</span>
              <span>{ts.crNote}</span>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">Risk</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main EnvHealthRisk component ────────────────────────────────────────────

const EnvHealthRisk: React.FC<Props> = ({ lang }) => {
  const [subTab, setSubTab] = useState<SubTab>('qaly');
  const ts = translations[lang].envHealth;

  const subTabs: [SubTab, string][] = [
    ['qaly',   ts.tabQALY],
    ['hq',     ts.tabHQ],
    ['cancer', ts.tabCancer],
  ];

  const titles: Record<SubTab, { title: string; subtitle: string }> = {
    qaly:   { title: ts.titleQALY,   subtitle: ts.subtitleQALY },
    hq:     { title: ts.titleHQ,     subtitle: ts.subtitleHQ },
    cancer: { title: ts.titleCancer, subtitle: ts.subtitleCancer },
  };

  const { title, subtitle } = titles[subTab];

  return (
    <div className="eh-calc">
      <div className="calc-hero">
        <h1 className="calc-title">{title}</h1>
        <p className="calc-subtitle">{subtitle}</p>
      </div>

      <div className="bs-subtab-bar" style={{ marginBottom: 'var(--space-8)' }}>
        {subTabs.map(([key, label]) => (
          <button
            key={key}
            className={`bs-subtab-btn${subTab === key ? ' active' : ''}`}
            onClick={() => setSubTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'qaly'   && <QALYCalc       lang={lang} />}
      {subTab === 'hq'     && <HQCalc         lang={lang} />}
      {subTab === 'cancer' && <CancerRiskCalc lang={lang} />}
    </div>
  );
};

export default EnvHealthRisk;
