import { useEffect, useRef, useState } from "react";
import { readMuted, writeMuted } from "../audio/mute";
import { setCuesMuted, unlockAudio } from "../audio/play";
import { useAccuracy } from "../accuracy/useAccuracy";
import {
  AUTODARTS_BASE_URL_KEY,
  DEFAULT_AUTODARTS_BASE_URL,
  normalizeBaseUrl,
} from "../autodarts/baseUrl";
import { resolveLocalOverride } from "../autodarts/override";
import { resetBoard } from "../autodarts/resetBoard";
import type { Hit } from "../autodarts/parse";
import { useAutodarts } from "../autodarts/useAutodarts";
import type { ConnectionPhase } from "../autodarts/view";
import { Board } from "../board/Board";
import { checkoutRoute, openRouteSlots, shownRemaining } from "../game/checkout";
import { formatHighScore } from "../game/highScore";
import { restartSameGameMessage } from "../game/parkedRun";
import { scoreSegment, type TrainingGameId } from "../game/rules";
import { canUndoTurn, useGame } from "../game/useGame";
import { SegmentPad } from "../override/SegmentPad";
import { presenceLabel, recoveryCopy, shellPresence } from "../shell/presence";
import { useWakeLock } from "../shell/wakeLock";

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

export function PracticeShell({ onHome }: { onHome: () => void }) {
  const [baseUrl, setBaseUrl] = useState(loadBaseUrl);
  const [draft, setDraft] = useState(baseUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [pickIndex, setPickIndex] = useState<number | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const nextScoreBusy = useRef(false);
  const [boardNote, setBoardNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [muted, setMuted] = useState(() => {
    const saved = readMuted(localStorage);
    setCuesMuted(saved);
    return saved;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [flash, setFlash] = useState<{ id: number; kind: "checkout" | "try-again" } | null>(null);
  const { view, error, applyLocalOverride, restoreTurn, finishReview, holdEmpty, releaseHold } = useAutodarts(baseUrl);
  const accuracy = useAccuracy(view);
  const game = useGame(view);
  const live = view.phase === "live" || view.phase === "polling";
  useWakeLock(live);
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

  useEffect(() => {
    if (!boardNote) return;
    const timer = window.setTimeout(() => setBoardNote(null), 2500);
    return () => window.clearTimeout(timer);
  }, [boardNote]);

  useEffect(() => {
    setCuesMuted(muted);
  }, [muted]);

  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (!game.moment) return;
    setFlash(game.moment);
    const timer = window.setTimeout(() => {
      setFlash((current) => (current?.id === game.moment?.id ? null : current));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [game.moment]);

  function requestStart(next: TrainingGameId) {
    if (game.phase === "playing" && game.game === next) {
      if (!window.confirm(restartSameGameMessage(next))) return;
      game.start(next, { replaceSame: true });
      return;
    }
    game.start(next);
  }

  function toggleMute() {
    const next = !muted;
    if (!next) unlockAudio();
    setCuesMuted(next);
    writeMuted(localStorage, next);
    setMuted(next);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      // The browser refused fullscreen. The button stays available.
    }
  }

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

  async function nextScore() {
    if (!live || nextScoreBusy.current || game.phase !== "playing") return;
    nextScoreBusy.current = true;
    setResetting(true);
    game.pauseScoring();
    holdEmpty();
    try {
      const result = await resetBoard();
      if (!result.ok) {
        releaseHold();
        game.resumeScoring();
        setBoardNote({ ok: false, text: result.message });
        return;
      }
      game.skip();
      setPickIndex(null);
      setBoardNote({ ok: true, text: "Next score" });
    } finally {
      nextScoreBusy.current = false;
      setResetting(false);
    }
  }

  async function resetTheBoard() {
    if (!live || resetting) return;
    setResetting(true);
    const result = await resetBoard();
    setResetting(false);
    setBoardNote(
      result.ok ? { ok: true, text: "Board reset" } : { ok: false, text: result.message },
    );
  }

  const level =
    game.phase === "complete" ? "170 cleared" : game.phase === "playing" ? `Target ${game.target}` : "501";
  const presence = live ? shellPresence(view.status) : null;
  const recovery = recoveryCopy({
    presence,
    hitCount: view.hits.length,
    busted: game.busted,
    canUndo,
  });

  return (
    <div className="play">
      <h1 className="sr-only">Madu Darts</h1>
      <p className="status-strip">
        <span className={`conn ${view.phase}`} role="status">
          {connectionLabel(view.phase)}
        </span>
        <span
          className="accuracy"
          title={accuracy.total ? `${accuracy.unchanged} of ${accuracy.total} unchanged` : undefined}
        >
          Detection Accuracy {accuracy.percent == null ? "—" : `${accuracy.percent}%`}
        </span>
        <button type="button" className="text" onClick={() => accuracy.reset()}>
          Reset
        </button>
        <span className="status-actions">
          <button type="button" aria-pressed={muted} onClick={toggleMute}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button type="button" aria-pressed={fullscreen} onClick={() => void toggleFullscreen()}>
            {fullscreen ? "Exit full screen" : "Full screen"}
          </button>
          <button
            type="button"
            className="gear"
            aria-expanded={settingsOpen}
            aria-label="Settings"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            ⚙
          </button>
        </span>
      </p>
      {settingsOpen ? (
        <form
          className="url settings"
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
      ) : null}
      {urlError ? <p className="banner warn">{urlError}</p> : null}
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
        {game.phase === "playing" && game.game === "121" ? (
          <p className="secondary">Homebase {game.homebase}</p>
        ) : null}
        {game.phase === "playing" || game.phase === "complete" ? (
          <p className="secondary">
            {game.phase === "playing"
              ? `${countLabel(game.turnsLeft, "turn", "turns")} · ${countLabel(game.dartsLeft, "dart", "darts")} left`
              : null}
            {game.game === "101" ? (
              <>
                {game.phase === "playing" ? " · " : null}
                {countLabel(game.checkouts, "checkout", "checkouts")} · high {game.highTarget}
              </>
            ) : null}
          </p>
        ) : null}
        {game.phase !== "idle" ? (
          <p className="secondary">
            {countLabel(game.thrownDarts, "dart", "darts")} thrown · {formatHighScore(game.highScore)}
          </p>
        ) : null}
      </header>
      {presence ? (
        <p className={`presence ${presence}`} role="status">
          {presenceLabel(presence)}
        </p>
      ) : null}
      {recovery ? <p className="recovery">{recovery}</p> : null}
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
      {disconnected && error ? <p className="pause-copy">{error}. The Turn is paused.</p> : null}
      {boardNote ? (
        <p className={boardNote.ok ? "pause-copy" : "pause-copy warn"} role="status">
          {boardNote.text}
        </p>
      ) : null}
      {flash ? (
        <div className={`outcome ${flash.kind}`} role="status">
          {flash.kind === "checkout" ? "Checkout!" : "Try again"}
        </div>
      ) : null}
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
        <button type="button" disabled={!live || resetting} onClick={() => void resetTheBoard()}>
          Reset board
        </button>
        <button
          type="button"
          disabled={!live || resetting || game.phase !== "playing" || game.game !== "101"}
          onClick={() => void nextScore()}
        >
          Next score
        </button>
        <button type="button" className="cta" onClick={() => requestStart("101")}>
          Start 101
        </button>
        <button type="button" className="cta" onClick={() => requestStart("121")}>
          Start 121
        </button>
        {game.phase !== "idle" ? (
          <button type="button" onClick={() => game.abort()}>
            Abort
          </button>
        ) : null}
        <button type="button" onClick={onHome}>
          Home
        </button>
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
        const missed = segment === "Miss";
        const kind = hit ? "filled" : suggestion ? "route" : "empty";
        const label = (
          <>
            <b>{missed ? "0" : (segment ?? "—")}</b>
            <small>
              {missed ? "None" : segment ? scoreSegment(segment).points : `Hit ${index + 1}`}
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
                aria-label={`${hit.segmentName === "Miss" ? "None" : hit.segmentName}, Hit ${index + 1}`}
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
