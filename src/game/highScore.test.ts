import { describe, expect, it } from "vitest";
import { beatHighScore, formatHighScore, readHighScore, writeHighScore } from "./highScore";

function memory(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("High Score", () => {
  it("saves a higher score and keeps the earlier one when it is not beaten", () => {
    const first = beatHighScore(null, 122, 6, 1_700_000_000_000);
    expect(first).toEqual({ score: 122, darts: 6, at: 1_700_000_000_000 });
    expect(beatHighScore(first, 122, 3, 1_800_000_000_000)).toBe(first);
    expect(beatHighScore(first, 130, 9, 1_800_000_000_000)).toEqual({ score: 130, darts: 9, at: 1_800_000_000_000 });
    expect(beatHighScore(null, 102, 0, 1)).toBeNull();
  });

  it("persists each Training Game on its own", () => {
    const storage = memory();
    writeHighScore(storage, "121", { score: 125, darts: 9, at: 10 });
    writeHighScore(storage, "101", { score: 140, darts: 3, at: 11 });
    expect(readHighScore(storage, "121")).toEqual({ score: 125, darts: 9, at: 10 });
    expect(readHighScore(storage, "101")).toEqual({ score: 140, darts: 3, at: 11 });
    expect(formatHighScore(readHighScore(storage, "121"))).toContain("High Score 125 · 9 darts · ");
    expect(formatHighScore(null)).toBe("High Score —");
  });
});