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

type SortBy = "totalPoints" | "gameweekPoints";

export default function Leaderboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>("totalPoints");
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

        const [userTeamsSnap, gwTeamsSnap] = await Promise.all([
          getDocs(collection(db, "userTeams")),
          getDocs(
            query(collection(db, "gameweekTeams"), where("gameweek", "==", gw))
          ),
        ]);

        const gwPointsMap: Record<string, number> = {};

        gwTeamsSnap.docs.forEach((d) => {
          const data = d.data();
          const email = String(data.ownerEmail || "").toLowerCase();

          if (email) {
            gwPointsMap[email] = Number(data.gwPoints || 0);
          }
        });

        const loadedTeams: Team[] = userTeamsSnap.docs.map((d) => {
          const data = d.data();
          const email = String(data.ownerEmail || "").toLowerCase();

          return {
            id: d.id,
            manager: data.manager || data.title || "Unknown Manager",
            ownerEmail: data.ownerEmail || "",
            totalPoints: Number(data.totalPoints || 0),
            gameweekPoints: gwPointsMap[email] ?? Number(data.gameweekPoints || 0),
          };
        });

        setTeams(loadedTeams);
      } catch (err) {
        console.error("Error loading leaderboard:", err);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  const sorted = [...teams].sort(
    (a, b) => Number(b[sortBy] || 0) - Number(a[sortBy] || 0)
  );

  const highestPoints = teams.length
    ? Math.max(...teams.map((team) => Number(team[sortBy] || 0)))
    : 0;

  const averagePoints = teams.length
    ? Math.round(
        teams.reduce((sum, team) => sum + Number(team[sortBy] || 0), 0) /
          teams.length
      )
    : 0;

  const activeTitle =
    sortBy === "totalPoints"
      ? "All Time Standings"
      : `GW${currentGW} Standings`;

  const activeSubtitle =
    sortBy === "totalPoints"
      ? "‎ "
      : `‎ `;

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
            Fetching standings...
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
        {/* HEADER */}
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
                  boxShadow: "0 0 0 6px rgba(255, 193, 7, 0.12)",
                }}
              />
              Live leaderboard · GW{currentGW}
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
              {sortBy === "totalPoints" ? "All Time" : "Gameweek"}
              <br />
              <span
                style={{
                  color: "var(--blue)",
                }}
              >
                Standings
              </span>
            </h1>

            <p
              style={{
                maxWidth: "620px",
                color: "var(--text-muted)",
                fontSize: "1rem",
                lineHeight: 1.7,
                marginBottom: "1.4rem",
              }}
            >
              {activeSubtitle}
            </p>

            {/* RANKING BUTTONS */}
            <div
              style={{
                display: "inline-flex",
                background: "rgba(255,255,255,0.045)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "4px",
                gap: "4px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={() => setSortBy("totalPoints")}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: 900,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  background:
                    sortBy === "totalPoints" ? "var(--blue)" : "transparent",
                  color:
                    sortBy === "totalPoints" ? "#fff" : "var(--text-muted)",
                }}
              >
                All Time Ranking
              </button>

              <button
                onClick={() => setSortBy("gameweekPoints")}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: "none",
                  fontWeight: 900,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  background:
                    sortBy === "gameweekPoints" ? "var(--blue)" : "transparent",
                  color:
                    sortBy === "gameweekPoints" ? "#fff" : "var(--text-muted)",
                }}
              >
                Gameweek Ranking
              </button>
            </div>
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
          <div
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
                color: "var(--accent)",
              }}
            >
              {highestPoints}
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
              Highest Points
            </div>
          </div>

          <div
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
                color: "var(--blue)",
              }}
            >
              {averagePoints}
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
              Average Points
            </div>
          </div>

          <div
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
                color: "var(--text)",
              }}
            >
              GW{currentGW}
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
              Current Gameweek
            </div>
          </div>
        </section>

        {/* STANDINGS TABLE */}
        <section
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
              flexWrap: "wrap",
            }}
          >
            <div>{activeTitle}</div>

            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {sorted.length} managers
            </span>
          </div>

          <div style={{ minWidth: "640px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "55px 1fr 120px 120px",
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
              <div style={{ textAlign: "right" }}>GW Points</div>
              <div style={{ textAlign: "right" }}>Total Points</div>
            </div>

            {sorted.map((team, i) => {
              const isTop = i === 0;
              const medal =
                i === 0 ? "1" : i === 1 ? "2" : i === 2 ? "3" : null;

              return (
                <div
                  key={team.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "55px 1fr 120px 120px",
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
                      width: "36px",
                      height: "36px",
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
                      fontSize: "0.95rem",
                      fontWeight: sortBy === "gameweekPoints" ? 900 : 700,
                      textAlign: "right",
                      color:
                        sortBy === "gameweekPoints"
                          ? "var(--accent)"
                          : "var(--text-muted)",
                    }}
                  >
                    {team.gameweekPoints}
                  </div>

                  <div
                    style={{
                      fontSize: "0.95rem",
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
        </section>
      </main>
    </Shell>
  );
}
