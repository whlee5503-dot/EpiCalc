import React, { useState, useMemo } from 'react';
import {
  ComposedChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import {
  calcKruskalWallis,
  type KruskalWallisGroup,
} from './biostat';

interface Props { lang: Lang }

// ── Example data ──────────────────────────────────────────────────────────────
const EXAMPLE_GROUPS = [
  { name: 'Group 1', raw: '2.1, 3.4, 2.8, 3.1, 2.5' },
  { name: 'Group 2', raw: '4.2, 5.1, 4.8, 5.5, 4.3' },
  { name: 'Group 3', raw: '3.3, 3.8, 3.1, 4.0, 3.6' },
];

const GROUP_COLORS = [
  'var(--color-primary)',
  'var(--color-info)',
  'var(--color-accent)',
  'var(--color-danger)',
];

function parseValues(raw: string): number[] {
  return raw.split(/[,\n]+/).map(s => parseFloat(s.trim())).filter(Number.isFinite);
}

function fmtP(p: number): string {
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

function fmtN(v: number, d = 3): string {
  return v.toFixed(d);
}

interface StatCardProps { label: string; value: React.ReactNode; sub?: string; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

// ── Component ─────────────────────────────────────────────────────────────────
const KruskalWallis: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;

  const [numGroups, setNumGroups] = useState(3);
  const [groupNames, setGroupNames] = useState(['Group 1', 'Group 2', 'Group 3', 'Group 4']);
  const [groupRaws, setGroupRaws] = useState([
    '2.1, 3.4, 2.8, 3.1, 2.5',
    '4.2, 5.1, 4.8, 5.5, 4.3',
    '3.3, 3.8, 3.1, 4.0, 3.6',
    '',
  ]);
  const [showFormula, setShowFormula] = useState(false);
  const [showInterp, setShowInterp] = useState(true);
  const [showPostHoc, setShowPostHoc] = useState(true);

  const groups: KruskalWallisGroup[] = useMemo(() =>
    Array.from({ length: numGroups }, (_, i) => ({
      name: groupNames[i] || `Group ${i + 1}`,
      values: parseValues(groupRaws[i] || ''),
    })),
  [numGroups, groupNames, groupRaws]);

  const result = useMemo(() => calcKruskalWallis(groups), [groups]);

  // Build scatter data per group
  const scatterDataPerGroup = useMemo(() => {
    if (!result.valid) return [];
    return result.groups.map((g, gi) =>
      g.values.map((v, vi) => ({
        x: gi + 1 + (vi % 3 === 0 ? -0.18 : vi % 3 === 1 ? 0.18 : 0),
        y: v,
      })),
    );
  }, [result]);

  // Median markers per group
  const medianData = useMemo(() => {
    if (!result.valid) return [];
    return result.groups.map((g, gi) => ({ x: gi + 1, y: g.median }));
  }, [result]);

  const yDomain = useMemo(() => {
    if (!result.valid) return ['auto', 'auto'] as const;
    const allVals = result.groups.flatMap(g => g.values);
    const pad = (Math.max(...allVals) - Math.min(...allVals)) * 0.12 || 1;
    return [Math.min(...allVals) - pad, Math.max(...allVals) + pad] as const;
  }, [result]);

  const xDomain = useMemo<[number, number]>(() => [0.4, numGroups + 0.6], [numGroups]);

  // Interpretation text
  const interpText = useMemo(() => {
    if (!result.valid) return '';
    const H = fmtN(result.hCorrected);
    const p = fmtP(result.pValue);
    if (result.significant) {
      const sigPairs = result.dunnPairs.filter(d => d.significant);
      const pairStr = sigPairs.map(d => `${d.nameI} vs ${d.nameJ} (p=${fmtP(d.pBonferroni)})`).join(', ');
      if (lang === 'ko') {
        return `크루스칼-왈리스 검정 결과 그룹 간 통계적으로 유의한 차이가 있었습니다 (H=${H}, df=${result.df}, p=${p}).` +
          (sigPairs.length > 0
            ? ` Dunn 사후 검정 (Bonferroni 교정)에서 다음 쌍에서 유의한 차이가 확인되었습니다: ${pairStr}.`
            : ' Dunn 사후 검정에서 Bonferroni 교정 후 유의한 쌍이 확인되지 않았습니다.');
      }
      return `The Kruskal-Wallis test showed a statistically significant difference among groups (H=${H}, df=${result.df}, p=${p}).` +
        (sigPairs.length > 0
          ? ` Dunn's post-hoc test (Bonferroni) revealed significant differences: ${pairStr}.`
          : " Dunn's post-hoc test found no significant pairs after Bonferroni correction.");
    }
    return lang === 'ko'
      ? `크루스칼-왈리스 검정 결과 그룹 간 통계적으로 유의한 차이가 없었습니다 (H=${H}, df=${result.df}, p=${p}).`
      : `No statistically significant difference was found among groups (H=${H}, df=${result.df}, p=${p}).`;
  }, [result, lang]);

  const handleGroupCount = (n: number) => {
    setNumGroups(n);
    setGroupRaws(prev => {
      const next = [...prev];
      while (next.length < n) next.push('');
      return next;
    });
    setGroupNames(prev => {
      const next = [...prev];
      while (next.length < n) next.push(`Group ${next.length + 1}`);
      return next;
    });
  };

  const updateName = (i: number, v: string) =>
    setGroupNames(prev => prev.map((n, idx) => idx === i ? v : n));
  const updateRaw = (i: number, v: string) =>
    setGroupRaws(prev => prev.map((r, idx) => idx === i ? v : r));

  const loadExample = () => {
    const n = Math.min(numGroups, EXAMPLE_GROUPS.length);
    setGroupNames(prev => prev.map((_, i) => i < n ? EXAMPLE_GROUPS[i].name : prev[i]));
    setGroupRaws(prev => prev.map((_, i) => i < n ? EXAMPLE_GROUPS[i].raw : ''));
  };

  const resetAll = () => {
    setGroupNames(['Group 1', 'Group 2', 'Group 3', 'Group 4']);
    setGroupRaws(['', '', '', '']);
  };

  const tooltipStyle = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    fontSize: '0.78rem',
    color: 'var(--text-primary)',
  };

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">

        {/* Number of groups selector */}
        <div className="bs-group-card">
          <div className="bs-group-title">{ts.kwNumGroups}</div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                className={`btn ${numGroups === n ? 'btn-primary' : 'btn-secondary'}`}
                style={{ minWidth: 48, padding: '4px 14px', fontSize: '0.9rem' }}
                onClick={() => handleGroupCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Group inputs */}
        {Array.from({ length: numGroups }, (_, gi) => (
          <div className="bs-group-card" key={gi}>
            <div className="bs-group-title" style={{ color: GROUP_COLORS[gi % GROUP_COLORS.length] }}>
              <input
                className="bs-inline-name-input"
                value={groupNames[gi] || ''}
                onChange={e => updateName(gi, e.target.value)}
                placeholder={`Group ${gi + 1}`}
                style={{
                  background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-color)',
                  color: GROUP_COLORS[gi % GROUP_COLORS.length], fontWeight: 700, fontSize: '0.85rem',
                  width: '120px', outline: 'none', cursor: 'text',
                }}
              />
            </div>
            <div className="bs-input-group">
              <label className="bs-label">{ts.kwGroupValues}</label>
              <textarea
                className="bs-textarea"
                value={groupRaws[gi] || ''}
                onChange={e => updateRaw(gi, e.target.value)}
                placeholder="e.g. 2.1, 3.4, 2.8"
                spellCheck={false}
                rows={3}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
                {parseValues(groupRaws[gi] || '').length > 0
                  ? `n = ${parseValues(groupRaws[gi] || '').length}`
                  : ''}
              </div>
            </div>
          </div>
        ))}

        {/* Formula */}
        <div className="formula-box">
          <button className="ds-formula-toggle" onClick={() => setShowFormula(s => !s)}>
            <span className="formula-box-title" style={{ margin: 0 }}>{tc.formula}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {showFormula ? tc.showLess : tc.showMore}
            </span>
          </button>
          {showFormula && (
            <div className="formula-list" style={{ marginTop: 'var(--space-3)' }}>
              <div className="formula-row">
                <span className="formula-name">H</span>
                <span className="formula-expr">= (12 / N(N+1)) × Σ(R<sub>j</sub>² / n<sub>j</sub>) − 3(N+1)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">Tie corr.</span>
                <span className="formula-expr">C = 1 − Σ(t<sub>i</sub>³ − t<sub>i</sub>) / (N³ − N)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">H<sub>corr</sub></span>
                <span className="formula-expr">= H / C, df = k − 1, p ~ χ²</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">Dunn z</span>
                <span className="formula-expr">= (R̄<sub>i</sub> − R̄<sub>j</sub>) / √(N(N+1)/12 · C · (1/n<sub>i</sub>+1/n<sub>j</sub>))</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">Bonferroni</span>
                <span className="formula-expr">p<sub>adj</sub> = min(1, p<sub>raw</sub> × m), m = k(k-1)/2</span>
              </div>
            </div>
          )}
        </div>

        <div className="bs-note">
          <span>ℹ</span>
          <span>{ts.kwNote}</span>
        </div>

        {/* Actions */}
        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={loadExample}>{ts.loadExample}</button>
          <button className="btn btn-ghost" onClick={resetAll}>{ts.reset}</button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result.valid ? (
          <>
            <div className={`bs-badge ${result.significant ? 'bs-badge--sig' : 'bs-badge--ns'}`}>
              {result.significant ? ts.significant : ts.notSignificant}
            </div>

            {/* Stats grid */}
            <div className="bs-stats-grid">
              <StatCard
                label={ts.kwHStat}
                value={fmtN(result.hCorrected)}
                sub={`H (uncorr.) = ${fmtN(result.h)}`}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard label={ts.dfLabel} value={result.df} sub={`k=${result.groups.length} groups`} />
              <StatCard
                label={ts.pValue}
                value={fmtP(result.pValue)}
                sub={result.significant ? '✓ p < 0.05' : '— p ≥ 0.05'}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.kwTieCorr}
                value={fmtN(result.tieCorrection, 4)}
                sub={`N = ${result.N}`}
              />
            </div>

            {/* Group descriptive table */}
            <div className="bs-chart-card" style={{ overflowX: 'auto' }}>
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.kwGroupTable}</h2>
              </div>
              <table className="anova-table">
                <thead>
                  <tr>
                    <th>{ts.kwGroup}</th>
                    <th>n</th>
                    <th>{ts.kwMedian}</th>
                    <th>{ts.kwMeanRank}</th>
                    <th>{ts.kwRankSum}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.groups.map((g, gi) => (
                    <tr key={gi}>
                      <td style={{ fontWeight: 600, color: GROUP_COLORS[gi % GROUP_COLORS.length] }}>{g.name}</td>
                      <td>{g.n}</td>
                      <td>{fmtN(g.median, 2)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{fmtN(g.meanRank, 2)}</td>
                      <td>{fmtN(g.rankSum, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Scatter chart per group */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.kwChartTitle}</h2>
                <span className="bs-chart-sub">
                  {lang === 'ko' ? '● 데이터 포인트  ◆ 중앙값' : '● data points  ◆ median'}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart margin={{ top: 12, right: 24, bottom: 40, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={xDomain}
                    tickCount={numGroups}
                    tickFormatter={v => {
                      const i = Math.round(v) - 1;
                      return i >= 0 && i < result.groups.length ? result.groups[i].name : '';
                    }}
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <YAxis
                    type="number"
                    domain={yDomain}
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    width={44}
                    label={{ value: ts.kwValueAxis, angle: -90, position: 'insideLeft', offset: 12, fill: 'var(--text-muted)', fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => [
                      typeof value === 'number' ? value.toFixed(3) : value,
                      lang === 'ko' ? '값' : 'Value',
                    ]}
                    labelFormatter={() => ''}
                  />
                  {/* Data points per group */}
                  {scatterDataPerGroup.map((pts, gi) => (
                    <Scatter
                      key={`pts-${gi}`}
                      name={result.groups[gi]?.name}
                      data={pts}
                      fill={GROUP_COLORS[gi % GROUP_COLORS.length]}
                      fillOpacity={0.65}
                      r={5}
                      isAnimationActive={false}
                      legendType="circle"
                    />
                  ))}
                  {/* Median diamonds */}
                  {medianData.map((pt, gi) => (
                    <Scatter
                      key={`med-${gi}`}
                      name={`${result.groups[gi]?.name} median`}
                      data={[pt]}
                      fill={GROUP_COLORS[gi % GROUP_COLORS.length]}
                      shape="diamond"
                      r={8}
                      isAnimationActive={false}
                      legendType="none"
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="bs-legend-row" style={{ marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                {result.groups.map((g, gi) => (
                  <span key={gi} className="bs-legend-item">
                    <span className="bs-legend-line" style={{ background: GROUP_COLORS[gi % GROUP_COLORS.length] }} />
                    {g.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Dunn's post-hoc (shown only if significant) */}
            {result.significant && result.dunnPairs.length > 0 && (
              <div className="bs-chart-card" style={{ padding: 'var(--space-3) var(--space-5)' }}>
                <button className="ds-formula-toggle" onClick={() => setShowPostHoc(s => !s)}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {ts.kwDunnTitle}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {showPostHoc ? tc.showLess : tc.showMore}
                  </span>
                </button>
                {showPostHoc && (
                  <div style={{ overflowX: 'auto', marginTop: 'var(--space-3)' }}>
                    <table className="anova-table">
                      <thead>
                        <tr>
                          <th>{ts.kwDunnPair}</th>
                          <th>z</th>
                          <th>{ts.kwDunnPRaw}</th>
                          <th>{ts.kwDunnPBonf}</th>
                          <th>{ts.tukeySig}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.dunnPairs.map((d, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{d.nameI} vs {d.nameJ}</td>
                            <td>{fmtN(d.z, 3)}</td>
                            <td>{fmtP(d.pRaw)}</td>
                            <td style={{ fontWeight: 600, color: d.significant ? 'var(--color-danger)' : 'var(--text-secondary)' }}>
                              {fmtP(d.pBonferroni)}
                            </td>
                            <td>{d.significant ? ts.tukeyYes : ts.tukeyNo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Interpretation */}
            <div className="bs-interp-card">
              <button className="ds-formula-toggle" onClick={() => setShowInterp(s => !s)}>
                <span className="bs-interp-title" style={{ margin: 0 }}>{ts.kwInterpTitle}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {showInterp ? tc.showLess : tc.showMore}
                </span>
              </button>
              {showInterp && (
                <div className="bs-interp-body" style={{ marginTop: 'var(--space-3)' }}>
                  {interpText}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">H</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KruskalWallis;
