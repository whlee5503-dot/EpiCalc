// ─── Normal CDF ─────────────────────────────────────────────────────────────
// Abramowitz & Stegun rational approximation, max error 7.5e-8
export function normalCDF(z: number): number {
  if (z < -8) return 0;
  if (z > 8) return 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly = t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - 0.3989422804014327 * Math.exp(-0.5 * z * z) * poly;
  return z >= 0 ? p : 1 - p;
}

// ─── Log-Gamma (Lanczos, g=7) ────────────────────────────────────────────────
function gammaLn(z: number): number {
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - gammaLn(1 - z);
  z -= 1;
  let x = p[0];
  for (let i = 1; i < p.length; i++) x += p[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// ─── Regularized Incomplete Beta — Lentz continued fraction ─────────────────
function betaCF(x: number, a: number, b: number): number {
  const MAXIT = 200, EPS = 3e-7, FPMIN = 1e-30;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function betaReg(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lnbeta = gammaLn(a) + gammaLn(b) - gammaLn(a + b);
  const factor = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lnbeta);
  return x < (a + 1) / (a + b + 2)
    ? factor * betaCF(x, a, b) / a
    : 1 - factor * betaCF(1 - x, b, a) / b;
}

// ─── Student's t-distribution ────────────────────────────────────────────────
function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const ib = betaReg(x, df / 2, 0.5);
  return t >= 0 ? 1 - ib / 2 : ib / 2;
}

export function tPValue(t: number, df: number): number {
  return 2 * (1 - tCDF(Math.abs(t), df));
}

export function tPDF(t: number, df: number): number {
  const logNorm = gammaLn((df + 1) / 2) - gammaLn(df / 2) - 0.5 * Math.log(df * Math.PI);
  return Math.exp(logNorm - ((df + 1) / 2) * Math.log(1 + t * t / df));
}

// Critical value for two-tailed test via bisection (60 iterations → precision ~1e-17)
export function tCritical(alpha: number, df: number): number {
  let lo = 0, hi = 20;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (tPValue(mid, df) > alpha) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ─── Lookup tables ───────────────────────────────────────────────────────────
export interface AlphaOption { label: string; value: number; z: number }
export interface PowerOption { label: string; value: number; z: number }

export const ALPHA_OPTIONS: AlphaOption[] = [
  { label: '0.01', value: 0.01, z: 2.576 },
  { label: '0.05', value: 0.05, z: 1.960 },
  { label: '0.10', value: 0.10, z: 1.645 },
];

export const POWER_OPTIONS: PowerOption[] = [
  { label: '0.80 (80%)', value: 0.80, z: 0.842 },
  { label: '0.90 (90%)', value: 0.90, z: 1.282 },
  { label: '0.95 (95%)', value: 0.95, z: 1.645 },
];

// ─── Sample Size (Two-Proportion Test) ───────────────────────────────────────
export interface SampleSizeResult {
  n: number;
  total: number;
  arr: number;
  nnt: number;
  valid: boolean;
}

export function calcSampleSize(
  p1: number, p2: number, alphaZ: number, powerZ: number,
): SampleSizeResult {
  if (
    isNaN(p1) || isNaN(p2) ||
    p1 <= 0 || p1 >= 1 || p2 <= 0 || p2 >= 1 ||
    Math.abs(p1 - p2) < 1e-9
  ) {
    return { n: 0, total: 0, arr: 0, nnt: Infinity, valid: false };
  }
  const diff = p1 - p2;
  const nRaw = (alphaZ + powerZ) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2)) / (diff * diff);
  const n = Math.ceil(nRaw);
  const arr = Math.abs(diff);
  return { n, total: 2 * n, arr, nnt: 1 / arr, valid: true };
}

export interface PowerPoint { n: number; power: number }

export function calcPowerCurve(
  p1: number, p2: number, alphaZ: number, targetN: number,
): PowerPoint[] {
  const diff = Math.abs(p1 - p2);
  const v = p1 * (1 - p1) + p2 * (1 - p2);
  if (diff < 1e-9 || v <= 0 || targetN <= 0) return [];
  const maxN = Math.max(targetN * 2.5, 60);
  const step = Math.max(1, Math.round(maxN / 60));
  const pts: PowerPoint[] = [];
  for (let n = step; n <= maxN; n += step) {
    pts.push({ n, power: Math.max(0, Math.min(1, normalCDF(diff * Math.sqrt(n / v) - alphaZ))) });
  }
  return pts;
}

// ─── Independent t-test ──────────────────────────────────────────────────────
export interface TTestResult {
  t: number;
  df: number;
  pValue: number;
  meanDiff: number;
  ciLow: number;
  ciHigh: number;
  se: number;
  sp: number;
  significant: boolean;
  valid: boolean;
}

export function calcTTest(
  mean1: number, sd1: number, n1: number,
  mean2: number, sd2: number, n2: number,
): TTestResult {
  const bad = [mean1, sd1, n1, mean2, sd2, n2].some(isNaN);
  if (bad || n1 < 2 || n2 < 2 || sd1 < 0 || sd2 < 0) {
    return { t: 0, df: 0, pValue: 1, meanDiff: 0, ciLow: 0, ciHigh: 0, se: 0, sp: 0, significant: false, valid: false };
  }
  const df = n1 + n2 - 2;
  const sp2 = ((n1 - 1) * sd1 * sd1 + (n2 - 1) * sd2 * sd2) / df;
  const sp = Math.sqrt(sp2);
  const se = sp * Math.sqrt(1 / n1 + 1 / n2);
  if (se === 0) {
    return { t: 0, df, pValue: 1, meanDiff: 0, ciLow: 0, ciHigh: 0, se: 0, sp, significant: false, valid: false };
  }
  const meanDiff = mean1 - mean2;
  const t = meanDiff / se;
  const pValue = tPValue(t, df);
  const tc = tCritical(0.05, df);
  return {
    t, df, pValue, meanDiff,
    ciLow: meanDiff - tc * se,
    ciHigh: meanDiff + tc * se,
    se, sp, significant: pValue < 0.05, valid: true,
  };
}

// ─── Chi-square distribution ─────────────────────────────────────────────────
// Regularized lower incomplete gamma P(a, x) via series (x < a+1) or CF complement (x ≥ a+1)
function gammaIncP(a: number, x: number): number {
  if (x <= 0) return 0;
  const MAXIT = 300, EPS = 3e-8, FPMIN = 1e-30;
  const logf = -x + a * Math.log(x) - gammaLn(a);
  if (x < a + 1) {
    let sum = 1 / a, term = 1 / a;
    for (let n = 1; n <= MAXIT; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < EPS * Math.abs(sum)) break;
    }
    return Math.exp(logf) * sum;
  }
  // Continued fraction for Q(a,x) = 1 - P(a,x), Lentz's algorithm (NR §6.2)
  let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  let h = d;
  for (let i = 1; i <= MAXIT; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return 1 - Math.exp(logf) * h;
}

