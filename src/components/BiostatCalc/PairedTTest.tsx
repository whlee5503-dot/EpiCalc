import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts';
import type { Lang } from '../../i18n/translations';
import { translations } from '../../i18n/translations';
import { calcPairedTTest } from './biostat';

interface Props { lang: Lang }

const EXAMPLE_BEFORE = '120, 135, 140, 118, 125, 132, 128, 145, 122, 130';
const EXAMPLE_AFTER  = '115, 128, 132, 112, 119, 125, 121, 138, 116, 124';

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

const PairedTTest: React.FC<Props> = ({ lang }) => {
  const ts = translations[lang].biostat;
  const tc = translations[lang].common;
  const [rawBefore, setRawBefore] = useState(EXAMPLE_BEFORE);
  const [rawAfter, setRawAfter] = useState(EXAMPLE_AFTER);
  const [showFormula, setShowFormula] = useState(false);

  const before = useMemo(() => parseValues(rawBefore), [rawBefore]);
  const after  = useMemo(() => parseValues(rawAfter),  [rawAfter]);
  const result = useMemo(() => calcPairedTTest(before, after), [before, after]);

  const nMismatch = before.length > 0 && after.length > 0 && before.length !== after.length;

  const beforeAfterData = useMemo(
    () => {
      const n = Math.min(before.length, after.length);
      return Array.from({ length: n }, (_, i) => ({
        pair: String(i + 1),
        before: before[i],
        after: after[i],
      }));
    },
    [before, after],
  );

  const diffData = useMemo(
    () => result.valid
      ? result.diffs.map((d, i) => ({ pair: String(i + 1), diff: parseFloat(d.toFixed(4)) }))
      : [],
    [result],
  );

  return (
    <div className="bs-layout">
      {/* ── Left: Inputs ── */}
      <div className="bs-left">
        <div className="bs-group-card">
          <div className="bs-group-title" style={{ color: 'var(--color-info)' }}>{ts.ptBefore}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.ptBeforeLabel}</label>
            <textarea
              className="bs-textarea"
              value={rawBefore}
              onChange={e => setRawBefore(e.target.value)}
              placeholder="e.g. 120, 135, 140"
              spellCheck={false}
              rows={3}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
              {before.length > 0 ? `n = ${before.length}` : ''}
            </div>
          </div>
        </div>

        <div className="bs-group-card">
          <div className="bs-group-title">{ts.ptAfter}</div>
          <div className="bs-input-group">
            <label className="bs-label">{ts.ptAfterLabel}</label>
            <textarea
              className="bs-textarea"
              value={rawAfter}
              onChange={e => setRawAfter(e.target.value)}
              placeholder="e.g. 115, 128, 132"
              spellCheck={false}
              rows={3}
            />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', minHeight: '1em' }}>
              {after.length > 0 ? `n = ${after.length}` : ''}
            </div>
          </div>
        </div>

        {nMismatch && (
          <div className="bs-warning">
            <span className="bs-warning-icon">⚠</span>
            <span>{ts.ptNMismatch}</span>
          </div>
        )}

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
                <span className="formula-name">d<sub>i</sub></span>
                <span className="formula-expr">= x<sub>B,i</sub> − x<sub>A,i</sub></span>
              </div>
              <div className="formula-row">
                <span className="formula-name">d̄</span>
                <span className="formula-expr">= Σd<sub>i</sub> / n</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">S<sub>d</sub></span>
                <span className="formula-expr">= √[Σ(d<sub>i</sub> − d̄)² / (n−1)]</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">t</span>
                <span className="formula-expr">= d̄ / (S<sub>d</sub> / √n)</span>
              </div>
              <div className="formula-row">
                <span className="formula-name">df</span>
                <span className="formula-expr">= n − 1</span>
              </div>
            </div>
          )}
        </div>

        <div className="calc-actions">
          <button
            className="btn btn-secondary"
            onClick={() => { setRawBefore(EXAMPLE_BEFORE); setRawAfter(EXAMPLE_AFTER); }}
          >
            {ts.loadExample}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setRawBefore(''); setRawAfter(''); }}
          >
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
                label={ts.ptMeanDiff}
                value={result.dBar.toFixed(3)}
                sub={`Sd = ${result.sd.toFixed(3)}`}
                accent="var(--color-primary)"
              />
              <StatCard
                label={ts.ptSE}
                value={result.se.toFixed(4)}
                accent="var(--color-info)"
              />
              <StatCard
                label={ts.tStat}
                value={result.t.toFixed(3)}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
              <StatCard
                label={ts.dfLabel}
                value={result.df}
                accent="var(--color-info)"
              />
              <StatCard
                label={ts.pValue}
                value={fmtP(result.pValue)}
                sub={`n = ${result.n}`}
                accent={result.significant ? 'var(--color-danger)' : 'var(--color-primary)'}
              />
            </div>

            <div className="bs-ci-card">
              <span className="bs-ci-label">{ts.ci95}</span>
              <span className="bs-ci-value">
                [{result.ciLow.toFixed(3)},&nbsp;{result.ciHigh.toFixed(3)}]
              </span>
              <span className="bs-ci-hint">
                {result.ciLow > 0 || result.ciHigh < 0 ? ts.ciExcludes0 : ts.ciIncludes0}
              </span>
            </div>

            {/* Before / After grouped bar chart */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.ptBeforeAfterTitle}</h2>
                <span className="bs-chart-sub">n = {result.n}</span>
              </div>
              <div className="bs-legend-row">
                <span className="bs-legend-item">
                  <span className="bs-legend-dot" style={{ background: 'var(--color-info)', opacity: 0.8 }} />
                  {ts.ptBefore}
                </span>
                <span className="bs-legend-item">
                  <span className="bs-legend-dot" style={{ background: 'var(--color-primary)', opacity: 0.8 }} />
                  {ts.ptAfter}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={beforeAfterData}
                  margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
                  barCategoryGap="25%"
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="pair"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: ts.ptPairLabel, position: 'insideBottomRight', offset: -4, fill: 'var(--text-muted)', fontSize: 10 }}
                  />
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
                  <Bar
                    dataKey="before"
                    name={ts.ptBefore}
                    fill="var(--color-info)"
                    fillOpacity={0.75}
                    isAnimationActive={false}
                    maxBarSize={22}
                  />
                  <Bar
                    dataKey="after"
                    name={ts.ptAfter}
                    fill="var(--color-primary)"
                    fillOpacity={0.75}
                    isAnimationActive={false}
                    maxBarSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Individual differences bar chart */}
            <div className="bs-chart-card">
              <div className="bs-chart-header">
                <h2 className="bs-chart-title">{ts.ptDiffDistTitle}</h2>
                <span className="bs-chart-sub">d̄ = {result.dBar.toFixed(3)}</span>
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart
                  data={diffData}
                  margin={{ top: 8, right: 48, bottom: 24, left: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis
                    dataKey="pair"
                    tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                    label={{ value: ts.ptPairLabel, position: 'insideBottomRight', offset: -4, fill: 'var(--text-muted)', fontSize: 10 }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                    width={44}
                  />
                  <Tooltip
                    formatter={(value) => [
                      typeof value === 'number' ? value.toFixed(3) : value,
                      ts.ptDiffLabel,
                    ]}
                    contentStyle={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <ReferenceLine y={0} stroke="var(--text-muted)" strokeWidth={1} />
                  <ReferenceLine
                    y={result.dBar}
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    label={{
                      value: `d̄ = ${result.dBar.toFixed(2)}`,
                      position: 'right',
                      fill: 'var(--color-accent)',
                      fontSize: 10,
                    }}
                  />
                  <Bar dataKey="diff" isAnimationActive={false} maxBarSize={32}>
                    {diffData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.diff >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'}
                        fillOpacity={0.75}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="bs-empty-state">
            <div className="bs-empty-icon">Δ</div>
            <div className="bs-empty-text">
              {nMismatch ? ts.ptNMismatch : ts.invalidInput}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PairedTTest;
