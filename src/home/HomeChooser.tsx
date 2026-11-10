export type HomeTile = "play" | "practice" | "profile" | "stats";

const TILES: { id: HomeTile; label: string }[] = [
  { id: "play", label: "Play" },
  { id: "practice", label: "Practice" },
  { id: "profile", label: "Profile" },
  { id: "stats", label: "Stats" },
];

export function HomeChooser({
  profileName,
  onSelect,
}: {
  profileName: string;
  onSelect: (tile: HomeTile) => void;
}) {
  return (
    <div className="home">
      <header className="home-brand">
        <p className="home-eyebrow">Madu Darts</p>
        <h1 className="home-name">{profileName}</h1>
      </header>
      <nav className="home-tiles" aria-label="Home">
        {TILES.map((tile) => (
          <button
            key={tile.id}
            type="button"
            className="home-tile"
            onClick={() => onSelect(tile.id)}
          >
            {tile.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
