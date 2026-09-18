import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import type { SimParams, Intervention, ModelType } from '../../utils/sirModel';
import { runSimulationWithInterventions } from '../../utils/sirModel';
import './SIRSimulator.css';

interface SIRSimulatorProps {
  lang: Lang;
}

const DEFAULT_PARAMS: SimParams = {
  model: 'SIR',
  beta: 0.3,
  gamma: 0.1,
  sigma: 0.2,
  N: 10000,
  I0: 10,
  vaccinationRate: 0,
  days: 180,
};

const EXAMPLE_PARAMS: SimParams = {
  model: 'SEIR',
  beta: 0.35,
  gamma: 0.1,
  sigma: 0.2,
  N: 100000,
  I0: 100,
  vaccinationRate: 0.3,
  days: 180,
};

const DEFAULT_CFR = 0.02;

// Chart colors from design system
const CHART = {
  S: '#3498db',
  E: '#f39c12',
  I: '#e74c3c',
  R: '#2ecc71',
  D: '#5b5b5b',
};

interface ParamRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}

const ParamRow: React.FC<ParamRowProps> = ({ label, value, min, max, step, display, onChange }) => (
  <div className="sir-param-item">
    <div className="sir-param-header">
      <span className="sir-param-label">{label}</span>
      <span className="sir-param-display">{display}</span>
    </div>
    <input
      type="range"
      className="sir-param-range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
    />
  </div>
);

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function fmtPop(n: number): string {
  return Math.round(n).toLocaleString();
}

