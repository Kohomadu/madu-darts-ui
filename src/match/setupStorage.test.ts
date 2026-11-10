import { describe, expect, it } from "vitest";
import {
  DEFAULT_MATCH_SETUP,
  MATCH_SETUP_KEY,
  canStartHumanMatch,
  canStartMatch,
  readMatchSetup,
  writeMatchSetup,
} from "./setupStorage";

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

describe("match setup storage", () => {
  it("defaults to 501 best of 5 legs, sets off, bull-off, Guest, bot level 4", () => {
    expect(readMatchSetup(memoryStorage())).toEqual(DEFAULT_MATCH_SETUP);
  });

  it("round-trips a remembered setup", () => {
    const storage = memoryStorage();
    const setup = {
      ...DEFAULT_MATCH_SETUP,
      legsBestOf: 7 as const,
      setsEnabled: true,
      starter: "you" as const,
      opponentName: "Pat",
      botLevel: 6 as const,
    };
    writeMatchSetup(storage, setup);
    expect(readMatchSetup(storage)).toEqual(setup);
    expect(storage.getItem(MATCH_SETUP_KEY)).toBeTruthy();
  });

  it("starts a human name or the bot seat", () => {
    expect(canStartHumanMatch({ ...DEFAULT_MATCH_SETUP, opponentKind: "human", opponentName: "Pat" })).toBe(
      true,
    );
    expect(canStartHumanMatch({ ...DEFAULT_MATCH_SETUP, opponentKind: "bot", opponentName: "Bot" })).toBe(
      false,
    );
    expect(canStartMatch({ ...DEFAULT_MATCH_SETUP, opponentKind: "bot", botLevel: 6 })).toBe(true);
    expect(canStartMatch({ ...DEFAULT_MATCH_SETUP, opponentKind: "human", opponentName: "Pat" })).toBe(true);
  });
});
