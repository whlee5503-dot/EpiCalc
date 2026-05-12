import React, { useState, useMemo } from 'react';
import type { TwoByTwoTable } from '../utils/epidemiology';
import { calcAllMetrics, fmtPct } from '../utils/epidemiology';
import type { Lang } from '../i18n/translations';
import { translations } from '../i18n/translations';
import TableInput from './TableInput';
import ResultCard from './ResultCard';
import './EpiCalculator.css';

interface EpiCalculatorProps {
  lang: Lang;
}

const EXAMPLE_TABLE: TwoByTwoTable = { a: 85, b: 415, c: 45, d: 455 };
const EMPTY_TABLE: TwoByTwoTable = { a: 0, b: 0, c: 0, d: 0 };

const EpiCalculator: React.FC<EpiCalculatorProps> = ({ lang }) => {
  const [table, setTable] = useState<TwoByTwoTable>(EXAMPLE_TABLE);
  const t = translations[lang];
  const te = t.epi;
  const tc = t.common;

  const metrics = useMemo(() => calcAllMetrics(table), [table]);

  const tableLabels = {
    rowPos: te.exposed,
    rowNeg: te.unexposed,
    colPos: te.diseasePos,
    colNeg: te.diseaseNeg,
    title: te.tableTitle,
    cellA: te.cellA,
    cellB: te.cellB,
    cellC: te.cellC,
    cellD: te.cellD,
    total: te.total,
  };

  return (
    <div className="epi-calculator">
      <div className="calc-hero">
        <h1 className="calc-title">{te.title}</h1>
        <p className="calc-subtitle">{te.subtitle}</p>
      </div>

      <div className="calc-layout">
        {/* Left: Table Input */}
        <div className="calc-left">
          <TableInput
            table={table}
            onChange={setTable}
            mode="epi"
            labels={tableLabels}
          />

          {/* Risk summary */}
          <div className="risk-summary">
            <div className="risk-item">
              <span className="risk-label">{te.riskExposed}</span>
              <span className="risk-value">
                {fmtPct(metrics.riskExposed)}
              </span>
            </div>
            <div className="risk-divider" />
            <div className="risk-item">
              <span className="risk-label">{te.riskUnexposed}</span>
              <span className="risk-value">
                {fmtPct(metrics.riskUnexposed)}
              </span>
            </div>
            <div className="risk-divider" />
            <div className="risk-item">
              <span className="risk-label">N</span>
              <span className="risk-value">{metrics.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="calc-actions">
            <button
              className="btn btn-secondary"
              onClick={() => setTable(EXAMPLE_TABLE)}
            >
              {te.example}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setTable(EMPTY_TABLE)}
            >
              {te.reset}
            </button>
          </div>

          {/* Formula reference */}
          <div className="formula-box">
            <div className="formula-box-title">{tc.formula}</div>
            <div className="formula-list">
              <div className="formula-row">
                <span className="formula-name">RR</span>
                <span className="formula-expr">= [a/(a+b)] / [c/(c+d)]</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">OR</span>
                <span className="formula-expr">= (a×d) / (b×c)</span>
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
        </div>

        {/* Right: Results */}
        <div className="calc-right">
          <h2 className="results-title">{te.results}</h2>
          <div className="results-grid">
            <ResultCard
              result={metrics.rr}
              ciLabel={te.ci95}
              interpretLabel={tc.interpretation}
              accentColor="var(--color-primary)"
              formulaHint="RR = [a/(a+b)] / [c/(c+d)]"
              undefinedLabel={tc.undefined}
            />
            <ResultCard
              result={metrics.or}
              ciLabel={te.ci95}
              interpretLabel={tc.interpretation}
              accentColor="var(--color-info)"
              formulaHint="OR = (a×d) / (b×c)"
              undefinedLabel={tc.undefined}
            />
            <ResultCard
              result={metrics.arr}
              ciLabel={te.ci95}
              interpretLabel={tc.interpretation}
              formatAs="percent"
              accentColor="var(--color-accent)"
              formulaHint="ARR = |p₁ − p₂|"
              undefinedLabel={tc.undefined}
            />
            <ResultCard
              result={metrics.nnt}
              ciLabel={te.ci95}
              interpretLabel={tc.interpretation}
              accentColor="var(--color-danger)"
              formulaHint="NNT = 1 / ARR"
              undefinedLabel={tc.undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EpiCalculator;
