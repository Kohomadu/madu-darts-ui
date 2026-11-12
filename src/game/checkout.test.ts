import { describe, expect, it } from "vitest";
import { scoreSegment } from "./rules";
import { cannotCheckout, checkoutRoute, finishRoute, openRouteSlots, shownRemaining } from "./checkout";

const BOGEYS = new Set([159, 162, 163, 165, 166, 168, 169]);

function sum(route: string[]): number {
  return route.reduce((total, name) => total + scoreSegment(name).points, 0);
}

describe("Checkout Route", () => {
  it("uses the Dartbase primary route, including where it prefers Bull", () => {
    expect(checkoutRoute(121, 3)).toEqual(["T20", "T11", "D14"]);
    expect(checkoutRoute(170, 3)).toEqual(["T20", "T20", "Bull"]);
    expect(checkoutRoute(101, 3)).toEqual(["T20", "S9", "D16"]);
    expect(checkoutRoute(82, 3)).toEqual(["Bull", "D16"]);
    expect(checkoutRoute(135, 3)).toEqual(["T20", "T17", "D12"]);
    expect(checkoutRoute(50, 3)).toEqual(["S10", "D20"]);
    expect(checkoutRoute(50, 1)).toEqual(["Bull"]);
    expect(checkoutRoute(40, 1)).toEqual(["D20"]);
  });

  it("looks the route up again for the darts still open", () => {
    expect(checkoutRoute(101, 2)).toEqual(["T17", "Bull"]);
    expect(checkoutRoute(61, 2)).toEqual(["T11", "D14"]);
    expect(checkoutRoute(61, 3)).toEqual(["25", "D18"]);
    expect(checkoutRoute(90, 2)).toEqual(["T18", "D18"]);
    expect(checkoutRoute(90, 3)).toEqual(["T20", "D15"]);
    expect(checkoutRoute(82, 2)).toEqual(["T18", "D14"]);
    expect(checkoutRoute(41, 2)).toEqual(["S9", "D16"]);
    expect(checkoutRoute(121, 1)).toEqual(["T20"]);
    expect(checkoutRoute(0, 2)).toEqual([]);
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

  it("scores on treble 20 from 501, and does not bust a score just above 170", () => {
    expect(checkoutRoute(501, 3)).toEqual(["T20", "T20", "T20"]);
    expect(finishRoute(501, 3)).toEqual([]);
    expect(finishRoute(180, 3)).toEqual([]);
    expect(finishRoute(159, 3)).toEqual([]);
    expect(finishRoute(121, 1)).toEqual([]);
    expect(finishRoute(100, 1)).toEqual([]);
    expect(finishRoute(170, 3)).toEqual(["T20", "T20", "Bull"]);
    expect(finishRoute(40, 1)).toEqual(["D20"]);
    expect(finishRoute(100, 3)).toEqual(checkoutRoute(100, 3));
    const from180 = checkoutRoute(180, 3);
    expect(sum(from180)).toBeLessThan(180);
    expect(180 - sum(from180)).not.toBe(1);
  });

  it("knows which leaves cannot be checked out", () => {
    for (let remaining = 2; remaining <= 60; remaining += 1) {
      const finish = remaining === 50 || (remaining <= 40 && remaining % 2 === 0);
      expect(cannotCheckout(remaining, 1), String(remaining)).toBe(!finish);
    }
    for (const remaining of [99, 102, 103, 105, 106, 108, 109, 111, 170]) {
      expect(cannotCheckout(remaining, 2), String(remaining)).toBe(true);
    }
    for (const remaining of [2, 3, 40, 50, 98, 100, 101, 104, 107, 110]) {
      expect(cannotCheckout(remaining, 2), String(remaining)).toBe(false);
    }
    for (const remaining of [159, 162, 163, 165, 166, 168, 169, 171]) {
      expect(cannotCheckout(remaining, 3), String(remaining)).toBe(true);
    }
    for (const remaining of [2, 101, 158, 160, 161, 164, 167, 170]) {
      expect(cannotCheckout(remaining, 3), String(remaining)).toBe(false);
    }
    for (const dartsLeft of [0, 4, 5, 6]) {
      expect(cannotCheckout(159, dartsLeft)).toBe(false);
      expect(cannotCheckout(99, dartsLeft)).toBe(false);
      expect(cannotCheckout(3, dartsLeft)).toBe(false);
    }
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
