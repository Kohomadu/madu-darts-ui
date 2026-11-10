import { useEffect, useState } from "react";
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
import { checkoutRoute, openRouteSlots } from "../game/checkout";
import { scoreSegment, type DartSnap } from "../game/rules";
import { SegmentPad } from "../override/SegmentPad";
import { presenceLabel, recoveryCopy, shellPresence } from "../shell/presence";
import { useWakeLock } from "../shell/wakeLock";
import { playerStatLine } from "./display";
import { MatchResultsScreen } from "./MatchResultsScreen";
import { beginMatch, useMatch } from "./useMatch";
import type { MatchSetup, MatchState } from "./types";

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

export function MatchShell({
  initial,
  onHome,
  onCloseToSetup,
}: {
  initial: MatchState;
  onHome: () => void;
  onCloseToSetup: () => void;
}) {
  const [baseUrl, setBaseUrl] = useState(loadBaseUrl);
  const [draft, setDraft] = useState(baseUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [pickIndex, setPickIndex] = useState<number | null>(null);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [boardNote, setBoardNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [muted, setMuted] = useState(() => {
    const saved = readMuted(localStorage);
    setCuesMuted(saved);
    return saved;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(() => Boolean(document.fullscreenElement));
  const [flash, setFlash] = useState<{ id: number; kind: "checkout" | "try-again" } | null>(null);
  const { view, error, applyLocalOverride, restoreTurn, finishReview } = useAutodarts(baseUrl);
  const accuracy = useAccuracy(view);
  const match = useMatch(view, initial);
  const live = view.phase === "live" || view.phase === "polling";
  useWakeLock(live);
  const disconnected = view.phase === "disconnected";
  const reviewing = view.reviewHits != null;

  const displayHits = match.botThrowing ? toHits(match.botShown) : view.hits;
  const throwerRemaining =
    match.thrower === "you"
      ? match.remaining.you
      : match.thrower === "opponent"
        ? match.remaining.opponent
        : 501;
  const route =
    match.phase === "leg"
      ? checkoutRoute(
          throwerRemaining,
          openRouteSlots({
            busted: match.busted,
            phase: "playing",
            remaining: throwerRemaining,
            hitCount: displayHits.length,
          }),
        )
      : [];

  useEffect(() => {
    if (pickIndex != null && pickIndex >= view.hits.length) setPickIndex(null);
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
    if (!match.moment) return;
    setFlash(match.moment);
    const timer = window.setTimeout(() => {
      setFlash((current) => (current?.id === match.moment?.id ? null : current));
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [match.moment]);

  if (match.phase === "results") {
    return (
      <MatchResultsScreen
        state={match.state}
        onRematch={() => match.rematch()}
        onClose={() => {
          match.clearPark();
          onCloseToSetup();
        }}
        onHome={() => {
          match.clearPark();
          onHome();
        }}
      />
    );
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
      // Browser refused fullscreen.
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
    const visit = match.sealedVisit;
    if (!match.canUndo || !visit) return;
    const botVisit = match.state.sealed?.seat === "opponent" && match.state.setup.opponentKind === "bot";
    accuracy.unseal();
    match.restoreVisit(visit);
    if (!botVisit) restoreTurn(visit.hits);
    setPickIndex(null);
  }

  async function resetTheBoard() {
    if (!live || resetting) return;
    setResetting(true);
    const result = await resetBoard();
    setResetting(false);
    setBoardNote(result.ok ? { ok: true, text: "Board reset" } : { ok: false, text: result.message });
  }

  const presence = live ? shellPresence(view.status) : null;
  const recovery = recoveryCopy({
    presence,
    hitCount: view.hits.length,
    busted: match.busted,
    canUndo: match.canUndo,
  });
  const youStats = playerStatLine(match.you);
  const oppStats = playerStatLine(match.opponent);
  const showStats = match.phase === "leg";

  return (
    <div className="match-play">
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

      <div className="match-layout">
        <ScoreColumn
          name={match.state.youName}
          remaining={match.remaining.you}
          legs={match.scores.legs.you}
          sets={match.scores.sets.you}
          setsEnabled={match.state.setup.setsEnabled}
          stats={youStats}
          showStats={showStats}
          active={match.thrower === "you"}
          busted={match.busted && match.thrower === "you"}
          side="you"
        />

        <div className="match-center">
          {match.phase === "bull-off" ? (
            <p className="match-turn" role="status">
              Bull-off · {match.throwerName} to throw
            </p>
          ) : (
            <p className="match-turn" role="status">
              {match.throwerName} to throw
              {disconnected ? " · Paused" : ""}
            </p>
          )}
          {presence ? (
            <p className={`presence ${presence}`} role="status">
              {presenceLabel(presence)}
            </p>
          ) : null}
          {recovery ? <p className="recovery">{recovery}</p> : null}
          <HitStrip
            hits={displayHits}
            route={route}
            paused={!live || match.botThrowing}
            selected={pickIndex}
            onSelect={(index) => {
              if (match.botThrowing) return;
              setOverrideError(null);
              setPickIndex((current) => (current === index ? null : index));
            }}
          />
          {pickIndex != null && !match.botThrowing && view.hits[pickIndex] ? (
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
          <Board hits={displayHits} paused={disconnected && !match.botThrowing} />
          {disconnected && error ? <p className="pause-copy">{error}. The Turn is paused.</p> : null}
          {boardNote ? (
            <p className={boardNote.ok ? "pause-copy" : "pause-copy warn"} role="status">
              {boardNote.text}
            </p>
          ) : null}
        </div>

        <ScoreColumn
          name={match.state.setup.opponentName}
          remaining={match.remaining.opponent}
          legs={match.scores.legs.opponent}
          sets={match.scores.sets.opponent}
          setsEnabled={match.state.setup.setsEnabled}
          stats={oppStats}
          showStats={showStats}
          active={match.thrower === "opponent"}
          busted={match.busted && match.thrower === "opponent"}
          side="opponent"
        />
      </div>

      {flash ? (
        <div className={`outcome ${flash.kind}`} role="status">
          {flash.kind === "checkout" ? "Checkout!" : "Try again"}
        </div>
      ) : null}

      <footer className="chrome">
        {match.canUndo ? (
          <button type="button" onClick={undoLastTurn}>
            Undo
          </button>
        ) : null}
        {reviewing && live ? (
          <button type="button" onClick={() => finishReview()}>
            Done
          </button>
        ) : null}
        <button type="button" disabled={!live || resetting} onClick={() => void resetTheBoard()}>
          Reset board
        </button>
        <button
          type="button"
          onClick={() => {
            match.park();
            onHome();
          }}
        >
          Home
        </button>
      </footer>
    </div>
  );
}

function ScoreColumn({
  name,
  remaining,
  legs,
  sets,
  setsEnabled,
  stats,
  showStats,
  active,
  busted,
  side,
}: {
  name: string;
  remaining: number;
  legs: number;
  sets: number;
  setsEnabled: boolean;
  stats: { average: string; first9: string; checkout: string };
  showStats: boolean;
  active: boolean;
  busted: boolean;
  side: "you" | "opponent";
}) {
  return (
    <section className={`match-score ${side}${active ? " active" : ""}`}>
      <p className="match-name">
        {name}
        <span className="match-legs">
          {setsEnabled ? `Sets ${sets} · ` : null}Legs {legs}
        </span>
      </p>
      <p className={`remaining${busted ? " bust" : ""}`} aria-label={`${name} remaining ${remaining}`}>
        {showStats ? remaining : "—"}
      </p>
      {showStats ? (
        <p className="match-stats">
          <span>Avg {stats.average}</span>
          <span>First 9 {stats.first9}</span>
          <span>CO {stats.checkout}</span>
        </p>
      ) : (
        <p className="match-stats muted">Waiting for leg 1</p>
      )}
    </section>
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
            <small>{segment ? scoreSegment(segment).points : `Hit ${index + 1}`}</small>
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

export function createMatch(setup: MatchSetup, youName: string): MatchState {
  return beginMatch(setup, youName);
}

function toHits(darts: DartSnap[]): Hit[] {
  return darts.map((dart) => ({
    segmentName: dart.segmentName,
    segmentNumber: null,
    multiplier: null,
    bed: null,
    coordsX: dart.coordsX,
    coordsY: dart.coordsY,
  }));
}
