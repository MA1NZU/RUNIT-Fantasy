"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

type Team = {
  id: string;
  manager: string;
  gameweekPoints: number;
  totalPoints: number;
};

export default function Leaderboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sortBy, setSortBy] = useState<"totalPoints" | "gameweekPoints">("totalPoints");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "userTeams"), orderBy("totalPoints", "desc")))
      .then(snap => {
        setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
        setLoading(false);
      });
  }, []);

  const sorted = [...teams].sort((a, b) =>
    (b[sortBy] ?? 0) - (a[sortBy] ?? 0)
  );

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "var(--blue-dim)", border: "1px solid var(--blue-border)",
          color: "#6b9fff", fontSize: "0.75rem", padding: "4px 10px",
          borderRadius: "20px", marginBottom: "1rem",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
          Live standings
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Leaderboard</h1>
      </div>

      {/* Toggle */}
      <div style={{
        display: "inline-flex", background: "var(--surface)",
        border: "1px solid var(--border)", borderRadius: "8px",
        padding: "3px", gap: "2px", marginBottom: "1.5rem",
      }}>
        {(["totalPoints", "gameweekPoints"] as const).map(key => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            style={{
              padding: "6px 16px", borderRadius: "6px", border: "none",
              fontWeight: 600, fontSize: "0.8rem", cursor: "pointer",
              background: sortBy === key ? "var(--blue)" : "transparent",
              color: sortBy === key ? "#fff" : "var(--text-muted)",
              transition: "all 0.15s",
            }}
          >
            {key === "totalPoints" ? "All time" : "This gameweek"}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <div>
          {/* Table header */}
          <div style={{
            display: "grid", gridTemplateColumns: "40px 1fr 90px 90px",
            gap: "8px", padding: "0 12px 10px",
            borderBottom: "1px solid var(--border)", marginBottom: "8px",
          }}>
            {["#", "Manager", "GW Pts", "Total"].map((h, i) => (
              <div key={h} style={{
                fontSize: "0.7rem", color: "var(--text-muted)",
                letterSpacing: "0.5px", textAlign: i > 1 ? "right" : "left",
              }}>{h}</div>
            ))}
          </div>

          {sorted.map((team, i) => (
            <div key={team.id} style={{
              display: "grid", gridTemplateColumns: "40px 1fr 90px 90px",
              gap: "8px", alignItems: "center",
              padding: "0.75rem", borderRadius: "10px", marginBottom: "6px",
              background: i === 0
                ? "var(--blue-dim)"
                : i < 3 ? "var(--surface)" : "var(--surface)",
              border: `1px solid ${i === 0 ? "var(--blue-border)" : "var(--border)"}`,
            }}>
              {/* Rank */}
              <div style={{
                fontSize: "0.9rem", fontWeight: 700,
                color: i === 0 ? "var(--accent)" : i === 1 ? "#aaa" : i === 2 ? "#cd7f32" : "var(--text-muted)",
              }}>
                {i + 1}
              </div>

              {/* Manager */}
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  {team.manager ?? "—"}
                  {i === 0 && (
                    <span style={{
                      background: "var(--accent-dim)", color: "var(--accent)",
                      fontSize: "0.6rem", fontWeight: 700,
                      padding: "2px 6px", borderRadius: "4px",
                    }}>★ Leader</span>
                  )}
                </div>
              </div>

              {/* GW Points */}
              <div style={{
                fontSize: "0.875rem", textAlign: "right",
                color: sortBy === "gameweekPoints" ? "var(--accent)" : "var(--text-muted)",
                fontWeight: sortBy === "gameweekPoints" ? 700 : 400,
              }}>
                {team.gameweekPoints ?? 0}
              </div>

              {/* Total Points */}
              <div style={{
                fontSize: "0.875rem", fontWeight: sortBy === "totalPoints" ? 700 : 400,
                textAlign: "right",
                color: sortBy === "totalPoints" ? "var(--text)" : "var(--text-muted)",
              }}>
                {team.totalPoints ?? 0}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
