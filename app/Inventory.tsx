"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type ShopItem = { id: string; name: string; type: "PFP" | "Banner" | "Song"; imageUrl: string; };

export default function InventoryPage() {
  const { user } = useAuth();
  const [ownedItems, setOwnedItems] = useState<ShopItem[]>([]);
  const [equipped, setEquipped] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    const loadInventory = async () => {
      setLoading(true);
      try {
        // 1. Get equipped status
        const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", user.email)));
        if (!teamSnap.empty) {
          const data = teamSnap.docs[0].data();
          setEquipped({
            PFP: data.equippedAvatar || "",
            Banner: data.equippedBanner || "",
            Song: data.equippedSong || ""
          });
        }

        // 2. Get all shop item details
        const shopSnap = await getDocs(collection(db, "shopItems"));
        const shopMap: Record<string, ShopItem> = {};
        shopSnap.docs.forEach(d => { shopMap[d.id] = { id: d.id, ...d.data() } as ShopItem; });

        // 3. Get user inventory
        const invSnap = await getDocs(query(collection(db, "userInventory"), where("ownerEmail", "==", user.email)));
        const userItems = invSnap.docs.map(d => shopMap[d.data().itemId]).filter(Boolean);
        setOwnedItems(userItems);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    loadInventory();
  }, [user]);

  const handleEquip = async (item: ShopItem) => {
    try {
      const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", user.email)));
      const teamDocId = teamSnap.docs[0].id;
      
      const updateKey = item.type === "PFP" ? "equippedAvatar" : item.type === "Banner" ? "equippedBanner" : "equippedSong";
      
      await updateDoc(doc(db, "userTeams", teamDocId), {
        [updateKey]: item.id
      });

      setEquipped(prev => ({ ...prev, [item.type]: item.id }));
    } catch (err) { console.error(err); }
  };

  if (loading) return <Shell><p style={{ padding: "2rem" }}>Loading Inventory...</p></Shell>;

  return (
    <Shell>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Your Inventory</h1>

        {ownedItems.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>You don't own any cosmetics yet. Head to the Shop!</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
            {ownedItems.map(item => {
              const isEquipped = equipped[item.type] === item.id;
              return (
                <div key={item.id} style={{ background: "var(--surface)", border: `1px solid ${isEquipped ? "var(--blue)" : "var(--border)"}`, borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
                   <img src={item.imageUrl || 'https://via.placeholder.com/100'} style={{ width: "80px", height: "80px", borderRadius: "50%", marginBottom: "1rem" }} />
                   <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.name}</div>
                   <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "1rem" }}>{item.type}</div>
                   <button 
                    onClick={() => handleEquip(item)}
                    disabled={isEquipped}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "none", cursor: isEquipped ? "default" : "pointer", background: isEquipped ? "var(--green)" : "var(--blue)", color: "#fff", fontWeight: 700 }}
                   >
                     {isEquipped ? "EQUIPPED" : "EQUIP"}
                   </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Shell>
  );
}
