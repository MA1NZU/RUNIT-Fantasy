"use client";

import { useEffect, useState } from "react";

import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
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
};

type Settings = {
  id: string;
  currentGameweek: number;
  deadline: string;
  shopDeadline: string;
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
};

type Tab = "players" | "stats" | "managers" | "shop" | "settings" | "locks";

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

  // Stats Calculator State
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [calcStats, setCalcStats] = useState<Record<string, string>>({});

  // New Shop Item State
  const [newItem, setNewItem] = useState<Partial<ShopItem>>({
    itemType: "avatar",
    rarity: "common",
    price: 0,
    section: "General",
    isVisible: true,
    songUrl: "",
  });

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

        setPlayers(
          pSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as Player))
            .sort((a, b) => a.name.localeCompare(b.name))
        );

        setManagers(
          mSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as UserTeam))
            .sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0))
        );

        setShopItems(
          shopSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ShopItem))
        );

        if (!sSnap.empty) {
          setSettings({
            id: sSnap.docs[0].id,
            ...sSnap.docs[0].data(),
          } as Settings);
        }
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
        shopDeadline: settings.shopDeadline,
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
      });

      markSaved(m.id);
    } catch (err) {
      console.error(err);
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
        "Created Date": new Date().toISOString(),
      };

      await setDoc(doc(db, "shopItems", id), itemData);

      setShopItems([...shopItems, { id, ...itemData } as ShopItem]);

      setNewItem({
        itemType: "avatar",
        rarity: "common",
        price: 0,
        section: "General",
        isVisible: true,
        songUrl: "",
      });

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

  return (
    <Shell>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1
          style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}
        >
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
                  <div style={{ fontWeight: 600 }}>
                    My Team & Leaderboard
                  </div>
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
          <div style={{ maxWidth: "600px" }}>
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
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "#fff",
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                    }}
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
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      color: "#fff",
                      width: "40px",
                      height: "40px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "1.2rem",
                    }}
                  >
                    +
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Transfer Deadline
                  </div>
                  <input
                    type="datetime-local"
                    value={settings.deadline}
                    onChange={(e) =>
                      setSettings({ ...settings, deadline: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Shop Deadline
                  </div>
                  <input
                    type="datetime-local"
                    value={settings.shopDeadline}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        shopDeadline: e.target.value,
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
                Save Settings
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
                borderRadius: "12px",
                padding: "1.5rem",
                marginBottom: "2rem",
                overflowX: "auto",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "1.5fr 1fr 0.7fr 2fr 2fr 1fr 1fr 0.5fr auto",
                  gap: "0.75rem",
                  alignItems: "end",
                  minWidth: "1050px",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.7rem" }}>Name</div>
                  <input
                    value={newItem.itemName || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, itemName: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem" }}>Type</div>
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
                  <div style={{ fontSize: "0.7rem" }}>Price</div>
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
                  <div style={{ fontSize: "0.7rem" }}>Image URL</div>
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
                  <div style={{ fontSize: "0.7rem" }}>Song URL</div>
                  <input
                    value={newItem.songUrl || ""}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        songUrl: e.target.value,
                      })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem" }}>Section</div>
                  <input
                    value={newItem.section || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, section: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem" }}>Rarity</div>
                  <input
                    value={newItem.rarity || ""}
                    onChange={(e) =>
                      setNewItem({ ...newItem, rarity: e.target.value })
                    }
                    style={inputStyle}
                  />
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "0.7rem" }}>Vis</div>
                  <input
                    type="checkbox"
                    checked={newItem.isVisible}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        isVisible: e.target.checked,
                      })
                    }
                  />
                </div>

                <button
                  onClick={handleAddShopItem}
                  disabled={saving === "newShopItem"}
                  style={{
                    background: "var(--blue)",
                    color: "#fff",
                    border: "none",
                    padding: "0.6rem 1rem",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {saving === "newShopItem" ? "Adding..." : "Add"}
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                overflowX: "auto",
              }}
            >
              {shopItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "0.75rem 1rem",
                    display: "grid",
                    gridTemplateColumns:
                      "1.5fr 1fr 0.7fr 2fr 2fr 1fr 1fr 0.5fr auto auto",
                    gap: "0.75rem",
                    alignItems: "center",
                    minWidth: "1100px",
                  }}
                >
                  <input
                    value={item.itemName || ""}
                    placeholder="Name"
                    onChange={(e) =>
                      updateShopItemField(item.id, "itemName", e.target.value)
                    }
                    style={inputStyle}
                  />

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

                  <input
                    type="number"
                    value={item.price || 0}
                    placeholder="Price"
                    onChange={(e) =>
                      updateShopItemField(
                        item.id,
                        "price",
                        Number(e.target.value)
                      )
                    }
                    style={inputStyle}
                  />

                  <input
                    value={item.previewImage || ""}
                    placeholder="Image URL"
                    onChange={(e) =>
                      updateShopItemField(
                        item.id,
                        "previewImage",
                        e.target.value
                      )
                    }
                    style={inputStyle}
                  />

                  <input
                    value={item.songUrl || ""}
                    placeholder="Song URL"
                    onChange={(e) =>
                      updateShopItemField(item.id, "songUrl", e.target.value)
                    }
                    style={inputStyle}
                  />

                  <input
                    value={item.section || ""}
                    placeholder="Section"
                    onChange={(e) =>
                      updateShopItemField(item.id, "section", e.target.value)
                    }
                    style={inputStyle}
                  />

                  <input
                    value={item.rarity || ""}
                    placeholder="Rarity"
                    onChange={(e) =>
                      updateShopItemField(item.id, "rarity", e.target.value)
                    }
                    style={inputStyle}
                  />

                  <input
                    type="checkbox"
                    checked={item.isVisible}
                    onChange={(e) =>
                      updateShopItemField(
                        item.id,
                        "isVisible",
                        e.target.checked
                      )
                    }
                  />

                  <button
                    onClick={() => handleUpdateShopItem(item)}
                    disabled={saving === item.id}
                    style={{
                      background:
                        saved === item.id ? "var(--green)" : "var(--accent)",
                      color: "#000",
                      border: "none",
                      borderRadius: "4px",
                      padding: "0.4rem 0.8rem",
                      fontWeight: 700,
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
                      borderRadius: "4px",
                      padding: "0.4rem",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
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
                  }}
                >
                  {m.manager || "Unknown Manager"}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr) 100px",
                    gap: "0.75rem",
                    alignItems: "end",
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
                    <div style={{ fontSize: "0.7rem" }}>GW Points</div>
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
                    {saving === m.id ? "Saving..." : "Save"}
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
                    await updateDoc(doc(db, "players", p.id), {
                      price: p.price,
                      desc: p.desc,
                    });
                    setSaving(null);
                    markSaved(p.id);
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
                  {saving === p.id ? "Saving..." : "Save"}
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
