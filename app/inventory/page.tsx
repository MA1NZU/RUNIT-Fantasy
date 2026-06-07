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
        // 1. Get currently equipped items from userTeams for this user
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

        // 2. Load all available shop item definitions
        const shopSnap = await getDocs(collection(db, "shopItems"));
        const shopMap: Record<string, ShopItem> = {};
        shopSnap.docs.forEach(d => { 
          const data = d.data() as ShopItem;
          // Map by the internal ID field from your CSV/JSON
          const key = data.ID || d.id;
          shopMap[key] = { ...data, ID: key }; 
        });

        // 3. Load items in this specific user's inventory
        const invSnap = await getDocs(query(collection(db, "userInventory"), where("ownerEmail", "==", userEmail)));
        const list = invSnap.docs.map(d => {
            const invData = d.data();
            return shopMap[invData.itemId]; // Look up the full item details
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
      const type = item.itemType.toLowerCase();
      // Maps 'avatar' -> 'equippedAvatar', 'banner' -> 'equippedBanner', etc.
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
            <p style={{ color: "var(--text-muted)", gridColumn: "1/-1" }}>You haven't purchased any items yet. Visit the Shop!</p>
          ) : (
            ownedItems.map(item => {
              const type = item.itemType.toLowerCase();
              const isEquipped = equipped[type] === item.ID;
              const img = getImageUrl(item.previewImage);
              const displayType = type.charAt(0).toUpperCase() + type.slice(1);

              return (
                <div key={item.ID} style={{ background: "var(--surface)", border: `1px solid ${isEquipped ? "var(--blue)" : "var(--border)"}`, borderRadius: "12px", padding: "1rem", textAlign: "center" }}>
                  <img src={img} style={{ width: "80px", height: "80px", borderRadius: "12px", objectFit: "cover", marginBottom: "1rem" }} alt="" />
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
