import { describe, expect, it } from "vitest";
import { resolveLocalOverride, segmentOverride } from "./override";
import { canonicalSegment } from "./segment";

const previous = {
  segmentName: "S18",
  segmentNumber: 18,
  multiplier: 1,
  bed: "SingleOuter",
  coordsX: 0.4,
  coordsY: 0.7,
};

describe("Segment names", () => {
  it("accepts the Autodarts labels used on the strip", () => {
    expect(canonicalSegment("t20")).toBe("T20");
    expect(canonicalSegment("D16")).toBe("D16");
    expect(canonicalSegment("s5")).toBe("S5");
    expect(canonicalSegment("bull")).toBe("Bull");
    expect(canonicalSegment("25")).toBe("25");
    expect(canonicalSegment("M20")).toBe("M20");
  });

  it("rejects a number that is not on the Board", () => {
    expect(canonicalSegment("T21")).toBeNull();
    expect(canonicalSegment("S0")).toBeNull();
    expect(canonicalSegment("")).toBeNull();
    expect(canonicalSegment("triple 20")).toBeNull();
  });
});

describe("local Manual Override", () => {
  it("builds a Segment override without calling Autodarts", () => {
    expect(segmentOverride("t20")).toEqual({ segmentName: "T20" });
    expect(resolveLocalOverride({ segmentName: "T20" }, previous)).toMatchObject({
      segmentName: "T20",
      segmentNumber: 20,
      multiplier: 3,
      bed: "Triple",
      coordsX: 0.4,
      coordsY: 0.7,
    });
  });

  it("maps a Board pick near treble 20", () => {
    const hit = resolveLocalOverride({ xMm: 0, yMm: 102 }, previous);
    expect(hit?.segmentName).toBe("T20");
    expect(hit?.multiplier).toBe(3);
  });
});
