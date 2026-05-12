import React from 'react';
import type { Lang } from '../i18n/translations';
import { translations } from '../i18n/translations';
import './SIRPlaceholder.css';

interface SIRPlaceholderProps {
  lang: Lang;
}

const SIRPlaceholder: React.FC<SIRPlaceholderProps> = ({ lang }) => {
  const t = translations[lang];
  return (
    <div className="sir-placeholder">
      <div className="sir-placeholder-inner">
        <div className="sir-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="20" stroke="var(--color-primary)" strokeWidth="2" strokeDasharray="4 3" />
            <circle cx="24" cy="24" r="10" fill="var(--color-primary)" opacity="0.15" />
            <circle cx="24" cy="24" r="5" fill="var(--color-primary)" opacity="0.5" />
          </svg>
        </div>
        <h2 className="sir-title">{t.nav.sir}</h2>
        <p className="sir-desc">
          {lang === 'ko'
            ? 'SIR / SEIR 감염병 확산 시뮬레이터가 곧 추가됩니다. R₀, 백신접종률, 감염 곡선을 실시간으로 시각화합니다.'
            : 'SIR / SEIR epidemic simulation coming soon. Visualize R₀, vaccination rates, and infection curves in real time.'}
        </p>
        <div className="sir-tags">
          <span>SIR Model</span>
          <span>SEIR</span>
          <span>R₀</span>
          <span>Vaccination</span>
        </div>
      </div>
    </div>
  );
};

export default SIRPlaceholder;
