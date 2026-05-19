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
