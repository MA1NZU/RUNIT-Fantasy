"use client";

import { useEffect, useState, Suspense } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  runTransaction,
  increment,
} from "firebase/firestore";
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
  isSub,
  onClick,
}: {
  player: Player;
  points: number;
  isCaptain?: boolean;
  isSub?: boolean;
  onClick?: () => void;
}) {
  const description = player.desc || "Fit to play";
  const isUnfit = description !== "Fit to play";

  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--surface)",
        border: `1px solid ${
          isUnfit ? "var(--red)" : isCaptain ? "var(--blue)" : "var(--border)"
        }`,
        borderRadius: "12px",
        padding: "0.6rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        position: "relative",
        width: "100%",
        cursor: "pointer",
        transition: "transform 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "scale(1.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "scale(1)";
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "0.4rem",
          left: "0.4rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.2rem",
          zIndex: 2,
        }}
      >
        {isCaptain && (
          <span
            style={{
              background: "var(--blue)",
              color: "#fff",
              fontSize: "0.55rem",
              fontWeight: 700,
              padding: "0.1rem 0.3rem",
              borderRadius: "3px",
            }}
          >
            C
          </span>
        )}

        {isSub && (
          <span
            style={{
              background: "#333",
              color: "#fff",
              fontSize: "0.55rem",
              fontWeight: 700,
              padding: "0.1rem 0.3rem",
              borderRadius: "3px",
            }}
          >
            SUB
          </span>
        )}
      </div>

      <div
        style={{
          width: "100%",
          aspectRatio: "1/1",
          borderRadius: "8px",
          overflow: "hidden",
          background: "#222",
          marginBottom: "0.5rem",
        }}
      >
        {player.image ? (
          <img
            src={player.image}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            alt=""
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              color: "#444",
            }}
          >
            {player.name.slice(0, 1)}
          </div>
        )}
      </div>

      <div
        style={{
          fontWeight: 700,
          fontSize: "0.85rem",
          marginBottom: "0.1rem",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {player.name}
      </div>

      <div
        style={{
          fontSize: "0.8rem",
          color: "var(--accent)",
          fontWeight: 700,
          marginBottom: "0.2rem",
        }}
      >
        {isCaptain ? points * 2 : points} pts {isCaptain && "(x2)"}
      </div>

      <div
        style={{
          fontSize: "0.65rem",
          color: isUnfit ? "var(--red)" : "var(--text-muted)",
          height: "1.5rem",
          overflow: "hidden",
        }}
      >
        {description}
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

    if (s("matchWin")) {
      rows.push({
        label: "Match Win",
        val: s("matchWin"),
        pts: s("matchWin") * 2,
      });
    }

    if (s("matchLose")) {
      rows.push({
        label: "Match Loss",
        val: s("matchLose"),
        pts: s("matchLose") * -2,
      });
    }

    if (s("mvp")) {
      rows.push({
        label: "MVP",
        val: s("mvp"),
        pts: s("mvp") * 8,
      });
    }

    if (s("svp")) {
      rows.push({
        label: "SVP",
        val: s("svp"),
        pts: s("svp") * 5,
      });
    }

    if (s("bonus")) {
      rows.push({
        label: "Bonus",
        val: s("bonus"),
        pts: s("bonus") * 1,
      });
    }

    if (player.game === "Valorant") {
      if (s("kills")) {
        rows.push({
          label: "Kills",
          val: s("kills"),
          pts: Math.floor(s("kills") / 2),
        });
      }

      if (s("assists")) {
        rows.push({
          label: "Assists",
          val: s("assists"),
          pts: Math.floor(s("assists") / 2),
        });
      }

      if (s("deaths")) {
        rows.push({
          label: "Deaths",
          val: s("deaths"),
          pts: Math.floor(s("deaths") / 3) * -1,
        });
      }

      if (s("firstBlood")) {
        rows.push({
          label: "First Blood",
          val: s("firstBlood"),
          pts: s("firstBlood"),
        });
      }

      if (s("firstDeath")) {
        rows.push({
          label: "First Death",
          val: s("firstDeath"),
          pts: s("firstDeath") * -1,
        });
      }

      if (s("tripleKill")) {
        rows.push({
          label: "Triple Kill",
          val: s("tripleKill"),
          pts: s("tripleKill") * 3,
        });
      }

      if (s("quadraKill")) {
        rows.push({
          label: "Quadra Kill",
          val: s("quadraKill"),
          pts: s("quadraKill") * 5,
        });
      }

      if (s("ace")) {
        rows.push({
          label: "Ace",
          val: s("ace"),
          pts: s("ace") * 8,
        });
      }

      if (s("clutch")) {
        rows.push({
          label: "Clutch",
          val: s("clutch"),
          pts: s("clutch") * 2,
        });
      }
    } else {
      if (s("kills")) {
        rows.push({
          label: "Kills",
          val: s("kills"),
          pts: Math.floor(s("kills") / 3),
        });
      }

      if (s("assists")) {
        rows.push({
          label: "Assists",
          val: s("assists"),
          pts: Math.floor(s("assists") / 4),
        });
      }

      if (s("deaths")) {
        rows.push({
          label: "Deaths",
          val: s("deaths"),
          pts: s("deaths") * -2,
        });
      }

      if (s("lastKills")) {
        rows.push({
          label: "Last Kills",
          val: s("lastKills"),
          pts: Math.floor(s("lastKills") / 2),
        });
      }

      if (s("headKill")) {
        rows.push({
          label: "Head Kill",
          val: s("headKill"),
          pts: s("headKill") * 3,
        });
      }

      if (s("healing")) {
        rows.push({
          label: "Healing",
          val: s("healing"),
          pts: Math.floor(s("healing") / 5050),
        });
      }

      if (s("damage")) {
        rows.push({
          label: "Damage",
          val: s("damage"),
          pts: Math.floor(s("damage") / 5050),
        });
      }

      if (s("blocked")) {
        rows.push({
          label: "Blocked",
          val: s("blocked"),
          pts: Math.floor(s("blocked") / 5050),
        });
      }

      if (s("soloKills")) {
        rows.push({
          label: "Solo Kills",
          val: s("soloKills"),
          pts: s("soloKills"),
        });
      }
    }

    return rows;
  };

  const rows = getBreakdown();
  const totalRaw = rows.reduce((acc, r) => acc + r.pts, 0);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
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
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "450px",
          padding: "2rem",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: "1.2rem",
            cursor: "pointer",
          }}
        >
          ✕
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "10px",
              overflow: "hidden",
              background: "#222",
            }}
          >
            {player.image ? (
              <img
                src={player.image}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                alt=""
              />
            ) : null}
          </div>

          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800 }}>
              {player.name}
            </h2>

            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--accent)",
                fontWeight: 700,
              }}
            >
              {player.game.toUpperCase()} STATISTICS
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 60px 60px",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontWeight: 700,
              textTransform: "uppercase",
              padding: "0 0.5rem",
            }}
          >
            <span>Statistic</span>
            <span style={{ textAlign: "right" }}>Value</span>
            <span style={{ textAlign: "right" }}>Pts</span>
          </div>

          <div
            style={{
              maxHeight: "300px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {rows.map((r, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 60px 60px",
                  padding: "0.75rem 0.5rem",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.9rem",
                }}
              >
                <span style={{ fontWeight: 600 }}>{r.label}</span>

                <span style={{ textAlign: "right", color: "var(--text-muted)" }}>
                  {r.val.toLocaleString()}
                </span>

                <span
                  style={{
                    textAlign: "right",
                    fontWeight: 700,
                    color: r.pts >= 0 ? "var(--green)" : "var(--red)",
                  }}
                >
                  {r.pts > 0 ? `+${r.pts}` : r.pts}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>
              {isCaptain ? "Total GW Points (Doubled)" : "Total GW Points"}
            </div>

            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "var(--accent)",
              }}
            >
              {isCaptain ? totalRaw * 2 : totalRaw} pts
            </div>
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
  const isOwnTeam = !!user?.email && (!queryEmail || queryEmail === user.email);

  const [players, setPlayers] = useState<Record<string, Player>>({});
  const [gwTeams, setGwTeams] = useState<GWTeam[]>([]);
  const [matchStats, setMatchStats] = useState<Record<string, any>>({});

  const [currentGW, setCurrentGW] = useState<number>(7);
  const [selectedGW, setSelectedGW] = useState<number>(7);
  const [statsLoadedGW, setStatsLoadedGW] = useState<number | null>(null);

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
    let cancelled = false;

    const loadStats = async () => {
      setStatsLoadedGW(null);

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
        });

        if (!cancelled) {
          setMatchStats(sMap);
          setStatsLoadedGW(selectedGW);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setMatchStats({});
          setStatsLoadedGW(selectedGW);
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
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

    return Number(stats?.gwPoints ?? 0);
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

  useEffect(() => {
    if (!currentTeam) return;

    // Only auto-sync your own team.
    // This prevents normal users from changing another manager's totals
    // by opening /team?email=someone@example.com
    if (!isOwnTeam) return;

    // Wait until stats for the selected GW are fully loaded.
    // This prevents saving wrong values before playerMatchStats finishes loading.
    if (statsLoadedGW !== selectedGW) return;

    const mainPlayerIds = [
      currentTeam.player1,
      currentTeam.player2,
      currentTeam.player3,
      currentTeam.player4,
    ].filter(Boolean);

    if (mainPlayerIds.length === 0) return;

    const allPlayersLoaded = mainPlayerIds.every((pid) => players[pid]);

    if (!allPlayersLoaded) return;

    const newGWPoints = calculateTeamGWPoints(currentTeam);

    const syncGwPointsAndTotal = async () => {
      try {
        const teamRef = doc(db, "gameweekTeams", currentTeam.id);

        const userTeamsSnap = await getDocs(
          query(
            collection(db, "userTeams"),
            where("ownerEmail", "==", currentTeam.ownerEmail)
          )
        );

        await runTransaction(db, async (transaction) => {
          const teamSnap = await transaction.get(teamRef);

          if (!teamSnap.exists()) return;

          const oldGWPoints = Number(teamSnap.data().gwPoints ?? 0);
          const difference = newGWPoints - oldGWPoints;

          if (difference === 0) return;

          const now = new Date().toISOString();

          // 1. Save the new GW points to gameweekTeams
          transaction.update(teamRef, {
            gwPoints: newGWPoints,
            "Updated Date": now,
          });

          // 2. Update userTeams.totalPoints by the difference
          // Example:
          // old GW = 70, new GW = 90, difference = +20
          // totalPoints += 20
          userTeamsSnap.docs.forEach((userTeamDoc) => {
            transaction.update(doc(db, "userTeams", userTeamDoc.id), {
              gameweekPoints: newGWPoints,
              totalPoints: increment(difference),
              "Updated Date": now,
            });
          });
        });

        setGwTeams((prev) =>
          prev.map((team) =>
            team.id === currentTeam.id
              ? {
                  ...team,
                  gwPoints: newGWPoints,
                }
              : team
          )
        );
      } catch (err) {
        console.error("Failed to sync GW points and total points:", err);
      }
    };

    syncGwPointsAndTotal();
  }, [currentTeam, players, matchStats, isOwnTeam, selectedGW, statsLoadedGW]);

  if (loading && gwTeams.length === 0) {
    return <p style={{ padding: "2rem" }}>Loading Squad...</p>;
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
        }}
      >
        {isOwnTeam ? "My Team" : "Manager Squad"}
      </h1>

      <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
        Viewing {targetEmail}
      </p>

      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
        }}
      >
        {availableGWs.map((gw) => (
          <button
            key={gw}
            onClick={() => setSelectedGW(gw)}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: selectedGW === gw ? "var(--blue)" : "var(--surface)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            GW{gw}
          </button>
        ))}
      </div>

      {currentTeam ? (
        <div>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "1rem 1.5rem",
              marginBottom: "2rem",
              display: "flex",
              gap: "2rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                }}
              >
                GW Points
              </div>

              <div
                style={{
                  fontWeight: 700,
                  fontSize: "1.4rem",
                  color: "var(--accent)",
                }}
              >
                {calculatedGWPoints}
              </div>
            </div>

            <div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                }}
              >
                Transfers
              </div>

              <div style={{ fontWeight: 700, fontSize: "1.4rem" }}>
                {currentTeam.transfersMade ?? 0}
              </div>
            </div>

            <div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                }}
              >
                Penalty
              </div>

              <div
                style={{
                  fontWeight: 700,
                  fontSize: "1.4rem",
                  color: currentTeam.transferPenalty
                    ? "var(--red)"
                    : "var(--text)",
                }}
              >
                {currentTeam.transferPenalty ?? 0}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "1rem",
              marginBottom: "2rem",
            }}
          >
            {playerIds.map((pid, i) => {
              const player = players[pid];

              if (!player) return null;

              return (
                <PlayerCard
                  key={i}
                  player={player}
                  points={getPoints(pid)}
                  isCaptain={currentTeam.captain === pid}
                  onClick={() => setSelectedStatPlayerId(pid)}
                />
              );
            })}
          </div>

          {currentTeam.sub && players[currentTeam.sub] && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ width: "23.5%" }}>
                <div
                  style={{
                    textAlign: "center",
                    marginBottom: "0.5rem",
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                  }}
                >
                  SUBSTITUTE
                </div>

                <PlayerCard
                  player={players[currentTeam.sub]}
                  points={getPoints(currentTeam.sub)}
                  isSub={true}
                  onClick={() => setSelectedStatPlayerId(currentTeam.sub)}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)" }}>
          No squad data found for GW{selectedGW}.
        </p>
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
    </div>
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
