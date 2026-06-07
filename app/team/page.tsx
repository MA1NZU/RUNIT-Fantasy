"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type Player = { id: string; name: string; game: string; price: number; points: number; desc: string; image?: string; ID?: string; };
type GWTeam = { id: string; gameweek: number; player1: string; player2: string; player3: string; player4: string; captain: string; sub: string; gwPoints: number; transfersMade: number; transferPenalty: number; ownerEmail: string; };

const CURRENT_GW = 7;

function PlayerCard({ player, points, isCaptain, isSub }: { player: Player; points: number; isCaptain?: boolean; isSub?: boolean }) {
  const isUnfit = player.desc !== "Fit to play";
  
  return (
    <div style={{ 
      background: "var(--surface)", 
      border: `1px solid ${isUnfit ? "var(--red)" : isCaptain ? "var(--blue)" : "var(--border)"}`, 
      borderRadius: "12px", 
      padding: "0.6rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      position: "relative",
      width: "100%"
    }}>
      <div style={{ position: "absolute", top: "0.4rem", left: "0.4rem", display: "flex", flexDirection: "column", gap: "0.2rem", zIndex: 2 }}>
        {isCaptain && <span style={{ background: "var(--blue)", color: "#fff", fontSize: "0.55rem", fontWeight: 700, padding: "0.1rem 0.3rem", borderRadius: "3px" }}>C</span>}
        {isSub && <span style={{ background: "#333", color: "#fff", fontSize: "0.55rem", fontWeight: 700, padding: "0.1rem 0.3rem", borderRadius: "3px" }}>SUB</span>}
      </div>

      <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "8px", overflow: "hidden", background: "#222", marginBottom: "0.5rem" }}>
        {player.image ? (
          <img src={player.image} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", fontWeight: 700, color: "#444" }}>
            {player.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.1rem", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</div>
      <div style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 700, marginBottom: "0.2rem" }}>
        {isCaptain ? points * 2 : points} pts {isCaptain && "(x2)"}
      </div>
      <div style={{ fontSize: "0.65rem", color: isUnfit ? "var(--red)" : "var(--text-muted)", height: "1.5rem", overflow: "hidden", fontWeight: isUnfit ? 600 : 400 }}>{player.desc}</div>
    </div>
  );
}

export default function TeamPage() {
  const { user } = useAuth();
  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [gwTeams, setGwTeams] = useState<GWTeam[]>([]);
  const [matchStats, setMatchStats] = useState<Record<string, number>>({});
  const [selectedGW, setSelectedGW] = useState<number>(CURRENT_GW);
  const [loading, setLoading] = useState(true);

  // Load Players and Teams
  useEffect(() => {
    async function loadBaseData() {
      if (!user?.email) return;
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

        if (teams.length > 0) {
          const validTeams = teams.filter(t => t.gameweek <= CURRENT_GW);
          if (validTeams.length > 0) setSelectedGW(validTeams[0].gameweek);
        }
      } catch (err) { console.error(err); }
    }
    loadBaseData();
  }, [user]);

  // Load Match Stats when selectedGW changes
  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        // Query handling both number and string gameweek types
        const statsSnap = await getDocs(query(
          collection(db, "playerMatchStats"), 
          where("gameweek", "in", [selectedGW, String(selectedGW)])
        ));
        
        const statsMap: Record<string, number> = {};
        statsSnap.docs.forEach(d => {
          const data = d.data();
          const pts = Number(data.gwPoints || 0);
          // Map by any field that might hold the player's ID/UUID
          if (data.playerId) statsMap[data.playerId] = pts;
          if (data.playerID) statsMap[data.playerID] = pts;
          if (data.ID) statsMap[data.ID] = pts;
          if (data.id) statsMap[data.id] = pts;
        });
        setMatchStats(statsMap);
      } catch (err) { 
        console.error("Error loading match stats:", err); 
      } finally { 
        setLoading(false); 
      }
    }
    loadStats();
  }, [selectedGW]);

  const currentTeam = gwTeams.find((t) => t.gameweek === selectedGW);
  const availableGWs = Array.from(new Set(gwTeams.map(t => t.gameweek)))
    .filter(gw => gw <= CURRENT_GW)
    .sort((a, b) => b - a);
    
  const playerIds = currentTeam ? [currentTeam.player1, currentTeam.player2, currentTeam.player3, currentTeam.player4].filter(Boolean) : [];
  
  const getPlayer = (id: string) => players[id];
  const getPoints = (id: string) => {
    const p = players[id];
    // Check matchStats by direct ID or by the internal UUID (p.ID)
    return matchStats[id] ?? (p?.ID ? matchStats[p.ID] : 0);
  };
  const isCaptain = (id: string) => currentTeam?.captain === id;

  if (loading && Object.keys(players).length === 0) return <Shell><p style={{ padding: "2rem" }}>Loading...</p></Shell>;

  return (
    <Shell>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>My Team</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Viewing Gameweek {selectedGW}</p>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          {availableGWs.map((gw) => (
            <button key={gw} onClick={() => setSelectedGW(gw)} style={{ padding: "0.4rem 0.9rem", borderRadius: "8px", border: "1px solid var(--border)", background: selectedGW === gw ? "var(--blue)" : "var(--surface)", color: selectedGW === gw ? "#fff" : "var(--text-muted)", cursor: "pointer", fontWeight: 600 }}>GW{gw}</button>
          ))}
        </div>

        {currentTeam ? (
          <div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem 1.5rem", marginBottom: "2rem", display: "flex", gap: "2rem", flexWrap: "wrap" }}>
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
                <div style={{ fontWeight: 700, fontSize: "1.4rem", color: currentTeam.transferPenalty ? "var(--red)" : "var(--text)" }}>{currentTeam.transferPenalty ?? 0}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
              {playerIds.map((pid, i) => (
                <PlayerCard key={i} player={getPlayer(pid)!} points={getPoints(pid)} isCaptain={isCaptain(pid)} />
              ))}
            </div>
            
            {currentTeam.sub && getPlayer(currentTeam.sub) && (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ width: "23.5%" }}>
                  <div style={{ textAlign: "center", marginBottom: "0.5rem", fontSize: "0.7rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Substitute</div>
                  <PlayerCard player={getPlayer(currentTeam.sub)!} points={getPoints(currentTeam.sub)} isSub={true} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>No team history found for GW{selectedGW}.</p>
        )}
      </div>
    </Shell>
  );
}