function fmtPercent(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

let nextInterventionId = 1;
interface EditableIntervention extends Intervention {
  id: number;
}

const SIRSimulator: React.FC<SIRSimulatorProps> = ({ lang }) => {
  const [params, setParams] = useState<SimParams>(() => {
    const sp = new URLSearchParams(window.location.search);
    const overrides: Partial<SimParams> = {};
    const population = sp.get('population');
    const cases = sp.get('cases');
    if (population) {
      const v = parseInt(population, 10);
      if (!isNaN(v) && v > 0) overrides.N = v;
    }
    if (cases) {
      const v = parseInt(cases, 10);
      if (!isNaN(v) && v > 0) overrides.I0 = v;
    }
    return { ...DEFAULT_PARAMS, ...overrides };
  });
  const [interventions, setInterventions] = useState<EditableIntervention[]>([]);
  const ts = translations[lang].sir;

  const result = useMemo(
    () => runSimulationWithInterventions(params, interventions),
    [params, interventions],
  );

  const patch = (partial: Partial<SimParams>) =>
    setParams(prev => ({ ...prev, ...partial }));

  const selectModel = (m: ModelType) => {
    patch({
      model: m,
      cfr: m === 'SEIRD' ? (params.cfr ?? DEFAULT_CFR) : params.cfr,
    });
  };

  const addIntervention = () => {
    setInterventions(prev => [
      ...prev,
      {
        id: nextInterventionId++,
        day: Math.max(1, Math.round(params.days / 2)),
        type: 'lockdown',
        betaMultiplier: 0.5,
      },
    ]);
  };

  const updateIntervention = (id: number, patchIv: Partial<EditableIntervention>) => {
    setInterventions(prev => prev.map(iv => (iv.id === id ? { ...iv, ...patchIv } : iv)));
  };

  const removeIntervention = (id: number) => {
    setInterventions(prev => prev.filter(iv => iv.id !== id));
  };

  const r0 = result.r0;
  const r0Safe = r0 <= 1;
  const isSEIRD = params.model === 'SEIRD';

  return (
    <div className="sir-simulator">
      <div className="calc-hero">
        <h1 className="calc-title">{ts.title}</h1>
        <p className="calc-subtitle">{ts.subtitle}</p>
      </div>

      <div className="sir-layout">
        {/* Left: Controls */}
        <div className="sir-left">

          {/* Model toggle */}
          <div className="sir-model-toggle">
            <div className="sir-section-label">{ts.modelToggle}</div>
            <div className="sir-toggle-btns">
              {(['SIR', 'SEIR', 'SEIRD'] as const).map(m => (
                <button
                  key={m}
                  className={`sir-toggle-btn${params.model === m ? ' active' : ''}`}
                  onClick={() => selectModel(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* R0 live display */}
          <div className="sir-r0-card">
            <div className="sir-r0-top">
              <span className="sir-r0-label">{ts.r0Label}</span>
              <span className="sir-r0-formula">{ts.r0Formula}</span>
            </div>
            <div className={`sir-r0-value${r0Safe ? ' safe' : ' danger'}`}>
              {r0.toFixed(2)}
            </div>
            <div className={`sir-r0-status${r0Safe ? ' safe' : ' danger'}`}>
              {r0Safe ? ts.r0Below1 : ts.r0Above1}
            </div>
            {!r0Safe && (
              <div className="sir-herd-threshold">
                {ts.herdImmunity}: <strong>{fmtPercent(result.herdImmunityThreshold)}</strong>
              </div>
            )}
          </div>

          {/* Parameters */}
          <div className="sir-params-panel">
            <div className="sir-section-label">{ts.parameters}</div>

            <ParamRow
              label={ts.beta}
              value={params.beta}
              min={0.01} max={1.0} step={0.01}
              display={params.beta.toFixed(2)}
              onChange={(v) => patch({ beta: v })}
            />
            <ParamRow
              label={ts.gamma}
              value={params.gamma}
              min={0.01} max={0.5} step={0.01}
              display={params.gamma.toFixed(2)}
              onChange={(v) => patch({ gamma: v })}
            />
            {params.model !== 'SIR' && (
              <ParamRow
                label={ts.sigma}
                value={params.sigma}
                min={0.01} max={1.0} step={0.01}
                display={params.sigma.toFixed(2)}
                onChange={(v) => patch({ sigma: v })}
              />
            )}
            {isSEIRD && (
              <ParamRow
                label={ts.cfr}
                value={params.cfr ?? DEFAULT_CFR}
                min={0} max={0.2} step={0.001}
                display={`${((params.cfr ?? DEFAULT_CFR) * 100).toFixed(1)}%`}
                onChange={(v) => patch({ cfr: v })}
              />
            )}

            {/* N and I0 as number inputs */}
            <div className="sir-param-item">
              <div className="sir-param-header">
                <span className="sir-param-label">{ts.population}</span>
              </div>
              <input
                type="number"
                className="sir-param-number"
                min={100}
                max={100_000_000}
                value={params.N}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0) patch({ N: v });
                }}
              />
            </div>
            <div className="sir-param-item">
              <div className="sir-param-header">
                <span className="sir-param-label">{ts.initialInfected}</span>
              </div>
              <input
                type="number"
                className="sir-param-number"
                min={1}
                max={params.N}
                value={params.I0}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0) patch({ I0: v });
                }}
              />
            </div>

            <ParamRow
              label={ts.vaccinationRate}
              value={params.vaccinationRate}
              min={0} max={0.95} step={0.01}
              display={fmtPercent(params.vaccinationRate)}
              onChange={(v) => patch({ vaccinationRate: v })}
            />
            <ParamRow
              label={ts.days}
              value={params.days}
              min={30} max={365} step={1}
              display={`${params.days} ${ts.dayUnit}`}
              onChange={(v) => patch({ days: v })}
            />
          </div>

          {/* Interventions */}
          <div className="sir-interventions-panel">
            <div className="sir-interventions-header">
              <div className="sir-section-label" style={{ marginBottom: 0 }}>{ts.interventions}</div>
              <button className="sir-add-intervention-btn" type="button" onClick={addIntervention}>
                {ts.addIntervention}
              </button>
            </div>

            {interventions.length === 0 ? (
              <p className="sir-intervention-empty">{ts.noInterventions}</p>
            ) : (
              <div className="sir-intervention-list">
                {interventions.map((iv) => (
                  <div className="sir-intervention-row" key={iv.id}>
                    <label className="sir-intervention-field sir-intervention-field--day">
                      <span>{ts.interventionDay}</span>
                      <input
                        type="number"
                        min={1}
                        max={params.days}
                        value={iv.day}
                        onChange={(e) => updateIntervention(iv.id, { day: Number(e.target.value) })}
                      />
                    </label>
                    <label className="sir-intervention-field">
                      <span>{ts.interventionType}</span>
                      <select
                        value={iv.type}
                        onChange={(e) => {
                          const newType = e.target.value as Intervention['type'];
                          updateIntervention(iv.id, {
                            type: newType,
                            betaMultiplier: newType === 'lockdown' ? (iv.betaMultiplier ?? 0.5) : undefined,
                            vaccinationRate: newType === 'vaccination' ? (iv.vaccinationRate ?? 0.3) : undefined,
                          });
                        }}
                      >
                        <option value="lockdown">{ts.lockdown}</option>
                        <option value="vaccination">{ts.vaccinationEvent}</option>
                      </select>
                    </label>
                    {iv.type === 'lockdown' ? (
                      <label className="sir-intervention-field">
                        <span>{ts.betaMultiplier}</span>
                        <input
                          type="number"
                          min={0} max={2} step={0.05}
                          value={iv.betaMultiplier ?? 0.5}
                          onChange={(e) => updateIntervention(iv.id, { betaMultiplier: Number(e.target.value) })}
                        />
                      </label>
                    ) : (
                      <label className="sir-intervention-field">
                        <span>{ts.vaccinationEventRate}</span>
                        <input
                          type="number"
                          min={0} max={100} step={1}
                          value={Math.round((iv.vaccinationRate ?? 0.3) * 100)}
                          onChange={(e) => updateIntervention(iv.id, { vaccinationRate: Number(e.target.value) / 100 })}
                        />
                      </label>
                    )}
                    <button
                      className="sir-intervention-remove-btn"
                      type="button"
                      aria-label={ts.removeIntervention}
                      onClick={() => removeIntervention(iv.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="calc-actions">
            <button className="btn btn-secondary" onClick={() => setParams(EXAMPLE_PARAMS)}>
              {ts.loadExample}
            </button>
            <button className="btn btn-ghost" onClick={() => { setParams(DEFAULT_PARAMS); setInterventions([]); }}>
              {ts.reset}
            </button>
          </div>
        </div>

        {/* Right: Chart + Stats */}
        <div className="sir-right">

          {/* Epidemic curve */}
          <div className="sir-chart-card">
            <h2 className="sir-chart-title">{ts.chartTitle}</h2>
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={result.data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  label={{
                    value: ts.day,
                    position: 'insideBottomRight',
                    offset: -4,
                    fill: 'var(--text-muted)',
                    fontSize: 11,
                  }}
                />
                <YAxis
                  tickFormatter={fmtAxis}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  width={52}
                />
                <Tooltip
                  formatter={(value) =>
                    typeof value === 'number' ? value.toLocaleString() : String(value)
                  }
                  labelFormatter={(label) => `${ts.day} ${label}`}
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '8px' }} />
                <Line
                  type="monotone"
                  dataKey="S"
                  name={ts.susceptible}
                  stroke={CHART.S}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {params.model !== 'SIR' && (
                  <Line
                    type="monotone"
                    dataKey="E"
                    name={ts.exposed}
                    stroke={CHART.E}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="I"
                  name={ts.infectious}
                  stroke={CHART.I}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="R"
                  name={ts.recovered}
                  stroke={CHART.R}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {isSEIRD && (
                  <Line
                    type="monotone"
                    dataKey="D"
                    name={ts.deceased}
                    stroke={CHART.D}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
                {interventions.map((iv) => (
                  <ReferenceLine
                    key={iv.id}
                    x={iv.day}
                    stroke={iv.type === 'lockdown' ? 'var(--color-danger)' : 'var(--color-primary)'}
                    strokeDasharray="4 3"
                    label={{
                      value: iv.type === 'lockdown' ? '🔒' : '💉',
                      position: 'top',
                      fontSize: 12,
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stats row */}
          <div className="sir-stats-grid">
            <div className="sir-stat-card">
              <div className="sir-stat-label">{ts.peakInfected}</div>
              <div className="sir-stat-value" style={{ color: CHART.I }}>
                {fmtPop(result.peakInfected)}
              </div>
              <div className="sir-stat-sub">{ts.people}</div>
            </div>
            <div className="sir-stat-card">
              <div className="sir-stat-label">{ts.peakDay}</div>
              <div className="sir-stat-value">{result.peakDay}</div>
              <div className="sir-stat-sub">{ts.dayUnit}</div>
            </div>
            <div className="sir-stat-card">
              <div className="sir-stat-label">{ts.herdImmunity}</div>
              <div
                className="sir-stat-value"
                style={{ color: r0Safe ? 'var(--color-primary)' : 'var(--color-danger)' }}
              >
                {r0Safe ? '—' : fmtPercent(result.herdImmunityThreshold)}
              </div>
              <div className="sir-stat-sub">R₀ = {r0.toFixed(2)}</div>
            </div>
            {isSEIRD && (
              <div className="sir-stat-card">
                <div className="sir-stat-label">{ts.totalDeaths}</div>
                <div className="sir-stat-value" style={{ color: CHART.D }}>
                  {fmtPop(result.totalDeaths)}
                </div>
                <div className="sir-stat-sub">{ts.people}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SIRSimulator;