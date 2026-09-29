"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, orderBy } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@///app/shell";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ShopItem = { ID: string; itemName: string; itemType: string; previewImage: string; songUrl?: string; titleText?: string; titleColor?: string; };
type UserTeam = { id: string; manager: string; totalPoints: number; gameweekPoints: number; coins: number; equippedAvatar?: string; equippedBanner?: string; equippedSong?: string; equippedTitle?: string; ownerEmail: string; showInLeaderboard?: boolean; titles?: string[]; };

type GWTeamDoc = {
  id: string;
  gameweek: number;
  gwPoints: number;
  ownerEmail: string;
};

declare global { interface Window { onYouTubeIframeAPIReady: () => void; YT: any; } }

const MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000];
const POINTS_MILESTONES = [10, 100, 250, 500, 10000, 50000];

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
  const [gwTeamsData, setGwTeamsData] = useState<GWTeamDoc[]>([]);
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

        const gwTeamsSnap = await getDocs(collection(db, "gameweekTeams"));
        setGwTeamsData(
          gwTeamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as GWTeamDoc))
        );

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

  const titlesList = Array.isArray(team.titles)
    ? team.titles.filter(
        (title) => typeof title === "string" && title.trim().length > 0
      )
    : [];

  const emailKey = String(team.ownerEmail || targetEmail || "").toLowerCase();

  const badgeStats = (() => {
    const byGW = new Map<number, { mine: number; max: number }>();

    gwTeamsData.forEach((t) => {
      const gw = Number(t.gameweek || 0);
      if (!gw) return;

      const pts = Number(t.gwPoints || 0);
      const entry = byGW.get(gw) ?? { mine: -1, max: -1 };

      if (String(t.ownerEmail || "").toLowerCase() === emailKey) {
        entry.mine = pts;
      }

      entry.max = Math.max(entry.max, pts);
      byGW.set(gw, entry);
    });

    let matches = 0;
    let firstPlaces = 0;

    byGW.forEach((entry) => {
      if (entry.mine < 0) return;
      matches += 1;
      if (entry.mine > 0 && entry.mine >= entry.max) firstPlaces += 1;
    });

    return { matches, firstPlaces };
  })();

  const badgeTracks = [
    { key: "matches", label: "Matches Played", value: badgeStats.matches, tiers: MILESTONES },
    { key: "first-places", label: "GW #1 Finishes", value: badgeStats.firstPlaces, tiers: MILESTONES },
    { key: "total-points", label: "Total Points", value: Number(team.totalPoints || 0), tiers: POINTS_MILESTONES },
  ];

  const statCards = [
    { label: "Total Points", value: Number(team.totalPoints || 0).toLocaleString(), color: "#fff" },
    { label: "Overall Rank", value: typeof rank === "number" ? (rank === 1 ? "#1" : `#${rank}`) : "—", color: "var(--accent)" },
    { label: "GW Points", value: Number(team.gameweekPoints || 0).toLocaleString(), color: "#fff" },
    { label: "GW Rank", value: typeof gwRank === "number" ? `#${gwRank}` : "—", color: "var(--accent)" },
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
                  <input value={newName} onChange={e => setNewName(e.target.value)} style={{ background: "var(--bg)", border: "2px solid var(--blue)", color: "#fff", padding: "0.5rem 1rem", borderRadius: "12px", fontSize: "1.75rem", fontWeight: 800", textAlign: "center", width: "300px" }} />
                  <button onClick={handleUpdateName} style={{ background: "var(--blue)", color: "#fff", border: "none", padding: "0.75rem 1.2rem", borderRadius: "12px", cursor: "pointer", fontWeight: 700 }}>Save</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                  <h1 className="profile-name" style={{ fontSize: "2.5rem", fontWeight: 900, margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", letterSpacing: "-1px" }}>{team.manager} {isOwnProfile && <button onClick={() => setEditingName(true)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px", padding: "0.3rem 0.45rem", borderRadius: "8px", opacity: 0.7 }}>Edit</button>}</h1>
                  {titleItem && <div style={{ color: titleItem.titleColor || "var(--accent)", fontWeight: 800, fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "3px", background: "rgba(255,255,255,0.03)", padding: "0.5rem 1.5rem", borderRadius: "40px", border: "1px solid var(--border)" }}>{titleItem.titleText || titleItem.itemName}</div>}
                </div>
              )}
            </div>
            <div className="profile-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {statCards.map((stat, index) => (
                <div key={stat.label} className="stat-card" style={{ textAlign: "center", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1.1rem 0.5rem", animationDelay: `${index * 0.07}s` }}>
                  <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "0.4rem" }}>{stat.label}</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 900, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
            {typeof rank === "number" && rank === 1 ? (
              <div className="rank-progress" style={{ margin: "0 auto 1.5rem", maxWidth: "520px", background: "linear-gradient(135deg, rgba(255,193,7,0.14), rgba(255,193,7,0.05))", border: "1px solid rgba(255,193,7,0.35)", borderRadius: "16px", padding: "1rem 1.25rem", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>Leading the league</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Keep it up!</span>
                </div>
                <div style={{ height: "8px", background: "rgba(0,0,0,0.35)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(90deg, var(--accent), #ffe082)", borderRadius: "99px" }} />
                </div>
              </div>
            ) : nextUp ? (
              <div className="rank-progress" style={{ margin: "0 auto 1.5rem", maxWidth: "520px", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "16px", padding: "1rem 1.25rem", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>Chasing #{typeof rank === "number" ? rank - 1 : "?"}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>{Math.max(nextUp.totalPoints - Number(team.totalPoints || 0), 0).toLocaleString()} pts behind {nextUp.name}</span>
                </div>
                <div style={{ height: "8px", background: "rgba(0,0,0,0.35)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, Math.round((Number(team.totalPoints || 0) / Math.max(nextUp.totalPoints, 1)) * 100))}%`, height: "100%", background: "linear-gradient(90deg, var(--blue), #8bb5ff)", borderRadius: "99px", transition: "width 0.6s ease" }} />
                </div>
              </div>
            ) : null}
            <div className="profile-titles" style={{ marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.75rem" }}>Titles</div>
              {titlesList.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.6rem" }}>
                  {titlesList.map((title, index) => (
                    <div key={title} className="badge-tile" style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.9rem", borderRadius: "999px", border: "1px solid rgba(255,193,7,0.35)", background: "rgba(255,193,7,0.08)", animationDelay: `${0.35 + index * 0.06}s` }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: "var(--accent)", flexShrink: 0 }} />
                      <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--accent)" }}>{title}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No titles yet.</div>
              )}
            </div>
            <div className="profile-badges" style={{ marginBottom: "2rem" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "0.75rem" }}>Badges</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
                {badgeTracks.map((track) => {
                  const nextTier = track.tiers.find((tier) => tier > track.value) ?? null;
                  const progress = nextTier ? Math.min(100, Math.round((track.value / nextTier) * 100)) : 100;

                  return (
                    <div key={track.key} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "16px", padding: "0.9rem", textAlign: "left" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.6rem" }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 800 }}>{track.label}</span>
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>{track.value.toLocaleString()}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginBottom: "0.65rem" }}>
                        {track.tiers.map((tier) => {
                          const unlocked = track.value >= tier;
                          const isNext = nextTier === tier;

                          return (
                            <span key={tier} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "30px", height: "24px", padding: "0 0.35rem", borderRadius: "8px", fontSize: "0.68rem", fontWeight: 900, background: unlocked ? "rgba(255,193,7,0.12)" : "rgba(255,255,255,0.03)", border: `1px solid ${unlocked ? "rgba(255,193,7,0.45)" : isNext ? "rgba(107,159,255,0.55)" : "var(--border)"}`, color: unlocked ? "var(--accent)" : isNext ? "#8bb5ff" : "var(--text-muted)" }}>
                              {tier >= 1000 ? `${tier / 1000}K` : tier}
                            </span>
                          );
                        })}
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>
                          <span>{nextTier ? `Next: ${nextTier.toLocaleString()}` : "Max tier reached"}</span>
                          <span>{nextTier ? `${track.value.toLocaleString()}/${nextTier.toLocaleString()}` : "100%"}</span>
                        </div>
                        <div style={{ height: "6px", background: "rgba(0,0,0,0.35)", borderRadius: "99px", overflow: "hidden" }}>
                          <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, var(--blue), #8bb5ff)", borderRadius: "99px" }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {songItem && ytId && (
              <div className="profile-song-player" style={{ marginTop: "2rem", padding: "0.75rem 1.5rem", background: "rgba(0,0,0,0.4)", borderRadius: "100px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "1.25rem", textAlign: "left", maxWidth: "500px", margin: "0 auto", boxShadow: "inset 0 1px 1px rgba(255,255,255,0.05)" }}>
                <div id="yt-player-hidden" style={{ display: "none" }}></div>
                <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "#000", overflow: "hidden", flexShrink: 0, border: "2px solid rgba(255,255,255,0.1)", animation: isPlaying ? "rotate 10s linear infinite" : "none" }}><img src={songThumbnail || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                   <div style={{ fontSize: "0.6rem", color: "var(--blue)", fontWeight: 800, textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.5rem" }}>Music Player {isPlaying && <div className="audio-visualizer"><span></span><span></span><span></span></div>}</div>
                   <div style={{ fontWeight: 700, fontSize: "1rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#fff", marginBottom: "0.25rem" }}>{songItem.itemName}</div>
                   <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}><span style={{ fontSize: "0.58rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Vol</span><input type="range" min="0" max="100" value={volume} onChange={(e) => { const v = parseInt(e.target.value); setVolume(v); playerRef.current?.setVolume(v); }} style={{ flex: 1, height: "4px", accentColor: "var(--blue)", cursor: "pointer" }} /></div>
                </div>
                <button onClick={togglePlay} style={{ height: "40px", padding: "0 1.05rem", borderRadius: "999px", background: "var(--blue)", border: "none", color: "#fff", fontSize: "0.68rem", fontWeight: 900, letterSpacing: "0.8px", display: "flex", alignItems: "center", justifyContent: "center", cursor: playerReady ? "pointer" : "not-allowed", opacity: playerReady ? 1 : 0.5, flexShrink: 0 }}>{isPlaying ? "PAUSE" : "PLAY"}</button>
              </div>
            )}
          </div>
        </div>
        <Link href={isOwnProfile ? "/team" : `/team?email=${targetEmail}`} className="profile-team-button" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.3rem", background: "var(--blue)", color: "#fff", padding: "1.1rem 2rem", borderRadius: "14px", textDecoration: "none", fontWeight: 900, fontSize: "1.05rem", margin: "0 auto", maxWidth: "420px", transition: "transform 0.2s ease" }}>
          <span>{isOwnProfile ? "My Team" : "View Team"}</span>
          <span style={{ fontSize: "0.78rem", fontWeight: 600, opacity: 0.85 }}>{isOwnProfile ? "Manage players and track points." : `Scout ${team.manager}'s active players.`}</span>
        </Link>
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
            .profile-team-button:hover { transform: translateY(-3px); }
            @media (max-width: 640px) {
              .profile-stats { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 0.45rem !important; }
              .profile-stats .stat-card { padding: 0.75rem 0.25rem !important; }
              .profile-stats .stat-card > div:first-child { font-size: 0.5rem !important; letter-spacing: 0.5px !important; margin-bottom: 0.3rem !important; }
              .profile-stats .stat-card > div:last-child { font-size: 1.05rem !important; }
            }
            .profile-banner::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%); background-size: 250% 100%; animation: shine 7s ease-in-out infinite; }
            @keyframes shine { 0%, 100% { background-position: 120% 0; } 50% { background-position: -120% 0; } }
        `}</style>
      </div>
  );
}

export default function ProfilePage() {
  return (<Shell><Suspense fallback={<p style={{ padding: "2rem" }}>Loading...</p>}><ProfileContent /></Suspense></Shell>);
}
