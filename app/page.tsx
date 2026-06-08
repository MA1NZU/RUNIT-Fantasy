"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  where,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type Team = {
  id: string;
  manager: string;
  ownerEmail?: string;
  gameweekPoints: number;
  totalPoints: number;
};

type Settings = {
  currentGameweek: number;
  deadline: string;
};

const TOTAL_MANAGERS = 13;

function getTimeLeft(deadline?: string, now = Date.now()) {
  if (!deadline) return "No deadline set";

  const end = new Date(deadline).getTime();

  if (Number.isNaN(end)) return "No deadline set";

  const diff = end - now;

  if (diff <= 0) return "Deadline passed";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;

  return `${Math.max(minutes, 1)}m left`;
}

function formatDeadline(deadline?: string) {
  if (!deadline) return "Not set";

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Home() {
  const { user } = useAuth();

  const [topTeams, setTopTeams] = useState<Team[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      try {
        const [teamsSnap, settingsSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "userTeams"),
              orderBy("totalPoints", "desc"),
              limit(5)
            )
          ),
          getDocs(collection(db, "settings")),
        ]);

        let activeGW = 7;
        let settingsData: Settings | null = null;

        if (!settingsSnap.empty) {
          settingsData = settingsSnap.docs[0].data() as Settings;
          activeGW = Number(settingsData.currentGameweek || 7);
        }

        const gwTeamsSnap = await getDocs(
          query(
            collection(db, "gameweekTeams"),
            where("gameweek", "==", activeGW)
          )
        );

        const currentGwPointsByEmail: Record<string, number> = {};

        gwTeamsSnap.docs.forEach((d) => {
          const data = d.data();
          const email = String(data.ownerEmail || "").toLowerCase();

          if (email) {
            currentGwPointsByEmail[email] = Number(data.gwPoints ?? 0);
          }
        });

        const teams = teamsSnap.docs.map((d) => {
          const data = d.data();
          const email = String(data.ownerEmail || "").toLowerCase();

          return {
            id: d.id,
            manager: data.manager || data.title || "Unknown Manager",
            ownerEmail: data.ownerEmail || "",
            totalPoints: Number(data.totalPoints || 0),
            gameweekPoints:
              currentGwPointsByEmail[email] ?? Number(data.gameweekPoints || 0),
          } as Team;
        });

        if (!mounted) return;

        setTopTeams(teams);

        if (settingsData) {
          setSettings(settingsData);
        }
      } catch (err) {
        console.error("Home load error:", err);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const currentGW = settings?.currentGameweek ?? 7;
  const nextGW = currentGW + 1;
  const leader = topTeams[0];
  const podiumTeams = topTeams.slice(0, 3);
  const deadlineText = formatDeadline(settings?.deadline);
  const timeLeft = getTimeLeft(settings?.deadline, now);

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
              "radial-gradient(circle at 20% 10%, rgba(3, 71, 244, 0.35), transparent 16%), radial-gradient(circle at 90% 20%, rgba(255, 193, 7, 0.18), transparent 15%), linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02))",
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
                Gameweek {currentGW} is live
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
                RUNIT
                <br />
                <span
                  style={{
                    color: "var(--blue)",
                    textShadow: "0 0 17px rgba(3, 71, 244, 0.45)",
                  }}
                >
                  Fantasy League
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
                Build your elite squad across Valorant and Marvel Rivals. Track
                points, captain your star player, and fight your way to the top
                of the RUNIT fantasy table.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  marginBottom: "1.25rem",
                }}
              >
                <a
                  href="/leaderboard"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--blue)",
                    color: "#fff",
                    padding: "0.78rem 1.15rem",
                    borderRadius: "12px",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    textDecoration: "none",
                    boxShadow: "0 14px 36px rgba(3, 71, 244, 0.35)",
                  }}
                >
                  View Leaderboard →
                </a>

                <a
                  href="/team"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255, 193, 7, 0.12)",
                    color: "var(--accent)",
                    border: "1px solid rgba(255, 193, 7, 0.32)",
                    padding: "0.78rem 1.15rem",
                    borderRadius: "12px",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    textDecoration: "none",
                  }}
                >
                  My Team
                </a>

                <a
                  href="/transfers"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.045)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    padding: "0.78rem 1.15rem",
                    borderRadius: "12px",
                    fontWeight: 800,
                    fontSize: "0.9rem",
                    textDecoration: "none",
                  }}
                >
                  Transfers
                </a>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                {[
                  "Valorant",
                  "Marvel Rivals",
                  `${TOTAL_MANAGERS} managers`,
                  "1 winner",
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

            {/* COMMAND CARD */}
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
                    Command Center
                  </div>

                  <div style={{ fontWeight: 900, fontSize: "1.1rem" }}>
                    Season Status
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
                  GW{currentGW}
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
                  Current Leader
                </div>

                <div
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: 900,
                    marginTop: "0.2rem",
                  }}
                >
                  {loading ? "Loading..." : leader?.manager || "No leader yet"}
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
                      {loading ? "—" : leader?.totalPoints ?? 0}
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
                      {loading ? "—" : leader?.gameweekPoints ?? 0}
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

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "1rem",
                  alignItems: "center",
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "18px",
                  padding: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.75rem",
                    }}
                  >
                    Transfer Deadline
                  </div>

                  <div style={{ fontWeight: 800, marginTop: "0.25rem" }}>
                    {deadlineText}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: "1.3rem",
                    fontWeight: 900,
                    color: "var(--accent)",
                    textAlign: "right",
                  }}
                >
                  {timeLeft}
                </div>
              </div>
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
              value: TOTAL_MANAGERS,
              label: "Managers competing",
              color: "var(--accent)",
            },
            {
              value: `GW${currentGW}`,
              label: "Current gameweek",
              color: "var(--text)",
            },
            {
              value: `GW${nextGW}`,
              label: "Next transfer target",
              color: "var(--blue)",
            },
            {
              value: loading ? "—" : leader?.totalPoints ?? 0,
              label: "Highest total score",
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
          {/* LEADERBOARD */}
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
              <div>Leaderboard</div>
              <span
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                Top 5
              </span>
            </div>

            {loading ? (
              <div
                style={{
                  color: "var(--text-muted)",
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  padding: "1rem",
                }}
              >
                Loading leaderboard...
              </div>
            ) : topTeams.length === 0 ? (
              <div
                style={{
                  color: "var(--text-muted)",
                  background: "rgba(255,255,255,0.035)",
                  border: "1px solid var(--border)",
                  borderRadius: "16px",
                  padding: "1rem",
                }}
              >
                No teams found yet.
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "42px 1fr 80px 90px",
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

                {topTeams.map((team, i) => (
                  <div
                    key={team.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "42px 1fr 80px 90px",
                      gap: "10px",
                      alignItems: "center",
                      padding: "0.75rem",
                      borderRadius: "14px",
                      marginBottom: "0.4rem",
                      border:
                        i === 0
                          ? "1px solid rgba(255,193,7,0.25)"
                          : "1px solid var(--border)",
                      background:
                        i === 0
                          ? "linear-gradient(135deg, rgba(255,193,7,0.12), rgba(3,71,244,0.12))"
                          : "rgba(255,255,255,0.025)",
                    }}
                  >
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                        background:
                          i === 0
                            ? "rgba(255,193,7,0.12)"
                            : "rgba(255,255,255,0.06)",
                        color: i === 0 ? "var(--accent)" : "var(--text-muted)",
                      }}
                    >
                      {i + 1}
                    </div>

                    <div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 800 }}>
                        {team.manager}
                        {i === 0 && (
                          <span
                            style={{
                              marginLeft: "6px",
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
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        color: "var(--text-muted)",
                        fontWeight: 700,
                      }}
                    >
                      {team.gameweekPoints ?? 0}
                    </div>

                    <div style={{ textAlign: "right", fontWeight: 900 }}>
                      {team.totalPoints ?? 0}
                    </div>
                  </div>
                ))}

                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <a
                    href="/leaderboard"
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--blue)",
                      fontWeight: 800,
                      textDecoration: "none",
                    }}
                  >
                    View full leaderboard →
                  </a>
                </div>
              </>
            )}
          </div>

          {/* SIDE PANELS */}
          <div style={{ display: "grid", gap: "1rem" }}>
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
                <div>Table Race</div>
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

              {loading ? (
                <div style={{ color: "var(--text-muted)" }}>
                  Loading podium...
                </div>
              ) : podiumTeams.length === 0 ? (
                <div style={{ color: "var(--text-muted)" }}>No podium yet.</div>
              ) : (
                <div style={{ display: "grid", gap: "0.65rem" }}>
                  {podiumTeams.map((team, i) => (
                    <div
                      key={team.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        background: "rgba(255,255,255,0.035)",
                        border: "1px solid var(--border)",
                        borderRadius: "16px",
                        padding: "0.8rem",
                      }}
                    >
                      <div
                        style={{
                          width: "40px",
                          height: "40px",
                          borderRadius: "14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(255,255,255,0.055)",
                          fontSize: "1.15rem",
                        }}
                      >
                        {i === 0 ? "1" : i === 1 ? "2" : "3"}
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
                          {team.totalPoints} total · {team.gameweekPoints} GW
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                <div>Quick Actions</div>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {user ? "Signed in" : "Guest"}
                </span>
              </div>

              <div style={{ display: "grid", gap: "0.65rem" }}>
                {[
                  {
                    href: "/team",
                    title: "Open My Team",
                    desc: "Check your squad and current GW points.",
                  },
                  {
                    href: "/transfers",
                    title: "Make Transfers",
                    desc: "Prepare your squad before the deadline.",
                  },
                  {
                    href: "/shop",
                    title: "Visit Shop",
                    desc: "Customize your manager profile.",
                  },
                ].map((action) => (
                  <a
                    key={action.href}
                    href={action.href}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                      textDecoration: "none",
                      color: "var(--text)",
                      background: "rgba(255,255,255,0.035)",
                      border: "1px solid var(--border)",
                      borderRadius: "16px",
                      padding: "0.9rem 1rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 900, fontSize: "0.9rem" }}>
                        {action.title}
                      </div>

                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.75rem",
                          marginTop: "0.2rem",
                        }}
                      >
                        {action.desc}
                      </div>
                    </div>

                    <div style={{ color: "var(--blue)", fontWeight: 900 }}>
                      →
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </Shell>
  );
}
