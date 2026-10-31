"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type Player = {
  id: string;
  name: string;
  game: string;
  price: number;
  points: number;
  desc: string;
  image?: string;
  ID?: string;
  linkedManagerEmail?: string;
};

type ShopItemLite = {
  ID: string;
  itemName: string;
  itemType: string;
  previewImage: string;
};

type Challenge = {
  id: string;
  name: string;
  description: string;
  rewardType: "coins" | "song" | "title" | "avatar" | "banner";
  rewardShopItemId: string;
  rewardCoins: number;
  statKey: string;
  threshold: number;
  gameweek: number;
  isActive: boolean;
};

type ChallengeCompletion = {
  id: string;
  challengeId: string;
  ownerEmail: string;
  playerId: string;
  playerName?: string;
  gameweek: number;
};

type Settings = {
  currentGameweek: number;
};

function challengeStatLabel(statKey?: string) {
  const spaced = String(statKey || "")
    .replace(/([A-Z])/g, " $1")
    .trim();

  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : "Stat";
}

export default function ChallengesPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [currentGW, setCurrentGW] = useState<number>(0);
  const [selectedGW, setSelectedGW] = useState<number>(0);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [shopItems, setShopItems] = useState<ShopItemLite[]>([]);
  const [matchStats, setMatchStats] = useState<Record<string, any>>({});
  const [completions, setCompletions] = useState<ChallengeCompletion[]>([]);

  const myEmail = String(user?.email || "").toLowerCase();

  useEffect(() => {
    if (!user?.email) return;

    const load = async () => {
      setLoading(true);

      try {
        const [settingsSnap, challengesSnap, playersSnap, shopSnap] =
          await Promise.all([
            getDocs(collection(db, "settings")),
            getDocs(collection(db, "challenges")),
            getDocs(collection(db, "players")),
            getDocs(collection(db, "shopItems")),
          ]);

        let gw = 0;

        if (!settingsSnap.empty) {
          const raw = settingsSnap.docs[0].data().currentGameweek;
          const parsed = Number(raw);

          gw =
            raw !== undefined && raw !== null && Number.isFinite(parsed)
              ? parsed
              : 0;
        }

        setCurrentGW(gw);
        setSelectedGW(gw);

        setChallenges(
          challengesSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Challenge))
            .filter((c) => c.isActive !== false)
        );

        setPlayers(
          playersSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Player))
        );

        setShopItems(
          shopSnap.docs.map((d) => ({
            ID: String(d.data().ID || d.id),
            itemName: String(d.data().itemName || ""),
            itemType: String(d.data().itemType || ""),
            previewImage: String(d.data().previewImage || ""),
          }))
        );

        // Completion records are owner-scoped in the Firestore rules.
        try {
          const completionsSnap = await getDocs(
            query(
              collection(db, "challengeCompletions"),
              where("ownerEmail", "==", myEmail)
            )
          );

          setCompletions(
            completionsSnap.docs.map(
              (d) => ({ id: d.id, ...d.data() } as ChallengeCompletion)
            )
          );
        } catch {
          setCompletions([]);
        }
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  useEffect(() => {
    if (!selectedGW) return;

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

          if (data.Title) sMap[data.Title] = data;
          if (data.player) sMap[data.player] = data;
          sMap[d.id] = data;
        });

        setMatchStats(sMap);
      } catch (err) {
        console.error(err);
      }
    };

    loadStats();
  }, [selectedGW]);

  // The players linked to this manager account — their performance earns
  // the rewards.
  const myPlayers = players.filter(
    (p) => String(p.linkedManagerEmail || "").toLowerCase() === myEmail
  );

  const statsForPlayer = (p: Player) =>
    matchStats[p.name] ||
    (p.ID ? matchStats[p.ID] : undefined) ||
    matchStats[p.id];

  // Best value among the players linked to this account.
  const valueForChallenge = (challenge: Challenge) => {
    let best = 0;

    myPlayers.forEach((p) => {
      const stats = statsForPlayer(p);
      const value = Number((stats || {})[challenge.statKey] || 0);

      if (value > best) best = value;
    });

    return best;
  };

  const completionFor = (challenge: Challenge) =>
    completions.find(
      (c) => c.challengeId === challenge.id && Number(c.gameweek) === selectedGW
    );

  const availableGWs = Array.from(
    new Set(challenges.map((c) => Number(c.gameweek || 0)))
  )
    .filter((gw) => gw > 0 && gw <= currentGW)
    .sort((a, b) => b - a);

  const gwChallenges = challenges
    .filter((c) => Number(c.gameweek || 0) === selectedGW)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const shopItemById = (itemId: string) =>
    shopItems.find((item) => item.ID === itemId);

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
          Loading Challenges...
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <main
        className="page-container challenges-page"
        style={{ maxWidth: "1120px", margin: "0 auto", paddingBottom: "3rem" }}
      >
        <section
          className="page-hero challenges-hero"
          style={{
            position: "relative",
            overflow: "hidden",
            border: "1px solid var(--border)",
            borderRadius: "28px",
            padding: "2rem",
            marginBottom: "1rem",
            background:
              "radial-gradient(circle at 20% 10%, rgba(155, 248, 0, 0.14), transparent 32%), radial-gradient(circle at 90% 20%, rgba(255, 193, 7, 0.14), transparent 30%), linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02))",
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
              background: "rgba(155, 248, 0, 0.12)",
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
                background: "rgba(155, 248, 0, 0.12)",
                border: "1px solid rgba(155, 248, 0, 0.4)",
                color: "#c8f56a",
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
                  background: "var(--green)",
                }}
              />
              Challenges · GW{selectedGW}
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
              Player
              <br />
              <span style={{ color: "var(--green)" }}>Challenges</span>
            </h1>

            <p
              style={{
                color: "var(--text-muted)",
                maxWidth: "560px",
                lineHeight: 1.7,
                margin: "0 0 1.25rem",
                fontSize: "0.9rem",
              }}
            >
              Complete player challenges and earn limited-time rewards and coins.
            </p>

            {availableGWs.length > 0 && (
              <div
                className="gameweek-tabs"
                style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}
              >
                {availableGWs.map((gw) => (
                  <button
                    key={gw}
                    onClick={() => setSelectedGW(gw)}
                    style={{
                      padding: "0.65rem 0.95rem",
                      borderRadius: "12px",
                      border:
                        selectedGW === gw
                          ? "1px solid rgba(155,248,0,0.65)"
                          : "1px solid var(--border)",
                      background:
                        selectedGW === gw
                          ? "var(--green)"
                          : "rgba(255,255,255,0.045)",
                      color: selectedGW === gw ? "#0b1200" : "var(--text-muted)",
                      cursor: "pointer",
                      fontWeight: 900,
                    }}
                  >
                    GW{gw}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {myPlayers.length === 0 && (
          <div
            style={{
              background: "rgba(255,193,7,0.06)",
              border: "1px solid rgba(255,193,7,0.3)",
              borderRadius: "18px",
              padding: "1rem 1.25rem",
              color: "var(--text-muted)",
              fontSize: "0.85rem",
              lineHeight: 1.7,
              marginBottom: "1rem",
            }}
          >
            Complete Player Challenges and earn Limited-Time rewards and coins!
          </div>
        )}

        {gwChallenges.length === 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "2.5rem 2rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            No challenges for GW{selectedGW}. Check back soon.
          </div>
        ) : (
          <div
            className="challenges-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "1rem",
            }}
          >
            {gwChallenges.map((challenge) => {
              const threshold = Number(challenge.threshold || 0);
              const value = valueForChallenge(challenge);
              const linked = myPlayers.length > 0;
              const complete = linked && threshold > 0 && value >= threshold;
              const claimed = Boolean(completionFor(challenge));
              const rewardItem =
                challenge.rewardType !== "coins"
                  ? shopItemById(String(challenge.rewardShopItemId || ""))
                  : undefined;
              const progressPct =
                threshold > 0
                  ? Math.min(100, Math.round((value / threshold) * 100))
                  : 0;

              return (
                <div
                  key={challenge.id}
                  className="challenge-card"
                  style={{
                    background: complete
                      ? "linear-gradient(145deg, rgba(34,197,94,0.1), rgba(255,255,255,0.02)), var(--surface)"
                      : "var(--surface)",
                    border: `1px solid ${
                      complete ? "rgba(34,197,94,0.45)" : "var(--border)"
                    }`,
                    borderRadius: "20px",
                    padding: "1.1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.8rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: "1.05rem",
                          lineHeight: 1.2,
                        }}
                      >
                        {challenge.name || "Challenge"}
                      </div>

                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: "0.25rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {challengeStatLabel(challenge.statKey)} ≥{" "}
                        {threshold.toLocaleString()}
                      </div>
                    </div>

                    <span
                      style={{
                        background: complete
                          ? "rgba(34,197,94,0.15)"
                          : linked
                          ? "rgba(3,71,244,0.12)"
                          : "rgba(255,255,255,0.05)",
                        border: complete
                          ? "1px solid rgba(34,197,94,0.45)"
                          : linked
                          ? "1px solid rgba(107,159,255,0.4)"
                          : "1px solid var(--border)",
                        color: complete
                          ? "var(--green)"
                          : linked
                          ? "#8bb5ff"
                          : "var(--text-muted)",
                        fontSize: "0.62rem",
                        fontWeight: 900,
                        padding: "0.25rem 0.5rem",
                        borderRadius: "999px",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {complete
                        ? "✓ COMPLETED"
                        : linked
                        ? "IN PROGRESS"
                        : "NOT LINKED"}
                    </span>
                  </div>

                  {challenge.description && (
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.82rem",
                        lineHeight: 1.6,
                      }}
                    >
                      {challenge.description}
                    </div>
                  )}

                  {linked ? (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.75rem",
                          marginBottom: "0.4rem",
                        }}
                      >
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontWeight: 800,
                          }}
                        >
                          {challengeStatLabel(challenge.statKey)}
                        </span>

                        <span
                          style={{
                            fontWeight: 900,
                            color: complete ? "var(--green)" : "var(--text)",
                          }}
                        >
                          {value.toLocaleString()} /{" "}
                          {threshold.toLocaleString()}
                        </span>
                      </div>

                      <div
                        style={{
                          height: "8px",
                          borderRadius: "999px",
                          background: "rgba(255,255,255,0.06)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${progressPct}%`,
                            height: "100%",
                            borderRadius: "999px",
                            background: complete
                              ? "var(--green)"
                              : "var(--blue)",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      No player linked to your account.
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      background: "rgba(255,255,255,0.035)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "14px",
                      padding: "0.7rem 0.85rem",
                      marginTop: "auto",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.62rem",
                        color: "var(--text-muted)",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: "0.7px",
                        minWidth: "52px",
                      }}
                    >
                      Reward
                    </div>

                    {challenge.rewardType === "coins" ? (
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: "0.95rem",
                          color: "var(--accent)",
                        }}
                      >
                        {Number(challenge.rewardCoins || 0).toLocaleString()}{" "}
                        Coins
                      </div>
                    ) : rewardItem ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "10px",
                            overflow: "hidden",
                            background: "#161616",
                            border: "1px solid rgba(255,255,255,0.1)",
                            flexShrink: 0,
                          }}
                        >
                          {rewardItem.previewImage ? (
                            <img
                              src={rewardItem.previewImage}
                              alt={rewardItem.itemName}
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
                                fontSize: "1.1rem",
                                color: "rgba(255,255,255,0.25)",
                                fontWeight: 900,
                              }}
                            >
                              {(rewardItem.itemName || "?").slice(0, 1)}
                            </div>
                          )}
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 800,
                              fontSize: "0.85rem",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {rewardItem.itemName || "Shop item"}
                          </div>

                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: "var(--text-muted)",
                              textTransform: "uppercase",
                              fontWeight: 800,
                              letterSpacing: "0.5px",
                            }}
                          >
                            {rewardItem.itemType}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Shop item reward
                      </div>
                    )}
                  </div>

                  {complete && (
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        color: claimed ? "var(--green)" : "var(--accent)",
                      }}
                    >
                      {claimed
                        ? "✓ Reward claimed"
                        : "✓ Completed — reward arrives after the admin checks"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </Shell>
  );
}
