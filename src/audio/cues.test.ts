import { describe, expect, it } from "vitest";
import type { Hit } from "../autodarts/parse";
import { idleGame, reduceGame, type GameState } from "../game/rules";
import { audibleCues, planCues, type Observation } from "./cues";

function hit(segmentName: string, coordsX: number): Hit {
  return { segmentName, segmentNumber: null, multiplier: null, bed: null, coordsX, coordsY: 0 };
}

function playing(): GameState {
  return reduceGame(idleGame(), { type: "start" });
}

function strip(state: GameState, names: string[]): GameState {
  return reduceGame(state, {
    type: "strip",
    connected: true,
    hits: names.map((name, index) => ({ segmentName: name, coordsX: index, coordsY: 0 })),
  });
}

function frame(
  hits: Hit[],
  game: GameState,
  extra: Partial<Pick<Observation, "connected" | "status" | "event">> = {},
): Observation {
  return {
    connected: true,
    status: "throw",
    event: "throwDetected",
    hits,
    game,
    ...extra,
  };
}

describe("practice cues", () => {
  it("thumps once for each new Hit and stays quiet on a Manual Override", () => {
    const idle = idleGame();
    const empty = frame([], idle);
    const one = frame([hit("T20", 0)], idle);
    const two = frame([hit("T20", 0), hit("S1", 1)], idle);
    const overridden = frame([hit("T20", 0), hit("S5", 1.2)], idle);

    expect(planCues(null, one)).toEqual([]);
    expect(planCues(empty, one)).toEqual(["thump"]);
    expect(planCues(one, two)).toEqual(["thump"]);
    expect(planCues(two, overridden)).toEqual([]);
  });

  it("chimes once when the Turn seals on takeout", () => {
    const idle = idleGame();
    const thrown = frame([hit("T20", 0), hit("S1", 1), hit("S5", 2)], idle);
    const removed = frame([], idle, { event: "takeoutFinished" });
    const clearedWithoutTakeout = frame([], idle, { event: "throw" });

    expect(planCues(thrown, removed)).toEqual(["chime"]);
    expect(planCues(thrown, clearedWithoutTakeout)).toEqual([]);
  });

  it("plays win once when the current 101 target is cleared", () => {
    const before = strip(playing(), ["T20", "S1", "D20"]);
    const after = strip(before, []);
    const thrown = frame(
      [hit("T20", 0), hit("S1", 1), hit("D20", 2)],
      before,
    );
    const taken = frame([], after, { event: "takeoutFinished" });

    expect(planCues(thrown, taken)).toEqual(["win", "chime"]);
    expect(planCues(taken, frame([hit("S1", 0)], after))).toEqual(["thump"]);
  });

  it("plays fail once for a bust, and only a chime when those darts are later removed", () => {
    const started = playing();
    const first = strip(started, ["T20"]);
    const bust = strip(first, ["T20", "T20"]);
    const confirmed = strip(bust, []);
    const live = frame([hit("T20", 0)], first);
    const busted = frame([hit("T20", 0), hit("T20", 1)], bust);
    const removed = frame([], confirmed, { event: "takeoutFinished" });

    expect(planCues(live, busted)).toEqual(["thump", "fail"]);
    expect(planCues(busted, removed)).toEqual(["chime"]);
  });

  it("plays fail once when two Turns do not clear the target", () => {
    let state = strip(playing(), ["T20"]);
    state = strip(state, []);
    const beforeSecond = state;
    state = strip(state, ["S1", "S1", "S1"]);
    const thrown = frame(
      [hit("S1", 0), hit("S1", 1), hit("S1", 2)],
      state,
    );
    const failed = strip(state, []);
    const taken = frame([], failed, { event: "takeoutFinished" });

    expect(beforeSecond.target).toBe(101);
    expect(planCues(thrown, taken)).toEqual(["fail", "chime"]);
    expect(planCues(taken, frame([], failed, { event: "throw" }))).toEqual([]);
  });

  it("plays win when 170 is cleared and does not cue while disconnected", () => {
    let state = playing();
    state = { ...state, target: 170 };
    const checkout = strip(state, ["T20", "T20", "Bull"]);
    const done = strip(checkout, []);
    const thrown = frame([hit("T20", 0), hit("T20", 1), hit("Bull", 2)], checkout);
    const taken = frame([], done, { event: "takeoutFinished" });
    const dropped = frame([hit("S1", 0)], done, { connected: false });

    expect(done.phase).toBe("complete");
    expect(planCues(thrown, taken)).toEqual(["win", "chime"]);
    expect(planCues(taken, dropped)).toEqual([]);
    expect(planCues(dropped, frame([hit("S1", 0), hit("S5", 1)], done))).toEqual([]);
  });

  it("stays silent when Undo puts a sealed Turn back on the strip", () => {
    const started = playing();
    const busted = strip(started, ["T20", "T20", "T20"]);
    const empty = frame([], started);
    const restored = frame([hit("T20", 0), hit("T20", 1), hit("T20", 2)], busted);
    expect(planCues(empty, restored)).toEqual(["thump", "thump", "thump", "fail"]);
    expect(audibleCues(empty, restored, true)).toEqual([]);
  });
});
