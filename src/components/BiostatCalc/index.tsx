import React, { useState } from 'react';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import SampleSize from './SampleSize';
import TTest from './TTest';
import ChiSquare from './ChiSquare';
import ZTest from './ZTest';
import ANOVA from './ANOVA';
import './BiostatCalc.css';

interface Props { lang: Lang }

type SubTab = 'samplesize' | 'ttest' | 'chisquare' | 'ztest' | 'anova';

const BiostatCalc: React.FC<Props> = ({ lang }) => {
  const [subTab, setSubTab] = useState<SubTab>('samplesize');
  const ts = translations[lang].biostat;

  return (
    <div className="bs-calc">
      <div className="calc-hero">
        <h1 className="calc-title">{ts.title}</h1>
        <p className="calc-subtitle">{ts.subtitle}</p>
      </div>

      <div className="bs-subtab-bar">
        <button
          className={`bs-subtab-btn${subTab === 'samplesize' ? ' active' : ''}`}
          onClick={() => setSubTab('samplesize')}
        >
          {ts.tabSampleSize}
        </button>
        <button
          className={`bs-subtab-btn${subTab === 'ztest' ? ' active' : ''}`}
          onClick={() => setSubTab('ztest')}
        >
          {ts.tabZTest}
        </button>
        <button
          className={`bs-subtab-btn${subTab === 'ttest' ? ' active' : ''}`}
          onClick={() => setSubTab('ttest')}
        >
          {ts.tabTTest}
        </button>
        <button
          className={`bs-subtab-btn${subTab === 'chisquare' ? ' active' : ''}`}
          onClick={() => setSubTab('chisquare')}
        >
          {ts.tabChiSquare}
        </button>
        <button
          className={`bs-subtab-btn${subTab === 'anova' ? ' active' : ''}`}
          onClick={() => setSubTab('anova')}
        >
          {ts.tabANOVA}
        </button>
      </div>

      {subTab === 'samplesize' && <SampleSize lang={lang} />}
      {subTab === 'ztest' && <ZTest lang={lang} />}
      {subTab === 'ttest' && <TTest lang={lang} />}
      {subTab === 'chisquare' && <ChiSquare lang={lang} />}
      {subTab === 'anova' && <ANOVA lang={lang} />}
    </div>
  );
};

export default BiostatCalc;
