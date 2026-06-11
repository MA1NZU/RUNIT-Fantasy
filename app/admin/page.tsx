"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  setDoc,
  deleteDoc,
  writeBatch,
  increment,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import Shell from "@/app/shell";

const ADMIN_EMAIL = "yahyaayman2006@gmail.com";

type Player = {
  id: string;
  name: string;
  game: string;
  price: number;
  points: number;
  totalPoints: number;
  desc: string;
  ID?: string;
};

type UserTeam = {
  id: string;
  manager: string;
  totalPoints: number;
  gameweekPoints: number;
  coins: number;
  Bank: number;
  freeTransfers: number;
  ownerEmail: string;
  namez: string;
  lastGwCoinsEarned?: number;
  lastGwCoinsGameweek?: number;
};

type Settings = {
  id: string;
  currentGameweek: number;
  deadline: string;
  shopDeadline?: string;
  shopRefreshAt?: any;
  lockTeamLeaderboard?: boolean;
  lockTransfers?: boolean;
};

type ShopItem = {
  id: string;
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

type Tab = "players" | "stats" | "managers" | "shop" | "settings" | "locks";

const getRankPrizeCoins = (rank: number) => {
  if (rank === 1) return 4000;
  if (rank === 2) return 2500;
  if (rank === 3) return 1500;
  if (rank === 4) return 1000;
  if (rank >= 5 && rank <= 10) return 500;
  if (rank === 11) return 300;
  if (rank === 12) return 300;
  if (rank === 13) return 200;

  return 0;
};

const defaultNewItem: Partial<ShopItem> = {
  itemType: "avatar",
  rarity: "common",
  price: 0,
  section: "General",
  isVisible: true,
  songUrl: "",
  arriveDate: "",
  leaveDate: "",
  showNewTag: false,
  showLeavingTodayTag: false,
};

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
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    return date;
  }

  return null;
}

function dateInputValue(value: any) {
  if (!value) return "";

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

    const date = toDateSafe(value);
    if (!date) return "";

    return date.toISOString().slice(0, 10);
  }

  const date = toDateSafe(value);
  if (!date) return "";

  return date.toISOString().slice(0, 10);
}

