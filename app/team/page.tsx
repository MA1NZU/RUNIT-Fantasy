"use client";

import { useEffect, useState, Suspense } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";
import { useSearchParams } from "next/navigation";

type Player = {
  id: string;
  name: string;
  game: string;
  price: number;
  points: number;
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

function PlayerCard({
  player,
  points,
  isCaptain,
  slot,
  onClick,
}: {
  player: Player;
  points: number;
  isCaptain?: boolean;
  isSub?: boolean;
  slot?: string;
  onClick?: () => void;
}) {
  const description = player.desc || "Fit to play";
  const isUnfit = description !== "Fit to play";
  const shownPoints = isCaptain ? points * 2 : points;

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        overflow: "hidden",
        background: isCaptain
          ? "linear-gradient(145deg, rgba(3,71,244,0.18), rgba(255,193,7,0.07)), var(--surface)"
          : "linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015)), var(--surface)",
        border: `1px solid ${
          isUnfit
            ? "var(--red)"
            : isCaptain
            ? "rgba(107,159,255,0.75)"
            : "var(--border)"
        }`,
        borderRadius: "20px",
        padding: "0.75rem",
        cursor: "pointer",
        transition: "transform 0.15s ease",
        minHeight: "235px",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1)";
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
          top: "0.75rem",
          left: "0.75rem",
          display: "flex",
          gap: "0.35rem",
          zIndex: 3,
          flexWrap: "wrap",
        }}
      >
        {slot && (
          <span
            style={{
              background: "rgba(0,0,0,0.45)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: "0.62rem",
              fontWeight: 800,
              padding: "0.2rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            {slot}
          </span>
        )}

        {isCaptain && (
          <span
            style={{
              background: "var(--blue)",
              color: "#fff",
              fontSize: "0.62rem",
              fontWeight: 900,
              padding: "0.2rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            CAPTAIN
          </span>
        )}
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          aspectRatio: "1/1",
          borderRadius: "16px",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 35%), #161616",
          marginBottom: "0.8rem",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {player.image ? (
          <img
            src={player.image}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            alt={player.name}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.4rem",
              fontWeight: 900,
              color: "rgba(255,255,255,0.18)",
            }}
          >
            {player.name.slice(0, 1)}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "1.5rem 0.6rem 0.55rem",
            background:
              "linear-gradient(to top, rgba(0,0,0,0.78), transparent)",
          }}
        >
          <div
            style={{
              color: "#fff",
              fontWeight: 900,
              fontSize: "0.95rem",
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
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "0.75rem",
          alignItems: "center",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              marginBottom: "0.2rem",
            }}
          >
            {player.game}
          </div>

          <div
            style={{
              fontSize: "0.72rem",
              color: isUnfit ? "var(--red)" : "var(--text-muted)",
              lineHeight: 1.35,
              height: "2rem",
              overflow: "hidden",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            textAlign: "right",
            background: isCaptain
              ? "rgba(255,193,7,0.12)"
              : "rgba(255,255,255,0.045)",
            border: isCaptain
              ? "1px solid rgba(255,193,7,0.25)"
              : "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            padding: "0.5rem 0.65rem",
            minWidth: "70px",
          }}
        >
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: 900,
              color: isCaptain ? "var(--accent)" : "var(--text)",
              lineHeight: 1,
            }}
          >
            {shownPoints}
          </div>

          <div
            style={{
              fontSize: "0.62rem",
              color: "var(--text-muted)",
              marginTop: "0.2rem",
              whiteSpace: "nowrap",
            }}
          >
            pts {isCaptain ? "x2" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsModal({
  player,
  stats,
  isCaptain,
  onClose,
}: {
  player: Player;
  stats: any;
  isCaptain: boolean;
  onClose: () => void;
}) {
  const s = (key: string) => Number(stats[key] || 0);

  const getBreakdown = () => {
    const rows: { label: string; val: any; pts: number }[] = [];

    if (s("matchWin"))
      rows.push({
        label: "Match Win",
        val: s("matchWin"),
        pts: s("matchWin") * 2,
      });

    if (s("matchLose"))
      rows.push({
        label: "Match Loss",
        val: s("matchLose"),
        pts: s("matchLose") * -2,
      });

    if (s("mvp"))
      rows.push({
        label: "MVP",
        val: s("mvp"),
        pts: s("mvp") * 8,
      });

    if (s("svp"))
      rows.push({
        label: "SVP",
        val: s("svp"),
        pts: s("svp") * 5,
      });

    if (s("bonus"))
      rows.push({
        label: "Bonus",
        val: s("bonus"),
        pts: s("bonus") * 1,
      });

    if (player.game === "Valorant") {
      if (s("kills"))
        rows.push({
          label: "Kills",
          val: s("kills"),
          pts: Math.floor(s("kills") / 2),
        });

      if (s("assists"))
        rows.push({
          label: "Assists",
          val: s("assists"),
          pts: Math.floor(s("assists") / 2),
        });

      if (s("deaths"))
        rows.push({
          label: "Deaths",
          val: s("deaths"),
          pts: Math.floor(s("deaths") / 3) * -1,
        });

      if (s("firstBlood"))
        rows.push({
          label: "First Blood",
          val: s("firstBlood"),
          pts: s("firstBlood"),
        });

      if (s("firstDeath"))
        rows.push({
          label: "First Death",
          val: s("firstDeath"),
          pts: s("firstDeath") * -1,
        });

      if (s("tripleKill"))
        rows.push({
          label: "Triple Kill",
          val: s("tripleKill"),
          pts: s("tripleKill") * 3,
        });

      if (s("quadraKill"))
        rows.push({
          label: "Quadra Kill",
          val: s("quadraKill"),
          pts: s("quadraKill") * 5,
        });

      if (s("ace"))
        rows.push({
          label: "Ace",
          val: s("ace"),
          pts: s("ace") * 8,
        });

      if (s("clutch"))
        rows.push({
          label: "Clutch",
          val: s("clutch"),
          pts: s("clutch") * 2,
        });
    } else {
      if (s("kills"))
        rows.push({
          label: "Kills",
          val: s("kills"),
          pts: Math.floor(s("kills") / 3),
        });

      if (s("assists"))
        rows.push({
          label: "Assists",
          val: s("assists"),
          pts: Math.floor(s("assists") / 4),
        });

      if (s("deaths"))
        rows.push({
          label: "Deaths",
          val: s("deaths"),
          pts: s("deaths") * -2,
        });

      if (s("lastKills"))
        rows.push({
          label: "Last Kills",
          val: s("lastKills"),
          pts: Math.floor(s("lastKills") / 2),
        });

      if (s("headKill"))
        rows.push({
          label: "Head Kill",
          val: s("headKill"),
          pts: s("headKill") * 3,
        });

      if (s("healing"))
        rows.push({
          label: "Healing",
          val: s("healing"),
          pts: Math.floor(s("healing") / 5050),
        });

      if (s("damage"))
        rows.push({
          label: "Damage",
          val: s("damage"),
          pts: Math.floor(s("damage") / 5050),
        });

      if (s("blocked"))
        rows.push({
          label: "Blocked",
          val: s("blocked"),
          pts: Math.floor(s("blocked") / 5050),
        });

      if (s("soloKills"))
        rows.push({
          label: "Solo Kills",
          val: s("soloKills"),
          pts: s("soloKills"),
        });
    }

    return rows;
  };

  const rows = getBreakdown();
  const totalRaw = rows.reduce((acc, r) => acc + r.pts, 0);
  const totalShown = isCaptain ? totalRaw * 2 : totalRaw;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 15% 0%, rgba(3,71,244,0.22), transparent 35%), var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "26px",
          width: "100%",
          maxWidth: "500px",
          padding: "1.25rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            width: "34px",
            height: "34px",
            borderRadius: "12px",
            fontSize: "1rem",
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          ✕
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.25rem",
            paddingRight: "2.5rem",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "18px",
              overflow: "hidden",
              background: "#222",
              border: "1px solid rgba(255,255,255,0.1)",
              flexShrink: 0,
            }}
          >
            {player.image ? (
              <img
                src={player.image}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                alt={player.name}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.18)",
                }}
              >
                {player.name.slice(0, 1)}
              </div>
            )}
          </div>

          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 900, margin: 0 }}>
              {player.name}
            </h2>

            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--accent)",
                fontWeight: 800,
                marginTop: "0.25rem",
              }}
            >
              {player.game.toUpperCase()} ·{" "}
              {isCaptain ? "CAPTAIN X2" : "PLAYER STATS"}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(255,255,255,0.035)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "18px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 70px 70px",
              fontSize: "0.68rem",
              color: "var(--text-muted)",
              fontWeight: 900,
              textTransform: "uppercase",
              padding: "0.8rem 0.9rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span>Statistic</span>
            <span style={{ textAlign: "right" }}>Value</span>
            <span style={{ textAlign: "right" }}>Pts</span>
          </div>

          <div
            style={{
              maxHeight: "310px",
              overflowY: "auto",
            }}
          >
            {rows.length === 0 ? (
              <div
                style={{
                  padding: "1.5rem",
                  color: "var(--text-muted)",
                  textAlign: "center",
                  fontSize: "0.9rem",
                }}
              >
                No stats recorded for this player yet.
              </div>
            ) : (
              rows.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 70px 70px",
                    padding: "0.8rem 0.9rem",
                    borderBottom:
                      i === rows.length - 1
                        ? "none"
                        : "1px solid var(--border)",
                    fontSize: "0.9rem",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{r.label}</span>

                  <span
                    style={{
                      textAlign: "right",
                      color: "var(--text-muted)",
                    }}
                  >
                    {r.val.toLocaleString()}
                  </span>

                  <span
                    style={{
                      textAlign: "right",
                      fontWeight: 900,
                      color: r.pts >= 0 ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {r.pts > 0 ? `+${r.pts}` : r.pts}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: "1rem",
            padding: "1rem",
            background:
              "linear-gradient(135deg, rgba(255,193,7,0.12), rgba(3,71,244,0.12))",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "18px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              {isCaptain ? "Total GW Points · Doubled" : "Total GW Points"}
            </div>

            <div style={{ fontSize: "0.9rem", fontWeight: 800 }}>
              {isCaptain ? "TOTAL" : "TOTAL"}
            </div>
          </div>

          <div
            style={{
              fontSize: "1.7rem",
              fontWeight: 900,
              color: "var(--accent)",
            }}
          >
            {totalShown}
          </div>
        </div>
      </div>
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
  const [matchStats, setMatchStats] = useState<Record<string, any>>({});

  const [currentGW, setCurrentGW] = useState<number>(7);
  const [selectedGW, setSelectedGW] = useState<number>(7);
  const [loading, setLoading] = useState(true);

  const [selectedStatPlayerId, setSelectedStatPlayerId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (!targetEmail) return;

    const loadData = async () => {
      setLoading(true);
      setGwTeams([]);

      try {
        const settingsSnap = await getDocs(collection(db, "settings"));

        let activeGW = 7;

        if (!settingsSnap.empty) {
          activeGW = Number(settingsSnap.docs[0].data().currentGameweek || 7);
          setCurrentGW(activeGW);
          setSelectedGW(activeGW);
        }

        const pSnap = await getDocs(collection(db, "players"));
        const pMap: Record<string, Player> = {};

        pSnap.docs.forEach((d) => {
          const data = d.data();
          const p = { id: d.id, ...data } as Player;

          pMap[d.id] = p;

          if (data.ID) {
            pMap[data.ID] = p;
          }
        });

        setPlayers(pMap);

        const teamsSnap = await getDocs(
          query(
            collection(db, "gameweekTeams"),
            where("ownerEmail", "==", targetEmail),
            orderBy("gameweek", "desc")
          )
        );

        const teams = teamsSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as GWTeam)
        );

        setGwTeams(teams);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    };

    loadData();
  }, [targetEmail]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsSnap = await getDocs(
          query(
            collection(db, "playerMatchStats"),
            where("gameweek", "==", selectedGW)
          )
        );

        const sMap: Record<string, any> = {};

        statsSnap.docs.forEach((d) => {
          const data = d.data();

          if (data.Title) {
            sMap[data.Title] = data;
          }

          if (data.player) {
            sMap[data.player] = data;
          }

          sMap[d.id] = data;
        });

        setMatchStats(sMap);
      } catch (err) {
        console.error(err);
      }
    };

    loadStats();
  }, [selectedGW]);

  const currentTeam = gwTeams.find((t) => t.gameweek === selectedGW);

  const availableGWs = Array.from(new Set(gwTeams.map((t) => t.gameweek)))
    .filter((gw) => gw <= currentGW)
    .sort((a, b) => b - a);

  const playerIds = currentTeam
    ? [
        currentTeam.player1,
        currentTeam.player2,
        currentTeam.player3,
        currentTeam.player4,
      ].filter(Boolean)
    : [];

  const getPoints = (id: string) => {
    const p = players[id];

    if (!p) return 0;

    const stats =
      matchStats[p.name] ||
      (p.ID ? matchStats[p.ID] : undefined) ||
      matchStats[p.id];

    if (stats?.gwPoints !== undefined) {
      return Number(stats.gwPoints || 0);
    }

    return selectedGW === currentGW ? Number(p.points || 0) : 0;
  };

  const calculateTeamGWPoints = (team: GWTeam) => {
    const mainPlayerIds = [
      team.player1,
      team.player2,
      team.player3,
      team.player4,
    ].filter(Boolean);

    return mainPlayerIds.reduce((total, pid) => {
      const points = getPoints(pid);

      if (team.captain === pid) {
        return total + points * 2;
      }

      return total + points;
    }, 0);
  };

  const calculatedGWPoints = currentTeam ? calculateTeamGWPoints(currentTeam) : 0;
  const storedGWPoints = Number(currentTeam?.gwPoints || 0);
  const displayGWPoints = calculatedGWPoints || storedGWPoints;

  const squadValue = playerIds.reduce((sum, pid) => {
    const p = players[pid];
    return sum + Number(p?.price || 0);
  }, 0);

  if (loading && gwTeams.length === 0) {
    return (
      <div
        style={{
          maxWidth: "900px",
          margin: "4rem auto",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        Loading Squad...
      </div>
    );
  }

  return (
    <main style={{ maxWidth: "1120px", margin: "0 auto", paddingBottom: "3rem" }}>
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
            {isOwnTeam ? "My Team" : "Manager Team"} · GW{selectedGW}
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
            {isOwnTeam ? "My" : "Manager"}
            <br />
            <span style={{ color: "var(--blue)" }}>Gameweek Team</span>
          </h1>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {availableGWs.map((gw) => (
              <button
                key={gw}
                onClick={() => setSelectedGW(gw)}
                style={{
                  padding: "0.65rem 0.95rem",
                  borderRadius: "12px",
                  border:
                    selectedGW === gw
                      ? "1px solid rgba(107,159,255,0.65)"
                      : "1px solid var(--border)",
                  background:
                    selectedGW === gw
                      ? "var(--blue)"
                      : "rgba(255,255,255,0.045)",
                  color: selectedGW === gw ? "#fff" : "var(--text-muted)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                GW{gw}
              </button>
            ))}
          </div>
        </div>
      </section>

      {currentTeam ? (
        <>
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
                gridTemplateColumns: "1.35fr 1fr 1fr 1fr",
                gap: "0.5rem",
                minWidth: "520px",
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  background: "rgba(255,193,7,0.08)",
                  border: "1px solid rgba(255,193,7,0.25)",
                  borderRadius: "14px",
                  padding: "0.85rem",
                }}
              >
                <div
                  style={{
                    fontSize: "2rem",
                    fontWeight: 900,
                    color: "var(--accent)",
                    lineHeight: 1,
                    letterSpacing: "-0.05em",
                  }}
                >
                  {displayGWPoints}
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
                  GW Points
                </div>
              </div>

              <div
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
                    color: "var(--text)",
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {currentTeam.transfersMade ?? 0}
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
                  Transfers
                </div>
              </div>

              <div
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
                    color: currentTeam.transferPenalty
                      ? "var(--red)"
                      : "var(--text)",
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {currentTeam.transferPenalty ?? 0}
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
                  Penalty
                </div>
              </div>

              <div
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
                    color: "var(--text)",
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {squadValue.toFixed(1)}
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
                  Squad Value
                </div>
              </div>
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
            <div
              style={{
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
              {playerIds.map((pid, i) => {
                const player = players[pid];

                if (!player) return null;

                return (
                  <PlayerCard
                    key={pid || i}
                    player={player}
                    points={getPoints(pid)}
                    isCaptain={currentTeam.captain === pid}
                    slot={`P${i + 1}`}
                    onClick={() => setSelectedStatPlayerId(pid)}
                  />
                );
              })}
            </div>
          </section>

          {currentTeam.sub && players[currentTeam.sub] && (
            <section
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "24px",
                padding: "1rem",
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
                Bench
              </div>

              <div style={{ maxWidth: "220px" }}>
                <PlayerCard
                  player={players[currentTeam.sub]}
                  points={getPoints(currentTeam.sub)}
                  slot="BENCH"
                  onClick={() => setSelectedStatPlayerId(currentTeam.sub)}
                />
              </div>
            </section>
          )}
        </>
      ) : (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "2rem",
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          No squad data found for GW{selectedGW}.
        </div>
      )}

      {selectedStatPlayerId && players[selectedStatPlayerId] && (
        <StatsModal
          player={players[selectedStatPlayerId]}
          stats={
            matchStats[players[selectedStatPlayerId].name] ||
            (players[selectedStatPlayerId].ID
              ? matchStats[players[selectedStatPlayerId].ID as string]
              : undefined) ||
            matchStats[players[selectedStatPlayerId].id] ||
            {}
          }
          isCaptain={currentTeam?.captain === selectedStatPlayerId}
          onClose={() => setSelectedStatPlayerId(null)}
        />
      )}
    </main>
  );
}

export default function TeamPage() {
  return (
    <Shell>
      <Suspense fallback={<p>Loading...</p>}>
        <TeamContent />
      </Suspense>
    </Shell>
  );
}
