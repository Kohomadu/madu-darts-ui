import { describe, expect, it } from "vitest";
import { newThrownDarts } from "./sessionDarts";

describe("session darts", () => {
  it("counts only Hits that newly appear on the strip", () => {
    expect(newThrownDarts(0, 1)).toBe(1);
    expect(newThrownDarts(1, 3)).toBe(2);
    expect(newThrownDarts(3, 3)).toBe(0);
    expect(newThrownDarts(3, 0)).toBe(0);
    expect(newThrownDarts(3, 2)).toBe(0);
  });
});
