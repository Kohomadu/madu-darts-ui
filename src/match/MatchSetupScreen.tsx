import { useState } from "react";
import { BEST_OF_CHOICES, type BestOf } from "./format";
import {
  canStartMatch,
  DEFAULT_MATCH_SETUP,
  readMatchSetup,
  writeMatchSetup,
} from "./setupStorage";
import type { BotLevel, MatchSetup } from "./types";

export function MatchSetupScreen({
  profileName,
  hasParked,
  onHome,
  onStart,
  onResume,
}: {
  profileName: string;
  hasParked: boolean;
  onHome: () => void;
  onStart: (setup: MatchSetup) => void;
  onResume: () => void;
}) {
  const [setup, setSetup] = useState(() => readMatchSetup(localStorage));

  function update(partial: Partial<MatchSetup>) {
    setSetup((current) => {
      const next = { ...current, ...partial };
      writeMatchSetup(localStorage, next);
      return next;
    });
  }

  function start() {
    if (!canStartMatch(setup)) return;
    if (hasParked && !window.confirm("Starting a new match deletes the parked match. Are you sure?")) {
      return;
    }
    const typed = setup.opponentName.trim();
    const next = {
      ...setup,
      opponentName:
        setup.opponentKind === "bot" ? typed || "Bot" : typed || DEFAULT_MATCH_SETUP.opponentName,
    };
    writeMatchSetup(localStorage, next);
    onStart(next);
  }

  return (
    <div className="match-setup">
      <header className="next-header">
        <h1>Play</h1>
        <button type="button" className="home-link" onClick={onHome}>
          Home
        </button>
      </header>

      {hasParked ? (
        <p className="match-parked">
          <button type="button" className="cta" onClick={onResume}>
            Resume parked match
          </button>
        </p>
      ) : null}

      <p className="match-setup-meta">501 · straight in · double out</p>

      <label className="match-field">
        Legs best of
        <select
          value={setup.setsEnabled ? 5 : setup.legsBestOf}
          disabled={setup.setsEnabled}
          onChange={(event) => update({ legsBestOf: Number(event.target.value) as BestOf })}
        >
          {BEST_OF_CHOICES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="match-check">
        <input
          type="checkbox"
          checked={setup.setsEnabled}
          onChange={(event) => update({ setsEnabled: event.target.checked })}
        />
        Sets on (best of 3 sets, each best of 5 legs)
      </label>

      <div className="match-seats">
        <p>
          <span className="match-seat-label">You</span>
          <strong>{profileName}</strong>
        </p>
        <label className="match-field">
          Opponent
          <input
            value={setup.opponentName}
            onChange={(event) => update({ opponentName: event.target.value, opponentKind: "human" })}
            spellCheck={false}
          />
        </label>
      </div>

      <fieldset className="match-fieldset">
        <legend>Starter</legend>
        {(
          [
            ["you", "You"],
            ["opponent", "Opponent"],
            ["bull-off", "Bull-off"],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="match-check">
            <input
              type="radio"
              name="starter"
              checked={setup.starter === value}
              onChange={() => update({ starter: value })}
            />
            {label}
          </label>
        ))}
      </fieldset>

      <label className="match-check">
        <input
          type="checkbox"
          checked={setup.opponentKind === "bot"}
          onChange={(event) =>
            update({
              opponentKind: event.target.checked ? "bot" : "human",
              opponentName: event.target.checked ? setup.opponentName || "Bot" : setup.opponentName,
            })
          }
        />
        Opponent is a bot
      </label>

      <label className="match-field">
        Bot level
        <select
          value={setup.botLevel}
          onChange={(event) => update({ botLevel: Number(event.target.value) as BotLevel })}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8].map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="cta match-start" disabled={!canStartMatch(setup)} onClick={start}>
        Start
      </button>
      {!canStartMatch(setup) ? (
        <p className="next-detail">Type an opponent name, or choose the bot.</p>
      ) : null}
    </div>
  );
}
