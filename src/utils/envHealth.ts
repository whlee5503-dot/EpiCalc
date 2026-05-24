// Environmental Health Risk Assessment utilities

// ── Exposure Route ───────────────────────────────────────────────────────────
export type ExposureRoute = 'ingestion' | 'inhalation' | 'dermal';

// ── CDI Param Interfaces ─────────────────────────────────────────────────────
/** Ingestion CDI = (C × IR × EF × ED) / (BW × AT) */
export interface IngestionParams {
  C: number;   // Concentration in water/food (mg/L)
  IR: number;  // Ingestion rate (L/day)
  EF: number;  // Exposure frequency (days/year)
  ED: number;  // Exposure duration (years)
  BW: number;  // Body weight (kg)
  AT: number;  // Averaging time (days)
}

/** Inhalation CDI = (Ca × IR × ET × EF × ED) / (BW × AT) */
export interface InhalationParams {
  Ca: number;  // Air concentration (mg/m³)
  IR: number;  // Inhalation rate (m³/hour)
  ET: number;  // Exposure time (hours/day)
  EF: number;  // Exposure frequency (days/year)
  ED: number;  // Exposure duration (years)
  BW: number;  // Body weight (kg)
  AT: number;  // Averaging time (days)
}

/** Dermal CDI = (C × SA × AF × ABS × EF × ED) / (BW × AT) */
export interface DermalParams {
  C: number;   // Concentration (mg/cm²)
  SA: number;  // Skin surface area (cm²)
  AF: number;  // Adherence factor (mg/cm²)
  ABS: number; // Absorption factor (0–1, unitless)
  EF: number;  // Exposure frequency (events/year)
  ED: number;  // Exposure duration (years)
  BW: number;  // Body weight (kg)
  AT: number;  // Averaging time (days)
}

// ── CDI Calculators ──────────────────────────────────────────────────────────
export function calcIngestionCDI(p: IngestionParams): number {
  if (p.BW <= 0 || p.AT <= 0) return NaN;
  return (p.C * p.IR * p.EF * p.ED) / (p.BW * p.AT);
}

export function calcInhalationCDI(p: InhalationParams): number {
  if (p.BW <= 0 || p.AT <= 0) return NaN;
  return (p.Ca * p.IR * p.ET * p.EF * p.ED) / (p.BW * p.AT);
}

export function calcDermalCDI(p: DermalParams): number {
  if (p.BW <= 0 || p.AT <= 0) return NaN;
  return (p.C * p.SA * p.AF * p.ABS * p.EF * p.ED) / (p.BW * p.AT);
}

// ── Hazard Quotient ──────────────────────────────────────────────────────────
/** HQ = CDI / RfD */
export function calcHQ(cdi: number, rfd: number): number {
  if (rfd <= 0 || !isFinite(cdi) || cdi < 0) return NaN;
  return cdi / rfd;
}

export type HQLevel = 'concern' | 'caution' | 'safe';

export function interpretHQ(hq: number): HQLevel {
  if (!isFinite(hq) || hq > 1) return 'concern';
  if (hq >= 0.1) return 'caution';
  return 'safe';
}

// ── Cancer Risk ──────────────────────────────────────────────────────────────
/** Cancer Risk = CDI × CSF */
export function calcCancerRisk(cdi: number, csf: number): number {
  if (!isFinite(cdi) || cdi < 0 || csf < 0) return NaN;
  return cdi * csf;
}

export type CancerRiskLevel = 'concern' | 'acceptable' | 'negligible';

export function interpretCancerRisk(risk: number): CancerRiskLevel {
  if (!isFinite(risk) || risk > 1e-4) return 'concern';
  if (risk >= 1e-6) return 'acceptable';
  return 'negligible';
}

/**
 * Returns [mantissaStr, exponentStr] for scientific notation display.
 * e.g. 3.75e-5 → ['3.75', '-5']
 */
export function formatSciParts(n: number, digits = 2): [string, string] {
  if (n === 0) return ['0', '0'];
  if (!isFinite(n) || n < 0) return ['—', ''];
  const exp = Math.floor(Math.log10(n));
  const mantissa = n / Math.pow(10, exp);
  return [mantissa.toFixed(digits), String(exp)];
}

/**
 * Logarithmic position on a scale [10^logMin, 10^logMax] → 0–100%
 * Used for the cancer risk scale visualizer.
 */
export function riskToScalePosition(risk: number, logMin = -8, logMax = -2): number {
  if (!isFinite(risk) || risk <= 0) return 0;
  const log = Math.log10(risk);
  return Math.max(0, Math.min(100, ((log - logMin) / (logMax - logMin)) * 100));
}

// ── QALY ─────────────────────────────────────────────────────────────────────
export interface HealthState {
  id: string;
  label: string;
  utility: number; // 0–1
  years: number;
}

export function calcQALY(states: HealthState[]): number {
  return states.reduce((sum, s) => sum + s.utility * s.years, 0);
}

export function calcTotalYears(states: HealthState[]): number {
  return states.reduce((sum, s) => sum + s.years, 0);
}

export function calcQALYLoss(states: HealthState[]): number {
  return calcTotalYears(states) - calcQALY(states);
}
