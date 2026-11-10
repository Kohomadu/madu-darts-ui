import { BOARD_WEDGES, COORDS_NORM_RADIUS_MM, RADII } from "../board/geometry";
import { cannotCheckout, checkoutRoute } from "../game/checkout";
import { scoreSegment } from "../game/rules";

export type BotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type BotDart = {
  segmentName: string;
  coordsX: number;
  coordsY: number;
};

export type BotTurnPlan = {
  /** Darts to show, in order. A bust or checkout stops the list. */
  darts: BotDart[];
  bust: boolean;
  checkout: boolean;
};

const AIMS: Record<BotLevel, number> = {
  1: 20,
  2: 30,
  3: 40,
  4: 50,
  5: 60,
  6: 70,
  7: 80,
  8: 90,
};

const HIT_CHANCES: Record<BotLevel, number> = {
  1: 0.05,
  2: 0.1,
  3: 0.15,
  4: 0.2,
  5: 0.25,
  6: 0.3,
  7: 0.4,
  8: 0.5,
};

/** Clockwise from 20, the same order as the board wedges. */
const WEDGES = BOARD_WEDGES.map((wedge) => wedge.number);

const SCORING_SEGMENTS: { name: string; points: number }[] = [
  ...Array.from({ length: 20 }, (_, index) => {
    const number = 20 - index;
    return { name: `T${number}`, points: number * 3 };
  }),
  { name: "25", points: 25 },
  ...Array.from({ length: 20 }, (_, index) => {
    const number = 20 - index;
    return { name: `S${number}`, points: number };
  }),
  { name: "Miss", points: 0 },
];

const MAX_TOTAL = 180;
const canMake = Array.from({ length: 4 }, () => Array<boolean>(MAX_TOTAL + 1).fill(false));
canMake[0][0] = true;
for (let darts = 1; darts <= 3; darts += 1) {
  for (const segment of SCORING_SEGMENTS) {
    for (let total = segment.points; total <= 60 * darts; total += 1) {
      if (canMake[darts - 1][total - segment.points]) canMake[darts][total] = true;
    }
  }
}

export function botAim(level: BotLevel): number {
  return AIMS[level];
}

export function botHitChance(level: BotLevel): number {
  return HIT_CHANCES[level];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function drawScoringTotal(
  aim: number,
  overCeiling: boolean,
  darts: number,
  random: () => number,
): number {
  const mean = (overCeiling ? aim - 10 : aim) * (darts / 3);
  const cap = 60 * darts;
  if (random() < 0.02) return clamp(Math.floor(random() * 181), 0, cap);
  let sum = 0;
  for (let draw = 0; draw < 12; draw += 1) sum += random();
  return clamp(Math.round((sum - 6) * 36 * (darts / 3) + mean), 0, cap);
}

function aboveCeiling(level: BotLevel, pointsScored: number, dartsThrown: number): boolean {
  if (dartsThrown < 1) return false;
  return (pointsScored / dartsThrown) * 3 > botAim(level) + 10;
}

function segmentNumber(segmentName: string): number | null {
  const match = /^[TDS](\d{1,2})$/.exec(segmentName);
  return match ? Number(match[1]) : null;
}

function neighborNumbers(number: number): [number, number] {
  const index = WEDGES.indexOf(number);
  const previous = WEDGES[(index + WEDGES.length - 1) % WEDGES.length];
  const next = WEDGES[(index + 1) % WEDGES.length];
  return [previous, next];
}

function wedgeFromCentre(random: () => number): number {
  return 1 + Math.floor(random() * 20);
}

function missInnerSingle(random: () => number): string {
  return `S${wedgeFromCentre(random)}`;
}

/** A Bull miss stays on the outer bull or an inner single. */
function missBull(random: () => number): string {
  if (random() < 1 / 3) return "25";
  return missInnerSingle(random);
}

/** An outer-bull miss stays in the centre: Bull, 25, or an inner single. */
function missOuterBull(random: () => number): string {
  const draw = random();
  if (draw < 1 / 3) return "Bull";
  if (draw < 2 / 3) return "25";
  return missInnerSingle(random);
}

function missAimed(aimed: string, random: () => number): string {
  if (aimed === "Bull") return missBull(random);
  if (aimed === "25") return missOuterBull(random);
  const number = segmentNumber(aimed);
  if (number === null) return "Miss";
  const draw = random();
  if (draw < 0.5) return "Miss";
  if (draw < 0.8) return `S${number}`;
  const [previous, next] = neighborNumbers(number);
  const neighbor = random() < 0.5 ? previous : next;
  return draw < 0.9 ? `D${neighbor}` : `S${neighbor}`;
}

function rollSegment(level: BotLevel, aimed: string, random: () => number): string {
  if (random() < botHitChance(level)) return aimed;
  return missAimed(aimed, random);
}

function polar(radiusMm: number, degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: (radiusMm * Math.sin(radians)) / COORDS_NORM_RADIUS_MM,
    y: (radiusMm * Math.cos(radians)) / COORDS_NORM_RADIUS_MM,
  };
}

