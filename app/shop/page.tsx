"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";
import {
  LimitedCard,
  getLimitedCardImageUrl,
  getLimitedCardRarityColor,
  limitedCardPowerupText,
} from "@/lib/limitedCards";
import {
  Crate,
  crateOdds,
  crateRarityRank,
  crateRaritySummary,
  drawCrateItem,
  getCrateImageUrl,
} from "@/lib/crates";
import CrateOpeningOverlay, { CrateResult } from "@/components/CrateOpeningOverlay";

type ShopItem = {
  ID: string;
  itemName: string;
  itemType: "avatar" | "banner" | "song" | "title";
  price: number;
  previewImage: string;
  songUrl?: string;
  songPreviewStart?: number | string | null;
  rarity: string;
  section: string;
  isVisible: boolean;
  showNewTag?: boolean;
  showLeavingTodayTag?: boolean;
};

type ShopSection = {
  title: string;
  order: number;
};

type Settings = {
  currentGameweek?: number;
  deadline?: any;
  shopRefreshAt?: any;
  lockShop?: boolean;
};

type ManagerTeam = {
  id: string;
  coins: number;
  ownerEmail?: string;
  ownerUid?: string;
};

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);

  return match && match[2].length === 11 ? match[2] : null;
}

// How long the shop song preview plays before stopping automatically.
const SONG_PREVIEW_SECONDS = 30;

function toDateSafe(value: any): Date | null {
  if (!value) return null;

  if (typeof value.toDate === "function") return value.toDate();

  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  return null;
}

function ShopRefreshTimer({ refreshAt }: { refreshAt?: any }) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const refreshDate = toDateSafe(refreshAt);

      if (!refreshDate) {
        setTimeLeft("Not set");
        return;
      }

      const diff = refreshDate.getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft("Refresh available");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    update();

    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [refreshAt]);

  return (
    <div
      className="shop-refresh-timer"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        background: "rgba(3,71,244,0.12)",
        border: "1px solid rgba(107,159,255,0.4)",
        color: "#8bb5ff",
        borderRadius: "999px",
        padding: "0.5rem 0.8rem",
        fontSize: "0.8rem",
        fontWeight: 800,
      }}
    >
      <span>Next Refresh</span>
      <span style={{ color: "#fff", fontFamily: "monospace" }}>
        {timeLeft || "Loading..."}
      </span>
    </div>
  );
}

const getRarityColor = (rarity?: string) => {
  switch ((rarity || "").toLowerCase()) {
    case "common":
      return "#9ca3af";
    case "uncommon":
      return "#22c55e";
    case "rare":
      return "var(--blue)";
    case "epic":
      return "#a855f7";
    case "legendary":
      return "#ffce1b";
    case "icon":
      return "#22d3ee";
    default:
      return "var(--text-muted)";
  }
};

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function inventoryItemId(data: Record<string, any>) {
  return String(data.itemId || data.itemID || data.item || data.ID || "");
}

