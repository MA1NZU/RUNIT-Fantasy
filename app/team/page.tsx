"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

type Manager = {
  id: string;
  namez: string;
  Totalpoints: number;
  totalGameweekPoints: number;
  freeTransfers: number;
  coins: number;
  Bank: number;
  captain: string;
};

type GameweekTeam = {
  player: string;
  playerName?: string;
};

export default function TeamPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selected, setSelected] = useState<Manager | null>(null);
  const [squad, setSquad] = useState<GameweekTeam[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(true);
  const [loadingSquad, setLoadingSquad] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "userTeams"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Manager));
      setManagers(data.sort((a, b) => (b.Totalpoints ?? 0) - (a.Totalpoints ?? 0)));
      setLoadingManagers(false);
    };
    fetch();
  }, []);

  const selectManager = async (manager: Manager) => {
    setSelected(manager);
    setLoadingSquad(true);
    setSquad([]);

    // fetch latest gameweek team for this manager
    try {
      const snap = await getDocs(collection(db, "gameweekTeams"));
      const managerTeams = snap.docs
        .filter(d => d.data().owner === manager.id || d.data().managerId === manager.id)
        .sort((a, b) => (b.data().gameweek ?? 0) - (a.data().gameweek ?? 0));

      if (managerTeams.length > 0) {
        const latest = managerTeams[0].data();
        const players = latest.players ?? latest.team ?? [];
        setSquad(players.map((p: string | GameweekTeam) =>
          typeof p === "string" ? { player: p } : p
        ));
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingSquad(false);
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>My Team</h1>

      {!selected ? (
        <>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>Select a manager to view their squad:</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            {loadingManagers ? (
              <p style={{ color: "var(--text-muted)" }}>Loading...</p>
            ) : managers.map(m => (
              <div key={m.id} onClick={() => selectManager(m)} style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1.25rem",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div style={{ fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.5rem" }}>{m.namez}</div>
                <div style={{ color: "var(--accent)", fontWeight: 700 }}>{m.Totalpoints ?? 0} pts</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                  GW: {m.totalGameweekPoints ?? 0} pts
                </div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Coins: {m.coins ?? 0}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => { setSelected(null); setSquad([]); }} style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            cursor: "pointer",
            marginBottom: "1.5rem",
          }}>
            ← Back
          </button>

          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            gap: "1rem",
          }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Manager</div>
              <div style={{ fontWeight: 700, fontSize: "1.2rem" }}>{selected.namez}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Total Points</div>
              <div style={{ fontWeight: 700, color: "var(--accent)", fontSize: "1.2rem" }}>{selected.Totalpoints ?? 0}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>GW Points</div>
              <div style={{ fontWeight: 700 }}>{selected.totalGameweekPoints ?? 0}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Free Transfers</div>
              <div style={{ fontWeight: 700 }}>{selected.freeTransfers ?? 0}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Coins</div>
              <div style={{ fontWeight: 700 }}>{selected.coins ?? 0}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Bank</div>
              <div style={{ fontWeight: 700 }}>{selected.Bank ?? 0}</div>
            </div>
          </div>

          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>Current Squad</h2>
          {loadingSquad ? (
            <p style={{ color: "var(--text-muted)" }}>Loading squad...</p>
          ) : squad.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No squad data found.</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem" }}>
              {squad.map((p, i) => (
                <div key={i} style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "1rem",
                  textAlign: "center",
                }}>
                  <div style={{ fontWeight: 600 }}>{p.playerName ?? p.player}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
