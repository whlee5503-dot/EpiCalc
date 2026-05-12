// ============================================================
// EpiCalc — Epidemiology Calculation Utilities
// All formulas follow standard epidemiological definitions
// ============================================================

export interface TwoByTwoTable {
  a: number; // Exposed+, Disease+
  b: number; // Exposed+, Disease-
  c: number; // Exposed-, Disease+
  d: number; // Exposed-, Disease-
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
}

export interface EpiResult {
  value: number;
  ci95: ConfidenceInterval;
  label: string;
  interpretation: string;
}

export interface EpiMetrics {
  rr: EpiResult | null;
  or: EpiResult | null;
  arr: EpiResult | null;
  nnt: EpiResult | null;
  // Exposed group
  riskExposed: number;
  riskUnexposed: number;
  // Totals
  total: number;
  totalExposed: number;
  totalUnexposed: number;
  totalDisease: number;
  totalNoDisease: number;
}

export interface ScreeningMetrics {
  sensitivity: EpiResult;
  specificity: EpiResult;
  ppv: EpiResult;
  npv: EpiResult;
  accuracy: EpiResult;
  lrPositive: EpiResult;
  lrNegative: EpiResult;
  prevalence: number;
}

// ── Relative Risk ──────────────────────────────────────────
// RR = [a/(a+b)] / [c/(c+d)]
// 95% CI: exp(ln(RR) ± 1.96 * sqrt(1/a - 1/(a+b) + 1/c - 1/(c+d)))
export function calcRR(t: TwoByTwoTable): EpiResult | null {
  const { a, b, c, d } = t;
  if (a + b === 0 || c + d === 0) return null;
  if (a === 0 && c === 0) return null;

  const p1 = a / (a + b);
  const p2 = c / (c + d);
  if (p2 === 0) return null;

  const rr = p1 / p2;
  const lnRR = Math.log(rr);
  const se = Math.sqrt(1 / a - 1 / (a + b) + 1 / c - 1 / (c + d));
  const lower = Math.exp(lnRR - 1.96 * se);
  const upper = Math.exp(lnRR + 1.96 * se);

  return {
    value: rr,
    ci95: { lower, upper },
    label: 'Relative Risk (RR)',
    interpretation: interpretRR(rr),
  };
}

function interpretRR(rr: number): string {
  if (rr > 1.1) return 'Exposure increases disease risk';
  if (rr < 0.9) return 'Exposure decreases disease risk (protective)';
  return 'No meaningful association';
}

// ── Odds Ratio ─────────────────────────────────────────────
// OR = (a*d) / (b*c)
// 95% CI: exp(ln(OR) ± 1.96 * sqrt(1/a + 1/b + 1/c + 1/d))
export function calcOR(t: TwoByTwoTable): EpiResult | null {
  const { a, b, c, d } = t;
  if (b === 0 || c === 0) return null;

  const or = (a * d) / (b * c);
  const lnOR = Math.log(or);
  const se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  const lower = Math.exp(lnOR - 1.96 * se);
  const upper = Math.exp(lnOR + 1.96 * se);

  return {
    value: or,
    ci95: { lower, upper },
    label: 'Odds Ratio (OR)',
    interpretation: interpretOR(or),
  };
}

function interpretOR(or: number): string {
  if (or > 1.1) return 'Exposure associated with higher odds';
  if (or < 0.9) return 'Exposure associated with lower odds (protective)';
  return 'No meaningful association';
}

// ── Absolute Risk Reduction ────────────────────────────────
// ARR = |p1 - p2|
// NNT = 1 / ARR
export function calcARR(t: TwoByTwoTable): EpiResult | null {
  const { a, b, c, d } = t;
  if (a + b === 0 || c + d === 0) return null;

  const p1 = a / (a + b);
  const p2 = c / (c + d);
  const arr = Math.abs(p1 - p2);

  // CI for ARR using normal approximation
  const se = Math.sqrt(
    (p1 * (1 - p1)) / (a + b) + (p2 * (1 - p2)) / (c + d)
  );
  const lower = Math.max(0, arr - 1.96 * se);
  const upper = Math.min(1, arr + 1.96 * se);

  return {
    value: arr,
    ci95: { lower, upper },
    label: 'Absolute Risk Reduction (ARR)',
    interpretation: `Risk difference of ${(arr * 100).toFixed(1)}%`,
  };
}

