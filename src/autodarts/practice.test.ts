import { describe, expect, it } from "vitest";
import { normalizeBaseUrl } from "./baseUrl";
import { parseState, parseWsMessage } from "./parse";
import { connectingView, pauseView, reducePractice } from "./view";
import { hitMarker } from "../board/geometry";

/** Live Autodarts 2.1.0 visit captured 2026-11-02 (S18, S20, S14). */
const LIVE_STATE = {
  connected: true,
  event: "throwDetected",
  running: true,
  status: "takeout",
  throws: [
    {
      bed: "SingleOuter",
      bouncer: false,
      coordsX: 0.4027691926180652,
      coordsY: 0.7505815104550483,
      failed: false,
      method: "UnanimousCam",
      multiplier: 1,
      segmentName: "S18",
      segmentNumber: 18,
    },
    {
      bed: "SingleInner",
      bouncer: false,
      coordsX: -0.04990356346450389,
      coordsY: 0.44710749766518343,
      failed: false,
      method: "UnanimousCam",
      multiplier: 1,
      segmentName: "S20",
      segmentNumber: 20,
    },
    {
      bed: "SingleInner",
      bouncer: false,
      coordsX: -0.4281763637146896,
      coordsY: 0.11457955142473408,
      failed: false,
      method: "UnanimousCam",
      multiplier: 1,
      segmentName: "S14",
      segmentNumber: 14,
    },
  ],
};

describe("Autodarts state", () => {
  it("reads a 2.1 Turn of three Hits", () => {
    const snap = parseState(LIVE_STATE);
    expect(snap?.status).toBe("takeout");
    expect(snap?.event).toBe("throwDetected");
    expect(snap?.hits.map((hit) => hit.segmentName)).toEqual(["S18", "S20", "S14"]);
  });

  it("places the first Hit from normalised coords, Y up", () => {
    const snap = parseState(LIVE_STATE);
    const marker = snap ? hitMarker(snap.hits[0]) : null;
    expect(marker?.x).toBeCloseTo(0.4027691926180652 * 170, 5);
    expect(marker?.y).toBeCloseTo(-0.7505815104550483 * 170, 5);
  });

  it("reads the older nested throw shape", () => {
    const snap = parseState({
      status: "Takeout",
      event: "Throw detected",
      throws: [
        {
          coords: { x: 0.1, y: -0.2 },
          segment: { bed: "Triple", multiplier: 3, name: "T20", number: 20 },
        },
      ],
    });
    expect(snap?.hits).toEqual([
      {
        segmentName: "T20",
        segmentNumber: 20,
        multiplier: 3,
        bed: "Triple",
        coordsX: 0.1,
        coordsY: -0.2,
      },
    ]);
  });

  it("keeps at most three Hits", () => {
    const throws = [1, 5, 20, 18].map((n) => ({
      segmentName: `S${n}`,
      coordsX: 0,
      coordsY: 0.5,
    }));
    expect(parseState({ status: "throw", throws })?.hits).toHaveLength(3);
  });

  it("drops a throw that has no Segment instead of inventing one", () => {
    const snap = parseState({
      status: "throw",
      event: "throwDetected",
      throws: [{ coordsX: 0.2, coordsY: 0.3, bed: "Single" }],
    });
    expect(snap?.hits).toEqual([]);
  });

  it("treats a takeout with throws omitted as an empty Turn", () => {
    const snap = parseState({
      connected: true,
      running: true,
      status: "throw",
      event: "takeoutFinished",
    });
    expect(snap?.hits).toEqual([]);
  });

  it("ignores motion frames", () => {
    expect(parseWsMessage({ type: "motion", data: { darts: 3 } })).toBeNull();
  });

  it("unwraps a state event", () => {
    const snap = parseWsMessage({ type: "state", data: LIVE_STATE });
    expect(snap?.hits.map((hit) => hit.segmentName)).toEqual(["S18", "S20", "S14"]);
  });
});

