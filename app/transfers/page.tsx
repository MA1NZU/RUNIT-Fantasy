"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type Player = {
  id: string;
  name: string;
  game: string;
  price: number;
  points: number;
  totalPoints: number;
  desc: string;
  image?: string;
  ID?: string;
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
  ownerEmail: string;
};

function PlayerCard({
  player,
  isCaptain,
  isSub,
  onCaptain,
  onSub,
  onRemove,
  compact = false,
}: {
  player: Player;
  isCaptain?: boolean;
  isSub?: boolean;
  onCaptain?: () => void;
  onSub?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}) {
  const isUnfit = player.desc && player.desc !== "Fit to play";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: isCaptain
          ? "linear-gradient(145deg, rgba(3,71,244,0.18), rgba(255,193,7,0.06)), var(--surface)"
          : "linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015)), var(--surface)",
        border: `1px solid ${
          isUnfit
            ? "var(--red)"
            : isCaptain
            ? "rgba(107,159,255,0.7)"
            : "var(--border)"
        }`,
        borderRadius: compact ? "16px" : "20px",
        padding: compact ? "0.55rem" : "0.75rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        width: "100%",
        minWidth: 0,
        minHeight: compact ? "190px" : "250px",
        transition: "transform 0.15s ease, border-color 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          position: "absolute",
          width: "120px",
          height: "120px",
          right: "-55px",
          top: "-55px",
          borderRadius: "999px",
          background: isCaptain
            ? "rgba(255,193,7,0.12)"
            : "rgba(3,71,244,0.08)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "0.65rem",
          left: "0.65rem",
          display: "flex",
          gap: "0.3rem",
          zIndex: 3,
          flexWrap: "wrap",
        }}
      >
        {isCaptain && (
          <span
            style={{
              background: "var(--blue)",
              color: "#fff",
              fontSize: "0.58rem",
              fontWeight: 900,
              padding: "0.22rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            CAPTAIN
          </span>
        )}

        {isSub && (
          <span
            style={{
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: "0.58rem",
              fontWeight: 900,
              padding: "0.22rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            BENCH
          </span>
        )}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          aspectRatio: "1/1",
          borderRadius: compact ? "12px" : "16px",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 35%), #161616",
          marginBottom: "0.75rem",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {player.image ? (
          <img
            src={player.image}
            alt={player.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: compact ? "1.5rem" : "2.2rem",
              fontWeight: 900,
              color: "rgba(255,255,255,0.18)",
            }}
          >
            {player.name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "1.4rem 0.55rem 0.5rem",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.78), transparent)",
          }}
        >
          <div
            style={{
              color: "#fff",
              fontWeight: 900,
              fontSize: compact ? "0.78rem" : "0.92rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {player.name}
          </div>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "0.6rem",
          alignItems: "center",
          marginBottom: compact ? "0.55rem" : "0.65rem",
        }}
      >
        <div style={{ minWidth: 0, textAlign: "left" }}>
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.68rem",
              marginBottom: "0.2rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {player.game}
          </div>

          {!compact && (
            <div
              style={{
                fontSize: "0.7rem",
                color: isUnfit ? "var(--red)" : "var(--text-muted)",
                lineHeight: 1.35,
                height: "2rem",
                overflow: "hidden",
              }}
            >
              {player.desc || "Fit to play"}
            </div>
          )}
        </div>

        <div
          style={{
            textAlign: "right",
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "13px",
            padding: compact ? "0.42rem 0.5rem" : "0.5rem 0.65rem",
            minWidth: compact ? "58px" : "68px",
          }}
        >
          <div
            style={{
              color: "var(--accent)",
              fontSize: compact ? "1rem" : "1.2rem",
              fontWeight: 900,
              lineHeight: 1,
            }}
          >
            {Number(player.price || 0).toFixed(1)}
          </div>

          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.58rem",
              marginTop: "0.2rem",
            }}
          >
            million
          </div>
        </div>
      </div>

      {(onCaptain || onSub || onRemove) && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            gap: "0.35rem",
            width: "100%",
            marginTop: "auto",
          }}
        >
          {onCaptain && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCaptain();
              }}
              style={{
                flex: 1,
                background: isCaptain ? "var(--blue)" : "rgba(255,255,255,0.04)",
                color: isCaptain ? "#fff" : "var(--text-muted)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "0.45rem 0",
                fontSize: "0.68rem",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              C
            </button>
          )}

          {onSub && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSub();
              }}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "0.45rem 0",
                fontSize: "0.68rem",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              BENCH
            </button>
          )}

          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{
                flex: 0.45,
                background: "rgba(255,255,255,0.025)",
                color: "var(--red)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "0.85rem",
                fontWeight: 900,
              }}
            >
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EmptySlot({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        minHeight: "250px",
        border: "1px dashed var(--border)",
        borderRadius: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--text-muted)",
        fontSize: "0.85rem",
        textAlign: "center",
        flexDirection: "column",
        gap: "0.6rem",
        background: "rgba(255,255,255,0.02)",
        transition: "border-color 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(107,159,255,0.6)";
        e.currentTarget.style.transform = "translateY(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <span
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "14px",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.4rem",
          color: "var(--blue)",
        }}
      >
        +
      </span>
      <span style={{ fontWeight: 800 }}>{label}</span>
    </div>
  );
}

