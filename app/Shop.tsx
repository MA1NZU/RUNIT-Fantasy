"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, addDoc, query, where } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type ShopItem = {
  ID: string;
  itemName: string;
  itemType: "avatar" | "banner" | "song" | "title";
  price: number;
  previewImage: string;
  rarity: string;
};

export default function ShopPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [userCoins, setUserCoins] = useState(0);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    const loadShop = async () => {
      setLoading(true);
      try {
        // 1. Fetch Items
        const itemSnap = await getDocs(collection(db, "shopItems"));
        const itemList = itemSnap.docs.map(d => ({ ...d.data() } as ShopItem));
        setItems(itemList);

        // 2. Fetch User Coins
        const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", user.email)));
        if (!teamSnap.empty) {
          setUserCoins(teamSnap.docs[0].data().coins || 0);
        }

        // 3. Fetch Owned Items (Inventory)
        const invSnap = await getDocs(query(collection(db, "userInventory"), where("ownerEmail", "==", user.email)));
        setOwnedIds(invSnap.docs.map(d => d.data().itemId));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    loadShop();
  }, [user]);

  const handleBuy = async (item: ShopItem) => {
    if (userCoins < item.price) return alert("Not enough coins!");
    if (!confirm(`Buy ${item.itemName} for ${item.price} coins?`)) return;

    setBuying(item.ID);
    try {
      // 1. Add to userInventory collection
      await addDoc(collection(db, "userInventory"), {
        ownerEmail: user!.email,
        itemId: item.ID,
        purchaseDate: new Date().toISOString(),
        equipped: false
      });

      // 2. Deduct Coins from userTeams
      const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", user.email)));
      const teamDoc = teamSnap.docs[0];
      await updateDoc(doc(db, "userTeams", teamDoc.id), {
        coins: userCoins - item.price
      });

      setUserCoins(prev => prev - item.price);
      setOwnedIds(prev => [...prev, item.ID]);
      alert("Purchase successful!");
    } catch (err) { console.error(err); alert("Purchase failed."); }
    setBuying(null);
  };

  if (loading) return <Shell><p style={{ padding: "2rem" }}>Loading Shop...</p></Shell>;

  return (
    <Shell>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Shop</h1>
            <p style={{ color: "var(--text-muted)" }}>Customize your manager profile</p>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "0.75rem 1.5rem", borderRadius: "12px", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.2rem" }}>🪙</span>
            <span style={{ fontWeight: 800, fontSize: "1.2rem" }}>{userCoins}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.5rem" }}>
          {items.map(item => {
            const isOwned = ownedIds.includes(item.ID);
            const canAfford = userCoins >= item.price;
            const img = item.previewImage?.startsWith('wix') ? 'https://static.wixstatic.com/media/' + item.previewImage.split('/')[3] + '~mv2.png' : item.previewImage;

            return (
              <div key={item.ID} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
                <div style={{ width: "100%", aspectRatio: item.itemType === "banner" ? "16/7" : "1/1", background: "#111" }}>
                   <img src={img || 'https://via.placeholder.com/200'} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div style={{ padding: "1rem" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--accent)", fontWeight: 800, textTransform: "uppercase" }}>{item.itemType}</div>
                  <div style={{ fontWeight: 700, margin: "0.25rem 0 1rem" }}>{item.itemName}</div>
                  <button 
                    onClick={() => handleBuy(item)}
                    disabled={isOwned || !canAfford || buying === item.ID}
                    style={{ 
                      width: "100%", padding: "0.6rem", borderRadius: "8px", border: "none", fontWeight: 700, fontSize: "0.85rem",
                      cursor: isOwned ? "default" : canAfford ? "pointer" : "not-allowed",
                      background: isOwned ? "var(--border)" : canAfford ? "var(--blue)" : "rgba(255,255,255,0.05)",
                      color: isOwned ? "var(--text-muted)" : "#fff"
                    }}
                  >
                    {isOwned ? "OWNED" : buying === item.ID ? "..." : `${item.price} Coins`}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
