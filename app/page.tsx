"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  where,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@/app/shell";

type Team = {
  id: string;
  manager: string;
  ownerEmail?: string;
  gameweekPoints: number;
  totalPoints: number;
};

type Settings = {
  currentGameweek: number;
  deadline: string;
};

const TOTAL_MANAGERS = 13;

function getTimeLeft(deadline?: string, now = Date.now()) {
  if (!deadline) return "No deadline set";

  const end = new Date(deadline).getTime();

  if (Number.isNaN(end)) return "No deadline set";

  const diff = end - now;

  if (diff <= 0) return "Deadline passed";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;

  return `${Math.max(minutes, 1)}m left`;
}

function formatDeadline(deadline?: string) {
  if (!deadline) return "Not set";

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Home() {
  const { user } = useAuth();

  const [topTeams, setTopTeams] = useState<Team[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      try {
        const [teamsSnap, settingsSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, "userTeams"),
              orderBy("totalPoints", "desc"),
              limit(5)
            )
          ),
          getDocs(collection(db, "settings")),
        ]);

        let activeGW = 7;
        let settingsData: Settings | null = null;

        if (!settingsSnap.empty) {
          settingsData = settingsSnap.docs[0].data() as Settings;
          activeGW = Number(settingsData.currentGameweek || 7);
        }

        const gwTeamsSnap = await getDocs(
          query(
            collection(db, "gameweekTeams"),
            where("gameweek", "==", activeGW)
          )
        );

        const currentGwPointsByEmail: Record<string, number> = {};

        gwTeamsSnap.docs.forEach((d) => {
          const data = d.data();
          const email = String(data.ownerEmail || "").toLowerCase();

          if (email) {
            currentGwPointsByEmail[email] = Number(data.gwPoints ?? 0);
          }
        });

        const teams = teamsSnap.docs.map((d) => {
          const data = d.data();
          const email = String(data.ownerEmail || "").toLowerCase();

          return {
            id: d.id,
            manager: data.manager || data.title || "Unknown Manager",
            ownerEmail: data.ownerEmail || "",
            totalPoints: Number(data.totalPoints || 0),
            gameweekPoints:
              currentGwPointsByEmail[email] ?? Number(data.gameweekPoints || 0),
          } as Team;
        });

        if (!mounted) return;

        setTopTeams(teams);

        if (settingsData) {
          setSettings(settingsData);
        }
      } catch (err) {
        console.error("Home load error:", err);
      }

      if (mounted) {
        setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const currentGW = settings?.currentGameweek ?? 7;
  const nextGW = currentGW + 1;
  const leader = topTeams[0];
  const podiumTeams = topTeams.slice(0, 3);
  const deadlineText = formatDeadline(settings?.deadline);
  const timeLeft = getTimeLeft(settings?.deadline, now);

  return (
    <Shell>
      <style>{`
        .home-page {
          max-width: 1120px;
          margin: 0 auto;
          padding-bottom: 3rem;
        }

        .home-hero {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--border);
          border-radius: 28px;
          padding: 2rem;
          background:
            radial-gradient(circle at 20% 10%, rgba(3, 71, 244, 0.35), transparent 32%),
            radial-gradient(circle at 90% 20%, rgba(255, 193, 7, 0.18), transparent 30%),
            linear-gradient(135deg, rgba(255,255,255,0.075), rgba(255,255,255,0.02));
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
          margin-bottom: 1.25rem;
        }

        .home-hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(to bottom, black, transparent 80%);
          pointer-events: none;
        }

        .home-hero::after {
          content: "";
          position: absolute;
          width: 260px;
          height: 260px;
          right: -90px;
          bottom: -100px;
          border-radius: 999px;
          background: rgba(3, 71, 244, 0.28);
          filter: blur(20px);
          pointer-events: none;
        }

        .hero-grid {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
          gap: 1.5rem;
          align-items: stretch;
        }

        .live-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          background: rgba(3, 71, 244, 0.15);
          border: 1px solid rgba(107, 159, 255, 0.45);
          color: #8bb5ff;
          font-size: 0.75rem;
          padding: 6px 12px;
          border-radius: 999px;
          margin-bottom: 1rem;
          font-weight: 700;
          letter-spacing: 0.2px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--accent);
          box-shadow: 0 0 0 6px rgba(255, 193, 7, 0.12);
        }

        .hero-title {
          font-size: clamp(2.4rem, 7vw, 4.75rem);
          line-height: 0.95;
          letter-spacing: -0.06em;
          font-weight: 900;
          margin: 0 0 1rem;
        }

        .hero-title span {
          color: var(--blue);
          text-shadow: 0 0 34px rgba(3, 71, 244, 0.45);
        }

        .hero-subtitle {
          max-width: 560px;
          color: var(--text-muted);
          font-size: 1rem;
          line-height: 1.7;
          margin-bottom: 1.5rem;
        }

        .cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .primary-cta,
        .secondary-cta,
        .ghost-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0.78rem 1.1rem;
          border-radius: 12px;
          font-weight: 800;
          font-size: 0.9rem;
          text-decoration: none;
          transition: transform 0.15s ease, opacity 0.15s ease, border-color 0.15s ease;
        }

        .primary-cta:hover,
        .secondary-cta:hover,
        .ghost-cta:hover {
          transform: translateY(-2px);
        }

        .primary-cta {
          background: var(--blue);
          color: #fff;
          box-shadow: 0 14px 36px rgba(3, 71, 244, 0.35);
        }

        .secondary-cta {
          background: rgba(255, 193, 7, 0.12);
          color: var(--accent);
          border: 1px solid rgba(255, 193, 7, 0.32);
        }

        .ghost-cta {
          background: rgba(255,255,255,0.045);
          color: var(--text);
          border: 1px solid var(--border);
        }

        .hero-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .hero-pill {
          color: var(--text-muted);
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.08);
          padding: 0.45rem 0.7rem;
          border-radius: 999px;
          font-size: 0.78rem;
        }

        .command-card {
          background: rgba(10, 13, 22, 0.72);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 1.25rem;
          backdrop-filter: blur(16px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .command-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .command-title {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 800;
        }

        .gw-chip {
          background: var(--blue);
          color: #fff;
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 900;
        }

        .leader-spotlight {
          background:
            linear-gradient(135deg, rgba(255,193,7,0.16), rgba(3,71,244,0.12)),
            rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 18px;
          padding: 1rem;
          margin-bottom: 0.85rem;
        }

        .leader-name {
          font-size: 1.35rem;
          font-weight: 900;
          margin-top: 0.2rem;
        }

        .leader-points {
          display: flex;
          gap: 0.65rem;
          margin-top: 1rem;
        }

        .mini-stat {
          flex: 1;
          background: rgba(0,0,0,0.22);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 0.75rem;
        }

        .mini-stat-value {
          font-weight: 900;
          font-size: 1.2rem;
        }

        .mini-stat-label {
          color: var(--text-muted);
          font-size: 0.72rem;
          margin-top: 0.2rem;
        }

        .deadline-card {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 1rem;
          align-items: center;
          background: rgba(255,255,255,0.045);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 1rem;
        }

        .deadline-time {
          font-size: 1.3rem;
          font-weight: 900;
          color: var(--accent);
