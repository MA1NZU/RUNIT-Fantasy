"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy, setDoc } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import Shell from "@/app/shell";

const ADMIN_EMAIL = "yahyaayman2006@gmail.com";

type Player = { id: string; name: string; game: string; price: number; points: number; totalPoints: number; desc: string; ID?: string; };
type UserTeam = { id: string; namez: string; Totalpoints: number; totalGameweekPoints: number; coins: number; Bank: number; freeTransfers: number; ownerEmail: string; };
type Settings = { id: string; currentGameweek: number; deadline: string; shopDeadline: string; };
type Tab = "players" | "stats" | "managers" | "settings";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("players");
  const [players, setPlayers] = useState<Player[]>([]);
  const [managers, setManagers] = useState<UserTeam[]>([]);
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
      const [pSnap, mSnap, sSnap] = await Promise.all([
        getDocs(collection(db, "players")),
        getDocs(collection(db, "userTeams")),
        getDocs(collection(db, "settings")),
      ]);
      setPlayers(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Player)).sort((a, b) => a.name.localeCompare(b.name)));
      setManagers(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserTeam)).sort((a, b) => (b.Totalpoints ?? 0) - (a.Totalpoints ?? 0)));
      if (!sSnap.empty) setSettings({ id: sSnap.docs[0].id, ...sSnap.docs[0].data() } as Settings);
      setLoading(false);
    };
    load();
  }, [user]);

  const markSaved = (key: string) => {
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

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
    if (!p || !settings) return;
    setSaving("matchstats");
    const pts = calculatePoints(p);
    try {
      const statId = `${p.id}_gw${settings.currentGameweek}`;
      await setDoc(doc(db, "playerMatchStats", statId), {
        ...calcStats,
        player: p.ID || p.id,
        Title: p.name,
        game: p.game,
        gameweek: settings.currentGameweek,
        gwPoints: pts,
        UpdatedDate: new Date().toISOString()
      }, { merge: true });
      await updateDoc(doc(db, "players", p.id), { points: pts });
      markSaved("matchstats");
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving("settings");
    try {
      await updateDoc(doc(db, "settings", settings.id), {
        currentGameweek: Number(settings.currentGameweek),
        deadline: settings.deadline,
        shopDeadline: settings.shopDeadline
      });
      markSaved("settings");
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  const handleSaveManager = async (m: UserTeam) => {
    setSaving(m.id);
    try {
      await updateDoc(doc(db, "userTeams", m.id), {
        Totalpoints: Number(m.Totalpoints || 0),
        totalGameweekPoints: Number(m.totalGameweekPoints || 0),
        coins: Number(m.coins || 0),
        Bank: Number(m.Bank || 0),
        freeTransfers: Number(m.freeTransfers || 0)
      });
      markSaved(m.id);
    } catch (err) { console.error(err); }
    setSaving(null);
  };

  const updateManagerField = (id: string, field: keyof UserTeam, value: any) => {
    setManagers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  if (!user || user.email !== ADMIN_EMAIL) return null;
  if (loading) return <Shell><p style={{ padding: "2rem" }}>Loading Admin Panel...</p></Shell>;

  const activePlayer = players.find(p => p.id === selectedPlayerId);

  return (
    <Shell>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Admin Panel</h1>
        
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          {["players", "stats", "managers", "settings"].map((t) => (
            <button key={t} onClick={() => setTab(t as Tab)} style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", border: "1px solid var(--border)", background: tab === t ? "var(--blue)" : "var(--surface)", color: "#fff", cursor: "pointer", fontWeight: 600 }}>{t.toUpperCase()}</button>
          ))}
        </div>

        {tab === "settings" && settings && (
          <div style={{ maxWidth: "600px" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem" }}>Gameweek Settings</h2>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              <div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Current Gameweek</div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <button onClick={() => setSettings({...settings, currentGameweek: settings.currentGameweek - 1})} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", width: "40px", height: "40px", borderRadius: "8px", cursor: "pointer", fontSize: "1.2rem" }}>-</button>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, width: "60px", textAlign: "center" }}>{settings.currentGameweek}</div>
                  <button onClick={() => setSettings({...settings, currentGameweek: settings.currentGameweek + 1})} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", width: "40px", height: "40px", borderRadius: "8px", cursor: "pointer", fontSize: "1.2rem" }}>+</button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Transfer Deadline</div>
                  <input type="datetime-local" value={settings.deadline} onChange={(e) => setSettings({...settings, deadline: e.target.value})} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.6rem", borderRadius: "8px" }} />
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Shop Deadline</div>
                  <input type="datetime-local" value={settings.shopDeadline} onChange={(e) => setSettings({...settings, shopDeadline: e.target.value})} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.6rem", borderRadius: "8px" }} />
                </div>
              </div>

              <button onClick={handleSaveSettings} disabled={saving === "settings"} style={{ background: saved === "settings" ? "var(--green)" : "var(--blue)", color: "#fff", border: "none", padding: "0.8rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer", marginTop: "1rem" }}>
                {saving === "settings" ? "Saving..." : saved === "settings" ? "✓ Settings Saved" : "Save Settings"}
              </button>
            </div>
          </div>
        )}

        {tab === "stats" && (
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "2rem" }}>
            <div style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
              <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", fontWeight: 700 }}>Select Player</div>
              <div style={{ maxHeight: "600px", overflowY: "auto" }}>
                {players.map(p => (
                  <div key={p.id} onClick={() => setSelectedPlayerId(p.id)} style={{ padding: "0.75rem 1rem", cursor: "pointer", borderBottom: "1px solid var(--border)", background: selectedPlayerId === p.id ? "rgba(3,71,244,0.15)" : "transparent" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{p.game}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)", padding: "1.5rem" }}>
              {activePlayer ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <div><h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{activePlayer.name}</h2><p style={{ color: "var(--accent)", fontSize: "0.8rem" }}>GW{settings?.currentGameweek} Rules</p></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>CALCULATED GW POINTS</div><div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent)" }}>{calculatePoints(activePlayer)}</div></div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                    {["matchWin", "matchLose", "mvp", "svp", "bonus"].map(f => <StatInput key={f} label={f.replace(/([A-Z])/g, ' $1').trim()} id={f} val={calcStats} set={setCalcStats} />)}
                    <div style={{ gridColumn: "1/-1", borderTop: "1px solid var(--border)", margin: "0.5rem 0" }}></div>
                    {activePlayer.game === "Valorant" ? 
                      ["kills", "assists", "deaths", "firstBlood", "firstDeath", "tripleKill", "quadraKill", "ace", "clutch"].map(f => <StatInput key={f} label={f.replace(/([A-Z])/g, ' $1').trim()} id={f} val={calcStats} set={setCalcStats} />) :
                      ["kills", "assists", "deaths", "lastKills", "headKill", "healing", "damage", "blocked", "soloKills"].map(f => <StatInput key={f} label={f.replace(/([A-Z])/g, ' $1').trim()} id={f} val={calcStats} set={setCalcStats} />)
                    }
                  </div>
                  <button onClick={handleSaveStats} disabled={saving === "matchstats"} style={{ width: "100%", marginTop: "2rem", background: saved === "matchstats" ? "var(--green)" : "var(--blue)", color: "#fff", border: "none", padding: "1rem", borderRadius: "8px", fontWeight: 700, cursor: "pointer" }}>
                    {saving === "matchstats" ? "Saving..." : saved === "matchstats" ? "✓ Saved Success!" : "Save Match Stats"}
                  </button>
                </div>
              ) : <div style={{ height: "400px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>Select a player to start.</div>}
            </div>
          </div>
        )}

        {tab === "managers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {managers.map(m => (
              <div key={m.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "1rem" }}>
                <div style={{ fontWeight: 700, marginBottom: "1rem" }}>{m.namez} ({m.ownerEmail})</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr) 100px", gap: "0.75rem", alignItems: "end" }}>
                   <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Total Points</div><input type="number" value={m.Totalpoints ?? 0} onChange={(e) => updateManagerField(m.id, "Totalpoints", Number(e.target.value))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.5rem", borderRadius: "6px", width: "100%" }} /></div>
                   <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>GW Points</div><input type="number" value={m.totalGameweekPoints ?? 0} onChange={(e) => updateManagerField(m.id, "totalGameweekPoints", Number(e.target.value))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.5rem", borderRadius: "6px", width: "100%" }} /></div>
                   <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Coins</div><input type="number" value={m.coins ?? 0} onChange={(e) => updateManagerField(m.id, "coins", Number(e.target.value))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.5rem", borderRadius: "6px", width: "100%" }} /></div>
                   <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Bank</div><input type="number" step="0.1" value={m.Bank ?? 0} onChange={(e) => updateManagerField(m.id, "Bank", Number(e.target.value))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.5rem", borderRadius: "6px", width: "100%" }} /></div>
                   <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Free Trans</div><input type="number" value={m.freeTransfers ?? 0} onChange={(e) => updateManagerField(m.id, "freeTransfers", Number(e.target.value))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.5rem", borderRadius: "6px", width: "100%" }} /></div>
                   <button onClick={() => handleSaveManager(m)} style={{ background: saved === m.id ? "var(--green)" : "var(--accent)", color: "#000", border: "none", borderRadius: "6px", padding: "0.6rem", fontWeight: 700, cursor: "pointer", width: "100%" }}>
                     {saving === m.id ? "..." : saved === m.id ? "✓" : "Save"}
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "players" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {players.map(p => (
              <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem", display: "grid", gridTemplateColumns: "1.5fr 0.7fr 2fr auto", gap: "0.75rem", alignItems: "center" }}>
                <div><div style={{ fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.game}</div></div>
                <input type="number" step="0.1" value={p.price} onChange={(e) => setPlayers(prev => prev.map(x => x.id === p.id ? {...x, price: Number(e.target.value)} : x))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.5rem", borderRadius: "6px" }} />
                <input type="text" value={p.desc} onChange={(e) => setPlayers(prev => prev.map(x => x.id === p.id ? {...x, desc: e.target.value} : x))} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.5rem", borderRadius: "6px" }} />
                <button onClick={async () => { setSaving(p.id); await updateDoc(doc(db, "players", p.id), { price: p.price, desc: p.desc }); setSaving(null); markSaved(p.id); }} style={{ background: saved === p.id ? "var(--green)" : "var(--accent)", color: "#000", border: "none", borderRadius: "6px", padding: "0.6rem 1.2rem", fontWeight: 700, cursor: "pointer" }}>{saving === p.id ? "..." : "Save"}</button>
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
      <input type="number" value={val[id] || ""} onChange={(e) => set({ ...val, [id]: e.target.value })} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.5rem", borderRadius: "6px" }} />
    </div>
  );
}
