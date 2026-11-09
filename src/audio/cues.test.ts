import { describe, expect, it } from "vitest";
import type { Hit } from "../autodarts/parse";
import { idleGame, project, reduceGame, type GameState } from "../game/rules";
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

  it("plays fatality for a 3-dart 101, and Next level when takeout moves the target", () => {
    const started = playing();
    const open = strip(started, ["T20", "S1"]);
    const checkout = strip(open, ["T20", "S1", "D20"]);
    const after = strip(checkout, []);
    const before = frame([hit("T20", 0), hit("S1", 1)], open);
    const finishing = frame([hit("T20", 0), hit("S1", 1), hit("D20", 2)], checkout);
    const taken = frame([], after, { event: "takeoutFinished" });

    expect(planMoment(before, finishing)).toEqual({ cues: ["thump", "fatality"], overlay: "checkout" });
    expect(planMoment(finishing, taken)).toEqual({ cues: ["next-level"], overlay: null });
    expect(planCues(taken, frame([hit("S1", 0)], after))).toEqual(["thump"]);
  });

  it("plays epic fail for a bust that opened on 61 or more, and only a chime when those darts leave", () => {
    const started = playing();
    const first = strip(started, ["T20"]);
    const bust = strip(first, ["T20", "T20"]);
    const confirmed = strip(bust, []);
    const live = frame([hit("T20", 0)], first);
    const busted = frame([hit("T20", 0), hit("T20", 1)], bust);
    const removed = frame([], confirmed, { event: "takeoutFinished" });

    expect(planMoment(live, busted)).toEqual({ cues: ["thump", "epic-fail"], overlay: "try-again" });
    expect(planCues(busted, removed)).toEqual(["chime"]);
  });

  it("plays the failure trumpet when two Turns do not clear a score that was still possible", () => {
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
    expect(planMoment(thrown, taken)).toEqual({ cues: ["failure-trumpet", "chime"], overlay: "try-again" });
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
    expect(planMoment(before, finishing)).toEqual({ cues: ["thump", "orchestral-win"], overlay: "checkout" });
    expect(planCues(finishing, taken)).toEqual(["chime"]);
    expect(planCues(taken, dropped)).toEqual([]);
    expect(planCues(dropped, frame([hit("S1", 0), hit("S5", 1)], done))).toEqual([]);
  });

  it("stays silent when Undo puts a sealed Turn back on the strip", () => {
    const started = playing();
    const busted = strip(started, ["T20", "T20", "T20"]);
    const empty = frame([], started);
    const restored = frame([hit("T20", 0), hit("T20", 1), hit("T20", 2)], busted);
    expect(planCues(empty, restored)).toEqual(["thump", "thump", "thump", "epic-fail"]);
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

  it("shows Try again while the Turn is still on the Board when three darts cannot finish", () => {
    const at162: GameState = { ...playing(), target: 162 };
    const two = strip(at162, ["S1", "S1"]);
    const three = strip(two, ["S1", "S1", "S1"]);
    const taken = strip(three, []);

    expect(project(three)).toMatchObject({ remaining: 159, dartsLeft: 3, busted: false });
    expect(planMoment(frame([hit("S1", 0), hit("S1", 1)], two), frame([hit("S1", 0), hit("S1", 1), hit("S1", 2)], three))).toEqual({
      cues: ["thump", "oni-chan-baka"],
      overlay: "try-again",
    });
    expect(planMoment(frame([hit("S1", 0), hit("S1", 1), hit("S1", 2)], three), frame([], taken, { event: "takeoutFinished" }))).toEqual({
      cues: ["chime"],
      overlay: null,
    });
  });

  it("shows Try again with one dart left on an odd remaining, and stays quiet on a double", () => {
    let state = strip(playing(), ["S20", "S20", "S20"]);
    state = strip(state, []);
    const setup = strip(state, ["S1"]);
    const odd = strip(setup, ["S1", "S1"]);
    const even = strip(setup, ["S1", "S20"]);

    expect(project(odd)).toMatchObject({ remaining: 39, dartsLeft: 1 });
    expect(project(even)).toMatchObject({ remaining: 20, dartsLeft: 1 });
    expect(planMoment(frame([hit("S1", 0)], setup), frame([hit("S1", 0), hit("S1", 1)], odd))).toEqual({
      cues: ["thump", "oni-chan-baka"],
      overlay: "try-again",
    });
    expect(planMoment(frame([hit("S1", 0)], setup), frame([hit("S1", 0), hit("S20", 1)], even))).toEqual({
      cues: ["thump"],
      overlay: null,
    });
  });

  it("shows Try again with two darts left over 110, and not again when that Turn is taken out", () => {
    const at119: GameState = { ...playing(), target: 119 };
    let state = strip(at119, ["M20", "M20", "M20"]);
    state = strip(state, []);
    const stuck = strip(state, ["M20"]);
    const taken = strip(stuck, []);

    expect(project(stuck)).toMatchObject({ remaining: 119, dartsLeft: 2, busted: false });
    expect(planMoment(frame([], state), frame([hit("M20", 0)], stuck))).toEqual({
      cues: ["thump", "oni-chan-baka"],
      overlay: "try-again",
    });
    expect(project(taken)).toMatchObject({ target: 119, remaining: 119, dartsLeft: 6 });
    expect(planMoment(frame([hit("M20", 0)], stuck), frame([], taken, { event: "takeoutFinished" }))).toEqual({
      cues: ["chime"],
      overlay: null,
    });
  });

  it("does not call a three-dart bogey impossible while four darts remain", () => {
    const at169: GameState = { ...playing(), target: 169 };
    const one = strip(at169, ["S5"]);
    const two = strip(one, ["S5", "S5"]);

    expect(project(two)).toMatchObject({ remaining: 159, dartsLeft: 4 });
    expect(planMoment(frame([hit("S5", 0)], one), frame([hit("S5", 0), hit("S5", 1)], two)).overlay).toBeNull();
  });

  it("shows Try again when a Manual Override leaves no double for the last dart", () => {
    let state = strip(playing(), ["S20", "S20", "S20"]);
    state = strip(state, []);
    const setup = strip(state, ["S1"]);
    const possible = strip(setup, ["S1", "S20"]);
    const impossible = strip(setup, ["S1", "S19"]);

    expect(planMoment(frame([hit("S1", 0), hit("S20", 1)], possible), frame([hit("S1", 0), hit("S19", 1.2)], impossible))).toEqual({
      cues: ["oni-chan-baka"],
      overlay: "try-again",
    });
    expect(planMoment(frame([hit("S1", 0), hit("S19", 1)], impossible), frame([hit("S1", 0), hit("S20", 1.2)], possible))).toEqual({
      cues: [],
      overlay: null,
    });
  });

  it("plays level-win for a checkout from 61 to 100, and the old sting below that", () => {
    const at80: GameState = { ...playing(), target: 80 };
    const open = strip(at80, ["T20"]);
    const checkout = strip(open, ["T20", "D10"]);
    expect(planMoment(frame([hit("T20", 0)], open), frame([hit("T20", 0), hit("D10", 1)], checkout))).toEqual({
      cues: ["thump", "level-win"],
      overlay: "checkout",
    });

    const at40: GameState = { ...playing(), target: 40 };
    const low = strip(at40, ["D20"]);
    expect(planMoment(frame([], at40), frame([hit("D20", 0)], low)).cues).toEqual(["thump", "win"]);

    const at121: GameState = { ...playing(), target: 121 };
    const two = strip(at121, ["T20", "T11"]);
    const out = strip(two, ["T20", "T11", "D14"]);
    expect(planMoment(frame([hit("T20", 0), hit("T11", 1)], two), frame([hit("T20", 0), hit("T11", 1), hit("D14", 2)], out)).cues).toEqual([
      "thump",
      "win",
    ]);
  });

  it("plays the failure trumpet when the Turn opened under 61", () => {
    let state = strip(playing(), ["S20", "S20", "S20"]);
    state = strip(state, []);
    const bust = strip(state, ["T20"]);
    expect(project(bust)).toMatchObject({ busted: true, target: 101 });
    expect(planMoment(frame([], state), frame([hit("T20", 0)], bust)).cues).toEqual(["thump", "failure-trumpet"]);
  });
});