function place(segmentName: string): BotDart {
  if (segmentName === "Bull") return { segmentName, coordsX: 0, coordsY: 0 };
  if (segmentName === "25") {
    const point = polar((RADII.ib + RADII.ob) / 2, 0);
    return { segmentName, coordsX: point.x, coordsY: point.y };
  }
  if (segmentName === "Miss") {
    const point = polar((RADII.do + RADII.out) / 2, 0);
    return { segmentName, coordsX: point.x, coordsY: point.y };
  }
  const kind = segmentName[0];
  const number = segmentNumber(segmentName) ?? 20;
  const radiusMm =
    kind === "T" ? (RADII.ti + RADII.to) / 2 : kind === "D" ? (RADII.di + RADII.do) / 2 : (RADII.ob + RADII.ti) / 2;
  const index = Math.max(0, WEDGES.indexOf(number));
  const point = polar(radiusMm, index * 18);
  return { segmentName, coordsX: point.x, coordsY: point.y };
}

function splitTotal(total: number, darts: number): string[] {
  let target = Math.min(Math.max(total, 0), 60 * darts);
  while (target > 0 && !canMake[darts][target]) target -= 1;
  const names: string[] = [];
  let left = target;
  let slots = darts;
  while (slots > 0) {
    const segment =
      SCORING_SEGMENTS.find((item) => item.points <= left && canMake[slots - 1][left - item.points]) ??
      SCORING_SEGMENTS[SCORING_SEGMENTS.length - 1];
    names.push(segment.name);
    left -= segment.points;
    slots -= 1;
  }
  return names;
}

function settle(remaining: number, segmentName: string): { remaining: number; bust: boolean; checkout: boolean } {
  const scored = scoreSegment(segmentName);
  const next = remaining - scored.points;
  if (next < 0 || next === 1 || (next === 0 && !scored.double)) {
    return { remaining: next, bust: true, checkout: false };
  }
  if (next === 0 && scored.double) return { remaining: 0, bust: false, checkout: true };
  return { remaining: next, bust: false, checkout: false };
}

export function planBotTurn(input: {
  level: BotLevel;
  remaining: number;
  pointsScored: number;
  dartsThrown: number;
  random: () => number;
}): BotTurnPlan {
  const darts: BotDart[] = [];
  let remaining = input.remaining;
  let slots = 3;
  let bust = false;
  let checkout = false;
  const overCeiling = aboveCeiling(input.level, input.pointsScored, input.dartsThrown);

  while (slots > 0 && !bust && !checkout) {
    if (cannotCheckout(remaining, slots)) {
      const total = drawScoringTotal(botAim(input.level), overCeiling, slots, input.random);
      for (const name of splitTotal(total, slots)) {
        darts.push(place(name));
        const step = settle(remaining, name);
        remaining = step.remaining;
        slots -= 1;
        bust = step.bust;
        checkout = step.checkout;
        if (bust || checkout) break;
      }
      break;
    }

    const aimed = checkoutRoute(remaining, slots)[0];
    if (!aimed) break;
    const name = rollSegment(input.level, aimed, input.random);
    darts.push(place(name));
    const step = settle(remaining, name);
    remaining = step.remaining;
    slots -= 1;
    bust = step.bust;
    checkout = step.checkout;
  }

  return { darts, bust, checkout };
}

export function planBotBull(input: { level: BotLevel; random: () => number }): BotDart {
  return place(rollSegment(input.level, "Bull", input.random));
}

export function botShowTimes(shownDarts: number): { showAtMs: number[]; takeoutAtMs: number } {
  const slot = 10000 / 3;
  const showAtMs = Array.from({ length: shownDarts }, (_, index) => (index === 2 ? 10000 : slot * (index + 1)));
  return { showAtMs, takeoutAtMs: showAtMs[showAtMs.length - 1] ?? 0 };
}
