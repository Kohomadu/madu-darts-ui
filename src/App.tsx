import { useEffect, useRef, useState } from "react";
import { useAccuracy } from "./accuracy/useAccuracy";
import {
  AUTODARTS_BASE_URL_KEY,
  DEFAULT_AUTODARTS_BASE_URL,
  normalizeBaseUrl,
} from "./autodarts/baseUrl";
import { sendOverride, segmentOverride } from "./autodarts/override";
import type { Hit } from "./autodarts/parse";
import { useAutodarts } from "./autodarts/useAutodarts";
import type { ConnectionPhase } from "./autodarts/view";
import { Board } from "./board/Board";
import { useGame } from "./game/useGame";

function loadBaseUrl(): string {
  try {
    const saved = localStorage.getItem(AUTODARTS_BASE_URL_KEY);
    return saved ? normalizeBaseUrl(saved) : DEFAULT_AUTODARTS_BASE_URL;
  } catch {
    return DEFAULT_AUTODARTS_BASE_URL;
  }
}

function connectionLabel(phase: ConnectionPhase): string {
  switch (phase) {
    case "connecting":
      return "Connecting…";
    case "live":
      return "Connected";
    case "polling":
      return "Connected · polling";
    case "disconnected":
      return "Disconnected";
  }
}

function countLabel(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function App() {
  const [baseUrl, setBaseUrl] = useState(loadBaseUrl);
  const [draft, setDraft] = useState(baseUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [pickIndex, setPickIndex] = useState<number | null>(null);
  const [segmentDraft, setSegmentDraft] = useState("");
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { view, error, applyServerState } = useAutodarts(baseUrl);
  const accuracy = useAccuracy(view);
  const game = useGame(view);
  const live = view.phase === "live" || view.phase === "polling";
  const disconnected = view.phase === "disconnected";
  const baseRef = useRef(baseUrl);
  baseRef.current = baseUrl;

  useEffect(() => {
    if (pickIndex != null && pickIndex >= view.hits.length) {
      setPickIndex(null);
      setSegmentDraft("");
    }
  }, [pickIndex, view.hits.length]);

  async function commit(body: { segmentName: string } | { xMm: number; yMm: number }) {
    if (pickIndex == null || !live || busy) return;
    const index = pickIndex;
    const sentUrl = baseUrl;
    setBusy(true);
    setOverrideError(null);
    try {
      const data = await sendOverride(index, body);
      if (baseRef.current !== sentUrl) return;
      accuracy.markOverridden(index);
      applyServerState(data);
      setPickIndex(null);
      setSegmentDraft("");
    } catch (err: unknown) {
      if (baseRef.current !== sentUrl) return;
      setOverrideError(err instanceof Error ? err.message : "Manual Override failed");
    } finally {
      if (baseRef.current === sentUrl) setBusy(false);
    }
  }

  return (
    <>
      <header>
        <h1>Madu Darts</h1>
        <p className={`conn ${view.phase}`} role="status">
          {connectionLabel(view.phase)}
        </p>
        <p className="accuracy" title={accuracy.total ? `${accuracy.unchanged} of ${accuracy.total} unchanged` : undefined}>
          Detection Accuracy <b>{accuracy.percent == null ? "—" : `${accuracy.percent}%`}</b>
        </p>
        <button type="button" className="text" onClick={() => accuracy.reset()}>
          Reset
        </button>
        {view.phase === "live" || view.phase === "polling" ? (
          <p className="turn-status">{view.status || "—"}</p>
        ) : null}
        {game.phase !== "idle" ? (
          <p className="game">
            {game.phase === "complete"
              ? "170 cleared"
              : `${game.busted ? "Bust. " : ""}Target ${game.target} · Remaining ${game.remaining} · ${countLabel(game.turnsLeft, "turn", "turns")} · ${countLabel(game.dartsLeft, "dart", "darts")} left`}
            {disconnected ? " · Paused" : ""}
          </p>
        ) : null}
        <form
          className="url"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              const next = normalizeBaseUrl(draft);
              localStorage.setItem(AUTODARTS_BASE_URL_KEY, next);
              setDraft(next);
              setUrlError(null);
              setBaseUrl(next);
            } catch (err: unknown) {
              setUrlError(err instanceof Error ? err.message : "That Autodarts URL is not valid");
            }
          }}
        >
          <label>
            Autodarts
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              spellCheck={false}
              inputMode="url"
              aria-label="Autodarts Detection URL"
            />
          </label>
          <button type="submit">Connect</button>
        </form>
        <button type="button" className="cta" onClick={() => game.start()}>
          Start 101
        </button>
      </header>
      {urlError ? <p className="banner warn">{urlError}</p> : null}
      <main>
        <section className="panel">
          <h2>Board</h2>
          <Board
            hits={view.hits}
            paused={disconnected}
            onPick={
              pickIndex == null || !live
                ? undefined
                : (xMm, yMm) => {
                    void commit({ xMm, yMm });
                  }
            }
          />
        </section>
        <section className="panel">
          <h2>Turn</h2>
          <HitStrip
            hits={view.hits}
            paused={!live}
            selected={pickIndex}
            onSelect={(index) => {
              setOverrideError(null);
              setSegmentDraft("");
              setPickIndex((current) => (current === index ? null : index));
            }}
          />
          {pickIndex != null ? (
            <form
              className="picker"
              onSubmit={(event) => {
                event.preventDefault();
                const body = segmentOverride(segmentDraft);
                if (!body) {
                  setOverrideError("Enter a Segment such as D20, T5, S18, Bull, or 25");
                  return;
                }
                void commit(body);
              }}
            >
              <p className="hint">
                Manual Override for Hit {pickIndex + 1}. Type a Segment, or click the Board.
              </p>
              <input
                value={segmentDraft}
                onChange={(event) => setSegmentDraft(event.target.value)}
                placeholder="D20"
                maxLength={8}
                autoComplete="off"
                aria-label="Segment"
                disabled={busy}
              />
              <button type="submit" className="cta" disabled={busy}>
                OK
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPickIndex(null);
                  setSegmentDraft("");
                  setOverrideError(null);
                }}
              >
                Cancel
              </button>
            </form>
          ) : null}
          {overrideError ? <p className="pause-copy warn">{overrideError}</p> : null}
          {disconnected ? (
            <p className="pause-copy">
              {error ? `${error}. ` : ""}
              {view.hits.length
                ? "The Turn is paused. These Hits are the last ones received — nothing new is added until Autodarts is back."
                : "The Turn is paused. No Hits until Autodarts is back."}
            </p>
          ) : (
            <p className="pause-copy quiet">
              {view.event ? `Event ${view.event}. ` : ""}
              {view.hits.length ? "Click a Hit to correct its Segment. " : ""}
              {game.phase === "idle" ? "Free practice." : game.phase === "complete" ? "Run complete." : ""}
            </p>
          )}
        </section>
      </main>
    </>
  );
}

function HitStrip({
  hits,
  paused,
  selected,
  onSelect,
}: {
  hits: Hit[];
  paused: boolean;
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="strip">
      {[0, 1, 2].map((index) => {
        const hit = hits[index];
        const label = (
          <>
            <b>{hit ? hit.segmentName : "—"}</b>
            <small>{hit ? (hit.bed ?? "Hit") : `Hit ${index + 1}`}</small>
          </>
        );
        return (
          <li key={index} className={`hit${hit ? " filled" : " empty"}${selected === index ? " selected" : ""}`}>
            {hit && !paused ? (
              <button
                type="button"
                className="hit-button"
                aria-pressed={selected === index}
                onClick={() => onSelect(index)}
              >
                {label}
              </button>
            ) : (
              label
            )}
          </li>
        );
      })}
    </ol>
  );
}