describe("connection", () => {
  it("pauses on disconnect and keeps only the Hits already received", () => {
    const live = reducePractice(connectingView(), {
      type: "snapshot",
      snapshot: parseState(LIVE_STATE)!,
      via: "live",
    });
    const paused = reducePractice(live, { type: "unreachable" });
    expect(paused.phase).toBe("disconnected");
    expect(paused.hits).toEqual(live.hits);
    expect(pauseView(live).hits).toHaveLength(3);
  });

  it("does not draw a marker when a Hit has no coordinates", () => {
    expect(
      hitMarker({
        segmentName: "T20",
        segmentNumber: 20,
        multiplier: 3,
        bed: "Triple",
        coordsX: null,
        coordsY: null,
      }),
    ).toBeNull();
  });

  it("clears the Turn when pointing at another Autodarts URL", () => {
    const live = reducePractice(connectingView(), {
      type: "snapshot",
      snapshot: parseState(LIVE_STATE)!,
      via: "live",
    });
    expect(reducePractice(live, { type: "connecting" }).hits).toEqual([]);
  });

  it("a closed socket falls back to polling without dropping Hits", () => {
    const live = reducePractice(connectingView(), {
      type: "snapshot",
      snapshot: parseState(LIVE_STATE)!,
      via: "live",
    });
    const polling = reducePractice(live, { type: "socket-closed" });
    expect(polling.phase).toBe("polling");
    expect(polling.hits.map((hit) => hit.segmentName)).toEqual(["S18", "S20", "S14"]);
  });

  it("keeps a local Manual Override across later Autodarts snapshots", () => {
    const live = reducePractice(connectingView(), {
      type: "snapshot",
      snapshot: parseState(LIVE_STATE)!,
      via: "live",
    });
    const overridden = reducePractice(live, {
      type: "local-override",
      index: 0,
      hit: {
        segmentName: "T20",
        segmentNumber: 20,
        multiplier: 3,
        bed: "Triple",
        coordsX: 0,
        coordsY: 0.5,
      },
    });
    expect(overridden.hits[0]?.segmentName).toBe("T20");
    expect(overridden.streamHits[0]?.segmentName).toBe("S18");

    const again = reducePractice(overridden, {
      type: "snapshot",
      snapshot: parseState(LIVE_STATE)!,
      via: "live",
    });
    expect(again.hits[0]?.segmentName).toBe("T20");
    expect(again.hits.map((hit) => hit.segmentName)).toEqual(["T20", "S20", "S14"]);

    const cleared = reducePractice(again, {
      type: "snapshot",
      snapshot: parseState({ status: "throw", event: "takeoutFinished" })!,
      via: "live",
    });
    expect(cleared.hits).toEqual([]);
    expect(cleared.localOverrides).toEqual({});
    expect(cleared.reviewHits).toBeNull();
  });

  it("restores a sealed Turn across an empty poll and keeps a Manual Override on it", () => {
    const live = reducePractice(connectingView(), {
      type: "snapshot",
      snapshot: parseState(LIVE_STATE)!,
      via: "live",
    });
    const cleared = reducePractice(live, {
      type: "snapshot",
      snapshot: parseState({ status: "throw", event: "takeoutFinished" })!,
      via: "live",
    });
    const restored = reducePractice(cleared, { type: "restore-turn", hits: live.hits });
    expect(restored.hits.map((hit) => hit.segmentName)).toEqual(["S18", "S20", "S14"]);
    expect(restored.streamHits).toEqual([]);
    expect(restored.reviewHits).toHaveLength(3);

    const polled = reducePractice(restored, {
      type: "snapshot",
      snapshot: parseState({ status: "throw", event: "takeoutFinished" })!,
      via: "polling",
    });
    expect(polled.hits.map((hit) => hit.segmentName)).toEqual(["S18", "S20", "S14"]);
    expect(polled.reviewHits).toHaveLength(3);

    const edited = reducePractice(polled, {
      type: "local-override",
      index: 0,
      hit: { ...live.hits[0], segmentName: "T20" },
    });
    expect(edited.hits.map((hit) => hit.segmentName)).toEqual(["T20", "S20", "S14"]);
    expect(edited.streamHits).toEqual([]);

    const done = reducePractice(edited, { type: "finish-review" });
    expect(done.hits).toEqual([]);
    expect(done.reviewHits).toBeNull();
    expect(done.event).toBe("takeoutFinished");

    const fresh = reducePractice(restored, {
      type: "snapshot",
      snapshot: parseState({
        status: "throw",
        event: "throwDetected",
        throws: [LIVE_STATE.throws[1]],
      })!,
      via: "live",
    });
    expect(fresh.reviewHits).toBeNull();
    expect(fresh.hits.map((hit) => hit.segmentName)).toEqual(["S20"]);
  });

  it("holds the strip empty after Next score until Autodarts reports no Hits", () => {
    const live = reducePractice(connectingView(), {
      type: "snapshot",
      snapshot: parseState(LIVE_STATE)!,
      via: "live",
    });
    const held = reducePractice(live, { type: "hold-empty" });
    expect(held.holdEmpty).toBe(true);
    expect(held.hits).toEqual([]);

    const still = reducePractice(held, {
      type: "snapshot",
      snapshot: parseState(LIVE_STATE)!,
      via: "live",
    });
    expect(still.holdEmpty).toBe(true);
    expect(still.hits).toEqual([]);
    expect(still.streamHits).toHaveLength(3);

    const cleared = reducePractice(still, {
      type: "snapshot",
      snapshot: parseState({ status: "throw", event: "takeoutFinished" })!,
      via: "live",
    });
    expect(cleared.holdEmpty).toBe(false);
    expect(cleared.hits).toEqual([]);
  });

  it("puts the stream Hits back when Next score did not reset the Board", () => {
    const live = reducePractice(connectingView(), {
      type: "snapshot",
      snapshot: parseState(LIVE_STATE)!,
      via: "live",
    });
    const held = reducePractice(live, { type: "hold-empty" });
    const released = reducePractice(held, { type: "release-hold" });
    expect(released.holdEmpty).toBe(false);
    expect(released.hits.map((hit) => hit.segmentName)).toEqual(["S18", "S20", "S14"]);
  });
});

describe("Autodarts URL", () => {
  it("defaults a bare host:port to http and drops any path", () => {
    expect(normalizeBaseUrl("localhost:3180")).toBe("http://localhost:3180");
    expect(normalizeBaseUrl("http://127.0.0.1:3180/api/state")).toBe("http://127.0.0.1:3180");
  });
});
