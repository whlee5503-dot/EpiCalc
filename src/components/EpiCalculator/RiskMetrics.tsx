import React, { useState, useMemo } from 'react';
import type { TwoByTwoTable } from '../../utils/epidemiology';
import { calcAllMetrics, fmtPct } from '../../utils/epidemiology';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { interpretResult } from '../../utils/interpretation';
import TableInput from '../TableInput';
import ResultCard from '../ResultCard';
import './EpiCalculator.css';

interface Props { lang: Lang }

const EXAMPLE_TABLE: TwoByTwoTable = { a: 85, b: 415, c: 45, d: 455 };
const EMPTY_TABLE: TwoByTwoTable = { a: 0, b: 0, c: 0, d: 0 };

const RiskMetrics: React.FC<Props> = ({ lang }) => {
  const [table, setTable] = useState<TwoByTwoTable>(EXAMPLE_TABLE);
  const t = translations[lang];
  const te = t.epi;
  const tc = t.common;

  const metrics = useMemo(() => calcAllMetrics(table), [table]);

  const interps = useMemo(() => ({
    rr: metrics.rr
      ? interpretResult('RR', { value: metrics.rr.value, ci_lower: metrics.rr.ci95.lower, ci_upper: metrics.rr.ci95.upper }, lang)
      : undefined,
    or: metrics.or
      ? interpretResult('OR', { value: metrics.or.value, ci_lower: metrics.or.ci95.lower, ci_upper: metrics.or.ci95.upper }, lang)
      : undefined,
    arr: metrics.arr
      ? interpretResult('ARR', { value: metrics.arr.value }, lang)
      : undefined,
    nnt: metrics.nnt
      ? interpretResult('NNT', { value: metrics.nnt.value }, lang)
      : undefined,
  }), [metrics, lang]);

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
    <div className="calc-layout">
      <div className="calc-left">
        <TableInput table={table} onChange={setTable} mode="epi" labels={tableLabels} />

        <div className="risk-summary">
          <div className="risk-item">
            <span className="risk-label">{te.riskExposed}</span>
            <span className="risk-value">{fmtPct(metrics.riskExposed)}</span>
          </div>
          <div className="risk-divider" />
          <div className="risk-item">
            <span className="risk-label">{te.riskUnexposed}</span>
            <span className="risk-value">{fmtPct(metrics.riskUnexposed)}</span>
          </div>
          <div className="risk-divider" />
          <div className="risk-item">
            <span className="risk-label">N</span>
            <span className="risk-value">{metrics.total.toLocaleString()}</span>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setTable(EXAMPLE_TABLE)}>
            {te.example}
          </button>
          <button className="btn btn-ghost" onClick={() => setTable(EMPTY_TABLE)}>
            {te.reset}
          </button>
        </div>

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

      <div className="calc-right">
        <h2 className="results-title">{te.results}</h2>
        <div className="results-grid">
          <ResultCard
            result={metrics.rr}
            ciLabel={te.ci95}
            interp={interps.rr}
            lang={lang}
            accentColor="var(--color-primary)"
            formulaHint="RR = [a/(a+b)] / [c/(c+d)]"
            undefinedLabel={tc.undefined}
          />
          <ResultCard
            result={metrics.or}
            ciLabel={te.ci95}
            interp={interps.or}
            lang={lang}
            accentColor="var(--color-info)"
            formulaHint="OR = (a×d) / (b×c)"
            undefinedLabel={tc.undefined}
          />
          <ResultCard
            result={metrics.arr}
            ciLabel={te.ci95}
            interp={interps.arr}
            lang={lang}
            formatAs="percent"
            accentColor="var(--color-accent)"
            formulaHint="ARR = |p₁ − p₂|"
            undefinedLabel={tc.undefined}
          />
          <ResultCard
            result={metrics.nnt}
            ciLabel={te.ci95}
            interp={interps.nnt}
            lang={lang}
            accentColor="var(--color-danger)"
            formulaHint="NNT = 1 / ARR"
            undefinedLabel={tc.undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default RiskMetrics;
