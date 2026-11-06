import { canonicalSegment } from "./segment";

export type OverrideBody = { segmentName: string } | { xMm: number; yMm: number };

export function overridePath(index: number): string {
  return `/api/state/hits/${index}`;
}

export function segmentOverride(input: string): { segmentName: string } | null {
  const segmentName = canonicalSegment(input);
  return segmentName ? { segmentName } : null;
}

/** Write the correction to Autodarts. Returns the response body when it is JSON. */
export async function sendOverride(index: number, body: OverrideBody): Promise<unknown> {
  const res = await fetch(overridePath(index), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      res.status === 404 || res.status === 405
        ? "Autodarts did not accept the Manual Override"
        : `Autodarts returned ${res.status}`,
    );
  }
  return res.json().catch(() => null);
}
