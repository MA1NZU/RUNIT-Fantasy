import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RUNIT Fantasy",
  description: "Valorant & Marvel Rivals Fantasy Game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "1rem 2rem",
          display: "flex",
          gap: "2rem",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}>
          <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "1.2rem" }}>
            RUNIT Fantasy
          </span>
          <a href="/" style={{ color: "var(--text-muted)" }}>Home</a>
          <a href="/leaderboard" style={{ color: "var(--text-muted)" }}>Leaderboard</a>
          <a href="/team" style={{ color: "var(--text-muted)" }}>My Team</a>
          <a href="/transfers" style={{ color: "var(--text-muted)" }}>Transfers</a>
        </nav>
        <main style={{ padding: "2rem" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
