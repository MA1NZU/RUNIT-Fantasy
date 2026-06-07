"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import Shell from "@/app/shell";

const ADMIN_EMAIL = "yahyaayman2006@gmail.com";
const CURRENT_GW = 7;

type Player = {
  id: string; name: string; game: string; price: number;
  points: number; totalPoints: number; desc: string;
};

type UserTeam = {
  id: string; namez: string; Totalpoints: number;
  totalGameweekPoints: number; coins: number; Bank: number; freeTransfers: number;
};

type GWTeam = {
  id: string; gameweek: number; ownerEmail: string;
  player1: string; player2: string; player3: string; player4: string;
  captain: string; sub: string; gwPoints: number;
  transfersMade: number; transferPenalty: number;
};

type Settings = {
  id: string; currentGameweek: number; deadline: string; shopDeadline: string;
};

type Tab = "players" | "stats" | "managers" | "settings" | "gwteams";

function CalculatorModal({ player, onClose, onApply }: { player: Player; onClose: () => void; onApply: (pts: number) => void }) {
  const [stats, setStats] = useState<Record<string, string>>({});

  const calculate = () => {
    let totalPts = 0;
    const s = (key: string) => Number(stats[key] || 0);

    // Both Games
    totalPts += s("matchWin") * 2;
    totalPts += s("matchLose") * -2;
    totalPts += s("mvp") * 8;
    totalPts += s("svp") * 5;
    totalPts += s("bonus") * 1;

    if (player.game === "Valorant") {
      totalPts += Math.floor(s("kills") / 2);
      totalPts += Math.floor(s("assists") / 2);
      totalPts += Math.floor(s("deaths") / 3) * -1;
      totalPts += s("firstBlood");
      totalPts += s("firstDeath") * -1;
      totalPts += s("tripleKill") * 3;
      totalPts += s("quadraKill") * 5;
      totalPts += s("ace") * 8;
      totalPts += s("clutch") * 2;
    }

    if (player.game === "Marvel Rivals") {
      totalPts += Math.floor(s("kills") / 3);
      totalPts += Math.floor(s("assists") / 4);
      totalPts += s("deaths") * -2;
      totalPts += Math.floor(s("lastKills") / 2);
      totalPts += s("headKill") * 3;
      totalPts += Math.floor(s("healing") / 5050);
      totalPts += Math.floor(s("damage") / 5050);
      totalPts += Math.floor(s("blocked") / 5050);
      totalPts += s("soloKills");
    }
    return totalPts;
  };

  const result = calculate();

  const Field = ({ label, id }: { label: string; id: string }) => (
    <div style={{ marginBottom: "0.5rem" }}>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>{label}</div>
      <input 
        type="number" 
        value={stats[id] || ""} 
        onChange={(e) => setStats({ ...stats, [id]: e.target.value })} 
        style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.4rem", borderRadius: "4px", width: "100%" }}
      />
    </div>
  );

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.85)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", width: "100%", maxWidth: "500px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{player.name} Calculator</h2>
            <div style={{ fontSize: "0.75rem", color: "var(--accent)" }}>{player.game} Rules</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
        </div>
        
        <div style={{ padding: "1.25rem", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div style={{ gridColumn: "1 / -1", fontWeight: 700, fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>COMMON</div>
          <Field label="Match Win" id="matchWin" />
          <Field label="Match Lose" id="matchLose" />
          <Field label="MVP" id="mvp" />
          <Field label="SVP" id="svp" />
          <Field label="Bonus Pts" id="bonus" />

          {player.game === "Valorant" ? (
            <>
              <div style={{ gridColumn: "1 / -1", fontWeight: 700, fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>VALORANT</div>
              <Field label="Kills" id="kills" />
              <Field label="Assists" id="assists" />
              <Field label="Deaths" id="deaths" />
              <Field label="First Blood" id="firstBlood" />
              <Field label="First Death" id="firstDeath" />
              <Field label="Triple Kill" id="tripleKill" />
              <Field label="Quadra Kill" id="quadraKill" />
              <Field label="Ace" id="ace" />
              <Field label="Clutch" id="clutch" />
            </>
          ) : (
            <>
              <div style={{ gridColumn: "1 / -1", fontWeight: 700, fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>MARVEL RIVALS</div>
              <Field label="Kills" id="kills" />
              <Field label="Assists" id="assists" />
              <Field label="Deaths" id="deaths" />
              <Field label="Last Kills" id="lastKills" />
              <Field label="Head Kill" id="headKill" />
              <Field label="Healing" id="healing" />
              <Field label="Damage" id="damage" />
              <Field label="Blocked" id="blocked" />
              <Field label="Solo Kills" id="soloKills" />
            </>
          )}
        </div>

        <div style={{ padding: "1.25rem", borderTop: "1px solid var(--border)", background: "rgba(255,255,255,0.03)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>Calculated Total:</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--accent)" }}>{result} pts</div>
          </div>
          <button 
            onClick={() => onApply(result)}
            style={{ width: "100%", background: "var(--blue)", color: "#fff", border: "none", borderRadius: "8px", padding: "0.8rem", fontWeight: 700, cursor: "pointer" }}
          >
            Apply to GW Points
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [calcPlayer, setCalcPlayer] = useState<Player | null>(null);

  useEffect(function() {
    if (user && user.email !== ADMIN_EMAIL) router.replace("/");
  }, [user, router]);

  useEffect(function() {
    if (!user || user.email !== ADMIN_EMAIL) return;
    const load = async function() {
      const [pSnap, mSnap, gwSnap, sSnap] = await Promise.all([
        getDocs(collection(db, "players")),
        getDocs(collection(db, "userTeams")),
        getDocs(query(collection(db, "gameweekTeams"), orderBy("gameweek", "desc"))),
        getDocs(collection(db, "settings")),
      ]);
      setPlayers(pSnap.docs.map(function(d) { return { id: d.id, ...d.data() } as Player; }).sort(function(a, b) { return a.name.localeCompare(b.name); }));
      setManagers(mSnap.docs.map(function(d) { return { id: d.id, ...d.data() } as UserTeam; }).sort(function(a, b) { return (b.Totalpoints ?? 0) - (a.Totalpoints ?? 0); }));
      setGwTeams(gwSnap.docs.map(function(d) { return { id: d.id, ...d.data() } as GWTeam; }));
      if (!sSnap.empty) setSettings({ id: sSnap.docs[0].id, ...sSnap.docs[0].data() } as Settings);
      setLoading(false);
    };
    load();
  }, [user]);

  const markSaved = function(key: string) {
    setSaved(key);
    setTimeout(function() { setSaved(null); }, 2000);
  };

  const savePlayer = async function(p: Player) {
    setSaving(p.id);
    await updateDoc(doc(db, "players", p.id), { price: Number(p.price), desc: p.desc, points: Number(p.points), totalPoints: Number(p.totalPoints) });
    setSaving(null);
    markSaved(p.id);
  };

  const saveManager = async function(m: UserTeam) {
    setSaving(m.id);
    await updateDoc(doc(db, "userTeams", m.id), { Totalpoints: Number(m.Totalpoints), totalGameweekPoints: Number(m.totalGameweekPoints), coins: Number(m.coins), Bank: Number(m.Bank), freeTransfers: Number(m.freeTransfers) });
    setSaving(null);
    markSaved(m.id);
  };

  const saveSettings = async function() {
    if (!settings) return;
    setSaving("settings");
    await updateDoc(doc(db, "settings", settings.id), { currentGameweek: Number(settings.currentGameweek), deadline: settings.deadline, shopDeadline: settings.shopDeadline });
    setSaving(null);
    markSaved("settings");
  };

  const saveGWTeam = async function(g: GWTeam) {
    setSaving(g.id);
    await updateDoc(doc(db, "gameweekTeams", g.id), { gwPoints: Number(g.gwPoints), transfersMade: Number(g.transfersMade), transferPenalty: Number(g.transferPenalty) });
    setSaving(null);
    markSaved(g.id);
  };

  const updatePlayer = function(id: string, field: keyof Player, value: any) {
    setPlayers(function(prev) { return prev.map(function(p) { return p.id === id ? { ...p, [field]: value } : p; }); });
  };

  const updateManager = function(id: string, field: keyof UserTeam, value: string) {
    setManagers(function(prev) { return prev.map(function(m) { return m.id === id ? { ...m, [field]: value } : m; }); });
  };

  const updateGWTeam = function(id: string, field: keyof GWTeam, value: string) {
    setGwTeams(function(prev) { return prev.map(function(g) { return g.id === id ? { ...g, [field]: value } : g; }); });
  };

  const btnStyle = (active: boolean) => ({
    padding: "0.5rem 1.2rem", borderRadius: "6px", cursor: "pointer",
    border: "1px solid var(--border)", fontWeight: 600, fontSize: "0.9rem",
    background: active ? "var(--blue)" : "var(--surface)", color: active ? "#fff" : "var(--text)",
  });

  const saveBtn = (id: string) => ({
    background: saved === id ? "var(--green)" : "var(--accent)",
    color: "#000", border: "none", borderRadius: "6px",
    padding: "0.35rem 0.9rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
  });

  if (!user || user.email !== ADMIN_EMAIL) return null;
  if (loading) return <Shell><p style={{ padding: "2rem" }}>Loading...</p></Shell>;

  const currentGWTeams = gwTeams.filter(g => g.gameweek === CURRENT_GW);

  return (
    <Shell>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Admin Panel</h1>
        
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          {(["players", "stats", "managers", "gwteams", "settings"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={btnStyle(tab === t)}>{t.toUpperCase()}</button>
          ))}
        </div>

        {tab === "stats" && (
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>Player Stats</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {players.map(p => (
                <div key={p.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.75rem 1rem", display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto auto", gap: "0.75rem", alignItems: "center" }}>
                  <div><div style={{ fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.game}</div></div>
                  <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>GW Points</div><input type="number" value={p.points} onChange={(e) => updatePlayer(p.id, "points", e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.3rem", borderRadius: "4px", width: "100%" }} /></div>
                  <div><div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Total Points</div><input type="number" value={p.totalPoints} onChange={(e) => updatePlayer(p.id, "totalPoints", e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "#fff", padding: "0.3rem", borderRadius: "4px", width: "100%" }} /></div>
                  <button onClick={() => setCalcPlayer(p)} style={{ background: "var(--surface)", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: "6px", padding: "0.35rem 0.9rem", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}>Calc</button>
                  <button onClick={() => savePlayer(p)} style={saveBtn(p.id)}>{saving === p.id ? "..." : "Save"}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ... other tabs remain the same as previous version ... */}

        {calcPlayer && (
          <CalculatorModal 
            player={calcPlayer} 
            onClose={() => setCalcPlayer(null)} 
            onApply={(pts) => {
              updatePlayer(calcPlayer.id, "points", pts);
              setCalcPlayer(null);
            }} 
          />
        )}
      </div>
    </Shell>
  );
}
