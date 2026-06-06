"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

type Player = {
  id: string;
  name: string;
  game: string;
  price: number;
  points: number;
  totalPoints: number;
  desc: string;
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

const CURRENT_GW = 7;

export default function TeamPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [gwTeams, setGwTeams] = useState<GWTeam[]>([]);
  const [selectedGW, setSelectedGW] = useState<number>(CURRENT_GW);
  const [loading, setLoading] = useState(true);

  // load all players for name lookup
  useEffect(() => {
    getDocs(collection(db, "players")).then((snap) => {
      const map: Record<string, Player> = {};
      snap.docs.forEach((d) => {
        map[d.id] = { id: d.id, ...d.data() } as Player;
      });
      setPlayers(map);
    });
  }, []);

  // load this manager's gameweek teams
  useEffect(() => {
    if (!user?.email) return;
    setLoading(true);

    getDocs(
      query(
        collection(db, "gameweekTeams"),
        where("ownerEmail", "==", user.email),
        orderBy("gameweek", "desc")
      )
    ).then((snap) => {
      const teams = snap.docs.map((d) => ({ id: d.id, ...d.data() } as GWTeam));
      setGwTeams(teams);
      setLoading(false);
    });
  }, [user]);

  const currentTeam = gwTeams.find((t) => t.gameweek === selectedGW);
  const availableGWs = gwTeams
    .filter((t) => t.gameweek <= CURRENT_GW)
    .map((t) => t.gameweek)
    .sort((a, b) => b - a);

  const getPlayer = (id: string) => players[id];
  const getPlayerName = (id: string) => players[id]?.name ?? "Unknown";
  const isCaptain = (id: string) => currentTeam?.captain === id;

  const playerIds = currentTeam
    ? [currentTeam.player1, currentTeam.player2, currentTeam.player3, currentTeam.player4]
    : [];

  if (loading) {
    return (
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>My Team</h1>
        <p style={{ color: "var(--text-muted)" }}>Loading your team...</p>
      </div>
    );
  }

  if (gwTeams.length === 0) {
    return (
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>My Team</h1>
        <p style={{ color: "var(--text-muted)" }}>No team found for your account.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>My Team</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Viewing Gameweek {selectedGW} {selectedGW === CURRENT_GW ? "(Current)" : ""}
      </p>

      {/* Gameweek selector */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ color: "var(--text-muted)", fontSize: "0.85rem", display: "block", marginBottom: "0.5rem" }}>
          Gameweek
        </label>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {availableGWs.map((gw) => (
            <button
              key={gw}
              onClick={() => setSelectedGW(gw)}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "6px",
                cursor: "pointer",
                border: "1px solid var(--border)",
                fontWeight: 600,
                background: selectedGW === gw ? "var(--accent)" : "var(--surface)",
                color: selectedGW === gw ? "#000" : "var(--text)",
              }}
            >
              GW{gw} {gw === CURRENT_GW ? "★" : ""}
            </button>
          ))}
        </div>
      </div>

      {!currentTeam ? (
        <p style={{ color: "var(--text-muted)" }}>No data for GW{selectedGW}.</p>
      ) : (
        <div>
          {/* Stats bar */}
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
              <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "var(--accent)" }}>
                {currentTeam.gwPoints ?? 0}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Transfers Made</div>
              <div style={{ fontWeight: 700, fontSize: "1.4rem" }}>
                {currentTeam.transfersMade ?? 0}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Transfer Penalty</div>
              <div style={{
                fontWeight: 700,
                fontSize: "1.4rem",
                color: currentTeam.transferPenalty ? "var(--red)" : "var(--text)",
              }}>
                {currentTeam.transferPenalty ?? 0}
              </div>
            </div>
          </div>

          {/* Squad */}
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Squad</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
            {playerIds.map((pid, i) => {
              const p = getPlayer(pid);
              return (
                <div key={i} style={{
                  background: "var(--surface)",
                  border: `1px solid ${isCaptain(pid) ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "10px",
                  padding: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{getPlayerName(pid)}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                      {p?.game ?? ""} · {p?.desc ?? ""}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--accent)", marginTop: "0.2rem", fontWeight: 600 }}>
                      {p?.points ?? 0} pts this GW
                    </div>
                  </div>
                  {isCaptain(pid) && (
                    <span style={{
                      background: "var(--accent)",
                      color: "#000",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "0.25rem 0.6rem",
                      borderRadius: "4px",
                      flexShrink: 0,
                    }}>
                      C
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sub */}
          {currentTeam.sub && (
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "0.4rem" }}>
                Substitute
              </div>
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{getPlayerName(currentTeam.sub)}</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    {getPlayer(currentTeam.sub)?.game ?? ""} · {getPlayer(currentTeam.sub)?.desc ?? ""}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--accent)", marginTop: "0.2rem", fontWeight: 600 }}>
                    {getPlayer(currentTeam.sub)?.points ?? 0} pts this GW
                  </div>
                </div>
                <span style={{
                  background: "var(--border)",
                  color: "var(--text-muted)",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  padding: "0.25rem 0.6rem",
                  borderRadius: "4px",
                }}>
                  SUB
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
