"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type Player = { id: string; name: string; game: string; price: number; points: number; desc: string; image?: string; };
type GWTeam = { id: string; gameweek: number; player1: string; player2: string; player3: string; player4: string; captain: string; sub: string; gwPoints: number; transfersMade: number; transferPenalty: number; ownerEmail: string; };

const CURRENT_GW = 7;

function PlayerCard({ player, isCaptain, isSub }: { player: Player; isCaptain?: boolean; isSub?: boolean }) {
  return (
    <div style={{ 
      background: "var(--surface)", 
      border: `1px solid ${isCaptain ? "var(--blue)" : "var(--border)"}`, 
      borderRadius: "12px", 
      padding: "0.75rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      position: "relative"
    }}>
      <div style={{ position: "absolute", top: "0.5rem", left: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem", zIndex: 2 }}>
        {isCaptain && <span style={{ background: "var(--blue)", color: "#fff", fontSize: "0.6rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "4px" }}>C</span>}
        {isSub && <span style={{ background: "#333", color: "#fff", fontSize: "0.6rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "4px" }}>SUB</span>}
      </div>

      <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "8px", overflow: "hidden", background: "#222", marginBottom: "0.75rem" }}>
        {player.image ? (
          <img src={player.image} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 700, color: "#444" }}>
            {player.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.2rem", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</div>
      <div style={{ fontSize: "0.9rem", color: "var(--accent)", fontWeight: 700, marginBottom: "0.3rem" }}>
        {isCaptain ? player.points * 2 : player.points} pts {isCaptain && "(x2)"}
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{player.desc}</div>
    </div>
  );
}

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
        const playersSnap = await getDocs(collection(db, "players"));
        const playersMap: Record<string, Player> = {};
        playersSnap.docs.forEach((d) => {
          const data = d.data();
          const p = { id: d.id, ...data } as Player;
          playersMap[d.id] = p;
          if (data.ID) playersMap[data.ID] = p;
        });
        setPlayers(playersMap);

        const teamsSnap = await getDocs(query(collection(db, "gameweekTeams"), where("ownerEmail", "==", user.email), orderBy("gameweek", "desc")));
        const teams = teamsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as GWTeam));
        setGwTeams(teams);

        if (teams.length > 0 && !teams.find(t => t.gameweek === CURRENT_GW)) {
          setSelectedGW(teams[0].gameweek);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }
    loadData();
  }, [user]);

  const currentTeam = gwTeams.find((t) => t.gameweek === selectedGW);
  const availableGWs = Array.from(new Set(gwTeams.map(t => t.gameweek))).sort((a, b) => b - a);
  const playerIds = currentTeam ? [currentTeam.player1, currentTeam.player2, currentTeam.player3, currentTeam.player4].filter(Boolean) : [];

  const getPlayer = (id: string) => players[id];
  const isCaptain = (id: string) => currentTeam?.captain === id;

  if (loading) return <Shell><div style={{ maxWidth: "700px", margin: "0 auto" }}><h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>My Team</h1><p>Loading...</p></div></Shell>;

  return (
    <Shell>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>My Team</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem", fontSize: "0.9rem" }}>Viewing Gameweek {selectedGW}</p>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {availableGWs.map((gw) => (
            <button key={gw} onClick={() => setSelectedGW(gw)} style={{ padding: "0.4rem 0.9rem", borderRadius: "6px", border: "1px solid var(--border)", background: selectedGW === gw ? "var(--blue)" : "var(--surface)", color: selectedGW === gw ? "#fff" : "var(--text-muted)" }}>GW{gw}</button>
          ))}
        </div>

        {currentTeam && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              {playerIds.map((pid, i) => (
                <PlayerCard key={i} player={getPlayer(pid)!} isCaptain={isCaptain(pid)} />
              ))}
            </div>
            {currentTeam.sub && getPlayer(currentTeam.sub) && (
              <div style={{ width: "50%", margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: "0.5rem", fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Substitute</div>
                <PlayerCard player={getPlayer(currentTeam.sub)!} isSub={true} />
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
