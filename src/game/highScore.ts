import type { TrainingGameId } from "./rules";

/** Best result saved on this device for one Training Game. */
export type HighScoreRecord = {
  score: number;
  darts: number;
  at: number;
};

export function highScoreKey(game: TrainingGameId): string {
  return `madu.highScore.${game}`;
}

export function readHighScore(storage: Pick<Storage, "getItem">, game: TrainingGameId): HighScoreRecord | null {
  try {
    const raw = storage.getItem(highScoreKey(game));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HighScoreRecord>;
    if (typeof parsed.score !== "number" || typeof parsed.darts !== "number" || typeof parsed.at !== "number") return null;
    return { score: parsed.score, darts: parsed.darts, at: parsed.at };
  } catch {
    return null;
  }
}

export function writeHighScore(storage: Pick<Storage, "setItem">, game: TrainingGameId, record: HighScoreRecord): void {
  try {
    storage.setItem(highScoreKey(game), JSON.stringify(record));
  } catch {
    // Private mode can reject storage. The in-memory record still applies.
  }
}

/** Keep the saved record unless the new score is higher. */
export function beatHighScore(
  current: HighScoreRecord | null,
  score: number,
  darts: number,
  at: number,
): HighScoreRecord | null {
  if (darts < 1) return current;
  if (current && score <= current.score) return current;
  return { score, darts, at };
}

export function formatHighScore(record: HighScoreRecord | null): string {
  if (!record) return "High Score —";
  const when = new Date(record.at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const darts = `${record.darts} ${record.darts === 1 ? "dart" : "darts"}`;
  return `High Score ${record.score} · ${darts} · ${when}`;
}
