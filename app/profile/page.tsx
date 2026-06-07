"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";
import Link from "next/link";

type ShopItem = {
  ID: string;
  itemName: string;
  itemType: string;
  previewImage: string;
  songUrl?: string;
  titleText?: string;
  titleColor?: string;
};

type UserTeam = {
  id: string;
  manager: string;
  totalPoints: number;
  gameweekPoints: number;
  coins: number;
  equippedAvatar?: string;
  equippedBanner?: string;
  equippedSong?: string;
  equippedTitle?: string;
  ownerEmail: string;
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [team, setTeam] = useState<UserTeam | null>(null);
  const [items, setItems] = useState<Record<string, ShopItem>>({});
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    const userEmail = user?.email;
    if (!userEmail) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        // 1. Fetch User Team
        const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", userEmail)));
        if (teamSnap.empty) return;
        const teamData = { id: teamSnap.docs[0].id, ...teamSnap.docs[0].data() } as UserTeam;
        setTeam(teamData);
        setNewName(teamData.manager);

        // 2. Fetch Equipped Items details
        const equippedIds = [
          teamData.equippedAvatar,
          teamData.equippedBanner,
          teamData.equippedSong,
          teamData.equippedTitle
        ].filter(Boolean) as string[];

        if (equippedIds.length > 0) {
          const shopSnap = await getDocs(collection(db, "shopItems"));
          const shopMap: Record<string, ShopItem> = {};
          shopSnap.docs.forEach(d => {
            const data = d.data() as ShopItem;
            if (equippedIds.includes(data.ID)) {
              shopMap[data.ID] = data;
            }
          });
          setItems(shopMap);
        }
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleUpdateName = async () => {
    if (!team || !newName.trim()) return;
    try {
      await updateDoc(doc(db, "userTeams", team.id), { manager: newName });
      setTeam({ ...team, manager: newName });
      setEditingName(false);
    } catch (err) {
      console.error("Update name error:", err);
    }
  };

  const getImageUrl = (url?: string) => {
    if (!url) return "";
    if (url.startsWith('wix:image://v1/')) {
      const guid = url.split('/')[3];
      return `https://static.wixstatic.com/media/${guid}~mv2.png`;
    }
    return url;
  };

  if (loading) return <Shell><p style={{ padding: "2rem" }}>Loading Profile...</p></Shell>;
  if (!team) return <Shell><p style={{ padding: "2rem" }}>Team not found.</p></Shell>;

  const avatarItem = team.equippedAvatar ? items[team.equippedAvatar] : null;
  const bannerItem = team.equippedBanner ? items[team.equippedBanner] : null;
  const songItem = team.equippedSong ? items[team.equippedSong] : null;
  const titleItem = team.equippedTitle ? items[team.equippedTitle] : null;

  return (
    <Shell>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Profile Card */}
        <div style={{ background: "var(--surface)", borderRadius: "20px", border: "1px solid var(--border)", overflow: "hidden", position: "relative" }}>
          
          {/* Banner */}
          <div style={{ height: "200px", background: "#111", position: "relative" }}>
            {bannerItem ? (
              <img src={getImageUrl(bannerItem.previewImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Banner" />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(45deg, #0347F4, #7c3aed)" }} />
            )}
            
            {/* Edit Profile Button Overlay */}
            <Link href="/inventory" style={{ position: "absolute", top: "1rem", right: "1rem", background: "rgba(0,0,0,0.5)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.2)" }}>
              Customize Profile
            </Link>
          </div>

          {/* Profile Info Section */}
          <div style={{ padding: "0 2rem 2rem", position: "relative", textAlign: "center" }}>
            
            {/* Avatar */}
            <div style={{ width: "120px", height: "120px", borderRadius: "50%", border: "6px solid var(--surface)", background: "#222", overflow: "hidden", margin: "-60px auto 1rem", position: "relative", zIndex: 5 }}>
              {avatarItem ? (
                <img src={getImageUrl(avatarItem.previewImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Avatar" />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.5rem", fontWeight: 800, color: "#444" }}>
                  {team.manager.slice(0, 1)}
                </div>
              )}
            </div>

            {/* Manager Name & Title */}
            <div style={{ marginBottom: "1.5rem" }}>
              {editingName ? (
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)} style={{ background: "var(--bg)", border: "1px solid var(--blue)", color: "#fff", padding: "0.4rem 0.8rem", borderRadius: "8px", fontSize: "1.5rem", fontWeight: 700, textAlign: "center" }} />
                  <button onClick={handleUpdateName} style={{ background: "var(--green)", border: "none", color: "#fff", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer", fontWeight: 700 }}>Save</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
                  <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {team.manager}
                    <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", opacity: 0.5 }}>✏️</button>
                  </h1>
                  {titleItem && (
                    <div style={{ color: titleItem.titleColor || "var(--accent)", fontWeight: 700, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "1px" }}>
                      {titleItem.titleText || titleItem.itemName}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats Row */}
            <div style={{ display: "flex", justifyContent: "center", gap: "3rem", borderTop: "1px solid var(--border)", paddingTop: "1.5rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Total Points</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800 }}>{team.totalPoints}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Coins</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffae00" }}>🪙 {team.coins}</div>
              </div>
            </div>

            {/* Song Player */}
            {songItem && (
              <div style={{ marginTop: "2rem", padding: "1.5rem", background: "rgba(255,255,255,0.03)", borderRadius: "16px", border: "1px solid var(--border)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", textAlign: "left" }}>
                  <div style={{ width: "50px", height: "50px", borderRadius: "8px", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>🎵</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Now Playing</div>
                    <div style={{ fontWeight: 700 }}>{songItem.itemName}</div>
                  </div>
                  {songItem.songUrl && (
                    <audio controls style={{ height: "30px", width: "200px" }}>
                      <source src={songItem.songUrl} type="audio/mpeg" />
                    </audio>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Quick Links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "1rem" }}>
          <Link href="/team" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "1.5rem", borderRadius: "16px", textDecoration: "none", color: "inherit", transition: "0.2s" }}>
            <div style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>🛡️</div>
            <div style={{ fontWeight: 700 }}>My Squad</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>View your active players and points</div>
          </Link>
          <Link href="/shop" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "1.5rem", borderRadius: "16px", textDecoration: "none", color: "inherit", transition: "0.2s" }}>
            <div style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>🏪</div>
            <div style={{ fontWeight: 700 }}>Shop</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Buy more skins and banners</div>
          </Link>
        </div>
      </div>
    </Shell>
  );
}
