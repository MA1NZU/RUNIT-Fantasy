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
  compact = false
}: { 
  player: Player; 
  isCaptain?: boolean; 
  isSub?: boolean; 
  onCaptain?: () => void; 
  onSub?: () => void; 
  onRemove?: () => void;
  compact?: boolean;
}) {
  return (
    <div style={{ 
      background: "var(--surface)", 
      border: `1px solid ${isCaptain ? "var(--blue)" : "var(--border)"}`, 
      borderRadius: "12px", 
      padding: compact ? "0.4rem" : "0.6rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      position: "relative",
      width: "100%",
      minWidth: 0
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

      <div style={{ fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>
        {player.name}
      </div>
      <div style={{ color: "var(--accent)", fontWeight: 700, fontSize: "0.75rem", marginBottom: "0.2rem" }}>
        {player.price}
      </div>
      {!compact && (
        <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginBottom: "0.5rem", height: "1.6rem", overflow: "hidden" }}>
          {player.desc}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.25rem", width: "100%", marginTop: "auto" }}>
        {onCaptain && (
          <button onClick={(e) => { e.stopPropagation(); onCaptain(); }} style={{ flex: 1, background: isCaptain ? "var(--blue)" : "var(--surface)", color: isCaptain ? "#fff" : "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.2rem 0", fontSize: "0.6rem", fontWeight: 700, cursor: "pointer" }}>C</button>
        )}
        {onSub && (
          <button onClick={(e) => { e.stopPropagation(); onSub(); }} style={{ flex: 1, background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: "4px", padding: "0.2rem 0", fontSize: "0.6rem", fontWeight: 700, cursor: "pointer" }}>SUB</button>
        )}
        {onRemove && (
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ flex: 0.4, background: "transparent", color: "var(--red)", border: "1px solid var(--border)", borderRadius: "4px", cursor: "pointer", fontSize: "0.7rem" }}>✕</button>
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
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handlePlayerSelect = (p: Player) => {
    if (allSelected.includes(p.id)) return;
    if (totalCost + p.price > budget) { setError(`Budget exceeded.`); return; }
    
    if (squad.length < 4) {
      setSquad([...squad, p.id]);
    } else if (!sub) {
      setSub(p.id);
    }
    setIsModalOpen(false);
    setError("");
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

  const handleSave = async () => {
    if (squad.length !== 4 || !sub || !captain) { setError("Complete your squad first."); return; }
    setSaving(true);
    const data = { player1: squad[0], player2: squad[1], player3: squad[2], player4: squad[3], captain, sub, gameweek: NEXT_GW, ownerEmail: user!.email, gwPoints: 0, transfersMade, transferPenalty: penalty };
    try {
      if (nextGWTeam) await updateDoc(doc(db, "gameweekTeams", nextGWTeam.id), data);
      else {
        const snap = await addDoc(collection(db, "gameweekTeams"), data);
        setNextGWTeam({ id: snap.id, ...data } as GWTeam);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Failed to save."); }
    setSaving(false);
  };

  if (loading) return <Shell><p style={{ padding: "2rem" }}>Loading...</p></Shell>;

  return (
    <Shell>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Transfers</h1>
            <p style={{ color: "var(--text-muted)" }}>Gameweek {NEXT_GW}</p>
          </div>
          <div style={{ display: "flex", gap: "1.5rem", background: "var(--surface)", padding: "0.75rem 1.5rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>BANK</div><div style={{ fontWeight: 700 }}>{remaining.toFixed(1)}</div></div>
            <div style={{ textAlign: "center" }}><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>PENALTY</div><div style={{ fontWeight: 700, color: penalty > 0 ? "var(--red)" : "inherit" }}>{penalty > 0 ? `-${penalty}` : "0"}</div></div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[0, 1, 2, 3].map(i => {
            const pid = squad[i];
            const p = pid ? getPlayer(pid) : null;
            return p ? (
              <PlayerCard key={pid} player={p} isCaptain={captain === pid} onCaptain={() => setCaptain(pid === captain ? "" : pid)} onSub={() => swapWithSub(pid)} onRemove={() => removeFromSquad(pid)} />
            ) : (
              <div key={i} onClick={() => setIsModalOpen(true)} style={{ aspectRatio: "2/3", border: "1px dashed var(--border)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.8rem", textAlign: "center", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.5rem" }}>+</span> Add Player
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: "2rem" }}>
          <div style={{ width: "23.5%" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textAlign: "center", marginBottom: "0.5rem", textTransform: "uppercase" }}>Substitute</div>
            {sub && getPlayer(sub) ? (
              <PlayerCard player={getPlayer(sub)!} isSub={true} onCaptain={() => { setSquad([...squad, sub]); setSub(""); }} onRemove={() => setSub("")} />
            ) : (
              <div onClick={() => setIsModalOpen(true)} style={{ aspectRatio: "2/3", border: "1px dashed var(--border)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-muted)", fontSize: "0.8rem" }}>+ Add Sub</div>
            )}
          </div>
        </div>

        {error && <p style={{ color: "var(--red)", textAlign: "center", marginBottom: "1rem" }}>{error}</p>}
        <button onClick={handleSave} disabled={saving} style={{ width: "100%", background: saved ? "var(--green)" : "var(--blue)", color: "#fff", fontWeight: 700, padding: "1rem", borderRadius: "12px", border: "none", fontSize: "1rem", cursor: "pointer" }}>
          {saving ? "Saving..." : saved ? "✓ Saved!" : `Save GW${NEXT_GW} Squad`}
        </button>

        {isModalOpen && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
            <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "20px", width: "100%", maxWidth: "800px", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Add Player</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "var(--text)", fontSize: "1.5rem", cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ padding: "1rem", overflowY: "auto", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "1rem" }}>
                {allPlayers.map(p => {
                  const isSelected = allSelected.includes(p.id);
                  const canAfford = isSelected || remaining >= p.price;
                  return (
                    <div key={p.id} onClick={() => !isSelected && canAfford && handlePlayerSelect(p)} style={{ opacity: isSelected ? 0.4 : canAfford ? 1 : 0.3, cursor: isSelected || !canAfford ? "not-allowed" : "pointer" }}>
                      <PlayerCard player={p} compact={true} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
