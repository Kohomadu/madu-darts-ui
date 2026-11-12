import { newThrownDarts } from "../game/sessionDarts";
import { DEFAULT_PROFILE_NAME } from "./profile";

export const PROFILE_DARTS_KEY = "madu.profile.dartsThrown";

export type DartWatch = {
  /** Hits already on the strip the last time it was seen. Null until the first strip. */
  seen: number | null;
};

type Ledger = Record<string, number>;

function profileKey(name: string): string {
  const trimmed = name.trim();
  return trimmed || DEFAULT_PROFILE_NAME;
}

function readLedger(storage: Pick<Storage, "getItem">): Ledger {
  try {
    const raw = storage.getItem(PROFILE_DARTS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const ledger: Ledger = {};
    for (const [name, count] of Object.entries(parsed)) {
      if (typeof count !== "number" || !Number.isFinite(count) || count < 0) continue;
      ledger[name] = Math.floor(count);
    }
    return ledger;
  } catch {
    return {};
  }
}

/** Darts this profile has thrown in Play and Practice on this device. */
export function readProfileDartsThrown(storage: Pick<Storage, "getItem">, profileName: string): number {
  return readLedger(storage)[profileKey(profileName)] ?? 0;
}

/** Add darts that just landed. Zero and negative amounts leave the total unchanged. */
export function addProfileDartsThrown(
  storage: Pick<Storage, "getItem" | "setItem">,
  profileName: string,
  darts: number,
): number {
  const current = readProfileDartsThrown(storage, profileName);
  if (!Number.isFinite(darts) || darts <= 0) return current;
  const next = current + Math.floor(darts);
  const ledger = readLedger(storage);
  ledger[profileKey(profileName)] = next;
  try {
    storage.setItem(PROFILE_DARTS_KEY, JSON.stringify(ledger));
  } catch {
    // Private mode can reject storage. The caller still has the in-memory total.
  }
  return next;
}

/**
 * How many of these strip hits are new throws for the profile.
 * The first strip only marks darts already showing.
 * Undo and Next score move that mark without adding.
 * A shorter strip does not subtract — a thrown dart stays counted.
 */
export function observeThrownDarts(
  watch: DartWatch,
  input: { hits: number; replay: boolean; yours: boolean },
): number {
  const hits = Math.max(0, Math.floor(input.hits));
  if (watch.seen == null) {
    watch.seen = hits;
    return 0;
  }
  if (input.replay || !input.yours) {
    watch.seen = hits;
    return 0;
  }
  const added = newThrownDarts(watch.seen, hits);
  watch.seen = hits;
  return added;
}
