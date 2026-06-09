"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

type PopupType = "news" | "reward" | "gold";

type SitePopupData = {
  id: string;
  active: boolean;
  type: PopupType;
  title: string;
  message: string;
  buttonText?: string;
  priority?: number;

  rewardItemId?: string;
  rewardItemName?: string;

  goldAmount?: number;
};

export default function SitePopup() {
  const { user } = useAuth();

  const [popup, setPopup] = useState<SitePopupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPopup = async () => {
      setLoading(true);

      try {
        const popupsSnap = await getDocs(
          query(collection(db, "sitePopups"), where("active", "==", true))
        );

        if (popupsSnap.empty) {
          setPopup(null);
          setLoading(false);
          return;
        }

        const popups = popupsSnap.docs.map((popupDoc) => ({
          id: popupDoc.id,
          ...popupDoc.data(),
        })) as SitePopupData[];

        const sortedPopups = popups.sort(
          (a, b) => Number(b.priority || 0) - Number(a.priority || 0)
        );

        for (const popupData of sortedPopups) {
          const localDismissKey = `sitePopupDismissed_${popupData.id}`;

          if (typeof window !== "undefined") {
            const dismissed = localStorage.getItem(localDismissKey);

            if (dismissed) {
              continue;
            }
          }

          if (user?.uid) {
            const claimId = `${user.uid}_${popupData.id}`;
            const claimSnap = await getDoc(doc(db, "popupClaims", claimId));

            if (claimSnap.exists()) {
              continue;
            }
          }

          setPopup(popupData);
          setLoading(false);
          return;
        }

        setPopup(null);
      } catch (err) {
        console.error("Failed to load popup:", err);
        setPopup(null);
      }

      setLoading(false);
    };

    loadPopup();
  }, [user]);

  const dismissPopup = () => {
    if (popup && typeof window !== "undefined") {
      localStorage.setItem(`sitePopupDismissed_${popup.id}`, "true");
    }

    setPopup(null);
  };

  const closeForNow = () => {
    setPopup(null);
  };

  const saveClaimRecord = async () => {
    if (!popup || !user?.uid || !user?.email) return;

    const claimId = `${user.uid}_${popup.id}`;

    await setDoc(doc(db, "popupClaims", claimId), {
      ownerUid: user.uid,
      ownerEmail: user.email,
      popupId: popup.id,
      popupType: popup.type,
      rewardItemId: popup.rewardItemId || "",
      rewardItemName: popup.rewardItemName || "",
      goldAmount: Number(popup.goldAmount || 0),
      claimedAt: serverTimestamp(),
    });

    if (typeof window !== "undefined") {
      localStorage.setItem(`sitePopupDismissed_${popup.id}`, "true");
    }
  };

  const claimItemReward = async () => {
    if (!popup) return;

    if (!user?.uid || !user?.email) {
      setError("Please sign in to claim this reward.");
      return;
    }

    if (!popup.rewardItemId) {
      setError("No reward item found.");
      return;
    }

    const claimId = `${user.uid}_${popup.id}`;
    const claimRef = doc(db, "popupClaims", claimId);
    const claimSnap = await getDoc(claimRef);

    if (claimSnap.exists()) {
      return;
    }

    const inventoryId = `${user.uid}_${popup.rewardItemId}`;

    await setDoc(
      doc(db, "userInventory", inventoryId),
      {
        ownerUid: user.uid,
        ownerEmail: user.email,

        itemId: popup.rewardItemId,
        itemName: popup.rewardItemName || "",

        source: "sitePopup",
        popupId: popup.id,
        acquiredAt: serverTimestamp(),

        ID: popup.rewardItemId,
        item: popup.rewardItemId,
      },
      { merge: true }
    );

    await saveClaimRecord();
  };

  const claimGoldReward = async () => {
    if (!popup) return;

    if (!user?.uid || !user?.email) {
      setError("Please sign in to claim this reward.");
      return;
    }

    const amount = Number(popup.goldAmount || 0);

    if (!amount || amount <= 0) {
      setError("No gold amount found.");
      return;
    }

    const claimId = `${user.uid}_${popup.id}`;
    const claimRef = doc(db, "popupClaims", claimId);
    const claimSnap = await getDoc(claimRef);

    if (claimSnap.exists()) {
      return;
    }

    const userTeamsSnap = await getDocs(
      query(collection(db, "userTeams"), where("ownerEmail", "==", user.email))
    );

    if (userTeamsSnap.empty) {
      setError("Manager team not found.");
      return;
    }

    await Promise.all(
      userTeamsSnap.docs.map((managerDoc) =>
        updateDoc(managerDoc.ref, {
          coins: increment(amount),
          lastPopupGoldAmount: amount,
          lastPopupGoldPopupId: popup.id,
          lastPopupGoldClaimedAt: serverTimestamp(),
          "Updated Date": new Date().toISOString(),
        })
      )
    );

    await saveClaimRecord();
  };

  const claimReward = async () => {
    if (!popup) return;

    setError("");
    setClaiming(true);

    try {
      if (popup.type === "reward") {
        await claimItemReward();
      }

      if (popup.type === "gold") {
        await claimGoldReward();
      }

      setClaimed(true);

      setTimeout(() => {
        setPopup(null);
      }, 1200);
    } catch (err) {
      console.error("Failed to claim reward:", err);
      setError("Failed to claim reward. Please try again.");
    }

    setClaiming(false);
  };

  if (loading || !popup) {
    return null;
  }

  const isReward = popup.type === "reward";
  const isGold = popup.type === "gold";
  const isClaimable = isReward || isGold;

  const badgeText = isGold
    ? "Free Gold"
    : isReward
    ? "Free Reward"
    : "Latest News";

  let buttonLabel = popup.buttonText || "Got it";

  if (!popup.buttonText && isReward) {
    buttonLabel = "Claim Free Item";
  }

  if (!popup.buttonText && isGold) {
    buttonLabel = `Claim ${Number(popup.goldAmount || 0).toLocaleString()}¢`;
  }

  if (claiming) {
    buttonLabel = "Claiming...";
  }

  if (claimed) {
    buttonLabel = "Claimed!";
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background:
            "radial-gradient(circle at 20% 0%, rgba(3,71,244,0.22), transparent 35%), var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "26px",
          padding: "1.5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <button
          onClick={dismissPopup}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            width: "34px",
            height: "34px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.05)",
            color: "#fff",
            cursor: "pointer",
            fontSize: "1rem",
          }}
        >
          ✕
        </button>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: isClaimable
              ? "rgba(255,193,7,0.1)"
              : "rgba(3,71,244,0.14)",
            border: isClaimable
              ? "1px solid rgba(255,193,7,0.24)"
              : "1px solid rgba(107,159,255,0.35)",
            color: isClaimable ? "var(--accent)" : "#8bb5ff",
            fontSize: "0.72rem",
            padding: "5px 10px",
            borderRadius: "999px",
            marginBottom: "0.85rem",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.7px",
          }}
        >
          {badgeText}
        </div>

        <h2
          style={{
            fontSize: "1.65rem",
            fontWeight: 900,
            lineHeight: 1.1,
            marginBottom: "0.75rem",
            paddingRight: "2rem",
          }}
        >
          {popup.title}
        </h2>

        <p
          style={{
            color: "var(--text-muted)",
            lineHeight: 1.7,
            fontSize: "0.95rem",
            marginBottom: "1.25rem",
            whiteSpace: "pre-line",
          }}
        >
          {popup.message}
        </p>

        {isReward && popup.rewardItemName && (
          <div
            style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "0.85rem 1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                marginBottom: "0.25rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.7px",
              }}
            >
              Reward Item
            </div>

            <div
              style={{
                fontWeight: 900,
                color: "var(--accent)",
              }}
            >
              {popup.rewardItemName}
            </div>
          </div>
        )}

        {isGold && (
          <div
            style={{
              background: "rgba(255,255,255,0.035)",
              border: "1px solid var(--border)",
              borderRadius: "16px",
              padding: "0.85rem 1rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                marginBottom: "0.25rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.7px",
              }}
            >
              Gold Reward
            </div>

            <div
              style={{
                fontWeight: 900,
                color: "var(--accent)",
              }}
            >
              {Number(popup.goldAmount || 0).toLocaleString()}¢
            </div>
          </div>
        )}

        {error && (
          <div
            style={{
              color: "var(--red)",
              background: "rgba(255,70,70,0.08)",
              border: "1px solid rgba(255,70,70,0.25)",
              borderRadius: "12px",
              padding: "0.75rem",
              marginBottom: "1rem",
              fontSize: "0.85rem",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
          }}
        >
          <button
            onClick={isClaimable ? claimReward : dismissPopup}
            disabled={claiming || claimed}
            style={{
              flex: 1,
              background: claimed
                ? "var(--green)"
                : isClaimable
                ? "var(--accent)"
                : "var(--blue)",
              color: isClaimable && !claimed ? "#000" : "#fff",
              border: "none",
              borderRadius: "14px",
              padding: "0.9rem 1rem",
              fontWeight: 900,
              cursor: claiming ? "default" : "pointer",
              opacity: claiming ? 0.75 : 1,
            }}
          >
            {buttonLabel}
          </button>

          {isClaimable && (
            <button
              onClick={closeForNow}
              disabled={claiming}
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                padding: "0.9rem 1rem",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
