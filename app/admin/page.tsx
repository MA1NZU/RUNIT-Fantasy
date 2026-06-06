"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, doc, updateDoc, query, where, orderBy
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";

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

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("players");

  // data
  const [players, setPlayers] = useState<Player[]>([]);
  const [managers, setManagers] = useState<UserTeam[]>([]);
  const [gwTeams, setGwTeams] = useState<GWTeam[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // redirect if not admin
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
      setPlayers(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Player))
        .sort((a, b) => a.name.localeCompare(b.name)));
      setManagers(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserTeam))
        .sort((a, b) => (b.Totalpoints ?? 0) - (a.Totalpoints ?? 0)));
      setGwTeams(gwSnap.docs.map(d => ({ id: d.id, ...d.data() } as GWTeam)));
      if (!sSnap.empty) setSettings({ id: sSnap.docs[0].id, ...sSnap.docs[0].data() } as Settings);
      setLoading(false);
    };
    load();
  }, [user]);

  const markSaved = (key: string) => {
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  const savePlayer = async (p: Player) => {
    setSaving(p.id);
    await updateDoc(doc(db, "players", p.id), {
      price: Number(p.price),
      desc: p.desc,
      points: Number(p.points),
      totalPoints: Number(p.totalPoints),
    });
    setSaving(null);
    markSaved(p.id);
  };

  const saveManager = async (m: UserTeam) => {
    setSaving(m.id);
    await updateDoc(doc(db, "userTeams", m.id), {
      Totalpoints: Number(m.Totalpoints),
      totalGameweekPoints: Number(m.totalGameweekPoints),
      coins: Number(m.coins),
      Bank: Number(m.Bank),
      freeTransfers: Number(m.freeTransfers),
    });
    setSaving(null);
    markSaved(m.id);
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSaving("settings");
    await updateDoc(doc(db, "settings", settings.id), {
      currentGameweek: Number(settings.currentGameweek),
      deadline: settings.deadline,
      shopDeadline: settings.shopDeadline,
    });
    setSaving(null);
    markSaved("settings");
  };

  const saveGWTeam = async (g: GWTeam) => {
    setSaving(g.id);
    await updateDoc(doc(db, "gameweekTeams", g.id), {
      gwPoints: Number(g.gwPoints),
      transfersMade: Number(g.transfersMade),
      transferPenalty: Number(g.transferPenalty),
    });
    setSaving(null);
    markSaved(g.id);
  };

  const updatePlayer = (id: string, field: keyof Player, value: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const updateManager = (id: string, field: keyof UserTeam, value: string) => {
    setManagers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  };
  const updateGWTeam = (id: string, field: keyof GWTeam, value: string) => {
    setGwTeams(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const inputStyle = {
    background: "var(--bg)", border: "1px solid var(--border)",
    color: "var(--text)", padding: "0.3rem 0.5rem",
    borderRadius: "4px", fontSize: "0.85rem", width: "100%",
  };
  const btnStyle = (active: boolean) => ({
    padding: "0.5rem 1.2rem", borderRadius: "6px", cursor: "pointer",
    border: "1px solid var(--border)", fontWeight: 600, fontSize: "0.9rem",
    background: active ? "var(--accent)" : "var(--surface)",
    color: active ? "#000" : "var(--text)",
  });
  const saveBtn = (id: string) => ({
    background: saved === id ? "var(--green)" : "var(--accent)",
    color: "#000", border: "none", borderRadius: "6px",
    padding: "0.35rem 0.9rem", fontWeight: 700,
    fontSize: "0.8rem", cursor: "pointer", whiteSpace: "nowrap" as const,
  });

  if (!user || user.email !== ADMIN_EMAIL) return null;
  if (loading) return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Admin Panel</h1>
      <p style={{ color: "var(--text-muted)" }}>Loading...</p>
    </div>
  );

  const currentGWTeams = gwTeams.filter(g => g.gameweek === CURRENT_GW);

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.25rem" }}>Admin Panel</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Logged in as {user.email}
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        {(["players", "stats", "managers", "gwteams", "settings"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={btnStyle(tab === t)}>
            {t === "players" ? "Players" :
             t === "stats" ? "Player Stats" :
             t === "managers" ? "Managers" :
             t === "gwteams" ? "GW Teams" : "Settings"}
          </button>
        ))}
      </div>

      {/* ── PLAYERS TAB ── */}
      {tab === "players" && (
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>
            Player Prices & Availability
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {players.map(p => (
              <div key={p.id} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "0.75rem 1rem",
                display: "grid", gridTemplateColumns: "1.5fr 0.7fr 2fr auto",
                gap: "0.75rem", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.game}</div>
                </div>
                <input
                  type="number" step="0.1" value={p.price}
                  onChange={e => updatePlayer(p.id, "price", e.target.value)}
                  style={inputStyle}
                  placeholder="Price"
                />
                <input
                  type="text" value={p.desc}
                  onChange={e => updatePlayer(p.id, "desc", e.target.value)}
                  style={inputStyle}
                  placeholder="Availability (e.g. Fit to play)"
                />
                <button
                  onClick={() => savePlayer(p)}
                  disabled={saving === p.id}
                  style={saveBtn(p.id)}
                >
                  {saving === p.id ? "..." : saved === p.id ? "✓" : "Save"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PLAYER STATS TAB ── */}
      {tab === "stats" && (
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Player GW Points
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Update each player's points for the current gameweek and their total points.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {players.map(p => (
              <div key={p.id} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "0.75rem 1rem",
                display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr auto",
                gap: "0.75rem", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.game}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>GW Points</div>
                  <input
                    type="number" value={p.points}
                    onChange={e => updatePlayer(p.id, "points", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Total Points</div>
                  <input
                    type="number" value={p.totalPoints}
                    onChange={e => updatePlayer(p.id, "totalPoints", e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <button
                  onClick={() => savePlayer(p)}
                  disabled={saving === p.id}
                  style={saveBtn(p.id)}
                >
                  {saving === p.id ? "..." : saved === p.id ? "✓" : "Save"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MANAGERS TAB ── */}
      {tab === "managers" && (
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>
            Manager Points & Coins
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {managers.map(m => (
              <div key={m.id} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "0.75rem 1rem",
              }}>
                <div style={{ fontWeight: 700, marginBottom: "0.75rem" }}>{m.namez}</div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto",
                  gap: "0.75rem", alignItems: "end",
                }}>
                  {[
                    { label: "Total Pts", field: "Totalpoints" as keyof UserTeam },
                    { label: "GW Pts", field: "totalGameweekPoints" as keyof UserTeam },
                    { label: "Coins", field: "coins" as keyof UserTeam },
                    { label: "Bank", field: "Bank" as keyof UserTeam },
                    { label: "Free Transfers", field: "freeTransfers" as keyof UserTeam },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>{label}</div>
                      <input
                        type="number" step="0.1"
                        value={m[field] as number}
                        onChange={e => updateManager(m.id, field, e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => saveManager(m)}
                    disabled={saving === m.id}
                    style={saveBtn(m.id)}
                  >
                    {saving === m.id ? "..." : saved === m.id ? "✓" : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GW TEAMS TAB ── */}
      {tab === "gwteams" && (
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Gameweek {CURRENT_GW} Teams
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Update GW points and transfer info for each manager's GW{CURRENT_GW} team.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {currentGWTeams.length === 0 && (
              <p style={{ color: "var(--text-muted)" }}>No GW{CURRENT_GW} teams found.</p>
            )}
            {currentGWTeams.map(g => (
              <div key={g.id} style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "8px", padding: "0.75rem 1rem",
              }}>
                <div style={{ fontWeight: 600, marginBottom: "0.75rem", fontSize: "0.9rem", color: "var(--text-muted)" }}>
                  {g.ownerEmail}
                </div>
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto",
                  gap: "0.75rem", alignItems: "end",
                }}>
                  {[
                    { label: "GW Points", field: "gwPoints" as keyof GWTeam },
                    { label: "Transfers Made", field: "transfersMade" as keyof GWTeam },
                    { label: "Transfer Penalty", field: "transferPenalty" as keyof GWTeam },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>{label}</div>
                      <input
                        type="number"
                        value={g[field] as number}
                        onChange={e => updateGWTeam(g.id, field, e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => saveGWTeam(g)}
                    disabled={saving === g.id}
                    style={saveBtn(g.id)}
                  >
                    {saving === g.id ? "..." : saved === g.id ? "✓" : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {tab === "settings" && settings && (
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem" }}>
            Gameweek Settings
          </h2>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "10px", padding: "1.5rem",
            display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "500px",
          }}>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Current Gameweek</div>
              <input
                type="number" value={settings.currentGameweek}
                onChange={e => setSettings({ ...settings, currentGameweek: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Transfer Deadline</div>
              <input
                type="datetime-local" value={settings.deadline}
                onChange={e => setSettings({ ...settings, deadline: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Shop Deadline</div>
              <input
                type="datetime-local" value={settings.shopDeadline}
                onChange={e => setSettings({ ...settings, shopDeadline: e.target.value })}
                style={inputStyle}
              />
            </div>
            <button
              onClick={saveSettings}
              disabled={saving === "settings"}
              style={{ ...saveBtn("settings"), padding: "0.6rem 1.5rem", fontSize: "0.95rem" }}
            >
              {saving === "settings" ? "Saving..." : saved === "settings" ? "✓ Saved!" : "Save Settings"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