export function calcNNT(t: TwoByTwoTable): EpiResult | null {
  const arrResult = calcARR(t);
  if (!arrResult || arrResult.value === 0) return null;

  const nnt = 1 / arrResult.value;
  const lower = 1 / arrResult.ci95.upper;
  const upper = 1 / arrResult.ci95.lower;

  return {
    value: nnt,
    ci95: { lower, upper },
    label: 'Number Needed to Treat (NNT)',
    interpretation: `Treat ${Math.round(nnt)} patients to prevent 1 outcome`,
  };
}

// ── All Epi Metrics ────────────────────────────────────────
export function calcAllMetrics(t: TwoByTwoTable): EpiMetrics {
  const { a, b, c, d } = t;
  return {
    rr: calcRR(t),
    or: calcOR(t),
    arr: calcARR(t),
    nnt: calcNNT(t),
    riskExposed: a + b > 0 ? a / (a + b) : 0,
    riskUnexposed: c + d > 0 ? c / (c + d) : 0,
    total: a + b + c + d,
    totalExposed: a + b,
    totalUnexposed: c + d,
    totalDisease: a + c,
    totalNoDisease: b + d,
  };
}

// ── Screening Metrics ──────────────────────────────────────
// Uses same 2x2 table, reinterpreted as:
//         Test+   Test-
// True+    a       c
// True-    b       d
export function calcScreening(t: TwoByTwoTable): ScreeningMetrics {
  const { a, b, c, d } = t;
  const eps = 1e-10; // avoid div by zero

  const sens = a / (a + c + eps);
  const spec = d / (b + d + eps);
  const ppv = a / (a + b + eps);
  const npv = d / (c + d + eps);
  const acc = (a + d) / (a + b + c + d + eps);
  const lrPos = sens / (1 - spec + eps);
  const lrNeg = (1 - sens) / (spec + eps);
  const prevalence = (a + c) / (a + b + c + d + eps);

  const ciProp = (p: number, n: number): ConfidenceInterval => {
    const se = Math.sqrt((p * (1 - p)) / (n + eps));
    return { lower: Math.max(0, p - 1.96 * se), upper: Math.min(1, p + 1.96 * se) };
  };

  const n1 = a + c; // disease+
  const n2 = b + d; // disease-
  const nTotal = a + b + c + d;

  return {
    sensitivity: { value: sens, ci95: ciProp(sens, n1), label: 'Sensitivity', interpretation: `Detects ${(sens * 100).toFixed(1)}% of true positives` },
    specificity: { value: spec, ci95: ciProp(spec, n2), label: 'Specificity', interpretation: `Correctly rules out ${(spec * 100).toFixed(1)}% of negatives` },
    ppv:         { value: ppv,  ci95: ciProp(ppv, a + b), label: 'PPV', interpretation: `${(ppv * 100).toFixed(1)}% of positive tests are true disease` },
    npv:         { value: npv,  ci95: ciProp(npv, c + d), label: 'NPV', interpretation: `${(npv * 100).toFixed(1)}% of negative tests are truly disease-free` },
    accuracy:    { value: acc,  ci95: ciProp(acc, nTotal), label: 'Accuracy', interpretation: `Overall correct classification: ${(acc * 100).toFixed(1)}%` },
    lrPositive:  { value: lrPos, ci95: { lower: lrPos * 0.8, upper: lrPos * 1.2 }, label: 'LR+', interpretation: lrPos > 10 ? 'Strong evidence of disease' : lrPos > 5 ? 'Moderate evidence' : 'Weak evidence' },
    lrNegative:  { value: lrNeg, ci95: { lower: lrNeg * 0.8, upper: lrNeg * 1.2 }, label: 'LR−', interpretation: lrNeg < 0.1 ? 'Strong evidence against disease' : lrNeg < 0.2 ? 'Moderate evidence against' : 'Weak evidence' },
    prevalence,
  };
}

// ── Formatters ─────────────────────────────────────────────
export function fmtNum(n: number, decimals = 2): string {
  if (!isFinite(n)) return '—';
  return n.toFixed(decimals);
}

export function fmtPct(n: number, decimals = 1): string {
  if (!isFinite(n)) return '—';
  return `${(n * 100).toFixed(decimals)}%`;
}

export function fmtCI(ci: ConfidenceInterval, decimals = 2): string {
  return `(${fmtNum(ci.lower, decimals)} – ${fmtNum(ci.upper, decimals)})`;
}
