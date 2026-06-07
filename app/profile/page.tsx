"use client";

import { useEffect, useState, useRef } from "react";
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

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

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
  
  // Player State
  const [volume, setVolume] = useState(50);
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);

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
      } catch (err) { console.error("Profile load error:", err); } finally { setLoading(false); }
    };
    loadProfile();
  }, [user]);

  const songItem = team?.equippedSong ? items[team.equippedSong] : null;
  const ytId = songItem?.songUrl ? getYouTubeId(songItem.songUrl) : null;

  // Load YouTube API
  useEffect(() => {
    if (!ytId) return;

    // Load Script
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    window.onYouTubeIframeAPIReady = () => {
      playerRef.current = new window.YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: ytId,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3
        },
        events: {
          onReady: (event: any) => {
            setPlayerReady(true);
            event.target.setVolume(volume);
          }
        }
      });
    };

    // If API already loaded but component re-mounted
    if (window.YT && window.YT.Player && !playerRef.current) {
        window.onYouTubeIframeAPIReady();
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [ytId]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setVolume(val);
    if (playerRef.current && playerReady) {
      playerRef.current.setVolume(val);
    }
  };

  const handleUpdateName = async () => {
    if (!team || !newName.trim()) return;
    try {
      await updateDoc(doc(db, "userTeams", team.id), { manager: newName });
      setTeam({ ...team, manager: newName });
      setEditingName(false);
    } catch (err) { console.error("Update name error:", err); }
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
  const titleItem = team.equippedTitle ? items[team.equippedTitle] : null;

  return (
    <Shell>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        
        {/* PROFILE CARD */}
        <div style={{ background: "var(--surface)", borderRadius: "24px", border: "1px solid var(--border)", overflow: "hidden", position: "relative", marginBottom: "1.5rem", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
          
          {/* BANNER */}
          <div style={{ height: "240px", background: "#111", position: "relative" }}>
            {bannerItem ? (
              <img src={getImageUrl(bannerItem.previewImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Banner" />
            ) : (
              <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #0347F4 0%, #7c3aed 100%)" }} />
            )}
            <Link href="/inventory" style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "rgba(0,0,0,0.6)", color: "#fff", padding: "0.6rem 1.2rem", borderRadius: "30px", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", zIndex: 10 }}>
              Customize
            </Link>
          </div>

          <div style={{ padding: "0 3rem 3rem", textAlign: "center" }}>
            
            {/* AVATAR */}
            <div style={{ width: "160px", height: "120px", margin: "-80px auto 1.5rem", position: "relative" }}>
              <div style={{ width: "160px", height: "160px", borderRadius: "50%", border: "8px solid var(--surface)", background: "#222", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
                {avatarItem ? (
                  <img src={getImageUrl(avatarItem.previewImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="Avatar" />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem", fontWeight: 800, color: "#444" }}>{team.manager.slice(0, 1)}</div>
                )}
              </div>
            </div>

            {/* NAME & TITLE */}
            <div style={{ marginBottom: "2.5rem" }}>
              {editingName ? (
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)} style={{ background: "var(--bg)", border: "2px solid var(--blue)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "12px", fontSize: "1.75rem", fontWeight: 800, textAlign: "center", width: "300px" }} />
                  <button onClick={handleUpdateName} style={{ background: "var(--blue)", color: "#fff", border: "none", padding: "0.75rem 1.2rem", borderRadius: "12px", cursor: "pointer", fontWeight: 700 }}>Save</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <h1 style={{ fontSize: "2.5rem", fontWeight: 900, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", letterSpacing: "-1px" }}>
                    {team.manager}
                    <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", opacity: 0.3 }}>✏️</button>
                  </h1>
                  {titleItem && (
                    <div style={{ color: titleItem.titleColor || "var(--accent)", fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "3px", background: "rgba(255,255,255,0.03)", padding: "0.5rem 1.5rem", borderRadius: "40px", border: "1px solid var(--border)" }}>
                      {titleItem.titleText || titleItem.itemName}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STATS */}
            <div style={{ display: "flex", justifyContent: "center", gap: "6rem", marginBottom: "3rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.5rem" }}>Total Points</div>
                <div style={{ fontSize: "2rem", fontWeight: 900 }}>{team.totalPoints}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.5rem" }}>Bank</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "#ffae00" }}>🪙 {team.coins}</div>
              </div>
            </div>

            {/* HORIZONTAL YOUTUBE PLAYER */}
            {songItem && ytId && (
              <div style={{ 
                marginTop: "2rem", 
                padding: "1rem", 
                background: "rgba(0,0,0,0.5)", 
                borderRadius: "20px", 
                border: "1px solid var(--border)", 
                display: "flex", 
                alignItems: "center", 
                gap: "1.5rem", 
                textAlign: "left",
                maxWidth: "700px",
                margin: "0 auto",
                boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05)"
              }}>
                {/* The actual video container */}
                <div style={{ width: "120px", height: "68px", borderRadius: "12px", overflow: "hidden", background: "#000", flexShrink: 0 }}>
                  <div id="yt-player"></div>
                </div>
                
                {/* Info and Volume */}
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ fontSize: "0.6rem", color: "var(--blue)", fontWeight: 800, textTransform: "uppercase", marginBottom: "0.2rem" }}>Now Playing</div>
                   <div style={{ fontWeight: 700, fontSize: "1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#fff", marginBottom: "0.5rem" }}>{songItem.itemName}</div>
                   
                   <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span style={{ fontSize: "1rem" }}>🔊</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={volume} 
                        onChange={handleVolumeChange}
                        style={{ flex: 1, cursor: "pointer", accentColor: "var(--blue)" }}
                      />
                      <span style={{ fontSize: "0.75rem", fontWeight: 700, width: "30px" }}>{volume}%</span>
                   </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          <Link href="/team" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "2rem", borderRadius: "24px", textDecoration: "none", color: "inherit", transition: "transform 0.2s" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🛡️</div>
            <div style={{ fontWeight: 900, fontSize: "1.25rem" }}>My Squad</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Manage players and track points.</div>
          </Link>
          <Link href="/shop" style={{ background: "var(--surface)", border: "1px solid var(--border)", padding: "2rem", borderRadius: "24px", textDecoration: "none", color: "inherit", transition: "transform 0.2s" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🏪</div>
            <div style={{ fontWeight: 900, fontSize: "1.25rem" }}>Marketplace</div>
            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Unlock premium profile cosmetics.</div>
          </Link>
        </div>
      </div>
    </Shell>
  );
}