export function chiSquarePDF(x: number, df: number): number {
  if (x < 0) return 0;
  if (x === 0) { return df === 2 ? 0.5 : df < 2 ? Infinity : 0; }
  const a = df / 2;
  const v = Math.exp((a - 1) * Math.log(x) - x / 2 - a * Math.log(2) - gammaLn(a));
  return isFinite(v) ? v : 0;
}

export function chiSquarePValue(chi2: number, df: number): number {
  if (chi2 <= 0) return 1;
  return 1 - gammaIncP(df / 2, chi2 / 2);
}

export interface ChiSquareResult {
  chi2: number;
  df: number;
  pValue: number;
  significant: boolean;
  expected: number[][];
  hasSmallExpected: boolean;
  valid: boolean;
}

export function calcChiSquare(observed: number[][]): ChiSquareResult {
  const nrows = observed.length;
  const ncols = observed[0]?.length ?? 0;
  const fail = { chi2: 0, df: 0, pValue: 1, significant: false, expected: [], hasSmallExpected: false, valid: false };
  if (nrows < 2 || ncols < 2) return fail;
  const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals = observed[0].map((_, j) => observed.reduce((s, r) => s + r[j], 0));
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);
  if (grandTotal === 0 || rowTotals.some(r => r === 0) || colTotals.some(c => c === 0)) return fail;
  const expected = observed.map((row, i) => row.map((_, j) => rowTotals[i] * colTotals[j] / grandTotal));
  let chi2 = 0, hasSmallExpected = false;
  for (let i = 0; i < nrows; i++) {
    for (let j = 0; j < ncols; j++) {
      if (expected[i][j] < 5) hasSmallExpected = true;
      chi2 += (observed[i][j] - expected[i][j]) ** 2 / expected[i][j];
    }
  }
  const df = (nrows - 1) * (ncols - 1);
  return { chi2, df, pValue: chiSquarePValue(chi2, df), significant: chiSquarePValue(chi2, df) < 0.05, expected, hasSmallExpected, valid: true };
}

export interface ChiDistPoint { x: number; pdf: number; body: number; tail: number }
export interface ChiCurveResult { data: ChiDistPoint[]; xMax: number; xcrit: number }

export function calcChiSquareCurve(chi2: number, df: number): ChiCurveResult {
  // Critical value at alpha=0.05 (right tail) via bisection
  let lo = 0, hi = 50;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    chiSquarePValue(mid, df) > 0.05 ? lo = mid : hi = mid;
  }
  const xcrit = (lo + hi) / 2;
  const xMax = Math.max(chi2 * 1.6, xcrit * 1.6, df * 3, 10);
  const numPts = 300;
  const xStart = df === 1 ? 0.05 : 0;
  const step = (xMax - xStart) / numPts;
  const data: ChiDistPoint[] = Array.from({ length: numPts + 1 }, (_, i) => {
    const x = xStart + i * step;
    const pdf = chiSquarePDF(x, df);
    const safe = isFinite(pdf) ? pdf : 0;
    const inTail = x >= xcrit;
    return { x: parseFloat(x.toFixed(4)), pdf: safe, body: inTail ? 0 : safe, tail: inTail ? safe : 0 };
  });
  return { data, xMax, xcrit };
}

// ─── Standard Normal PDF ────────────────────────────────────────────────────
export function normalPDF(z: number): number {
  return Math.exp(-0.5 * z * z) * 0.3989422804014327;
}

// ─── Z-Test ──────────────────────────────────────────────────────────────────
export interface ZTestResult {
  z: number;
  pValue: number;
  meanDiff: number;
  ciLow: number;
  ciHigh: number;
  se: number;
  significant: boolean;
  valid: boolean;
}

export function calcZTestOneSample(
  xbar: number, mu0: number, sigma: number, n: number,
): ZTestResult {
  const fail: ZTestResult = { z: 0, pValue: 1, meanDiff: 0, ciLow: 0, ciHigh: 0, se: 0, significant: false, valid: false };
  if ([xbar, mu0, sigma, n].some(isNaN) || n < 1 || sigma <= 0) return fail;
  const se = sigma / Math.sqrt(n);
  const meanDiff = xbar - mu0;
  const z = meanDiff / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  return { z, pValue, meanDiff, se, ciLow: meanDiff - 1.96 * se, ciHigh: meanDiff + 1.96 * se, significant: pValue < 0.05, valid: true };
}

export function calcZTestTwoSample(
  mean1: number, sigma1: number, n1: number,
  mean2: number, sigma2: number, n2: number,
): ZTestResult {
  const fail: ZTestResult = { z: 0, pValue: 1, meanDiff: 0, ciLow: 0, ciHigh: 0, se: 0, significant: false, valid: false };
  if ([mean1, sigma1, n1, mean2, sigma2, n2].some(isNaN) || n1 < 1 || n2 < 1 || sigma1 <= 0 || sigma2 <= 0) return fail;
  const se = Math.sqrt(sigma1 * sigma1 / n1 + sigma2 * sigma2 / n2);
  const meanDiff = mean1 - mean2;
  const z = meanDiff / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  return { z, pValue, meanDiff, se, ciLow: meanDiff - 1.96 * se, ciHigh: meanDiff + 1.96 * se, significant: pValue < 0.05, valid: true };
}

// ─── Standard Normal curve for visualization ─────────────────────────────────
export interface ZDistPoint { z: number; pdf: number; body: number; tail: number }
export interface ZDistCurveResult { data: ZDistPoint[]; zRange: number; zcrit: number }

export function calcZDistCurve(zStat: number): ZDistCurveResult {
  const zcrit = 1.96;
  const zRange = Math.min(Math.max(Math.abs(zStat) + 1.5, 3.5), 6);
  const numPts = 300;
  const step = (2 * zRange) / numPts;
  const data: ZDistPoint[] = Array.from({ length: numPts + 1 }, (_, i) => {
    const z = -zRange + i * step;
    const pdf = normalPDF(z);
    const inTail = Math.abs(z) >= zcrit;
    return { z: parseFloat(z.toFixed(4)), pdf, body: inTail ? 0 : pdf, tail: inTail ? pdf : 0 };
  });
  return { data, zRange, zcrit };
}

// ─── F-distribution p-value (via regularized incomplete beta) ─────────────────
export function fPValue(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;
  const x = (df1 * f) / (df1 * f + df2);
  return 1 - betaReg(x, df1 / 2, df2 / 2);
}

// ─── One-Way ANOVA ───────────────────────────────────────────────────────────
export interface ANOVAGroup { name: string; values: number[] }

export interface ANOVAGroupStats { name: string; n: number; mean: number; sd: number; values: number[] }

export interface ANOVAResult {
  f: number;
  dfBetween: number;
  dfWithin: number;
  ssBetween: number;
  ssWithin: number;
  ssTotal: number;
  msBetween: number;
  msWithin: number;
  pValue: number;
  significant: boolean;
  groups: ANOVAGroupStats[];
  valid: boolean;
}

