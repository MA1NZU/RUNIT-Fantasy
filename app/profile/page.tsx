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

function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

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
        const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", userEmail)));
        if (teamSnap.empty) return;
        const teamData = { id: teamSnap.docs[0].id, ...teamSnap.docs[0].data() } as UserTeam;
        setTeam(teamData);
        setNewName(teamData.manager);

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
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    loadProfile();
  }, [user]);

  const handleUpdateName = async () => {
    if (!team || !newName.trim()) return;
    try {
      await updateDoc(doc(db, "userTeams", team.id), { manager: newName });
      setTeam({ ...team, manager: newName });
      setEditingName(false);
    } catch (err) { console.error(err); }
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

  const ytId = songItem?.songUrl ? getYouTubeId(songItem.songUrl) : null;
  const songThumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg` : null;

  return (
    <Shell>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* PROFILE HEADER */}
        <div style={{ background: "var(--surface)", borderRadius: "24px", border: "1px solid var(--border)", overflow: "hidden", position: "relative", marginBottom: "1.5rem" }}>
          
          <div style={{ height: "220px", background: "#111", position: "relative" }}>
            {bannerItem ? (
              <img src={getImageUrl(bannerItem.previewImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Banner" />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #0347F4 0%, #7c3aed 100%)" }} />
            )}
            <Link href="/inventory" style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "rgba(0,0,0,0.6)", color: "#fff", padding: "0.6rem 1.2rem", borderRadius: "30px", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", transition: "0.2s" }}>
              Customize
            </Link>
          </div>

          <div style={{ padding: "0 2rem 2.5rem", textAlign: "center" }}>
            <div style={{ width: "140px", height: "120px", margin: "-70px auto 1rem", position: "relative" }}>
              <div style={{ width: "140px", height: "140px", borderRadius: "50%", border: "8px solid var(--surface)", background: "#222", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.3)" }}>
                {avatarItem ? (
                  <img src={getImageUrl(avatarItem.previewImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Avatar" />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", fontWeight: 800, color: "#444" }}>{team.manager.slice(0, 1)}</div>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              {editingName ? (
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)} style={{ background: "var(--bg)", border: "2px solid var(--blue)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "12px", fontSize: "1.75rem", fontWeight: 800, textAlign: "center", width: "300px" }} />
                  <button onClick={handleUpdateName} style={{ background: "var(--blue)", border: "none", color: "#fff", padding: "0.7rem 1.2rem", borderRadius: "12px", cursor: "pointer", fontWeight: 700 }}>Save</button>
                </div>
              ) : (
                <>
                  <h1 style={{ fontSize: "2.25rem", fontWeight: 900, margin: "0 0 0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem" }}>
                    {team.manager}
                    <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", opacity: 0.4 }}>✏️</button>
                  </h1>
                  {titleItem && (
                    <span style={{ color: titleItem.titleColor || "var(--accent)", fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "2px", background: "rgba(255,255,255,0.03)", padding: "0.4rem 1.2rem", borderRadius: "30px", border: "1px solid var(--border)" }}>
                      {titleItem.titleText || titleItem.itemName}
                    </span>
                  )}
                </>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "4rem" }}>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "0.25rem" }}>Total Points</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 900 }}>{team.totalPoints}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "0.25rem" }}>Coins</div>
                <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#ffae00" }}>🪙 {team.coins}</div>
              </div>
            </div>

            {/* MUSIC PLAYER CARD */}
            {songItem && ytId && (
              <div style={{ marginTop: "2.5rem", padding: "1rem", background: "rgba(0,0,0,0.2)", borderRadius: "20px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "1.25rem", textAlign: "left" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "12px", background: "#000", overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.1)" }}>
                  <img src={songThumbnail || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Song Cover" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--blue)", fontWeight: 800, textTransform: "uppercase", marginBottom: "0.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "var(--blue)", animation: "pulse 1.5s infinite" }}></span>
                    Now Playing
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: "0.5rem" }}>{songItem.itemName}</div>
                  
                  {/* The YouTube Iframe styled as an Audio Bar */}
                  <div style={{ height: "45px", overflow: "hidden", borderRadius: "8px", background: "#111" }}>
                    <iframe 
                      width="100%" 
                      height="120" 
                      src={`https://www.youtube.com/embed/${ytId}?controls=1&modestbranding=1&rel=0&autoplay=0`} 
                      style={{ marginTop: "-65px" }} // Clips the video, shows only the control bar
                      frameBorder="0" 
                      allow="autoplay; encrypted-media"
                    ></iframe>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <Link href="/team" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "1.5rem", borderRadius: "20px", textDecoration: "none", color: "inherit", transition: "0.2s" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🛡️</div>
            <div style={{ fontWeight: 800 }}>My Squad</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>View active players and performance</div>
          </Link>
          <Link href="/shop" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "1.5rem", borderRadius: "20px", textDecoration: "none", color: "inherit", transition: "0.2s" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🏪</div>
            <div style={{ fontWeight: 800 }}>Item Shop</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Get new banners and avatars</div>
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.8; }
        }
      `}</style>
    </Shell>
  );
}
