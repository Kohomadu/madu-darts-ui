import { describe, expect, it } from "vitest";
import { accuracyPercent, emptyLedger, reduceAccuracy, type AccuracyLedger } from "./ledger";
import type { Hit } from "../autodarts/parse";

function hit(segmentName: string, coordsX: number, coordsY: number): Hit {
  return { segmentName, segmentNumber: null, multiplier: null, bed: null, coordsX, coordsY };
}

function withHits(ledger: AccuracyLedger, hits: Hit[]): AccuracyLedger {
  return reduceAccuracy(ledger, {
    type: "snapshot",
    connected: true,
    snapshot: { status: "throw", event: "throwDetected", hits },
  });
}

const THREE = [hit("S18", 0.4, 0.75), hit("S20", -0.05, 0.45), hit("S14", -0.43, 0.11)];

describe("Detection Accuracy", () => {
  it("is hidden until a Turn seals", () => {
    expect(accuracyPercent(emptyLedger())).toBeNull();
  });

  it("counts an unchanged Turn as three correct Hits", () => {
    const open = withHits(emptyLedger(), THREE);
    const sealed = reduceAccuracy(open, {
      type: "snapshot",
      connected: true,
      snapshot: { status: "throw", event: "takeoutFinished", hits: [] },
    });
    expect(sealed.total).toBe(3);
    expect(sealed.unchanged).toBe(3);
    expect(sealed.open).toEqual([]);
    expect(accuracyPercent(sealed)).toBe(100);
  });

  it("marks a Manual Override wrong once, even if corrected twice", () => {
    let ledger = withHits(emptyLedger(), THREE);
    ledger = reduceAccuracy(ledger, { type: "override", index: 1 });
    ledger = reduceAccuracy(ledger, { type: "override", index: 1 });
    ledger = reduceAccuracy(ledger, {
      type: "snapshot",
      connected: true,
      snapshot: {
        status: "throw",
        event: "throwDetected",
        hits: [THREE[0], hit("T20", 0.02, 0.6), THREE[2]],
      },
    });
    const sealed = reduceAccuracy(ledger, {
      type: "snapshot",
      connected: true,
      snapshot: { status: "throw", event: "takeoutFinished", hits: [] },
    });
    expect(sealed.unchanged).toBe(2);
    expect(sealed.total).toBe(3);
    expect(accuracyPercent(sealed)).toBe(67);
  });

  it("does not count a dart that bounced out before takeout", () => {
    let ledger = withHits(emptyLedger(), THREE);
    ledger = reduceAccuracy(ledger, { type: "override", index: 2 });
    ledger = withHits(ledger, [THREE[0], THREE[1]]);
    const sealed = reduceAccuracy(ledger, {
      type: "snapshot",
      connected: true,
      snapshot: { status: "takeout", event: "takeoutFinished", hits: [] },
    });
    expect(sealed.total).toBe(2);
    expect(sealed.unchanged).toBe(2);
  });

  it("does not seal while Autodarts is disconnected", () => {
    const open = withHits(emptyLedger(), THREE);
    const paused = reduceAccuracy(open, {
      type: "snapshot",
      connected: false,
      snapshot: { status: "throw", event: "takeoutFinished", hits: [] },
    });
    expect(paused.total).toBe(0);
    expect(paused.open).toHaveLength(3);
  });

  it("drops a Turn cleared without takeout", () => {
    const open = withHits(emptyLedger(), THREE);
    const reset = reduceAccuracy(open, {
      type: "snapshot",
      connected: true,
      snapshot: { status: "throw", event: "reset", hits: [] },
    });
    expect(reset.total).toBe(0);
    expect(reset.open).toEqual([]);
  });

  it("keeps the override on the same dart when a later dart arrives", () => {
    let ledger = withHits(emptyLedger(), [THREE[0]]);
    ledger = reduceAccuracy(ledger, { type: "override", index: 0 });
    ledger = withHits(ledger, [THREE[0], THREE[1]]);
    expect(ledger.open.map((hit) => hit.overridden)).toEqual([true, false]);
  });

  it("reset clears the counters and leaves the open Turn marks", () => {
    let ledger = withHits(emptyLedger(), THREE);
    ledger = reduceAccuracy(ledger, { type: "override", index: 0 });
    ledger = reduceAccuracy(ledger, {
      type: "snapshot",
      connected: true,
      snapshot: { status: "throw", event: "takeoutFinished", hits: [] },
    });
    ledger = withHits(ledger, [THREE[0]]);
    ledger = reduceAccuracy(ledger, { type: "override", index: 0 });
    const reset = reduceAccuracy(ledger, { type: "reset" });
    expect(reset.unchanged).toBe(0);
    expect(reset.total).toBe(0);
    expect(reset.open[0]?.overridden).toBe(true);
  });
});
