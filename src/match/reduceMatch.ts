import { scoreAttempt, type DartSnap } from "../game/rules";
import { decideBullOff } from "./bullOff";
import { firstTo, MATCH_START, SET_LEGS_BEST_OF, SETS_BEST_OF } from "./format";
import { applySealedTurn, emptyTotals } from "./stats";
import type {
  BullOffState,
  LegState,
  MatchSetup,
  MatchState,
  PlayerTotals,
  SeatId,
  SealedTurn,
} from "./types";

function other(seat: SeatId): SeatId {
  return seat === "you" ? "opponent" : "you";
}

function stripKey(hits: DartSnap[]): string {
  return hits.map((hit) => `${hit.segmentName}:${hit.coordsX}:${hit.coordsY}`).join("|");
}

function cloneDarts(darts: DartSnap[]): DartSnap[] {
  return darts.map((dart) => ({ ...dart }));
}

function cloneState(state: MatchState): MatchState {
  return JSON.parse(JSON.stringify(state)) as MatchState;
}

function emptyScores() {
  return { legs: { you: 0, opponent: 0 }, sets: { you: 0, opponent: 0 } };
}

function openLeg(starter: SeatId): LegState {
  return {
    remaining: { you: MATCH_START, opponent: MATCH_START },
    thrower: starter,
    legStarter: starter,
    turnStartRemaining: MATCH_START,
    live: [],
    bustKey: null,
    first9Used: { you: 0, opponent: 0 },
  };
}

function openBullOff(): BullOffState {
  return {
    thrower: "you",
    order: ["you", "opponent"],
    youDart: null,
    opponentDart: null,
  };
}

export function startMatch(setup: MatchSetup, youName: string): MatchState {
  return {
    phase: setup.starter === "bull-off" ? "bull-off" : "leg",
    setup: { ...setup },
    youName,
    scores: emptyScores(),
    you: emptyTotals(),
    opponent: emptyTotals(),
    bullOff: setup.starter === "bull-off" ? openBullOff() : null,
    leg: setup.starter === "bull-off" ? null : openLeg(setup.starter),
    results: null,
    sealed: null,
  };
}

function legsNeeded(state: MatchState): number {
  return firstTo(state.setup.setsEnabled ? SET_LEGS_BEST_OF : state.setup.legsBestOf);
}

function setsNeeded(): number {
  return firstTo(SETS_BEST_OF);
}

function totalsFor(state: MatchState, seat: SeatId): PlayerTotals {
  return seat === "you" ? state.you : state.opponent;
}

function withTotals(state: MatchState, seat: SeatId, totals: PlayerTotals): MatchState {
  return seat === "you" ? { ...state, you: totals } : { ...state, opponent: totals };
}

function finishMatch(state: MatchState, winner: SeatId): MatchState {
  return {
    ...state,
    phase: "results",
    leg: null,
    bullOff: null,
    sealed: null,
    results: {
      winner,
      youName: state.youName,
      opponentName: state.setup.opponentName,
      scores: {
        legs: { ...state.scores.legs },
        sets: { ...state.scores.sets },
      },
      you: { ...state.you },
      opponent: { ...state.opponent },
    },
  };
}

function afterLegWin(state: MatchState, winner: SeatId): MatchState {
  const legs = { ...state.scores.legs, [winner]: state.scores.legs[winner] + 1 };
  let scores = { ...state.scores, legs };
  const needLegs = legsNeeded(state);

  if (legs[winner] < needLegs) {
    return {
      ...state,
      scores,
      sealed: state.sealed,
      leg: openLeg(other(state.leg!.legStarter)),
    };
  }

  if (!state.setup.setsEnabled) {
    return finishMatch({ ...state, scores }, winner);
  }

  const sets = { ...scores.sets, [winner]: scores.sets[winner] + 1 };
  scores = { legs: { you: 0, opponent: 0 }, sets };
  if (sets[winner] >= setsNeeded()) {
    return finishMatch({ ...state, scores }, winner);
  }

  return {
    ...state,
    scores,
    sealed: state.sealed,
    leg: openLeg(other(state.leg!.legStarter)),
  };
}

function scoreTurnPoints(turnStart: number, darts: DartSnap[], outcome: "open" | "bust" | "checkout"): number {
  if (outcome === "bust") return 0;
  const scored = scoreAttempt(turnStart, darts);
  if (scored.kind === "bust") return 0;
  if (scored.kind === "open") return turnStart - scored.remaining;
  let points = 0;
  let remaining = turnStart;
  for (const dart of darts) {
    const one = scoreAttempt(remaining, [dart]);
    if (one.kind === "checkout") {
      points += remaining;
      break;
    }
    if (one.kind === "open") {
      points += remaining - one.remaining;
      remaining = one.remaining;
    }
  }
  return points;
}