export function calcANOVA(groups: ANOVAGroup[]): ANOVAResult {
  const fail: ANOVAResult = { f: 0, dfBetween: 0, dfWithin: 0, ssBetween: 0, ssWithin: 0, ssTotal: 0, msBetween: 0, msWithin: 0, pValue: 1, significant: false, groups: [], valid: false };
  const valid = groups.filter(g => g.values.length >= 2);
  if (valid.length < 2) return fail;
  const k = valid.length;
  const N = valid.reduce((s, g) => s + g.values.length, 0);
  const grandMean = valid.flatMap(g => g.values).reduce((a, b) => a + b, 0) / N;
  const groupStats: ANOVAGroupStats[] = valid.map(g => {
    const n = g.values.length;
    const mean = g.values.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(g.values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
    return { name: g.name, n, mean, sd, values: g.values };
  });
  const ssBetween = groupStats.reduce((s, g) => s + g.n * (g.mean - grandMean) ** 2, 0);
  const ssWithin = groupStats.reduce((s, g) => s + g.values.reduce((sv, v) => sv + (v - g.mean) ** 2, 0), 0);
  const ssTotal = ssBetween + ssWithin;
  const dfBetween = k - 1;
  const dfWithin = N - k;
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  if (msWithin <= 0) return fail;
  const f = msBetween / msWithin;
  const pValue = fPValue(f, dfBetween, dfWithin);
  return { f, dfBetween, dfWithin, ssBetween, ssWithin, ssTotal, msBetween, msWithin, pValue, significant: pValue < 0.05, groups: groupStats, valid: true };
}

// ─── Paired t-Test ───────────────────────────────────────────────────────────
export interface PairedTTestResult {
  n: number;
  diffs: number[];
  dBar: number;
  sd: number;
  se: number;
  t: number;
  df: number;
  pValue: number;
  ciLow: number;
  ciHigh: number;
  significant: boolean;
  valid: boolean;
}

export function calcPairedTTest(before: number[], after: number[]): PairedTTestResult {
  const fail: PairedTTestResult = {
    n: 0, diffs: [], dBar: 0, sd: 0, se: 0, t: 0, df: 0,
    pValue: 1, ciLow: 0, ciHigh: 0, significant: false, valid: false,
  };
  if (before.length !== after.length || before.length < 2) return fail;
  const n = before.length;
  const diffs = before.map((b, i) => b - after[i]);
  const dBar = diffs.reduce((s, d) => s + d, 0) / n;
  const variance = diffs.reduce((s, d) => s + (d - dBar) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const se = sd / Math.sqrt(n);
  if (se === 0) return fail;
  const t = dBar / se;
  const df = n - 1;
  const pValue = tPValue(t, df);
  const tc = tCritical(0.05, df);
  return {
    n, diffs, dBar, sd, se, t, df, pValue,
    ciLow: dBar - tc * se,
    ciHigh: dBar + tc * se,
    significant: pValue < 0.05,
    valid: true,
  };
}

// ─── Descriptive Statistics ──────────────────────────────────────────────────
export interface DescriptiveStatsResult {
  n: number;
  mean: number;
  median: number;
  mode: number[];
  sd: number;
  variance: number;
  range: number;
  iqr: number;
  cv: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
  skewness: number;
  kurtosis: number;
  valid: boolean;
}

function percentileLinear(sorted: number[], p: number): number {
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const idx = (p / 100) * (n - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

export function calcDescriptiveStats(values: number[]): DescriptiveStatsResult {
  const fail: DescriptiveStatsResult = {
    n: 0, mean: 0, median: 0, mode: [], sd: 0, variance: 0,
    range: 0, iqr: 0, cv: 0, min: 0, max: 0, q1: 0, q3: 0,
    skewness: 0, kurtosis: 0, valid: false,
  };
  const v = values.filter(Number.isFinite);
  if (v.length < 2) return fail;
  const n = v.length;
  const sorted = [...v].sort((a, b) => a - b);
  const mean = v.reduce((s, x) => s + x, 0) / n;
  const median = percentileLinear(sorted, 50);

  const freq = new Map<number, number>();
  for (const x of v) freq.set(x, (freq.get(x) ?? 0) + 1);
  const maxFreq = Math.max(...freq.values());
  const mode = maxFreq > 1
    ? [...freq.entries()].filter(([, f]) => f === maxFreq).map(([k]) => k).sort((a, b) => a - b)
    : [];

  const variance = v.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;
  const q1 = percentileLinear(sorted, 25);
  const q3 = percentileLinear(sorted, 75);
  const iqr = q3 - q1;
  const cv = mean !== 0 ? (sd / Math.abs(mean)) * 100 : NaN;

  let skewness = 0;
  if (n >= 3 && sd > 0) {
    const m3 = v.reduce((s, x) => s + ((x - mean) / sd) ** 3, 0);
    skewness = (n / ((n - 1) * (n - 2))) * m3;
  }

  let kurtosis = 0;
  if (n >= 4 && sd > 0) {
    const m4 = v.reduce((s, x) => s + ((x - mean) / sd) ** 4, 0);
    kurtosis = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4
      - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  }

  return { n, mean, median, mode, sd, variance, range, iqr, cv, min, max, q1, q3, skewness, kurtosis, valid: true };
}

export interface HistBin { bin: string; range: string; count: number }

export function calcHistBins(values: number[]): HistBin[] {
  if (values.length < 2) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return [{ bin: String(min), range: String(min), count: values.length }];
  const k = Math.min(15, Math.max(3, Math.ceil(Math.log2(values.length) + 1)));
  const binWidth = (max - min) / k;
  const bins: (HistBin & { x0: number; x1: number })[] = Array.from({ length: k }, (_, i) => {
    const x0 = min + i * binWidth;
    const x1 = min + (i + 1) * binWidth;
    return { bin: x0.toFixed(1), range: `${x0.toFixed(1)}–${x1.toFixed(1)}`, count: 0, x0, x1 };
  });
  for (const v of values) {
    let i = Math.floor((v - min) / binWidth);
    if (i >= k) i = k - 1;
    bins[i].count++;
  }
  return bins.map(({ bin, range, count }) => ({ bin, range, count }));
}

// ─── Fisher's Exact Test ─────────────────────────────────────────────────────
export interface FishersExactResult {
  or: number;
  orCiLow: number;
  orCiHigh: number;
  pValue: number;
  significant: boolean;
  n: number;
  valid: boolean;
}

export function calcFishersExact(a: number, b: number, c: number, d: number): FishersExactResult {
  const fail: FishersExactResult = {
    or: NaN, orCiLow: NaN, orCiHigh: NaN, pValue: 1, significant: false, n: 0, valid: false,
  };
  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c) || !Number.isInteger(d)) return fail;
  if (a < 0 || b < 0 || c < 0 || d < 0) return fail;
  const n = a + b + c + d;
  if (n === 0) return fail;
  const r1 = a + b, r2 = c + d, c1 = a + c, c2 = b + d;
  if (r1 === 0 || r2 === 0 || c1 === 0 || c2 === 0) return fail;

  // Odds Ratio
  const bc = b * c;
  const ad = a * d;
  const or = bc === 0 ? (ad > 0 ? Infinity : NaN) : ad / bc;

  // 95% CI via Woolf log method (valid only when all cells > 0)
  let orCiLow = NaN, orCiHigh = NaN;
  if (a > 0 && b > 0 && c > 0 && d > 0 && isFinite(or)) {
    const se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
    orCiLow  = Math.exp(Math.log(or) - 1.96 * se);
    orCiHigh = Math.exp(Math.log(or) + 1.96 * se);
  }

  // Two-tailed p-value via exact hypergeometric enumeration (log-space for stability)
  const logConst = gammaLn(r1 + 1) + gammaLn(r2 + 1) + gammaLn(c1 + 1) + gammaLn(c2 + 1) - gammaLn(n + 1);
  const logP = (k: number) =>
    logConst - gammaLn(k + 1) - gammaLn(r1 - k + 1) - gammaLn(c1 - k + 1) - gammaLn(r2 - c1 + k + 1);
  const kMin = Math.max(0, r1 - c2);
  const kMax = Math.min(r1, c1);
  const logPObs = logP(a);
  let pValue = 0;
  for (let k = kMin; k <= kMax; k++) {
    const lp = logP(k);
    if (lp <= logPObs + 1e-10) pValue += Math.exp(lp);
  }
  pValue = Math.min(1, pValue);

  return { or, orCiLow, orCiHigh, pValue, significant: pValue < 0.05, n, valid: true };
}

// ─── Correlation ─────────────────────────────────────────────────────────────
function ranks(arr: number[]): number[] {
  const indexed = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const result = new Array(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j + 1].v === indexed[j].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) result[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return result;
}

export interface CorrelationResult {
  n: number;
  pearsonR: number;
  spearmanRho: number;
  tStat: number;
  pValue: number;
  ciLow: number;
  ciHigh: number;
  rSquared: number;
  valid: boolean;
}

export function calcCorrelation(x: number[], y: number[]): CorrelationResult {
  const fail: CorrelationResult = { n: 0, pearsonR: 0, spearmanRho: 0, tStat: 0, pValue: 1, ciLow: 0, ciHigh: 0, rSquared: 0, valid: false };
  if (x.length !== y.length || x.length < 3) return fail;
  const n = x.length;

  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;
  let sXY = 0, sX2 = 0, sY2 = 0;
  for (let i = 0; i < n; i++) {
    sXY += (x[i] - meanX) * (y[i] - meanY);
    sX2 += (x[i] - meanX) ** 2;
    sY2 += (y[i] - meanY) ** 2;
  }
  if (sX2 === 0 || sY2 === 0) return fail;
  const pearsonR = sXY / Math.sqrt(sX2 * sY2);

  const rankX = ranks(x);
  const rankY = ranks(y);
  const mrX = rankX.reduce((s, v) => s + v, 0) / n;
  const mrY = rankY.reduce((s, v) => s + v, 0) / n;
  let srXY = 0, srX2 = 0, srY2 = 0;
  for (let i = 0; i < n; i++) {
    srXY += (rankX[i] - mrX) * (rankY[i] - mrY);
    srX2 += (rankX[i] - mrX) ** 2;
    srY2 += (rankY[i] - mrY) ** 2;
  }
  const spearmanRho = srX2 === 0 || srY2 === 0 ? 0 : srXY / Math.sqrt(srX2 * srY2);

  const r2 = pearsonR * pearsonR;
  const tStat = r2 >= 1 ? Infinity : pearsonR * Math.sqrt(n - 2) / Math.sqrt(1 - r2);
  const pValue = tPValue(tStat, n - 2);

  // Fisher's z transformation for 95% CI (requires n >= 4)
  const z = Math.atanh(pearsonR);
  const se = 1 / Math.sqrt(n - 3);
  const ciLow = Math.tanh(z - 1.96 * se);
  const ciHigh = Math.tanh(z + 1.96 * se);

  return { n, pearsonR, spearmanRho, tStat, pValue, ciLow, ciHigh, rSquared: r2, valid: true };
}

// ─── Linear Regression ───────────────────────────────────────────────────────
export interface LinearRegressionResult {
  n: number;
  slope: number;
  intercept: number;
  rSquared: number;
  adjRSquared: number;
  se: number;
  seSlope: number;
  seIntercept: number;
  tSlope: number;
  tIntercept: number;
  pSlope: number;
  pIntercept: number;
  ciSlopeLow: number;
  ciSlopeHigh: number;
  fStat: number;
  pF: number;
  ssRes: number;
  ssTot: number;
  ssReg: number;
  residuals: number[];
  fitted: number[];
  valid: boolean;
}

export function calcLinearRegression(x: number[], y: number[]): LinearRegressionResult {
  const fail: LinearRegressionResult = {
    n: 0, slope: 0, intercept: 0, rSquared: 0, adjRSquared: 0,
    se: 0, seSlope: 0, seIntercept: 0, tSlope: 0, tIntercept: 0,
    pSlope: 1, pIntercept: 1, ciSlopeLow: 0, ciSlopeHigh: 0,
    fStat: 0, pF: 1, ssRes: 0, ssTot: 0, ssReg: 0,
    residuals: [], fitted: [], valid: false,
  };
  if (x.length !== y.length || x.length < 3) return fail;
  const n = x.length;
  const meanX = x.reduce((s, v) => s + v, 0) / n;
  const meanY = y.reduce((s, v) => s + v, 0) / n;

  let sXY = 0, sX2 = 0;
  for (let i = 0; i < n; i++) {
    sXY += (x[i] - meanX) * (y[i] - meanY);
    sX2 += (x[i] - meanX) ** 2;
  }
  if (sX2 === 0) return fail;

  const slope = sXY / sX2;
  const intercept = meanY - slope * meanX;

  const fitted = x.map(xi => intercept + slope * xi);
  const residuals = y.map((yi, i) => yi - fitted[i]);
  const ssRes = residuals.reduce((s, e) => s + e * e, 0);
  const ssTot = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0);
  if (ssTot === 0) return fail;
  const ssReg = ssTot - ssRes;

  const rSquared = 1 - ssRes / ssTot;
  const adjRSquared = 1 - (1 - rSquared) * (n - 1) / (n - 2);

  const df = n - 2;
  const se = Math.sqrt(ssRes / df);
  const seSlope = se / Math.sqrt(sX2);
  const seIntercept = se * Math.sqrt(x.reduce((s, xi) => s + xi * xi, 0) / (n * sX2));

  const tSlope = seSlope === 0 ? Infinity : slope / seSlope;
  const tIntercept = seIntercept === 0 ? Infinity : intercept / seIntercept;
  const pSlope = tPValue(tSlope, df);
  const pIntercept = tPValue(tIntercept, df);

  const tc = tCritical(0.05, df);
  const ciSlopeLow = slope - tc * seSlope;
  const ciSlopeHigh = slope + tc * seSlope;

  const fStat = ssReg / (ssRes / df);
  const pF = fPValue(fStat, 1, df);

  return {
    n, slope, intercept, rSquared, adjRSquared,
    se, seSlope, seIntercept, tSlope, tIntercept,
    pSlope, pIntercept, ciSlopeLow, ciSlopeHigh,
    fStat, pF, ssRes, ssTot, ssReg, residuals, fitted, valid: true,
  };
}

// ─── t-distribution curve for visualization ──────────────────────────────────
export interface TDistPoint { t: number; pdf: number; body: number; tail: number }
export interface TDistCurveResult { data: TDistPoint[]; tRange: number; tcrit: number }

export function calcTDistCurve(df: number, tStat: number): TDistCurveResult {
  const tcrit = tCritical(0.05, df);
  const tRange = Math.min(Math.max(Math.abs(tStat) + 2, tcrit + 1.5, 4.5), 8);
  const numPts = 300;
  const step = (2 * tRange) / numPts;
  const data: TDistPoint[] = Array.from({ length: numPts + 1 }, (_, i) => {
    const t = -tRange + i * step;
    const pdf = tPDF(t, df);
    const inTail = Math.abs(t) >= tcrit;
    return { t: parseFloat(t.toFixed(4)), pdf, body: inTail ? 0 : pdf, tail: inTail ? pdf : 0 };
  });
  return { data, tRange, tcrit };
}

// ─── Wilcoxon Rank-Sum (Mann-Whitney U) ──────────────────────────────────────
export interface WilcoxonResult {
  u1: number;
  u2: number;
  uStat: number;
  n1: number;
  n2: number;
  z: number;
  pValue: number;
  significant: boolean;
  rankSumW1: number;
  valid: boolean;
}

export function calcWilcoxon(group1: number[], group2: number[]): WilcoxonResult {
  const fail: WilcoxonResult = { u1: 0, u2: 0, uStat: 0, n1: 0, n2: 0, z: 0, pValue: 1, significant: false, rankSumW1: 0, valid: false };
  if (group1.length < 2 || group2.length < 2) return fail;
  const n1 = group1.length;
  const n2 = group2.length;

  // Assign ranks to combined sorted array (average ranks for ties)
  const combined = [
    ...group1.map(v => ({ v, grp: 1 })),
    ...group2.map(v => ({ v, grp: 2 })),
  ].sort((a, b) => a.v - b.v);

  const ranked = new Array(combined.length);
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length - 1 && combined[j + 1].v === combined[j].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranked[k] = avgRank;
    i = j + 1;
  }

  let rankSumW1 = 0;
  for (let k = 0; k < combined.length; k++) {
    if (combined[k].grp === 1) rankSumW1 += ranked[k];
  }

  const u1 = rankSumW1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const uStat = Math.min(u1, u2);

  // Normal approximation (valid when n1, n2 >= 8)
  const N = n1 + n2;
  const muU = (n1 * n2) / 2;

  // Tie correction for variance
  const tieGroups = new Map<number, number>();
  for (const { v } of combined) tieGroups.set(v, (tieGroups.get(v) ?? 0) + 1);
  let tieCorrection = 0;
  for (const t of tieGroups.values()) tieCorrection += t * t * t - t;
  const varU = ((n1 * n2) / 12) * (N + 1 - tieCorrection / (N * (N - 1)));

  if (varU <= 0) return fail;
  const z = (uStat - muU) / Math.sqrt(varU);
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  return { u1, u2, uStat, n1, n2, z, pValue, significant: pValue < 0.05, rankSumW1, valid: true };
}

