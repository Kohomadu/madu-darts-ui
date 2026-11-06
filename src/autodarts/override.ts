import type { Hit } from "./parse";
import { pointMmToHit } from "../board/geometry";
import { canonicalSegment } from "./segment";

export type OverrideBody = { segmentName: string } | { xMm: number; yMm: number };

export function segmentOverride(input: string): { segmentName: string } | null {
  const segmentName = canonicalSegment(input);
  return segmentName ? { segmentName } : null;
}

function hitFromSegmentName(segmentName: string, previous: Hit): Hit {
  if (segmentName === "Bull") {
    return {
      segmentName: "Bull",
      segmentNumber: 25,
      multiplier: 2,
      bed: "DoubleBull",
      coordsX: previous.coordsX,
      coordsY: previous.coordsY,
    };
  }
  if (segmentName === "25") {
    return {
      segmentName: "25",
      segmentNumber: 25,
      multiplier: 1,
      bed: "SingleBull",
      coordsX: previous.coordsX,
      coordsY: previous.coordsY,
    };
  }
  const match = /^([SDTM])(\d{1,2})$/.exec(segmentName);
  if (!match) {
    return { ...previous, segmentName };
  }
  const prefix = match[1];
  const number = Number(match[2]);
  const multiplier = prefix === "T" ? 3 : prefix === "D" ? 2 : prefix === "M" ? 0 : 1;
  const bed =
    prefix === "T" ? "Triple" : prefix === "D" ? "Double" : prefix === "M" ? "Outside" : "SingleInner";
  return {
    segmentName,
    segmentNumber: number,
    multiplier,
    bed,
    coordsX: previous.coordsX,
    coordsY: previous.coordsY,
  };
}

/** Resolve a Manual Override into a Hit without calling Autodarts. */
export function resolveLocalOverride(body: OverrideBody, previous: Hit): Hit | null {
  if ("segmentName" in body) {
    return hitFromSegmentName(body.segmentName, previous);
  }
  return pointMmToHit(body.xMm, body.yMm);
}
