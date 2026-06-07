"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type Player = {
  id: string;
  name: string;
  game: string;
  price: number;
  points: number;
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

  useEffect(() => {
    async function loadData() {
      if (!user?.email) return;
      setLoading(true);

      try {
        // 1. Fetch all players and create a robust mapping
        const playersSnap = await getDocs(collection(db, "players"));
        const playersMap: Record<string, Player> = {};
        playersSnap.docs.forEach((d) => {
          const data = d.data();
          const p = { id: d.id, ...data } as Player;
          // Map by Firestore Document ID
          playersMap[d.id] = p;
          // Map by internal UUID (from the ID column in CSV)
          if (data.ID) playersMap[data.ID] = p;
        });
        setPlayers(playersMap);

        // 2. Fetch all user gameweek teams
        const teamsSnap = await getDocs(
          query(
            collection(db, "gameweekTeams"),
            where("ownerEmail", "==", user.email),
            orderBy("gameweek", "desc")
          )
        );
        const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as GWTeam));
        setGwTeams(teams);

        // Set initial GW to latest available if current isn't found
        if (teams.length > 0 && !teams.find(t => t.gameweek === CURRENT_GW)) {
          setSelectedGW(teams[0].gameweek);
        }
      } catch (err) {
        console.error("Error loading team data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  const currentTeam = gwTeams.find((t) => t.gameweek === selectedGW);
  
  const availableGWs = Array.from(new Set(gwTeams.map(t => t.gameweek)))
    .sort((a, b) => b - a);

  const playerIds = currentTeam
    ? [currentTeam.player1, currentTeam.player2, currentTeam.player3, currentTeam.player4].filter(Boolean)
    : [];

  const getPlayer = (id: string) => players[id];
  const isCaptain = (id: string) => currentTeam?.captain === id;

  if (loading) return (
    <Shell>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>My Team</h1>
        <p style={{ color: "var(--text-muted)" }}>Loading your team...</p>
      </div>
    </Shell>
  );

  if (gwTeams.length === 0) return (
    <Shell>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>My Team</h1>
        <p style={{ color: "var(--text-muted)" }}>No team found for your account.</p>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>My Team</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem", fontSize: "0.9rem" }}>
          Viewing Gameweek {selectedGW} {selectedGW === CURRENT_GW ? "(Current)" : ""}
        </p>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ color: "var(--text-muted)", fontSize: "0.75rem", letterSpacing: "1px", textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>
            Gameweek
          </label>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {availableGWs.map((gw) => (
              <button
                key={gw}
                onClick={() => setSelectedGW(gw)}
                style={{
                  padding: "0.4rem 0.9rem", borderRadius: "6px", cursor: "pointer",
                  border: "1px solid var(--border)", fontWeight: 600,
                  background: selectedGW === gw ? "var(--blue)" : "var(--surface)",
                  color: selectedGW === gw ? "#fff" : "var(--text-muted)",
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
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.5rem", marginBottom: "1.5rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>GW Points</div>
                <div style={{ fontWeight: 700, fontSize: "1.4rem", color: "var(--accent)" }}>{currentTeam.gwPoints ?? 0}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Transfers</div>
                <div style={{ fontWeight: 700, fontSize: "1.4rem" }}>{currentTeam.transfersMade ?? 0}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Penalty</div>
                <div style={{ fontWeight: 700, fontSize: "1.4rem", color: currentTeam.transferPenalty ? "var(--red)" : "var(--text)" }}>
                  {currentTeam.transferPenalty ?? 0}
                </div>
              </div>
            </div>

            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>Starting Squad</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {playerIds.map((pid, i) => {
                const p = getPlayer(pid);
                return (
                  <div key={i} style={{ background: "var(--surface)", border: `1px solid ${isCaptain(pid) ? "var(--blue)" : "var(--border)"}`, borderRadius: "10px", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p?.name ?? "Unknown Player"}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{p?.game ?? ""} · {p?.desc ?? ""}</div>
                      <div style={{ fontSize: "0.85rem", color: "var(--accent)", marginTop: "0.2rem", fontWeight: 600 }}>{p?.points ?? 0} pts</div>
                    </div>
                    {isCaptain(pid) && (
                      <span style={{ background: "var(--blue)", color: "#fff", fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "4px" }}>C</span>
                    )}
                  </div>
                );
              })}
            </div>

            {currentTeam.sub && (
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.5rem" }}>Substitute</div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {getPlayer(currentTeam.sub) ? (
                    <div>
                      <div style={{ fontWeight: 600 }}>{getPlayer(currentTeam.sub)!.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        {getPlayer(currentTeam.sub)!.game} · {getPlayer(currentTeam.sub)!.desc}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "var(--accent)", marginTop: "0.2rem", fontWeight: 600 }}>
                        {getPlayer(currentTeam.sub)!.points} pts
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: "var(--text-muted)" }}>Unknown Player ({currentTeam.sub})</div>
                  )}
                  <span style={{ background: "var(--border)", color: "var(--text-muted)", fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "4px" }}>SUB</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
