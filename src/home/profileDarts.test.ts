import { describe, expect, it } from "vitest";
import {
  addProfileDartsThrown,
  observeThrownDarts,
  PROFILE_DARTS_KEY,
  readProfileDartsThrown,
  type DartWatch,
} from "./profileDarts";

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

function watch(): DartWatch {
  return { seen: null };
}

describe("profile darts thrown", () => {
  it("starts at zero", () => {
    expect(readProfileDartsThrown(memoryStorage(), "Madu")).toBe(0);
  });

  it("adds throws for that profile only", () => {
    const storage = memoryStorage();
    expect(addProfileDartsThrown(storage, "Madu", 2)).toBe(2);
    expect(addProfileDartsThrown(storage, "  Madu  ", 1)).toBe(3);
    expect(addProfileDartsThrown(storage, "Alex", 4)).toBe(4);
    expect(readProfileDartsThrown(storage, "Madu")).toBe(3);
    expect(readProfileDartsThrown(storage, "Alex")).toBe(4);
  });

  it("leaves the total unchanged for an empty addition", () => {
    const storage = memoryStorage();
    addProfileDartsThrown(storage, "Madu", 5);
    expect(addProfileDartsThrown(storage, "Madu", 0)).toBe(5);
    expect(addProfileDartsThrown(storage, "Madu", -2)).toBe(5);
  });

  it("ignores a stored value that is not a ledger", () => {
    const storage = memoryStorage({ [PROFILE_DARTS_KEY]: "nope" });
    expect(readProfileDartsThrown(storage, "Madu")).toBe(0);
    expect(addProfileDartsThrown(storage, "Madu", 1)).toBe(1);
  });
});

describe("observed throws", () => {
  it("counts darts that arrive after the strip is first seen", () => {
    const seen = watch();
    expect(observeThrownDarts(seen, { hits: 0, replay: false, yours: true })).toBe(0);
    expect(observeThrownDarts(seen, { hits: 1, replay: false, yours: true })).toBe(1);
    expect(observeThrownDarts(seen, { hits: 3, replay: false, yours: true })).toBe(2);
  });

  it("does not count darts already showing when watching starts", () => {
    const seen = watch();
    expect(observeThrownDarts(seen, { hits: 2, replay: false, yours: true })).toBe(0);
    expect(observeThrownDarts(seen, { hits: 3, replay: false, yours: true })).toBe(1);
  });

  it("ignores a replacement, a shorter strip, and a replay", () => {
    const seen = watch();
    observeThrownDarts(seen, { hits: 0, replay: false, yours: true });
    expect(observeThrownDarts(seen, { hits: 3, replay: false, yours: true })).toBe(3);
    expect(observeThrownDarts(seen, { hits: 3, replay: false, yours: true })).toBe(0);
    expect(observeThrownDarts(seen, { hits: 1, replay: false, yours: true })).toBe(0);
    expect(observeThrownDarts(seen, { hits: 3, replay: true, yours: true })).toBe(0);
    expect(observeThrownDarts(seen, { hits: 4, replay: false, yours: true })).toBe(1);
  });

  it("skips throws that belong to the other player", () => {
    const seen = watch();
    observeThrownDarts(seen, { hits: 0, replay: false, yours: true });
    expect(observeThrownDarts(seen, { hits: 3, replay: false, yours: false })).toBe(0);
    expect(observeThrownDarts(seen, { hits: 0, replay: false, yours: false })).toBe(0);
    expect(observeThrownDarts(seen, { hits: 1, replay: false, yours: true })).toBe(1);
  });
});
