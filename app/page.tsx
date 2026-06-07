"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

type Team = {
  id: string;
  manager: string;
  gameweekPoints: number;
  totalPoints: number;
};

type Settings = {
  currentGameweek: number;
  deadline: string;
};

const TOTAL_MANAGERS = 13;

export default function Home() {
  const { user } = useAuth();
  const [topTeams, setTopTeams] = useState<Team[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [teamsSnap, settingsSnap] = await Promise.all([
        getDocs(query(collection(db, "userTeams"), orderBy("totalPoints", "desc"), limit(5))),
        getDocs(collection(db, "settings")),
      ]);
      setTopTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
      if (!settingsSnap.empty) setSettings(settingsSnap.docs[0].data() as Settings);
      setLoading(false);
    };
    load();
  }, []);

  const firstName = user?.email?.split("@")[0] ?? "Manager";
  const currentGW = settings?.currentGameweek ?? 7;
  const nextGW = currentGW + 1;

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto" }}>

      {/* Hero */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "var(--blue-dim)", border: "1px solid var(--blue-border)",
          color: "#6b9fff", fontSize: "0.75rem", padding: "4px 10px",
          borderRadius: "20px", marginBottom: "1rem",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
          Gameweek {currentGW} active
        </div>

        <h1 style={{ fontSize: "2.2rem", fontWeight: 700, lineHeight: 1.2, marginBottom: "0.5rem" }}>
          RUNIT<br />
          <span style={{ color: "var(--blue)" }}>Fantasy League</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Valorant & Marvel Rivals · {TOTAL_MANAGERS} managers competing
        </p>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <a href="/leaderboard" style={{
            background: "var(--blue)", color: "#fff",
            padding: "0.6rem 1.4rem", borderRadius: "8px",
            fontWeight: 600, fontSize: "0.875rem",
          }}>
            View Leaderboard
          </a>
          <a href="/team" style={{
            background: "transparent", color: "var(--accent)",
            border: "1px solid var(--accent)",
            padding: "0.6rem 1.4rem", borderRadius: "8px",
            fontWeight: 600, fontSize: "0.875rem",
          }}>
            My Team
          </a>
        </div>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.75rem" }}>
          This gameweek
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
          {[
            { val: TOTAL_MANAGERS.toString(), label: "Managers" },
            { val: `GW${currentGW}`, label: "Current gameweek", color: "var(--text)" },
            { val: `GW${nextGW}`, label: "Transfers open", color: "var(--blue)" },
          ].map((s, i) => (
            <div key={i} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "10px", padding: "1rem 1.25rem",
            }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color ?? "var(--accent)" }}>{s.val}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: "2rem" }} />

      {/* Top 5 leaderboard preview */}
      <div>
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "1rem" }}>
          Leaderboard — top 5
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading...</p>
        ) : (
          <>
            {/* Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "32px 1fr 80px 80px",
              gap: "8px", padding: "0 12px 8px",
              borderBottom: "1px solid var(--border)", marginBottom: "6px",
            }}>
              {["#", "Manager", "GW Pts", "Total"].map((h, i) => (
                <div key={h} style={{
                  fontSize: "0.7rem", color: "var(--text-muted)", letterSpacing: "0.5px",
                  textAlign: i > 1 ? "right" : "left",
                }}>{h}</div>
              ))}
            </div>

            {topTeams.map((team, i) => (
              <div key={team.id} style={{
                display: "grid", gridTemplateColumns: "32px 1fr 80px 80px",
                gap: "8px", alignItems: "center",
                padding: "0.65rem 0.75rem",
                borderRadius: "8px", marginBottom: "4px",
                background: i === 0 ? "var(--blue-dim)" : "var(--surface)",
                border: `1px solid ${i === 0 ? "var(--blue-border)" : "var(--border)"}`,
              }}>
                <div style={{
                  fontSize: "0.85rem", fontWeight: 700,
                  color: i === 0 ? "var(--accent)" : "var(--text-muted)",
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                    {team.manager}
                    {i === 0 && (
                      <span style={{
                        marginLeft: "6px", background: "var(--accent-dim)",
                        color: "var(--accent)", fontSize: "0.65rem",
                        fontWeight: 700, padding: "2px 6px", borderRadius: "4px",
                      }}>★ Leader</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-muted)", textAlign: "right" }}>
                  {team.gameweekPoints ?? 0}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--text)", textAlign: "right" }}>
                  {team.totalPoints ?? 0}
                </div>
              </div>
            ))}

            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <a href="/leaderboard" style={{ fontSize: "0.85rem", color: "var(--blue)", cursor: "pointer" }}>
                View full leaderboard →
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
