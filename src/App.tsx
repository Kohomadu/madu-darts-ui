import { useEffect, useState } from "react";
import { useAccuracy } from "./accuracy/useAccuracy";
import {
  AUTODARTS_BASE_URL_KEY,
  DEFAULT_AUTODARTS_BASE_URL,
  normalizeBaseUrl,
} from "./autodarts/baseUrl";
import { resolveLocalOverride } from "./autodarts/override";
import type { Hit } from "./autodarts/parse";
import { useAutodarts } from "./autodarts/useAutodarts";
import type { ConnectionPhase } from "./autodarts/view";
import { Board } from "./board/Board";
import { checkoutRoute, openRouteSlots, shownRemaining } from "./game/checkout";
import { scoreSegment } from "./game/rules";
import { canUndoTurn, useGame } from "./game/useGame";
import { SegmentPad } from "./override/SegmentPad";

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
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const { view, error, applyLocalOverride, restoreTurn, finishReview } = useAutodarts(baseUrl);
  const accuracy = useAccuracy(view);
  const game = useGame(view);
  const live = view.phase === "live" || view.phase === "polling";
  const disconnected = view.phase === "disconnected";
  const reviewing = view.reviewHits != null;
  const canUndo = canUndoTurn({
    connected: live,
    hitCount: view.hits.length,
    reviewing,
    hasSealedVisit: game.sealedVisit != null,
  });
  const remaining = shownRemaining(game.phase, game.remaining, view.hits);
  const route = checkoutRoute(
    remaining,
    openRouteSlots({
      busted: game.busted,
      phase: game.phase,
      remaining,
      hitCount: view.hits.length,
    }),
  );

  useEffect(() => {
    if (pickIndex != null && pickIndex >= view.hits.length) {
      setPickIndex(null);
    }
  }, [pickIndex, view.hits.length]);

  function commitSegment(segmentName: string) {
    if (pickIndex == null || !live) return;
    const previous = view.streamHits[pickIndex] ?? view.hits[pickIndex];
    if (!previous) return;
    const hit = resolveLocalOverride({ segmentName }, previous);
    if (!hit) {
      setOverrideError("Could not map that pick to a Segment");
      return;
    }
    setOverrideError(null);
    accuracy.markOverridden(pickIndex);
    applyLocalOverride(pickIndex, hit);
    setPickIndex(null);
  }

  function undoLastTurn() {
    const visit = game.sealedVisit;
    if (!canUndo || !visit) return;
    accuracy.unseal();
    game.restoreVisit(visit);
    restoreTurn(visit.hits);
    setPickIndex(null);
  }

  function confirmTurn() {
    if (!reviewing || !live) return;
    setPickIndex(null);
    finishReview();
  }

  const level =
    game.phase === "complete" ? "170 cleared" : game.phase === "playing" ? `Target ${game.target}` : "501";

  return (
    <div className="play">
      <h1 className="sr-only">Madu Darts</h1>
      <header className="score">
        <p className="level">
          {level}
          {game.busted ? " · Bust" : ""}
          {disconnected ? " · Paused" : ""}
        </p>
        <p className={`remaining${game.busted ? " bust" : ""}`} aria-label={`Remaining ${remaining}`}>
          {remaining}
        </p>
        <div className="pips" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <span key={index} className={index < view.hits.length ? "pip on" : "pip"} />
          ))}
        </div>
        <p className="secondary">
          <span className={`conn ${view.phase}`} role="status">
            {connectionLabel(view.phase)}
          </span>
          <span
            className="accuracy"
            title={accuracy.total ? `${accuracy.unchanged} of ${accuracy.total} unchanged` : undefined}
          >
            Detection Accuracy {accuracy.percent == null ? "—" : `${accuracy.percent}%`}
          </span>
          {game.phase === "playing" ? (
            <span>
              {countLabel(game.turnsLeft, "turn", "turns")} · {countLabel(game.dartsLeft, "dart", "darts")} left
            </span>
          ) : null}
          <button type="button" className="text" onClick={() => accuracy.reset()}>
            Reset
          </button>
        </p>
      </header>
      <HitStrip
        hits={view.hits}
        route={route}
        paused={!live}
        selected={pickIndex}
        onSelect={(index) => {
          setOverrideError(null);
          setPickIndex((current) => (current === index ? null : index));
        }}
      />
      {pickIndex != null && view.hits[pickIndex] ? (
        <SegmentPad
          key={pickIndex}
          hitIndex={pickIndex}
          initialSegment={view.hits[pickIndex].segmentName}
          onConfirm={commitSegment}
          onCancel={() => {
            setPickIndex(null);
            setOverrideError(null);
          }}
        />
      ) : null}
      {overrideError ? <p className="pause-copy warn">{overrideError}</p> : null}
      <Board hits={view.hits} paused={disconnected} />
      {urlError ? <p className="banner warn">{urlError}</p> : null}
      {disconnected && error ? <p className="pause-copy">{error}. The Turn is paused.</p> : null}
      <footer className="chrome">
        {canUndo ? (
          <button type="button" onClick={undoLastTurn}>
            Undo
          </button>
        ) : null}
        {reviewing && live ? (
          <button type="button" onClick={confirmTurn}>
            Done
          </button>
        ) : null}
        <button type="button" className="cta" onClick={() => game.start()}>
          Start 101
        </button>
        <details>
          <summary>Connect</summary>
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
        </details>
      </footer>
    </div>
  );
}

function HitStrip({
  hits,
  route,
  paused,
  selected,
  onSelect,
}: {
  hits: Hit[];
  route: string[];
  paused: boolean;
  selected: number | null;
  onSelect: (index: number) => void;
}) {
  return (
    <ol className="strip" aria-label="Turn">
      {[0, 1, 2].map((index) => {
        const hit = hits[index];
        const suggestion = hit ? null : (route[index - hits.length] ?? null);
        const segment = hit?.segmentName ?? suggestion;
        const kind = hit ? "filled" : suggestion ? "route" : "empty";
        const label = (
          <>
            <b>{segment ?? "—"}</b>
            <small>
              {segment ? scoreSegment(segment).points : `Hit ${index + 1}`}
            </small>
          </>
        );
        return (
          <li key={index} className={`hit ${kind}${selected === index ? " selected" : ""}`}>
            {hit && !paused ? (
              <button
                type="button"
                className="hit-button"
                aria-pressed={selected === index}
                aria-label={`${hit.segmentName}, Hit ${index + 1}`}
                onClick={() => onSelect(index)}
              >
                {label}
              </button>
            ) : (
              <div aria-label={suggestion ? `Checkout Route ${suggestion}` : `Hit ${index + 1}`}>{label}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
