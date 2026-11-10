import { describe, expect, it } from "vitest";
import { firstTo } from "./format";

describe("best-of first-to", () => {
  it("maps each length choice to first to (N + 1) / 2", () => {
    expect(firstTo(1)).toBe(1);
    expect(firstTo(3)).toBe(2);
    expect(firstTo(5)).toBe(3);
    expect(firstTo(15)).toBe(8);
  });
});
