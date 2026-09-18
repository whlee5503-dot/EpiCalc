// SIR / SEIR / SEIRD epidemic model — Runge-Kutta 4th order integration

export type ModelType = 'SIR' | 'SEIR' | 'SEIRD';

export interface SimParams {
  model: ModelType;
  N: number;
  I0: number;
  beta: number;
  gamma: number;
  sigma: number;
  vaccinationRate: number;
  days: number;
  /**
   * Case fatality rate (0–1). Only used when model === 'SEIRD'.
   * Splits the outflow from I (γ·I) into recovery ((1-cfr)·γ·I) and
   * death (cfr·γ·I). Optional so SIR/SEIR callers don't need to change.
   */
  cfr?: number;
}

export interface DataPoint {
  day: number;
  S: number;
  E: number | null;
  I: number;
  R: number;
  /** Cumulative deaths. Non-null only for SEIRD. */
  D: number | null;
}

export interface SimResult {
  data: DataPoint[];
  peakInfected: number;
  peakDay: number;
  r0: number;
  herdImmunityThreshold: number;
  /** Cumulative deaths at the end of the simulation. 0 for SIR/SEIR. */
  totalDeaths: number;
}

// RK4 step for SIR: dS/dt = -β·S·I/N, dI/dt = β·S·I/N - γ·I, dR/dt = γ·I
function stepSIR(
  S: number, I: number, R: number,
  beta: number, gamma: number, N: number, dt: number,
): [number, number, number] {
  const fS = (s: number, i: number) => -beta * s * i / N;
  const fI = (s: number, i: number) => beta * s * i / N - gamma * i;
  const fR = (i: number) => gamma * i;

  const k1S = fS(S, I); const k1I = fI(S, I); const k1R = fR(I);
  const k2S = fS(S + .5 * dt * k1S, I + .5 * dt * k1I);
  const k2I = fI(S + .5 * dt * k1S, I + .5 * dt * k1I);
  const k2R = fR(I + .5 * dt * k1I);
  const k3S = fS(S + .5 * dt * k2S, I + .5 * dt * k2I);
  const k3I = fI(S + .5 * dt * k2S, I + .5 * dt * k2I);
  const k3R = fR(I + .5 * dt * k2I);
  const k4S = fS(S + dt * k3S, I + dt * k3I);
  const k4I = fI(S + dt * k3S, I + dt * k3I);
  const k4R = fR(I + dt * k3I);

  return [
    S + (dt / 6) * (k1S + 2 * k2S + 2 * k3S + k4S),
    I + (dt / 6) * (k1I + 2 * k2I + 2 * k3I + k4I),
    R + (dt / 6) * (k1R + 2 * k2R + 2 * k3R + k4R),
  ];
}

// RK4 step for SEIR: adds Exposed compartment, dE/dt = β·S·I/N - σ·E, dI/dt = σ·E - γ·I
function stepSEIR(
  S: number, E: number, I: number, R: number,
  beta: number, sigma: number, gamma: number, N: number, dt: number,
): [number, number, number, number] {
  const fS = (s: number, i: number) => -beta * s * i / N;
  const fE = (s: number, e: number, i: number) => beta * s * i / N - sigma * e;
  const fI = (e: number, i: number) => sigma * e - gamma * i;
  const fR = (i: number) => gamma * i;

  const k1S = fS(S, I); const k1E = fE(S, E, I); const k1I = fI(E, I); const k1R = fR(I);
  const k2S = fS(S + .5 * dt * k1S, I + .5 * dt * k1I);
  const k2E = fE(S + .5 * dt * k1S, E + .5 * dt * k1E, I + .5 * dt * k1I);
  const k2I = fI(E + .5 * dt * k1E, I + .5 * dt * k1I);
  const k2R = fR(I + .5 * dt * k1I);
  const k3S = fS(S + .5 * dt * k2S, I + .5 * dt * k2I);
  const k3E = fE(S + .5 * dt * k2S, E + .5 * dt * k2E, I + .5 * dt * k2I);
  const k3I = fI(E + .5 * dt * k2E, I + .5 * dt * k2I);
  const k3R = fR(I + .5 * dt * k2I);
  const k4S = fS(S + dt * k3S, I + dt * k3I);
  const k4E = fE(S + dt * k3S, E + dt * k3E, I + dt * k3I);
  const k4I = fI(E + dt * k3E, I + dt * k3I);
  const k4R = fR(I + dt * k3I);

  return [
    S + (dt / 6) * (k1S + 2 * k2S + 2 * k3S + k4S),
    E + (dt / 6) * (k1E + 2 * k2E + 2 * k3E + k4E),
    I + (dt / 6) * (k1I + 2 * k2I + 2 * k3I + k4I),
    R + (dt / 6) * (k1R + 2 * k2R + 2 * k3R + k4R),
  ];
}

