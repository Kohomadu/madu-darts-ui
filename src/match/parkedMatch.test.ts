import { describe, expect, it } from "vitest";
import { PARKED_MATCH_KEY, readParkedMatch, writeParkedMatch } from "./parkedMatch";
import { startMatch } from "./reduceMatch";
import { DEFAULT_MATCH_SETUP } from "./setupStorage";

function memoryStorage(seed: Record<string, string> = {}): Storage {
  const data = { ...seed };
  return {
    get length() {
      return Object.keys(data).length;
    },
    clear() {
      for (const key of Object.keys(data)) delete data[key];
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key]! : null;
    },
    key() {
      return null;
    },
    removeItem(key: string) {
      delete data[key];
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
  };
}

describe("parked match", () => {
  it("round-trips an in-progress match and drops results", () => {
    const storage = memoryStorage();
    const state = startMatch({ ...DEFAULT_MATCH_SETUP, starter: "you" }, "Madu");
    writeParkedMatch(storage, state);
    expect(readParkedMatch(storage)?.youName).toBe("Madu");
    expect(storage.getItem(PARKED_MATCH_KEY)).toBeTruthy();
    writeParkedMatch(storage, { ...state, phase: "results", results: null });
    expect(readParkedMatch(storage)).toBeNull();
  });
});
