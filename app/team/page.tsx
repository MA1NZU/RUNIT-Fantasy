"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";

type Player = {
  id: string;
  Title: string;
  game: string;
};

type GWTeam = {
  id: string;
  gameweek: number;
  player1: string;
  player2: string;
  player3: string;
  player4: string;
  captain: string;
  sub: string;
  gwPoints: number;
  transfersMade: number;
  transferPenalty: number;
  ownerEmail: string;
};

const MANAGERS = [
  { name: "MainZ",      email: "yahyaayman2006@gmail.com" },
  { name: "Nono",       email: "noursherif764@gmail.com" },
  { name: "Basel",      email: "baselkamel23@gmail.com" },
  { name: "Fizz",       email: "anasvolt10@gmail.com" },
  { name: "Eltabae",    email: "omartoty2018@gmail.com" },
  { name: "A Sabry",    email: "abdalrahmansabry07@gmail.com" },
  { name: "FireyWater", email: "aromatic3211@gmail.com" },
  { name: "Utopia",     email: "omaraafat2003@gmail.com" },
  { name: "Ronin",      email: "mohammedehab3000@gmail.com" },
  { name: "Rio",        email: "the7man121@gmail.com" },
  { name: "Panda",      email: "loujyamr84@gmail.com" },
  { name: "Yousef",     email: "yousefnano2005@gmail.com" },
  { name: "Maro",       email: "marwansalah792006@gmail.com" },
];

export default function TeamPage() {
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [selectedManager, setSelectedManager] = useState("");
  const [gwTeams, setGwTeams] = useState<GWTeam[]>([]);
  const [selectedGW, setSelectedGW] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDocs(collection(db, "players")).then((snap) => {
      const map: Record<string, Player> = {};
      snap.docs.forEach((d) => {
        map[d.id] = { id: d.id, ...d.data() } as Player;
      });
      setPlayers(map);
    });
  }, []);

  useEffect(() => {
    if (!selectedManager) return;
    setLoading(true);
    setGwTeams([]);
    setSelectedGW(null);

    getDocs(
      query(
        collection(db, "gameweekTeams"),
        where("ownerEmail", "==", selectedManager),
        orderBy("gameweek", "desc")
      )
    ).then((snap) => {
      const teams = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GWTeam));
      setGwTeams(teams);
      if (teams.length > 0) setSelectedGW(teams[0].gameweek);
      setLoading(false);
    });
  }, [selectedManager]);

  const currentTeam = gwTeams.find((t) => t.gameweek === selectedGW);
  const playerIds = currentTeam
    ? [currentTeam.player1, currentTeam.player2, currentTeam.player3, currentTeam.player4]
    : [];

  const getPlayerName = (id: string) => players[id]?.Title ?? id;
  const isCaptain = (id: string) => currentTeam?.captain === id;

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>My Team</h1>

      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" }}>
          Select Manager
        </label>
        <select
          value={selectedManager}
          onChange={(e) => setSelectedManager(e.target.value)}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            color: "var(--text)",
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            fontSize: "1rem",
            cursor: "pointer",
            width: "100%",
          }}
        >
          <option value="">— Select a manager —</option>
          {MANAGERS.map((m) => (
            <option key={m.email} value={m.email}>{m.name}</option>
          ))}
        </select>
      </div>

      {gwTeams.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" }}>
            Gameweek
          </label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {gwTeams.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedGW(t.gameweek)}
                style={{
                  padding: "0.4rem 0.9rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  border: "1px solid var(--border)",
                  fontWeight: 600,
                  background: selectedGW === t.gameweek ? "var(--accent)" : "var(--surface)",
                  color: selectedGW === t.gameweek ? "#000" : "var(--text)",
                }}
              >
                GW{t.gameweek}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading...</p>}

      {currentTeam && (
        <div>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "10px",
            padding: "1rem 1.5rem",
            marginBottom: "1.5rem",
            display: "flex",
            gap: "2rem",
            flexWrap: "wrap",
          }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>GW Points</div>
              <div style={{ fontWeight: 700, fontSize: "1.3rem", color: "var(--accent)" }}>
                {currentTeam.gwPoints ?? 0}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Transfers Made</div>
              <div style={{ fontWeight: 700, fontSize: "1.3rem" }}>{currentTeam.transfersMade ?? 0}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Transfer Penalty</div>
              <div style={{
                fontWeight: 700,
                fontSize: "1.3rem",
                color: currentTeam.transferPenalty ? "var(--red)" : "var(--text)",
              }}>
                {currentTeam.transferPenalty ?? 0}
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
            Squad — Gameweek {currentTeam.gameweek}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {playerIds.map((pid, i) => (
              <div
                key={i}
                style={{
                  background: "var(--surface)",
                  border: `1px solid ${isCaptain(pid) ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "10px",
                  padding: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{getPlayerName(pid)}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {players[pid]?.game ?? ""}
                  </div>
                </div>
                {isCaptain(pid) && (
                  <span style={{
                    background: "var(--accent)",
                    color: "#000",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                  }}>
                    C
                  </span>
                )}
              </div>
            ))}
          </div>

          {currentTeam.sub && (
            <div style={{ marginTop: "0.75rem" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                Substitute
              </div>
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem",
              }}>
                <div style={{ fontWeight: 600 }}>{getPlayerName(currentTeam.sub)}</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {players[currentTeam.sub]?.game ?? ""}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
