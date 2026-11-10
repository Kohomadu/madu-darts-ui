import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROFILE_NAME,
  PROFILE_NAME_KEY,
  readProfileName,
  writeProfileName,
} from "./profile";

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

describe("local profile name", () => {
  it("defaults to Madu when nothing is stored", () => {
    expect(readProfileName(memoryStorage())).toBe(DEFAULT_PROFILE_NAME);
  });

  it("returns the last stored name", () => {
    const storage = memoryStorage({ [PROFILE_NAME_KEY]: "Alex" });
    expect(readProfileName(storage)).toBe("Alex");
  });

  it("treats blank storage as Madu", () => {
    expect(readProfileName(memoryStorage({ [PROFILE_NAME_KEY]: "  " }))).toBe(DEFAULT_PROFILE_NAME);
  });

  it("persists a trimmed name", () => {
    const storage = memoryStorage();
    writeProfileName(storage, "  Sam  ");
    expect(storage.getItem(PROFILE_NAME_KEY)).toBe("Sam");
  });
});
