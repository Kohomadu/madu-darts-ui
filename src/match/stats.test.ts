import { describe, expect, it } from "vitest";
import type { DartSnap } from "../game/rules";
import {
  applySealedTurn,
  checkoutAttemptDelta,
  checkoutPercent,
  emptyTotals,
  first9Display,
  matchAverage,
} from "./stats";

function darts(...names: string[]): DartSnap[] {
  return names.map((segmentName, index) => ({
    segmentName,
    coordsX: index,
    coordsY: 0,
  }));
}

describe("match averages", () => {
  it("is points scored over darts thrown times three after a sealed Turn", () => {
    let totals = emptyTotals();
    totals = applySealedTurn(totals, {
      turnStartRemaining: 501,
      darts: darts("T20", "T20", "T20"),
      outcome: "open",
      points: 180,
      dartsThrown: 3,
      first9DartsLeft: 9,
    });
    expect(matchAverage(totals)).toBe(180);
  });

  it("shows First 9 dart count until nine exist, then the average", () => {
    let totals = emptyTotals();
    totals = applySealedTurn(totals, {
      turnStartRemaining: 501,
      darts: darts("T20", "T20", "T20"),
      outcome: "open",
      points: 180,
      dartsThrown: 3,
      first9DartsLeft: 9,
    });
    expect(first9Display(totals)).toEqual({ kind: "darts", value: 3 });
    totals = applySealedTurn(totals, {
      turnStartRemaining: 321,
      darts: darts("T20", "T20", "T20"),
      outcome: "open",
      points: 180,
      dartsThrown: 3,
      first9DartsLeft: 6,
    });
    totals = applySealedTurn(totals, {
      turnStartRemaining: 141,
      darts: darts("T20", "T19", "D12"),
      outcome: "checkout",
      points: 141,
      dartsThrown: 3,
      first9DartsLeft: 3,
    });
    expect(first9Display(totals)?.kind).toBe("average");
  });

  it("counts a bust inside First 9 as 3 darts and 0 points", () => {
    let totals = emptyTotals();
    totals = applySealedTurn(totals, {
      turnStartRemaining: 501,
      darts: darts("T20", "T20", "T20"),
      outcome: "bust",
      points: 0,
      dartsThrown: 3,
      first9DartsLeft: 9,
    });
    expect(totals.first9Darts).toBe(3);
    expect(totals.first9Points).toBe(0);
    expect(totals.pointsScored).toBe(0);
    expect(totals.dartsThrown).toBe(3);
  });
});

describe("checkout percentage", () => {
  it("counts a finishing double as the only hit", () => {
    expect(checkoutAttemptDelta(40, darts("D20"), "checkout")).toEqual({ attempts: 1, hits: 1 });
  });

  it("leaves a setup dart out when it was not a double leave", () => {
    expect(checkoutAttemptDelta(61, darts("T15", "D8"), "checkout")).toEqual({ attempts: 1, hits: 1 });
  });

  it("treats a bust from a one-dart double as three misses", () => {
    expect(checkoutAttemptDelta(40, darts("T20"), "bust")).toEqual({ attempts: 3, hits: 0 });
  });

  it("adds no misses for a bust from any other score", () => {
    expect(checkoutAttemptDelta(100, darts("T20", "T20", "T20"), "bust")).toEqual({
      attempts: 0,
      hits: 0,
    });
  });

  it("derives percentage from hits over attempts", () => {
    let totals = emptyTotals();
    totals = applySealedTurn(totals, {
      turnStartRemaining: 40,
      darts: darts("D20"),
      outcome: "checkout",
      points: 40,
      dartsThrown: 3,
      first9DartsLeft: 0,
    });
    expect(checkoutPercent(totals)).toBe(100);
  });
});
