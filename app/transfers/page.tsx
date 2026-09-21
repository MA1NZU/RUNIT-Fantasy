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
import Link from "next/link";
import {
  LimitedCard,
  UserLimitedCard,
  getLimitedCardImageUrl,
  getLimitedCardRarityColor,
  limitedCardPowerupText,
} from "@/lib/limitedCards";

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
  showInTransfers?: boolean;
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
  limitedCards?: string[];
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
      className={`transfer-player-card${compact ? " is-compact" : ""}`}
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
      className="transfer-empty-slot"
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
      className="transfer-countdown"
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

  const [limitedCards, setLimitedCards] = useState<LimitedCard[]>([]);
  const [userCards, setUserCards] = useState<UserLimitedCard[]>([]);
  const [activeCardIds, setActiveCardIds] = useState<string[]>([]);

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
          list
            .filter((player) => player.showInTransfers !== false)
            .sort(
              (a, b) =>
                Number(b.totalPoints ?? 0) - Number(a.totalPoints ?? 0)
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

        const [limitedCardsSnap, userCardsSnap] = await Promise.all([
          getDocs(collection(db, "limitedCards")),
          getDocs(
            query(
              collection(db, "userLimitedCards"),
              where("ownerEmail", "==", user.email)
            )
          ),
        ]);

        const loadedCards = limitedCardsSnap.docs
          .map((cardDoc) => {
            const data = cardDoc.data() as Partial<LimitedCard>;

            return {
              ...data,
              id: cardDoc.id,
              ID: String(data.ID || cardDoc.id),
            } as LimitedCard;
          })
          .filter((card) => card.isVisible !== false)
          .sort((a, b) => (a.cardName || "").localeCompare(b.cardName || ""));

        const loadedUserCards = userCardsSnap.docs.map(
          (userCardDoc) =>
            ({ id: userCardDoc.id, ...userCardDoc.data() } as UserLimitedCard)
        );

        setLimitedCards(loadedCards);
        setUserCards(loadedUserCards);

        const savedCardIds =
          next && Array.isArray(next.limitedCards)
            ? next.limitedCards.filter((cardDocId) =>
                loadedUserCards.some((userCard) => userCard.id === cardDocId)
              )
            : [];

        setActiveCardIds(savedCardIds);
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
  const currentGW = nextGW - 1;

  const limitedCardCatalog = (cardId: string) =>
    limitedCards.find((card) => card.ID === cardId);

  const attachedCards = activeCardIds
    .map((cardDocId) => userCards.find((userCard) => userCard.id === cardDocId))
    .filter((userCard): userCard is UserLimitedCard => Boolean(userCard));

  const limitedCardsCost = attachedCards.reduce(
    (sum, userCard) =>
      sum + Number(limitedCardCatalog(userCard.cardId)?.transferPrice ?? 0),
    0
  );

  const totalCost =
    allSelected.reduce(
      (sum, id) => sum + Number(getPlayer(id)?.price ?? 0),
      0
    ) + limitedCardsCost;
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

    if (p.showInTransfers === false) {
      setError("This player is not currently available for transfers.");
      return;
    }

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

  const pruneActiveCards = (nextSquad: string[]) => {
    setActiveCardIds((prev) =>
      prev.filter((cardDocId) => {
        const userCard = userCards.find((c) => c.id === cardDocId);

        if (!userCard) return false;

        const card = limitedCardCatalog(userCard.cardId);

        return card ? nextSquad.includes(card.playerId) : false;
      })
    );
  };

  const toggleLimitedCard = (cardDocId: string) => {
    setError("");

    const userCard = userCards.find((c) => c.id === cardDocId);

    if (!userCard) return;

    if (activeCardIds.includes(cardDocId)) {
      setActiveCardIds(activeCardIds.filter((id) => id !== cardDocId));
      return;
    }

    const card = limitedCardCatalog(userCard.cardId);

    if (!card) {
      setError("This limited card is no longer available.");
      return;
    }

    const cardGW = Number(userCard.gameweek || 0);

    if (userCard.status === "used") {
      setError("This card has already been used.");
      return;
    }

    if (userCard.status === "active" && cardGW >= currentGW && cardGW !== nextGW) {
      setError(`This card is in use for GW${cardGW}.`);
      return;
    }

    const player = getPlayer(card.playerId);

    if (!squad.includes(card.playerId)) {
      setError(
        `${
          player?.name || "This card's player"
        } must be in your Starting IV to use this card.`
      );
      return;
    }

    if (totalCost + Number(card.transferPrice || 0) > budget) {
      setError("Budget exceeded.");
      return;
    }

    setActiveCardIds([...activeCardIds, cardDocId]);
  };

  const removeFromSquad = (id: string) => {
    setError("");

    const nextSquad = squad.filter((p) => p !== id);

    setSquad(nextSquad);

    if (captain === id) setCaptain("");

    pruneActiveCards(nextSquad);
  };

  const swapWithSub = (pid: string) => {
    setError("");

    if (!sub) {
      const nextSquad = squad.filter((id) => id !== pid);

      setSquad(nextSquad);
      setSub(pid);

      if (captain === pid) setCaptain("");

      pruneActiveCards(nextSquad);

      return;
    }

    const currentSub = sub;
    const newSquad = squad
      .map((id) => (id === pid ? currentSub : id))
      .filter(Boolean);

    setSquad(newSquad);
    setSub(pid);

    if (captain === pid) setCaptain("");

    pruneActiveCards(newSquad);
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

    const invalidCard = attachedCards.find((userCard) => {
      const card = limitedCardCatalog(userCard.cardId);

      return !card || !squad.includes(card.playerId);
    });

    if (invalidCard) {
      setError("Remove the limited card whose player left your squad.");
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
      limitedCards: activeCardIds,
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

      const previouslyActive =
        nextGWTeam && Array.isArray(nextGWTeam.limitedCards)
          ? nextGWTeam.limitedCards
          : [];
      const cardsToActivate = activeCardIds.filter(
        (cardDocId) => !previouslyActive.includes(cardDocId)
      );
      const cardsToRelease = previouslyActive.filter(
        (cardDocId) => !activeCardIds.includes(cardDocId)
      );

      await Promise.all([
        ...cardsToActivate.map((cardDocId) =>
          updateDoc(doc(db, "userLimitedCards", cardDocId), {
            status: "active",
            gameweek: nextGW,
            "Updated Date": new Date().toISOString(),
          })
        ),
        ...cardsToRelease.map((cardDocId) =>
          updateDoc(doc(db, "userLimitedCards", cardDocId), {
            status: "owned",
            gameweek: 0,
            "Updated Date": new Date().toISOString(),
          })
        ),
      ]);

      setUserCards((prev) =>
        prev.map((userCard) => {
          if (cardsToActivate.includes(userCard.id)) {
            return { ...userCard, status: "active", gameweek: nextGW };
          }

          if (cardsToRelease.includes(userCard.id)) {
            return { ...userCard, status: "owned", gameweek: 0 };
          }

          return userCard;
        })
      );

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
        className="page-container transfers-page"
        style={{
          maxWidth: "1120px",
          margin: "0 auto",
          paddingBottom: "3rem",
        }}
      >
        <section
          className="page-hero transfers-hero"
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
                color: "var(--blue)",
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
          className="transfer-summary-card responsive-scroll"
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
            className="transfer-summary-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr",
              gap: "0.5rem",
              minWidth: "680px",
              alignItems: "stretch",
            }}
          >
            <div
              className="transfer-summary-bank"
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
                Bank
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
                className={`transfer-summary-stat${
                  stat.label === "Budget" ? " transfer-summary-budget" : ""
                }`}
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
          className="transfer-squad-section"
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
            className="transfer-squad-grid"
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
          className="transfer-bench-section"
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
            Bench
          </div>

          <div className="transfer-bench-card" style={{ maxWidth: "220px" }}>
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

        <section
          className="transfer-limited-section"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, rgba(155,248,0,0.07), transparent 35%), var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "1rem",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "0.35rem",
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
              Limited Cards
            </div>

            <div
              style={{
                color: "var(--text-muted)",
                fontSize: "0.72rem",
                background: "rgba(255,255,255,0.045)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "999px",
                padding: "0.35rem 0.65rem",
                fontWeight: 800,
              }}
            >
              {attachedCards.length} active · {userCards.length} owned
            </div>
          </div>

          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.78rem",
              lineHeight: 1.5,
              marginBottom: "0.85rem",
            }}
          >
            Attach a card to boost its linked starter for GW{nextGW}. The
            card&apos;s squad cost counts against your bank, its power-up
            applies when the gameweek is scored, and the copy is then used up.
            Cards whose player is not in your team keep waiting until you field
            that player.
          </p>

          {userCards.length === 0 ? (
            <div
              style={{
                border: "1px dashed var(--border)",
                borderRadius: "14px",
                padding: "1.25rem",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              You don&apos;t own any limited cards yet.{" "}
              <Link
                href="/shop"
                style={{ color: "var(--blue)", fontWeight: 800 }}
              >
                Get one in the Shop →
              </Link>
            </div>
          ) : (
            <div
              className="shop-items-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                gap: "0.75rem",
              }}
            >
              {userCards.map((userCard) => {
                const card = limitedCardCatalog(userCard.cardId);

                if (!card) return null;

                const attached = activeCardIds.includes(userCard.id);
                const player = getPlayer(card.playerId);
                const rarityColor = getLimitedCardRarityColor(
                  card.rarity,
                  card.accentColor
                );
                const imageUrl = getLimitedCardImageUrl(card.image);
                const cardGW = Number(userCard.gameweek || 0);
                const isUsed = userCard.status === "used";
                const isActiveThisSquad =
                  userCard.status === "active" && cardGW === nextGW;
                const isInUseLive =
                  userCard.status === "active" &&
                  !attached &&
                  !isActiveThisSquad &&
                  cardGW >= currentGW;
                const playerInSquad = squad.includes(card.playerId);
                const cardTransferPrice = Number(card.transferPrice || 0);
                const canAffordCard =
                  attached || totalCost + cardTransferPrice <= budget;

                let actionLabel = `USE · +${cardTransferPrice.toFixed(1)}m`;
                let actionDisabled = false;
                let note = "";

                if (isUsed) {
                  actionLabel = cardGW ? `USED · GW${cardGW}` : "USED";
                  actionDisabled = true;
                } else if (attached) {
                  actionLabel = "✓ IN SQUAD — REMOVE";
                } else if (isInUseLive) {
                  actionLabel = `IN USE · GW${cardGW}`;
                  actionDisabled = true;
                } else if (!playerInSquad) {
                  actionLabel = `NEEDS ${player?.name || "PLAYER"}`;
                  actionDisabled = true;
                  note = `${
                    player?.name || "This player"
                  } must be in your Starting IV.`;
                } else if (!canAffordCard) {
                  actionLabel = "TOO EXPENSIVE";
                  actionDisabled = true;
                }

                return (
                  <div
                    key={userCard.id}
                    style={{
                      borderRadius: "16px",
                      overflow: "hidden",
                      border: `1px solid ${
                        attached ? "var(--green)" : `${rarityColor}55`
                      }`,
                      background: `linear-gradient(160deg, ${rarityColor}1a, rgba(255,255,255,0.015)), var(--surface)`,
                      opacity: isUsed ? 0.55 : 1,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        aspectRatio: "4/3",
                        background: `radial-gradient(circle at 30% 20%, ${rarityColor}2e, transparent 45%), #111`,
                      }}
                    >
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={card.cardName}
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
                            color: "rgba(255,255,255,0.25)",
                            fontWeight: 900,
                            fontSize: "1.6rem",
                          }}
                        >
                          {(card.cardName || "?").slice(0, 1)}
                        </div>
                      )}

                      <span
                        style={{
                          position: "absolute",
                          top: "0.55rem",
                          left: "0.55rem",
                          background: "rgba(0,0,0,0.55)",
                          border: `1px solid ${rarityColor}80`,
                          color: rarityColor,
                          fontSize: "0.58rem",
                          fontWeight: 900,
                          padding: "0.2rem 0.45rem",
                          borderRadius: "999px",
                          textTransform: "uppercase",
                          letterSpacing: "0.6px",
                        }}
                      >
                        {card.rarity || "rare"}
                      </span>

                      {attached && (
                        <span
                          style={{
                            position: "absolute",
                            top: "0.55rem",
                            right: "0.55rem",
                            background: "var(--green)",
                            color: "#000",
                            fontSize: "0.58rem",
                            fontWeight: 900,
                            padding: "0.2rem 0.45rem",
                            borderRadius: "999px",
                          }}
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        padding: "0.7rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem",
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: "0.88rem",
                          lineHeight: 1.2,
                        }}
                      >
                        {card.cardName}
                      </div>

                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.68rem",
                        }}
                      >
                        {player
                          ? `${player.name} · ${player.game}`
                          : "Unknown player"}
                      </div>

                      <div
                        style={{
                          color: "var(--accent)",
                          fontSize: "0.66rem",
                          fontWeight: 800,
                          lineHeight: 1.35,
                        }}
                      >
                        {limitedCardPowerupText(card)}
                      </div>

                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.64rem",
                        }}
                      >
                        Squad cost +{cardTransferPrice.toFixed(1)}m
                      </div>

                      {note && (
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.62rem",
                            lineHeight: 1.35,
                          }}
                        >
                          {note}
                        </div>
                      )}

                      <button
                        onClick={() => toggleLimitedCard(userCard.id)}
                        disabled={actionDisabled}
                        style={{
                          marginTop: "auto",
                          width: "100%",
                          padding: "0.55rem",
                          borderRadius: "10px",
                          border: "none",
                          fontWeight: 900,
                          fontSize: "0.72rem",
                          cursor: actionDisabled ? "not-allowed" : "pointer",
                          background: attached
                            ? "var(--green)"
                            : isUsed || isInUseLive
                            ? "rgba(255,255,255,0.07)"
                            : "var(--blue)",
                          color: attached ? "#000" : "#fff",
                        }}
                      >
                        {actionLabel}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
            className="transfer-modal-overlay"
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
              className="transfer-modal"
              style={{
                background: "var(--surface)",
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
                className="transfer-modal-header"
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
                className="transfer-modal-filters"
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
                className="transfer-modal-results"
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
                    No available players found.
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
