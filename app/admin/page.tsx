"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, where, orderBy, setDoc, addDoc } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import Shell from "@/app/shell";

const ADMIN_EMAIL = "yahyaayman2006@gmail.com";
const CURRENT_GW = 7;

type Player = { id: string; name: string; game: string; price: number; points: number; totalPoints: number; desc: string; ID?: string; };
type UserTeam = { id: string; namez: string; Totalpoints: number; totalGameweekPoints: number; coins: number; Bank: number; freeTransfers: number; ownerEmail: string; };
type GWTeam = { id: string; gameweek: number; ownerEmail: string; player1: string; player2: string; player3: string; player4: string; captain: string; sub: string; gwPoints: number; transfersMade: number; transferPenalty: number; };
type Settings = { id: string; currentGameweek: number; deadline: string; shopDeadline: string; };
type Tab = "players" | "stats" | "managers" | "gwteams" | "settings";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("players");
  const [players, setPlayers] = useState<Player[]>([]);
  const [managers, setManagers] = useState<UserTeam[]>([]);
  const [gwTeams, setGwTeams] = useState<GWTeam[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Stats Calculator State
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [calcStats, setCalcStats] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) router.replace("/");
  }, [user, router]);

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return;
    const load = async () => {
      const [pSnap, mSnap, gwSnap, sSnap] = await Promise.all([
        getDocs(collection(db, "players")),
        getDocs(collection(db, "userTeams")),
        getDocs(query(collection(db, "gameweekTeams"), orderBy("gameweek", "desc"))),
        getDocs(collection(db, "settings")),
      ]);
      setPlayers(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Player)).sort((a, b) => a.name.localeCompare(b.name)));
      setManagers(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserTeam)).sort((a, b) => (b.Totalpoints ?? 0) - (a.Totalpoints ?? 0)));
      setGwTeams(gwSnap.docs.map(d => ({ id: d.id, ...d.data() } as GWTeam)));
      if (!sSnap.empty) setSettings({ id: sSnap.docs[0].id, ...sSnap.docs[0].data() } as Settings);
      setLoading(false);
    };
    load();
  }, [user]);

  const calculatePoints = (p: Player) => {
    let total = 0;
    const s = (key: string) => Number(calcStats[key] || 0);

    total += s("matchWin") * 2;
    total += s("matchLose") * -2;
    total += s("mvp") * 8;
    total += s("svp") * 5;
    total += s("bonus") * 1;

    if (p.game === "Valorant") {
      total += Math.floor(s("kills") / 2);
      total += Math.floor(s("assists") / 2);
      total += Math.floor(s("deaths") / 3) * -1;
      total += s("firstBlood");
      total += s("firstDeath") * -1;
      total += s("tripleKill") * 3;
      total += s("quadraKill") * 5;
      total += s("ace") * 8;
      total += s("clutch") * 2;
    } else {
      total += Math.floor(s("kills") / 3);
      total += Math.floor(s("assists") / 4);
      total += s("deaths") * -2;
      total += Math.floor(s("lastKills") / 2);
      total += s("headKill") * 3;
      total += Math.floor(s("healing") / 5050);
      total += Math.floor(s("damage") / 5050);
      total += Math.floor(s("blocked") / 5050);
      total += s("soloKills");
    }
    return total;
  };

  const handleSaveStats = async () => {
    const p = players.find(x => x.id === selectedPlayerId);
    if (!p) return;
    setSaving("matchstats");
    const pts = calculatePoints(p);

    try {
      // 1. Save to playerMatchStats
      const statId = `${p.id}_gw${settings?.currentGameweek || CURRENT_GW}`;
      await setDoc(doc(db, "playerMatchStats", statId), {
        ...calcStats,
        player: p.ID || p.id,
        Title: p.name,
        game: p.game,
        gameweek: settings?.currentGameweek || CURRENT_GW,
        gwPoints: pts,
        UpdatedDate: new Date().toISOString()
      }, { merge: true });

      // 2. Update player current points
      await updateDoc(doc(db, "players", p.id), {
        points: pts
      });

      setSaved("matchstats");
      setTimeout(() => setSaved(null), 2000);
    } catch (err) { console.error(err); alert("Failed to save stats"); }
    setSaving(null);
  };

  if (!user || user.email !== ADMIN_EMAIL) return null;
  if (loading) return <Shell><p style={{ padding: "2rem" }}>Loading Admin Panel...</p></Shell>;

  const activePlayer = players.find(p => p.id === selectedPlayerId);

  return (
    <Shell>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Admin Panel</h1>
        
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          {["players", "stats", "managers", "gwteams", "settings"].map((t) => (
            <button key={t} onClick={() => setTab(t as Tab)} style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", border: "1px solid var(--border)", background: tab === t ? "var(--blue)" : "var(--surface)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>{t.toUpperCase()}</button>
          ))}
        </div>

        {tab === "stats" && (
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "2rem" }}>
            {/* Sidebar: Player List */}
            <div style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>Select Player</div>
              <div style={{ maxHeight: "600px", overflowY: "auto" }}>
                {players.map(p => (
                  <div key={p.id} onClick={() => setSelectedPlayerId(p.id)} style={{ padding: "0.75rem 1rem", cursor: "pointer", borderBottom: "1px solid var(--border)", background: selectedPlayerId === p.id ? "rgba(3,71,244,0.15)" : "transparent", transition: "0.2s" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{p.game}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Content: Stats Entry */}
            <div style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)", padding: "1.5rem" }}>
              {activePlayer ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <div>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{activePlayer.name}</h2>
                      <p style={{ color: "var(--accent)", fontSize: "0.8rem", fontWeight: 600 }}>GW{settings?.currentGameweek || CURRENT_GW} — {activePlayer.game} Rules</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>CALCULATED GW POINTS</div>
                      <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)" }}>{calculatePoints(activePlayer)}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                    <StatInput label="Match Win" id="matchWin" val={calcStats} set={setCalcStats} />
                    <StatInput label="Match Lose" id="matchLose" val={calcStats} set={setCalcStats} />
                    <StatInput label="MVP" id="mvp" val={calcStats} set={setCalcStats} />
                    <StatInput label="SVP" id="svp" val={calcStats} set={setCalcStats} />
                    <StatInput label="Bonus" id="bonus" val={calcStats} set={setCalcStats} />

                    <div style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", margin: "1rem 0" }}></div>

                    {activePlayer.game === "Valorant" ? (
                      <>
                        <StatInput label="Kills" id="kills" val={calcStats} set={setCalcStats} />
                        <StatInput label="Assists" id="assists" val={calcStats} set={setCalcStats} />
                        <StatInput label="Deaths" id="deaths" val={calcStats} set={setCalcStats} />
                        <StatInput label="First Blood" id="firstBlood" val={calcStats} set={setCalcStats} />
                        <StatInput label="First Death" id="firstDeath" val={calcStats} set={setCalcStats} />
                        <StatInput label="Triple Kill" id="tripleKill" val={calcStats} set={setCalcStats} />
                        <StatInput label="Quadra Kill" id="quadraKill" val={calcStats} set={setCalcStats} />
                        <StatInput label="Ace" id="ace" val={calcStats} set={setCalcStats} />
                        <StatInput label="Clutch" id="clutch" val={calcStats} set={setCalcStats} />
                      </>
                    ) : (
                      <>
                        <StatInput label="Kills" id="kills" val={calcStats} set={setCalcStats} />
                        <StatInput label="Assists" id="assists" val={calcStats} set={setCalcStats} />
                        <StatInput label="Deaths" id="deaths" val={calcStats} set={setCalcStats} />
                        <StatInput label="Last Kills" id="lastKills" val={calcStats} set={setCalcStats} />
                        <StatInput label="Head Kill" id="headKill" val={calcStats} set={setCalcStats} />
                        <StatInput label="Healing" id="healing" val={calcStats} set={setCalcStats} />
                        <StatInput label="Damage" id="damage" val={calcStats} set={setCalcStats} />
                        <StatInput label="Blocked" id="blocked" val={calcStats} set={setCalcStats} />
                        <StatInput label="Solo Kills" id="soloKills" val={calcStats} set={setCalcStats} />
                      </>
                    )}
                  </div>

                  <button 
                    onClick={handleSaveStats} 
                    disabled={saving === "matchstats"}
                    style={{ width: "100%", marginTop: "2rem", background: saved === "matchstats" ? "var(--green)" : "var(--blue)", color: "#fff", border: "none", padding: "1rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "1rem" }}
                  >
                    {saving === "matchstats" ? "Saving..." : saved === "matchstats" ? "✓ Saved Success!" : "Save Match Stats"}
                  </button>
                </div>
              ) : (
                <div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                  Select a player from the left to start calculating points.
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Render logic for other tabs (players, managers, gwteams, settings) matches user's original code --- */}
        {tab === "players" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {players.map(p => (
              <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem", display: "grid", gridTemplateColumns: "1.5fr 0.7fr 2fr auto", gap: "0.75rem", alignItems: "center" }}>
                <div><div style={{ fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.game}</div></div>
                <input type="number" step="0.1" value={p.price} onChange={(e) => setPlayers(prev => prev.map(x => x.id === p.id ? {...x, price: Number(e.target.value)} : x))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.3rem" }} />
                <input type="text" value={p.desc} onChange={(e) => setPlayers(prev => prev.map(x => x.id === p.id ? {...x, desc: e.target.value} : x))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.3rem" }} />
                <button onClick={async () => { setSaving(p.id); await updateDoc(doc(db, "players", p.id), { price: p.price, desc: p.desc }); setSaving(null); setSaved(p.id); setTimeout(() => setSaved(null), 2000); }} style={{ background: saved === p.id ? "var(--green)" : "var(--accent)", color: "#000", border: "none", borderRadius: "6px", padding: "0.35rem 0.9rem", fontWeight: 700 }}>{saving === p.id ? "..." : "Save"}</button>
              </div>
            ))}
          </div>
        )}

        {tab === "managers" && (
           <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {managers.map(m => (
              <div key={m.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "1rem" }}>{m.namez} ({m.ownerEmail})</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr) auto", gap: "0.75rem", alignItems: "end" }}>
                   <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Total Points</div><input type="number" value={m.Totalpoints} onChange={(e) => setManagers(prev => prev.map(x => x.id === m.id ? {...x, Totalpoints: Number(e.target.value)} : x))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.3rem", width: "100%" }} /></div>
                   <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>GW Points</div><input type="number" value={m.totalGameweekPoints} onChange={(e) => setManagers(prev => prev.map(x => x.id === m.id ? {...x, totalGameweekPoints: Number(e.target.value)} : x))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.3rem", width: "100%" }} /></div>
                   <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Coins</div><input type="number" value={m.coins} onChange={(e) => setManagers(prev => prev.map(x => x.id === m.id ? {...x, coins: Number(e.target.value)} : x))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.3rem", width: "100%" }} /></div>
                   <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Bank</div><input type="number" step="0.1" value={m.Bank} onChange={(e) => setManagers(prev => prev.map(x => x.id === m.id ? {...x, Bank: Number(e.target.value)} : x))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.3rem", width: "100%" }} /></div>
                   <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Free Trans</div><input type="number" value={m.freeTransfers} onChange={(e) => setManagers(prev => prev.map(x => x.id === m.id ? {...x, freeTransfers: Number(e.target.value)} : x))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.3rem", width: "100%" }} /></div>
                   <button onClick={async () => { setSaving(m.id); await updateDoc(doc(db, "userTeams", m.id), { Totalpoints: m.Totalpoints, totalGameweekPoints: m.totalGameweekPoints, coins: m.coins, Bank: m.Bank, freeTransfers: m.freeTransfers }); setSaving(null); setSaved(m.id); setTimeout(() => setSaved(null), 2000); }} style={{ background: saved === m.id ? "var(--green)" : "var(--accent)", color: "#000", border: "none", borderRadius: "6px", padding: "0.35rem 0.9rem", fontWeight: 700 }}>Save</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

function StatInput({ label, id, val, set }: { label: string; id: string; val: any; set: any }) {
  return (
    <div>
      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>{label}</div>
      <input 
        type="number" 
        value={val[id] || ""} 
        onChange={(e) => set({ ...val, [id]: e.target.value })} 
        style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.5rem", borderRadius: "6px" }} 
      />
    </div>
  );
}
