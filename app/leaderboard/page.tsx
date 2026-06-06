"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

type Team = {
  id: string;
  teamName: string;
  managerName: string;
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
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>
        Leaderboard
      </h1>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
              <th style={{ padding: "0.75rem", textAlign: "left" }}>#</th>
              <th style={{ padding: "0.75rem", textAlign: "left" }}>Manager</th>
              <th style={{ padding: "0.75rem", textAlign: "left" }}>Team</th>
              <th style={{ padding: "0.75rem", textAlign: "right" }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, i) => (
              <tr key={team.id} style={{
                borderBottom: "1px solid var(--border)",
                background: i === 0 ? "rgba(232,255,0,0.05)" : "transparent"
              }}>
                <td style={{ padding: "1rem 0.75rem", color: i === 0 ? "var(--accent)" : "var(--text-muted)", fontWeight: 700 }}>
                  {i + 1}
                </td>
                <td style={{ padding: "1rem 0.75rem" }}>{team.managerName}</td>
                <td style={{ padding: "1rem 0.75rem", color: "var(--text-muted)" }}>{team.teamName}</td>
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
