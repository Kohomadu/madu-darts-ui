import type { DartSnap } from "../game/rules";
import type { BestOf } from "./format";

export type SeatId = "you" | "opponent";

export type BotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type MatchSetup = {
  legsBestOf: BestOf;
  setsEnabled: boolean;
  starter: "you" | "opponent" | "bull-off";
  opponentName: string;
  opponentKind: "human" | "bot";
  botLevel: BotLevel;
};

export type PlayerTotals = {
  pointsScored: number;
  dartsThrown: number;
  first9Points: number;
  first9Darts: number;
  checkoutHits: number;
  checkoutAttempts: number;
  highestCheckout: number;
  bestTurn: number;
  tons: number;
  tons100: number;
  tons140: number;
  tons171: number;
};

export type BullOffState = {
  thrower: SeatId;
  order: [SeatId, SeatId];
  youDart: DartSnap | null;
  opponentDart: DartSnap | null;
};

export type LegState = {
  remaining: Record<SeatId, number>;
  thrower: SeatId;
  /** Who threw first in the current leg — next leg is the other seat. */
  legStarter: SeatId;
  turnStartRemaining: number;
  live: DartSnap[];
  bustKey: string | null;
  /** Darts already counted toward First 9 in this leg, per seat. */
  first9Used: Record<SeatId, number>;
};

export type MatchScores = {
  legs: Record<SeatId, number>;
  sets: Record<SeatId, number>;
};

export type ResultsSnapshot = {
  winner: SeatId;
  youName: string;
  opponentName: string;
  scores: MatchScores;
  you: PlayerTotals;
  opponent: PlayerTotals;
};

export type MatchPhase = "bull-off" | "leg" | "results";

export type MatchState = {
  phase: MatchPhase;
  setup: MatchSetup;
  youName: string;
  scores: MatchScores;
  you: PlayerTotals;
  opponent: PlayerTotals;
  bullOff: BullOffState | null;
  leg: LegState | null;
  results: ResultsSnapshot | null;
  /** Last sealed Turn, for Undo. */
  sealed: SealedTurn | null;
};

export type SealedTurn = {
  before: MatchState;
  hits: DartSnap[];
  seat: SeatId;
};
