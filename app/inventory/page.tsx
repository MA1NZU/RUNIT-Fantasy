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
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";
import Link from "next/link";

type ShopItem = {
  ID: string;
  itemName: string;
  itemType: string;
  previewImage: string;
};

type InventoryItem = ShopItem & {
  inventoryId: string;
  acquiredAtMs: number;
};

type InventorySort =
  | "recent"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "type"
  | "equipped";

function getAcquiredAtMs(value: unknown): number {
  if (!value) return 0;

  if (value instanceof Date) return value.getTime();

  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  if (typeof value === "object") {
    const timestamp = value as {
      toDate?: () => Date;
      seconds?: number;
    };

    if (typeof timestamp.toDate === "function") {
      return timestamp.toDate().getTime();
    }

    if (typeof timestamp.seconds === "number") {
      return timestamp.seconds * 1000;
    }
  }

  return 0;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [ownedItems, setOwnedItems] = useState<InventoryItem[]>([]);
  const [equipped, setEquipped] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<InventorySort>("recent");

  useEffect(() => {
    const userEmail = user?.email;
    if (!userEmail) return;

    const loadInv = async () => {
      setLoading(true);

      try {
        // Get currently equipped items from userTeams.
        const teamSnap = await getDocs(
          query(collection(db, "userTeams"), where("ownerEmail", "==", userEmail))
        );

        if (!teamSnap.empty) {
          const data = teamSnap.docs[0].data();
          setEquipped({
            avatar: data.equippedAvatar || "",
            banner: data.equippedBanner || "",
            song: data.equippedSong || "",
            title: data.equippedTitle || "",
          });
        }

        // Load shop definitions so inventory records can display their item data.
        const shopSnap = await getDocs(collection(db, "shopItems"));
        const shopMap: Record<string, ShopItem> = {};

        shopSnap.docs.forEach((shopDoc) => {
          const data = shopDoc.data() as ShopItem;
          const item = { ...data, ID: data.ID || shopDoc.id };

          shopMap[shopDoc.id] = item;
          shopMap[item.ID] = item;
        });

        // Load the user's inventory, preserving the purchase/acquisition time for sorting.
        const inventorySnap = await getDocs(
          query(collection(db, "userInventory"), where("ownerEmail", "==", userEmail))
        );

        const items = inventorySnap.docs.reduce<InventoryItem[]>(
          (list, inventoryDoc) => {
            const data = inventoryDoc.data();
            const itemId = String(
              data.itemId || data.itemID || data.item || data.ID || ""
            );
            const item = shopMap[itemId];

            if (!item) return list;

            list.push({
              ...item,
              inventoryId: inventoryDoc.id,
              acquiredAtMs: getAcquiredAtMs(
                data.acquiredAt || data.purchaseDate || data["Purchase Date"]
              ),
            });

            return list;
          },
          []
        );

        setOwnedItems(items);
      } catch (err) {
        console.error("Inventory load error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInv();
  }, [user]);

  const handleEquip = async (item: ShopItem) => {
    const userEmail = user?.email;
    if (!userEmail) return;

    try {
      const teamSnap = await getDocs(
        query(collection(db, "userTeams"), where("ownerEmail", "==", userEmail))
      );

      if (teamSnap.empty) return;

      const teamId = teamSnap.docs[0].id;
      const type = item.itemType.toLowerCase();
      const field = `equipped${type.charAt(0).toUpperCase() + type.slice(1)}`;

      await updateDoc(doc(db, "userTeams", teamId), { [field]: item.ID });
      setEquipped((previous) => ({ ...previous, [type]: item.ID }));
    } catch (err) {
      console.error("Equip error:", err);
    }
  };

  const getImageUrl = (url: string) => {
    if (!url) return "https://via.placeholder.com/100";

    if (url.startsWith("wix:image://v1/")) {
      const guid = url.split("/")[3];
      return `https://static.wixstatic.com/media/${guid}~mv2.png`;
    }

    return url;
  };

  const searchTerm = search.trim().toLowerCase();

  const visibleItems = [...ownedItems]
    .filter((item) => {
      if (!searchTerm) return true;

      return (
        item.itemName.toLowerCase().includes(searchTerm) ||
        item.itemType.toLowerCase().includes(searchTerm)
      );
    })
    .sort((a, b) => {
      const compareName = String(a.itemName || "").localeCompare(
        String(b.itemName || "")
      );

      if (sortBy === "recent") {
        return b.acquiredAtMs - a.acquiredAtMs || compareName;
      }

      if (sortBy === "oldest") {
        return a.acquiredAtMs - b.acquiredAtMs || compareName;
      }

      if (sortBy === "name-desc") return -compareName;

      if (sortBy === "type") {
        const compareType = String(a.itemType || "").localeCompare(
          String(b.itemType || "")
        );

        return compareType || compareName;
      }

      if (sortBy === "equipped") {
        const aEquipped = equipped[a.itemType.toLowerCase()] === a.ID;
        const bEquipped = equipped[b.itemType.toLowerCase()] === b.ID;

        return Number(bEquipped) - Number(aEquipped) || compareName;
      }

      return compareName;
    });

  if (loading) {
    return (
      <Shell>
        <p style={{ padding: "2rem" }}>Loading Inventory...</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div
        className="page-container inventory-page"
        style={{ maxWidth: "1000px", margin: "0 auto" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "1rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Inventory</h1>
            <p style={{ color: "var(--text-muted)", marginTop: "0.35rem" }}>
              Browse, search, sort, and equip your cosmetics.
            </p>
          </div>

          {ownedItems.length > 0 && (
            <span
              style={{
                color: "var(--text-muted)",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
              aria-live="polite"
            >
              {visibleItems.length} of {ownedItems.length} item
              {ownedItems.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {ownedItems.length === 0 ? (
          <div
            className="inventory-empty-state"
            style={{
              background: "var(--surface)",
              padding: "3rem",
              borderRadius: "20px",
              textAlign: "center",
              border: "1px dashed var(--border)",
            }}
          >
            <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
              You haven&apos;t purchased any items yet.
            </p>
            <Link
              href="/shop"
              style={{
                color: "var(--blue)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Go to Shop →
            </Link>
          </div>
        ) : (
          <>
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.75rem",
                marginBottom: "1.25rem",
                padding: "0.85rem",
                border: "1px solid var(--border)",
                borderRadius: "16px",
                background: "var(--surface)",
              }}
            >
              <label style={{ display: "grid", gap: "0.35rem" }}>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Search inventory
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search item name or type..."
                  aria-label="Search inventory"
                  style={{
                    width: "100%",
                    minHeight: "42px",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "0.65rem 0.75rem",
                    background: "rgba(255,255,255,0.035)",
                    color: "var(--text)",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "0.35rem" }}>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Sort by
                </span>
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as InventorySort)
                  }
                  aria-label="Sort inventory"
                  style={{
                    width: "100%",
                    minHeight: "42px",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    padding: "0.65rem 0.75rem",
                    background: "rgba(255,255,255,0.035)",
                    color: "var(--text)",
                  }}
                >
                  <option value="recent">Recently purchased</option>
                  <option value="oldest">Oldest purchased</option>
                  <option value="name-asc">Name: A–Z</option>
                  <option value="name-desc">Name: Z–A</option>
                  <option value="type">Item type</option>
                  <option value="equipped">Equipped first</option>
                </select>
              </label>
            </section>

            <div
              className="inventory-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {visibleItems.length === 0 ? (
                <div
                  className="inventory-empty-state"
                  style={{
                    background: "var(--surface)",
                    padding: "3rem",
                    borderRadius: "20px",
                    textAlign: "center",
                    gridColumn: "1/-1",
                    border: "1px dashed var(--border)",
                  }}
                >
                  <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
                    No inventory items match “{search.trim()}”.
                  </p>
                  <button
                    onClick={() => setSearch("")}
                    style={{
                      border: "none",
                      borderRadius: "8px",
                      padding: "0.6rem 0.85rem",
                      background: "var(--blue)",
                      color: "#fff",
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    Clear search
                  </button>
                </div>
              ) : (
                visibleItems.map((item) => {
                  const type = item.itemType.toLowerCase();
                  const isEquipped = equipped[type] === item.ID;
                  const image = getImageUrl(item.previewImage);
                  const displayType =
                    type.charAt(0).toUpperCase() + type.slice(1);

                  return (
                    <div
                      className="inventory-item-card"
                      key={item.inventoryId}
                      style={{
                        background: "var(--surface)",
                        border: `1px solid ${
                          isEquipped ? "var(--blue)" : "var(--border)"
                        }`,
                        borderRadius: "12px",
                        padding: "1rem",
                        textAlign: "center",
                      }}
                    >
                      <img
                        src={image}
                        alt={item.itemName}
                        style={{
                          width: "80px",
                          height: "80px",
                          borderRadius: "12px",
                          objectFit: "cover",
                          marginBottom: "1rem",
                        }}
                      />
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          marginBottom: "0.2rem",
                        }}
                      >
                        {item.itemName}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          marginBottom: "1.25rem",
                        }}
                      >
                        {displayType}
                      </div>
                      <button
                        onClick={() => handleEquip(item)}
                        disabled={isEquipped}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          borderRadius: "6px",
                          border: "none",
                          cursor: isEquipped ? "default" : "pointer",
                          background: isEquipped ? "var(--green)" : "var(--blue)",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {isEquipped ? "EQUIPPED" : "EQUIP"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
