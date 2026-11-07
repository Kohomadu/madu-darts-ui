import { describe, expect, it } from "vitest";
import type { Hit } from "../autodarts/parse";
import { idleGame, reduceGame, type GameState } from "../game/rules";
import { audibleCues, planCues, planMoment, type Observation } from "./cues";

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

  it("plays the checkout cue when the finishing double lands, and only a chime when those darts leave", () => {
    const started = playing();
    const open = strip(started, ["T20", "S1"]);
    const checkout = strip(open, ["T20", "S1", "D20"]);
    const after = strip(checkout, []);
    const before = frame([hit("T20", 0), hit("S1", 1)], open);
    const finishing = frame([hit("T20", 0), hit("S1", 1), hit("D20", 2)], checkout);
    const taken = frame([], after, { event: "takeoutFinished" });

    expect(planMoment(before, finishing)).toEqual({ cues: ["thump", "win"], overlay: "checkout" });
    expect(planMoment(finishing, taken)).toEqual({ cues: ["chime"], overlay: null });
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

    expect(planMoment(live, busted)).toEqual({ cues: ["thump", "fail"], overlay: "try-again" });
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
    expect(planMoment(thrown, taken)).toEqual({ cues: ["fail", "chime"], overlay: "try-again" });
    expect(planCues(taken, frame([], failed, { event: "throw" }))).toEqual([]);
  });

  it("plays the checkout cue when Inner Bull finishes 170", () => {
    let state = playing();
    state = { ...state, target: 170 };
    const open = strip(state, ["T20", "T20"]);
    const checkout = strip(open, ["T20", "T20", "Bull"]);
    const done = strip(checkout, []);
    const before = frame([hit("T20", 0), hit("T20", 1)], open);
    const finishing = frame([hit("T20", 0), hit("T20", 1), hit("Bull", 2)], checkout);
    const taken = frame([], done, { event: "takeoutFinished" });
    const dropped = frame([hit("S1", 0)], done, { connected: false });

    expect(done.phase).toBe("complete");
    expect(planMoment(before, finishing)).toEqual({ cues: ["thump", "win"], overlay: "checkout" });
    expect(planCues(finishing, taken)).toEqual(["chime"]);
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

  it("celebrates a free-practice double that lands on zero, including an Override that creates it", () => {
    const idle = idleGame();
    const setup = ["T20", "T20", "T20", "T20", "T20", "T20", "T20", "T19", "S4"];
    const openHits = setup.map((name, index) => hit(name, index));
    const open = frame(openHits, idle);
    const finishing = frame([...openHits, hit("D10", openHits.length)], idle);
    expect(planMoment(open, finishing)).toEqual({ cues: ["thump", "win"], overlay: "checkout" });

    const corrected = frame([...openHits.slice(0, -1), hit("D12", openHits.length - 1)], idle);
    expect(planMoment(open, corrected)).toEqual({ cues: ["win"], overlay: "checkout" });
    expect(planMoment(finishing, frame([...openHits, hit("S5", openHits.length)], idle))).toEqual({
      cues: [],
      overlay: null,
    });
  });

  it("does not overlay a Manual Override that leaves the attempt open", () => {
    const started = playing();
    const open = strip(started, ["T20"]);
    const before = frame([hit("T20", 0)], open);
    const overridden = frame([hit("T19", 0.4)], strip(started, ["T19"]));
    expect(planMoment(before, overridden)).toEqual({ cues: [], overlay: null });
  });
});
