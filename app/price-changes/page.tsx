"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import Shell from "@//app/shell";

type Player = {
  id: string;
  name: string;
  game: string;
  price: number;
  points: number;
  totalPoints: number;
  desc: string;
  image?: string;
  ID?: string;
  showInTransfers?: boolean;
};

type StatDoc = {
  id: string;
  player?: string;
  Title?: string;
  gameweek?: number;
  gwPoints?: number;
};

// 100% = par: this many points per million of the player's price.
const PAR_POINTS_PER_MILLION = 3;

type PriceRow = {
  player: Player;
  lastGW: number | null;
  lastPts: number;
  totalPts: number;
  performance: number | null;
  status: "rising" | "steady" | "falling" | "none";
};

const STATUS_META: Record<
  PriceRow["status"],
  { label: string; color: string; bg: string; border: string; arrow: string }
> = {
  rising: {
    label: "Rising",
    color: "var(--green)",
    bg: "rgba(34,197,94,0.1)",
    border: "rgba(34,197,94,0.4)",
    arrow: "↑",
  },
  steady: {
    label: "Steady",
    color: "#8bb5ff",
    bg: "rgba(3,71,244,0.1)",
    border: "rgba(107,159,255,0.4)",
    arrow: "→",
  },
  falling: {
    label: "Falling",
    color: "var(--red)",
    bg: "rgba(255,70,70,0.08)",
    border: "rgba(255,70,70,0.35)",
    arrow: "↓",
  },
  none: {
    label: "No data",
    color: "var(--text-muted)",
    bg: "rgba(255,255,255,0.03)",
    border: "var(--border)",
    arrow: "–",
  },
};

