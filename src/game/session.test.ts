import { describe, expect, it } from "vitest";
import { idleGame, reduceGame, type GameState } from "./rules";
import { freshSession, noteCheckout, noteUndo } from "./session";

function playing(target: number): GameState {
  return { phase: "playing", game: "101", target, homebase: target, turnsUsed: 0, sealed: [], live: [], bustKey: null };
}

describe("101 session stats", () => {
  it("counts a checkout and keeps the highest target", () => {
    const started = freshSession();
    const once = noteCheckout(started, playing(101), playing(102));
    expect(once).toEqual({ checkouts: 1, highTarget: 102 });
    const again = noteCheckout(once, playing(104), playing(105));
    expect(again).toEqual({ checkouts: 2, highTarget: 105 });
  });

  it("counts clearing 170", () => {
    const done = noteCheckout(freshSession(170), playing(170), {
      ...playing(170),
      phase: "complete",
    });
    expect(done).toEqual({ checkouts: 1, highTarget: 170 });
  });

  it("ignores a bust, a failed clear, and the start of a run", () => {
    const stats = freshSession();
    expect(noteCheckout(stats, playing(101), playing(101))).toBe(stats);
    expect(noteCheckout(stats, idleGame(), reduceGame(idleGame(), { type: "start" }))).toBe(stats);
  });

  it("gives a checkout back when that Turn is undone", () => {
    const stats = { checkouts: 3, highTarget: 104 };
    expect(noteUndo(stats, playing(104), playing(103))).toEqual({ checkouts: 2, highTarget: 103 });
    expect(noteUndo(stats, playing(104), playing(104))).toBe(stats);
  });
});
