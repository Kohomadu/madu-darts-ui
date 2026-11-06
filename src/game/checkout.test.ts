import { describe, expect, it } from "vitest";
import { scoreSegment } from "./rules";
import { checkoutRoute, openRouteSlots, shownRemaining } from "./checkout";

const BOGEYS = new Set([159, 162, 163, 165, 166, 168, 169]);

function sum(route: string[]): number {
  return route.reduce((total, name) => total + scoreSegment(name).points, 0);
}

describe("Checkout Route", () => {
  it("shows the familiar three-dart route for 121", () => {
    expect(checkoutRoute(121, 3)).toEqual(["T20", "25", "D18"]);
  });

  it("finishes 170 on Inner Bull and keeps shorter finishes short", () => {
    expect(checkoutRoute(170, 3)).toEqual(["T20", "T20", "Bull"]);
    expect(checkoutRoute(50, 3)).toEqual(["Bull"]);
    expect(checkoutRoute(40, 1)).toEqual(["D20"]);
    expect(checkoutRoute(101, 3)).toEqual(["T17", "Bull"]);
  });

  it("checks out every finishable remaining score on a double", () => {
    for (let remaining = 2; remaining <= 170; remaining += 1) {
      const route = checkoutRoute(remaining, 3);
      expect(route.length, String(remaining)).toBeGreaterThan(0);
      if (BOGEYS.has(remaining)) {
        expect(sum(route), String(remaining)).toBeLessThan(remaining);
        continue;
      }
      expect(sum(route), `${remaining} ${route.join(" ")}`).toBe(remaining);
      expect(scoreSegment(route[route.length - 1]).double, String(remaining)).toBe(true);
    }
  });

  it("continues the route in the slots still open this Turn", () => {
    expect(checkoutRoute(61, 2)).toEqual(["25", "D18"]);
    expect(checkoutRoute(121, 1)).toEqual(["T20"]);
    expect(checkoutRoute(0, 2)).toEqual([]);
  });

  it("suggests treble 20s from a 501 visit when three darts cannot finish", () => {
    expect(checkoutRoute(501, 3)).toEqual(["T20", "T20", "T20"]);
  });

  it("uses the Training Game remaining, and a 501 visit in free practice", () => {
    expect(shownRemaining("playing", 61, [{ segmentName: "T20" }])).toBe(61);
    expect(shownRemaining("idle", 101, [])).toBe(501);
    expect(shownRemaining("idle", 101, [{ segmentName: "T20" }])).toBe(441);
    expect(openRouteSlots({ busted: true, phase: "playing", remaining: 101, hitCount: 2 })).toBe(0);
    expect(openRouteSlots({ busted: false, phase: "playing", remaining: 61, hitCount: 1 })).toBe(2);
    expect(openRouteSlots({ busted: false, phase: "complete", remaining: 0, hitCount: 0 })).toBe(0);
  });
});
