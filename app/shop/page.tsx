"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type ShopItem = {
  ID: string;
  itemName: string;
  itemType: "avatar" | "banner" | "song" | "title";
  price: number;
  previewImage: string;
  songUrl?: string;
  rarity: string;
  section: string;
  isVisible: boolean;

  arriveDate?: any;
  leaveDate?: any;
  showNewTag?: boolean;
  showLeavingTodayTag?: boolean;
};

type Settings = {
  currentGameweek?: number;
  deadline?: any;
  shopDeadline?: any;
  shopRefreshAt?: any;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function getTodayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(
    now.getDate()
  )}`;
}

function toDateKey(value: any): string {
  if (!value) return "";

  if (typeof value.toDate === "function") {
    const date = value.toDate();

    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
      date.getDate()
    )}`;
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    const date = new Date(value.seconds * 1000);

    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
      date.getDate()
    )}`;
  }

  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(
      value.getDate()
    )}`;
  }

  if (typeof value === "string") {
    if (!value) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
      date.getDate()
    )}`;
  }

  return "";
}

function toDateSafe(value: any): Date | null {
  if (!value) return null;

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }

  if (value instanceof Date) {
    return value;
  }

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
      return "var(--accent)";
    case "icon":
      return "#22d3ee";
    default:
      return "var(--text-muted)";
  }
};

export default function ShopPage() {
  const { user } = useAuth();

  const [itemsBySection, setItemsBySection] = useState<
    Record<string, ShopItem[]>
  >({});
  const [settings, setSettings] = useState<Settings | null>(null);
  const [userCoins, setUserCoins] = useState(0);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    const userEmail = user?.email;

    if (!userEmail) return;

    const loadShop = async () => {
      setLoading(true);

      try {
        const [itemSnap, settingsSnap, teamSnap, invSnap] = await Promise.all([
          getDocs(collection(db, "shopItems")),
          getDocs(collection(db, "settings")),
          getDocs(
            query(
              collection(db, "userTeams"),
              where("ownerEmail", "==", userEmail)
            )
          ),
          getDocs(
            query(
              collection(db, "userInventory"),
              where("ownerEmail", "==", userEmail)
            )
          ),
        ]);

        if (!settingsSnap.empty) {
          setSettings(settingsSnap.docs[0].data() as Settings);
        }

        const allItems = itemSnap.docs.map(
          (d) => ({ ...d.data() } as ShopItem)
        );

        const availableItems = allItems.filter(isItemAvailable);

        const grouped = availableItems.reduce((acc, item) => {
          const sec = item.section || "General";

          if (!acc[sec]) acc[sec] = [];

          acc[sec].push(item);

          return acc;
        }, {} as Record<string, ShopItem[]>);

        Object.keys(grouped).forEach((section) => {
          grouped[section].sort((a, b) =>
            (a.itemName || "").localeCompare(b.itemName || "")
          );
        });

        setItemsBySection(grouped);

        if (!teamSnap.empty) {
          setUserCoins(Number(teamSnap.docs[0].data().coins || 0));
        }

        setOwnedIds(
          invSnap.docs
            .map((d) => String(d.data().itemId || ""))
            .filter(Boolean)
        );
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    };

    loadShop();
  }, [user]);

  const isItemAvailable = (item: ShopItem) => {
    if (item.isVisible === false) return false;

    const today = getTodayKey();

    const arriveKey = toDateKey(item.arriveDate);
    const leaveKey = toDateKey(item.leaveDate);

    if (arriveKey && today < arriveKey) {
      return false;
    }

    if (leaveKey && today > leaveKey) {
      return false;
    }

    return true;
  };

  const handleBuy = async (item: ShopItem) => {
    const userEmail = user?.email;

    if (!userEmail) return;

    if (ownedIds.includes(item.ID)) return;

    if (userCoins < item.price) {
      alert("Not enough coins!");
      return;
    }

    if (!confirm(`Buy ${item.itemName}?`)) return;

    setBuying(item.ID);

    try {
      const teamSnap = await getDocs(
        query(collection(db, "userTeams"), where("ownerEmail", "==", userEmail))
      );

      if (teamSnap.empty) {
        alert("Manager team not found.");
        setBuying(null);
        return;
      }

      await addDoc(collection(db, "userInventory"), {
        ownerEmail: userEmail,
        itemId: item.ID,
        itemName: item.itemName,
        itemType: item.itemType,
        purchaseDate: new Date().toISOString(),
        equipped: false,
        source: "shop",
      });

      await updateDoc(doc(db, "userTeams", teamSnap.docs[0].id), {
        coins: userCoins - item.price,
        "Updated Date": new Date().toISOString(),
      });

      setUserCoins((prev) => prev - item.price);
      setOwnedIds((prev) => [...prev, item.ID]);

      alert("Success!");
    } catch (err) {
      console.error(err);
      alert("Purchase failed. Please try again.");
    }

    setBuying(null);
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

  const sections = Object.entries(itemsBySection);

  return (
    <Shell>
      <div style={{ maxWidth: "1120px", margin: "0 auto" }}>
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
              Unlock cosmetics, profile upgrades, banners, songs, and limited
              items before they leave the store.
            </p>

            <div
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
                {Number(userCoins || 0).toLocaleString()} Coins
              </div>

              <ShopRefreshTimer refreshAt={settings?.shopRefreshAt} />
            </div>
          </div>
        </section>

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
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {items.map((item) => {
                  const owned = ownedIds.includes(item.ID);
                  const canAfford = userCoins >= item.price;
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

                        <button
                          onClick={() => handleBuy(item)}
                          disabled={owned || !canAfford || isBuying}
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
                            : `${item.price} Coins`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </Shell>
  );
}
