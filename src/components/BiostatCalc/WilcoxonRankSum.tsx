import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcWilcoxon } from './biostat';

interface Props { lang: Lang }

const EXAMPLE_G1 = '12, 15, 14, 10, 18, 11, 16, 13';
const EXAMPLE_G2 = '20, 22, 19, 25, 21, 23, 18, 24';

function parseValues(raw: string): number[] {
  return raw.split(',').map(s => parseFloat(s.trim())).filter(Number.isFinite);
}

function fmtP(p: number): string {
  if (p < 0.001) return '< 0.001';
  return p.toFixed(3);
}

interface StatCardProps { label: string; value: React.ReactNode; sub?: string; accent?: string }
const StatCard: React.FC<StatCardProps> = ({ label, value, sub, accent }) => (
  <div className="bs-stat-card">
    <div className="bs-stat-label">{label}</div>
    <div className="bs-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
    {sub && <div className="bs-stat-sub">{sub}</div>}
  </div>
);

const WilcoxonRankSum: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;
  const [rawG1, setRawG1] = useState(EXAMPLE_G1);
  const [rawG2, setRawG2] = useState(EXAMPLE_G2);
  const [showFormula, setShowFormula] = useState(false);

  const g1 = useMemo(() => parseValues(rawG1), [rawG1]);
  const g2 = useMemo(() => parseValues(rawG2), [rawG2]);
  const result = useMemo(() => calcWilcoxon(g1, g2), [g1, g2]);

  // Build distribution chart data (sorted values per group)
  const distData = useMemo(() => {
    const maxN = Math.max(g1.length, g2.length);
    const s1 = [...g1].sort((a, b) => a - b);
    const s2 = [...g2].sort((a, b) => a - b);
    return Array.from({ length: maxN }, (_, i) => ({
      idx: String(i + 1),
      g1: s1[i] ?? null,
      g2: s2[i] ?? null,
    }));
  }, [g1, g2]);

  const interpText = useMemo(() => {
    if (!result.valid) return '';
    const direction = lang === 'ko'
      ? (result.u1 < result.u2 ? '그룹 1이 그룹 2보다 낮은 경향' : '그룹 1이 그룹 2보다 높은 경향')
      : (result.u1 < result.u2 ? 'Group 1 tends to have lower values than Group 2' : 'Group 1 tends to have higher values than Group 2');
    if (result.significant) {
      return lang === 'ko'
        ? `${ts.wrSig} (U = ${result.uStat.toFixed(1)}, Z = ${result.z.toFixed(3)}, p = ${fmtP(result.pValue)}). ${direction}.`
        : `${ts.wrSig} (U = ${result.uStat.toFixed(1)}, Z = ${result.z.toFixed(3)}, p = ${fmtP(result.pValue)}). ${direction}.`;
    }
    return lang === 'ko'
      ? `${ts.wrNS} (U = ${result.uStat.toFixed(1)}, Z = ${result.z.toFixed(3)}, p = ${fmtP(result.pValue)}).`
      : `${ts.wrNS} (U = ${result.uStat.toFixed(1)}, Z = ${result.z.toFixed(3)}, p = ${fmtP(result.pValue)}).`;
  }, [result, ts, lang]);

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        <div className="bs-group-card">
          <div className="bs-group-title" style={{ color: 'var(--color-primary)' }}>{ts.wrGroup1}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.wrGroup1Label}</label>
            <textarea
              className="bs-textarea"
              value={rawG1}
              onChange={e => setRawG1(e.target.value)}
              placeholder="e.g. 12, 15, 14, 10"
              spellCheck={false}
              rows={3}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
              {g1.length > 0 ? `n = ${g1.length}` : ''}
            </div>
          </div>
        </div>

        <div className="bs-group-card">
          <div className="bs-group-title" style={{ color: 'var(--color-info)' }}>{ts.wrGroup2}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.wrGroup2Label}</label>
            <textarea
              className="bs-textarea"
              value={rawG2}
              onChange={e => setRawG2(e.target.value)}
              placeholder="e.g. 20, 22, 19, 25"
              spellCheck={false}
              rows={3}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
              {g2.length > 0 ? `n = ${g2.length}` : ''}
            </div>
          </div>
        </div>

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
                <span className="formula-name">U₁</span>
                <span className="formula-expr">= n₁n₂ + n₁(n₁+1)/2 − W₁</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">U₂</span>
                <span className="formula-expr">= n₁n₂ − U₁</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">μ<sub>U</sub></span>
                <span className="formula-expr">= n₁n₂ / 2</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">Z</span>
                <span className="formula-expr">= (U − μ<sub>U</sub>) / σ<sub>U</sub></span>
              </div>
            </div>
          )}
        </div>

        <div className="bs-note">
          <span>ℹ</span>
          <span>{ts.wrNote}</span>
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => { setRawG1(EXAMPLE_G1); setRawG2(EXAMPLE_G2); }}>
            {ts.loadExample}
          </button>
          <button className="btn btn-ghost" onClick={() => { setRawG1(''); setRawG2(''); }}>
            {ts.reset}
          </button>
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
                label={ts.wrUStat}
                value={result.uStat.toFixed(1)}
                sub={`U₁ = ${result.u1.toFixed(1)}, U₂ = ${result.u2.toFixed(1)}`}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.wrZStat}
                value={result.z.toFixed(3)}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.pValue}
                value={fmtP(result.pValue)}
                sub={`n₁=${result.n1}, n₂=${result.n2}`}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.wrRankSum}
                value={result.rankSumW1.toFixed(1)}
                accent="var(--color-info)"
              />
            </div>

            {/* Distribution chart */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.wrDistTitle}</h2>
                <span className="bs-chart-sub">n₁={result.n1}, n₂={result.n2}</span>
              </div>
              <div className="bs-legend-row">
                <span className="bs-legend-item">
                  <span className="bs-legend-dot" style={{ background: 'var(--color-primary)', opacity: 0.8 }} />
                  {ts.wrGroup1}
                </span>
                <span className="bs-legend-item">
                  <span className="bs-legend-dot" style={{ background: 'var(--color-info)', opacity: 0.8 }} />
                  {ts.wrGroup2}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={distData} margin={{ top: 8, right: 16, bottom: 24, left: 8 }} barCategoryGap="25%" barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="idx" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
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
                  <Bar dataKey="g1" name={ts.wrGroup1} isAnimationActive={false} maxBarSize={22}>
                    {distData.map((_, i) => (
                      <Cell key={i} fill="var(--color-primary)" fillOpacity={0.75} />
                    ))}
                  </Bar>
                  <Bar dataKey="g2" name={ts.wrGroup2} isAnimationActive={false} maxBarSize={22}>
                    {distData.map((_, i) => (
                      <Cell key={i} fill="var(--color-info)" fillOpacity={0.75} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Interpretation */}
            <div className="bs-interp-card">
              <div className="bs-interp-title">{ts.wrInterpTitle}</div>
              <div className="bs-interp-body">{interpText}</div>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">U</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WilcoxonRankSum;
