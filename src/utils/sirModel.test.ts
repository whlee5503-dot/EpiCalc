import { describe, it, expect } from "vitest";
import {
    runSimulation,
    runSimulationWithInterventions,
    type SimParams,
} from "./sirModel.js";

describe("sirModel — SIR/SEIR regression (unchanged behavior)", () => {
    it("SIR result is unaffected by the SEIRD addition", () => {
        const params: SimParams = {
            model: "SIR",
            N: 10000,
            I0: 10,
            beta: 0.4,
            gamma: 0.1,
            sigma: 0, // unused for SIR
            vaccinationRate: 0,
            days: 100,
        };
        const result = runSimulation(params);
        expect(result.r0).toBeCloseTo(4, 6);
        expect(result.totalDeaths).toBe(0);
        // D is always null for SIR/SEIR
        expect(result.data.every((d) => d.D === null)).toBe(true);
    });

    it("SEIR result is unaffected by the SEIRD addition", () => {
        const params: SimParams = {
            model: "SEIR",
            N: 10000,
            I0: 10,
            beta: 0.4,
            gamma: 0.1,
            sigma: 0.2,
            vaccinationRate: 0,
            days: 100,
        };
        const result = runSimulation(params);
        expect(result.r0).toBeCloseTo(4, 6);
        expect(result.totalDeaths).toBe(0);
        expect(result.data.every((d) => d.D === null)).toBe(true);
    });
});

describe("sirModel — SEIRD self-consistency", () => {
    const baseParams: SimParams = {
        model: "SEIRD",
        N: 10000,
        I0: 10,
        beta: 0.4,
        gamma: 0.1,
        sigma: 0.2,
        vaccinationRate: 0,
        days: 200,
        cfr: 0.1,
    };

    it("CFR = 0 reproduces the SEIR trajectory exactly (S, E, I, R)", () => {
        const seird = runSimulation({ ...baseParams, cfr: 0 });
        const seir = runSimulation({ ...baseParams, model: "SEIR" });

        expect(seird.r0).toBeCloseTo(seir.r0, 10);
        expect(seird.peakInfected).toBe(seir.peakInfected);
        expect(seird.peakDay).toBe(seir.peakDay);
        for (let i = 0; i < seird.data.length; i++) {
            expect(seird.data[i].S).toBe(seir.data[i].S);
            expect(seird.data[i].E).toBe(seir.data[i].E);
            expect(seird.data[i].I).toBe(seir.data[i].I);
            expect(seird.data[i].R).toBe(seir.data[i].R);
        }
        expect(seird.totalDeaths).toBe(0);
    });

    it("population is conserved (S+E+I+R+D ≈ N) at every time step", () => {
        const result = runSimulation(baseParams);
        for (const d of result.data) {
            const total = d.S + (d.E ?? 0) + d.I + d.R + (d.D ?? 0);
            // rounding to integers per compartment can drift by a few people
            expect(Math.abs(total - baseParams.N)).toBeLessThanOrEqual(5);
        }
    });

    it("deaths and recoveries split in proportion to CFR (D / (R − R0) ≈ cfr / (1 − cfr))", () => {
        const cfr = 0.1;
        const result = runSimulation({ ...baseParams, cfr });
        const last = result.data[result.data.length - 1];
        const expectedRatio = cfr / (1 - cfr);
        const actualRatio = (last.D ?? 0) / last.R; // R(0) = 0 here (no vaccination)
        expect(actualRatio).toBeCloseTo(expectedRatio, 2);
    });
});

describe("sirModel — measles worked example (CDC / Lancet)", () => {
    // Sources:
    // - R0 = 12–18 (representative value 15): Guerra FM, Bolotin S, et al.
    //   "The basic reproduction number (R0) of measles: a systematic review."
    //   Lancet Infect Dis. 2017;17(12):e420-e428.
    // - Incubation period ~10-12 days to prodrome, infectious 4 days before to
    //   4 days after rash onset (~8-day infectious window): CDC Pink Book,
    //   Ch. 13 Measles.
    // - Case fatality ~0.2%: CDC measles complications summary
    //   (stacks.cdc.gov/view/cdc/124379)
    const measlesParams: SimParams = {
        model: "SEIRD",
        N: 100000,
        I0: 1,
        beta: 1.875,
        gamma: 0.125,
        sigma: 0.1,
        vaccinationRate: 0,
        days: 150,
        cfr: 0.002,
    };

    it("reproduces the published R0 ≈ 15 for measles", () => {
        const result = runSimulation(measlesParams);
        expect(result.r0).toBeCloseTo(15, 6);
    });

    it("herd immunity threshold ≈ 93.3%, matching the independently reported figure for R0=15", () => {
        const result = runSimulation(measlesParams);
        expect(result.herdImmunityThreshold).toBeCloseTo(14 / 15, 4);
        expect(result.herdImmunityThreshold).toBeCloseTo(0.9333, 3);
    });

    it("cumulative deaths stay consistent with a ~0.2% case fatality rate", () => {
        const result = runSimulation(measlesParams);
        const last = result.data[result.data.length - 1];
        const totalDeaths = last.D ?? 0;
        expect(totalDeaths).toBeGreaterThan(0);
        expect(totalDeaths).toBeLessThan(measlesParams.N * measlesParams.cfr! * 1.2);
    });
});