// ─── McNemar Test ────────────────────────────────────────────────────────────
export interface McNemarResult {
  b: number;
  c: number;
  chiSq: number;
  pValue: number;
  significant: boolean;
  concordance: number;
  discordance: number;
  n: number;
  valid: boolean;
}

export function calcMcNemar(a: number, b: number, c: number, d: number): McNemarResult {
  const fail: McNemarResult = { b: 0, c: 0, chiSq: 0, pValue: 1, significant: false, concordance: 0, discordance: 0, n: 0, valid: false };
  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(c) || !Number.isInteger(d)) return fail;
  if (a < 0 || b < 0 || c < 0 || d < 0) return fail;
  const n = a + b + c + d;
  if (n === 0 || b + c === 0) return fail;

  // McNemar with continuity correction
  const chiSq = (Math.abs(b - c) - 1) ** 2 / (b + c);
  const pValue = chiSquarePValue(chiSq, 1);
  const concordance = (a + d) / n;
  const discordance = (b + c) / n;

  return { b, c, chiSq, pValue, significant: pValue < 0.05, concordance, discordance, n, valid: true };
}

// ─── Tukey HSD Post-Hoc ──────────────────────────────────────────────────────
export interface TukeyPair {
  i: number;
  j: number;
  nameI: string;
  nameJ: string;
  meanDiff: number;
  se: number;
  q: number;
  ciLow: number;
  ciHigh: number;
  significant: boolean;
}

