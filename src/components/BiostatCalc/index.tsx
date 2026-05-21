import React, { useState } from 'react';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import SampleSize from './SampleSize';
import TTest from './TTest';
import ChiSquare from './ChiSquare';
import ZTest from './ZTest';
import ANOVA from './ANOVA';
import DescriptiveStats from './DescriptiveStats';
import PairedTTest from './PairedTTest';
import FishersExact from './FishersExact';
import Correlation from './Correlation';
import LinearRegression from './LinearRegression';
import WilcoxonRankSum from './WilcoxonRankSum';
import McNemarTest from './McNemarTest';
import './BiostatCalc.css';

interface Props { lang: Lang }

type SubTab = 'samplesize' | 'ttest' | 'chisquare' | 'ztest' | 'anova' | 'descstats' | 'pairedttest' | 'fishers' | 'correlation' | 'linreg' | 'wilcoxon' | 'mcnemar';

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
        <button
          className={`bs-subtab-btn${subTab === 'descstats' ? ' active' : ''}`}
          onClick={() => setSubTab('descstats')}
        >
          {ts.tabDescStats}
        </button>
        <button
          className={`bs-subtab-btn${subTab === 'pairedttest' ? ' active' : ''}`}
          onClick={() => setSubTab('pairedttest')}
        >
          {ts.tabPairedTTest}
        </button>
        <button
          className={`bs-subtab-btn${subTab === 'fishers' ? ' active' : ''}`}
          onClick={() => setSubTab('fishers')}
        >
          {ts.tabFishers}
        </button>
        <button
          className={`bs-subtab-btn${subTab === 'correlation' ? ' active' : ''}`}
          onClick={() => setSubTab('correlation')}
        >
          {ts.tabCorrelation}
        </button>
        <button
          className={`bs-subtab-btn${subTab === 'linreg' ? ' active' : ''}`}
          onClick={() => setSubTab('linreg')}
        >
          {ts.tabLinReg}
        </button>
        <button
          className={`bs-subtab-btn${subTab === 'wilcoxon' ? ' active' : ''}`}
          onClick={() => setSubTab('wilcoxon')}
        >
          {ts.tabWilcoxon}
        </button>
        <button
          className={`bs-subtab-btn${subTab === 'mcnemar' ? ' active' : ''}`}
          onClick={() => setSubTab('mcnemar')}
        >
          {ts.tabMcNemar}
        </button>
      </div>

      {subTab === 'samplesize' && <SampleSize lang={lang} />}
      {subTab === 'ztest' && <ZTest lang={lang} />}
      {subTab === 'ttest' && <TTest lang={lang} />}
      {subTab === 'chisquare' && <ChiSquare lang={lang} />}
      {subTab === 'anova' && <ANOVA lang={lang} />}
      {subTab === 'descstats' && <DescriptiveStats lang={lang} />}
      {subTab === 'pairedttest' && <PairedTTest lang={lang} />}
      {subTab === 'fishers' && <FishersExact lang={lang} />}
      {subTab === 'correlation' && <Correlation lang={lang} />}
      {subTab === 'linreg' && <LinearRegression lang={lang} />}
      {subTab === 'wilcoxon' && <WilcoxonRankSum lang={lang} />}
      {subTab === 'mcnemar' && <McNemarTest lang={lang} />}
    </div>
  );
};

export default BiostatCalc;
