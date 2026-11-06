import { useEffect, useRef, useState } from "react";
import type { PracticeView } from "../autodarts/view";
import {
  ACCURACY_STORAGE_KEY,
  accuracyPercent,
  emptyLedger,
  reduceAccuracy,
  type AccuracyLedger,
  type TrackedHit,
} from "./ledger";

function isTracked(value: unknown): value is TrackedHit {
  if (!value || typeof value !== "object") return false;
  const hit = value as TrackedHit;
  return typeof hit.segmentName === "string" && typeof hit.overridden === "boolean";
}

export function loadLedger(): AccuracyLedger {
  try {
    const raw = localStorage.getItem(ACCURACY_STORAGE_KEY);
    if (!raw) return emptyLedger();
    const data = JSON.parse(raw) as Partial<AccuracyLedger>;
    const unchanged = typeof data.unchanged === "number" && data.unchanged >= 0 ? data.unchanged : 0;
    const total = typeof data.total === "number" && data.total >= unchanged ? data.total : unchanged;
    const open = Array.isArray(data.open) ? data.open.filter(isTracked) : [];
    return { unchanged, total, open };
  } catch {
    return emptyLedger();
  }
}

function persist(ledger: AccuracyLedger) {
  localStorage.setItem(ACCURACY_STORAGE_KEY, JSON.stringify(ledger));
}

function viewKey(view: PracticeView): string {
  const hits = view.hits.map((hit) => `${hit.segmentName}:${hit.coordsX}:${hit.coordsY}`).join("|");
  return `${view.phase}~${view.status}~${view.event}~${hits}`;
}

export function useAccuracy(view: PracticeView) {
  const [ledger, setLedger] = useState<AccuracyLedger>(loadLedger);
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    const key = viewKey(view);
    if (lastKey.current === key) return;
    lastKey.current = key;
    const connected = view.phase === "live" || view.phase === "polling";
    setLedger((current) => {
      const next = reduceAccuracy(current, {
        type: "snapshot",
        connected,
        snapshot: { status: view.status, event: view.event, hits: view.hits },
      });
      persist(next);
      return next;
    });
  }, [view]);

  return {
    percent: accuracyPercent(ledger),
    unchanged: ledger.unchanged,
    total: ledger.total,
    markOverridden(index: number) {
      setLedger((current) => {
        const next = reduceAccuracy(current, { type: "override", index });
        persist(next);
        return next;
      });
    },
    reset() {
      setLedger((current) => {
        const next = reduceAccuracy(current, { type: "reset" });
        persist(next);
        return next;
      });
    },
  };
}
