# EpiCalc — Validation

This document records the formulas, sources, and worked-example test cases
used to validate each calculator module in EpiCalc. Where possible, each
module is checked against **at least two independent, published sources**
(peer-reviewed literature, official public-health agency documentation, or
standard reference texts) rather than against another calculator tool.

---

## Module: SIR / SEIR / SEIRD Epidemic Simulator

**Method**: 4th-order Runge-Kutta (RK4) numerical integration of the
SIR / SEIR / SEIRD compartmental ODE systems.

- SIR: dS/dt = -βSI/N, dI/dt = βSI/N - γI, dR/dt = γI
- SEIR: adds dE/dt = βSI/N - σE, dI/dt = σE - γI
- SEIRD: splits the SEIR outflow from I into recovery and death by case
  fatality rate (CFR): dR/dt = (1-CFR)·γI, dD/dt = CFR·γI

**Implementation**: `src/utils/sirModel.ts`
**Tests**: `src/utils/sirModel.test.ts` (13 tests, Vitest)

### Test Case 1 — SEIRD → SEIR regression (CFR = 0)

Since the S, E, I equations are identical between SEIR and SEIRD, setting
CFR = 0 in the SEIRD model must reproduce the SEIR trajectory exactly
(S, E, I, R at every simulated day; zero deaths throughout).

- Result: **PASS**

### Test Case 2 — Population conservation

At every simulated day, S + E + I + R + D must equal the total population N
(within integer-rounding tolerance per compartment).

- Result: **PASS**

### Test Case 3 — Death/recovery split ratio (model-internal identity)

Because dR/dt and dD/dt share the same γI term, differing only by the
(1-CFR) and CFR multipliers, the ratio D(t) / R(t) must converge to
CFR / (1-CFR) regardless of the specific epidemic curve. This is an
algebraic identity of the model, checked as a numerical-precision
regression test rather than an external worked example.

- Result: **PASS**

### Test Case 4 — Measles worked example (independent published sources)

**Sources**:
- R0 = 12–18 (representative value used: 15) — Guerra FM, Bolotin S, Lim G,
  Heffernan J, Deeks SL, Li Y, Crowcroft NS. "The basic reproduction number
  (R0) of measles: a systematic review." *Lancet Infect Dis*.
  2017;17(12):e420-e428. doi:10.1016/S1473-3099(17)30307-9
- Incubation period ~10–12 days to prodrome; infectious period ~4 days
  before to 4 days after rash onset (~8-day infectious window) — CDC
  "Epidemiology and Prevention of Vaccine-Preventable Diseases" (Pink
  Book), 14th ed., Chapter 13: Measles.
  <https://www.cdc.gov/pinkbook/hcp/table-of-contents/chapter-13-measles.html>
- Case fatality rate ≈ 0.2% — CDC measles complications summary
  (stacks.cdc.gov/view/cdc/124379).

**Derived model inputs**: σ = 1/10, γ = 1/8, β = R0 × γ = 1.875, CFR = 0.002

**Expected results**:
- R0 (recomputed by the app as β/γ) = 15 — matches the Lancet-reported
  representative value exactly by construction, confirming the R0 = β/γ
  calculation.
- Herd immunity threshold = 1 - 1/R0 ≈ 0.9333 (93.3%) — independently
  corroborated by public-health reporting that an R0 of 15 implies ~93%
  vaccination coverage is required for herd immunity (e.g. *Scientific
  American*, "Understand the Measles Outbreak with this One Weird
  Number").
- Cumulative deaths, with R0=15 in a fully susceptible population of
  100,000 driving near-universal infection by day 150, remain consistent
  with the ~0.2% CFR (bounded below N × CFR × 1.2 in the test).

- Result: **PASS** (`src/utils/sirModel.test.ts`)

---

## Module: Intervention Overlay (Lockdown / Vaccination)

**Method**: `runSimulationWithInterventions` orchestrates the existing,
already-validated `runSimulation` function — it does not alter the SIR /
SEIR / SEIRD differential equations themselves. It splits the requested
timeline into segments at each intervention's day, runs `runSimulation`
independently for each segment (carrying the previous segment's final
compartment values forward as the next segment's starting point), and
stitches the results into one continuous timeline.

- **Lockdown**: from its effective day onward, β is set to
  `originalBeta × betaMultiplier` (multipliers are relative to the
  original β, not stacked across multiple lockdowns, so scenarios with
  several lockdowns/reopenings remain easy to reason about).
- **Vaccination**: on its effective day, a specified fraction of the
  *current* susceptible pool (S) is moved instantaneously into the
  recovered/immune pool (R).

Because this module is a pure orchestration layer over already-validated
logic, its own tests focus on **internal consistency and non-regression**
rather than an external epidemiological worked example (the underlying
epidemic math is validated separately, above, via the measles example).

**Implementation**: `src/utils/sirModel.ts` (`runSimulationWithInterventions`)
**Tests**: `src/utils/sirModel.test.ts`, describe block "intervention overlay" (5 tests)

### Test Case 1 — No-op equivalence

Calling `runSimulationWithInterventions` with an empty intervention list
must produce output identical to calling `runSimulation` directly with the
same parameters (same data points, peak, peak day, and final β).

- Result: **PASS**

### Test Case 2 — Lockdown reduces the epidemic peak

A lockdown (β reduced to 20% of baseline partway through the timeline)
must produce a lower peak infection count than the same scenario without
the lockdown, with the output timeline remaining gap-free and
non-duplicated across the internal segment boundary.

- Result: **PASS**

### Test Case 3 — Vaccination moves S → R at the intervention day

A vaccination intervention moving 50% of the susceptible pool must show
that exact drop in S and matching rise in R at the specified day
(within integer-rounding tolerance from independently rounding S and R).

- Result: **PASS**

### Test Case 4 — Combined scenario conserves population (SEIRD)

A three-intervention scenario (lockdown → vaccination → reopening) on the
SEIRD model must conserve total population (S+E+I+R+D ≈ N) at every
simulated day, produce a complete day-by-day timeline, and correctly
report the final β as fully reopened (equal to the original β).

- Result: **PASS**

### Test Case 5 — Out-of-range interventions are ignored

An intervention scheduled beyond the simulation's total day count must
have no effect on the result (identical peak and final β to a run with no
interventions at all).

- Result: **PASS**

---

*Last updated: September 2026.*