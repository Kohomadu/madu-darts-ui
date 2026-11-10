import {
  checkoutPercent,
  first9Display,
  matchAverage,
} from "./stats";
import type { PlayerTotals } from "./types";

export function formatAverage(value: number | null): string {
  if (value == null) return "—";
  return value.toFixed(1);
}

export function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value)}%`;
}

export function formatFirst9(totals: PlayerTotals): string {
  const shown = first9Display(totals);
  if (!shown) return "—";
  if (shown.kind === "darts") return `${shown.value} darts`;
  return formatAverage(shown.value);
}

export function playerStatLine(totals: PlayerTotals): {
  average: string;
  first9: string;
  checkout: string;
} {
  return {
    average: formatAverage(matchAverage(totals)),
    first9: formatFirst9(totals),
    checkout: formatPercent(checkoutPercent(totals)),
  };
}
