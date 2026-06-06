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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const q = query(collection(db, "userTeams"), orderBy("totalPoints", "desc"));
      const snap = await getDocs(q);
      setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>
        Leaderboard
      </h1>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              <th style={{ padding: "0.75rem", textAlign: "left" }}>#</th>
              <th style={{ padding: "0.75rem", textAlign: "left" }}>Manager</th>
              <th style={{ padding: "0.75rem", textAlign: "right" }}>GW Points</th>
              <th style={{ padding: "0.75rem", textAlign: "right" }}>Total Points</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => (
              <tr key={team.id} style={{
                borderBottom: "1px solid var(--border)",
                background: i === 0 ? "rgba(232,255,0,0.05)" : "transparent"
              }}>
                <td style={{ padding: "1rem 0.75rem", fontWeight: 700, color: i === 0 ? "var(--accent)" : "var(--text-muted)" }}>
                  {i + 1}
                </td>
                <td style={{ padding: "1rem 0.75rem", fontWeight: 600 }}>
                  {team.manager ?? "—"}
                </td>
                <td style={{ padding: "1rem 0.75rem", textAlign: "right", color: "var(--text-muted)" }}>
                  {team.gameweekPoints ?? 0}
                </td>
                <td style={{ padding: "1rem 0.75rem", textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>
                  {team.totalPoints ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