describe("sirModel — intervention overlay (lockdown / vaccination)", () => {
    const baseParams: SimParams = {
        model: "SEIR",
        N: 100000,
        I0: 10,
        beta: 0.5,
        gamma: 0.1,
        sigma: 0.2,
        vaccinationRate: 0,
        days: 60,
    };

    it("with no interventions, matches plain runSimulation exactly", () => {
        const plain = runSimulation(baseParams);
        const noIv = runSimulationWithInterventions(baseParams, []);

        expect(noIv.data.length).toBe(plain.data.length);
        for (let i = 0; i < plain.data.length; i++) {
            expect(noIv.data[i]).toEqual(plain.data[i]);
        }
        expect(noIv.peakInfected).toBe(plain.peakInfected);
        expect(noIv.peakDay).toBe(plain.peakDay);
        expect(noIv.finalBeta).toBe(baseParams.beta);
    });

    it("a lockdown meaningfully reduces the epidemic peak", () => {
        const plain = runSimulation(baseParams);
        const withLockdown = runSimulationWithInterventions(baseParams, [
            { day: 20, type: "lockdown", betaMultiplier: 0.2 },
        ]);

        expect(withLockdown.peakInfected).toBeLessThan(plain.peakInfected);
        expect(withLockdown.data.length).toBe(baseParams.days + 1);
        expect(withLockdown.data.every((d, i) => d.day === i)).toBe(true);
        expect(withLockdown.finalBeta).toBeCloseTo(baseParams.beta * 0.2, 10);
    });

    it("vaccination moves the specified fraction of S into R at the intervention day", () => {
        const result = runSimulationWithInterventions(baseParams, [
            { day: 10, type: "vaccination", vaccinationRate: 0.5 },
        ]);
        const dayBefore = result.data.find((d) => d.day === 9)!;
        const dayOf = result.data.find((d) => d.day === 10)!;

        expect(dayOf.S).toBeCloseTo(dayBefore.S * 0.5, -2);
        const sDrop = dayBefore.S - dayOf.S;
        const rGain = dayOf.R - dayBefore.R;
        expect(Math.abs(sDrop - rGain)).toBeLessThanOrEqual(20);
    });

    it("combined lockdown + vaccination + reopening on SEIRD conserves population throughout", () => {
        const seirdParams: SimParams = {
            ...baseParams,
            model: "SEIRD",
            cfr: 0.02,
            days: 90,
        };
        const result = runSimulationWithInterventions(seirdParams, [
            { day: 20, type: "lockdown", betaMultiplier: 0.3 },
            { day: 40, type: "vaccination", vaccinationRate: 0.4 },
            { day: 60, type: "lockdown", betaMultiplier: 1.0 },
        ]);

        for (const d of result.data) {
            const total = d.S + (d.E ?? 0) + d.I + d.R + (d.D ?? 0);
            expect(Math.abs(total - seirdParams.N)).toBeLessThanOrEqual(5);
        }
        expect(result.data.length).toBe(seirdParams.days + 1);
        expect(result.totalDeaths).toBeGreaterThan(0);
        expect(result.finalBeta).toBeCloseTo(seirdParams.beta, 10);
    });

    it("ignores an intervention day beyond the simulation length", () => {
        const withOutOfRange = runSimulationWithInterventions(baseParams, [
            { day: 9999, type: "lockdown", betaMultiplier: 0.1 },
        ]);
        const plain = runSimulation(baseParams);
        expect(withOutOfRange.peakInfected).toBe(plain.peakInfected);
        expect(withOutOfRange.finalBeta).toBe(baseParams.beta);
    });
});