"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";

type SitePopupData = {
  id: string;
  active: boolean;
  type: "news" | "reward" | "gold";
  title: string;
  message: string;
  buttonText?: string;

  // Free item reward
  rewardItemId?: string;
  rewardItemName?: string;

  // Free gold/coins reward
  goldAmount?: number;

  priority?: number;
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
          query(
            collection(db, "sitePopups"),
            where("active", "==", true),
            orderBy("priority", "desc"),
            limit(5)
          )
        );

        if (popupsSnap.empty) {
          setPopup(null);
          setLoading(false);
          return;
        }

        for (const popupDoc of popupsSnap.docs) {
          const data = {
            id: popupDoc.id,
            ...popupDoc.data(),
          } as SitePopupData;

          const localDismissKey = `sitePopupDismissed_${data.id}`;

          if (typeof window !== "undefined") {
            const dismissed = localStorage.getItem(localDismissKey);

            if (dismissed) {
              continue;
            }
          }

          if (user?.uid) {
            const claimId = `${user.uid}_${data.id}`;
            const claimSnap = await getDoc(doc(db, "popupClaims", claimId));

            if (claimSnap.exists()) {
              continue;
            }
          }

          setPopup(data);
          setLoading(false);
          return;
        }

        setPopup(null);
      } catch (err) {
        console.error("Failed to load popup:", err);
      }

      setLoading(false);
    };

    loadPopup();
  }, [user]);

  const closePopup = () => {
    if (popup && typeof window !== "undefined") {
      localStorage.setItem(`sitePopupDismissed_${popup.id}`, "true");
    }

    setPopup(null);
  };

  const markClaimed = async () => {
    if (!popup || !user?.uid || !user?.email) return;

    const claimId = `${user.uid}_${popup.id}`;
    const claimRef = doc(db, "popupClaims", claimId);

    await setDoc(claimRef, {
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

    if (!popup.rewardItemId) {
      setError("No reward item found.");
      return;
    }

    if (!user?.uid || !user?.email) {
      setError("Please sign in to claim this reward.");
      return;
    }

    const claimId = `${user.uid}_${popup.id}`;
    const inventoryId = `${user.uid}_${popup.rewardItemId}`;

    const claimRef = doc(db, "popupClaims", claimId);
    const inventoryRef = doc(db, "userInventory", inventoryId);

    const existingClaim = await getDoc(claimRef);

    if (existingClaim.exists()) return;

    await setDoc(
      inventoryRef,
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

    await markClaimed();
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

    const existingClaim = await getDoc(claimRef);

    if (existingClaim.exists()) return;

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

    await markClaimed();
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

  if (loading || !popup) return null;

  const isReward = popup.type === "reward";
  const isGold = popup.type === "gold";
  const isClaimable = isReward || isGold;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        zIndex: 9999,
