"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import Shell from "@/app/shell";
import { db } from "@/lib/firebase";

type Player = {
  id: string;
  ID?: string;
  name: string;
  game: string;
};

type Settings = {
  currentGameweek?: number;
  lockFixtures?: boolean;
};

type PlayerFixture = {
  id: string;
  gameweek: number;
  playerOneId: string;
  playerTwoId: string;
};

type PlayerScore = {
  total: number;
  byGameweek: Record<number, number>;
  hasStatsForGameweek: Record<number, boolean>;
};

type FixtureResult = PlayerFixture & {
  playerOneScore: number;
  playerTwoScore: number;
  completed: boolean;
};

type PlayerStanding = {
  player: Player;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  score: number;
  points: number;
};

function getPlayerKey(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export default function FixturesPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [fixtures, setFixtures] = useState<PlayerFixture[]>([]);
  const [scores, setScores] = useState<Record<string, PlayerScore>>({});
  const [currentGameweek, setCurrentGameweek] = useState(7);
  const [selectedGameweek, setSelectedGameweek] = useState("all");
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const loadFixtures = async () => {
      setLoading(true);

      try {
        const settingsSnap = await getDocs(collection(db, "settings"));

        if (!settingsSnap.empty) {
          const settingsData = settingsSnap.docs[0].data() as Settings;

          setCurrentGameweek(Number(settingsData.currentGameweek || 7));

          if (settingsData.lockFixtures) {
            setIsLocked(true);
            return;
          }
        }

        setIsLocked(false);

        const [playersSnap, fixturesSnap, statsSnap] = await Promise.all([
          getDocs(collection(db, "players")),
          getDocs(collection(db, "playerFixtures")),
          getDocs(collection(db, "playerMatchStats")),
        ]);

        const loadedPlayers = playersSnap.docs
          .map(
            (playerDoc) =>
              ({ id: playerDoc.id, ...playerDoc.data() } as Player)
          )
          .sort((a, b) =>
            String(a.name || "").localeCompare(String(b.name || ""))
          );

        const playerIdByKey: Record<string, string> = {};
        const startingScores: Record<string, PlayerScore> = {};

        loadedPlayers.forEach((player) => {
          startingScores[player.id] = {
            total: 0,
            byGameweek: {},
            hasStatsForGameweek: {},
          };

          playerIdByKey[getPlayerKey(player.id)] = player.id;
          playerIdByKey[getPlayerKey(player.ID)] = player.id;
          playerIdByKey[getPlayerKey(player.name)] = player.id;
        });

        statsSnap.docs.forEach((statsDoc) => {
          const data = statsDoc.data();
          const gameweek = Number(data.gameweek || 0);
          const playerId =
            playerIdByKey[getPlayerKey(data.player)] ||
            playerIdByKey[getPlayerKey(data.playerId)] ||
            playerIdByKey[getPlayerKey(data.ID)] ||
            playerIdByKey[getPlayerKey(data.Title)];

          if (!playerId || !gameweek) return;

          const playerScore = startingScores[playerId];
          const points = Number(data.gwPoints || 0);

          playerScore.total += points;
          playerScore.byGameweek[gameweek] =
            Number(playerScore.byGameweek[gameweek] || 0) + points;
          playerScore.hasStatsForGameweek[gameweek] = true;
        });

        const loadedFixtures = fixturesSnap.docs
          .map((fixtureDoc) => {
            const data = fixtureDoc.data();

            return {
              id: fixtureDoc.id,
              gameweek: Number(data.gameweek || 0),
              playerOneId: String(data.playerOneId || ""),
              playerTwoId: String(data.playerTwoId || ""),
            } as PlayerFixture;
          })
          .filter(
            (fixture) =>
              fixture.gameweek > 0 &&
              Boolean(fixture.playerOneId) &&
              Boolean(fixture.playerTwoId)
          )
          .sort(
            (a, b) =>
              a.gameweek - b.gameweek || a.id.localeCompare(b.id)
          );

        setPlayers(loadedPlayers);
        setScores(startingScores);
        setFixtures(loadedFixtures);
      } catch (error) {
        console.error("Fixtures load error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFixtures();
  }, []);

  const playersById = useMemo(
    () => Object.fromEntries(players.map((player) => [player.id, player])),
    [players]
  );

  const fixtureResults = useMemo<FixtureResult[]>(
    () =>
      fixtures.map((fixture) => {
        const playerOneScore = Number(
          scores[fixture.playerOneId]?.byGameweek[fixture.gameweek] || 0
        );
        const playerTwoScore = Number(
          scores[fixture.playerTwoId]?.byGameweek[fixture.gameweek] || 0
        );
        const completed = Boolean(
          scores[fixture.playerOneId]?.hasStatsForGameweek[fixture.gameweek] &&
            scores[fixture.playerTwoId]?.hasStatsForGameweek[fixture.gameweek]
        );

        return {
          ...fixture,
          playerOneScore,
          playerTwoScore,
          completed,
        };
      }),
    [fixtures, scores]
  );

  const standings = useMemo<PlayerStanding[]>(() => {
    const totals: Record<string, PlayerStanding> = {};

    players.forEach((player) => {
      totals[player.id] = {
        player,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        score: Number(scores[player.id]?.total || 0),
        points: 0,
      };
    });

    fixtureResults.forEach((fixture) => {
      if (!fixture.completed) return;

      const playerOne = totals[fixture.playerOneId];
      const playerTwo = totals[fixture.playerTwoId];

      if (!playerOne || !playerTwo) return;

      playerOne.played += 1;
      playerTwo.played += 1;

      if (fixture.playerOneScore > fixture.playerTwoScore) {
        playerOne.wins += 1;
        playerOne.points += 3;
        playerTwo.losses += 1;
      } else if (fixture.playerOneScore < fixture.playerTwoScore) {
        playerTwo.wins += 1;
        playerTwo.points += 3;
        playerOne.losses += 1;
      } else {
        playerOne.draws += 1;
        playerTwo.draws += 1;
        playerOne.points += 1;
        playerTwo.points += 1;
      }
    });

    return Object.values(totals).sort(
      (a, b) =>
        b.points - a.points ||
        b.score - a.score ||
        b.wins - a.wins ||
        a.player.name.localeCompare(b.player.name)
    );
  }, [fixtureResults, players, scores]);

  const availableGameweeks = Array.from(
    new Set(fixtureResults.map((fixture) => fixture.gameweek))
  ).sort((a, b) => a - b);

  const shownFixtures = fixtureResults.filter(
    (fixture) =>
      selectedGameweek === "all" ||
      fixture.gameweek === Number(selectedGameweek)
  );

  const fixturesByGameweek = shownFixtures.reduce<
    Record<number, FixtureResult[]>
  >((groups, fixture) => {
    if (!groups[fixture.gameweek]) groups[fixture.gameweek] = [];
    groups[fixture.gameweek].push(fixture);
    return groups;
  }, {});

  if (loading) {
    return (
      <Shell>
        <p style={{ padding: "2rem" }}>Loading fixtures...</p>
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
            Fixtures are <span style={{ color: "var(--blue)" }}>Locked</span>
          </h1>

          <p
            style={{
              color: "var(--text-muted)",
              maxWidth: "460px",
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Access to player fixtures and standings is currently restricted by
            the admin. Check back again soon.
          </p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <main
        className="page-container fixtures-page"
        style={{ maxWidth: "1120px", margin: "0 auto", paddingBottom: "3rem" }}
      >
        <section
          className="page-hero fixtures-hero"
          style={{
            position: "relative",
            overflow: "hidden",
            border: "1px solid var(--border)",
            borderRadius: "28px",
            padding: "2rem",
            marginBottom: "1rem",
            background:
              "radial-gradient(circle at 20% 10%, rgba(3, 71, 244, 0.32), transparent 34%), radial-gradient(circle at 90% 15%, rgba(255, 193, 7, 0.16), transparent 30%), linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02))",
          }}
        >
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
            Head-to-head player league · GW{currentGameweek}
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
            Player <span style={{ color: "var(--blue)" }}>Fixtures</span>
          </h1>
        </section>

        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "20px",
            padding: "1rem",
            marginBottom: "1rem",
            overflowX: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900 }}>
                Player Standings
              </div>
            </div>
          </div>

          {standings.length === 0 ? (
            <div
              style={{
                color: "var(--text-muted)",
                textAlign: "center",
                padding: "2rem",
              }}
            >
              No players found yet.
            </div>
          ) : (
            <div style={{ minWidth: "720px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "42px minmax(180px, 1fr) repeat(4, 52px) 78px 58px",
                  gap: "0.45rem",
                  alignItems: "center",
                  padding: "0 0.6rem 0.65rem",
                  color: "var(--text-muted)",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  borderBottom: "1px solid var(--border)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <div>#</div>
                <div>Player</div>
                <div style={{ textAlign: "right" }}>PL</div>
                <div style={{ textAlign: "right" }}>W</div>
                <div style={{ textAlign: "right" }}>D</div>
                <div style={{ textAlign: "right" }}>L</div>
                <div style={{ textAlign: "right" }}>Score</div>
                <div style={{ textAlign: "right" }}>PTS</div>
              </div>

              {standings.map((standing, index) => (
                <div
                  key={standing.player.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "42px minmax(180px, 1fr) repeat(4, 52px) 78px 58px",
                    gap: "0.45rem",
                    alignItems: "center",
                    padding: "0.8rem 0.6rem",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background:
                      index === 0
                        ? "rgba(255,193,7,0.055)"
                        : "transparent",
                  }}
                >
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "10px",
                      background:
                        index === 0
                          ? "rgba(255,193,7,0.16)"
                          : "rgba(255,255,255,0.06)",
                      color:
                        index === 0 ? "var(--accent)" : "var(--text-muted)",
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {standing.player.name}
                    </div>
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        marginTop: "0.15rem",
                      }}
                    >
                      {standing.player.game}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>{standing.played}</div>
                  <div style={{ textAlign: "right", color: "var(--green)" }}>
                    {standing.wins}
                  </div>
                  <div style={{ textAlign: "right" }}>{standing.draws}</div>
                  <div style={{ textAlign: "right", color: "var(--red)" }}>
                    {standing.losses}
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 800 }}>
                    {standing.score}
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      color: "var(--accent)",
                      fontWeight: 900,
                    }}
                  >
                    {standing.points}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
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
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: "1.15rem", fontWeight: 900 }}>
                Match Schedule
              </div>
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.78rem",
                  marginTop: "0.2rem",
                }}
              >
                Fixtures become final after both players&apos; gameweek stats are
                saved.
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.55rem",
                color: "var(--text-muted)",
                fontSize: "0.8rem",
                fontWeight: 800,
              }}
            >
              Gameweek
              <select
                value={selectedGameweek}
                onChange={(event) => setSelectedGameweek(event.target.value)}
                style={{
                  background: "var(--bg)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0.5rem 0.6rem",
                }}
              >
                <option value="all">All gameweeks</option>
                {availableGameweeks.map((gameweek) => (
                  <option key={gameweek} value={gameweek}>
                    GW{gameweek}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {shownFixtures.length === 0 ? (
            <div
              style={{
                color: "var(--text-muted)",
                textAlign: "center",
                padding: "2.5rem 1rem",
                border: "1px dashed var(--border)",
                borderRadius: "16px",
              }}
            >
              No fixtures have been scheduled yet. An admin can create them in
              Admin → Fixtures.
            </div>
          ) : (
            Object.keys(fixturesByGameweek)
              .map(Number)
              .sort((a, b) => a - b)
              .map((gameweek) => (
                <div key={gameweek} style={{ marginBottom: "1.25rem" }}>
                  <div
                    style={{
                      color: "var(--accent)",
                      fontSize: "0.75rem",
                      fontWeight: 900,
                      letterSpacing: "0.06em",
                      marginBottom: "0.6rem",
                      textTransform: "uppercase",
                    }}
                  >
                    Gameweek {gameweek}
                  </div>

                  <div style={{ display: "grid", gap: "0.65rem" }}>
                    {fixturesByGameweek[gameweek].map((fixture) => {
                      const playerOne = playersById[fixture.playerOneId];
                      const playerTwo = playersById[fixture.playerTwoId];

                      return (
                        <div
                          key={fixture.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "minmax(0, 1fr) auto minmax(0, 1fr)",
                            gap: "0.75rem",
                            alignItems: "center",
                            padding: "0.85rem",
                            borderRadius: "14px",
                            border: "1px solid var(--border)",
                            background: "rgba(255,255,255,0.028)",
                          }}
                        >
                          <div style={{ minWidth: 0, textAlign: "right" }}>
                            <div
                              style={{
                                fontWeight: 800,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {playerOne?.name || "Unknown player"}
                            </div>
                            <div
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "0.7rem",
                                marginTop: "0.15rem",
                              }}
                            >
                              {playerOne?.game || ""}
                            </div>
                          </div>

                          <div
                            style={{ textAlign: "center", minWidth: "78px" }}
                          >
                            {fixture.completed ? (
                              <>
                                <div
                                  style={{
                                    color: "var(--accent)",
                                    fontWeight: 900,
                                    fontSize: "1.1rem",
                                  }}
                                >
                                  {fixture.playerOneScore} –{" "}
                                  {fixture.playerTwoScore}
                                </div>
                                <div
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.62rem",
                                    fontWeight: 800,
                                    marginTop: "0.2rem",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Final
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ fontWeight: 900 }}>VS</div>
                                <div
                                  style={{
                                    color: "var(--text-muted)",
                                    fontSize: "0.62rem",
                                    fontWeight: 800,
                                    marginTop: "0.2rem",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  Scheduled
                                </div>
                              </>
                            )}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 800,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {playerTwo?.name || "Unknown player"}
                            </div>
                            <div
                              style={{
                                color: "var(--text-muted)",
                                fontSize: "0.7rem",
                                marginTop: "0.15rem",
                              }}
                            >
                              {playerTwo?.game || ""}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
          )}
        </section>
      </main>
    </Shell>
  );
}
