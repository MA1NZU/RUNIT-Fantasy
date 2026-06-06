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
const SQUAD_SIZE = 4;

export default function TransfersPage() {
  const { user } = useAuth();
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [userTeam, setUserTeam] = useState<UserTeam | null>(null);
  const [currentGWTeam, setCurrentGWTeam] = useState<GWTeam | null>(null);
  const [nextGWTeam, setNextGWTeam] = useState<GWTeam | null>(null);

  // selected squad state
  const [squad, setSquad] = useState<string[]>([]); // 4 player ids
  const [captain, setCaptain] = useState<string>("");
  const [sub, setSub] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // load everything
  useEffect(() => {
    if (!user?.email) return;

    const load = async () => {
      // load all players
      const playersSnap = await getDocs(collection(db, "players"));
      const players = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Player));
      setAllPlayers(players.sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0)));

      // load userTeam
      const userTeamSnap = await getDocs(
        query(collection(db, "userTeams"), where("ownerEmail", "==", user.email))
      );
      if (!userTeamSnap.empty) {
        setUserTeam({ id: userTeamSnap.docs[0].id, ...userTeamSnap.docs[0].data() } as UserTeam);
      }

      // load GW teams
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

      // pre-fill squad from next GW if exists, else from current GW
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

  const getPlayer = (id: string) => allPlayers.find((p) => p.id === id);

  const totalCost = squad.reduce((sum, id) => {
    const p = getPlayer(id);
    return sum + (p?.price ?? 0);
  }, 0);

  const budget = userTeam?.Bank ?? 0;
  const remaining = budget - totalCost;

  // count transfers vs previous GW
  const transfersMade = (() => {
    if (!currentGWTeam) return 0;
    const prev = [currentGWTeam.player1, currentGWTeam.player2, currentGWTeam.player3, currentGWTeam.player4];
    return squad.filter((id) => !prev.includes(id)).length;
  })();

  const freeTransfers = userTeam?.freeTransfers ?? 1;
  const extraTransfers = Math.max(0, transfersMade - freeTransfers);
  const penalty = extraTransfers * 4;

  const togglePlayer = (id: string) => {
    setError("");
    if (squad.includes(id)) {
      // remove
      setSquad(squad.filter((p) => p !== id));
      if (captain === id) setCaptain("");
      if (sub === id) setSub("");
    } else {
      if (squad.length >= SQUAD_SIZE) {
        setError("You already have 4 players. Remove one first.");
        return;
      }
      const p = getPlayer(id);
      if (totalCost + (p?.price ?? 0) > budget) {
        setError("Not enough budget for this player.");
        return;
      }
      setSquad([...squad, id]);
    }
  };

  const handleSave = async () => {
    if (squad.length !== SQUAD_SIZE) {
      setError("You need exactly 4 players.");
      return;
    }
    if (!captain || !squad.includes(captain)) {
      setError("Please set a captain from your 4 players.");
      return;
    }
    if (!sub) {
      setError("Please set a substitute.");
      return;
    }
    if (sub === captain) {
      setError("Captain and substitute cannot be the same player.");
      return;
    }

    setSaving(true);
    setError("");

    const data = {
      player1: squad[0],
      player2: squad[1],
      player3: squad[2],
      player4: squad[3],
      captain,
      sub,
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
        await addDoc(collection(db, "gameweekTeams"), data);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError("Failed to save. Please try again.");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Transfers</h1>
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Transfers</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "2rem", fontSize: "0.9rem" }}>
        Building your squad for Gameweek {NEXT_GW}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>

        {/* LEFT — your squad */}
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
            Your Squad ({squad.length}/{SQUAD_SIZE})
          </h2>

          {/* Budget bar */}
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "10px", padding: "1rem", marginBottom: "1rem",
            display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem",
          }}>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Budget</div>
              <div style={{ fontWeight: 700 }}>{budget.toFixed(1)}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Spent</div>
              <div style={{ fontWeight: 700 }}>{totalCost.toFixed(1)}</div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Remaining</div>
              <div style={{ fontWeight: 700, color: remaining < 0 ? "var(--red)" : "var(--green)" }}>
                {remaining.toFixed(1)}
              </div>
            </div>
            <div>
              <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Transfers</div>
              <div style={{ fontWeight: 700, color: penalty > 0 ? "var(--red)" : "var(--text)" }}>
                {transfersMade} made {penalty > 0 ? `(-${penalty} pts)` : ""}
              </div>
            </div>
          </div>

          {/* Squad slots */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1rem" }}>
            {squad.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                Select players from the list →
              </p>
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
                    <div style={{ fontWeight: 600 }}>{p?.name ?? pid}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {p?.game} · {p?.price}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                    <button
                      onClick={() => setCaptain(pid)}
                      title="Set as captain"
                      style={{
                        background: captain === pid ? "var(--accent)" : "var(--surface)",
                        color: captain === pid ? "#000" : "var(--text-muted)",
                        border: "1px solid var(--border)",
                        borderRadius: "4px", padding: "0.2rem 0.5rem",
                        fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >C</button>
                    <button
                      onClick={() => setSub(sub === pid ? "" : pid)}
                      title="Set as sub"
                      style={{
                        background: sub === pid ? "#444" : "var(--surface)",
                        color: sub === pid ? "var(--text)" : "var(--text-muted)",
                        border: "1px solid var(--border)",
                        borderRadius: "4px", padding: "0.2rem 0.5rem",
                        fontSize: "0.7rem", fontWeight: 700, cursor: "pointer",
                      }}
                    >S</button>
                    <button
                      onClick={() => togglePlayer(pid)}
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

          {/* Sub display */}
          {sub && (
            <div style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1rem",
            }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Substitute</div>
              <div style={{ fontWeight: 600 }}>{getPlayer(sub)?.name ?? sub}</div>
            </div>
          )}

          {error && (
            <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: "100%", background: "var(--accent)", color: "#000",
              fontWeight: 700, padding: "0.75rem", borderRadius: "8px",
              border: "none", fontSize: "1rem", cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : saved ? "✓ Saved!" : `Save GW${NEXT_GW} Squad`}
          </button>
        </div>

        {/* RIGHT — all players list */}
        <div>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "1rem" }}>
            All Players
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "70vh", overflowY: "auto" }}>
            {allPlayers.map((p) => {
              const inSquad = squad.includes(p.id);
              const canAfford = remaining >= p.price || inSquad;
              return (
                <div
                  key={p.id}
                  onClick={() => canAfford && togglePlayer(p.id)}
                  style={{
                    background: inSquad ? "rgba(232,255,0,0.08)" : "var(--surface)",
                    border: `1px solid ${inSquad ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: "8px", padding: "0.75rem 1rem",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    cursor: canAfford ? "pointer" : "not-allowed",
                    opacity: canAfford ? 1 : 0.4,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {p.game} · {p.desc}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
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