export interface TukeyResult {
  pairs: TukeyPair[];
  msWithin: number;
  dfWithin: number;
  valid: boolean;
}

// Studentized range distribution p-value via simulation-free approximation
// Uses the Copenhaver & Holland (1988) rational approximation
function qCritical(alpha: number, k: number, df: number): number {
  // Bisect on the studentized range CDF approximation
  // We use the fact that Q ~ chi/sqrt(chi_df) and integrate numerically
  // Simpler: use the well-known table values approximated by:
  // For alpha=0.05, use polynomial fits per k (accurate to ~1%)
  const alphaKey = Math.round(alpha * 100);
  if (alphaKey !== 5) {
    // fallback for alpha != 0.05: use conservative t-based bound
    return tCritical(alpha / k / (k - 1), df) * Math.sqrt(2);
  }

  // q_crit table row: k=2..8 at alpha=0.05, df=inf (use as upper bound scale)
  const qInf = [0, 0, 2.772, 3.314, 3.633, 3.858, 4.030, 4.170, 4.286];
  const qBase = k <= 8 ? qInf[k] : qInf[8] + (k - 8) * 0.08;

  // df correction factor: q_crit(k,df) ≈ q_crit(k,∞) * (1 + 3/(df-2))^0.5
  const dfFactor = df > 4 ? Math.sqrt(1 + 3 / (df - 2)) : 1.35;
  return qBase * dfFactor;
}

export function calcTukeyHSD(anovaResult: { groups: ANOVAGroupStats[]; msWithin: number; dfWithin: number; valid: boolean }): TukeyResult {
  const fail: TukeyResult = { pairs: [], msWithin: 0, dfWithin: 0, valid: false };
  if (!anovaResult.valid) return fail;

  const { groups, msWithin, dfWithin } = anovaResult;
  const k = groups.length;
  const qcrit = qCritical(0.05, k, dfWithin);
  const pairs: TukeyPair[] = [];

  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const gi = groups[i];
      const gj = groups[j];
      const se = Math.sqrt(msWithin / 2 * (1 / gi.n + 1 / gj.n));
      const meanDiff = gi.mean - gj.mean;
      const q = Math.abs(meanDiff) / se;
      const hsd = qcrit * se;
      pairs.push({
        i, j,
        nameI: gi.name,
        nameJ: gj.name,
        meanDiff,
        se,
        q,
        ciLow: meanDiff - hsd,
        ciHigh: meanDiff + hsd,
        significant: q > qcrit,
      });
    }
  }

  return { pairs, msWithin, dfWithin, valid: true };
}