// RK4 step for SEIRD: same S/E/I dynamics as SEIR, but the outflow from I
// (σ·E - γ·I in, γ·I out) is split into recovery and death by CFR:
//   dR/dt = (1-cfr)·γ·I   dD/dt = cfr·γ·I
function stepSEIRD(
  S: number, E: number, I: number, R: number, D: number,
  beta: number, sigma: number, gamma: number, cfr: number, N: number, dt: number,
): [number, number, number, number, number] {
  const recoveryRate = gamma * (1 - cfr);
  const deathRate = gamma * cfr;

  const fS = (s: number, i: number) => -beta * s * i / N;
  const fE = (s: number, e: number, i: number) => beta * s * i / N - sigma * e;
  const fI = (e: number, i: number) => sigma * e - gamma * i;
  const fR = (i: number) => recoveryRate * i;
  const fD = (i: number) => deathRate * i;

  const k1S = fS(S, I); const k1E = fE(S, E, I); const k1I = fI(E, I);
  const k1R = fR(I); const k1D = fD(I);
  const k2S = fS(S + .5 * dt * k1S, I + .5 * dt * k1I);
  const k2E = fE(S + .5 * dt * k1S, E + .5 * dt * k1E, I + .5 * dt * k1I);
  const k2I = fI(E + .5 * dt * k1E, I + .5 * dt * k1I);
  const k2R = fR(I + .5 * dt * k1I);
  const k2D = fD(I + .5 * dt * k1I);
  const k3S = fS(S + .5 * dt * k2S, I + .5 * dt * k2I);
  const k3E = fE(S + .5 * dt * k2S, E + .5 * dt * k2E, I + .5 * dt * k2I);
  const k3I = fI(E + .5 * dt * k2E, I + .5 * dt * k2I);
  const k3R = fR(I + .5 * dt * k2I);
  const k3D = fD(I + .5 * dt * k2I);
  const k4S = fS(S + dt * k3S, I + dt * k3I);
  const k4E = fE(S + dt * k3S, E + dt * k3E, I + dt * k3I);
  const k4I = fI(E + dt * k3E, I + dt * k3I);
  const k4R = fR(I + dt * k3I);
  const k4D = fD(I + dt * k3I);

  return [
    S + (dt / 6) * (k1S + 2 * k2S + 2 * k3S + k4S),
    E + (dt / 6) * (k1E + 2 * k2E + 2 * k3E + k4E),
    I + (dt / 6) * (k1I + 2 * k2I + 2 * k3I + k4I),
    R + (dt / 6) * (k1R + 2 * k2R + 2 * k3R + k4R),
    D + (dt / 6) * (k1D + 2 * k2D + 2 * k3D + k4D),
  ];
}

export function runSimulation(p: SimParams): SimResult {
  const { model, N, I0, beta, gamma, sigma, vaccinationRate, days } = p;
  const cfr = Math.min(Math.max(p.cfr ?? 0, 0), 1);

  // Vaccinated individuals start immune (in R compartment)
  const vaccinated = Math.min(Math.floor(N * vaccinationRate), Math.max(0, N - I0));
  let S = Math.max(0, N - I0 - vaccinated);
  let E = 0;
  let I = Math.min(I0, N - vaccinated);
  let R = vaccinated;
  let D = 0;

  const r0 = gamma > 0 ? beta / gamma : 0;
  const herdImmunityThreshold = r0 > 1 ? 1 - 1 / r0 : 0;

  const data: DataPoint[] = [];
  let peakInfected = I;
  let peakDay = 0;

  for (let day = 0; day <= days; day++) {
    data.push({
      day,
      S: Math.round(Math.max(0, S)),
      E: model !== 'SIR' ? Math.round(Math.max(0, E)) : null,
      I: Math.round(Math.max(0, I)),
      R: Math.round(Math.max(0, R)),
      D: model === 'SEIRD' ? Math.round(Math.max(0, D)) : null,
    });

    if (I > peakInfected) {
      peakInfected = I;
      peakDay = day;
    }

    if (model === 'SIR') {
      [S, I, R] = stepSIR(S, I, R, beta, gamma, N, 1);
    } else if (model === 'SEIR') {
      [S, E, I, R] = stepSEIR(S, E, I, R, beta, sigma, gamma, N, 1);
    } else {
      [S, E, I, R, D] = stepSEIRD(S, E, I, R, D, beta, sigma, gamma, cfr, N, 1);
    }
    S = Math.max(0, S);
    E = Math.max(0, E);
    I = Math.max(0, I);
    R = Math.max(0, R);
    D = Math.max(0, D);
  }

  return {
    data,
    peakInfected: Math.round(peakInfected),
    peakDay,
    r0,
    herdImmunityThreshold,
    totalDeaths: Math.round(D),
  };
}