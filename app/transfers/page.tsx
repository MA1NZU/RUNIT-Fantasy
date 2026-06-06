"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, where, orderBy,
  doc, updateDoc, addDoc
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

type Player = {
  id: string;
  name: string;
  game: string;
  price: number;
  points: number;
  totalPoints: number;
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

type UserTeam = {
  id: string;
  Bank: number;
  freeTransfers: number;
  namez: string;
};

const NEXT_GW = 8;

export default function TransfersPage() {
  const { user } = useAuth();
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
      const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Player));
      setAllPlayers(players.sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0)));

      const userTeamSnap = await getDocs(
        query(collection(db, "userTeams"), where("ownerEmail", "==", user.email))
      );
      if (!userTeamSnap.empty) {
        setUserTeam({ id: userTeamSnap.docs[0].id, ...userTeamSnap.docs[0].data() } as UserTeam);
      }

      const gwSnap = await getDocs(
        query(
          collection(db, "gameweekTeams"),
          where("ownerEmail", "==", user.email),
          orderBy("gameweek", "desc")
        )
      );
      const gwTeams = gwSnap.docs.map((d) => ({ id: d.id, ...d.data() } as GWTeam));
      const current = gwTeams.find((t) => t.gameweek === NEXT_GW - 1);
      const next = gwTeams.find((t) => t.gameweek === NEXT_GW);

      setCurrentGWTeam(current ?? null);
      setNextGWTeam(next ?? null);

      const base = next ?? current;
      if (base) {
        const s = [base.player1, base.player2, base.player3, base.player4].filter(Boolean);
        setSquad(s);
        setCaptain(base.captain ?? "");
        setSub(base.sub ?? "");
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const getPlayer = (id: string) => allPlayers.find((p) => p.id === id);

  const budget = userTeam?.Bank ?? 0;

  const calcCost = (squadIds: string[], subId: string) => {
    const all = subId ? [...squadIds, subId] : squadIds;
    return all.reduce((sum, id) => sum + (getPlayer(id)?.price ?? 0), 0);
  };

  const totalCost = calcCost(squad, sub);
  const remaining = budget - totalCost;

  const transfersMade = (() => {
    if (!currentGWTeam) return 0;
    const prev = [
      currentGWTeam.player1, currentGWTeam.player2,
      currentGWTeam.player3, currentGWTeam.player4,
      currentGWTeam.sub,
    ].filter(Boolean);
    const allNew = sub ? [...squad, sub] : squad;
    return allNew.filter((id) => !prev.includes(id)).length;
  })();

  const freeTransfers = userTeam?.freeTransfers ?? 1;
  const penalty = Math.max(0, transfersMade - freeTransfers) * 4;

  // clicking a player on the right side
  const handlePlayerClick = (p: Player) => {
    setError("");

    // already in squad → remove
    if (squad.includes(p.id)) {
      setSquad(squad.filter((id) => id !== p.id));
      if (captain === p.id) setCaptain("");
      return;
    }

    // already sub → remove
    if (sub === p.id) {
      setSub("");
      return;
    }

    // check budget
    const newCost = totalCost + p.price;
    if (newCost > budget) {
      setError(`Not enough budget for ${p.name}.`);
      return;
    }

    // fill squad first (up to 4), then sub
    if (squad.length < 4) {
      setSquad((prev) => [...prev, p.id]);
    } else if (!sub) {
      setSub(p.id);
    } else {
      setError("Squad is full (4 players + 1 sub). Remove a player first.");
    }
  };

  const removeFromSquad = (id: string) => {
    setSquad(squad.filter((p) => p !== id));
    if (captain === id) setCaptain("");
  };

  const handleSave = async () => {
    if (squad.length !== 4) { setError("You need exactly 4 players."); return; }
    if (!captain || !squad.includes(captain)) { setError("Set a captain from your 4 players."); return; }
    if (!sub) { setError("Set a substitute."); return; }
    if (remaining < 0) { setError("You are over budget."); return; }

    setSaving(true);
    setError("");

    const data = {
      player1: squad[0], player2: squad[1],
      player3: squad[2], player4: squad[3],
      captain, sub,
      gameweek: NEXT_GW,
      ownerEmail: user!.email,
      gwPoints: 0,
      transfersMade,
      transferPenalty: penalty,
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
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Transfers</h1>
      <p style={{ color: "var(--text-muted)" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Transfers</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Building your squad for Gameweek {NEXT_GW}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>

        {/* LEFT — squad */}
        <div>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "10px", padding: "1rem", marginBottom: "1.5rem",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem",
          }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Budget</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{budget.toFixed(1)}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Remaining</div>
              <div style={{ fontWeight: 700, fontSize: "1.1rem", color: remaining < 0 ? "var(--red)" : "var(--green)" }}>
                {remaining.toFixed(1)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Transfers Made</div>
              <div style={{ fontWeight: 700 }}>{transfersMade} / {freeTransfers} free</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Penalty</div>
              <div style={{ fontWeight: 700, color: penalty > 0 ? "var(--red)" : "var(--text)" }}>
                {penalty > 0 ? `-${penalty} pts` : "None"}
              </div>
            </div>
          </div>

          {/* Squad slots */}
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            SQUAD ({squad.length}/4)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
            {squad.length === 0 && (
              <div style={{
                background: "var(--surface)", border: "1px dashed var(--border)",
                borderRadius: "8px", padding: "1rem",
                color: "var(--text-muted)", fontSize: "0.9rem", textAlign: "center",
              }}>
                Click players on the right to add them
              </div>
            )}
            {squad.map((pid) => {
              const p = getPlayer(pid);
              return (
                <div key={pid} style={{
                  background: "var(--surface)",
                  border: `1px solid ${captain === pid ? "var(--accent)" : "var(--border)"}`,
                  borderRadius: "8px", padding: "0.75rem 1rem",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {p?.name ?? pid}
                      {captain === pid && (
                        <span style={{
                          marginLeft: "0.5rem", background: "var(--accent)", color: "#000",
                          fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "3px",
                        }}>C</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {p?.game} · <span style={{ color: "var(--accent)" }}>{p?.price}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    <button
                      onClick={() => setCaptain(pid)}
                      style={{
                        background: captain === pid ? "var(--accent)" : "var(--surface)",
                        color: captain === pid ? "#000" : "var(--text-muted)",
                        border: "1px solid var(--border)", borderRadius: "4px",
                        padding: "0.2rem 0.5rem", fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >C</button>
                    <button
                      onClick={() => removeFromSquad(pid)}
                      style={{
                        background: "transparent", color: "var(--red)",
                        border: "1px solid var(--border)", borderRadius: "4px",
                        padding: "0.2rem 0.5rem", fontSize: "0.8rem", cursor: "pointer",
                      }}
                    >✕</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sub slot */}
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            SUBSTITUTE
          </div>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.5rem",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            minHeight: "60px",
          }}>
            {sub && getPlayer(sub) ? (
              <>
                <div>
                  <div style={{ fontWeight: 600 }}>{getPlayer(sub)!.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {getPlayer(sub)!.game} · <span style={{ color: "var(--accent)" }}>{getPlayer(sub)!.price}</span>
                  </div>
                </div>
                <button
                  onClick={() => setSub("")}
                  style={{
                    background: "transparent", color: "var(--red)",
                    border: "1px solid var(--border)", borderRadius: "4px",
                    padding: "0.2rem 0.5rem", fontSize: "0.8rem", cursor: "pointer",
                  }}
                >✕</button>
              </>
            ) : (
              <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                {squad.length === 4 ? "Click a player to add as sub →" : "Fill your squad of 4 first"}
              </span>
            )}
          </div>

          {error && (
            <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%",
              background: saved ? "var(--green)" : "var(--accent)",
              color: "#000", fontWeight: 700, padding: "0.75rem",
              borderRadius: "8px", border: "none", fontSize: "1rem", cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : saved ? "✓ Saved!" : `Save GW${NEXT_GW} Squad`}
          </button>
        </div>

        {/* RIGHT — all players */}
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>All Players</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "72vh", overflowY: "auto" }}>
            {allPlayers.map((p) => {
              const inSquad = squad.includes(p.id);
              const isSub = sub === p.id;
              const selected = inSquad || isSub;
              const canAfford = selected || (remaining >= p.price);
              return (
                <div
                  key={p.id}
                  onClick={() => canAfford && handlePlayerClick(p)}
                  style={{
                    background: selected ? "rgba(232,255,0,0.08)" : "var(--surface)",
                    border: `1px solid ${inSquad ? "var(--accent)" : isSub ? "#666" : "var(--border)"}`,
                    borderRadius: "8px", padding: "0.75rem 1rem",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    cursor: canAfford ? "pointer" : "not-allowed",
                    opacity: canAfford ? 1 : 0.4,
                    transition: "background 0.15s",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {p.name}
                      {inSquad && captain === p.id && (
                        <span style={{ marginLeft: "0.4rem", background: "var(--accent)", color: "#000", fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "3px" }}>C</span>
                      )}
                      {isSub && (
                        <span style={{ marginLeft: "0.4rem", background: "#444", color: "var(--text)", fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "3px" }}>SUB</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {p.game} · {p.desc}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontWeight: 700, color: "var(--accent)" }}>{p.price}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.totalPoints} pts</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
