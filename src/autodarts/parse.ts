/** One stuck dart from an Autodarts `throws[]` element. UI language: Hit. */
export type Hit = {
  segmentName: string;
  segmentNumber: number | null;
  multiplier: number | null;
  bed: string | null;
  coordsX: number | null;
  coordsY: number | null;
};

/** One `/api/state` (or WS `state`) snapshot. `throws` omitted means the Turn is empty. */
export type BoardSnapshot = {
  status: string;
  event: string;
  running: boolean | null;
  hits: Hit[];
};

const MAX_HITS = 3;

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseThrow(raw: unknown): Hit | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;

  let segmentName = str(t.segmentName);
  let segmentNumber = num(t.segmentNumber);
  let multiplier = num(t.multiplier);
  let bed = str(t.bed);
  let coordsX = num(t.coordsX);
  let coordsY = num(t.coordsY);

  if (t.segment && typeof t.segment === "object") {
    const segment = t.segment as Record<string, unknown>;
    segmentName = segmentName ?? str(segment.name);
    segmentNumber = segmentNumber ?? num(segment.number);
    multiplier = multiplier ?? num(segment.multiplier);
    bed = bed ?? str(segment.bed);
  }
  if (t.coords && typeof t.coords === "object") {
    const coords = t.coords as Record<string, unknown>;
    coordsX = coordsX ?? num(coords.x);
    coordsY = coordsY ?? num(coords.y);
  }

  if (!segmentName) return null;
  return { segmentName, segmentNumber, multiplier, bed, coordsX, coordsY };
}

/**
 * Autodarts 2.1 flat throws, and the older nested `{coords, segment}` shape.
 * Returns null when the payload is not a state snapshot (motion frames, junk).
 * A snapshot with no usable Segment names yields an empty Hit list — never a guessed Hit.
 */
export function parseState(data: unknown): BoardSnapshot | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const looksLikeState = "status" in o || "event" in o || "throws" in o;
  if (!looksLikeState) return null;

  const throws = Array.isArray(o.throws) ? o.throws : [];
  const hits: Hit[] = [];
  for (const raw of throws) {
    if (hits.length >= MAX_HITS) break;
    const hit = parseThrow(raw);
    if (hit) hits.push(hit);
  }

  return {
    status: str(o.status) ?? "",
    event: str(o.event) ?? "",
    running: typeof o.running === "boolean" ? o.running : null,
    hits,
  };
}

/** WS frames are `{type:"state", data}` or a bare state object. Other types are ignored. */
export function parseWsMessage(data: unknown): BoardSnapshot | null {
  if (!data || typeof data !== "object") return null;
  const message = data as Record<string, unknown>;
  if ("type" in message) {
    if (message.type !== "state") return null;
    return parseState(message.data);
  }
  return parseState(message);
}
