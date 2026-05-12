import React from 'react';
import { type EpiResult, fmtNum, fmtPct, fmtCI } from '../utils/epidemiology';
import './ResultCard.css';

interface ResultCardProps {
  result: EpiResult | null;
  ciLabel: string;
  interpretLabel: string;
  formatAs?: 'number' | 'percent';
  accentColor?: string;
  formulaHint?: string;
  undefinedLabel?: string;
}

const ResultCard: React.FC<ResultCardProps> = ({
  result,
  ciLabel,
  interpretLabel,
  formatAs = 'number',
  accentColor,
  formulaHint,
  undefinedLabel = '—',
}) => {
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

      <div className="rc-interpretation">
        <span className="rc-interp-label">{interpretLabel}:</span>
        {' '}{result.interpretation}
      </div>

      {formulaHint && <div className="rc-formula">{formulaHint}</div>}
    </div>
  );
};

export default ResultCard;
