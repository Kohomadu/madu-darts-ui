import { DEFAULT_LEGS_BEST_OF, type BestOf, BEST_OF_CHOICES } from "./format";
import type { BotLevel, MatchSetup } from "./types";

export const MATCH_SETUP_KEY = "madu.match.setup";

export const DEFAULT_MATCH_SETUP: MatchSetup = {
  legsBestOf: DEFAULT_LEGS_BEST_OF,
  setsEnabled: false,
  starter: "bull-off",
  opponentName: "Guest",
  opponentKind: "human",
  botLevel: 4,
};

function isBestOf(value: unknown): value is BestOf {
  return typeof value === "number" && (BEST_OF_CHOICES as number[]).includes(value);
}

function isBotLevel(value: unknown): value is BotLevel {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 8;
}

export function readMatchSetup(storage: Pick<Storage, "getItem">): MatchSetup {
  try {
    const raw = storage.getItem(MATCH_SETUP_KEY);
    if (!raw) return { ...DEFAULT_MATCH_SETUP };
    const parsed = JSON.parse(raw) as Partial<MatchSetup>;
    return {
      legsBestOf: isBestOf(parsed.legsBestOf) ? parsed.legsBestOf : DEFAULT_MATCH_SETUP.legsBestOf,
      setsEnabled: Boolean(parsed.setsEnabled),
      starter:
        parsed.starter === "you" || parsed.starter === "opponent" || parsed.starter === "bull-off"
          ? parsed.starter
          : DEFAULT_MATCH_SETUP.starter,
      opponentName:
        typeof parsed.opponentName === "string" && parsed.opponentName.trim()
          ? parsed.opponentName.trim()
          : DEFAULT_MATCH_SETUP.opponentName,
      opponentKind: parsed.opponentKind === "bot" ? "bot" : "human",
      botLevel: isBotLevel(parsed.botLevel) ? parsed.botLevel : DEFAULT_MATCH_SETUP.botLevel,
    };
  } catch {
    return { ...DEFAULT_MATCH_SETUP };
  }
}

export function writeMatchSetup(storage: Pick<Storage, "setItem">, setup: MatchSetup): void {
  try {
    storage.setItem(MATCH_SETUP_KEY, JSON.stringify(setup));
  } catch {
    // Private mode can reject storage.
  }
}

/** UI 02 starts when the opponent seat is a typed human name. */
export function canStartHumanMatch(setup: MatchSetup): boolean {
  return setup.opponentKind === "human" && setup.opponentName.trim().length > 0;
}

/** A human name or the bot seat can start. */
export function canStartMatch(setup: MatchSetup): boolean {
  if (setup.opponentKind === "bot") return true;
  return canStartHumanMatch(setup);
}
