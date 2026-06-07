"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type ShopItem = { ID: string; itemName: string; itemType: string; previewImage: string; };

export default function InventoryPage() {
  const { user } = useAuth();
  const [ownedItems, setOwnedItems] = useState<ShopItem[]>([]);
  const [equipped, setEquipped] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) return;
    const loadInv = async () => {
      setLoading(true);
      try {
        // 1. Get currently equipped items from userTeams
        const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", user.email)));
        if (!teamSnap.empty) {
          const d = teamSnap.docs[0].data();
          setEquipped({
            avatar: d.equippedAvatar || "",
            banner: d.equippedBanner || "",
            song: d.equippedSong || "",
            title: d.equippedTitle || ""
          });
        }

        // 2. Load all shop definitions
        const shopSnap = await getDocs(collection(db, "shopItems"));
        const shopMap: Record<string, ShopItem> = {};
        shopSnap.docs.forEach(d => { shopMap[d.data().ID] = d.data() as ShopItem; });

        // 3. Load user's inventory
        const invSnap = await getDocs(query(collection(db, "userInventory"), where("ownerEmail", "==", user.email)));
        const list = invSnap.docs.map(d => shopMap[d.data().itemId]).filter(Boolean);
        setOwnedItems(list);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    loadInv();
  }, [user]);

  const handleEquip = async (item: ShopItem) => {
    try {
      const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", user.email)));
      const teamId = teamSnap.docs[0].id;
      const field = `equipped${item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)}`;
      
      await updateDoc(doc(db, "userTeams", teamId), { [field]: item.ID });
      setEquipped(prev => ({ ...prev, [item.itemType]: item.ID }));
    } catch (err) { console.error(err); }
  };

  if (loading) return <Shell><p style={{ padding: "2rem" }}>Loading Inventory...</p></Shell>;

  return (
    <Shell>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Inventory</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem" }}>
          {ownedItems.map(item => {
            const isEquipped = equipped[item.itemType] === item.ID;
            const img = item.previewImage?.startsWith('wix') ? 'https://static.wixstatic.com/media/' + item.previewImage.split('/')[3] + '~mv2.png' : item.previewImage;

            return (
              <div key={item.ID} style={{ background: "var(--surface)", border: `1px solid ${isEquipped ? "var(--blue)" : "var(--border)"}`, borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
                <img src={img || 'https://via.placeholder.com/100'} style={{ width: "80px", height: "80px", borderRadius: "12px", objectFit: "cover", marginBottom: "1rem" }} />
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.itemName}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "1rem" }}>{item.itemType.toUpperCase()}</div>
                <button onClick={() => handleEquip(item)} disabled={isEquipped} style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "none", cursor: isEquipped ? "default" : "pointer", background: isEquipped ? "var(--green)" : "var(--blue)", color: "#fff", fontWeight: 700 }}>
                  {isEquipped ? "EQUIPPED" : "EQUIP"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
