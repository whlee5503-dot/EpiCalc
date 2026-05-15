import React, { useState } from 'react';
import { type EpiResult, fmtNum, fmtPct, fmtCI } from '../utils/epidemiology';
import type { InterpretationResult } from '../utils/interpretation';
import type { Lang } from '../i18n/translations';
import { translations } from '../i18n/translations';
import './ResultCard.css';

interface ResultCardProps {
  result: EpiResult | null;
  ciLabel: string;
  interp?: InterpretationResult;
  lang?: Lang;
  formatAs?: 'number' | 'percent';
  accentColor?: string;
  formulaHint?: string;
  undefinedLabel?: string;
}

const ResultCard: React.FC<ResultCardProps> = ({
  result,
  ciLabel,
  interp,
  lang = 'en',
  formatAs = 'number',
  accentColor,
  formulaHint,
  undefinedLabel = '—',
}) => {
  const [expanded, setExpanded] = useState(false);
  const tc = translations[lang].common;

  if (!result) {
    return (
      <div className="result-card result-card--undefined">
        <div className="rc-value">{undefinedLabel}</div>
        {formulaHint && <div className="rc-formula">{formulaHint}</div>}
      </div>
    );
  }

  const fmt = formatAs === 'percent' ? fmtPct : (n: number) => fmtNum(n, 2);
  const fmtCI2 = (n: number) => formatAs === 'percent' ? fmtPct(n) : fmtNum(n, 2);

  // CI bar: map value to visual width
  const ciRange = result.ci95.upper - result.ci95.lower;
  const valuePct = ciRange > 0
    ? Math.min(100, Math.max(0, ((result.value - result.ci95.lower) / ciRange) * 100))
    : 50;

  return (
    <div className="result-card" style={accentColor ? { '--rc-accent': accentColor } as React.CSSProperties : {}}>
      <div className="rc-header">
        <span className="rc-label">{result.label}</span>
      </div>

      <div className="rc-value-row">
        <span className="rc-value">{fmt(result.value)}</span>
        <span className="rc-ci-text">
          {ciLabel}: {fmtCI2(result.ci95.lower)} – {fmtCI2(result.ci95.upper)}
        </span>
      </div>

      {/* CI visualization bar */}
      <div className="rc-ci-bar-container" title={`95% CI: ${fmtCI(result.ci95)}`}>
        <div className="rc-ci-bar">
          <div className="rc-ci-range" />
          <div className="rc-ci-point" style={{ left: `${valuePct}%` }} />
        </div>
        <div className="rc-ci-endpoints">
          <span>{fmtCI2(result.ci95.lower)}</span>
          <span>{fmtCI2(result.ci95.upper)}</span>
        </div>
      </div>

      {interp && (
        <div className="rc-interpretation">
          <div className="rc-summary">{interp.summary}</div>
          <button
            className="rc-toggle-btn"
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
          >
            {expanded ? tc.showLess : tc.showMore}
          </button>
          <div className={`rc-interp-detail${expanded ? ' rc-interp-detail--open' : ''}`}>
            <div className="rc-interp-detail-inner">
              <div className="rc-footnote">{interp.footnote}</div>
              <div className="rc-disclaimer">{interp.disclaimer}</div>
            </div>
          </div>
        </div>
      )}

      {formulaHint && <div className="rc-formula">{formulaHint}</div>}
    </div>
  );
};

export default ResultCard;
