export type BestOf = 1 | 3 | 5 | 7 | 9 | 11 | 13 | 15;

export const BEST_OF_CHOICES: BestOf[] = [1, 3, 5, 7, 9, 11, 13, 15];

/** Best of N is first to (N + 1) / 2. */
export function firstTo(bestOf: BestOf): number {
  return (bestOf + 1) / 2;
}

export const MATCH_START = 501;
export const DEFAULT_LEGS_BEST_OF: BestOf = 5;
export const SETS_BEST_OF: BestOf = 3;
export const SET_LEGS_BEST_OF: BestOf = 5;
