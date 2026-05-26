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
import KaplanMeier from './KaplanMeier';
import LogisticRegression from './LogisticRegression';
import KruskalWallis from './KruskalWallis';
import SpearmanCorrelation from './SpearmanCorrelation';
import './BiostatCalc.css';

interface Props { lang: Lang }

type GroupTab = 'descriptive' | 'parametric' | 'nonparametric';
type SubTab =
  | 'samplesize' | 'ttest' | 'chisquare' | 'ztest' | 'anova'
  | 'descstats' | 'pairedttest' | 'fishers' | 'correlation'
  | 'linreg' | 'wilcoxon' | 'mcnemar' | 'kaplanmeier' | 'logreg'
  | 'kruskalwallis' | 'spearman';

const GROUPS: { id: GroupTab; subtabs: SubTab[] }[] = [
  { id: 'descriptive',    subtabs: ['descstats', 'samplesize'] },
  { id: 'parametric',     subtabs: ['ztest', 'ttest', 'pairedttest', 'anova', 'correlation', 'linreg', 'logreg', 'kaplanmeier'] },
  { id: 'nonparametric',  subtabs: ['chisquare', 'fishers', 'mcnemar', 'wilcoxon', 'kruskalwallis', 'spearman'] },
];

const BiostatCalc: React.FC<Props> = ({ lang }) => {
  const [group, setGroup] = useState<GroupTab>('descriptive');
  const [subTab, setSubTab] = useState<SubTab>('descstats');
  const ts = translations[lang].biostat;

  const handleGroupChange = (g: GroupTab) => {
    setGroup(g);
    setSubTab(GROUPS.find(gt => gt.id === g)!.subtabs[0]);
  };

  const tabLabels: Record<SubTab, string> = {
    descstats:      ts.tabDescStats,
    samplesize:     ts.tabSampleSize,
    ztest:          ts.tabZTest,
    ttest:          ts.tabTTest,
    pairedttest:    ts.tabPairedTTest,
    anova:          ts.tabANOVA,
    linreg:         ts.tabLinReg,
    correlation:    ts.tabCorrelation,
    chisquare:      ts.tabChiSquare,
    fishers:        ts.tabFishers,
    wilcoxon:       ts.tabWilcoxon,
    mcnemar:        ts.tabMcNemar,
    kaplanmeier:    ts.tabKaplanMeier,
    logreg:         ts.tabLogReg,
    kruskalwallis:  ts.tabKruskalWallis,
    spearman:       ts.tabSpearman,
  };

  const groupLabels: Record<GroupTab, string> = {
    descriptive:   ts.groupDescriptive,
    parametric:    ts.groupParametric,
    nonparametric: ts.groupNonParametric,
  };

  const currentSubtabs = GROUPS.find(gt => gt.id === group)!.subtabs;

  return (
    <div className="bs-calc">
      <div className="calc-hero">
        <h1 className="calc-title">{ts.title}</h1>
        <p className="calc-subtitle">{ts.subtitle}</p>
      </div>

      <div className="bs-nav">
        <div className="bs-group-bar">
          {GROUPS.map(gt => (
            <button
              key={gt.id}
              className={`bs-group-btn${group === gt.id ? ' active' : ''}`}
              onClick={() => handleGroupChange(gt.id)}
            >
              {groupLabels[gt.id]}
            </button>
          ))}
        </div>

        <div className="bs-subtab-bar">
          {currentSubtabs.map(tab => (
            <button
              key={tab}
              className={`bs-subtab-btn${subTab === tab ? ' active' : ''}`}
              onClick={() => setSubTab(tab)}
            >
              {tabLabels[tab]}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'descstats'    && <DescriptiveStats lang={lang} />}
      {subTab === 'samplesize'   && <SampleSize lang={lang} />}
      {subTab === 'ztest'        && <ZTest lang={lang} />}
      {subTab === 'ttest'        && <TTest lang={lang} />}
      {subTab === 'pairedttest'  && <PairedTTest lang={lang} />}
      {subTab === 'anova'        && <ANOVA lang={lang} />}
      {subTab === 'linreg'       && <LinearRegression lang={lang} />}
      {subTab === 'correlation'  && <Correlation lang={lang} />}
      {subTab === 'chisquare'    && <ChiSquare lang={lang} />}
      {subTab === 'fishers'      && <FishersExact lang={lang} />}
      {subTab === 'wilcoxon'     && <WilcoxonRankSum lang={lang} />}
      {subTab === 'mcnemar'      && <McNemarTest lang={lang} />}
      {subTab === 'kaplanmeier'   && <KaplanMeier lang={lang} />}
      {subTab === 'logreg'        && <LogisticRegression lang={lang} />}
      {subTab === 'kruskalwallis' && <KruskalWallis lang={lang} />}
      {subTab === 'spearman'      && <SpearmanCorrelation lang={lang} />}
    </div>
  );
};

export default BiostatCalc;