// ─── Kaplan-Meier Survival Analysis ──────────────────────────────────────────
export interface KMDataPoint { time: number; event: number }

export interface KMRow {
  time: number;
  nAtRisk: number;
  events: number;
  censored: number;
  survival: number;
  ciLow: number;
  ciHigh: number;
}

export interface KMChartPoint { time: number; survival: number; ciLow: number; ciHigh: number }
export interface KMCensoredPoint { time: number; survival: number }

export interface KMResult {
  rows: KMRow[];
  chartData: KMChartPoint[];
  censoredPoints: KMCensoredPoint[];
  medianSurvival: number | null;
  n: number;
  totalEvents: number;
  valid: boolean;
}

export function calcKaplanMeier(data: KMDataPoint[]): KMResult {
  const fail: KMResult = {
    rows: [], chartData: [], censoredPoints: [],
    medianSurvival: null, n: 0, totalEvents: 0, valid: false,
  };

  const valid = data.filter(d => Number.isFinite(d.time) && d.time >= 0 && (d.event === 0 || d.event === 1));
  if (valid.length < 2) return fail;

  const n = valid.length;
  const sorted = [...valid].sort((a, b) => a.time !== b.time ? a.time - b.time : a.event - b.event);

  // Unique event times (d > 0)
  const eventTimes = [...new Set(sorted.filter(d => d.event === 1).map(d => d.time))].sort((a, b) => a - b);
  if (eventTimes.length === 0) return fail;

  let survival = 1;
  let greenwoodSum = 0;
  const rows: KMRow[] = [];

  for (const t of eventTimes) {
    const nAtRisk = sorted.filter(d => d.time >= t).length;
    const events = sorted.filter(d => d.time === t && d.event === 1).length;
    const censored = sorted.filter(d => d.time === t && d.event === 0).length;

    if (nAtRisk === 0) continue;
    survival *= (1 - events / nAtRisk);

    if (nAtRisk > events) {
      greenwoodSum += events / (nAtRisk * (nAtRisk - events));
    }

    // Greenwood 95% CI using log-log transformation
    let ciLow = 0, ciHigh = 1;
    if (survival > 0 && survival < 1 && greenwoodSum > 0) {
      const lnS = Math.log(survival);
      const varTheta = greenwoodSum / (lnS * lnS); // Var[ln(-ln(S))]
      const c = Math.exp(1.96 * Math.sqrt(varTheta));
      ciLow = Math.max(0, Math.pow(survival, c));
      ciHigh = Math.min(1, Math.pow(survival, 1 / c));
    } else if (survival <= 0) {
      ciLow = 0; ciHigh = 0;
    } else {
      ciLow = survival; ciHigh = 1;
    }

    rows.push({ time: t, nAtRisk, events, censored, survival, ciLow, ciHigh });
  }

  if (rows.length === 0) return fail;

  // Step-function chart data starting at t=0, S=1
  const chartData: KMChartPoint[] = [
    { time: 0, survival: 1, ciLow: 1, ciHigh: 1 },
    ...rows.map(r => ({ time: r.time, survival: r.survival, ciLow: r.ciLow, ciHigh: r.ciHigh })),
  ];

  // Censored points: evaluate S(t) just before/at each censoring time
  const censoredPoints: KMCensoredPoint[] = sorted
    .filter(d => d.event === 0)
    .map(ct => {
      let sv = 1;
      for (const row of rows) {
        if (row.time <= ct.time) sv = row.survival;
        else break;
      }
      return { time: ct.time, survival: sv };
    });

  // Median survival: first t where S(t) <= 0.5
  const medianRow = rows.find(r => r.survival <= 0.5);
  const medianSurvival = medianRow ? medianRow.time : null;
  const totalEvents = sorted.filter(d => d.event === 1).length;

  return { rows, chartData, censoredPoints, medianSurvival, n, totalEvents, valid: true };
}

// ─── Log-Rank Test ────────────────────────────────────────────────────────────
export interface LogRankResult {
  chi2: number;
  df: number;
  pValue: number;
  significant: boolean;
  observedA: number;
  observedB: number;
  expectedA: number;
  expectedB: number;
  valid: boolean;
}

export function calcLogRank(groupA: KMDataPoint[], groupB: KMDataPoint[]): LogRankResult {
  const fail: LogRankResult = {
    chi2: 0, df: 1, pValue: 1, significant: false,
    observedA: 0, observedB: 0, expectedA: 0, expectedB: 0, valid: false,
  };

  const vA = groupA.filter(d => Number.isFinite(d.time) && (d.event === 0 || d.event === 1));
  const vB = groupB.filter(d => Number.isFinite(d.time) && (d.event === 0 || d.event === 1));
  if (vA.length < 2 || vB.length < 2) return fail;

  const allEventTimes = [...new Set([
    ...vA.filter(d => d.event === 1).map(d => d.time),
    ...vB.filter(d => d.event === 1).map(d => d.time),
  ])].sort((a, b) => a - b);

  if (allEventTimes.length === 0) return fail;

  let sumDiff = 0; // Σ(O_A - E_A)
  let sumVar = 0;  // Σ Mantel-Haenszel variance
  let totalObsA = 0;
  let totalExpA = 0;

  for (const t of allEventTimes) {
    const nA = vA.filter(d => d.time >= t).length;
    const nB = vB.filter(d => d.time >= t).length;
    const nTot = nA + nB;
    if (nTot === 0) continue;
    const dA = vA.filter(d => d.time === t && d.event === 1).length;
    const dB = vB.filter(d => d.time === t && d.event === 1).length;
    const dTot = dA + dB;
    if (dTot === 0) continue;
    const eA = nA * dTot / nTot;
    sumDiff += dA - eA;
    totalObsA += dA;
    totalExpA += eA;
    if (nTot > 1) {
      sumVar += (nA * nB * dTot * (nTot - dTot)) / (nTot * nTot * (nTot - 1));
    }
  }

  if (sumVar <= 0) return fail;

  const chi2 = (sumDiff * sumDiff) / sumVar;
  const pValue = chiSquarePValue(chi2, 1);
  const totalObsB = vB.filter(d => d.event === 1).length;

  return {
    chi2, df: 1, pValue, significant: pValue < 0.05,
    observedA: totalObsA, observedB: totalObsB,
    expectedA: totalExpA, expectedB: totalObsA + totalObsB - totalExpA,
    valid: true,
  };
}

// ─── Logistic Regression (Newton-Raphson IRLS) ────────────────────────────────
function logRegSigmoid(z: number): number {
  if (z < -500) return 1e-15;
  if (z > 500) return 1 - 1e-15;
  return 1 / (1 + Math.exp(-z));
}