function sealTurn(state: MatchState, hits: DartSnap[]): MatchState {
  const leg = state.leg;
  if (!leg || state.phase !== "leg") return state;
  const seat = leg.thrower;
  const before = cloneState({
    ...state,
    sealed: null,
    leg: {
      ...leg,
      live: [],
      bustKey: null,
      remaining: { ...leg.remaining, [seat]: leg.turnStartRemaining },
    },
  });
  const attempt = scoreAttempt(leg.turnStartRemaining, hits);
  const outcome = attempt.kind;
  const points = scoreTurnPoints(leg.turnStartRemaining, hits, outcome);
  const dartsThrown = outcome === "bust" ? 3 : Math.max(1, hits.length);
  const first9Left = Math.max(0, 9 - leg.first9Used[seat]);
  const nextTotals = applySealedTurn(totalsFor(state, seat), {
    turnStartRemaining: leg.turnStartRemaining,
    darts: hits,
    outcome,
    points,
    dartsThrown,
    first9DartsLeft: first9Left,
  });
  const sealed: SealedTurn = { before, hits: cloneDarts(hits), seat };
  const first9Used = {
    ...leg.first9Used,
    [seat]: leg.first9Used[seat] + Math.min(first9Left, dartsThrown),
  };
  const nextRemaining = { ...leg.remaining };
  if (outcome === "checkout") {
    nextRemaining[seat] = 0;
  } else if (outcome === "open") {
    nextRemaining[seat] = attempt.remaining;
  } else {
    nextRemaining[seat] = leg.turnStartRemaining;
  }

  const withStats = withTotals(state, seat, nextTotals);
  if (outcome === "checkout") {
    return afterLegWin(
      {
        ...withStats,
        sealed,
        leg: { ...leg, live: [], bustKey: null, remaining: nextRemaining, first9Used },
      },
      seat,
    );
  }

  const nextThrower = other(seat);
  return {
    ...withStats,
    sealed,
    leg: {
      ...leg,
      live: [],
      bustKey: null,
      remaining: nextRemaining,
      thrower: nextThrower,
      turnStartRemaining: nextRemaining[nextThrower],
      first9Used,
    },
  };
}

function applyLiveStrip(state: MatchState, hits: DartSnap[], connected: boolean): MatchState {
  if (!connected || !state.leg || state.phase !== "leg") return state;
  const leg = state.leg;
  const seat = leg.thrower;
  if (hits.length === 0) {
    return { ...state, leg: { ...leg, live: [], bustKey: null } };
  }

  const key = stripKey(hits);
  if (leg.bustKey && leg.bustKey === key) {
    return { ...state, leg: { ...leg, live: cloneDarts(hits) } };
  }

  const attempt = scoreAttempt(leg.turnStartRemaining, hits);
  if (attempt.kind === "bust") {
    return {
      ...state,
      leg: {
        ...leg,
        live: cloneDarts(hits),
        bustKey: key,
        remaining: { ...leg.remaining, [seat]: leg.turnStartRemaining },
      },
    };
  }

  const remaining = attempt.kind === "checkout" ? 0 : attempt.remaining;
  return {
    ...state,
    leg: {
      ...leg,
      live: cloneDarts(hits),
      bustKey: null,
      remaining: { ...leg.remaining, [seat]: remaining },
    },
  };
}

function bullDartFor(bull: BullOffState, seat: SeatId): DartSnap | null {
  return seat === "you" ? bull.youDart : bull.opponentDart;
}

function withBullDart(bull: BullOffState, seat: SeatId, dart: DartSnap): BullOffState {
  return seat === "you"
    ? { ...bull, youDart: { ...dart } }
    : { ...bull, opponentDart: { ...dart } };
}

/** Record the bull dart on takeout so the open strip cannot double-count. */
function sealBullOff(state: MatchState, hits: DartSnap[]): MatchState {
  if (!state.bullOff || state.phase !== "bull-off") return state;
  const bull = state.bullOff;
  if (hits.length === 0) return state;
  const dart = hits[hits.length - 1];
  if (!dart) return state;
  if (bullDartFor(bull, bull.thrower)) return state;

  const recorded = withBullDart(bull, bull.thrower, dart);
  const youDart = recorded.youDart;
  const opponentDart = recorded.opponentDart;
  if (youDart && opponentDart) {
    const decision = decideBullOff(youDart, opponentDart, recorded.order);
    if (decision.kind === "winner") {
      return {
        ...state,
        phase: "leg",
        bullOff: null,
        sealed: null,
        leg: openLeg(decision.starter),
      };
    }
    return {
      ...state,
      bullOff: {
        thrower: decision.nextOrder[0],
        order: decision.nextOrder,
        youDart: null,
        opponentDart: null,
      },
    };
  }

  return {
    ...state,
    bullOff: { ...recorded, thrower: other(bull.thrower) },
  };
}

export type MatchEvent =
  | { type: "strip"; hits: DartSnap[]; connected: boolean }
  | { type: "seal"; hits: DartSnap[] }
  | { type: "undo" };

export function reduceMatch(state: MatchState, event: MatchEvent): MatchState {
  if (event.type === "undo") {
    if (!state.sealed) return state;
    return cloneState(state.sealed.before);
  }

  if (event.type === "seal") {
    if (state.phase === "leg") return sealTurn(state, event.hits);
    if (state.phase === "bull-off") return sealBullOff(state, event.hits);
    return state;
  }

  if (event.type === "strip") {
    if (state.phase === "leg") return applyLiveStrip(state, event.hits, event.connected);
  }

  return state;
}

export function rematchFrom(state: MatchState): MatchState {
  return startMatch(state.setup, state.youName);
}

export function projectMatch(state: MatchState) {
  const thrower =
    state.phase === "bull-off"
      ? state.bullOff?.thrower ?? null
      : state.phase === "leg"
        ? state.leg?.thrower ?? null
        : null;
  const remaining = state.leg?.remaining ?? { you: MATCH_START, opponent: MATCH_START };
  const busted = Boolean(state.leg?.bustKey);
  return {
    phase: state.phase,
    thrower,
    remaining,
    busted,
    scores: state.scores,
    you: state.you,
    opponent: state.opponent,
    results: state.results,
    live: state.leg?.live ?? [],
    bullOff: state.bullOff,
  };
}
