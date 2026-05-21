import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcMcNemar } from './biostat';

interface Props { lang: Lang }

interface Cells { a: number; b: number; c: number; d: number }

const DEFAULT_CELLS: Cells = { a: 5, b: 5, c: 5, d: 5 };
const EXAMPLE_CELLS: Cells = { a: 30, b: 15, c: 5, d: 50 };

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

const McNemarTest: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;
  const [cells, setCells] = useState<Cells>(EXAMPLE_CELLS);
  const [showFormula, setShowFormula] = useState(false);

  const { a, b, c, d } = cells;
  const n = a + b + c + d;

  const result = useMemo(() => calcMcNemar(a, b, c, d), [a, b, c, d]);

  const updateCell = (key: keyof Cells, raw: string) => {
    const v = Math.max(0, Math.floor(parseFloat(raw) || 0));
    setCells(prev => ({ ...prev, [key]: v }));
  };

  const barData = useMemo(() => [
    { name: 'a', label: lang === 'ko' ? '일치 (+/+)' : 'Concordant (+/+)', value: a, fill: 'var(--color-primary)' },
    { name: 'b', label: lang === 'ko' ? '불일치 (+/−)' : 'Discordant (+/−)', value: b, fill: 'var(--color-danger)' },
    { name: 'c', label: lang === 'ko' ? '불일치 (−/+)' : 'Discordant (−/+)', value: c, fill: 'var(--color-accent)' },
    { name: 'd', label: lang === 'ko' ? '일치 (−/−)' : 'Concordant (−/−)', value: d, fill: 'var(--color-info)' },
  ], [a, b, c, d, lang]);

  const interpText = useMemo(() => {
    if (!result.valid) return '';
    const pct = (v: number) => n > 0 ? (v / n * 100).toFixed(1) + '%' : '—';
    if (result.significant) {
      return lang === 'ko'
        ? `${ts.mnSig} (χ² = ${result.chiSq.toFixed(3)}, p = ${fmtP(result.pValue)}). 불일치 쌍: b=${b} (${pct(b)}), c=${c} (${pct(c)}). ${b > c ? '양성→음성 전환이 더 많습니다.' : '음성→양성 전환이 더 많습니다.'}`
        : `${ts.mnSig} (χ² = ${result.chiSq.toFixed(3)}, p = ${fmtP(result.pValue)}). Discordant pairs: b=${b} (${pct(b)}), c=${c} (${pct(c)}). ${b > c ? 'More positive-to-negative changes.' : 'More negative-to-positive changes.'}`;
    }
    return lang === 'ko'
      ? `${ts.mnNS} (χ² = ${result.chiSq.toFixed(3)}, p = ${fmtP(result.pValue)}). 불일치 쌍: b=${b}, c=${c}.`
      : `${ts.mnNS} (χ² = ${result.chiSq.toFixed(3)}, p = ${fmtP(result.pValue)}). Discordant pairs: b=${b}, c=${c}.`;
  }, [result, ts, lang, b, c, n]);

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        <div className="bs-chitbl-wrap">
          <div className="bs-group-title" style={{ marginBottom: 'var(--space-3)' }}>{ts.mnTableTitle}</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 'var(--space-1)',
          }}>
            {/* header row */}
            <div className="bs-chitbl-corner" />
            <div className="bs-chitbl-hdr">{ts.mnTest2Pos}</div>
            <div className="bs-chitbl-hdr">{ts.mnTest2Neg}</div>
            {/* row 1 */}
            <div className="bs-chitbl-hdr" style={{ textAlign: 'left', paddingLeft: 'var(--space-1)' }}>{ts.mnTest1Pos}</div>
            <input
              type="number"
              min={0}
              className="bs-chitbl-cell"
              value={a}
              onChange={e => updateCell('a', e.target.value)}
              title="a"
            />
            <input
              type="number"
              min={0}
              className="bs-chitbl-cell"
              value={b}
              onChange={e => updateCell('b', e.target.value)}
              title="b"
            />
            {/* row 2 */}
            <div className="bs-chitbl-hdr" style={{ textAlign: 'left', paddingLeft: 'var(--space-1)' }}>{ts.mnTest1Neg}</div>
            <input
              type="number"
              min={0}
              className="bs-chitbl-cell"
              value={c}
              onChange={e => updateCell('c', e.target.value)}
              title="c"
            />
            <input
              type="number"
              min={0}
              className="bs-chitbl-cell"
              value={d}
              onChange={e => updateCell('d', e.target.value)}
              title="d"
            />
          </div>
          <div style={{ marginTop: 'var(--space-2)', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            n = {n} &nbsp;|&nbsp; b+c = {b + c}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <div style={{ padding: 'var(--space-2)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>a</span> — {ts.mnPosPos}
          </div>
          <div style={{ padding: 'var(--space-2)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-danger)' }}>b</span> — {ts.mnPosNeg}
          </div>
          <div style={{ padding: 'var(--space-2)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-accent)' }}>c</span> — {ts.mnNegPos}
          </div>
          <div style={{ padding: 'var(--space-2)', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-secondary)' }}>d</span> — {ts.mnNegNeg}
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
                <span className="formula-name">χ²</span>
                <span className="formula-expr">= (|b−c|−1)² / (b+c)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">df</span>
                <span className="formula-expr">= 1</span>
              </div>
              <div className="formula-row" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span className="formula-name" style={{ fontSize: '0.72rem' }}>*</span>
                <span className="formula-expr" style={{ fontSize: '0.72rem' }}>Yates continuity correction applied</span>
              </div>
            </div>
          )}
        </div>

        <div className="calc-actions">
          <button className="btn btn-secondary" onClick={() => setCells(EXAMPLE_CELLS)}>{ts.loadExample}</button>
          <button className="btn btn-ghost" onClick={() => setCells(DEFAULT_CELLS)}>{ts.reset}</button>
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
                label={ts.mnChi2}
                value={result.chiSq.toFixed(3)}
                sub="df = 1"
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.pValue}
                value={fmtP(result.pValue)}
                sub={`n = ${result.n}`}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.mnDiscordant}
                value={result.b + result.c}
                sub={`b=${result.b}, c=${result.c}`}
                accent="var(--color-accent)"
              />
              <StatCard
                label={ts.mnConcordance}
                value={`${(result.concordance * 100).toFixed(1)}%`}
                sub={`${ts.mnDiscordance}: ${(result.discordance * 100).toFixed(1)}%`}
                accent="var(--color-info)"
              />
            </div>

            {/* Cell distribution bar chart */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.mnTableTitle}</h2>
                <span className="bs-chart-sub">n = {result.n}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} width={40} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                    }}
                    formatter={(value) => [value, lang === 'ko' ? '빈도' : 'Count']}
                  />
                  <Bar dataKey="value" isAnimationActive={false} maxBarSize={64}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Interpretation */}
            <div className="bs-interp-card">
              <div className="bs-interp-title">{ts.mnInterpTitle}</div>
              <div className="bs-interp-body">{interpText}</div>
            </div>

            <div className="bs-note">
              <span>ℹ</span>
              <span>{ts.mnNote}</span>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">χ²</div>
            <div className="bs-empty-text">{ts.invalidInput}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default McNemarTest;