function matInvGauss(A: number[][]): number[][] | null {
  const n = A.length;
  const aug = A.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(aug[r][col]) > Math.abs(aug[pivot][col])) pivot = r;
    }
    [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-14) return null;
    const piv = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= piv;
    for (let r = 0; r < n; r++) {
      if (r !== col) {
        const f = aug[r][col];
        for (let j = 0; j < 2 * n; j++) aug[r][j] -= f * aug[col][j];
      }
    }
  }
  return aug.map(row => row.slice(n));
}

export interface LogRegCoefficient {
  name: string;
  beta: number;
  se: number;
  z: number;
  pValue: number;
  or: number;
  orCiLow: number;
  orCiHigh: number;
  significant: boolean;
}

export interface LogRegResult {
  n: number;
  p: number;
  coefficients: LogRegCoefficient[];
  logLik: number;
  logLikNull: number;
  lrtChi2: number;
  lrtDf: number;
  lrtPValue: number;
  nagelkerkeR2: number;
  aic: number;
  auc: number;
  predictedProb: number[];
  rocPoints: { fpr: number; tpr: number }[];
  converged: boolean;
  valid: boolean;
}

export function calcLogisticRegression(
  Xraw: number[][],
  y: number[],
  varNames: string[],
): LogRegResult {
  const fail: LogRegResult = {
    n: 0, p: 0, coefficients: [], logLik: 0, logLikNull: 0,
    lrtChi2: 0, lrtDf: 0, lrtPValue: 1, nagelkerkeR2: 0,
    aic: 0, auc: 0, predictedProb: [], rocPoints: [],
    converged: false, valid: false,
  };

  const n = y.length;
  if (n < 6 || Xraw.length !== n || Xraw[0].length === 0) return fail;
  const p = Xraw[0].length;
  if (Xraw.some(row => row.length !== p)) return fail;
  // Need both classes present
  const nPos = y.reduce((s, yi) => s + yi, 0);
  if (nPos === 0 || nPos === n) return fail;

  const k = p + 1; // intercept + predictors
  const X = Xraw.map(row => [1, ...row]);

  let beta = new Array(k).fill(0);
  let converged = false;

  for (let iter = 0; iter < 100; iter++) {
    const prob = X.map(row => logRegSigmoid(row.reduce((s, x, j) => s + x * beta[j], 0)));

    // Gradient = X^T (y - p)
    const grad = Array.from({ length: k }, (_, j) =>
      y.reduce((s, yi, i) => s + X[i][j] * (yi - prob[i]), 0),
    );

    // Information matrix = X^T W X, W = diag(p_i(1-p_i))
    const XtWX = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < n; i++) {
      const w = prob[i] * (1 - prob[i]);
      for (let j = 0; j < k; j++)
        for (let l = 0; l < k; l++)
          XtWX[j][l] += X[i][j] * w * X[i][l];
    }

    const inv = matInvGauss(XtWX);
    if (!inv) break;

    const delta = Array.from({ length: k }, (_, j) =>
      inv[j].reduce((s, v, l) => s + v * grad[l], 0),
    );

    beta = beta.map((b, j) => b + delta[j]);
    if (Math.max(...delta.map(Math.abs)) < 1e-8) { converged = true; break; }
  }

  // Final probabilities and log-likelihood
  const prob = X.map(row => logRegSigmoid(row.reduce((s, x, j) => s + x * beta[j], 0)));
  const logLik = y.reduce((s, yi, i) => {
    const pi = Math.max(1e-15, Math.min(1 - 1e-15, prob[i]));
    return s + yi * Math.log(pi) + (1 - yi) * Math.log(1 - pi);
  }, 0);

  // Final SE from information matrix
  const XtWX_f = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < n; i++) {
    const w = prob[i] * (1 - prob[i]);
    for (let j = 0; j < k; j++)
      for (let l = 0; l < k; l++)
        XtWX_f[j][l] += X[i][j] * w * X[i][l];
  }
  const invF = matInvGauss(XtWX_f);
  const se = invF
    ? Array.from({ length: k }, (_, j) => Math.sqrt(Math.max(0, invF[j][j])))
    : new Array(k).fill(NaN);

  const zStats = beta.map((b, j) => (se[j] > 0 ? b / se[j] : 0));
  const pVals = zStats.map(zi => 2 * (1 - normalCDF(Math.abs(zi))));

  // Null model log-likelihood (intercept only, π = mean(y))
  const pBar = nPos / n;
  const logLikNull = y.reduce((s, yi) => {
    const pi = Math.max(1e-15, Math.min(1 - 1e-15, pBar));
    return s + yi * Math.log(pi) + (1 - yi) * Math.log(1 - pi);
  }, 0);

  const D0 = -2 * logLikNull;
  const D1 = -2 * logLik;
  const lrtChi2 = Math.max(0, D0 - D1);
  const lrtPValue = chiSquarePValue(lrtChi2, p);
  const nagelkerkeR2 = D0 > 0
    ? (1 - Math.exp((D1 - D0) / n)) / (1 - Math.exp(-D0 / n))
    : 0;
  const aic = D1 + 2 * k;

  const coefficients: LogRegCoefficient[] = beta.map((b, j) => ({
    name: j === 0 ? 'Intercept' : (varNames[j - 1] || `X${j}`),
    beta: b,
    se: se[j],
    z: zStats[j],
    pValue: pVals[j],
    or: Math.exp(b),
    orCiLow: Math.exp(b - 1.96 * se[j]),
    orCiHigh: Math.exp(b + 1.96 * se[j]),
    significant: pVals[j] < 0.05,
  }));

  // ROC curve
  const thresholds: number[] = Array.from({ length: 101 }, (_, i) => i / 100);
  const rocPoints = thresholds.map(thresh => {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (let i = 0; i < n; i++) {
      const pred = prob[i] >= thresh ? 1 : 0;
      if (pred === 1 && y[i] === 1) tp++;
      else if (pred === 1 && y[i] === 0) fp++;
      else if (pred === 0 && y[i] === 0) tn++;
      else fn++;
    }
    return {
      fpr: fp + tn > 0 ? fp / (fp + tn) : 0,
      tpr: tp + fn > 0 ? tp / (tp + fn) : 0,
    };
  }).sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);

  // AUC via trapezoidal rule
  let auc = 0;
  for (let i = 1; i < rocPoints.length; i++) {
    auc += (rocPoints[i].fpr - rocPoints[i - 1].fpr) * (rocPoints[i].tpr + rocPoints[i - 1].tpr) / 2;
  }

  return {
    n, p, coefficients, logLik, logLikNull, lrtChi2, lrtDf: p,
    lrtPValue, nagelkerkeR2, aic, auc: Math.abs(auc),
    predictedProb: prob, rocPoints, converged, valid: true,
  };
}

// ─── Kruskal-Wallis Test ──────────────────────────────────────────────────────
export interface KruskalWallisGroup { name: string; values: number[] }

export interface KruskalWallisGroupStats {
  name: string;
  n: number;
  median: number;
  meanRank: number;
  rankSum: number;
  values: number[];
  groupRanks: number[];
}

export interface DunnPair {
  nameI: string;
  nameJ: string;
  z: number;
  pRaw: number;
  pBonferroni: number;
  significant: boolean;
}