export default function ShopPage() {
  const { user } = useAuth();

  const [itemsBySection, setItemsBySection] = useState<
    Record<string, ShopItem[]>
  >({});
  const [sectionOrders, setSectionOrders] = useState<Record<string, number>>({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [userCoins, setUserCoins] = useState<number | null>(null);
  const [managerTeam, setManagerTeam] = useState<ManagerTeam | null>(null);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [limitedCards, setLimitedCards] = useState<LimitedCard[]>([]);
  const [buyingCard, setBuyingCard] = useState<string | null>(null);
  const [crates, setCrates] = useState<Crate[]>([]);
  const [allShopItems, setAllShopItems] = useState<ShopItem[]>([]);
  const [crateModalCrate, setCrateModalCrate] = useState<Crate | null>(null);
  const [openingCrate, setOpeningCrate] = useState<Crate | null>(null);
  const [crateResult, setCrateResult] = useState<CrateResult | null>(null);
  const [openingCrateRun, setOpeningCrateRun] = useState(0);
  const [openingCrateBusy, setOpeningCrateBusy] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [accountReady, setAccountReady] = useState(false);
  const [shopError, setShopError] = useState("");
  const [accountError, setAccountError] = useState("");

  const previewPlayerRef = useRef<any>(null);
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewDeadlineRef = useRef<number>(0);
  const pendingFallbackSeekRef = useRef(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewSecondsLeft, setPreviewSecondsLeft] = useState(
    SONG_PREVIEW_SECONDS
  );
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const userEmail = String(user?.email || "").trim();
    const normalizedUserEmail = normalizeEmail(userEmail);
    const userUid = user?.uid;

    if (!userEmail || !userUid) {
      setLoading(false);

      return () => {
        active = false;
      };
    }

    const loadShop = async () => {
      setLoading(true);
      setIsLocked(false);
      setSettings(null);
      setItemsBySection({});
      setSectionOrders({});
      setUserCoins(null);
      setManagerTeam(null);
      setOwnedIds([]);
      setCrates([]);
      setAllShopItems([]);
      setCrateModalCrate(null);
      setOpeningCrate(null);
      setCrateResult(null);
      setAccountReady(false);
      setShopError("");
      setAccountError("");

      const [itemsResult, settingsResult, sectionsResult, cardsResult, cratesResult] =
        await Promise.allSettled([
          getDocs(collection(db, "shopItems")),
          getDocs(collection(db, "settings")),
          getDocs(collection(db, "shopSections")),
          getDocs(collection(db, "limitedCards")),
          getDocs(collection(db, "crates")),
        ]);

      if (!active) return;

      const publicLoadFailed =
        itemsResult.status === "rejected" ||
        settingsResult.status === "rejected" ||
        sectionsResult.status === "rejected" ||
        cardsResult.status === "rejected" ||
        cratesResult.status === "rejected";

      if (itemsResult.status === "rejected") {
        console.error("Unable to load shop items:", itemsResult.reason);
      }

      if (settingsResult.status === "rejected") {
        console.error("Unable to load shop settings:", settingsResult.reason);
      }

      if (sectionsResult.status === "rejected") {
        console.error("Unable to load shop sections:", sectionsResult.reason);
      }

      if (cardsResult.status === "rejected") {
        console.error("Unable to load limited cards:", cardsResult.reason);
      }

      if (cratesResult.status === "rejected") {
        console.error("Unable to load crates:", cratesResult.reason);
      }

      if (publicLoadFailed) {
        setShopError(
          "Some shop data could not be loaded. Check that signed-in managers can read shopItems, shopSections, limitedCards, crates, and settings in Firestore."
        );
      }

      if (sectionsResult.status === "fulfilled") {
        const orderMap: Record<string, number> = {};

        sectionsResult.value.docs.forEach((sectionDoc) => {
          const data = sectionDoc.data() as ShopSection;
          const title = String(data.title || sectionDoc.id || "General");
          orderMap[title] = Number(data.order ?? 99);
        });

        setSectionOrders(orderMap);
      }

      if (cratesResult.status === "fulfilled") {
        setCrates(
          cratesResult.value.docs
            .map((crateDoc) => {
              const data = crateDoc.data() as Partial<Crate>;

              return {
                ...data,
                id: crateDoc.id,
                items: Array.isArray(data.items) ? data.items : [],
              } as Crate;
            })
            .filter((crate) => crate.isVisible !== false)
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        );
      }

      if (cardsResult.status === "fulfilled") {
        setLimitedCards(
          cardsResult.value.docs
            .map((cardDoc) => {
              const data = cardDoc.data() as Partial<LimitedCard>;

              return {
                ...data,
                id: cardDoc.id,
                ID: String(data.ID || cardDoc.id),
              } as LimitedCard;
            })
            .filter((card) => card.isVisible !== false)
            .sort((a, b) => (a.cardName || "").localeCompare(b.cardName || ""))
        );
      }

      if (settingsResult.status === "fulfilled" && !settingsResult.value.empty) {
        const settingsData = settingsResult.value.docs[0].data() as Settings;
        setSettings(settingsData);

        if (settingsData.lockShop) {
          setIsLocked(true);
          setLoading(false);
          return;
        }
      }

      if (itemsResult.status === "fulfilled") {
        const allItems = itemsResult.value.docs.map((itemDoc) => {
          const data = itemDoc.data() as Partial<ShopItem>;

          return {
            ...data,
            ID: String(data.ID || itemDoc.id),
          } as ShopItem;
        });

        const availableItems = allItems.filter((item) => item.isVisible !== false);

        // Crate contents resolve against every item, including hidden ones,
        // so a crate keeps working after its item leaves the public shop.
        setAllShopItems(allItems);

        const grouped = availableItems.reduce((acc, item) => {
          const section = item.section || "General";

          if (!acc[section]) acc[section] = [];

          acc[section].push(item);

          return acc;
        }, {} as Record<string, ShopItem[]>);

        Object.keys(grouped).forEach((section) => {
          grouped[section].sort((a, b) =>
            (a.itemName || "").localeCompare(b.itemName || "")
          );
        });

        setItemsBySection(grouped);
      }

      const [teamsByUidResult, teamsByEmailResult, inventoryByUidResult, inventoryByEmailResult] =
        await Promise.allSettled([
          getDocs(
            query(collection(db, "userTeams"), where("ownerUid", "==", userUid))
          ),
          getDocs(
            query(
              collection(db, "userTeams"),
              where("ownerEmail", "==", userEmail)
            )
          ),
          getDocs(
            query(
              collection(db, "userInventory"),
              where("ownerUid", "==", userUid)
            )
          ),
          getDocs(
            query(
              collection(db, "userInventory"),
              where("ownerEmail", "==", userEmail)
            )
          ),
        ]);

      if (!active) return;

      const teamDocs = [
        ...(teamsByUidResult.status === "fulfilled"
          ? teamsByUidResult.value.docs
          : []),
        ...(teamsByEmailResult.status === "fulfilled"
          ? teamsByEmailResult.value.docs
          : []),
      ];

      // Prefer a doc that carries this manager's own ownerUid: the purchase
      // transaction writes to this doc, and the uid branch of the Firestore
      // rules always accepts it even if ownerEmail casing differs.
      const managerDoc =
        teamDocs.find(
          (teamDoc) => String(teamDoc.data().ownerUid || "") === userUid
        ) ||
        teamDocs.find(
          (teamDoc) =>
            normalizeEmail(teamDoc.data().ownerEmail) === normalizedUserEmail
        );

      const canReadManager =
        teamsByUidResult.status === "fulfilled" ||
        teamsByEmailResult.status === "fulfilled";
      const canReadInventory =
        inventoryByUidResult.status === "fulfilled" ||
        inventoryByEmailResult.status === "fulfilled";

      if (!canReadManager) {
        console.error(
          "Unable to load the manager account:",
          teamsByUidResult.status === "rejected"
            ? teamsByUidResult.reason
            : teamsByEmailResult.status === "rejected"
            ? teamsByEmailResult.reason
            : "Unknown Firestore error"
        );
        setAccountError(
          "Your manager record could not be read, so the shop cannot safely show or spend your coins. Publish the Firestore rules below and reload this page."
        );
      } else if (!managerDoc) {
        setAccountError(
          `No manager record matches ${userEmail}. Ask the admin to check the ownerEmail saved in userTeams.`
        );
      } else {
        const data = managerDoc.data();
        const parsedCoins = Number(data.coins || 0);
        const coins = Number.isFinite(parsedCoins) ? parsedCoins : 0;

        setManagerTeam({
          id: managerDoc.id,
          coins,
          ownerEmail: String(data.ownerEmail || ""),
          ownerUid: String(data.ownerUid || ""),
        });
        setUserCoins(coins);
      }

      if (!canReadInventory) {
        console.error(
          "Unable to load inventory:",
          inventoryByUidResult.status === "rejected"
            ? inventoryByUidResult.reason
            : inventoryByEmailResult.status === "rejected"
            ? inventoryByEmailResult.reason
            : "Unknown Firestore error"
        );
        setAccountError((current) =>
          current ||
          "Your inventory could not be read, so purchases are disabled to prevent duplicate items. Publish the Firestore rules below and reload this page."
        );
      } else {
        const inventoryDocs = new Map<string, Record<string, any>>();

        [inventoryByUidResult, inventoryByEmailResult].forEach((result) => {
          if (result.status !== "fulfilled") return;

          result.value.docs.forEach((inventoryDoc) => {
            const data = inventoryDoc.data();
            const belongsToUser =
              String(data.ownerUid || "") === userUid ||
              normalizeEmail(data.ownerEmail) === normalizedUserEmail;

            if (belongsToUser) inventoryDocs.set(inventoryDoc.id, data);
          });
        });

        setOwnedIds(
          Array.from(inventoryDocs.values())
            .map((data) => inventoryItemId(data))
            .filter(Boolean)
        );
      }

      if (managerDoc && canReadInventory) {
        setAccountReady(true);
      }

      setLoading(false);
    };

    loadShop().catch((error) => {
      console.error("Unable to load shop:", error);

      if (active) {
        setShopError(
          "The shop could not be loaded. Check your connection and Firestore permissions, then reload."
        );
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [user]);

  // Song previews: one hidden YouTube player plays a short snippet of the
  // selected song, then stops automatically.
  useEffect(() => {
    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current);

      try {
        previewPlayerRef.current?.destroy?.();
      } catch {}
    };
  }, []);

  const clearPreviewTimer = () => {
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  };

  const stopSongPreview = () => {
    clearPreviewTimer();
    pendingFallbackSeekRef.current = false;
    setPreviewingId(null);
    setPreviewLoading(false);
    setPreviewSecondsLeft(SONG_PREVIEW_SECONDS);

    try {
      previewPlayerRef.current?.stopVideo?.();
    } catch {}
  };

  const attachPreviewPlayer = (videoId: string, startSeconds: number) => {
    setPreviewLoading(true);

    previewPlayerRef.current = new window.YT.Player(
      "shop-song-preview-player",
      {
        height: "0",
        width: "0",
        videoId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          start: startSeconds,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(80);
            event.target.playVideo();
            setPreviewLoading(false);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              stopSongPreview();
            }

            // Songs without a configured "Song Preview Start" jump to the
            // same fallback point the crate opening overlay uses (35% into
            // the song, or 15s for short tracks), so both previews play
            // the same part of the song.
            if (
              event.data === window.YT.PlayerState.PLAYING &&
              pendingFallbackSeekRef.current
            ) {
              pendingFallbackSeekRef.current = false;

              const duration = Number(event.target.getDuration?.() || 0);

              if (duration > 0) {
                let fallbackStart =
                  duration > 40 ? Math.floor(duration * 0.35) : 15;

                fallbackStart = Math.min(
                  fallbackStart,
                  Math.max(0, duration - 31)
                );

                if (fallbackStart > 0) {
                  event.target.seekTo(fallbackStart, true);
                }
              }
            }
          },
          onError: () => {
            stopSongPreview();
          },
        },
      }
    );
  };

  const createPreviewPlayer = (videoId: string, startSeconds: number) => {
    if (window.YT && window.YT.Player) {
      attachPreviewPlayer(videoId, startSeconds);

      return;
    }

    window.onYouTubeIframeAPIReady = () =>
      attachPreviewPlayer(videoId, startSeconds);

    if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      )
    ) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];

      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }
  };

  const toggleSongPreview = (item: ShopItem) => {
    const ytId = getYouTubeId(String(item.songUrl || ""));

    if (!ytId) return;

    if (previewingId === item.ID) {
      stopSongPreview();

      return;
    }

    clearPreviewTimer();
    setPreviewingId(item.ID);
    setPreviewLoading(true);
    setPreviewSecondsLeft(SONG_PREVIEW_SECONDS);
    previewDeadlineRef.current = Date.now() + SONG_PREVIEW_SECONDS * 1000;

    previewTimerRef.current = setInterval(() => {
      const left = Math.max(
        0,
        Math.ceil((previewDeadlineRef.current - Date.now()) / 1000)
      );

      setPreviewSecondsLeft(left);

      if (left <= 0) {
        stopSongPreview();
      }
    }, 250);

    const configured = Number(item.songPreviewStart);
    const hasConfigured = Number.isFinite(configured) && configured > 0;
    const startSeconds = hasConfigured ? configured : 0;

    pendingFallbackSeekRef.current = !hasConfigured;

    if (previewPlayerRef.current?.loadVideoById) {
      previewPlayerRef.current.loadVideoById({ videoId: ytId, startSeconds });
      previewPlayerRef.current.playVideo();
      setPreviewLoading(false);
    } else {
      createPreviewPlayer(ytId, startSeconds);
    }
  };

  const handleBuy = async (item: ShopItem) => {
    const userEmail = String(user?.email || "").trim();
    const normalizedUserEmail = normalizeEmail(userEmail);
    const userUid = user?.uid;
    const price = Number(item.price || 0);

    if (!userEmail || !userUid) return;

    if (!managerTeam || userCoins === null || !accountReady) {
      alert("Your manager coins are not available yet. Reload after checking Firestore access.");
      return;
    }

    if (ownedIds.includes(item.ID)) return;

    if (!Number.isFinite(price) || price < 0) {
      alert("This item has an invalid price. Ask an admin to update it.");
      return;
    }

    if (userCoins < price) {
      alert("Not enough coins!");
      return;
    }

    if (!confirm(`Buy ${item.itemName}?`)) return;

    setBuying(item.ID);

    try {
      const remainingCoins = await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, "userTeams", managerTeam.id);
        const inventoryRef = doc(
          db,
          "userInventory",
          `${userUid}_${encodeURIComponent(item.ID)}`
        );
        const [teamSnap, inventorySnap] = await Promise.all([
          transaction.get(teamRef),
          transaction.get(inventoryRef),
        ]);

        if (!teamSnap.exists()) {
          throw new Error("MANAGER_NOT_FOUND");
        }

        const teamData = teamSnap.data();
        const ownsManagerRecord =
          String(teamData.ownerUid || "") === userUid ||
          normalizeEmail(teamData.ownerEmail) === normalizedUserEmail;

        if (!ownsManagerRecord) {
          throw new Error("MANAGER_MISMATCH");
        }

        if (inventorySnap.exists()) {
          throw new Error("ALREADY_OWNED");
        }

        const currentCoins = Number(teamData.coins || 0);

        if (!Number.isFinite(currentCoins) || currentCoins < price) {
          throw new Error("NOT_ENOUGH_COINS");
        }

        const nextCoins = currentCoins - price;

        transaction.update(teamRef, {
          coins: nextCoins,
          "Updated Date": serverTimestamp(),
        });

        transaction.set(inventoryRef, {
          ownerUid: userUid,
          ownerEmail: userEmail,
          itemId: item.ID,
          itemName: item.itemName,
          itemType: item.itemType,
          purchaseDate: serverTimestamp(),
          acquiredAt: serverTimestamp(),
          equipped: false,
          source: "shop",
        });

        return nextCoins;
      });

      setUserCoins(remainingCoins);
      setManagerTeam((current) =>
        current ? { ...current, coins: remainingCoins } : current
      );
      setOwnedIds((current) => Array.from(new Set([...current, item.ID])));

      alert("Success!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";

      if (message === "NOT_ENOUGH_COINS") {
        alert("Not enough coins!");
      } else if (message === "ALREADY_OWNED") {
        setOwnedIds((current) => Array.from(new Set([...current, item.ID])));
        alert("You already own this item.");
      } else if (message === "MANAGER_NOT_FOUND" || message === "MANAGER_MISMATCH") {
        alert("Your manager record could not be verified. Ask the admin to check your ownerEmail.");
      } else {
        console.error("Purchase failed:", err);
        alert("Purchase failed. Check your Firestore access and try again.");
      }
    } finally {
      setBuying(null);
    }
  };

  const handleBuyCard = async (card: LimitedCard) => {
    const userEmail = String(user?.email || "").trim();
    const normalizedUserEmail = normalizeEmail(userEmail);
    const userUid = user?.uid;
    const price = Number(card.shopPrice || 0);

    if (!userEmail || !userUid) return;

    if (!managerTeam || userCoins === null || !accountReady) {
      alert(
        "Your manager coins are not available yet. Reload after checking Firestore access."
      );
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      alert("This card has an invalid price. Ask an admin to update it.");
      return;
    }

    if (Number(card.stock || 0) <= 0) {
      alert("This card is sold out.");
      return;
    }

    if (userCoins < price) {
      alert("Not enough coins!");
      return;
    }

    if (
      !confirm(
        `Buy ${card.cardName} for ${price} coins?\n\nYou can buy multiple copies. Field each one from the transfers player market.`
      )
    )
      return;

    setBuyingCard(card.ID);

    try {
      const remainingCoins = await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, "userTeams", managerTeam.id);
        const cardRef = doc(db, "limitedCards", card.ID);
        const [teamSnap, cardSnap] = await Promise.all([
          transaction.get(teamRef),
          transaction.get(cardRef),
        ]);

        if (!teamSnap.exists()) {
          throw new Error("MANAGER_NOT_FOUND");
        }

        const teamData = teamSnap.data();
        const ownsManagerRecord =
          String(teamData.ownerUid || "") === userUid ||
          normalizeEmail(teamData.ownerEmail) === normalizedUserEmail;

        if (!ownsManagerRecord) {
          throw new Error("MANAGER_MISMATCH");
        }

        if (!cardSnap.exists()) {
          throw new Error("CARD_NOT_FOUND");
        }

        const cardData = cardSnap.data();

        if (cardData.isVisible === false) {
          throw new Error("CARD_NOT_AVAILABLE");
        }

        const stock = Number(cardData.stock || 0);

        if (stock <= 0) {
          throw new Error("SOLD_OUT");
        }

        const currentCoins = Number(teamData.coins || 0);

        if (!Number.isFinite(currentCoins) || currentCoins < price) {
          throw new Error("NOT_ENOUGH_COINS");
        }

        const nextCoins = currentCoins - price;

        transaction.update(cardRef, {
          stock: stock - 1,
          "Updated Date": serverTimestamp(),
        });

        transaction.update(teamRef, {
          coins: nextCoins,
          "Updated Date": serverTimestamp(),
        });

        const userCardId = `${userUid}_${card.ID}_${Date.now().toString(
          36
        )}${Math.random().toString(36).slice(2, 6)}`;

        transaction.set(doc(db, "userLimitedCards", userCardId), {
          ownerUid: userUid,
          ownerEmail: userEmail,
          cardId: card.ID,
          status: "owned",
          gameweek: 0,
          purchaseDate: serverTimestamp(),
          acquiredAt: serverTimestamp(),
          source: "shop",
        });

        return nextCoins;
      });

      setUserCoins(remainingCoins);
      setManagerTeam((current) =>
        current ? { ...current, coins: remainingCoins } : current
      );
      setLimitedCards((current) =>
        current.map((c) =>
          c.ID === card.ID
            ? { ...c, stock: Math.max(0, Number(c.stock || 0) - 1) }
            : c
        )
      );
      
      alert("Card purchased! Field him from the transfers player market.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";

      if (message === "NOT_ENOUGH_COINS") {
        alert("Not enough coins!");
      } else if (message === "SOLD_OUT") {
        setLimitedCards((current) =>
          current.map((c) => (c.ID === card.ID ? { ...c, stock: 0 } : c))
        );
        alert("This card just sold out.");
      } else if (
        message === "CARD_NOT_FOUND" ||
        message === "CARD_NOT_AVAILABLE"
      ) {
        alert("This card is no longer available.");
      } else if (
        message === "MANAGER_NOT_FOUND" ||
        message === "MANAGER_MISMATCH"
      ) {
        alert(
          "Your manager record could not be verified. Ask the admin to check your ownerEmail."
        );
      } else {
        console.error("Card purchase failed:", err);
        alert("Purchase failed. Check your Firestore access and try again.");
      }
    } finally {
      setBuyingCard(null);
    }
  };

  const handleOpenCrate = async (crate: Crate) => {
    const userEmail = String(user?.email || "").trim();
    const normalizedUserEmail = normalizeEmail(userEmail);
    const userUid = user?.uid;
    const price = Number(crate.price || 0);

    if (!userEmail || !userUid) return;

    if (!managerTeam || userCoins === null || !accountReady) {
      alert(
        "Your manager coins are not available yet. Reload after checking Firestore access."
      );
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      alert("This crate has an invalid price. Ask an admin to update it.");
      return;
    }

    const contents = (crate.items || []).filter((entry) =>
      String(entry.itemId || "")
    );

    if (contents.length === 0) {
      alert("This crate is empty. Ask the admin to add items to it.");
      return;
    }

    if (userCoins < price) {
      alert("Not enough coins!");
      return;
    }

    const drawn = drawCrateItem(crate.items);

    if (!drawn) {
      alert("This crate is empty. Ask the admin to add items to it.");
      return;
    }

    const shopItem =
      allShopItems.find(
        (item) => String(item.ID) === String(drawn.itemId)
      ) || null;

    setOpeningCrateBusy(true);

    try {
      const outcome = await runTransaction(db, async (transaction) => {
        const teamRef = doc(db, "userTeams", managerTeam.id);
        const inventoryRef = doc(
          db,
          "userInventory",
          `${userUid}_${encodeURIComponent(String(drawn.itemId))}`
        );
        const [teamSnap, inventorySnap] = await Promise.all([
          transaction.get(teamRef),
          transaction.get(inventoryRef),
        ]);

        if (!teamSnap.exists()) {
          throw new Error("MANAGER_NOT_FOUND");
        }

        const teamData = teamSnap.data();
        const ownsManagerRecord =
          String(teamData.ownerUid || "") === userUid ||
          normalizeEmail(teamData.ownerEmail) === normalizedUserEmail;

        if (!ownsManagerRecord) {
          throw new Error("MANAGER_MISMATCH");
        }

        const currentCoins = Number(teamData.coins || 0);

        if (!Number.isFinite(currentCoins) || currentCoins < price) {
          throw new Error("NOT_ENOUGH_COINS");
        }

        const nextCoins = currentCoins - price;

        transaction.update(teamRef, {
          coins: nextCoins,
          "Updated Date": serverTimestamp(),
        });

        let alreadyOwned = false;

        if (inventorySnap.exists()) {
          alreadyOwned = true;
        } else {
          transaction.set(inventoryRef, {
            ownerUid: userUid,
            ownerEmail: userEmail,
            itemId: String(drawn.itemId),
            itemName: String(shopItem?.itemName || drawn.itemName || ""),
            itemType: String(shopItem?.itemType || drawn.itemType || ""),
            purchaseDate: serverTimestamp(),
            acquiredAt: serverTimestamp(),
            equipped: false,
            source: "crate",
            crateId: crate.id,
            crateName: String(crate.name || ""),
          });
        }

        return { nextCoins, alreadyOwned };
      });

      setUserCoins(outcome.nextCoins);
      setManagerTeam((current) =>
        current ? { ...current, coins: outcome.nextCoins } : current
      );

      if (!outcome.alreadyOwned) {
        setOwnedIds((current) =>
          Array.from(new Set([...current, String(drawn.itemId)]))
        );
      }

      setCrateModalCrate(null);
      setOpeningCrate(crate);
      setCrateResult({
        item: {
          ID: String(drawn.itemId),
          itemName: String(
            shopItem?.itemName || drawn.itemName || "Shop item"
          ),
          itemType: String(shopItem?.itemType || drawn.itemType || ""),
          previewImage: String(shopItem?.previewImage || drawn.image || ""),
          rarity: String(drawn.rarity || ""),
          songUrl: shopItem?.songUrl || "",
          songPreviewStart: shopItem?.songPreviewStart ?? null,
        },
        rarity: String(drawn.rarity || ""),
        alreadyOwned: outcome.alreadyOwned,
      });
      setOpeningCrateRun((run) => run + 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";

      if (message === "NOT_ENOUGH_COINS") {
        alert("Not enough coins!");
      } else if (
        message === "MANAGER_NOT_FOUND" ||
        message === "MANAGER_MISMATCH"
      ) {
        alert(
          "Your manager record could not be verified. Ask the admin to check your ownerEmail."
        );
      } else {
        console.error("Crate opening failed:", err);
        alert("Crate opening failed. Check your Firestore access and try again.");
      }
    } finally {
      setOpeningCrateBusy(false);
    }
  };

  const getImageUrl = (url: string) => {
    if (!url) return "";

    if (url.startsWith("wix:image://v1/")) {
      const guid = url.split("/")[3];
      return `https://static.wixstatic.com/media/${guid}~mv2.png`;
    }

    return url;
  };

  if (loading) {
    return (
      <Shell>
        <p style={{ padding: "2rem" }}>Loading Shop...</p>
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
            textAlign: "center",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "24px",
            padding: "2.5rem",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>↻</div>

          <h1
            style={{
              fontSize: "1.8rem",
              fontWeight: 900,
              marginBottom: "0.5rem",
            }}
          >
            REFRESHING SHOP
          </h1>

          <p style={{ color: "var(--text-muted)" }}>
            Estimated Time: 2 minutes.
          </p>
        </div>
      </Shell>
    );
  }

  const sections = Object.entries(itemsBySection).sort(([aTitle], [bTitle]) => {
    const aOrder = Number(sectionOrders[aTitle] ?? 99);
    const bOrder = Number(sectionOrders[bTitle] ?? 99);

    if (aOrder !== bOrder) return aOrder - bOrder;

    return aTitle.localeCompare(bTitle);
  });

  return (
    <Shell>
      <div className="page-container shop-page" style={{ maxWidth: "1120px", margin: "0 auto" }}>
        <section
          className="page-hero shop-hero"
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
              RUNIT Store
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
              Fantasy
              <br />
              <span style={{ color: "var(--blue)" }}>Shop</span>
            </h1>

            <p
              style={{
                maxWidth: "620px",
                color: "var(--text-muted)",
                fontSize: "1rem",
                lineHeight: 1.7,
                marginBottom: "1.25rem",
              }}
            >
              ‎ 
            </p>

            <div
              className="shop-hero-meta"
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  background: "rgba(255,193,7,0.1)",
                  border: "1px solid rgba(255,193,7,0.25)",
                  color: "var(--accent)",
                  padding: "0.5rem 0.8rem",
                  borderRadius: "999px",
                  fontWeight: 900,
                  fontSize: "0.85rem",
                }}
              >
                {userCoins === null
                  ? "Coins unavailable"
                  : `${userCoins.toLocaleString()} Coins`}
              </div>

              <ShopRefreshTimer refreshAt={settings?.shopRefreshAt} />
            </div>
          </div>
        </section>

        {shopError && (
          <div
            role="alert"
            style={{
              marginBottom: "1rem",
              background: "rgba(255,70,70,0.08)",
              border: "1px solid rgba(255,70,70,0.3)",
              borderRadius: "14px",
              padding: "0.9rem 1rem",
              color: "#ffb4b4",
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            {shopError}
          </div>
        )}

        {accountError && (
          <div
            role="status"
            style={{
              marginBottom: "1rem",
              background: "rgba(255,193,7,0.08)",
              border: "1px solid rgba(255,193,7,0.3)",
              borderRadius: "14px",
              padding: "0.9rem 1rem",
              color: "var(--accent)",
              fontWeight: 700,
              lineHeight: 1.5,
            }}
          >
            {accountError}
          </div>
        )}

        {limitedCards.length > 0 && (
          <section style={{ marginBottom: "3rem" }}>
            <div
              className="shop-section-header"
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
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: 900,
                    marginBottom: "0.25rem",
                  }}
                >
                  Section
                </div>

                <h2 style={{ fontSize: "1.35rem", fontWeight: 900, margin: 0 }}>
                  Mastery Cards
                </h2>
              </div>

              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "999px",
                  padding: "0.45rem 0.7rem",
                  fontWeight: 800,
                }}
              >
                {limitedCards.length} card{limitedCards.length === 1 ? "" : "s"}
              </div>
            </div>

            <div
              className="shop-items-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {limitedCards.map((card) => (
                <LimitedCardShopTile
                  key={card.ID}
                  card={card}
                  accountReady={accountReady}
                  userCoins={userCoins}
                  isBuying={buyingCard === card.ID}
                  onBuy={handleBuyCard}
                />
              ))}
            </div>
          </section>
        )}

        {crates.length > 0 && (
          <section style={{ marginBottom: "3rem" }}>
            <div
              className="shop-section-header"
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
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    fontWeight: 900,
                    marginBottom: "0.25rem",
                  }}
                >
                  Section
                </div>

                <h2 style={{ fontSize: "1.35rem", fontWeight: 900, margin: 0 }}>
                  Crates
                </h2>
              </div>

              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                  background: "rgba(255,255,255,0.045)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "999px",
                  padding: "0.45rem 0.7rem",
                  fontWeight: 800,
                }}
              >
                {crates.length} crate{crates.length === 1 ? "" : "s"}
              </div>
            </div>

            <div
              className="shop-items-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "1.25rem",
              }}
            >
              {crates.map((crate) => (
                <CrateTile
                  key={crate.id}
                  crate={crate}
                  accountReady={accountReady}
                  userCoins={userCoins}
                  onOpen={() => setCrateModalCrate(crate)}
                />
              ))}
            </div>
          </section>
        )}

        {sections.length === 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              padding: "2rem",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            No shop items available right now.
          </div>
        ) : (
          sections.map(([sectionTitle, items]) => (
            <section key={sectionTitle} style={{ marginBottom: "3rem" }}>
              <div
                className="shop-section-header"
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
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      fontWeight: 900,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Section
                  </div>

                  <h2
                    style={{
                      fontSize: "1.35rem",
                      fontWeight: 900,
                      margin: 0,
                    }}
                  >
                    {sectionTitle}
                  </h2>
                </div>

                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.8rem",
                    background: "rgba(255,255,255,0.045)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "999px",
                    padding: "0.45rem 0.7rem",
                    fontWeight: 800,
                  }}
                >
                  {items.length} item{items.length === 1 ? "" : "s"}
                </div>
              </div>

              <div
                className="shop-items-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {items.map((item) => {
                  const owned = ownedIds.includes(item.ID);
                  const itemPrice = Number(item.price || 0);
                  const canAfford =
                    accountReady &&
                    userCoins !== null &&
                    Number.isFinite(itemPrice) &&
                    userCoins >= itemPrice;
                  const isBuying = buying === item.ID;

                  return (
                    <div
                      key={item.ID}
                      style={{
                        position: "relative",
                        overflow: "hidden",
                        background:
                          "linear-gradient(145deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015)), var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "20px",
                      }}
                    >
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
                        {item.showNewTag && (
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
                            NEW
                          </span>
                        )}

                        {item.showLeavingTodayTag && (
                          <span
                            style={{
                              background: "#0f0d1b",
                              color: "var(--accent)",
                              border: "1px solid rgba(255,193,7,0.3)",
                              fontSize: "0.62rem",
                              fontWeight: 900,
                              padding: "0.2rem 0.45rem",
                              borderRadius: "999px",
                            }}
                          >
                            LEAVING TODAY
                          </span>
                        )}
                      </div>

                      <div
                        style={{
                          width: "100%",
                          aspectRatio:
                            item.itemType === "banner" ? "16/7" : "1/1",
                          background:
                            "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08), transparent 35%), #111",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        {item.previewImage ? (
                          <img
                            src={getImageUrl(item.previewImage)}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                            alt={item.itemName}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "rgba(255,255,255,0.22)",
                              fontWeight: 900,
                              fontSize: "2rem",
                            }}
                          >
                            {item.itemName?.slice(0, 1) || "?"}
                          </div>
                        )}
                      </div>

                      <div style={{ padding: "1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.75rem",
                            marginBottom: "0.4rem",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: "var(--accent)",
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: "0.7px",
                            }}
                          >
                            {item.itemType}
                          </div>

                          <div
                            style={{
                              fontSize: "0.65rem",
                              color: getRarityColor(item.rarity),
                              fontWeight: 900,
                              textTransform: "uppercase",
                              letterSpacing: "0.7px",
                            }}
                          >
                            {item.rarity || "common"}
                          </div>
                        </div>

                        <div
                          style={{
                            fontWeight: 900,
                            margin: "0.2rem 0 0.75rem",
                            fontSize: "1rem",
                            minHeight: "2.4rem",
                            lineHeight: 1.25,
                          }}
                        >
                          {item.itemName}
                        </div>

                        {item.itemType === "song" &&
                          getYouTubeId(String(item.songUrl || "")) && (
                            <button
                              onClick={() => toggleSongPreview(item)}
                              style={{
                                width: "100%",
                                padding: "0.55rem",
                                marginBottom: "0.5rem",
                                borderRadius: "12px",
                                fontWeight: 900,
                                fontSize: "0.78rem",
                                cursor: "pointer",
                                border:
                                  previewingId === item.ID
                                    ? "1px solid rgba(107,159,255,0.65)"
                                    : "1px solid rgba(255,255,255,0.14)",
                                background:
                                  previewingId === item.ID
                                    ? "rgba(3,71,244,0.2)"
                                    : "rgba(255,255,255,0.06)",
                                color:
                                  previewingId === item.ID
                                    ? "#fff"
                                    : "var(--text)",
                              }}
                            >
                              {previewingId === item.ID ? (
                                previewLoading ? (
                                  "Loading preview..."
                                ) : (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.4rem",
                                    }}
                                  >
                                    <span className="shop-preview-bars">
                                      <span />
                                      <span />
                                      <span />
                                    </span>
                                    Stop · {previewSecondsLeft}s
                                  </span>
                                )
                              ) : (
                                `▶ Preview · ${SONG_PREVIEW_SECONDS}s`
                              )}
                            </button>
                          )}

                        <button
                          onClick={() => handleBuy(item)}
                          disabled={owned || !canAfford || isBuying}
                          title={
                            !accountReady
                              ? "Your manager coins are unavailable. Check Firestore access and reload."
                              : undefined
                          }
                          style={{
                            width: "100%",
                            padding: "0.75rem",
                            borderRadius: "12px",
                            border: "none",
                            fontWeight: 900,
                            cursor:
                              owned || !canAfford || isBuying
                                ? "not-allowed"
                                : "pointer",
                            background: owned
                              ? "var(--border)"
                              : !canAfford
                              ? "rgba(255,255,255,0.08)"
                              : "var(--blue)",
                            color:
                              owned || !canAfford
                                ? "var(--text-muted)"
                                : "#fff",
                          }}
                        >
                          {owned
                            ? "OWNED"
                            : isBuying
                            ? "Buying..."
                            : !accountReady
                            ? "COINS UNAVAILABLE"
                            : `${itemPrice} Coins`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}

        {crateModalCrate && (
          <CrateContentsModal
            crate={crateModalCrate}
            accountReady={accountReady}
            userCoins={userCoins}
            isBusy={openingCrateBusy}
            onOpen={() => handleOpenCrate(crateModalCrate)}
            onClose={() => setCrateModalCrate(null)}
          />
        )}

        {openingCrate && crateResult && (
          <CrateOpeningOverlay
            key={openingCrateRun}
            crate={openingCrate}
            result={crateResult}
            coinsLeft={userCoins}
            canOpenAnother={
              accountReady &&
              userCoins !== null &&
              userCoins >= Number(openingCrate.price || 0)
            }
            isBusy={openingCrateBusy}
            onOpenAnother={() => handleOpenCrate(openingCrate)}
            onClose={() => {
              setOpeningCrate(null);
              setCrateResult(null);
            }}
          />
        )}

                {/* Hidden YouTube player used for song previews. */}
        <div
          id="shop-song-preview-player"
          style={{
            width: "1px",
            height: "1px",
            overflow: "hidden",
            opacity: 0,
            pointerEvents: "none",
          }}
        />

        <style jsx>{`
          .shop-preview-bars {
            display: inline-flex;
            align-items: flex-end;
            gap: 2px;
            height: 10px;
          }

          .shop-preview-bars span {
            width: 2px;
            background: var(--blue);
            animation: shop-preview-wave 1s ease-in-out infinite;
          }

          .shop-preview-bars span:nth-child(2) {
            animation-delay: 0.2s;
          }

          .shop-preview-bars span:nth-child(3) {
            animation-delay: 0.4s;
          }

          @keyframes shop-preview-wave {
            0%,
            100% {
              height: 40%;
            }

            50% {
              height: 100%;
            }
          }
        `}</style>
      </div>
    </Shell>
  );
}