function datetimeInputValue(value: any) {
  if (!value) return "";

  if (typeof value === "string") {
    if (value.includes("T")) return value.slice(0, 16);

    const date = toDateSafe(value);
    if (!date) return "";

    return date.toISOString().slice(0, 16);
  }

  const date = toDateSafe(value);
  if (!date) return "";

  return date.toISOString().slice(0, 16);
}

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("players");
  const [players, setPlayers] = useState<Player[]>([]);
  const [managers, setManagers] = useState<UserTeam[]>([]);
  const [shopItems, setShopItems] = useState<ShopItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [calcStats, setCalcStats] = useState<Record<string, string>>({});
  const [newItem, setNewItem] = useState<Partial<ShopItem>>({
    ...defaultNewItem,
  });

  const [shopSearch, setShopSearch] = useState("");
  const [shopTypeFilter, setShopTypeFilter] = useState<
    "all" | ShopItem["itemType"]
  >("all");
  const [shopSortBy, setShopSortBy] = useState<
    "type" | "name" | "price" | "section" | "rarity"
  >("type");

  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) router.replace("/");
  }, [user, router]);

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return;

    const load = async () => {
      setLoading(true);

      try {
        const [pSnap, mSnap, sSnap, shopSnap] = await Promise.all([
          getDocs(collection(db, "players")),
          getDocs(collection(db, "userTeams")),
          getDocs(collection(db, "settings")),
          getDocs(collection(db, "shopItems")),
        ]);

        let activeGW = 7;

        if (!sSnap.empty) {
          const settingsData = {
            id: sSnap.docs[0].id,
            ...sSnap.docs[0].data(),
          } as Settings;

          setSettings(settingsData);
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

        setPlayers(
          pSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Player))
            .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        );

        setManagers(
          mSnap.docs
            .map((d) => {
              const manager = { id: d.id, ...d.data() } as UserTeam;
              const emailKey = String(manager.ownerEmail || "").toLowerCase();

              return {
                ...manager,
                totalPoints: Number(manager.totalPoints || 0),
                gameweekPoints: currentGwPointsByEmail[emailKey] ?? 0,
                coins: Number(manager.coins || 0),
                Bank: Number(manager.Bank || 0),
                freeTransfers: Number(manager.freeTransfers || 0),
                lastGwCoinsEarned: Number(manager.lastGwCoinsEarned || 0),
                lastGwCoinsGameweek: Number(manager.lastGwCoinsGameweek || 0),
              };
            })
            .sort(
              (a, b) => Number(b.totalPoints || 0) - Number(a.totalPoints || 0)
            )
        );

        setShopItems(
          shopSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopItem))
        );
      } catch (err) {
        console.error("Load Error:", err);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const markSaved = (key: string) => {
    setSaved(key);
    setTimeout(() => setSaved(null), 2000);
  };

  const calculatePoints = (p: Player) => {
    let total = 0;
    const s = (key: string) => Number(calcStats[key] || 0);

    total += s("matchWin") * 2;
    total += s("matchLose") * -2;
    total += s("mvp") * 8;
    total += s("svp") * 5;
    total += s("bonus") * 1;

    if (p.game === "Valorant") {
      total += Math.floor(s("kills") / 2);
      total += Math.floor(s("assists") / 2);
      total += Math.floor(s("deaths") / 3) * -1;
      total += s("firstBlood");
      total += s("firstDeath") * -1;
      total += s("tripleKill") * 3;
      total += s("quadraKill") * 5;
      total += s("ace") * 8;
      total += s("clutch") * 2;
    } else {
      total += Math.floor(s("kills") / 3);
      total += Math.floor(s("assists") / 4);
      total += s("deaths") * -2;
      total += Math.floor(s("lastKills") / 2);
      total += s("headKill") * 3;
      total += Math.floor(s("healing") / 5050);
      total += Math.floor(s("damage") / 5050);
      total += Math.floor(s("blocked") / 5050);
      total += s("soloKills");
    }

    return total;
  };

  const syncCurrentGameweekScores = async () => {
    if (!settings?.currentGameweek) return;

    const currentGameweek = Number(settings.currentGameweek);
    const now = new Date().toISOString();

    try {
      const [playersSnap, statsSnap, gwTeamsSnap, userTeamsSnap] =
        await Promise.all([
          getDocs(collection(db, "players")),
          getDocs(
            query(
              collection(db, "playerMatchStats"),
              where("gameweek", "==", currentGameweek)
            )
          ),
          getDocs(
            query(
              collection(db, "gameweekTeams"),
              where("gameweek", "==", currentGameweek)
            )
          ),
          getDocs(collection(db, "userTeams")),
        ]);

      const aliasToCanonical = new Map<string, string>();
      const playerAliasGroups: string[][] = [];

      playersSnap.docs.forEach((playerDoc) => {
        const data = playerDoc.data();

        const aliases = [playerDoc.id, data.ID, data.name, data.Title]
          .map((v) => String(v || ""))
          .filter(Boolean);

        if (aliases.length === 0) return;

        const canonical = playerDoc.id;

        aliases.forEach((alias) => {
          aliasToCanonical.set(alias, canonical);
        });

        playerAliasGroups.push(aliases);
      });

      const pointsByAlias = new Map<string, number>();

      statsSnap.docs.forEach((statDoc) => {
        const data = statDoc.data();
        const points = Number(data.gwPoints || 0);

        const directAliases = [data.player, data.Title, data.name, statDoc.id]
          .map((v) => String(v || ""))
          .filter(Boolean);

        const directCanonicalSet = new Set(
          directAliases.map((alias) => aliasToCanonical.get(alias) || alias)
        );

        const aliasesForThisStat = new Set<string>();

        directAliases.forEach((alias) => aliasesForThisStat.add(alias));

        playerAliasGroups.forEach((group) => {
          const groupMatchesStat = group.some((alias) => {
            const canonical = aliasToCanonical.get(alias) || alias;

            return (
              directAliases.includes(alias) || directCanonicalSet.has(canonical)
            );
          });

          if (groupMatchesStat) {
            group.forEach((alias) => aliasesForThisStat.add(alias));
          }
        });

        aliasesForThisStat.forEach((alias) => {
          pointsByAlias.set(alias, points);

          const canonical = aliasToCanonical.get(alias);

          if (canonical) {
            pointsByAlias.set(canonical, points);
          }
        });
      });

      const getPlayerPoints = (playerId: any) => {
        const key = String(playerId || "");

        if (!key) return 0;

        if (pointsByAlias.has(key)) {
          return Number(pointsByAlias.get(key) || 0);
        }

        const canonical = aliasToCanonical.get(key);

        if (canonical && pointsByAlias.has(canonical)) {
          return Number(pointsByAlias.get(canonical) || 0);
        }

        return 0;
      };

      const samePlayer = (a: any, b: any) => {
        const aKey = String(a || "");
        const bKey = String(b || "");

        if (!aKey || !bKey) return false;
        if (aKey === bKey) return true;

        const aCanonical = aliasToCanonical.get(aKey) || aKey;
        const bCanonical = aliasToCanonical.get(bKey) || bKey;

        return aCanonical === bCanonical;
      };

      const userTeamsByEmail: Record<string, any[]> = {};

      userTeamsSnap.docs.forEach((userTeamDoc) => {
        const data = userTeamDoc.data();
        const email = String(data.ownerEmail || "").toLowerCase();

        if (!email) return;

        if (!userTeamsByEmail[email]) {
          userTeamsByEmail[email] = [];
        }

        userTeamsByEmail[email].push(userTeamDoc);
      });

      const batch = writeBatch(db);
      let operationCount = 0;

      const managerUpdatesByEmail: Record<
        string,
        {
          newGwPoints: number;
          difference: number;
        }
      > = {};

      gwTeamsSnap.docs.forEach((teamDoc) => {
        const team = teamDoc.data();

        const mainPlayerIds = [
          team.player1,
          team.player2,
          team.player3,
          team.player4,
        ].filter(Boolean);

        const newGwPoints = mainPlayerIds.reduce((total, playerId) => {
          const playerPoints = getPlayerPoints(playerId);

          if (samePlayer(playerId, team.captain)) {
            return total + playerPoints * 2;
          }

          return total + playerPoints;
        }, 0);

        const oldGwPoints = Number(team.gwPoints || 0);
        const difference = newGwPoints - oldGwPoints;

        if (difference === 0) return;

        batch.update(teamDoc.ref, {
          gwPoints: newGwPoints,
          "Updated Date": now,
        });

        operationCount += 1;

        const ownerEmail = String(team.ownerEmail || "").toLowerCase();

        if (!ownerEmail) return;

        const matchingUserTeams = userTeamsByEmail[ownerEmail] || [];

        matchingUserTeams.forEach((userTeamDoc) => {
          batch.update(userTeamDoc.ref, {
            gameweekPoints: newGwPoints,
            totalPoints: increment(difference),
            "Updated Date": now,
          });

          operationCount += 1;
        });

        managerUpdatesByEmail[ownerEmail] = {
          newGwPoints,
          difference:
            (managerUpdatesByEmail[ownerEmail]?.difference || 0) + difference,
        };
      });

      if (operationCount === 0) {
        console.log("No GW score changes found.");
        return;
      }

      await batch.commit();

      setManagers((prev) =>
        prev
          .map((manager) => {
            const email = String(manager.ownerEmail || "").toLowerCase();
            const update = managerUpdatesByEmail[email];

            if (!update) return manager;

            return {
              ...manager,
              gameweekPoints: update.newGwPoints,
              totalPoints:
                Number(manager.totalPoints || 0) + Number(update.difference),
            };
          })
          .sort(
            (a, b) => Number(b.totalPoints || 0) - Number(a.totalPoints || 0)
          )
      );

      console.log(`Synced ${operationCount} update(s) for GW${currentGameweek}.`);
    } catch (err) {
      console.error("Failed to sync current gameweek scores:", err);
      alert(
        "Saved, but failed to auto-update manager totals. Check console for details."
      );
    }
  };

  const handleSaveStats = async () => {
    const p = players.find((x) => x.id === selectedPlayerId);

    if (!p || !settings) return;

    setSaving("matchstats");

    const pts = calculatePoints(p);

    try {
      const statId = `${p.id}_gw${settings.currentGameweek}`;

      await setDoc(
        doc(db, "playerMatchStats", statId),
        {
          ...calcStats,
          player: p.ID || p.id,
          Title: p.name,
          game: p.game,
          gameweek: settings.currentGameweek,
          gwPoints: pts,
          UpdatedDate: new Date().toISOString(),
        },
        { merge: true }
      );

      await updateDoc(doc(db, "players", p.id), { points: pts });

      await syncCurrentGameweekScores();

      markSaved("matchstats");
    } catch (err) {
      console.error(err);
    }

    setSaving(null);
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    setSaving("settings");

    try {
      await updateDoc(doc(db, "settings", settings.id), {
        currentGameweek: Number(settings.currentGameweek),
        deadline: settings.deadline,
        shopRefreshAt: settings.shopRefreshAt || "",
        lockTeamLeaderboard: !!settings.lockTeamLeaderboard,
        lockTransfers: !!settings.lockTransfers,
      });

      markSaved("settings");
    } catch (err) {
      console.error(err);
    }

    setSaving(null);
  };

  const handleSaveManager = async (m: UserTeam) => {
    setSaving(m.id);

    try {
      await updateDoc(doc(db, "userTeams", m.id), {
        totalPoints: Number(m.totalPoints || 0),
        gameweekPoints: Number(m.gameweekPoints || 0),
        coins: Number(m.coins || 0),
        Bank: Number(m.Bank || 0),
        freeTransfers: Number(m.freeTransfers || 0),
        "Updated Date": new Date().toISOString(),
      });

      markSaved(m.id);
    } catch (err) {
      console.error(err);
    }

    setSaving(null);
  };

  const handleGrantRankingCoins = async () => {
    const currentGameweek = settings?.currentGameweek;

    if (!currentGameweek) {
      alert("Current gameweek not found.");
      return;
    }

    const rankedManagers = [...managers].sort(
      (a, b) => Number(b.totalPoints || 0) - Number(a.totalPoints || 0)
    );

    const alreadyGrantedCount = rankedManagers.filter(
      (m) => Number(m.lastGwCoinsGameweek || 0) === currentGameweek
    ).length;

    const confirmMessage =
      alreadyGrantedCount > 0
        ? `Coins were already granted to ${alreadyGrantedCount} manager(s) for GW${currentGameweek}.\n\nGrant coins again anyway?`
        : `Grant ranking coins to all managers for GW${currentGameweek}?\n\n1st: 4,000¢\n2nd: 2,500¢\n3rd: 1,500¢\n4th: 1,000¢\n5th-10th: 500¢\n11th: 300¢\n12th: 300¢\n13th: 200¢`;

    if (!confirm(confirmMessage)) return;

    setSaving("grantRankingCoins");

    try {
      const batch = writeBatch(db);
      const now = new Date().toISOString();

      const updatedManagers = rankedManagers.map((manager, index) => {
        const rank = index + 1;
        const prizeCoins = getRankPrizeCoins(rank);
        const currentCoins = Number(manager.coins || 0);
        const newCoins = currentCoins + prizeCoins;

        batch.update(doc(db, "userTeams", manager.id), {
          coins: newCoins,
          lastGwCoinsEarned: prizeCoins,
          lastGwCoinsGameweek: currentGameweek,
          "Updated Date": now,
        });

        return {
          ...manager,
          coins: newCoins,
          lastGwCoinsEarned: prizeCoins,
          lastGwCoinsGameweek: currentGameweek,
        };
      });

      await batch.commit();

      setManagers(
        updatedManagers.sort(
          (a, b) => Number(b.totalPoints || 0) - Number(a.totalPoints || 0)
        )
      );

      markSaved("grantRankingCoins");
      alert(`Coins granted successfully for GW${currentGameweek}.`);
    } catch (err) {
      console.error("Failed to grant ranking coins:", err);
      alert("Failed to grant coins. Check console for details.");
    }

    setSaving(null);
  };

  const handleAddShopItem = async () => {
    if (!newItem.itemName) return alert("Item name required");

    setSaving("newShopItem");

    try {
      const id = Math.random().toString(36).substr(2, 9);

      const itemData = {
        ...newItem,
        ID: id,
        songUrl: newItem.songUrl || "",
        arriveDate: newItem.arriveDate || "",
        leaveDate: newItem.leaveDate || "",
        showNewTag: !!newItem.showNewTag,
        showLeavingTodayTag: !!newItem.showLeavingTodayTag,
        "Created Date": new Date().toISOString(),
      };

      await setDoc(doc(db, "shopItems", id), itemData);

      setShopItems([...shopItems, { id, ...itemData } as ShopItem]);
      setNewItem({ ...defaultNewItem });

      markSaved("newShopItem");
    } catch (err) {
      console.error(err);
    }

    setSaving(null);
  };

  const handleUpdateShopItem = async (item: ShopItem) => {
    setSaving(item.id);

    try {
      await updateDoc(doc(db, "shopItems", item.id), {
        ...item,
        songUrl: item.songUrl || "",
        arriveDate: item.arriveDate || "",
        leaveDate: item.leaveDate || "",
        showNewTag: !!item.showNewTag,
        showLeavingTodayTag: !!item.showLeavingTodayTag,
        "Updated Date": new Date().toISOString(),
      });

      markSaved(item.id);
    } catch (err) {
      console.error(err);
    }

    setSaving(null);
  };

  const updateManagerField = (id: string, field: keyof UserTeam, value: any) => {
    setManagers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  const updateShopItemField = (
    id: string,
    field: keyof ShopItem,
    value: any
  ) => {
    setShopItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  if (!user || user.email !== ADMIN_EMAIL) return null;

  if (loading) {
    return (
      <Shell>
        <p style={{ padding: "2rem" }}>Loading Admin Panel...</p>
      </Shell>
    );
  }

  const activePlayer = players.find((p) => p.id === selectedPlayerId);

  const filteredShopItems = [...shopItems]
    .filter((item) => {
      const search = shopSearch.toLowerCase().trim();

      if (!search) return true;

      return (
        String(item.itemName || "").toLowerCase().includes(search) ||
        String(item.itemType || "").toLowerCase().includes(search) ||
        String(item.section || "").toLowerCase().includes(search) ||
        String(item.rarity || "").toLowerCase().includes(search) ||
        String(item.ID || "").toLowerCase().includes(search)
      );
    })
    .filter((item) => {
      if (shopTypeFilter === "all") return true;
      return item.itemType === shopTypeFilter;
    })
    .sort((a, b) => {
      if (shopSortBy === "type") {
        const typeCompare = String(a.itemType || "").localeCompare(
          String(b.itemType || "")
        );

        if (typeCompare !== 0) return typeCompare;

        return String(a.itemName || "").localeCompare(String(b.itemName || ""));
      }

      if (shopSortBy === "name") {
        return String(a.itemName || "").localeCompare(String(b.itemName || ""));
      }

      if (shopSortBy === "price") {
        return Number(a.price || 0) - Number(b.price || 0);
      }

      if (shopSortBy === "section") {
        const sectionCompare = String(a.section || "").localeCompare(
          String(b.section || "")
        );

        if (sectionCompare !== 0) return sectionCompare;

        return String(a.itemName || "").localeCompare(String(b.itemName || ""));
      }

      if (shopSortBy === "rarity") {
        const rarityCompare = String(a.rarity || "").localeCompare(
          String(b.rarity || "")
        );

        if (rarityCompare !== 0) return rarityCompare;

        return String(a.itemName || "").localeCompare(String(b.itemName || ""));
      }

      return 0;
    });

  return (
    <Shell>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>
          Admin Panel
        </h1>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          {["players", "stats", "managers", "shop", "settings", "locks"].map(
            (t) => (
              <button
                key={t}
                onClick={() => setTab(t as Tab)}
                style={{
                  padding: "0.6rem 1.2rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: tab === t ? "var(--blue)" : "var(--surface)",
                  color: "#fff",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {t.toUpperCase()}
              </button>
            )
          )}
        </div>

        {tab === "locks" && settings && (
          <div style={{ maxWidth: "500px" }}>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                marginBottom: "1.5rem",
              }}
            >
              Page Access Locks
            </h2>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>My Team & Leaderboard</div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Restrict access to these pages
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={settings.lockTeamLeaderboard || false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lockTeamLeaderboard: e.target.checked,
                    })
                  }
                  style={{ width: "24px", height: "24px", cursor: "pointer" }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>Transfers Page</div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Lock squad building and transfers
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={settings.lockTransfers || false}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lockTransfers: e.target.checked,
                    })
                  }
                  style={{ width: "24px", height: "24px", cursor: "pointer" }}
                />
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={saving === "settings"}
                style={{
                  background:
                    saved === "settings" ? "var(--green)" : "var(--blue)",
                  color: "#fff",
                  border: "none",
                  padding: "0.8rem",
                  borderRadius: "8px",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginTop: "1rem",
                }}
              >
                {saving === "settings"
                  ? "Saving..."
                  : saved === "settings"
                  ? "✓ Saved"
                  : "Save Lock Settings"}
              </button>
            </div>
          </div>
        )}

        {tab === "settings" && settings && (
          <div style={{ maxWidth: "900px" }}>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                marginBottom: "1.5rem",
              }}
            >
              Gameweek Settings
            </h2>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "12px",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.5rem",
                  }}
                >
                  Current Gameweek
                </div>

                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        currentGameweek: settings.currentGameweek - 1,
                      })
                    }
                    style={smallButtonStyle}
                  >
                    -
                  </button>

                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      width: "60px",
                      textAlign: "center",
                    }}
                  >
                    {settings.currentGameweek}
                  </div>

                  <button
                    onClick={() =>
                      setSettings({
                        ...settings,
                        currentGameweek: settings.currentGameweek + 1,
                      })
                    }
                    style={smallButtonStyle}
                  >
                    +
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={labelStyle}>Transfer Deadline</div>
                  <input
                    type="datetime-local"
                    value={datetimeInputValue(settings.deadline)}
                    onChange={(e) =>
                      setSettings({ ...settings, deadline: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={labelStyle}>Next Shop Refresh</div>
                  <input
                    type="datetime-local"
                    value={datetimeInputValue(settings.shopRefreshAt)}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        shopRefreshAt: e.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={saving === "settings"}
                style={{
                  background:
                    saved === "settings" ? "var(--green)" : "var(--blue)",
                  color: "#fff",
                  border: "none",
                  padding: "0.8rem",
                  borderRadius: "8px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {saving === "settings"
                  ? "Saving..."
                  : saved === "settings"
                  ? "✓ Saved"
                  : "Save Settings"}
              </button>
            </div>
          </div>
        )}

        {tab === "shop" && (
          <div>
            <h2
              style={{
                fontSize: "1.2rem",
                fontWeight: 700,
                marginBottom: "1rem",
              }}
            >
              Shop Manager
            </h2>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "1rem",
                marginBottom: "1rem",
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr 1fr auto",
                gap: "0.85rem",
                alignItems: "end",
              }}
            >
              <div>
                <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                  Search Items
                </div>
                <input
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  placeholder="Search by name, type, section, rarity..."
                  style={inputStyle}
                />
              </div>

              <div>
                <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                  Filter Type
                </div>
                <select
                  value={shopTypeFilter}
                  onChange={(e) =>
                    setShopTypeFilter(
                      e.target.value as "all" | ShopItem["itemType"]
                    )
                  }
                  style={inputStyle}
                >
                  <option value="all">All Types</option>
                  <option value="avatar">Avatars</option>
                  <option value="banner">Banners</option>
                  <option value="song">Songs</option>
                  <option value="title">Titles</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                  Sort By
                </div>
                <select
                  value={shopSortBy}
                  onChange={(e) =>
                    setShopSortBy(
                      e.target.value as
                        | "type"
                        | "name"
                        | "price"
                        | "section"
                        | "rarity"
                    )
                  }
                  style={inputStyle}
                >
                  <option value="type">Type</option>
                  <option value="name">Name</option>
                  <option value="price">Price</option>
                  <option value="section">Section</option>
                  <option value="rarity">Rarity</option>
                </select>
              </div>

              <button
                onClick={() => {
                  setShopSearch("");
                  setShopTypeFilter("all");
                  setShopSortBy("type");
                }}
                style={{
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  borderRadius: "8px",
                  padding: "0.6rem 0.9rem",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Reset
              </button>

              <div
                style={{
                  gridColumn: "1 / -1",
                  color: "var(--text-muted)",
                  fontSize: "0.8rem",
                }}
              >
                Showing{" "}
                <strong style={{ color: "#fff" }}>
                  {filteredShopItems.length}
                </strong>{" "}
                of{" "}
                <strong style={{ color: "#fff" }}>{shopItems.length}</strong>{" "}
                items
              </div>
            </div>

            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "1.25rem",
                marginBottom: "2rem",
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
                  <div style={{ fontWeight: 800, fontSize: "1rem" }}>
                    Add Shop Item
                  </div>
                  <div
                    style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}
                  >
                    Create a new item with dates, tags, visibility, and media
                    URLs.
                  </div>
                </div>

                <button
                  onClick={handleAddShopItem}
                  disabled={saving === "newShopItem"}
                  style={{
                    background:
                      saved === "newShopItem"
                        ? "var(--green)"
                        : "var(--blue)",
                    color: "#fff",
                    border: "none",
                    padding: "0.7rem 1rem",
                    borderRadius: "10px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {saving === "newShopItem"
                    ? "Adding..."
                    : saved === "newShopItem"
                    ? "Added"
                    : "Add Item"}
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.85rem",
                  marginBottom: "0.85rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                    Name
                  </div>
                  <input
                    value={newItem.itemName || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, itemName: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                    Type
                  </div>
                  <select
                    value={newItem.itemType}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        itemType: e.target.value as ShopItem["itemType"],
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="avatar">Avatar</option>
                    <option value="banner">Banner</option>
                    <option value="song">Song</option>
                    <option value="title">Title</option>
                  </select>
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                    Price
                  </div>
                  <input
                    type="number"
                    value={newItem.price || 0}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        price: Number(e.target.value),
                      })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                    Section
                  </div>
                  <input
                    value={newItem.section || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, section: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                    Rarity
                  </div>
                  <input
                    value={newItem.rarity || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, rarity: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                    Arrive Date
                  </div>
                  <input
                    type="date"
                    value={dateInputValue(newItem.arriveDate)}
                    onChange={(e) =>
                      setNewItem({ ...newItem, arriveDate: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                    Leave Date
                  </div>
                  <input
                    type="date"
                    value={dateInputValue(newItem.leaveDate)}
                    onChange={(e) =>
                      setNewItem({ ...newItem, leaveDate: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: "0.85rem",
                  marginBottom: "0.85rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                    Image URL
                  </div>
                  <input
                    value={newItem.previewImage || ""}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        previewImage: e.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", marginBottom: "0.3rem" }}>
                    Song URL
                  </div>
                  <input
                    value={newItem.songUrl || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, songUrl: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <label style={toggleLabelStyle}>
                  <input
                    type="checkbox"
                    checked={!!newItem.showNewTag}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        showNewTag: e.target.checked,
                      })
                    }
                  />
                  NEW Tag
                </label>

                <label style={toggleLabelStyle}>
                  <input
                    type="checkbox"
                    checked={!!newItem.showLeavingTodayTag}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        showLeavingTodayTag: e.target.checked,
                      })
                    }
                  />
                  LEAVING TODAY Tag
                </label>

                <label style={toggleLabelStyle}>
                  <input
                    type="checkbox"
                    checked={!!newItem.isVisible}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        isVisible: e.target.checked,
                      })
                    }
                  />
                  Visible
                </label>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
                gap: "1rem",
              }}
            >
              {filteredShopItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "14px",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
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
                          fontWeight: 800,
                          fontSize: "1rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.itemName || "Untitled Item"}
                      </div>

                      <div
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.75rem",
                          marginTop: "0.2rem",
                        }}
                      >
                        {item.itemType} · {item.section || "General"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "0.4rem",
                        flexShrink: 0,
                      }}
                    >
                      {item.showNewTag && (
                        <span
                          style={{
                            background: "var(--blue)",
                            color: "#fff",
                            fontSize: "0.62rem",
                            fontWeight: 900,
                            padding: "0.22rem 0.45rem",
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
                            padding: "0.22rem 0.45rem",
                            borderRadius: "999px",
                          }}
                        >
                          LEAVING
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1fr 0.7fr",
                      gap: "0.65rem",
                    }}
                  >
                    <div>
                      <div style={smallLabelStyle}>Name</div>
                      <input
                        value={item.itemName || ""}
                        onChange={(e) =>
                          updateShopItemField(
                            item.id,
                            "itemName",
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <div style={smallLabelStyle}>Type</div>
                      <select
                        value={item.itemType}
                        onChange={(e) =>
                          updateShopItemField(
                            item.id,
                            "itemType",
                            e.target.value as ShopItem["itemType"]
                          )
                        }
                        style={inputStyle}
                      >
                        <option value="avatar">Avatar</option>
                        <option value="banner">Banner</option>
                        <option value="song">Song</option>
                        <option value="title">Title</option>
                      </select>
                    </div>

                    <div>
                      <div style={smallLabelStyle}>Price</div>
                      <input
                        type="number"
                        value={item.price || 0}
                        onChange={(e) =>
                          updateShopItemField(
                            item.id,
                            "price",
                            Number(e.target.value)
                          )
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr 1fr",
                      gap: "0.65rem",
                    }}
                  >
                    <div>
                      <div style={smallLabelStyle}>Section</div>
                      <input
                        value={item.section || ""}
                        onChange={(e) =>
                          updateShopItemField(
                            item.id,
                            "section",
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <div style={smallLabelStyle}>Rarity</div>
                      <input
                        value={item.rarity || ""}
                        onChange={(e) =>
                          updateShopItemField(
                            item.id,
                            "rarity",
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <div style={smallLabelStyle}>Arrive</div>
                      <input
                        type="date"
                        value={dateInputValue(item.arriveDate)}
                        onChange={(e) =>
                          updateShopItemField(
                            item.id,
                            "arriveDate",
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <div style={smallLabelStyle}>Leave</div>
                      <input
                        type="date"
                        value={dateInputValue(item.leaveDate)}
                        onChange={(e) =>
                          updateShopItemField(
                            item.id,
                            "leaveDate",
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.65rem",
                    }}
                  >
                    <div>
                      <div style={smallLabelStyle}>Image URL</div>
                      <input
                        value={item.previewImage || ""}
                        onChange={(e) =>
                          updateShopItemField(
                            item.id,
                            "previewImage",
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <div style={smallLabelStyle}>Song URL</div>
                      <input
                        value={item.songUrl || ""}
                        onChange={(e) =>
                          updateShopItemField(
                            item.id,
                            "songUrl",
                            e.target.value
                          )
                        }
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "0.85rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "0.85rem",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <label style={toggleLabelStyle}>
                        <input
                          type="checkbox"
                          checked={!!item.showNewTag}
                          onChange={(e) =>
                            updateShopItemField(
                              item.id,
                              "showNewTag",
                              e.target.checked
                            )
                          }
                        />
                        NEW
                      </label>

                      <label style={toggleLabelStyle}>
                        <input
                          type="checkbox"
                          checked={!!item.showLeavingTodayTag}
                          onChange={(e) =>
                            updateShopItemField(
                              item.id,
                              "showLeavingTodayTag",
                              e.target.checked
                            )
                          }
                        />
                        LEAVING
                      </label>

                      <label style={toggleLabelStyle}>
                        <input
                          type="checkbox"
                          checked={!!item.isVisible}
                          onChange={(e) =>
                            updateShopItemField(
                              item.id,
                              "isVisible",
                              e.target.checked
                            )
                          }
                        />
                        Visible
                      </label>
                    </div>

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        onClick={() => handleUpdateShopItem(item)}
                        disabled={saving === item.id}
                        style={{
                          background:
                            saved === item.id
                              ? "var(--green)"
                              : "var(--accent)",
                          color: "#000",
                          border: "none",
                          borderRadius: "8px",
                          padding: "0.5rem 0.9rem",
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {saving === item.id
                          ? "Saving..."
                          : saved === item.id
                          ? "Saved"
                          : "Save"}
                      </button>

                      <button
                        onClick={() => {
                          if (confirm("Delete?")) {
                            deleteDoc(doc(db, "shopItems", item.id)).then(() =>
                              setShopItems(
                                shopItems.filter((i) => i.id !== item.id)
                              )
                            );
                          }
                        }}
                        style={{
                          background: "transparent",
                          border: "1px solid var(--border)",
                          color: "var(--red)",
                          borderRadius: "8px",
                          padding: "0.5rem 0.75rem",
                          cursor: "pointer",
                          fontWeight: 800,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "stats" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "300px 1fr",
              gap: "2rem",
            }}
          >
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1rem",
                  borderBottom: "1px solid var(--border)",
                  fontWeight: 700,
                }}
              >
                Select Player
              </div>

              <div style={{ maxHeight: "600px", overflowY: "auto" }}>
                {players.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlayerId(p.id)}
                    style={{
                      padding: "0.75rem 1rem",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border)",
                      background:
                        selectedPlayerId === p.id
                          ? "rgba(3,71,244,0.15)"
                          : "transparent",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                      {p.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {p.game}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: "var(--surface)",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                padding: "1.5rem",
              }}
            >
              {activePlayer ? (
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                        {activePlayer.name}
                      </h2>
                      <p style={{ color: "var(--accent)", fontSize: "0.8rem" }}>
                        GW{settings?.currentGameweek} Rules
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        CALCULATED GW POINTS
                      </div>
                      <div
                        style={{
                          fontSize: "2rem",
                          fontWeight: 800,
                          color: "var(--accent)",
                        }}
                      >
                        {calculatePoints(activePlayer)}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "1rem",
                    }}
                  >
                    {["matchWin", "matchLose", "mvp", "svp", "bonus"].map(
                      (f) => (
                        <StatInput
                          key={f}
                          label={f.replace(/([A-Z])/g, " $1").trim()}
                          id={f}
                          val={calcStats}
                          set={setCalcStats}
                        />
                      )
                    )}

                    <div
                      style={{
                        gridColumn: "1/-1",
                        borderTop: "1px solid var(--border)",
                        margin: "0.5rem 0",
                      }}
                    />

                    {activePlayer.game === "Valorant"
                      ? [
                          "kills",
                          "assists",
                          "deaths",
                          "firstBlood",
                          "firstDeath",
                          "tripleKill",
                          "quadraKill",
                          "ace",
                          "clutch",
                        ].map((f) => (
                          <StatInput
                            key={f}
                            label={f.replace(/([A-Z])/g, " $1").trim()}
                            id={f}
                            val={calcStats}
                            set={setCalcStats}
                          />
                        ))
                      : [
                          "kills",
                          "assists",
                          "deaths",
                          "lastKills",
                          "headKill",
                          "healing",
                          "damage",
                          "blocked",
                          "soloKills",
                        ].map((f) => (
                          <StatInput
                            key={f}
                            label={f.replace(/([A-Z])/g, " $1").trim()}
                            id={f}
                            val={calcStats}
                            set={setCalcStats}
                          />
                        ))}
                  </div>

                  <button
                    onClick={handleSaveStats}
                    disabled={saving === "matchstats"}
                    style={{
                      width: "100%",
                      marginTop: "2rem",
                      background:
                        saved === "matchstats"
                          ? "var(--green)"
                          : "var(--blue)",
                      color: "#fff",
                      border: "none",
                      padding: "1rem",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {saving === "matchstats"
                      ? "Saving..."
                      : saved === "matchstats"
                      ? "✓ Saved Success!"
                      : "Save Match Stats"}
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    height: "400px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                  }}
                >
                  Select a player to start.
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "managers" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              Showing current GW points from{" "}
              <strong style={{ color: "#fff" }}>gameweekTeams.gwPoints</strong>
              {settings?.currentGameweek ? (
                <>
                  {" "}
                  for{" "}
                  <strong style={{ color: "#fff" }}>
                    GW{settings.currentGameweek}
                  </strong>
                </>
              ) : null}
              .
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
                background:
                  "linear-gradient(135deg, rgba(3,71,244,0.12), rgba(255,193,7,0.08)), var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "1rem",
              }}
            >
              <div>
                <div style={{ fontWeight: 800, marginBottom: "0.25rem" }}>
                  Grant Ranking Coins
                </div>

                <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                  Rewards managers based on their current totalPoints rank:
                  1st 4,000¢ · 2nd 2,500¢ · 3rd 1,500¢ · 4th 1,000¢ ·
                  5th-10th 500¢ · 11th 300¢ · 12th 300¢ · 13th 200¢
                </div>
              </div>

              <button
                onClick={handleGrantRankingCoins}
                disabled={saving === "grantRankingCoins"}
                style={{
                  background:
                    saved === "grantRankingCoins"
                      ? "var(--green)"
                      : "var(--blue)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  fontWeight: 900,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {saving === "grantRankingCoins"
                  ? "Granting..."
                  : saved === "grantRankingCoins"
                  ? "Granted"
                  : "Grant Coins"}
              </button>
            </div>

            {managers.map((m) => (
              <div
                key={m.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    marginBottom: "1rem",
                    fontSize: "1.1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <span>{m.manager || "Unknown Manager"}</span>

                    {m.lastGwCoinsEarned !== undefined &&
                      Number(m.lastGwCoinsEarned || 0) > 0 && (
                        <span
                          style={{
                            marginLeft: "0.5rem",
                            fontSize: "0.75rem",
                            color: "var(--accent)",
                            fontWeight: 700,
                          }}
                        >
                          Last Coins: {m.lastGwCoinsEarned}¢
                          {m.lastGwCoinsGameweek
                            ? ` · GW${m.lastGwCoinsGameweek}`
                            : ""}
                        </span>
                      )}
                  </div>

                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      fontWeight: 500,
                    }}
                  >
                    {m.ownerEmail}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(5, minmax(100px, 1fr)) 100px",
                    gap: "0.75rem",
                    alignItems: "end",
                    overflowX: "auto",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Total Points</div>
                    <input
                      type="number"
                      value={m.totalPoints ?? 0}
                      onChange={(e) =>
                        updateManagerField(
                          m.id,
                          "totalPoints",
                          Number(e.target.value)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>
                      GW Points
                      {settings?.currentGameweek
                        ? ` - GW${settings.currentGameweek}`
                        : ""}
                    </div>
                    <input
                      type="number"
                      value={m.gameweekPoints ?? 0}
                      onChange={(e) =>
                        updateManagerField(
                          m.id,
                          "gameweekPoints",
                          Number(e.target.value)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Coins</div>
                    <input
                      type="number"
                      value={m.coins ?? 0}
                      onChange={(e) =>
                        updateManagerField(
                          m.id,
                          "coins",
                          Number(e.target.value)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Bank</div>
                    <input
                      type="number"
                      step="0.1"
                      value={m.Bank ?? 0}
                      onChange={(e) =>
                        updateManagerField(
                          m.id,
                          "Bank",
                          Number(e.target.value)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <div style={{ fontSize: "0.7rem" }}>Free Trans</div>
                    <input
                      type="number"
                      value={m.freeTransfers ?? 0}
                      onChange={(e) =>
                        updateManagerField(
                          m.id,
                          "freeTransfers",
                          Number(e.target.value)
                        )
                      }
                      style={inputStyle}
                    />
                  </div>

                  <button
                    onClick={() => handleSaveManager(m)}
                    disabled={saving === m.id}
                    style={{
                      background:
                        saved === m.id ? "var(--green)" : "var(--accent)",
                      color: "#000",
                      border: "none",
                      borderRadius: "6px",
                      padding: "0.6rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    {saving === m.id
                      ? "Saving..."
                      : saved === m.id
                      ? "Saved"
                      : "Save"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "players" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {players.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  display: "grid",
                  gridTemplateColumns: "1.5fr 0.7fr 2fr auto",
                  gap: "0.75rem",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {p.game}
                  </div>
                </div>

                <input
                  type="number"
                  step="0.1"
                  value={p.price}
                  onChange={(e) =>
                    setPlayers((prev) =>
                      prev.map((x) =>
                        x.id === p.id
                          ? { ...x, price: Number(e.target.value) }
                          : x
                      )
                    )
                  }
                  style={inputStyle}
                />

                <input
                  type="text"
                  value={p.desc}
                  onChange={(e) =>
                    setPlayers((prev) =>
                      prev.map((x) =>
                        x.id === p.id ? { ...x, desc: e.target.value } : x
                      )
                    )
                  }
                  style={inputStyle}
                />

                <button
                  onClick={async () => {
                    setSaving(p.id);

                    try {
                      await updateDoc(doc(db, "players", p.id), {
                        price: p.price,
                        desc: p.desc,
                      });

                      await syncCurrentGameweekScores();

                      markSaved(p.id);
                    } catch (err) {
                      console.error(err);
                    }

                    setSaving(null);
                  }}
                  disabled={saving === p.id}
                  style={{
                    background:
                      saved === p.id ? "var(--green)" : "var(--accent)",
                    color: "#000",
                    border: "none",
                    borderRadius: "6px",
                    padding: "0.6rem 1.2rem",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {saving === p.id
                    ? "Saving..."
                    : saved === p.id
                    ? "Saved"
                    : "Save"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Shell>
  );
}

const inputStyle = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "#fff",
  padding: "0.5rem",
  borderRadius: "6px",
  fontSize: "0.85rem",
};

const labelStyle = {
  fontSize: "0.8rem",
  color: "var(--text-muted)",
  marginBottom: "0.4rem",
};

const smallLabelStyle = {
  fontSize: "0.68rem",
  marginBottom: "0.25rem",
};

const toggleLabelStyle = {
  display: "flex",
  alignItems: "center",
  gap: "0.4rem",
  fontSize: "0.75rem",
  color: "var(--text-muted)",
};

const smallButtonStyle = {
  background: "var(--bg)",
  border: "1px solid var(--border)",
  color: "#fff",
  width: "40px",
  height: "40px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "1.2rem",
};

function StatInput({
  label,
  id,
  val,
  set,
}: {
  label: string;
  id: string;
  val: any;
  set: any;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--text-muted)",
          marginBottom: "0.3rem",
        }}
      >
        {label}
      </div>

      <input
        type="number"
        value={val[id] || ""}
        onChange={(e) => set({ ...val, [id]: e.target.value })}
        style={{
          width: "100%",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          color: "#fff",
          padding: "0.5rem",
          borderRadius: "6px",
        }}
      />
    </div>
  );
}
