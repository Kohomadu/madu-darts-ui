import { describe, expect, it } from "vitest";
import { canonicalSegment } from "./segment";
import { overridePath } from "./override";

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

describe("Manual Override request", () => {
  it("patches the live Turn strip by index", () => {
    expect(overridePath(1)).toBe("/api/state/hits/1");
  });
});
