import type { Hit } from "../autodarts/parse";

/** One Hit still on the open Turn, plus whether the player Manual-Overrode it. */
export type TrackedHit = {
  segmentName: string;
  coordsX: number | null;
  coordsY: number | null;
  overridden: boolean;
};

export type AccuracyLedger = {
  unchanged: number;
  total: number;
  open: TrackedHit[];
};

export type AccuracySnapshot = {
  status: string;
  event: string;
  hits: Hit[];
};

export type AccuracyEvent =
  | { type: "snapshot"; snapshot: AccuracySnapshot; connected: boolean }
  | { type: "override"; index: number }
  | { type: "reset" };

export const ACCURACY_STORAGE_KEY = "madu.detectionAccuracy";

export function emptyLedger(): AccuracyLedger {
  return { unchanged: 0, total: 0, open: [] };
}

/** Whole percent. Null until at least one Hit has been finalized. */
export function accuracyPercent(ledger: AccuracyLedger): number | null {
  if (ledger.total <= 0) return null;
  return Math.round((ledger.unchanged / ledger.total) * 100);
}

function takeoutSignal(snapshot: AccuracySnapshot): boolean {
  const event = snapshot.event.toLowerCase().replace(/\s+/g, "");
  const status = snapshot.status.toLowerCase().replace(/\s+/g, "");
  return event.includes("takeout") || status === "takeout" || status === "takeoutinprogress";
}

function samePlace(tracked: TrackedHit, hit: Hit): boolean {
  if (tracked.coordsX === null || tracked.coordsY === null) return false;
  if (hit.coordsX === null || hit.coordsY === null) return false;
  return Math.abs(tracked.coordsX - hit.coordsX) < 1e-3 && Math.abs(tracked.coordsY - hit.coordsY) < 1e-3;
}

function fromHit(hit: Hit, overridden: boolean): TrackedHit {
  return {
    segmentName: hit.segmentName,
    coordsX: hit.coordsX,
    coordsY: hit.coordsY,
    overridden,
  };
}

/**
 * Carry override marks onto the new strip.
 * Same coordinates match a dart that stayed put (including after a bounce-out shifts indexes).
 * A same-length strip that only changed coordinates keeps the mark at that index — that is a Manual Override.
 */
export function reconcileOpen(open: TrackedHit[], hits: Hit[]): TrackedHit[] {
  const used = new Set<number>();
  const paired: Array<TrackedHit | null> = hits.map((hit) => {
    const found = open.findIndex((prev, index) => !used.has(index) && samePlace(prev, hit));
    if (found < 0) return null;
    used.add(found);
    return fromHit(hit, open[found].overridden);
  });

  hits.forEach((hit, index) => {
    if (paired[index]) return;
    const keepMark = open.length === hits.length && open[index]?.overridden === true;
    paired[index] = fromHit(hit, keepMark);
  });

  return paired as TrackedHit[];
}

function seal(ledger: AccuracyLedger): AccuracyLedger {
  let unchanged = ledger.unchanged;
  for (const hit of ledger.open) {
    if (!hit.overridden) unchanged += 1;
  }
  return { unchanged, total: ledger.total + ledger.open.length, open: [] };
}

export function reduceAccuracy(ledger: AccuracyLedger, event: AccuracyEvent): AccuracyLedger {
  switch (event.type) {
    case "reset":
      return { unchanged: 0, total: 0, open: ledger.open };
    case "override": {
      if (event.index < 0 || event.index >= ledger.open.length) return ledger;
      return {
        ...ledger,
        open: ledger.open.map((hit, index) => (index === event.index ? { ...hit, overridden: true } : hit)),
      };
    }
    case "snapshot": {
      if (!event.connected) return ledger;
      if (event.snapshot.hits.length === 0) {
        if (ledger.open.length === 0) return ledger;
        return takeoutSignal(event.snapshot) ? seal(ledger) : { ...ledger, open: [] };
      }
      return { ...ledger, open: reconcileOpen(ledger.open, event.snapshot.hits) };
    }
  }
}
