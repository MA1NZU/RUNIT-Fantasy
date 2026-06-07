"use client";

import { useEffect, useState, Suspense } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";
import { useSearchParams } from "next/navigation";

type Player = { id: string; name: string; game: string; price: number; points: number; desc: string; image?: string; ID?: string; };
type GWTeam = { id: string; gameweek: number; player1: string; player2: string; player3: string; player4: string; captain: string; sub: string; gwPoints: number; transfersMade: number; transferPenalty: number; ownerEmail: string; };

function PlayerCard({ player, points, isCaptain, isSub }: { player: Player; points: number; isCaptain?: boolean; isSub?: boolean }) {
  const isUnfit = player.desc !== "Fit to play";
  return (
    <div style={{ background: "var(--surface)", border: `1px solid ${isUnfit ? "var(--red)" : isCaptain ? "var(--blue)" : "var(--border)"}`, borderRadius: "12px", padding: "0.6rem", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", width: "100%" }}>
      <div style={{ position: "absolute", top: "0.4rem", left: "0.4rem", display: "flex", flexDirection: "column", gap: "0.2rem", zIndex: 2 }}>
        {isCaptain && <span style={{ background: "var(--blue)", color: "#fff", fontSize: "0.55rem", fontWeight: 700, padding: "0.1rem 0.3rem", borderRadius: "3px" }}>C</span>}
        {isSub && <span style={{ background: "#333", color: "#fff", fontSize: "0.55rem", fontWeight: 700, padding: "0.1rem 0.3rem", borderRadius: "3px" }}>SUB</span>}
      </div>
      <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "8px", overflow: "hidden", background: "#222", marginBottom: "0.5rem" }}>
        {player.image ? <img src={player.image} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#444" }}>{player.name.slice(0, 1)}</div>}
      </div>
      <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{player.name}</div>
      <div style={{ fontSize: "0.8rem", color: "var(--accent)", fontWeight: 700, marginBottom: "0.2rem" }}>{isCaptain ? points * 2 : points} pts {isCaptain && "(x2)"}</div>
      <div style={{ fontSize: "0.65rem", color: isUnfit ? "var(--red)" : "var(--text-muted)", height: "1.5rem", overflow: "hidden" }}>{player.desc}</div>
    </div>
  );
}

function TeamContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get("email");
  const targetEmail = queryEmail || user?.email;
  const isOwnTeam = !queryEmail || queryEmail === user?.email;

  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [gwTeams, setGwTeams] = useState<GWTeam[]>([]);
  const [matchStats, setMatchStats] = useState<Record<string, number>>({});
  const [currentGW, setCurrentGW] = useState<number>(7);
  const [selectedGW, setSelectedGW] = useState<number>(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetEmail) return;
    const loadData = async () => {
      setLoading(true);
      setGwTeams([]); // Clear old state immediately
      try {
        const settingsSnap = await getDocs(collection(db, "settings"));
        let activeGW = 7;
        if (!settingsSnap.empty) {
          activeGW = settingsSnap.docs[0].data().currentGameweek || 7;
          setCurrentGW(activeGW);
          setSelectedGW(activeGW);
        }

        const pSnap = await getDocs(collection(db, "players"));
        const pMap: Record<string, Player> = {};
        pSnap.docs.forEach(d => {
          const data = d.data();
          const p = { id: d.id, ...data } as Player;
          pMap[d.id] = p;
          if (data.ID) pMap[data.ID] = p;
        });
        setPlayers(pMap);

        const teamsSnap = await getDocs(query(collection(db, "gameweekTeams"), where("ownerEmail", "==", targetEmail), orderBy("gameweek", "desc")));
        const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as GWTeam));
        setGwTeams(teams);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    loadData();
  }, [targetEmail]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsSnap = await getDocs(query(collection(db, "playerMatchStats"), where("gameweek", "==", selectedGW)));
        const sMap: Record<string, number> = {};
        statsSnap.docs.forEach(d => { if (d.data().Title) sMap[d.data().Title] = Number(d.data().gwPoints || 0); });
        setMatchStats(sMap);
      } catch (err) { console.error(err); }
    };
    loadStats();
  }, [selectedGW]);

  const currentTeam = gwTeams.find(t => t.gameweek === selectedGW);
  const availableGWs = Array.from(new Set(gwTeams.map(t => t.gameweek))).filter(gw => gw <= currentGW).sort((a, b) => b - a);
  const playerIds = currentTeam ? [currentTeam.player1, currentTeam.player2, currentTeam.player3, currentTeam.player4].filter(Boolean) : [];
  const getPoints = (id: string) => players[id] ? (matchStats[players[id].name] ?? 0) : 0;

  if (loading && gwTeams.length === 0) return <p style={{ padding: "2rem" }}>Loading Squad...</p>;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>{isOwnTeam ? "My Team" : "Manager Squad"}</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Viewing {targetEmail}</p>
      
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {availableGWs.map(gw => <button key={gw} onClick={() => setSelectedGW(gw)} style={{ padding: "0.4rem 0.9rem", borderRadius: "8px", border: "1px solid var(--border)", background: selectedGW === gw ? "var(--blue)" : "var(--surface)", color: "#fff", cursor: "pointer" }}>GW{gw}</button>)}
      </div>

      {currentTeam ? (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
            {playerIds.map((pid, i) => <PlayerCard key={i} player={players[pid]!} points={getPoints(pid)} isCaptain={currentTeam.captain === pid} />)}
          </div>
          {currentTeam.sub && players[currentTeam.sub] && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ width: "23.5%" }}>
                <div style={{ textAlign: "center", marginBottom: "0.5rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>SUBSTITUTE</div>
                <PlayerCard player={players[currentTeam.sub]!} points={getPoints(currentTeam.sub)} isSub={true} />
              </div>
            </div>
          )}
        </div>
      ) : <p style={{ color: "var(--text-muted)" }}>No squad data found for GW{selectedGW}.</p>}
    </div>
  );
}

export default function TeamPage() {
  return (<Shell><Suspense fallback={<p>Loading...</p>}><TeamContent /></Suspense></Shell>);
}
