export type ShellPresence = "takeout" | "throw";

function normalized(status: string): string {
  return status.toLowerCase().replace(/\s+/g, "");
}

/** Live board chrome. Status wins over a leftover takeout event. */
export function shellPresence(status: string): ShellPresence | null {
  const value = normalized(status);
  if (value === "takeout" || value === "takeoutinprogress") return "takeout";
  if (value === "throw") return "throw";
  return null;
}

export function presenceLabel(presence: ShellPresence): string {
  return presence === "takeout" ? "Take out" : "Throw";
}

/**
 * One line when takeout looks wrong: 0–1 Hits, or a busted 101 attempt.
 * Undo is named only when that Turn can be restored.
 */
export function recoveryCopy(input: {
  presence: ShellPresence | null;
  hitCount: number;
  busted: boolean;
  canUndo: boolean;
}): string | null {
  if (input.presence !== "takeout") return null;
  if (input.hitCount > 1 && !input.busted) return null;
  if (input.canUndo) return "Takeout looks wrong. Reset board, or Undo the last Turn.";
  return "Takeout looks wrong. Reset board to clear it.";
}
