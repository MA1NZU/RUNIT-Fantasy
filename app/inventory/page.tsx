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
    const userEmail = user?.email;
    if (!userEmail) return;

    const loadInv = async () => {
      setLoading(true);
      try {
        const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", userEmail)));
        if (!teamSnap.empty) {
          const d = teamSnap.docs[0].data();
          setEquipped({ avatar: d.equippedAvatar || "", banner: d.equippedBanner || "", song: d.equippedSong || "", title: d.equippedTitle || "" });
        }

        const shopSnap = await getDocs(collection(db, "shopItems"));
        const shopMap: Record<string, ShopItem> = {};
        shopSnap.docs.forEach(d => { shopMap[d.data().ID] = d.data() as ShopItem; });

        const invSnap = await getDocs(query(collection(db, "userInventory"), where("ownerEmail", "==", userEmail)));
        setOwnedItems(invSnap.docs.map(d => shopMap[d.data().itemId]).filter(Boolean));
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    loadInv();
  }, [user]);

  const handleEquip = async (item: ShopItem) => {
    const userEmail = user?.email;
    if (!userEmail) return;
    try {
      const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", userEmail)));
      const field = `equipped${item.itemType.charAt(0).toUpperCase() + item.itemType.slice(1)}`;
      await updateDoc(doc(db, "userTeams", teamSnap.docs[0].id), { [field]: item.ID });
      setEquipped(prev => ({ ...prev, [item.itemType.toLowerCase()]: item.ID }));
    } catch (err) { console.error(err); }
  };

  const getImageUrl = (url: string) => {
    if (!url) return 'https://via.placeholder.com/100';
    if (url.startsWith('wix:image://v1/')) {
      const guid = url.split('/')[3];
      return `https://static.wixstatic.com/media/${guid}~mv2.png`;
    }
    return url;
  };

  if (loading) return <Shell><p style={{ padding: "2rem" }}>Loading Inventory...</p></Shell>;

  return (
    <Shell>
      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: "2rem" }}>Inventory</h1>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem" }}>
          {ownedItems.map(item => (
            <div key={item.ID} style={{ background: "var(--surface)", border: `1px solid ${equipped[item.itemType.toLowerCase()] === item.ID ? "var(--blue)" : "var(--border)"}`, borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
              <img src={getImageUrl(item.previewImage)} style={{ width: "80px", height: "80px", borderRadius: "12px", objectFit: "cover", marginBottom: "1rem" }} alt="" />
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{item.itemName}</div>
              <button onClick={() => handleEquip(item)} disabled={equipped[item.itemType.toLowerCase()] === item.ID} style={{ width: "100%", marginTop: "1rem", padding: "0.5rem", borderRadius: "6px", border: "none", cursor: "pointer", background: equipped[item.itemType.toLowerCase()] === item.ID ? "var(--green)" : "var(--blue)", color: "#fff" }}>
                {equipped[item.itemType.toLowerCase()] === item.ID ? "EQUIPPED" : "EQUIP"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
