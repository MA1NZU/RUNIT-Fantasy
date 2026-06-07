"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import Shell from "@/app/shell";

type Team = {
  id: string;
  manager: string;
  ownerEmail: string;
  gameweekPoints: number;
  totalPoints: number;
};

const CURRENT_GW = 7;

export default function Leaderboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sortBy, setSortBy] = useState<"totalPoints" | "gameweekPoints">("totalPoints");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);
      try {
        // 1. Fetch all user teams for names and totals
        const userTeamsSnap = await getDocs(collection(db, "userTeams"));
        const userTeamsData = userTeamsSnap.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as any));

        // 2. Fetch gameweek teams for GW7 to get latest points
        const gwTeamsSnap = await getDocs(query(
          collection(db, "gameweekTeams"),
          where("gameweek", "==", CURRENT_GW)
        ));

        const gwPointsMap: Record<string, number> = {};
        gwTeamsSnap.docs.forEach(d => {
          const data = d.data();
          if (data.ownerEmail) {
            gwPointsMap[data.ownerEmail] = Number(data.gwPoints || 0);
          }
        });

        // 3. Merge both collections by ownerEmail
        const mergedTeams: Team[] = userTeamsData.map(ut => ({
          id: ut.id,
          manager: ut.manager || "Unknown Manager",
          ownerEmail: ut.ownerEmail,
          totalPoints: Number(ut.totalPoints || 0),
          gameweekPoints: gwPointsMap[ut.ownerEmail] ?? 0
        }));

        setTeams(mergedTeams);
      } catch (err) {
        console.error("Error loading leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  // Sort dynamically based on toggle
  const sorted = [...teams].sort((a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0));

  return (
    <Shell>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "var(--blue-dim)", border: "1px solid var(--blue-border)", color: "#6b9fff", fontSize: "0.75rem", padding: "4px 10px", borderRadius: "20px", marginBottom: "1rem" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            Live standings
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Leaderboard</h1>
        </div>

        {/* Toggle Switch */}
        <div style={{ display: "inline-flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "3px", gap: "2px", marginBottom: "1.5rem" }}>
          {(["totalPoints", "gameweekPoints"] as const).map((key) => (
            <button 
              key={key} 
              onClick={() => setSortBy(key)} 
              style={{ 
                padding: "6px 16px", borderRadius: "6px", border: "none", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer", 
                background: sortBy === key ? "var(--blue)" : "transparent", 
                color: sortBy === key ? "#fff" : "var(--text-muted)" 
              }}
            >
              {key === "totalPoints" ? "All time" : "This gameweek"}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading leaderboard...</p>
        ) : (
          <div>
            {/* Table Header */}
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px 90px", gap: "8px", padding: "0 12px 10px", borderBottom: "1px solid var(--border)", marginBottom: "8px" }}>
              {["#", "Manager", "GW Pts", "Total"].map((h, i) => (
                <div key={h} style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: i > 1 ? "right" : "left" }}>{h}</div>
              ))}
            </div>

            {/* List */}
            {sorted.map((team, i) => (
              <div key={team.id} style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px 90px", gap: "8px", alignItems: "center", padding: "0.75rem", borderRadius: "10px", marginBottom: "6px", background: i === 0 ? "var(--blue-dim)" : "var(--surface)", border: "1px solid " + (i === 0 ? "var(--blue-border)" : "var(--border)") }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: i === 0 ? "var(--accent)" : i === 1 ? "#aaa" : i === 2 ? "#cd7f32" : "var(--text-muted)" }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  {team.manager}
                  {i === 0 && (
                    <span style={{ background: "var(--accent-dim)", color: "var(--accent)", fontSize: "0.6rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>★ Leader</span>
                  )}
                </div>
                <div style={{ fontSize: "0.875rem", textAlign: "right", color: sortBy === "gameweekPoints" ? "var(--accent)" : "var(--text-muted)", fontWeight: sortBy === "gameweekPoints" ? 700 : 400 }}>
                  {team.gameweekPoints}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: sortBy === "totalPoints" ? 700 : 400, textAlign: "right", color: sortBy === "totalPoints" ? "var(--text)" : "var(--text-muted)" }}>
                  {team.totalPoints}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}
