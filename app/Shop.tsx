"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, addDoc, query, where } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type ShopItem = {
  id: string;
  name: string;
  type: "PFP" | "Banner" | "Song";
  price: number;
  imageUrl: string;
  rarity: "Common" | "Rare" | "Epic" | "Legendary";
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
        const itemList = itemSnap.docs.map(d => ({ id: d.id, ...d.data() } as ShopItem));
        setItems(itemList);

        // 2. Fetch User Coins
        const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", user.email)));
        if (!teamSnap.empty) {
          setUserCoins(teamSnap.docs[0].data().coins || 0);
        }

        // 3. Fetch Owned Items
        const invSnap = await getDocs(query(collection(db, "userInventory"), where("ownerEmail", "==", user.email)));
        setOwnedIds(invSnap.docs.map(d => d.data().itemId));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    loadShop();
  }, [user]);

  const handleBuy = async (item: ShopItem) => {
    if (userCoins < item.price) return alert("Not enough coins!");
    if (!confirm(`Buy ${item.name} for ${item.price} coins?`)) return;

    setBuying(item.id);
    try {
      // 1. Add to Inventory
      await addDoc(collection(db, "userInventory"), {
        ownerEmail: user!.email,
        itemId: item.id,
        purchaseDate: new Date().toISOString()
      });

      // 2. Deduct Coins
      const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", user.email)));
      const teamDoc = teamSnap.docs[0];
      await updateDoc(doc(db, "userTeams", teamDoc.id), {
        coins: userCoins - item.price
      });

      setUserCoins(prev => prev - item.price);
      setOwnedIds(prev => [...prev, item.id]);
      alert("Purchase successful!");
    } catch (err) { console.error(err); }
    setBuying(null);
  };

  if (loading) return <Shell><p style={{ padding: "2rem" }}>Loading Shop...</p></Shell>;

  return (
    <Shell>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Cosmetic Shop</h1>
            <p style={{ color: "var(--text-muted)" }}>Level up your profile</p>
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "0.75rem 1.5rem", borderRadius: "12px", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "1.2rem" }}>🪙</span>
            <span style={{ fontWeight: 800, fontSize: "1.1rem" }}>{userCoins}</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.5rem" }}>
          {items.map(item => {
            const isOwned = ownedIds.includes(item.id);
            const canAfford = userCoins >= item.price;

            return (
              <div key={item.id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "rgba(0,0,0,0.6)", padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.6rem", fontWeight: 700, color: getRarityColor(item.rarity) }}>
                  {item.rarity.toUpperCase()}
                </div>
                
                {/* Preview Area */}
                <div style={{ width: "100%", aspectRatio: item.type === "Banner" ? "16/7" : "1/1", background: "#111", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid var(--border)" }}>
                  {item.type === "Song" ? (
                    <div style={{ fontSize: "3rem" }}>🎵</div>
                  ) : (
                    <img src={item.imageUrl} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  )}
                </div>

                <div style={{ padding: "1rem" }}>
                  <div style={{ fontSize: "0.7rem", color: "var(--accent)", fontWeight: 700, marginBottom: "0.2rem" }}>{item.type}</div>
                  <div style={{ fontWeight: 700, marginBottom: "1rem" }}>{item.name}</div>
                  
                  <button 
                    onClick={() => handleBuy(item)}
                    disabled={isOwned || !canAfford || buying === item.id}
                    style={{ 
                      width: "100%", 
                      padding: "0.6rem", 
                      borderRadius: "8px", 
                      border: "none", 
                      fontWeight: 700,
                      cursor: isOwned ? "default" : canAfford ? "pointer" : "not-allowed",
                      background: isOwned ? "var(--border)" : canAfford ? "var(--blue)" : "rgba(255,255,255,0.05)",
                      color: isOwned ? "var(--text-muted)" : "#fff"
                    }}
                  >
                    {isOwned ? "OWNED" : buying === item.id ? "..." : `${item.price} Coins`}
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

function getRarityColor(rarity: string) {
  switch(rarity) {
    case "Legendary": return "#ffae00";
    case "Epic": return "#bf00ff";
    case "Rare": return "#0095ff";
    default: return "#aaa";
  }
}