export default function PriceChangesPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [currentGW, setCurrentGW] = useState<number>(0);
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"performance" | "price" | "points">(
    "performance"
  );

  useEffect(() => {
    if (!user?.email) return;

    const load = async () => {
      setLoading(true);

      try {
        const [settingsSnap, playersSnap, statsSnap] = await Promise.all([
          getDocs(collection(db, "settings")),
          getDocs(collection(db, "players")),
          getDocs(collection(db, "playerMatchStats")),
        ]);

        let gw = 0;

        if (!settingsSnap.empty) {
          const raw = settingsSnap.docs[0].data().currentGameweek;
          const parsed = Number(raw);

          gw =
            raw !== undefined && raw !== null && Number.isFinite(parsed)
              ? parsed
              : 0;
        }

        setCurrentGW(gw);

        const stats = statsSnap.docs.map(
          (d) => ({ id: d.id, ...d.data() } as StatDoc)
        );

        const built: PriceRow[] = playersSnap.docs.map((d) => {
          const p = { id: d.id, ...d.data() } as Player;

          const aliases = new Set(
            [p.id, p.ID, p.name].filter(Boolean).map(String)
          );

          const docs = stats.filter(
            (s) =>
              String(s.id || "").startsWith(`${p.id}_gw`) ||
              aliases.has(String(s.player || "")) ||
              aliases.has(String(s.Title || ""))
          );

          const entries = docs
            .map((s) => ({
              gw: Number(s.gameweek || 0),
              pts: Number(s.gwPoints || 0),
            }))
            .filter((e) => e.gw > 0)
            .sort((a, b) => a.gw - b.gw);

          const last = entries.length > 0 ? entries[entries.length - 1] : null;
          const price = Number(p.price || 0);

          let performance: number | null = null;

          if (last && price > 0) {
            performance = Math.round(
              (last.pts / (price * PAR_POINTS_PER_MILLION)) * 100
            );
          }

          const status: PriceRow["status"] =
            performance === null
              ? "none"
              : performance >= 100
              ? "rising"
              : performance >= 50
              ? "steady"
              : "falling";

          return {
            player: p,
            lastGW: last ? last.gw : null,
            lastPts: last ? last.pts : 0,
            totalPts: Number(p.totalPoints ?? 0),
            performance,
            status,
          };
        });

        setRows(built.filter((row) => row.player.showInTransfers !== false));
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    };

    load();
  }, [user]);

  const uniqueGames = Array.from(
    new Set(rows.map((row) => row.player.game).filter(Boolean))
  ).sort();

  const visibleRows = rows
    .filter((row) => gameFilter === "all" || row.player.game === gameFilter)
    .sort((a, b) => {
      if (sortBy === "price") {
        return (
          Number(b.player.price || 0) - Number(a.player.price || 0) ||
          a.player.name.localeCompare(b.player.name)
        );
      }

      if (sortBy === "points") {
        return (
          b.totalPts - a.totalPts || a.player.name.localeCompare(b.player.name)
        );
      }

      return (
        (b.performance ?? -1) - (a.performance ?? -1) ||
        a.player.name.localeCompare(b.player.name)
      );
    });

  if (loading) {
    return (
      <Shell>
        <main className="page-container" style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <p style={{ padding: "2rem" }}>Loading Price Changes...</p>
        </main>
      </Shell>
    );
  }

  return (
    <Shell>
      <main
        className="page-container price-changes-page"
        style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "3rem" }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 900, marginBottom: "0.5rem" }}>
          Price Changes
        </h1>

        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            lineHeight: 1.6,
            marginBottom: "1.25rem",
            maxWidth: "640px",
          }}
        >
          Every gameweek each player earns a performance score: their latest
          gameweek points measured against their current price. 100% means
          hitting par — {PAR_POINTS_PER_MILLION} points per million. Above par
          the price is under pressure to rise, below par to fall. Display
          only — transfer prices never change automatically, so budgets
          always stay safe.
        </p>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: "1.25rem",
          }}
        >
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: "12px",
              padding: "0.7rem 0.9rem",
              fontWeight: 700,
              outline: "none",
            }}
          >
            <option value="all">All games</option>
            {uniqueGames.map((game) => (
              <option key={game} value={game}>
                {game}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as "performance" | "price" | "points")
            }
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              borderRadius: "12px",
              padding: "0.7rem 0.9rem",
              fontWeight: 700,
              outline: "none",
            }}
          >
            <option value="performance">Sort: Performance</option>
            <option value="price">Sort: Price</option>
            <option value="points">Sort: Total Points</option>
          </select>

          <span
            style={{
              marginLeft: "auto",
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              fontWeight: 800,
            }}
          >
            {currentGW > 0 ? `Current GW: ${currentGW}` : "Pre-season"}
          </span>
        </div>

        {visibleRows.length === 0 ? (
          <div
            style={{
              color: "var(--text-muted)",
              padding: "2rem",
              textAlign: "center",
            }}
          >
            No players found.
          </div>
        ) : (
          visibleRows.map((row) => {
            const meta = STATUS_META[row.status];
            const progress =
              row.performance === null
                ? 0
                : Math.min(100, Math.max(0, row.performance));

            return (
              <div
                key={row.player.id}
                className="price-row"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "46px minmax(0, 1fr) 104px minmax(90px, 1fr) 70px",
                  gap: "0.85rem",
                  alignItems: "center",
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "14px",
                  padding: "0.8rem 0.9rem",
                  marginBottom: "0.6rem",
                }}
              >
                <div
                  className="price-thumb"
                  style={{
                    width: "46px",
                    height: "46px",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "#161616",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.25)",
                    fontSize: "0.8rem",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {row.player.image ? (
                    <img
                      src={row.player.image}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    row.player.name.slice(0, 2).toUpperCase()
                  )}
                </div>

                <div className="price-info" style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: "0.9rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.player.name}
                  </div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.7rem",
                      marginTop: "0.15rem",
                    }}
                  >
                    {row.player.game}
                    {row.lastGW
                      ? ` · scored GW${row.lastGW} · ${row.lastPts} pts`
                      : " · no stats yet"}
                  </div>
                </div>

                <div
                  className="price-status"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.35rem",
                    background: meta.bg,
                    border: `1px solid ${meta.border}`,
                    color: meta.color,
                    fontSize: "0.72rem",
                    fontWeight: 900,
                    padding: "0.4rem 0.5rem",
                    borderRadius: "999px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {meta.arrow} {meta.label}
                </div>

                <div className="price-progress" style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.62rem",
                      color: "var(--text-muted)",
                      marginBottom: "0.3rem",
                      fontWeight: 700,
                    }}
                  >
                    <span>Form vs price</span>
                    <span style={{ color: meta.color }}>
                      {row.performance === null ? "—" : `${row.performance}%`}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "7px",
                      background: "rgba(0,0,0,0.35)",
                      borderRadius: "99px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        background: meta.color,
                        borderRadius: "99px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>

                <div className="price-value" style={{ textAlign: "right" }}>
                  <div
                    style={{
                      color: "var(--accent)",
                      fontWeight: 900,
                      fontSize: "1.1rem",
                      lineHeight: 1,
                    }}
                  >
                    {Number(row.player.price || 0).toFixed(1)}
                  </div>
                  <div
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.58rem",
                      marginTop: "0.2rem",
                    }}
                  >
                    million
                  </div>
                </div>
              </div>
            );
          })
        )}

        <style jsx>{`
          @media (max-width: 680px) {
            .price-row {
              grid-template-columns: 42px minmax(0, 1fr) 62px !important;
              grid-template-areas:
                "thumb info value"
                "status status status"
                "progress progress progress";
              row-gap: 0.55rem;
            }
            .price-thumb {
              grid-area: thumb;
            }
            .price-info {
              grid-area: info;
            }
            .price-status {
              grid-area: status;
              justify-self: start;
            }
            .price-progress {
              grid-area: progress;
            }
            .price-value {
              grid-area: value;
            }
          }
        `}</style>
      </main>
    </Shell>
  );
}
