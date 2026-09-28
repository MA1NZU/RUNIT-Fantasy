"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ShopItem = { ID: string; itemName: string; itemType: string; previewImage: string; songUrl?: string; titleText?: string; titleColor?: string; };
type UserTeam = { id: string; manager: string; totalPoints: number; gameweekPoints: number; coins: number; equippedAvatar?: string; equippedBanner?: string; equippedSong?: string; equippedTitle?: string; ownerEmail: string; showInLeaderboard?: boolean; };

declare global { interface Window { onYouTubeIframeAPIReady: () => void; YT: any; } }

function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function ProfileContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get("email");
  const targetEmail = queryEmail || user?.email;
  const isOwnProfile = !queryEmail || queryEmail === user?.email;

  const [team, setTeam] = useState<UserTeam | null>(null);
  const [items, setItems] = useState<Record<string, ShopItem>>({});
  const [rank, setRank] = useState<number | string>("—");
  const [gwRank, setGwRank] = useState<number | string>("—");
  const [nextUp, setNextUp] = useState<{ name: string; totalPoints: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);

  useEffect(() => {
    if (!targetEmail) return;
    const loadProfile = async () => {
      setLoading(true);
      try {
        const teamSnap = await getDocs(query(collection(db, "userTeams"), where("ownerEmail", "==", targetEmail)));
        if (teamSnap.empty) { setTeam(null); setLoading(false); return; }
        const teamData = { id: teamSnap.docs[0].id, ...teamSnap.docs[0].data() } as UserTeam;
        setTeam(teamData);
        setNewName(teamData.manager);

        const allTeamsSnap = await getDocs(collection(db, "userTeams"));
        const allTeams = allTeamsSnap.docs
          .map(d => d.data() as UserTeam)
          .filter(team => team.showInLeaderboard !== false)
          .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
        setRank("—");
        setGwRank("—");
        setNextUp(null);
        const userIndex = allTeams.findIndex(t => t.ownerEmail === targetEmail);
        if (userIndex !== -1) {
          setRank(userIndex + 1);
          if (userIndex > 0) {
            const above = allTeams[userIndex - 1];
            setNextUp({
              name: above.manager || "the manager above",
              totalPoints: Number(above.totalPoints || 0),
            });
          }
        }
        const gwSorted = [...allTeams].sort(
          (a, b) => (b.gameweekPoints || 0) - (a.gameweekPoints || 0)
        );
        const gwIndex = gwSorted.findIndex(t => t.ownerEmail === targetEmail);
        if (gwIndex !== -1) setGwRank(gwIndex + 1);

        const equippedIds = [teamData.equippedAvatar, teamData.equippedBanner, teamData.equippedSong, teamData.equippedTitle].filter(Boolean) as string[];
        if (equippedIds.length > 0) {
          const shopSnap = await getDocs(collection(db, "shopItems"));
          const shopMap: Record<string, ShopItem> = {};
          shopSnap.docs.forEach(d => {
            const data = d.data() as ShopItem;
            if (equippedIds.includes(data.ID)) shopMap[data.ID] = data;
          });
          setItems(shopMap);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    loadProfile();
  }, [targetEmail]);

  useEffect(() => {
    const songItem = team?.equippedSong ? items[team.equippedSong] : null;
    const ytId = songItem?.songUrl ? getYouTubeId(songItem.songUrl) : null;
    if (!ytId) return;
    const initPlayer = () => {
        if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
        playerRef.current = new window.YT.Player('yt-player-hidden', {
            height: '0', width: '0', videoId: ytId,
            playerVars: { controls: 0, modestbranding: 1, rel: 0, showinfo: 0 },
            events: {
                onReady: (event: any) => { setPlayerReady(true); event.target.setVolume(volume); },
                onStateChange: (event: any) => setIsPlaying(event.data === window.YT.PlayerState.PLAYING)
            }
        });
    }
    if (window.YT && window.YT.Player) { initPlayer(); } 
    else {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        window.onYouTubeIframeAPIReady = initPlayer;
    }
    return () => { if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; } };
  }, [team, items]);

  const togglePlay = () => {
    if (!playerRef.current || !playerReady) return;
    isPlaying ? playerRef.current.pauseVideo() : playerRef.current.playVideo();
  };

  const handleUpdateName = async () => {
    if (!team || !newName.trim() || !isOwnProfile) return;
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

  if (loading) return <p style={{ padding: "2rem" }}>Loading Profile...</p>;
  if (!team) return <p style={{ padding: "2rem" }}>Profile not found.</p>;

  const avatarItem = team.equippedAvatar ? items[team.equippedAvatar] : null;
  const bannerItem = team.equippedBanner ? items[team.equippedBanner] : null;
  const songItem = team.equippedSong ? items[team.equippedSong] : null;
  const titleItem = team.equippedTitle ? items[team.equippedTitle] : null;
  const ytId = songItem?.songUrl ? getYouTubeId(songItem.songUrl) : null;
  const songThumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;

  const overallRankNumber = typeof rank === "number" ? rank : 0;
  const gwRankNumber = typeof gwRank === "number" ? gwRank : 0;
  const statCards = [
    { icon: "📊", label: "Total Points", value: Number(team.totalPoints || 0).toLocaleString(), color: "#fff" },
    { icon: "🏆", label: "Overall Rank", value: typeof rank === "number" ? (rank === 1 ? "👑 #1" : `#${rank}`) : "—", color: "var(--accent)" },
    { icon: "⚡", label: "GW Points", value: Number(team.gameweekPoints || 0).toLocaleString(), color: "#fff" },
    { icon: "🎯", label: "GW Rank", value: typeof gwRank === "number" ? `#${gwRank}` : "—", color: "var(--accent)" },
  ];
  if (isOwnProfile) {
    statCards.push({ icon: "🪙", label: "Coins", value: `${Number(team.coins || 0).toLocaleString()}¢`, color: "var(--accent)" });
  }
  const badges = [
    { icon: "🎫", label: "Manager", desc: "Owns a team", unlocked: true },
    { icon: "🏆", label: "Champion", desc: "Hold rank #1 overall", unlocked: overallRankNumber === 1 },
    { icon: "🏅", label: "Podium", desc: "Reach the top 3 overall", unlocked: overallRankNumber >= 2 && overallRankNumber <= 3 },
    { icon: "⭐", label: "GW Star", desc: "Reach the top 3 this gameweek", unlocked: gwRankNumber >= 1 && gwRankNumber <= 3 },
    { icon: "🪙", label: "Collector", desc: "Hold 1,000+ coins", unlocked: Number(team.coins || 0) >= 1000 },
    { icon: "🎨", label: "Stylish", desc: "Equip an avatar, banner or title", unlocked: !!(avatarItem || bannerItem || titleItem) },
    { icon: "🎵", label: "DJ", desc: "Equip a theme song", unlocked: !!songItem },
  ];

  return (
    <div className="page-container profile-page" style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div className="profile-card" style={{ background: "var(--surface)", borderRadius: "24px", border: "1px solid var(--border)", overflow: "hidden", position: "relative", marginBottom: "1.5rem", boxShadow: "0 20px 50px rgba(0,0,0,0.2)" }}>
          <div className="profile-banner" style={{ height: "240px", background: "#111", position: "relative" }}>
            {bannerItem ? <img src={getImageUrl(bannerItem.previewImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #0347F4 0%, #7c3aed 100%)" }} />}
            {isOwnProfile && <Link href="/inventory" style={{ position: "absolute", top: "1.25rem", right: "1.25rem", background: "rgba(0,0,0,0.6)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "30px", fontSize: "0.75rem", fontWeight: 700, textDecoration: "none", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)" }}>Customize</Link>}
          </div>
          <div className="profile-card-body" style={{ padding: "0 3rem 3rem", textAlign: "center" }}>
            <div className="profile-avatar-wrap" style={{ width: "160px", height: "120px", margin: "-80px auto 1.5rem", position: "relative" }}>
              <div className="profile-avatar" style={{ width: "160px", height: "160px", borderRadius: "50%", border: "8px solid var(--surface)", background: "#222", overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.4)" }}>
                {avatarItem ? <img src={getImageUrl(avatarItem.previewImage)} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3.5rem", fontWeight: 800, color: "#444" }}>{team.manager.slice(0, 1)}</div>}
              </div>
            </div>
            <div className="profile-name-block" style={{ marginBottom: "2.5rem", marginTop: "2.5rem" }}>
              {editingName ? (
                <div className="profile-name-editor" style={{ display: "flex", gap: "0.5rem", justifyContent: "center", alignItems: "center" }}>
                  <input value={newName} onChange={e => setNewName(e.target.value)} style={{ background: "var(--bg)", border: "2px solid var(--blue)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "12px", fontSize: "1.75rem", fontWeight: 800, textAlign: "center", width: "300px" }} />
                  <button onClick={handleUpdateName} style={{ background: "var(--blue)", color: "#fff", border: "none", padding: "0.75rem 1.2rem", borderRadius: "12px", cursor: "pointer", fontWeight: 700 }}>Save</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <h1 className="profile-name" style={{ fontSize: "2.5rem", fontWeight: 900, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", letterSpacing: "-1px" }}>{team.manager} {isOwnProfile && <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", opacity: 0.3 }}>✏️</button>}</h1>
                  {titleItem && <div style={{ color: titleItem.titleColor || "var(--accent)", fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "3px", background: "rgba(255,255,255,0.03)", padding: "0.5rem 1.5rem", borderRadius: "40px", border: "1px solid var(--border)" }}>{titleItem.titleText || titleItem.itemName}</div>}
                </div>
              )}
            </div>
            <div className="profile-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {statCards.map((stat, index) => (
                <div key={stat.label} className="stat-card" style={{ textAlign: "center", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1rem 0.5rem", animationDelay: `${index * 0.07}s` }}>
                  <div style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>{stat.icon}</div>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "0.35rem" }}>{stat.label}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
            {typeof rank === "number" && rank === 1 ? (
              <div className="rank-progress" style={{ margin: "0 auto 1.5rem", maxWidth: "520px", background: "linear-gradient(135deg, rgba(255,193,7,0.14), rgba(255,193,7,0.05))", border: "1px solid rgba(255,193,7,0.35)", borderRadius: "16px", padding: "1rem 1.25rem", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>👑 Leading the league</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Keep it up!</span>
                </div>
                <div style={{ height: "8px", background: "rgba(0,0,0,0.35)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, var(--accent), #ffe082)", borderRadius: "99px" }} />
                </div>
              </div>
            ) : nextUp ? (
              <div className="rank-progress" style={{ margin: "0 auto 1.5rem", maxWidth: "520px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1rem 1.25rem", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>🎯 Chasing #{typeof rank === "number" ? rank - 1 : "?"}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{Math.max(nextUp.totalPoints - Number(team.totalPoints || 0), 0).toLocaleString()} pts behind {nextUp.name}</span>
                </div>
                <div style={{ height: "8px", background: "rgba(0,0,0,0.35)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, Math.round((Number(team.totalPoints || 0) / Math.max(nextUp.totalPoints, 1)) * 100))}%`, height: "100%", background: "linear-gradient(90deg, var(--blue), #8bb5ff)", borderRadius: "99px", transition: "width 0.6s ease" }} />
                </div>
              </div>
            ) : null}
            <div className="profile-achievements" style={{ marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.75rem" }}>Achievements</div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.6rem" }}>
                {badges.map((badge, index) => (
                  <div key={badge.label} title={badge.unlocked ? `${badge.label} — ${badge.desc}` : `Locked — ${badge.desc}`} className="badge-tile" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.9rem", borderRadius: "999px", border: `1px solid ${badge.unlocked ? "rgba(255,193,7,0.35)" : "var(--border)"}`, background: badge.unlocked ? "rgba(255,193,7,0.08)" : "rgba(255,255,255,0.02)", opacity: badge.unlocked ? 1 : 0.45, filter: badge.unlocked ? "none" : "grayscale(1)", animationDelay: `${0.35 + index * 0.06}s` }}>
                    <span style={{ fontSize: "1rem" }}>{badge.icon}</span>
                    <span style={{ fontSize: "0.78rem", fontWeight: 800, color: badge.unlocked ? "var(--accent)" : "var(--text-muted)" }}>{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
            {songItem && ytId && (
              <div className="profile-song-player" style={{ marginTop: "2rem", padding: "0.75rem 1.5rem", background: "rgba(0,0,0,0.4)", borderRadius: "100px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "1.5rem", textAlign: "left", maxWidth: "500px", margin: "0 auto", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05)" }}>
                <div id="yt-player-hidden" style={{ display: "none" }}></div>
                <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#000", overflow: "hidden", flexShrink: 0, border: "2px solid rgba(255,255,255,0.1)", animation: isPlaying ? "rotate 10s linear infinite" : "none" }}><img src={songThumbnail || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ fontSize: "0.6rem", color: "var(--blue)", fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.5rem" }}>Music Player {isPlaying && <div className="audio-visualizer"><span></span><span></span><span></span></div>}</div>
                   <div style={{ fontWeight: 700, fontSize: "1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#fff", marginBottom: "0.25rem" }}>{songItem.itemName}</div>
                   <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ fontSize: "0.8rem" }}>{volume === 0 ? "🔇" : "🔊"}</span><input type="range" min="0" max="100" value={volume} onChange={(e) => { const v = parseInt(e.target.value); setVolume(v); playerRef.current?.setVolume(v); }} style={{ flex: 1, height: "4px", accentColor: "var(--blue)", cursor: "pointer" }} /></div>
                </div>
                <button onClick={togglePlay} style={{ width: "44px", height: "44px", borderRadius: "50%", background: "var(--blue)", border: "none", color: "#fff", fontSize: "1.2rem", display: "flex", alignItems: "center", justifyContent: "center", cursor: playerReady ? "pointer" : "not-allowed", opacity: playerReady ? 1 : 0.5 }}>{isPlaying ? "⏸" : "▶"}</button>
              </div>
            )}
          </div>
        </div>
        <Link href={isOwnProfile ? "/team" : `/team?email=${targetEmail}`} className="action-card" style={{ display: "block", background: "var(--surface)", border: "1px solid var(--border)", padding: "2rem", borderRadius: "24px", textDecoration: "none", color: "inherit", transition: "transform 0.2s, border-color 0.2s" }}><div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🛡️</div><div style={{ fontWeight: 900, fontSize: "1.25rem" }}>{isOwnProfile ? "My Team" : "View Team"}</div><div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{isOwnProfile ? "Manage players and track points." : `Scout ${team.manager}'s active players.`}</div></Link>
        <style jsx>{`
            @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .audio-visualizer { display: flex; align-items: flex-end; gap: 2px; height: 10px; }
            .audio-visualizer span { width: 2px; background: var(--blue); animation: wave 1s ease-in-out infinite; }
            .audio-visualizer span:nth-child(2) { animation-delay: 0.2s; }
            .audio-visualizer span:nth-child(3) { animation-delay: 0.4s; }
            @keyframes wave { 0%, 100% { height: 40%; } 50% { height: 100%; } }
            @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
            .stat-card { animation: fadeUp 0.5s ease both; }
            .badge-tile { animation: fadeUp 0.5s ease both; }
            .rank-progress { animation: fadeUp 0.5s ease both; animation-delay: 0.35s; }
            .action-card:hover { transform: translateY(-4px); border-color: rgba(255,193,7,0.4); }
            .profile-banner::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%); background-size: 250% 100%; animation: shine 7s ease-in-out infinite; }
            @keyframes shine { 0%, 100% { background-position: 120% 0; } 50% { background-position: -120% 0; } }
        `}</style>
      </div>
  );
}

export default function ProfilePage() {
  return (<Shell><Suspense fallback={<p style={{ padding: "2rem" }}>Loading...</p>}><ProfileContent /></Suspense></Shell>);
}
