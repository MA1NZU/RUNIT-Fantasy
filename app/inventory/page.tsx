"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";
import Link from "next/link";

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
        // 1. Get currently equipped items from userTeams
        const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", userEmail)));
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
        shopSnap.docs.forEach(d => { 
          const data = d.data() as ShopItem;
          const finalItem = { ...data, ID: data.ID || d.id };
          shopMap[d.id] = finalItem;
          if (data.ID) shopMap[data.ID] = finalItem;
        });

        // 3. Load user's inventory
        const invSnap = await getDocs(query(collection(db, "userInventory"), where("ownerEmail", "==", userEmail)));
        const list = invSnap.docs.map(d => {
            const itemId = d.data().itemId || d.data().itemID;
            return shopMap[itemId];
        }).filter(Boolean);
        setOwnedItems(list);
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
      const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", userEmail)));
      if (teamSnap.empty) return;
      
      const teamId = teamSnap.docs[0].id;
      // Convert 'avatar' to 'equippedAvatar'
      const type = item.itemType.toLowerCase();
      const field = `equipped${type.charAt(0).toUpperCase() + type.slice(1)}`;
      
      await updateDoc(doc(db, "userTeams", teamId), { [field]: item.ID });
      setEquipped(prev => ({ ...prev, [type]: item.ID }));
    } catch (err) { 
      console.error("Equip error:", err); 
    }
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
          {ownedItems.length === 0 ? (
            <div style={{ background: "var(--surface)", padding: "3rem", borderRadius: "20px", textAlign: "center", gridColumn: "1/-1", border: "1px dashed var(--border)" }}>
              <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>You haven't purchased any items yet.</p>
              <Link href="/shop" style={{ color: "var(--blue)", fontWeight: 700, textDecoration: "none" }}>Go to Shop →</Link>
            </div>
          ) : (
            ownedItems.map(item => {
              const type = item.itemType.toLowerCase();
              const isEquipped = equipped[type] === item.ID;
              const img = getImageUrl(item.previewImage);
              
              // Capitalize for display
              const displayType = type.charAt(0).toUpperCase() + type.slice(1);

              return (
                <div key={item.ID} style={{ background: "var(--surface)", border: `1px solid ${isEquipped ? "var(--blue)" : "var(--border)"}`, borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
                  <img src={img} style={{ width: "80px", height: "80px", borderRadius: "12px", objectFit: "cover", marginBottom: "1rem" }} />
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: "0.2rem" }}>{item.itemName}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>{displayType}</div>
                  <button 
                    onClick={() => handleEquip(item)} 
                    disabled={isEquipped} 
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "none", cursor: isEquipped ? "default" : "pointer", background: isEquipped ? "var(--green)" : "var(--blue)", color: "#fff", fontWeight: 700 }}
                  >
                    {isEquipped ? "EQUIPPED" : "EQUIP"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Shell>
  );
}
