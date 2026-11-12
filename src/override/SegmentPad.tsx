import { useMemo, useState } from "react";

export type Ring = "S" | "D" | "T";

export const PAD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

export type SegmentDraft =
  | { kind: "sector"; ring: Ring; number: number }
  | { kind: "bull"; segmentName: "Bull" | "25" }
  | { kind: "none" };

export function draftFromSegment(segmentName: string): {
  ring: Ring;
  number: number | null;
  bull: "Bull" | "25" | null;
  none: boolean;
} {
  const upper = segmentName.trim().toUpperCase();
  if (upper === "0" || upper === "MISS" || upper === "NONE" || /^M\d{1,2}$/.test(upper)) {
    return { ring: "S", number: null, bull: null, none: true };
  }
  if (upper === "BULL" || upper === "IB" || upper === "50") {
    return { ring: "S", number: null, bull: "Bull", none: false };
  }
  if (upper === "25" || upper === "OB") {
    return { ring: "S", number: null, bull: "25", none: false };
  }
  const match = /^([SDT])(\d{1,2})$/.exec(upper);
  if (match) {
    const number = Number(match[2]);
    if (number >= 1 && number <= 20) {
      return { ring: match[1] as Ring, number, bull: null, none: false };
    }
  }
  return { ring: "S", number: null, bull: null, none: false };
}

export function segmentNameFromDraft(draft: SegmentDraft): string {
  if (draft.kind === "none") return "Miss";
  if (draft.kind === "bull") return draft.segmentName;
  return `${draft.ring}${draft.number}`;
}

type SegmentPadProps = {
  hitIndex: number;
  initialSegment: string;
  onConfirm: (segmentName: string) => void;
  onCancel: () => void;
};

export function SegmentPad({ hitIndex, initialSegment, onConfirm, onCancel }: SegmentPadProps) {
  const initial = useMemo(() => draftFromSegment(initialSegment), [initialSegment]);
  const [ring, setRing] = useState<Ring>(initial.ring);
  const [number, setNumber] = useState<number | null>(initial.number);
  const [bull, setBull] = useState<"Bull" | "25" | null>(initial.bull);
  const [none, setNone] = useState(initial.none);

  const draft: SegmentDraft | null = none
    ? { kind: "none" }
    : bull
      ? { kind: "bull", segmentName: bull }
      : number != null
        ? { kind: "sector", ring, number }
        : null;

  const preview = draft?.kind === "none" ? "0" : draft ? segmentNameFromDraft(draft) : "—";

  return (
    <form
      className="segment-pad"
      onSubmit={(event) => {
        event.preventDefault();
        if (!draft) return;
        onConfirm(segmentNameFromDraft(draft));
      }}
    >
      <p className="hint">
        Manual Override for Hit {hitIndex + 1} (local only). Pick S/D/T and a number, then OK.
      </p>
      <div className="pad-numbers" role="group" aria-label="Numbers">
        {PAD_NUMBERS.map((n) => (
          <button
            key={n}
            type="button"
            className={number === n && !bull ? "selected" : undefined}
            aria-pressed={number === n && !bull}
            onClick={() => {
              setNone(false);
              setBull(null);
              setNumber(n);
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="pad-rings" role="group" aria-label="Single double triple">
        {(
          [
            ["S", "Single"],
            ["D", "Double"],
            ["T", "Treble"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={ring === value && !bull ? "selected" : undefined}
            aria-pressed={ring === value && !bull}
            aria-label={label}
            onClick={() => {
              setNone(false);
              setBull(null);
              setRing(value);
            }}
          >
            {value}
            <small>{label}</small>
          </button>
        ))}
      </div>
      <div className="pad-bulls" role="group" aria-label="Bull">
        <button
          type="button"
          className={bull === "Bull" ? "selected" : undefined}
          aria-pressed={bull === "Bull"}
          onClick={() => {
            setNone(false);
            setNumber(null);
            setBull("Bull");
          }}
        >
          Bull
        </button>
        <button
          type="button"
          className={bull === "25" ? "selected" : undefined}
          aria-pressed={bull === "25"}
          onClick={() => {
            setNone(false);
            setNumber(null);
            setBull("25");
          }}
        >
          25
        </button>
        <button
          type="button"
          className={none ? "selected stacked" : "stacked"}
          aria-pressed={none}
          aria-label="None"
          onClick={() => {
            setBull(null);
            setNumber(null);
            setNone(true);
          }}
        >
          0
          <small>None</small>
        </button>
      </div>
      <p className="pad-preview">
        Selected <b>{preview}</b>
      </p>
      <div className="pad-actions">
        <button type="submit" className="cta" disabled={!draft}>
          OK
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
