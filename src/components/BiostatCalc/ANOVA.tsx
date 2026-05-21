import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, ErrorBar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcANOVA, calcTukeyHSD } from './biostat';

interface Props { lang: Lang }

const GROUP_COLORS = [
  'var(--color-primary)',
  'var(--color-info)',
  'var(--color-accent)',
  'var(--color-danger)',
  'var(--color-primary-light)',
];

interface GroupDef { name: string; raw: string }

const DEFAULT_GROUPS: GroupDef[] = [
  { name: 'Group A', raw: '10, 12, 11, 13, 10' },
  { name: 'Group B', raw: '15, 14, 16, 15, 17' },
  { name: 'Group C', raw: '8, 9, 8, 10, 9' },
];

const EXAMPLE_GROUPS: GroupDef[] = [
  { name: 'Group A', raw: '23, 25, 28, 22, 27' },
  { name: 'Group B', raw: '30, 32, 28, 35, 31' },
  { name: 'Group C', raw: '20, 18, 22, 19, 21' },
];

function parseValues(raw: string): number[] {
  return raw.split(',').map(s => parseFloat(s.trim())).filter(v => Number.isFinite(v));
}

function fmtP(p: number): string {
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

interface StatCardProps { label: string; value: React.ReactNode; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
  </div>
);

const ANOVA: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;
  const [groups, setGroups] = useState<GroupDef[]>(DEFAULT_GROUPS);

  const parsedGroups = useMemo(
    () => groups.map(g => ({ name: g.name, values: parseValues(g.raw) })),
    [groups],
  );

  const result = useMemo(() => calcANOVA(parsedGroups), [parsedGroups]);
  const tukey = useMemo(() => calcTukeyHSD(result), [result]);

  const chartData = useMemo(
    () => result.valid
      ? result.groups.map(g => ({ name: g.name, mean: parseFloat(g.mean.toFixed(4)), sd: parseFloat(g.sd.toFixed(4)) }))
      : [],
    [result],
  );

  const addGroup = () => {
    if (groups.length >= 5) return;
    const letter = String.fromCharCode(65 + groups.length);
    setGroups(prev => [...prev, { name: `Group ${letter}`, raw: '' }]);
  };

  const removeGroup = () => {
    if (groups.length <= 2) return;
    setGroups(prev => prev.slice(0, -1));
  };

  const updateGroup = (i: number, key: keyof GroupDef, val: string) => {
    setGroups(prev => { const n = [...prev]; n[i] = { ...n[i], [key]: val }; return n; });
  };

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        {groups.map((g, i) => {
          const n = parseValues(g.raw).length;
          return (
            <div key={i} className="bs-group-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: GROUP_COLORS[i], flexShrink: 0, display: 'inline-block',
                }} />
                <input
                  className="bs-number-input"
                  style={{
                    fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.8rem',
                    color: GROUP_COLORS[i], textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}
                  value={g.name}
                  onChange={e => updateGroup(i, 'name', e.target.value)}
                />
              </div>
              <div className="bs-input-group">
                <label className="bs-label">{ts.anovaValues}</label>
                <input
                  type="text"
                  className="bs-number-input"
                  placeholder="e.g. 23, 25, 28"
                  value={g.raw}
                  onChange={e => updateGroup(i, 'raw', e.target.value)}
                />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
                  {n > 0 ? `n = ${n}` : ''}
                </div>
              </div>
            </div>
          );
        })}

        <div className="bs-chitbl-controls">
          <button className="bs-tbl-btn" onClick={addGroup} disabled={groups.length >= 5}>{ts.anovaAddGroup}</button>
          <button className="bs-tbl-btn" onClick={removeGroup} disabled={groups.length <= 2}>{ts.anovaRemoveGroup}</button>
        </div>

        {/* Formula */}
        <div className="formula-box">
          <div className="formula-box-title">{tc.formula}</div>
          <div className="formula-list">
            <div className="formula-row">
              <span className="formula-name">F</span>
              <span className="formula-expr">= MS<sub>B</sub> / MS<sub>W</sub></span>
            </div>
            <div className="formula-row">
              <span className="formula-name">MS</span>
              <span className="formula-expr">= SS / df</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">df<sub>B</sub></span>
              <span className="formula-expr">= k − 1</span>
            </div>
            <div className="formula-row">
              <span className="formula-name">df<sub>W</sub></span>
              <span className="formula-expr">= N − k</span>
            </div>
          </div>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setGroups(EXAMPLE_GROUPS)}>{ts.loadExample}</button>
          <button className="btn btn-ghost" onClick={() => setGroups(DEFAULT_GROUPS)}>{ts.reset}</button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="bs-right">
        {result.valid ? (
          <>
            <div className={`bs-badge ${result.significant ? 'bs-badge--sig' : 'bs-badge--ns'}`}>
              {result.significant ? ts.significant : ts.notSignificant}
            </div>

            <div className="bs-stats-grid">
              <StatCard
                label={ts.anovaFStat}
                value={result.f.toFixed(3)}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.pValue}
                value={fmtP(result.pValue)}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard label={`df (${ts.anovaBetween})`} value={result.dfBetween} accent="var(--color-info)" />
              <StatCard label={`df (${ts.anovaWithin})`} value={result.dfWithin} accent="var(--color-info)" />
            </div>

            {/* ANOVA Summary Table */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.anovaSummaryTitle}</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="anova-table">
                  <thead>
                    <tr>
                      {[ts.anovaSourceCol, 'SS', 'df', 'MS', 'F', ts.annovaPValueCol].map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="anova-table__source">{ts.anovaBetween}</td>
                      <td>{result.ssBetween.toFixed(3)}</td>
                      <td>{result.dfBetween}</td>
                      <td>{result.msBetween.toFixed(3)}</td>
                      <td style={{ color: result.significant ? 'var(--color-danger)' : 'inherit', fontWeight: 600 }}>
                        {result.f.toFixed(3)}
                      </td>
                      <td style={{ color: result.significant ? 'var(--color-danger)' : 'inherit', fontWeight: 600 }}>
                        {fmtP(result.pValue)}
                      </td>
                    </tr>
                    <tr>
                      <td className="anova-table__source">{ts.anovaWithin}</td>
                      <td>{result.ssWithin.toFixed(3)}</td>
                      <td>{result.dfWithin}</td>
                      <td>{result.msWithin.toFixed(3)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>—</td>
                      <td style={{ color: 'var(--text-muted)' }}>—</td>
                    </tr>
                    <tr className="anova-table__total-row">
                      <td className="anova-table__source">{ts.anovaTotal}</td>
                      <td>{result.ssTotal.toFixed(3)}</td>
                      <td>{result.dfBetween + result.dfWithin}</td>
                      <td colSpan={3} />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Group Means ± SD Bar Chart */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.anovaGroupMeans}</h2>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} width={44} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Bar dataKey="mean" isAnimationActive={false} maxBarSize={64}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={GROUP_COLORS[i % GROUP_COLORS.length]} fillOpacity={0.75} />
                    ))}
                    <ErrorBar dataKey="sd" width={4} strokeWidth={2} stroke="var(--text-secondary)" direction="y" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tukey HSD Post-Hoc */}
            {tukey.valid && (
              <div className="bs-chart-card">
                <div className="bs-chart-header">
                  <h2 className="bs-chart-title">{ts.anovaPostHocTukey}</h2>
                  <span className="bs-chart-sub">α = 0.05</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="anova-table">
                    <thead>
                      <tr>
                        {[ts.tukeyPair, ts.tukeyMeanDiff, ts.tukeyCI95, ts.tukeyQ, ts.tukeySig].map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tukey.pairs.map((pair, i) => (
                        <tr key={i}>
                          <td className="anova-table__source">{pair.nameI} − {pair.nameJ}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{pair.meanDiff.toFixed(3)}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                            [{pair.ciLow.toFixed(3)}, {pair.ciHigh.toFixed(3)}]
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>{pair.q.toFixed(3)}</td>
                          <td style={{ color: pair.significant ? 'var(--color-danger)' : 'var(--text-muted)', fontWeight: 700 }}>
                            {pair.significant ? ts.tukeyYes : ts.tukeyNo}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">F</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ANOVA;
