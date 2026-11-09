/**
 * How many new Hits appeared on the strip.
 * Growing the strip counts thrown darts. Shrink, replace, or empty does not undo the total.
 */
export function newThrownDarts(previousCount: number, nextCount: number): number {
  if (nextCount <= previousCount) return 0;
  return nextCount - previousCount;
}
