import React, { useState, useMemo } from 'react';
import type { TwoByTwoTable } from '../utils/epidemiology';
import { calcScreening, fmtPct } from '../utils/epidemiology';
import type { Lang } from '../i18n/translations';
import { translations } from '../i18n/translations';
import TableInput from './TableInput';
import './ScreeningCalc.css';

interface ScreeningCalcProps {
  lang: Lang;
}

const EXAMPLE: TwoByTwoTable = { a: 90, b: 20, c: 10, d: 180 };
const EMPTY: TwoByTwoTable = { a: 0, b: 0, c: 0, d: 0 };

interface MetricBarProps {
  label: string;
  value: number;
  color: string;
  interpretation: string;
  ciLow: number;
  ciHigh: number;
}

const MetricBar: React.FC<MetricBarProps> = ({ label, value, color, interpretation, ciLow, ciHigh }) => (
  <div className="metric-bar-row">
    <div className="mb-header">
      <span className="mb-label">{label}</span>
      <span className="mb-value" style={{ color }}>{fmtPct(value)}</span>
    </div>
    <div className="mb-bar-track">
      <div
        className="mb-bar-fill"
        style={{ width: `${value * 100}%`, background: color }}
      />
      <div
        className="mb-ci-lower"
        style={{ left: `${ciLow * 100}%` }}
      />
      <div
        className="mb-ci-upper"
        style={{ left: `${ciHigh * 100}%` }}
      />
    </div>
    <div className="mb-interpretation">{interpretation}</div>
  </div>
);

const ScreeningCalc: React.FC<ScreeningCalcProps> = ({ lang }) => {
  const [table, setTable] = useState<TwoByTwoTable>(EXAMPLE);
  const t = translations[lang];
  const ts = t.screening;

  const m = useMemo(() => calcScreening(table), [table]);

  const tableLabels = {
    rowPos: ts.truePos,
    rowNeg: ts.trueNeg,
    colPos: ts.testPos,
    colNeg: ts.testNeg,
    title: ts.tableTitle,
    cellA: ts.cellA,
    cellB: ts.cellB,
    cellC: ts.cellC,
    cellD: ts.cellD,
    total: t.epi.total,
  };

  const COLORS = {
    sensitivity: 'var(--color-primary)',
    specificity: 'var(--color-info)',
    ppv: 'var(--color-accent)',
    npv: 'var(--color-danger)',
    accuracy: 'var(--text-secondary)',
  };

  return (
    <div className="screening-calc">
      <div className="calc-hero">
        <h1 className="calc-title">{ts.title}</h1>
        <p className="calc-subtitle">{ts.subtitle}</p>
      </div>

      <div className="screening-layout">
        {/* Left */}
        <div className="screening-left">
          <TableInput
            table={table}
            onChange={setTable}
            mode="screening"
            labels={tableLabels}
          />

          <div className="prevalence-badge">
            <span>{ts.prevalence}</span>
            <strong>{fmtPct(m.prevalence)}</strong>
          </div>

          <div className="calc-actions">
            <button className="btn btn-secondary" onClick={() => setTable(EXAMPLE)}>
              {t.epi.example}
            </button>
            <button className="btn btn-ghost" onClick={() => setTable(EMPTY)}>
              {t.epi.reset}
            </button>
          </div>

          {/* LR Cards */}
          <div className="lr-cards">
            <div className="lr-card">
              <div className="lr-name">{ts.lrPos}</div>
              <div className="lr-val" style={{ color: 'var(--color-primary)' }}>
                {m.lrPositive.value.toFixed(2)}
              </div>
              <div className="lr-interp">{m.lrPositive.interpretation}</div>
            </div>
            <div className="lr-card">
              <div className="lr-name">{ts.lrNeg}</div>
              <div className="lr-val" style={{ color: 'var(--color-danger)' }}>
                {m.lrNegative.value.toFixed(2)}
              </div>
              <div className="lr-interp">{m.lrNegative.interpretation}</div>
            </div>
          </div>
        </div>

        {/* Right: Metric bars */}
        <div className="screening-right">
          <div className="metrics-panel">
            <h2 className="results-title">{t.epi.results}</h2>
            <div className="metric-bars">
              <MetricBar
                label={ts.sensitivity}
                value={m.sensitivity.value}
                color={COLORS.sensitivity}
                interpretation={m.sensitivity.interpretation}
                ciLow={m.sensitivity.ci95.lower}
                ciHigh={m.sensitivity.ci95.upper}
              />
              <MetricBar
                label={ts.specificity}
                value={m.specificity.value}
                color={COLORS.specificity}
                interpretation={m.specificity.interpretation}
                ciLow={m.specificity.ci95.lower}
                ciHigh={m.specificity.ci95.upper}
              />
              <MetricBar
                label={ts.ppv}
                value={m.ppv.value}
                color={COLORS.ppv}
                interpretation={m.ppv.interpretation}
                ciLow={m.ppv.ci95.lower}
                ciHigh={m.ppv.ci95.upper}
              />
              <MetricBar
                label={ts.npv}
                value={m.npv.value}
                color={COLORS.npv}
                interpretation={m.npv.interpretation}
                ciLow={m.npv.ci95.lower}
                ciHigh={m.npv.ci95.upper}
              />
              <MetricBar
                label={ts.accuracy}
                value={m.accuracy.value}
                color={COLORS.accuracy}
                interpretation={m.accuracy.interpretation}
                ciLow={m.accuracy.ci95.lower}
                ciHigh={m.accuracy.ci95.upper}
              />
            </div>
          </div>

          {/* Summary grid */}
          <div className="summary-grid">
            {[
              { label: ts.sensitivity, value: m.sensitivity.value, color: COLORS.sensitivity },
              { label: ts.specificity, value: m.specificity.value, color: COLORS.specificity },
              { label: ts.ppv,         value: m.ppv.value,         color: COLORS.ppv },
              { label: ts.npv,         value: m.npv.value,         color: COLORS.npv },
            ].map(({ label, value, color }) => (
              <div key={label} className="summary-cell" style={{ borderTopColor: color }}>
                <div className="sc-label">{label}</div>
                <div className="sc-value" style={{ color }}>{fmtPct(value)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreeningCalc;
