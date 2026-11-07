import { describe, expect, it } from "vitest";
import { draftFromSegment, PAD_NUMBERS, segmentNameFromDraft } from "./SegmentPad";

describe("Segment pad draft", () => {
  it("defaults a typed Hit into ring and number", () => {
    expect(draftFromSegment("t20")).toEqual({ ring: "T", number: 20, bull: null });
    expect(draftFromSegment("D16")).toEqual({ ring: "D", number: 16, bull: null });
    expect(draftFromSegment("S5")).toEqual({ ring: "S", number: 5, bull: null });
  });

  it("recognises Bull and outer bull", () => {
    expect(draftFromSegment("Bull")).toEqual({ ring: "S", number: null, bull: "Bull" });
    expect(draftFromSegment("25")).toEqual({ ring: "S", number: null, bull: "25" });
  });

  it("lists 1 through 20 in numeric order", () => {
    expect(PAD_NUMBERS).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it("builds SX / DX / TX from the pad draft", () => {
    expect(segmentNameFromDraft({ kind: "sector", ring: "S", number: 20 })).toBe("S20");
    expect(segmentNameFromDraft({ kind: "sector", ring: "D", number: 16 })).toBe("D16");
    expect(segmentNameFromDraft({ kind: "sector", ring: "T", number: 5 })).toBe("T5");
    expect(segmentNameFromDraft({ kind: "bull", segmentName: "Bull" })).toBe("Bull");
  });
});
