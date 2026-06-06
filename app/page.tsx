export default function Home() {
  return (
    <div style={{ maxWidth: "800px", margin: "4rem auto", textAlign: "center" }}>
      <h1 style={{
        fontSize: "3rem",
        fontWeight: 800,
        color: "var(--accent)",
        marginBottom: "1rem"
      }}>
        RUNIT Fantasy
      </h1>
      <p style={{ color: "var(--text-muted)", fontSize: "1.2rem", marginBottom: "2rem" }}>
        Valorant & Marvel Rivals Fantasy Game
      </p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <a href="/leaderboard" style={{
          background: "var(--accent)",
          color: "#000",
          padding: "0.75rem 2rem",
          borderRadius: "8px",
          fontWeight: 700,
        }}>
          View Leaderboard
        </a>
        <a href="/team" style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          padding: "0.75rem 2rem",
          borderRadius: "8px",
          fontWeight: 700,
        }}>
          My Team
        </a>
      </div>
    </div>
  );
}
