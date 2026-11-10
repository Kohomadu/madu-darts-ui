import { playerStatLine } from "./display";
import type { MatchState, ResultsSnapshot } from "./types";

export function MatchResultsScreen({
  state,
  onRematch,
  onClose,
  onHome,
}: {
  state: MatchState;
  onRematch: () => void;
  onClose: () => void;
  onHome: () => void;
}) {
  const results = state.results;
  if (!results) return null;
  const winnerName = results.winner === "you" ? results.youName : results.opponentName;

  return (
    <div className="match-results">
      <header className="next-header">
        <h1>{winnerName} wins</h1>
        <button type="button" className="home-link" onClick={onHome}>
          Home
        </button>
      </header>
      <div className="match-results-grid">
        <ResultColumn name={results.youName} scores={results} seat="you" />
        <ResultColumn name={results.opponentName} scores={results} seat="opponent" />
      </div>
      <footer className="match-results-actions">
        <button type="button" className="cta" onClick={onRematch}>
          Rematch
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </footer>
    </div>
  );
}

function ResultColumn({
  name,
  scores,
  seat,
}: {
  name: string;
  scores: ResultsSnapshot;
  seat: "you" | "opponent";
}) {
  const totals = seat === "you" ? scores.you : scores.opponent;
  const line = playerStatLine(totals);
  return (
    <section className="match-result-col">
      <h2>{name}</h2>
      <p>Sets {scores.scores.sets[seat]}</p>
      <p>Legs {scores.scores.legs[seat]}</p>
      <p>Average {line.average}</p>
      <p>First 9 {line.first9}</p>
      <p>
        Checkout {totals.checkoutHits}/{totals.checkoutAttempts}
      </p>
      <p>Highest checkout {totals.highestCheckout || "—"}</p>
      <p>Total darts {totals.dartsThrown}</p>
      <p>Best Turn {totals.bestTurn || "—"}</p>
      <p>Tons {totals.tons}</p>
      <p className="next-detail">
        100+ {totals.tons100} · 140+ {totals.tons140} · 171+ {totals.tons171}
      </p>
    </section>
  );
}
