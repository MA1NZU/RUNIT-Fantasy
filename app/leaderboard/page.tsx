"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import Shell from "@/app/shell";
import Link from "next/link";

type Team = {
  id: string;
  manager: string;
  ownerEmail: string;
  gameweekPoints: number;
  totalPoints: number;
};

type Settings = {
  currentGameweek: number;
  lockTeamLeaderboard?: boolean;
};

const TOTAL_MANAGERS = 13;

export default function Leaderboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sortBy, setSortBy] = useState<"totalPoints" | "gameweekPoints">(
    "totalPoints"
  );
  const [loading, setLoading] = useState(true);
  const [currentGW, setCurrentGW] = useState<number>(7);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true);

      try {
        const settingsSnap = await getDocs(collection(db, "settings"));

        let gw = 7;

        if (!settingsSnap.empty) {
          const data = settingsSnap.docs[0].data() as Settings;

          gw = Number(data.currentGameweek || 7);
          setCurrentGW(gw);

          if (data.lockTeamLeaderboard) {
            setIsLocked(true);
            setLoading(false);
            return;
          }
        }

        setIsLocked(false);

        const userTeamsSnap = await getDocs(collection(db, "userTeams"));

        const userTeamsData = userTeamsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as any[];

        const gwTeamsSnap = await getDocs(
          query(collection(db, "gameweekTeams"), where("gameweek", "==", gw))
        );

        const gwPointsMap: Record<string, number> = {};

        gwTeamsSnap.docs.forEach((d) => {
          const data = d.data();
          const email = String(data.ownerEmail || "").toLowerCase();

          if (email) {
            gwPointsMap[email] = Number(data.gwPoints || 0);
          }
        });

        const mergedTeams: Team[] = userTeamsData.map((ut) => {
          const email = String(ut.ownerEmail || "").toLowerCase();

          return {
            id: ut.id,
            manager: ut.manager || ut.title || "Unknown Manager",
            ownerEmail: ut.ownerEmail || "",
            totalPoints: Number(ut.totalPoints || 0),
            gameweekPoints: gwPointsMap[email] ?? Number(ut.gameweekPoints || 0),
          };
        });

        setTeams(mergedTeams);
      } catch (err) {
        console.error("Error loading leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  const sorted = [...teams].sort(
    (a, b) => (b[sortBy] ?? 0) - (a[sortBy] ?? 0)
  );

  const podiumTeams = sorted.slice(0, 3);
  const leader = sorted[0];

  const highestTotal = teams.length
    ? Math.max(...teams.map((t) => Number(t.totalPoints || 0)))
    : 0;

  const highestGW = teams.length
    ? Math.max(...teams.map((t) => Number(t.gameweekPoints || 0)))
    : 0;

  const totalManagers = teams.length || TOTAL_MANAGERS;

  if (loading) {
    return (
      <Shell>
        <div
          style={{
            maxWidth: "760px",
            margin: "4rem auto",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "2rem",
            background:
              "radial-gradient(circle at 20% 10%, rgba(3, 71, 244, 0.25), transparent 35%), var(--surface)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "16px",
              background: "rgba(3,71,244,0.15)",
              border: "1px solid rgba(107,159,255,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              fontSize: "1.4rem",
            }}
          >
            🏆
          </div>

          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 900,
              marginBottom: "0.5rem",
            }}
          >
            Loading Leaderboard
          </h1>

          <p style={{ color: "var(--text-muted)" }}>
            Fetching live standings...
          </p>
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
            boxShadow: "0 24px 80px rgba(0,0,0,0.32)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "260px",
              height: "260px",
              right: "-100px",
              bottom: "-110px",
              borderRadius: "999px",
              background: "rgba(3, 71, 244, 0.24)",
              filter: "blur(20px)",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
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
              🔒
            </div>

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
              GW{currentGW} standings
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
              Leaderboard is{" "}
              <span style={{ color: "var(--blue)" }}>Locked</span>
            </h1>

            <p
              style={{
                color: "var(--text-muted)",
                maxWidth: "460px",
                margin: "0 auto",
                lineHeight: 1.7,
              }}
            >
              Access to standings is currently restricted by the admin. Check
              back again soon.
            </p>
          </div>
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
        {/* HERO */}
        <section
          style={{
            position: "relative",
            overflow: "hidden",
            border: "1px solid var(--border)",
            borderRadius: "28px",
            padding: "2rem",
            marginBottom: "1rem",
            background:
              "radial-gradient(circle at 20% 10%, rgba(3, 71, 244, 0.35), transparent 32%), radial-gradient(circle at 90% 20%, rgba(255, 193, 7, 0.18), transparent 30%), linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02))",
            boxShadow: "0 24px 80px rgba(0,0,0,0.32)",
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
              background: "rgba(3, 71, 244, 0.28)",
              filter: "blur(20px)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, 0.85fr)",
              gap: "1.5rem",
              alignItems: "stretch",
            }}
          >
            <div>
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
                    boxShadow: "0 0 0 6px rgba(255, 193, 7, 0.12)",
                  }}
                />
                Live standings · GW{currentGW}
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
                League
                <br />
                <span
                  style={{
                    color: "var(--blue)",
                    textShadow: "0 0 34px rgba(3, 71, 244, 0.45)",
                  }}
                >
                  Leaderboard
                </span>
              </h1>

              <p
                style={{
                  maxWidth: "560px",
                  color: "var(--text-muted)",
                  fontSize: "1rem",
                  lineHeight: 1.7,
                  marginBottom: "1.5rem",
                }}
              >
                Track the title race, compare current gameweek scores, and see
                who is climbing toward the top of the RUNIT Fantasy League.
              </p>

              <div
                style={{
                  display: "inline-flex",
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "4px",
                  gap: "4px",
                  marginBottom: "1.25rem",
                }}
              >
                {(["totalPoints", "gameweekPoints"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    style={{
                      padding: "0.7rem 1rem",
                      borderRadius: "10px",
                      border: "none",
                      fontWeight: 900,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      background:
                        sortBy === key ? "var(--blue)" : "transparent",
                      color: sortBy === key ? "#fff" : "var(--text-muted)",
                      boxShadow:
                        sortBy === key
                          ? "0 10px 28px rgba(3,71,244,0.28)"
                          : "none",
                    }}
                  >
                    {key === "totalPoints" ? "All Time" : "This Gameweek"}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                {[
                  `${totalManagers} managers`,
                  `GW${currentGW}`,
                  sortBy === "totalPoints"
                    ? "Sorted by total points"
                    : "Sorted by GW points",
                ].map((pill) => (
                  <div
                    key={pill}
                    style={{
                      color: "var(--text-muted)",
                      background: "rgba(255,255,255,0.045)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      padding: "0.45rem 0.7rem",
                      borderRadius: "999px",
                      fontSize: "0.78rem",
                    }}
                  >
                    {pill}
                  </div>
                ))}
              </div>
            </div>

            {/* LEADER CARD */}
            <aside
              style={{
                background: "rgba(10, 13, 22, 0.72)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "24px",
                padding: "1.25rem",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      fontWeight: 800,
                    }}
                  >
                    Current #1
                  </div>

                  <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>
                    {sortBy === "totalPoints" ? "All Time Leader" : "GW Leader"}
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--blue)",
                    color: "#fff",
                    padding: "0.35rem 0.65rem",
                    borderRadius: "999px",
                    fontSize: "0.78rem",
                    fontWeight: 900,
                  }}
                >
                  #{leader ? 1 : "-"}
                </div>
              </div>

              <div
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,193,7,0.16), rgba(3,71,244,0.12)), rgba(255,255,255,0.035)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "18px",
                  padding: "1rem",
                  marginBottom: "0.85rem",
                }}
              >
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                  }}
                >
                  Manager
                </div>

                <div
                  style={{
                    fontSize: "1.45rem",
                    fontWeight: 900,
                    marginTop: "0.2rem",
                  }}
                >
                  {leader?.manager || "No leader yet"}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.65rem",
                    marginTop: "1rem",
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      background: "rgba(0,0,0,0.22)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "14px",
                      padding: "0.75rem",
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: "1.2rem" }}>
                      {leader?.totalPoints ?? 0}
                    </div>
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.72rem",
                        marginTop: "0.2rem",
                      }}
                    >
                      Total points
                    </div>
                  </div>

                  <div
                    style={{
                      flex: 1,
                      background: "rgba(0,0,0,0.22)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "14px",
                      padding: "0.75rem",
                    }}
                  >
                    <div style={{ fontWeight: 900, fontSize: "1.2rem" }}>
                      {leader?.gameweekPoints ?? 0}
                    </div>
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.72rem",
                        marginTop: "0.2rem",
                      }}
                    >
                      GW points
                    </div>
                  </div>
                </div>
              </div>

              {leader?.ownerEmail && (
                <Link
                  href={`/profile?email=${encodeURIComponent(
                    leader.ownerEmail
                  )}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    textDecoration: "none",
                    color: "var(--text)",
                    background: "rgba(255,255,255,0.045)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "0.9rem 1rem",
                    fontWeight: 900,
                  }}
                >
                  View leader profile
                  <span style={{ color: "var(--blue)" }}>→</span>
                </Link>
              )}
            </aside>
          </div>
        </section>

        {/* STATS */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          {[
            {
              value: totalManagers,
              label: "Managers",
              color: "var(--accent)",
            },
            {
              value: `GW${currentGW}`,
              label: "Current gameweek",
              color: "var(--text)",
            },
            {
              value: highestTotal,
              label: "Highest total",
              color: "var(--blue)",
            },
            {
              value: highestGW,
              label: "Highest GW score",
              color: "var(--text)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                position: "relative",
                overflow: "hidden",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "18px",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  width: "90px",
                  height: "90px",
                  right: "-45px",
                  top: "-45px",
                  background: "rgba(3, 71, 244, 0.18)",
                  borderRadius: "999px",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  fontSize: "1.65rem",
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  color: stat.color,
                }}
              >
                {stat.value}
              </div>

              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  marginTop: "0.2rem",
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </section>

        {/* MAIN CONTENT */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            gap: "1rem",
          }}
        >
          {/* LEADERBOARD TABLE */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "1rem",
              overflowX: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                fontWeight: 900,
                marginBottom: "1rem",
              }}
            >
              <div>
                {sortBy === "totalPoints"
                  ? "All Time Standings"
                  : `GW${currentGW} Standings`}
              </div>

              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {sorted.length} teams
              </span>
            </div>

            <div style={{ minWidth: "620px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "50px 1fr 100px 100px",
                  gap: "10px",
                  padding: "0 0.75rem 0.65rem",
                  color: "var(--text-muted)",
                  fontSize: "0.7rem",
                  borderBottom: "1px solid var(--border)",
                  marginBottom: "0.4rem",
                }}
              >
                <div>#</div>
                <div>Manager</div>
                <div style={{ textAlign: "right" }}>GW Pts</div>
                <div style={{ textAlign: "right" }}>Total</div>
              </div>

              {sorted.map((team, i) => {
                const isTop = i === 0;
                const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;

                return (
                  <div
                    key={team.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "50px 1fr 100px 100px",
                      gap: "10px",
                      alignItems: "center",
                      padding: "0.8rem 0.75rem",
                      borderRadius: "14px",
                      marginBottom: "0.45rem",
                      border: isTop
                        ? "1px solid rgba(255,193,7,0.25)"
                        : "1px solid var(--border)",
                      background: isTop
                        ? "linear-gradient(135deg, rgba(255,193,7,0.12), rgba(3,71,244,0.12))"
                        : "rgba(255,255,255,0.025)",
                    }}
                  >
                    <div
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        background: isTop
                          ? "rgba(255,193,7,0.12)"
                          : "rgba(255,255,255,0.06)",
                        color:
                          i === 0
                            ? "var(--accent)"
                            : i === 1
                            ? "#c9c9c9"
                            : i === 2
                            ? "#cd7f32"
                            : "var(--text-muted)",
                      }}
                    >
                      {medal || i + 1}
                    </div>

                    <div
                      style={{
                        fontSize: "0.92rem",
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        minWidth: 0,
                      }}
                    >
                      <Link
                        href={`/profile?email=${encodeURIComponent(
                          team.ownerEmail || ""
                        )}`}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {team.manager}
                      </Link>

                      {i === 0 && (
                        <span
                          style={{
                            background: "rgba(255,193,7,0.12)",
                            color: "var(--accent)",
                            border: "1px solid rgba(255,193,7,0.2)",
                            fontSize: "0.62rem",
                            fontWeight: 900,
                            padding: "2px 6px",
                            borderRadius: "999px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Leader
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: "0.9rem",
                        textAlign: "right",
                        color:
                          sortBy === "gameweekPoints"
                            ? "var(--accent)"
                            : "var(--text-muted)",
                        fontWeight: sortBy === "gameweekPoints" ? 900 : 700,
                      }}
                    >
                      {team.gameweekPoints}
                    </div>

                    <div
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: sortBy === "totalPoints" ? 900 : 700,
                        textAlign: "right",
                        color:
                          sortBy === "totalPoints"
                            ? "var(--text)"
                            : "var(--text-muted)",
                      }}
                    >
                      {team.totalPoints}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SIDE PANEL */}
          <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  fontWeight: 900,
                  marginBottom: "1rem",
                }}
              >
                <div>Title Race</div>

                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  Top 3
                </span>
              </div>

              {podiumTeams.length === 0 ? (
                <div style={{ color: "var(--text-muted)" }}>No title yet.</div>
              ) : (
                <div style={{ display: "grid", gap: "0.65rem" }}>
                  {podiumTeams.map((team, i) => (
                    <Link
                      key={team.id}
                      href={`/profile?email=${encodeURIComponent(
                        team.ownerEmail || ""
                      )}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        background: "rgba(255,255,255,0.035)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                        padding: "0.8rem",
                        textDecoration: "none",
                        color: "inherit",
                      }}
                    >
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(255,255,255,0.055)",
                          fontSize: "1.2rem",
                        }}
                      >
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {team.manager}
                        </div>

                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.75rem",
                            marginTop: "0.2rem",
                          }}
                        >
                          {sortBy === "totalPoints"
                            ? `${team.totalPoints} total points`
                            : `${team.gameweekPoints} GW points`}
                        </div>
                      </div>

                      <div style={{ color: "var(--blue)", fontWeight: 900 }}>
                        →
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(3,71,244,0.12), rgba(255,193,7,0.08)), var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "20px",
                padding: "1rem",
              }}
            >
              <div
                style={{
                  fontWeight: 900,
                  marginBottom: "0.5rem",
                }}
              >
                Ranking Mode
              </div>

              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  lineHeight: 1.6,
                  marginBottom: "1rem",
                }}
              >
                {sortBy === "totalPoints"
                  ? "Showing the overall season race based on total manager points."
                  : `Showing the current gameweek race based on GW${currentGW} points.`}
              </p>

              <button
                onClick={() =>
                  setSortBy(
                    sortBy === "totalPoints" ? "gameweekPoints" : "totalPoints"
                  )
                }
                style={{
                  width: "100%",
                  background: "var(--blue)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "0.8rem",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Switch to{" "}
                {sortBy === "totalPoints" ? "This Gameweek" : "All Time"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </Shell>
  );
}
