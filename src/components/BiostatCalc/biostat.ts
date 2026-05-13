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
