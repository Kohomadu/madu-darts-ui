/** Canonical Autodarts segment label, or null when the text is not a Segment. */
export function canonicalSegment(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper === "BULL" || upper === "IB" || upper === "50") return "Bull";
  if (upper === "25" || upper === "OB") return "25";
  if (upper === "0" || upper === "MISS" || upper === "NONE") return "Miss";

  const match = /^([SDTM])(\d{1,2})$/.exec(upper);
  if (!match) return null;
  const number = Number(match[2]);
  if (number < 1 || number > 20) return null;
  return `${match[1]}${number}`;
}
