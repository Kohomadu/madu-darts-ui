import { botShowTimes, planBotBull, planBotTurn } from "../bot";
import type { DartSnap } from "../game/rules";
import type { MatchState } from "./types";

export function isBotThrowing(state: MatchState): boolean {
  if (state.setup.opponentKind !== "bot") return false;
  if (state.phase === "leg") return state.leg?.thrower === "opponent";
  if (state.phase === "bull-off") return state.bullOff?.thrower === "opponent";
  return false;
}

/** Stable while one bot visit is in progress. Changes when the next visit begins. */
export function botTurnKey(state: MatchState): string {
  if (!isBotThrowing(state)) return "idle";
  if (state.phase === "bull-off" && state.bullOff) {
    return `bull:${state.bullOff.order.join("-")}:${state.bullOff.youDart ? "y" : "n"}:${state.bullOff.opponentDart ? "o" : "n"}`;
  }
  if (state.phase === "leg" && state.leg) {
    const sets = `${state.scores.sets.you}-${state.scores.sets.opponent}`;
    const legs = `${state.scores.legs.you}-${state.scores.legs.opponent}`;
    return `leg:${sets}:${legs}:${state.opponent.dartsThrown}:${state.leg.turnStartRemaining}`;
  }
  return "idle";
}

export type PlannedBotVisit = {
  darts: DartSnap[];
  bust: boolean;
  checkout: boolean;
  showAtMs: number[];
  takeoutAtMs: number;
};

export function planCurrentBotVisit(state: MatchState, random: () => number): PlannedBotVisit | null {
  if (!isBotThrowing(state)) return null;
  const level = state.setup.botLevel;
  if (state.phase === "bull-off") {
    const dart = planBotBull({ level, random });
    const times = botShowTimes(1);
    return {
      darts: [dart],
      bust: false,
      checkout: false,
      showAtMs: times.showAtMs,
      takeoutAtMs: times.takeoutAtMs,
    };
  }
  const leg = state.leg;
  if (!leg || leg.thrower !== "opponent") return null;
  const plan = planBotTurn({
    level,
    remaining: leg.turnStartRemaining,
    pointsScored: state.opponent.pointsScored,
    dartsThrown: state.opponent.dartsThrown,
    random,
  });
  if (plan.darts.length === 0) return null;
  const times = botShowTimes(plan.darts.length);
  return {
    darts: plan.darts,
    bust: plan.bust,
    checkout: plan.checkout,
    showAtMs: times.showAtMs,
    takeoutAtMs: times.takeoutAtMs,
  };
}

/** How many planned darts are on the board at this elapsed time. */
export function dartsRevealed(showAtMs: number[], elapsedMs: number): number {
  return showAtMs.filter((ms) => elapsedMs >= ms).length;
}
