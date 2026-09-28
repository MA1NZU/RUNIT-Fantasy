"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

type CoinGrant = {
  teamId: string;
  amount: number;
  gameweek: number;
  grantedAt: string;
};

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

// Shows a one-time popup the next time a manager opens the website after the
// admin grants ranking coins. Dismissing it saves lastGwCoinsAckAt on their
// userTeams document so the same grant never shows twice.
export default function CoinsPopup() {
  const { user } = useAuth();
  const [grant, setGrant] = useState<CoinGrant | null>(null);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let active = true;

    const loadGrant = async () => {
      const userEmail = String(user?.email || "").trim();
      const userUid = user?.uid;

      if (!userEmail || !userUid) {
        setGrant(null);
        return;
      }

      try {
        const [byUidResult, byEmailResult] = await Promise.allSettled([
          getDocs(
            query(
              collection(db, "userTeams"),
              where("ownerUid", "==", userUid)
            )
          ),
          getDocs(
            query(
              collection(db, "userTeams"),
              where("ownerEmail", "==", userEmail)
            )
          ),
        ]);

        if (!active) return;

        const teamDocs = [
          ...(byUidResult.status === "fulfilled"
            ? byUidResult.value.docs
            : []),
          ...(byEmailResult.status === "fulfilled"
            ? byEmailResult.value.docs
            : []),
        ];

        // Same matching order as the shop: prefer the doc carrying this
        // manager's own ownerUid, then a case-insensitive ownerEmail match.
        const teamDoc =
          teamDocs.find(
            (d) => String(d.data().ownerUid || "") === userUid
          ) ||
          teamDocs.find(
            (d) =>
              normalizeEmail(d.data().ownerEmail) ===
              normalizeEmail(userEmail)
          );

        if (!teamDoc) return;

        const data = teamDoc.data();
        const grantedAt = String(data.lastGwCoinsGrantedAt || "");
        const ackAt = String(data.lastGwCoinsAckAt || "");
        const amount = Number(data.lastGwCoinsEarned || 0);
        const gameweek = Number(data.lastGwCoinsGameweek || 0);

        if (grantedAt && grantedAt !== ackAt && amount > 0) {
          setGrant({
            teamId: teamDoc.id,
            amount,
            gameweek,
            grantedAt,
          });
        }
      } catch (err) {
        console.error("Failed to load the coin grant notification:", err);
      }
    };

    loadGrant();

    return () => {
      active = false;
    };
  }, [user]);

  const handleDismiss = async () => {
    if (!grant || dismissing) return;

    setDismissing(true);

    try {
      await updateDoc(doc(db, "userTeams", grant.teamId), {
        lastGwCoinsAckAt: grant.grantedAt,
        "Updated Date": new Date().toISOString(),
      });
    } catch (err) {
      // If the acknowledgement cannot be saved the popup simply shows again
      // on the next visit, which is safer than dropping the notification.
      console.error("Failed to acknowledge the coin grant:", err);
    }

    setGrant(null);
    setDismissing(false);
  };

  if (!grant) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Coins awarded"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 20% 10%, rgba(255, 193, 7, 0.18), transparent 40%), radial-gradient(circle at 90% 80%, rgba(3, 71, 244, 0.16), transparent 45%), var(--surface)",
          border: "1px solid rgba(255,193,7,0.35)",
          borderRadius: "26px",
          width: "100%",
          maxWidth: "420px",
          padding: "2.25rem 1.75rem",
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            width: "76px",
            height: "76px",
            borderRadius: "26px",
            background: "rgba(255,193,7,0.12)",
            border: "1px solid rgba(255,193,7,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.1rem",
            fontSize: "2.4rem",
          }}
        >
          ¢
        </div>

        <div
          style={{
            fontSize: "0.72rem",
            fontWeight: 900,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "0.4rem",
          }}
        >
          {grant.gameweek > 0
            ? `GW${grant.gameweek} Ranking Rewards`
            : "Ranking Rewards"}
        </div>

        <div
          style={{
            fontSize: "clamp(2.4rem, 8vw, 3.4rem)",
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: "var(--accent)",
            marginBottom: "0.75rem",
          }}
        >
          +{grant.amount.toLocaleString()}¢
        </div>

        <p
          style={{
            color: "var(--text-muted)",
            fontSize: "0.88rem",
            lineHeight: 1.6,
            maxWidth: "320px",
            margin: "0 auto 1.5rem",
          }}
        >
          Coins from your gameweek points ranking have been added to your shop
          balance. Spend them in the RUNIT store!
        </p>

        <button
          type="button"
          onClick={handleDismiss}
          disabled={dismissing}
          style={{
            width: "100%",
            background: "var(--blue)",
            color: "#fff",
            fontWeight: 900,
            padding: "0.9rem",
            borderRadius: "14px",
            border: "none",
            fontSize: "0.95rem",
            cursor: dismissing ? "not-allowed" : "pointer",
            opacity: dismissing ? 0.7 : 1,
          }}
        >
          {dismissing ? "..." : "Nice!"}
        </button>
      </div>
    </div>
  );
}
