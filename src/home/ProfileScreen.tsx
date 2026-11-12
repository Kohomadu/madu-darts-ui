import { readProfileDartsThrown } from "./profileDarts";

export function ProfileScreen({ name, onHome }: { name: string; onHome: () => void }) {
  const dartsThrown = readProfileDartsThrown(localStorage, name);

  return (
    <div className="next-screen">
      <header className="next-header">
        <h1>Profile</h1>
        <button type="button" className="home-link" onClick={onHome}>
          Home
        </button>
      </header>
      <p className="next-message">{name}</p>
      <dl className="profile-stats">
        <div>
          <dt>Darts thrown</dt>
          <dd>{dartsThrown.toLocaleString("en-GB")}</dd>
        </div>
      </dl>
      <p className="next-detail">Further profiles are next.</p>
    </div>
  );
}
