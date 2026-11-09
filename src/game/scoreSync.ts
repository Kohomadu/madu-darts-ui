/** Bookkeeping for when a strip snapshot is allowed to change the 101 score. */
export type ScoreSync = {
  paused: boolean;
  skipping: boolean;
  force: boolean;
  lastKey: string | null;
};

export type ScoreSyncDecision = {
  /** Apply this strip to the current attempt. */
  apply: boolean;
  /** Next score or Abort just replaced the attempt, so this strip is not a takeout of the old one. */
  skipped: boolean;
  sync: ScoreSync;
};

/**
 * A pause holds the scorebook and must not mark the strip as already scored.
 * Next score sets `force` so the strip is scored against the new target even
 * when Autodarts has not emitted a new snapshot.
 */
export function decideScoreSync(sync: ScoreSync, key: string): ScoreSyncDecision {
  if (sync.paused && !sync.skipping) {
    return { apply: false, skipped: false, sync };
  }
  const skipped = sync.skipping;
  const cleared: ScoreSync = {
    paused: false,
    skipping: false,
    force: false,
    lastKey: sync.lastKey,
  };
  if (!sync.force && sync.lastKey === key) {
    return { apply: false, skipped: false, sync: cleared };
  }
  return {
    apply: true,
    skipped,
    sync: { ...cleared, lastKey: key },
  };
}
