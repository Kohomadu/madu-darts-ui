import { describe, expect, it, vi } from "vitest";
import { readMuted, writeMuted } from "./mute";
import { playCue, setCuesMuted, unlockAudio } from "./play";

describe("audio mute", () => {
  it("remembers the preference", () => {
    const saved = new Map<string, string>();
    const storage = {
      getItem: (key: string) => saved.get(key) ?? null,
      setItem: (key: string, value: string) => {
        saved.set(key, value);
      },
    };
    expect(readMuted(storage)).toBe(false);
    writeMuted(storage, true);
    expect(readMuted(storage)).toBe(true);
    writeMuted(storage, false);
    expect(readMuted(storage)).toBe(false);
  });

  it("plays nothing while muted, and plays again after unmute", () => {
    const played: string[] = [];
    vi.stubGlobal(
      "Audio",
      class {
        src: string;
        constructor(src: string) {
          this.src = src;
        }
        play() {
          played.push(this.src);
          return Promise.resolve();
        }
      },
    );
    unlockAudio();
    setCuesMuted(true);
    playCue("thump");
    expect(played).toEqual([]);
    setCuesMuted(false);
    playCue("chime");
    expect(played).toEqual(["/audio/chime.wav"]);
    vi.unstubAllGlobals();
    setCuesMuted(false);
  });
});