export interface KruskalWallisResult {
  h: number;
  hCorrected: number;
  df: number;
  pValue: number;
  significant: boolean;
  groups: KruskalWallisGroupStats[];
  dunnPairs: DunnPair[];
  tieCorrection: number;
  N: number;
  valid: boolean;
}

export function calcKruskalWallis(groups: KruskalWallisGroup[]): KruskalWallisResult {
  const fail: KruskalWallisResult = {
    h: 0, hCorrected: 0, df: 0, pValue: 1, significant: false,
    groups: [], dunnPairs: [], tieCorrection: 1, N: 0, valid: false,
  };

  const valid = groups.filter(g => g.values.length >= 2);
  if (valid.length < 2) return fail;
  const k = valid.length;

  // Pool all values with group index
  const pooled: { v: number; gIdx: number }[] = [];
  for (let gi = 0; gi < k; gi++) {
    for (const v of valid[gi].values) pooled.push({ v, gIdx: gi });
  }

  const N = pooled.length;
  if (N < 3) return fail;

  // Sort and assign average ranks for ties
  const sorted = [...pooled].sort((a, b) => a.v - b.v);
  const globalRanks = new Array<number>(N);

  let i = 0;
  while (i < N) {
    let j = i;
    while (j < N - 1 && sorted[j + 1].v === sorted[j].v) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let m = i; m <= j; m++) globalRanks[m] = avgRank;
    i = j + 1;
  }

  // Tie correction: C = 1 - Σ(t³ − t) / (N³ − N)
  const tieMap = new Map<number, number>();
  for (const { v } of sorted) tieMap.set(v, (tieMap.get(v) ?? 0) + 1);
  let tieSum = 0;
  for (const t of tieMap.values()) tieSum += t * t * t - t;
  const denom = N * N * N - N;
  const tieCorrection = denom > 0 ? 1 - tieSum / denom : 1;

  // Rank sums per group
  const rankSums = new Array<number>(k).fill(0);
  const groupRankArrays: number[][] = valid.map(() => []);
  for (let idx = 0; idx < N; idx++) {
    const gi = sorted[idx].gIdx;
    rankSums[gi] += globalRanks[idx];
    groupRankArrays[gi].push(globalRanks[idx]);
  }

  // H statistic: H = (12 / N(N+1)) × Σ(Rj²/nj) − 3(N+1)
  let sumRj2nj = 0;
  for (let gi = 0; gi < k; gi++) {
    const nj = valid[gi].values.length;
    sumRj2nj += (rankSums[gi] * rankSums[gi]) / nj;
  }
  const h = (12 / (N * (N + 1))) * sumRj2nj - 3 * (N + 1);
  const hCorrected = tieCorrection > 0 ? h / tieCorrection : h;

  const df = k - 1;
  const pValue = chiSquarePValue(Math.max(0, hCorrected), df);

  // Group descriptive stats
  const groupStats: KruskalWallisGroupStats[] = valid.map((g, gi) => {
    const sv = [...g.values].sort((a, b) => a - b);
    const n = sv.length;
    const median = n % 2 === 0
      ? (sv[n / 2 - 1] + sv[n / 2]) / 2
      : sv[Math.floor(n / 2)];
    return {
      name: g.name, n, median,
      meanRank: rankSums[gi] / n,
      rankSum: rankSums[gi],
      values: g.values,
      groupRanks: groupRankArrays[gi],
    };
  });

  // Dunn's post-hoc (Bonferroni) — only computed when p < 0.05
  const dunnPairs: DunnPair[] = [];
  if (pValue < 0.05) {
    const numPairs = k * (k - 1) / 2;
    for (let ii = 0; ii < k; ii++) {
      for (let jj = ii + 1; jj < k; jj++) {
        const ni = groupStats[ii].n;
        const nj = groupStats[jj].n;
        // SE for Dunn: sqrt( (N(N+1)/12 − tieSum/(12(N-1))) × (1/ni + 1/nj) )
        // Simplified using tie correction factor C:
        const variance = (N * (N + 1) / 12) * tieCorrection * (1 / ni + 1 / nj);
        const se = Math.sqrt(Math.max(0, variance));
        if (se === 0) continue;
        const z = (groupStats[ii].meanRank - groupStats[jj].meanRank) / se;
        const pRaw = 2 * (1 - normalCDF(Math.abs(z)));
        const pBonferroni = Math.min(1, pRaw * numPairs);
        dunnPairs.push({
          nameI: groupStats[ii].name,
          nameJ: groupStats[jj].name,
          z, pRaw, pBonferroni,
          significant: pBonferroni < 0.05,
        });
      }
    }
  }

  return { h, hCorrected, df, pValue, significant: pValue < 0.05, groups: groupStats, dunnPairs, tieCorrection, N, valid: true };
}

// ─── Spearman Correlation (standalone, with Fisher z CI) ─────────────────────
export interface SpearmanResult {
  n: number;
  rs: number;
  t: number;
  df: number;
  pValue: number;
  ciLow: number;
  ciHigh: number;
  rankX: number[];
  rankY: number[];
  d: number[];
  d2: number[];
  valid: boolean;
}

export function calcSpearman(x: number[], y: number[]): SpearmanResult {
  const fail: SpearmanResult = {
    n: 0, rs: 0, t: 0, df: 0, pValue: 1, ciLow: 0, ciHigh: 0,
    rankX: [], rankY: [], d: [], d2: [], valid: false,
  };
  if (x.length !== y.length || x.length < 4) return fail;
  const n = x.length;

  const rankX = ranks(x);
  const rankY = ranks(y);

  // Method B: Pearson correlation of ranks (handles ties correctly)
  const mrX = rankX.reduce((s, v) => s + v, 0) / n;
  const mrY = rankY.reduce((s, v) => s + v, 0) / n;
  let srXY = 0, srX2 = 0, srY2 = 0;
  for (let idx = 0; idx < n; idx++) {
    srXY += (rankX[idx] - mrX) * (rankY[idx] - mrY);
    srX2 += (rankX[idx] - mrX) ** 2;
    srY2 += (rankY[idx] - mrY) ** 2;
  }
  if (srX2 === 0 || srY2 === 0) return fail;
  const rs = srXY / Math.sqrt(srX2 * srY2);

  // t-test: t = rs × sqrt((n-2) / (1-rs²))
  const rs2 = rs * rs;
  const t = rs2 >= 1 ? (rs > 0 ? 1e9 : -1e9) : rs * Math.sqrt((n - 2) / (1 - rs2));
  const df = n - 2;
  const pValue = tPValue(t, df);

  // Fisher's z CI for rs
  const zr = Math.atanh(Math.max(-0.9999, Math.min(0.9999, rs)));
  const se = 1 / Math.sqrt(n - 3);
  const ciLow = Math.tanh(zr - 1.96 * se);
  const ciHigh = Math.tanh(zr + 1.96 * se);

  const d = rankX.map((rx, idx) => rx - rankY[idx]);
  const d2 = d.map(di => di * di);

  return { n, rs, t, df, pValue, ciLow, ciHigh, rankX, rankY, d, d2, valid: true };
}
