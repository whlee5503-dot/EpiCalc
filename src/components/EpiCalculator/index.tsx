import React, { useState } from 'react';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import RiskMetrics from './RiskMetrics';
import AttackRate from './AttackRate';
import VaccineEfficacy from './VaccineEfficacy';
import BurdenOfDisease from './BurdenOfDisease';
import './EpiCalculator.css';

interface Props { lang: Lang }

type SubTab = 'risk' | 'freq' | 'vaccine' | 'burden';

const EpiCalculator: React.FC<Props> = ({ lang }) => {
  const [subTab, setSubTab] = useState<SubTab>('risk');
  const t = translations[lang];
  const te = t.epi;

  const titles: Record<SubTab, { title: string; subtitle: string }> = {
    risk:    { title: te.title,                          subtitle: te.subtitle },
    freq:    { title: t.attackRate.title,                subtitle: t.attackRate.subtitle },
    vaccine: { title: t.vaccineEfficacy.title,           subtitle: t.vaccineEfficacy.subtitle },
    burden:  { title: t.burden.title,                    subtitle: t.burden.subtitle },
  };

  const { title, subtitle } = titles[subTab];

  return (
    <div className="epi-calculator">
      <div className="calc-hero">
        <h1 className="calc-title">{title}</h1>
        <p className="calc-subtitle">{subtitle}</p>
      </div>

      <div className="bs-subtab-bar" style={{ marginBottom: 'var(--space-8)' }}>
        {([
          ['risk',    te.tabRiskMetrics],
          ['freq',    te.tabDiseaseFreq],
          ['vaccine', te.tabVaccineEfficacy],
          ['burden',  te.tabBurden],
        ] as [SubTab, string][]).map(([key, label]) => (
          <button
            key={key}
            className={`bs-subtab-btn${subTab === key ? ' active' : ''}`}
            onClick={() => setSubTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === 'risk'    && <RiskMetrics     lang={lang} />}
      {subTab === 'freq'    && <AttackRate       lang={lang} />}
      {subTab === 'vaccine' && <VaccineEfficacy  lang={lang} />}
      {subTab === 'burden'  && <BurdenOfDisease  lang={lang} />}
    </div>
  );
};

export default EpiCalculator;