function LimitedCardShopTile({
  card,
  accountReady,
  userCoins,
  isBuying,
  onBuy,
}: {
  card: LimitedCard;
  accountReady: boolean;
  userCoins: number | null;
  isBuying: boolean;
  onBuy: (card: LimitedCard) => void;
}) {
  const rarityColor = getLimitedCardRarityColor(card.rarity, card.accentColor);
  const imageUrl = getLimitedCardImageUrl(card.image);
  const price = Number(card.shopPrice || 0);
  const stock = Number(card.stock || 0);
  const soldOut = stock <= 0;
  const canAfford =
    accountReady &&
    userCoins !== null &&
    Number.isFinite(price) &&
    userCoins >= price;
  const disabled = soldOut || !accountReady || !canAfford || isBuying;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: `linear-gradient(160deg, ${rarityColor}24, rgba(255,255,255,0.015)), var(--surface)`,
        border: `1px solid ${rarityColor}66`,
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
        {card.showNewTag && (
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
            NEW
          </span>
        )}

        {card.showLeavingTodayTag && (
          <span
            style={{
              background: "#0f0d1b",
              color: "var(--accent)",
              border: "1px solid rgba(255,193,7,0.3)",
              fontSize: "0.62rem",
              fontWeight: 900,
              padding: "0.2rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            LEAVING TODAY
          </span>
        )}
      </div>

      <div
        style={{
          width: "100%",
          aspectRatio: "4/3",
          background: `radial-gradient(circle at 30% 20%, ${rarityColor}30, transparent 45%), #111`,
          borderBottom: "1px solid var(--border)",
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
              color: "rgba(255,255,255,0.22)",
              fontWeight: 900,
              fontSize: "2rem",
            }}
          >
            {card.cardName?.slice(0, 1) || "?"}
          </div>
        )}
      </div>

      <div
        style={{
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.4rem",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.6rem",
          }}
        >
          <div
            style={{
              fontSize: "0.62rem",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.7px",
              color: "#8bb5ff",
            }}
          >
            Mastery Card
          </div>

          <div
            style={{
              fontSize: "0.62rem",
              color: rarityColor,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.7px",
            }}
          >
            {card.rarity || "rare"}
          </div>
        </div>

        <div style={{ fontWeight: 900, fontSize: "1rem", lineHeight: 1.2 }}>
          {card.cardName}
        </div>

        <div
          style={{
            color: "var(--accent)",
            fontSize: "0.7rem",
            fontWeight: 800,
            lineHeight: 1.4,
          }}
        >
          {limitedCardPowerupText(card)}
        </div>

        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "0.68rem",
            fontWeight: 700,
          }}
        >
          One-time use
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            flexWrap: "wrap",
            marginTop: "0.15rem",
          }}
        >
          <span
            style={{
              background: "rgba(3,71,244,0.12)",
              border: "1px solid rgba(107,159,255,0.35)",
              color: "#8bb5ff",
              fontSize: "0.62rem",
              fontWeight: 900,
              padding: "0.22rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            Squad cost +{Number(card.transferPrice || 0).toFixed(1)}m
          </span>

          <span
            style={{
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: soldOut ? "var(--red)" : "var(--text-muted)",
              fontSize: "0.62rem",
              fontWeight: 900,
              padding: "0.22rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            {soldOut ? "Sold out" : `${stock} left`}
          </span>
        </div>

        <button
          onClick={() => onBuy(card)}
          disabled={disabled}
          title={
            !accountReady
              ? "Your manager coins are unavailable. Check Firestore access and reload."
              : undefined
          }
          style={{
            marginTop: "auto",
            width: "100%",
            padding: "0.75rem",
            borderRadius: "12px",
            border: "none",
            fontWeight: 900,
            cursor: disabled ? "not-allowed" : "pointer",
            background: soldOut
              ? "var(--border)"
              : !canAfford
              ? "rgba(255,255,255,0.08)"
              : "var(--blue)",
            color: soldOut || !canAfford ? "var(--text-muted)" : "#fff",
          }}
        >
          {soldOut
            ? "SOLD OUT"
            : isBuying
            ? "Buying..."
            : !accountReady
            ? "COINS UNAVAILABLE"
            : !canAfford
            ? "NOT ENOUGH COINS"
            : `Buy · ${price.toLocaleString()} Coins`}
        </button>
      </div>
    </div>
  );
}

function CrateTile({
  crate,
  accountReady,
  userCoins,
  onOpen,
}: {
  crate: Crate;
  accountReady: boolean;
  userCoins: number | null;
  onOpen: () => void;
}) {
  const price = Number(crate.price || 0);
  const itemCount = (crate.items || []).length;
  const imageUrl = getCrateImageUrl(crate.image);
  const summary = crateRaritySummary(crate.items);
  const canOpen =
    accountReady &&
    userCoins !== null &&
    Number.isFinite(price) &&
    userCoins >= price &&
    itemCount > 0;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(160deg, rgba(255,193,7,0.09), rgba(255,255,255,0.02)), var(--surface)",
        border: "1px solid rgba(255,193,7,0.35)",
        borderRadius: "20px",
        display: "flex",
        flexDirection: "column",
      }}
    >
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
        {crate.showNewTag && (
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
            NEW
          </span>
        )}

        {crate.showLeavingTodayTag && (
          <span
            style={{
              background: "#0f0d1b",
              color: "var(--accent)",
              border: "1px solid rgba(255,193,7,0.3)",
              fontSize: "0.62rem",
              fontWeight: 900,
              padding: "0.2rem 0.45rem",
              borderRadius: "999px",
            }}
          >
            LEAVING TODAY
          </span>
        )}
      </div>

      <div
        style={{
          width: "100%",
          aspectRatio: "4/3",
          background:
            "radial-gradient(circle at 30% 20%, rgba(255,193,7,0.14), transparent 45%), #111",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={crate.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          <span style={{ fontSize: "3.4rem", lineHeight: 1 }}>📦</span>
        )}
      </div>

      <div
        style={{
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.45rem",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.6rem",
          }}
        >
          <div
            style={{
              fontSize: "0.62rem",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.7px",
              color: "var(--accent)",
            }}
          >
            Crate
          </div>

          <div
            style={{
              fontSize: "0.62rem",
              color: "var(--text-muted)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.7px",
            }}
          >
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </div>
        </div>

        <div style={{ fontWeight: 900, fontSize: "1rem", lineHeight: 1.2 }}>
          {crate.name}
        </div>

        {crate.description && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.72rem",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {crate.description}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            flexWrap: "wrap",
            marginTop: "0.15rem",
          }}
        >
          {summary.map(({ tier, chance }) => (
            <span
              key={tier.key}
              style={{
                background: "rgba(255,255,255,0.045)",
                border: `1px solid ${tier.color}55`,
                color: tier.color,
                fontSize: "0.6rem",
                fontWeight: 900,
                padding: "0.18rem 0.4rem",
                borderRadius: "999px",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              {tier.label} {(chance * 100).toFixed(0)}%
            </span>
          ))}
        </div>

        <button
          onClick={onOpen}
          disabled={!canOpen}
          title={
            itemCount === 0
              ? "This crate is empty."
              : !accountReady
              ? "Your manager coins are unavailable. Check Firestore access and reload."
              : undefined
          }
          style={{
            marginTop: "auto",
            width: "100%",
            padding: "0.75rem",
            borderRadius: "12px",
            border: "none",
            fontWeight: 900,
            cursor: canOpen ? "pointer" : "not-allowed",
            background: !canOpen
              ? "rgba(255,255,255,0.08)"
              : "var(--accent)",
            color: !canOpen ? "var(--text-muted)" : "#000",
          }}
        >
          {itemCount === 0
            ? "EMPTY CRATE"
            : !accountReady
            ? "COINS UNAVAILABLE"
            : userCoins !== null && userCoins < price
            ? "NOT ENOUGH COINS"
            : `Open · ${price.toLocaleString()} Coins`}
        </button>
      </div>
    </div>
  );
}

function CrateContentsModal({
  crate,
  accountReady,
  userCoins,
  isBusy,
  onOpen,
  onClose,
}: {
  crate: Crate;
  accountReady: boolean;
  userCoins: number | null;
  isBusy: boolean;
  onOpen: () => void;
  onClose: () => void;
}) {
  const price = Number(crate.price || 0);
  const odds = crateOdds(crate.items);
  const summary = crateRaritySummary(crate.items);

  const sorted = [...odds].sort(
    (a, b) =>
      crateRarityRank(b.item.rarity) - crateRarityRank(a.item.rarity)
  );

  const canAfford =
    accountReady && userCoins !== null && userCoins >= price;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        background: "rgba(2,6,23,0.82)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(92vw, 560px)",
          maxHeight: "86vh",
          overflowY: "auto",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "20px",
          padding: "1.25rem",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.85rem",
            marginBottom: "0.85rem",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "14px",
              overflow: "hidden",
              flexShrink: 0,
              border: "1px solid rgba(255,193,7,0.35)",
              background:
                "radial-gradient(circle at 30% 20%, rgba(255,193,7,0.16), transparent 55%), #111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.8rem",
            }}
          >
            {getCrateImageUrl(crate.image) ? (
              <img
                src={getCrateImageUrl(crate.image)}
                alt={crate.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              "📦"
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: "1.15rem" }}>
              {crate.name}
            </div>

            <div
              style={{
                color: "var(--accent)",
                fontSize: "0.8rem",
                fontWeight: 900,
                marginTop: "0.15rem",
              }}
            >
              {price.toLocaleString()} Coins per open
            </div>
          </div>
        </div>

        {crate.description && (
          <div
            style={{
              color: "var(--text-muted)",
              fontSize: "0.82rem",
              lineHeight: 1.6,
              marginBottom: "0.85rem",
            }}
          >
            {crate.description}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "0.4rem",
            flexWrap: "wrap",
            marginBottom: "0.85rem",
          }}
        >
          {summary.map(({ tier, count, chance }) => (
            <span
              key={tier.key}
              style={{
                background: "rgba(255,255,255,0.045)",
                border: `1px solid ${tier.color}55`,
                color: tier.color,
                fontSize: "0.62rem",
                fontWeight: 900,
                padding: "0.22rem 0.45rem",
                borderRadius: "999px",
                textTransform: "uppercase",
                letterSpacing: "0.4px",
              }}
            >
              {tier.label}: {count} · {(chance * 100).toFixed(1)}%
            </span>
          ))}
        </div>

        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--text-muted)",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.8px",
            marginBottom: "0.5rem",
          }}
        >
          Possible items — rarest first
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          {sorted.map(({ item, tier, chance }) => (
            <div
              key={item.itemId}
              style={{
                display: "grid",
                gridTemplateColumns: "42px 1fr auto",
                gap: "0.65rem",
                alignItems: "center",
                padding: "0.5rem 0.6rem",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                background: "rgba(255,255,255,0.025)",
              }}
            >
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  background: "#161616",
                  border: `1px solid ${tier.color}55`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  color: "rgba(255,255,255,0.25)",
                  fontSize: "0.9rem",
                }}
              >
                {getCrateImageUrl(item.image) ? (
                  <img
                    src={getCrateImageUrl(item.image)}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  (item.itemName || "?").slice(0, 1)
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
                  {item.itemName || "Shop item"}
                </div>

                <div
                  style={{
                    fontSize: "0.65rem",
                    color: tier.color,
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {tier.label} · {item.itemType}
                </div>
              </div>

              <div
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 900,
                  color: "var(--accent)",
                }}
              >
                {(chance * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            flexWrap: "wrap",
            marginTop: "1.1rem",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontWeight: 700,
            }}
          >
            Balance:{" "}
            {userCoins === null ? "—" : userCoins.toLocaleString()} Coins
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.65rem 0.9rem",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onOpen}
              disabled={!canAfford || isBusy}
              style={{
                padding: "0.65rem 1.1rem",
                borderRadius: "12px",
                border: "none",
                background: !canAfford || isBusy
                  ? "rgba(255,255,255,0.08)"
                  : "var(--accent)",
                color: !canAfford || isBusy ? "var(--text-muted)" : "#000",
                fontWeight: 900,
                cursor: !canAfford || isBusy ? "not-allowed" : "pointer",
              }}
            >
              {isBusy
                ? "Opening..."
                : canAfford
                ? `Open · ${price.toLocaleString()} Coins`
                : "Not enough coins"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
