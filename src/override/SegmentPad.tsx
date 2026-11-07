import { useMemo, useState } from "react";

export type Ring = "S" | "D" | "T";

export const PAD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

export type SegmentDraft =
  | { kind: "sector"; ring: Ring; number: number }
  | { kind: "bull"; segmentName: "Bull" | "25" };

export function draftFromSegment(segmentName: string): { ring: Ring; number: number | null; bull: "Bull" | "25" | null } {
  const upper = segmentName.trim().toUpperCase();
  if (upper === "BULL" || upper === "IB" || upper === "50") {
    return { ring: "S", number: null, bull: "Bull" };
  }
  if (upper === "25" || upper === "OB") {
    return { ring: "S", number: null, bull: "25" };
  }
  const match = /^([SDT])(\d{1,2})$/.exec(upper);
  if (match) {
    const number = Number(match[2]);
    if (number >= 1 && number <= 20) {
      return { ring: match[1] as Ring, number, bull: null };
    }
  }
  return { ring: "S", number: null, bull: null };
}

export function segmentNameFromDraft(draft: SegmentDraft): string {
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

  const draft: SegmentDraft | null = bull
    ? { kind: "bull", segmentName: bull }
    : number != null
      ? { kind: "sector", ring, number }
      : null;

  const preview = draft ? segmentNameFromDraft(draft) : "—";

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
            setNumber(null);
            setBull("25");
          }}
        >
          25
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