function CountdownTimer({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const update = () => {
      const now = new Date().getTime();
      const target = new Date(deadline).getTime();
      const diff = target - now;

      if (Number.isNaN(target)) {
        setTimeLeft("No deadline");
        return;
      }

      if (diff <= 0) {
        setTimeLeft("Deadline passed");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    update();

    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  return (
    <div
      style={{
        background: "rgba(3,71,244,0.12)",
        border: "1px solid rgba(107,159,255,0.45)",
        padding: "0.55rem 0.8rem",
        borderRadius: "12px",
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <span
        style={{
          fontSize: "0.68rem",
          fontWeight: 900,
          color: "#8bb5ff",
          textTransform: "uppercase",
          letterSpacing: "0.7px",
        }}
      >
        Deadline
      </span>

      <span
        style={{
          fontSize: "0.85rem",
          fontWeight: 900,
          fontFamily: "monospace",
          color: "var(--text)",
        }}
      >
        {timeLeft || "Loading..."}
      </span>
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
  const [nextGW, setNextGW] = useState<number>(8);
  const [deadline, setDeadline] = useState<string>("");
  const [isLocked, setIsLocked] = useState(false);

  const [search, setSearch] = useState("");
  const [gameFilter, setGameFilter] = useState<"all" | string>("all");

  useEffect(() => {
    if (!user?.email) return;

    const load = async () => {
      setLoading(true);

      try {
        const settingsSnap = await getDocs(collection(db, "settings"));

        let activeNextGW = 8;

        if (!settingsSnap.empty) {
          const s = settingsSnap.docs[0].data();

          activeNextGW = Number(s.currentGameweek || 7) + 1;

          setNextGW(activeNextGW);
          setDeadline(s.deadline || "");

          if (s.lockTransfers) {
            setIsLocked(true);
            setLoading(false);
            return;
          }
        }

        const playersSnap = await getDocs(collection(db, "players"));

        const map: Record<string, Player> = {};
        const list: Player[] = [];

        playersSnap.docs.forEach((d) => {
          const data = d.data();
          const p = { id: d.id, ...data } as Player;

          map[d.id] = p;

          if (data.ID) {
            map[data.ID] = p;
          }

          list.push(p);
        });

        setPlayerMap(map);

        setAllPlayers(
          list.sort(
            (a, b) => Number(b.totalPoints ?? 0) - Number(a.totalPoints ?? 0)
          )
        );

        const userTeamSnap = await getDocs(
          query(collection(db, "userTeams"), where("ownerEmail", "==", user.email))
        );

        if (!userTeamSnap.empty) {
          setUserTeam({
            id: userTeamSnap.docs[0].id,
            ...userTeamSnap.docs[0].data(),
          } as UserTeam);
        }

        const gwSnap = await getDocs(
          query(
            collection(db, "gameweekTeams"),
            where("ownerEmail", "==", user.email),
            orderBy("gameweek", "desc")
          )
        );

        const gwTeams = gwSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as GWTeam)
        );

        const current = gwTeams.find((t) => t.gameweek === activeNextGW - 1);
        const next = gwTeams.find((t) => t.gameweek === activeNextGW);

        setCurrentGWTeam(current ?? null);
        setNextGWTeam(next ?? null);

        const base = next ?? current;

        if (base) {
          setSquad(
            [base.player1, base.player2, base.player3, base.player4].filter(
              Boolean
            )
          );
          setCaptain(base.captain ?? "");
          setSub(base.sub ?? "");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load transfers.");
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const getPlayer = (id: string) => playerMap[id];

  const budget = Number(userTeam?.Bank ?? 0);
  const allSelected = [...squad, ...(sub ? [sub] : [])];
  const totalCost = allSelected.reduce(
    (sum, id) => sum + Number(getPlayer(id)?.price ?? 0),
    0
  );
  const remaining = budget - totalCost;
  const squadCount = squad.length + (sub ? 1 : 0);

  const transfersMade = (() => {
    if (!currentGWTeam) return 0;

    const prev = [
      currentGWTeam.player1,
      currentGWTeam.player2,
      currentGWTeam.player3,
      currentGWTeam.player4,
      currentGWTeam.sub,
    ].filter(Boolean);

    return allSelected.filter((id) => !prev.includes(id)).length;
  })();

  const freeTransfers = Number(userTeam?.freeTransfers ?? 1);
  const freeTransfersRemaining = Math.max(0, freeTransfers - transfersMade);
  const penalty = Math.max(0, transfersMade - freeTransfers) * 4;

  const uniqueGames = Array.from(
    new Set(allPlayers.map((p) => p.game).filter(Boolean))
  ).sort();

  const filteredPlayers = allPlayers.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesGame = gameFilter === "all" || p.game === gameFilter;

    return matchesSearch && matchesGame;
  });

  const handlePlayerSelect = (p: Player) => {
    setError("");

    if (allSelected.includes(p.id)) return;

    if (totalCost + Number(p.price || 0) > budget) {
      setError("Budget exceeded.");
      return;
    }

    if (squad.length < 4) {
      setSquad([...squad, p.id]);

      if (!captain) {
        setCaptain(p.id);
      }
    } else if (!sub) {
      setSub(p.id);
    }

    setIsModalOpen(false);
  };

  const removeFromSquad = (id: string) => {
    setError("");

    setSquad(squad.filter((p) => p !== id));

    if (captain === id) setCaptain("");
  };

  const swapWithSub = (pid: string) => {
    setError("");

    if (!sub) {
      setSquad(squad.filter((id) => id !== pid));
      setSub(pid);

      if (captain === pid) setCaptain("");

      return;
    }

    const currentSub = sub;
    const newSquad = squad
      .map((id) => (id === pid ? currentSub : id))
      .filter(Boolean);

    setSquad(newSquad);
    setSub(pid);

    if (captain === pid) setCaptain("");
  };

  const moveSubToSquad = () => {
    setError("");

    if (!sub) return;

    if (squad.length >= 4) {
      setError("Starting IV is already full. Use BENCH on a starter to swap.");
      return;
    }

    setSquad([...squad, sub]);
    setSub("");
  };

  const handleSave = async () => {
    setError("");

    if (squad.length !== 4 || !sub || !captain) {
      setError("Complete your squad first.");
      return;
    }

    if (remaining < 0) {
      setError("Budget exceeded.");
      return;
    }

    if (!user?.email) {
      setError("You must be signed in.");
      return;
    }

    setSaving(true);

    const data = {
      player1: squad[0],
      player2: squad[1],
      player3: squad[2],
      player4: squad[3],
      captain,
      sub,
      gameweek: nextGW,
      ownerEmail: user.email,
      gwPoints: nextGWTeam?.gwPoints ?? 0,
      transfersMade,
      transferPenalty: penalty,
      "Updated Date": new Date().toISOString(),
    };

    try {
      if (nextGWTeam) {
        await updateDoc(doc(db, "gameweekTeams", nextGWTeam.id), data);
      } else {
        const snap = await addDoc(collection(db, "gameweekTeams"), {
          ...data,
          "Created Date": new Date().toISOString(),
        });

        setNextGWTeam({ id: snap.id, ...data } as GWTeam);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to save.");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <Shell>
        <div
          style={{
            maxWidth: "900px",
            margin: "4rem auto",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          Loading Transfers...
        </div>
      </Shell>
    );
  }

  if (isLocked) {
    return (
      <Shell>
        <div
          style={{
            maxWidth: "760px",
            margin: "4rem auto",
            position: "relative",
            overflow: "hidden",
            border: "1px solid var(--border)",
            borderRadius: "28px",
            padding: "2.5rem",
            background:
              "radial-gradient(circle at 20% 10%, rgba(3, 71, 244, 0.3), transparent 35%), radial-gradient(circle at 90% 20%, rgba(255, 193, 7, 0.14), transparent 30%), linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02))",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "22px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.2rem",
              fontSize: "2rem",
            }}
          >
            ⏱
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3.2rem)",
              lineHeight: 1,
              letterSpacing: "-0.05em",
              fontWeight: 900,
              marginBottom: "0.75rem",
            }}
          >
            Gameweek is{" "}
            <span style={{ color: "var(--blue)" }}>Live</span>
          </h1>

          <p
            style={{
              color: "var(--text-muted)",
              maxWidth: "460px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Team selection is currently locked. Please wait for the next
            gameweek.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <main
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          paddingBottom: "3rem",
        }}
      >
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            border: "1px solid var(--border)",
            borderRadius: "28px",
            padding: "2rem",
            marginBottom: "1rem",
            background:
              "radial-gradient(circle at 20% 10%, rgba(3, 71, 244, 0.28), transparent 32%), radial-gradient(circle at 90% 20%, rgba(255, 193, 7, 0.14), transparent 30%), linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02))",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "280px",
              height: "280px",
              right: "-110px",
              bottom: "-110px",
              borderRadius: "999px",
              background: "rgba(3, 71, 244, 0.18)",
              filter: "blur(20px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(3, 71, 244, 0.15)",
                border: "1px solid rgba(107, 159, 255, 0.45)",
                color: "#8bb5ff",
                fontSize: "0.75rem",
                padding: "6px 12px",
                borderRadius: "999px",
                marginBottom: "1rem",
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "999px",
                  background: "var(--accent)",
                }}
              />
              Team Builder · GW{nextGW}
            </div>

            <h1
              style={{
                fontSize: "clamp(2.5rem, 7vw, 4.75rem)",
                lineHeight: 0.95,
                letterSpacing: "-0.06em",
                fontWeight: 900,
                margin: "0 0 1rem",
              }}
            >
              Transfers
              <br />
            </h1>

            {deadline && <CountdownTimer deadline={deadline} />}
          </div>
        </section>

        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "18px",
            padding: "0.65rem",
            marginBottom: "1rem",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr",
              gap: "0.5rem",
              minWidth: "680px",
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                background:
                  remaining < 0
                    ? "rgba(255,70,70,0.08)"
                    : "rgba(255,193,7,0.08)",
                border:
                  remaining < 0
                    ? "1px solid rgba(255,70,70,0.25)"
                    : "1px solid rgba(255,193,7,0.25)",
                borderRadius: "14px",
                padding: "0.85rem",
              }}
            >
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 900,
                  color: remaining < 0 ? "var(--red)" : "var(--accent)",
                  lineHeight: 1,
                  letterSpacing: "-0.05em",
                }}
              >
                {remaining.toFixed(1)}
              </div>

              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.68rem",
                  marginTop: "0.35rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.7px",
                }}
              >
                Bank Left
              </div>
            </div>

            {[
              {
                value: budget.toFixed(1),
                label: "Budget",
                color: "var(--text)",
              },
              {
                value: `${squadCount}/5`,
                label: "Squad",
                color: squadCount === 5 ? "var(--green)" : "var(--text)",
              },
              {
                value: freeTransfersRemaining,
                label: "Transfers",
                color: freeTransfersRemaining > 0 ? "var(--green)" : "var(--text)",
              },
              {
                value: penalty > 0 ? `-${penalty}` : "0",
                label: "Penalty",
                color: penalty > 0 ? "var(--red)" : "var(--text)",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "0.85rem",
                }}
              >
                <div
                  style={{
                    fontSize: "1.45rem",
                    fontWeight: 900,
                    color: stat.color,
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {stat.value}
                </div>

                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.68rem",
                    marginTop: "0.35rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.7px",
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(3,71,244,0.12), transparent 35%), var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "26px",
            padding: "1rem",
            marginBottom: "1rem",
            overflow: "hidden",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontWeight: 900,
              }}
            >
              Starting IV
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
              gap: "1rem",
            }}
          >
            {[0, 1, 2, 3].map((i) => {
              const pid = squad[i];
              const p = pid ? getPlayer(pid) : null;

              return p ? (
                <PlayerCard
                  key={pid}
                  player={p}
                  isCaptain={captain === pid}
                  onCaptain={() => setCaptain(pid === captain ? "" : pid)}
                  onSub={() => swapWithSub(pid)}
                  onRemove={() => removeFromSquad(pid)}
                />
              ) : (
                <EmptySlot
                  key={i}
                  label="Add Player"
                  onClick={() => setIsModalOpen(true)}
                />
              );
            })}
          </div>
        </section>

        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "1px",
              fontWeight: 900,
              marginBottom: "1rem",
            }}
          >
            Substitute Bench
          </div>

          <div style={{ maxWidth: "220px" }}>
            {sub && getPlayer(sub) ? (
              <PlayerCard
                player={getPlayer(sub)!}
                isSub={true}
                onCaptain={moveSubToSquad}
                onRemove={() => setSub("")}
              />
            ) : (
              <EmptySlot label="Add Bench" onClick={() => setIsModalOpen(true)} />
            )}
          </div>
        </section>

        {error && (
          <div
            style={{
              color: "var(--red)",
              background: "rgba(255,70,70,0.08)",
              border: "1px solid rgba(255,70,70,0.25)",
              borderRadius: "14px",
              padding: "0.85rem 1rem",
              marginBottom: "1rem",
              fontWeight: 800,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            background: saved ? "var(--green)" : "var(--blue)",
            color: "#fff",
            fontWeight: 900,
            padding: "1rem",
            borderRadius: "14px",
            border: "none",
            fontSize: "1rem",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : saved ? "✓ Saved!" : `Save GW${nextGW} Squad`}
        </button>

        {isModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.85)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div
              style={{
                background: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "24px",
                width: "100%",
                maxWidth: "920px",
                maxHeight: "88vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid var(--border)",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "1rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 900,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Add Player
                  </h2>

                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                    }}
                  >
                    Bank left: {remaining.toFixed(1)}m · Selected {squadCount}/5
                  </div>
                </div>

                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "var(--text)",
                    width: "38px",
                    height: "38px",
                    borderRadius: "14px",
                    fontSize: "1.2rem",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid var(--border)",
                  display: "grid",
                  gridTemplateColumns: "1fr 180px",
                  gap: "0.75rem",
                }}
              >
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search players..."
                  style={{
                    width: "100%",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: "12px",
                    padding: "0.75rem 0.9rem",
                    fontWeight: 700,
                    outline: "none",
                  }}
                />

                <select
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                    borderRadius: "12px",
                    padding: "0.75rem 0.9rem",
                    fontWeight: 700,
                    outline: "none",
                  }}
                >
                  <option value="all">All games</option>
                  {uniqueGames.map((game) => (
                    <option key={game} value={game}>
                      {game}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  padding: "1rem",
                  overflowY: "auto",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                  gap: "1rem",
                }}
              >
                {filteredPlayers.map((p) => {
                  const isSelected = allSelected.includes(p.id);
                  const canAfford = isSelected || remaining >= Number(p.price || 0);

                  return (
                    <div
                      key={p.id}
                      onClick={() =>
                        !isSelected && canAfford && handlePlayerSelect(p)
                      }
                      style={{
                        opacity: isSelected ? 0.42 : canAfford ? 1 : 0.35,
                        cursor: isSelected || !canAfford ? "not-allowed" : "pointer",
                        position: "relative",
                      }}
                    >
                      <PlayerCard player={p} compact={true} />

                      {isSelected && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: 900,
                            background: "rgba(0,0,0,0.42)",
                          }}
                        >
                          Selected
                        </div>
                      )}

                      {!isSelected && !canAfford && (
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontWeight: 900,
                            background: "rgba(0,0,0,0.42)",
                          }}
                        >
                          Too Expensive
                        </div>
                      )}
                    </div>
                  );
                })}

                {filteredPlayers.length === 0 && (
                  <div
                    style={{
                      gridColumn: "1/-1",
                      color: "var(--text-muted)",
                      textAlign: "center",
                      padding: "2rem",
                    }}
                  >
                    No players found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </Shell>
  );
}
