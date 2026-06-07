"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, doc, updateDoc, addDoc } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type Player = { id: string; name: string; game: string; price: number; points: number; totalPoints: number; desc: string; image?: string; };
type GWTeam = { id: string; gameweek: number; player1: string; player2: string; player3: string; player4: string; captain: string; sub: string; gwPoints: number; transfersMade: number; transferPenalty: number; ownerEmail: string; };
type UserTeam = { id: string; Bank: number; freeTransfers: number; namez: string; ownerEmail: string; };

const NEXT_GW = 8;

function PlayerCard({ 
  player, 
  isCaptain, 
  isSub, 
  onCaptain, 
  onSub, 
  onRemove,
  showDesc = true 
}: { 
  player: Player; 
  isCaptain?: boolean; 
  isSub?: boolean; 
  onCaptain?: () => void; 
  onSub?: () => void; 
  onRemove?: () => void;
  showDesc?: boolean;
}) {
  return (
    <div style={{ 
      background: "var(--surface)", 
      border: `1px solid ${isCaptain ? "var(--blue)" : "var(--border)"}`, 
      borderRadius: "12px", 
      padding: "0.6rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      position: "relative",
      transition: "transform 0.2s"
    }}>
      {/* Badge container */}
      <div style={{ position: "absolute", top: "0.5rem", left: "0.5rem", display: "flex", flexDirection: "column", gap: "0.25rem", zIndex: 2 }}>
        {isCaptain && <span style={{ background: "var(--blue)", color: "#fff", fontSize: "0.6rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "4px" }}>C</span>}
        {isSub && <span style={{ background: "#333", color: "#fff", fontSize: "0.6rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "4px" }}>SUB</span>}
      </div>

      {/* Image */}
      <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "8px", overflow: "hidden", background: "#222", marginBottom: "0.6rem" }}>
        {player.image ? (
          <img src={player.image} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 700, color: "#444" }}>
            {player.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.2rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
        {player.name}
      </div>
      <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.2rem" }}>
        {player.price}
      </div>
      {showDesc && (
        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.6rem" }}>
          {player.desc}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.3rem", width: "100%", marginTop: "auto" }}>
        {onCaptain && (
          <button 
            onClick={onCaptain}
            style={{ flex: 1, background: isCaptain ? "var(--blue)" : "var(--surface)", color: isCaptain ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.25rem 0", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer" }}
          >C</button>
        )}
        {onSub && (
          <button 
            onClick={onSub}
            style={{ flex: 1, background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.25rem 0", fontSize: "0.65rem", fontWeight: 700, cursor: "pointer" }}
          >SUB</button>
        )}
        {onRemove && (
          <button 
            onClick={onRemove}
            style={{ flex: 0.5, background: "transparent", color: "var(--red)", border: "1px solid var(--border)", borderRadius: "4px", cursor: "pointer" }}
          >✕</button>
        )}
      </div>
    </div>
  );
}

export default function TransfersPage() {
  const { user } = useAuth();
  const [playerMap, setPlayerMap] = useState<Record<string, Player>>({});
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [currentGWTeam, setCurrentGWTeam] = useState<GWTeam | null>(null);
  const [nextGWTeam, setNextGWTeam] = useState<GWTeam | null>(null);
  const [squad, setSquad] = useState<string[]>([]);
  const [captain, setCaptain] = useState<string>("");
  const [sub, setSub] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.email) return;
    const load = async () => {
      const playersSnap = await getDocs(collection(db, "players"));
      const map: Record<string, Player> = {};
      const list: Player[] = [];
      playersSnap.docs.forEach(d => {
        const data = d.data();
        const p = { id: d.id, ...data } as Player;
        map[d.id] = p;
        if (data.ID) map[data.ID] = p;
        list.push(p);
      });
      setPlayerMap(map);
      setAllPlayers(list.sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0)));

      const userTeamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", user.email)));
      if (!userTeamSnap.empty) {
        setUserTeam({ id: userTeamSnap.docs[0].id, ...userTeamSnap.docs[0].data() } as UserTeam);
      }

      const gwSnap = await getDocs(query(collection(db, "gameweekTeams"), where("ownerEmail", "==", user.email), orderBy("gameweek", "desc")));
      const gwTeams = gwSnap.docs.map(d => ({ id: d.id, ...d.data() } as GWTeam));
      const current = gwTeams.find(t => t.gameweek === NEXT_GW - 1);
      const next = gwTeams.find(t => t.gameweek === NEXT_GW);

      setCurrentGWTeam(current ?? null);
      setNextGWTeam(next ?? null);

      const base = next ?? current;
      if (base) {
        setSquad([base.player1, base.player2, base.player3, base.player4].filter(Boolean));
        setCaptain(base.captain ?? "");
        setSub(base.sub ?? "");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const getPlayer = (id: string) => playerMap[id];
  const budget = userTeam?.Bank ?? 0;
  const allSelected = [...squad, ...(sub ? [sub] : [])];
  const totalCost = allSelected.reduce((sum, id) => sum + (getPlayer(id)?.price ?? 0), 0);
  const remaining = budget - totalCost;
  const squadCount = squad.length + (sub ? 1 : 0);

  const transfersMade = (() => {
    if (!currentGWTeam) return 0;
    const prev = [currentGWTeam.player1, currentGWTeam.player2, currentGWTeam.player3, currentGWTeam.player4, currentGWTeam.sub].filter(Boolean);
    return allSelected.filter(id => !prev.includes(id)).length;
  })();

  const freeTransfers = userTeam?.freeTransfers ?? 1;
  const penalty = Math.max(0, transfersMade - freeTransfers) * 4;

  const handlePlayerClick = (p: Player) => {
    setError("");
    if (squad.includes(p.id)) {
      setSquad(squad.filter(id => id !== p.id));
      if (captain === p.id) setCaptain("");
      return;
    }
    if (sub === p.id) { setSub(""); return; }

    const newCost = totalCost + p.price;
    if (newCost > budget) { setError(`Not enough budget for ${p.name}.`); return; }

    if (squad.length < 4) {
      setSquad(prev => [...prev, p.id]);
    } else if (!sub) {
      setSub(p.id);
    } else {
      setError("Squad is full. Remove a player first.");
    }
  };

  const removeFromSquad = (id: string) => {
    setSquad(squad.filter(p => p !== id));
    if (captain === id) setCaptain("");
  };

  const swapWithSub = (pid: string) => {
    const currentSub = sub;
    const newSquad = squad.map(id => id === pid ? currentSub : id).filter(Boolean);
    setSquad(newSquad);
    setSub(pid);
    if (captain === pid) setCaptain("");
  };

  const makeStarter = () => {
    if (!sub) return;
    if (squad.length < 4) {
      setSquad(prev => [...prev, sub]);
      setSub("");
    } else {
      setError("Squad is full. Swap a player to make them a starter.");
    }
  };

  const handleSave = async () => {
    if (squad.length !== 4) { setError("You need exactly 4 players."); return; }
    if (!captain || !squad.includes(captain)) { setError("Set a captain from your 4 players."); return; }
    if (!sub) { setError("Set a substitute."); return; }
    if (remaining < 0) { setError("You are over budget."); return; }

    setSaving(true);
    setError("");
    const data = { 
      player1: squad[0], player2: squad[1], player3: squad[2], player4: squad[3], 
      captain, sub, gameweek: NEXT_GW, ownerEmail: user!.email, 
      gwPoints: 0, transfersMade, transferPenalty: penalty 
    };

    try {
      if (nextGWTeam) {
        await updateDoc(doc(db, "gameweekTeams", nextGWTeam.id), data);
      } else {
        const snap = await addDoc(collection(db, "gameweekTeams"), data);
        setNextGWTeam({ id: snap.id, ...data } as GWTeam);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    }
    setSaving(false);
  };

  if (loading) return (
    <Shell>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Transfers</h1>
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    </Shell>
  );

  return (
    <Shell>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Transfers</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem", fontSize: "0.9rem" }}>Building your squad for Gameweek {NEXT_GW}</p>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
          <div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem", marginBottom: "1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", letterSpacing: "1px", textTransform: "uppercase" }}>Bank</div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{remaining.toFixed(1)}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>of {budget.toFixed(1)}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", letterSpacing: "1px", textTransform: "uppercase" }}>Squad</div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: squadCount === 5 ? "var(--accent)" : "var(--text)" }}>{squadCount}/5</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", letterSpacing: "1px", textTransform: "uppercase" }}>Penalty</div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: penalty > 0 ? "var(--red)" : "var(--text)" }}>{penalty > 0 ? `-${penalty} pts` : "None"}</div>
              </div>
            </div>

            <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Squad ({squad.length}/4)
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {squad.map(pid => {
                const p = getPlayer(pid);
                if (!p) return null;
                return (
                  <PlayerCard 
                    key={pid}
                    player={p}
                    isCaptain={captain === pid}
                    onCaptain={() => setCaptain(pid === captain ? "" : pid)}
                    onSub={() => swapWithSub(pid)}
                    onRemove={() => removeFromSquad(pid)}
                  />
                );
              })}
              {squad.length < 4 && Array.from({ length: 4 - squad.length }).map((_, i) => (
                <div key={i} style={{ aspectRatio: "2/3", border: "1px dashed var(--border)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Add Player
                </div>
              ))}
            </div>

            <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "0.5rem" }}>Substitute</div>
            <div style={{ marginBottom: "1.5rem" }}>
              {sub && getPlayer(sub) ? (
                <div style={{ width: "50%" }}>
                  <PlayerCard 
                    player={getPlayer(sub)!}
                    isSub={true}
                    onCaptain={makeStarter}
                    onRemove={() => setSub("")}
                  />
                </div>
              ) : (
                <div style={{ background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: "12px", padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  {squad.length === 4 ? "Select sub →" : "Fill squad first"}
                </div>
              )}
            </div>

            {error && <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}
            
            <button onClick={handleSave} disabled={saving} style={{ width: "100%", background: saved ? "var(--green)" : "var(--blue)", color: "#fff", fontWeight: 700, padding: "0.75rem", borderRadius: "8px", border: "none", fontSize: "1rem", cursor: "pointer" }}>
              {saving ? "Saving..." : saved ? "✓ Saved!" : `Save GW${NEXT_GW} Squad`}
            </button>
          </div>

          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>All Players</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", maxHeight: "80vh", overflowY: "auto", paddingRight: "0.5rem" }}>
              {allPlayers.map(p => {
                const selected = squad.includes(p.id) || sub === p.id;
                const canAfford = selected || remaining >= p.price;
                return (
                  <div key={p.id} onClick={() => canAfford && handlePlayerClick(p)} style={{ cursor: canAfford ? "pointer" : "not-allowed", opacity: canAfford ? 1 : 0.4 }}>
                    <PlayerCard player={p} isCaptain={captain === p.id} isSub={sub === p.id} showDesc={false} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}
