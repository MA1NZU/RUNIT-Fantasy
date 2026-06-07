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
  section: string;
  isVisible: boolean;
};

export default function ShopPage() {
  const { user } = useAuth();
  const [itemsBySection, setItemsBySection] = useState<Record<string, ShopItem[]>>({});
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
        const itemSnap = await getDocs(collection(db, "shopItems"));
        const allItems = itemSnap.docs.map(d => ({ ...d.data() } as ShopItem));
        
        // 1. Filter visible and Group by Section
        const grouped = allItems
          .filter(item => item.isVisible !== false)
          .reduce((acc, item) => {
            const sec = item.section || "General";
            if (!acc[sec]) acc[sec] = [];
            acc[sec].push(item);
            return acc;
          }, {} as Record<string, ShopItem[]>);
        
        setItemsBySection(grouped);

        const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", userEmail)));
        if (!teamSnap.empty) setUserCoins(teamSnap.docs[0].data().coins || 0);

        const invSnap = await getDocs(query(collection(db, "userInventory"), where("ownerEmail", "==", userEmail)));
        setOwnedIds(invSnap.docs.map(d => d.data().itemId));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    loadShop();
  }, [user]);

  const handleBuy = async (item: ShopItem) => {
    const userEmail = user?.email;
    if (!userEmail) return;
    if (userCoins < item.price) return alert("Not enough coins!");
    if (!confirm(`Buy ${item.itemName}?`)) return;

    setBuying(item.ID);
    try {
      await addDoc(collection(db, "userInventory"), { ownerEmail: userEmail, itemId: item.ID, purchaseDate: new Date().toISOString(), equipped: false });
      const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", userEmail)));
      await updateDoc(doc(db, "userTeams", teamSnap.docs[0].id), { coins: userCoins - item.price });
      setUserCoins(prev => prev - item.price);
      setOwnedIds(prev => [...prev, item.ID]);
      alert("Success!");
    } catch (err) { console.error(err); }
    setBuying(null);
  };

  const getImageUrl = (url: string) => {
    if (!url) return 'https://via.placeholder.com/200';
    if (url.startsWith('wix:image://v1/')) {
      const guid = url.split('/')[3];
      return `https://static.wixstatic.com/media/${guid}~mv2.png`;
    }
    return url;
  };

  if (loading) return <Shell><p style={{ padding: "2rem" }}>Loading Shop...</p></Shell>;

  return (
    <Shell>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Store</h1>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "0.6rem 1.2rem", borderRadius: "10px", fontWeight: 800 }}>
            🪙 {userCoins}
          </div>
        </div>

        {Object.entries(itemsBySection).map(([sectionTitle, items]) => (
          <div key={sectionTitle} style={{ marginBottom: "4rem" }}>
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1.5rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--blue)", display: "inline-block" }}>
              {sectionTitle}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.5rem" }}>
              {items.map(item => (
                <div key={item.ID} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
                  <div style={{ width: "100%", aspectRatio: item.itemType === "banner" ? "16/7" : "1/1", background: "#111" }}>
                    <img src={getImageUrl(item.previewImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
                  </div>
                  <div style={{ padding: "1rem" }}>
                    <div style={{ fontSize: "0.6rem", color: "var(--accent)", fontWeight: 800, textTransform: "uppercase" }}>{item.itemType}</div>
                    <div style={{ fontWeight: 700, margin: "0.2rem 0 1rem", fontSize: "0.95rem" }}>{item.itemName}</div>
                    <button 
                      onClick={() => handleBuy(item)} 
                      disabled={ownedIds.includes(item.ID) || userCoins < item.price || buying === item.ID} 
                      style={{ 
                        width: "100%", padding: "0.6rem", borderRadius: "8px", border: "none", fontWeight: 700, cursor: "pointer",
                        background: ownedIds.includes(item.ID) ? "var(--border)" : "var(--blue)", color: "#fff"
                      }}
                    >
                      {ownedIds.includes(item.ID) ? "OWNED" : `${item.price} Coins`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}
