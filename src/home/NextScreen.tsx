export function NextScreen({
  title,
  message,
  detail,
  onHome,
}: {
  title: string;
  message: string;
  detail?: string;
  onHome: () => void;
}) {
  return (
    <div className="next-screen">
      <header className="next-header">
        <h1>{title}</h1>
        <button type="button" className="home-link" onClick={onHome}>
          Home
        </button>
      </header>
      <p className="next-message">{message}</p>
      {detail ? <p className="next-detail">{detail}</p> : null}
    </div>
  );
}
