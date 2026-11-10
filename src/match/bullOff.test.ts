import { describe, expect, it } from "vitest";
import { dartDistance, decideBullOff } from "./bullOff";

describe("bull-off", () => {
  it("picks the dart closer to the centre", () => {
    const decision = decideBullOff(
      { segmentName: "Bull", coordsX: 0.01, coordsY: 0 },
      { segmentName: "25", coordsX: 0.2, coordsY: 0 },
      ["you", "opponent"],
    );
    expect(decision).toEqual({ kind: "winner", starter: "you" });
    expect(dartDistance({ segmentName: "Bull", coordsX: 0, coordsY: 0 })).toBe(0);
  });

  it("retthrows a tie with the order swapped", () => {
    const decision = decideBullOff(
      { segmentName: "S20", coordsX: 0.5, coordsY: 0 },
      { segmentName: "S3", coordsX: 0.5, coordsY: 0 },
      ["you", "opponent"],
    );
    expect(decision).toEqual({ kind: "tie", nextOrder: ["opponent", "you"] });
  });
});
