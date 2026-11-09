"use client";

import { useEffect, useState } from "react";
import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

const PUSH_SW_URL = "/push-sw.js";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);

  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}

type PushStatus = "checking" | "unsupported" | "blocked" | "ready" | "on";

export default function PushSubscribe() {
  const { user } = useAuth();

  const [status, setStatus] = useState<PushStatus>("checking");
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checkStatus = async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setStatus("unsupported");

      return;
    }

    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
      setConfigured(false);
    }

    if (Notification.permission === "denied") {
      setStatus("blocked");

      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration(
        PUSH_SW_URL
      );
      const subscription = await registration?.pushManager.getSubscription();

      setStatus(subscription ? "on" : "ready");
    } catch {
      setStatus("ready");
    }
  };

  useEffect(() => {
    void checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enableNotifications = async () => {
    setError("");

    if (!user) {
      setError("Sign in first, then enable notifications.");

      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!publicKey) {
      setConfigured(false);

      return;
    }

    setBusy(true);

    try {
      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "ready");

        return;
      }

      const registration = await navigator.serviceWorker.register(PUSH_SW_URL);
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const keys = (subscription.toJSON().keys || {}) as Record<string, string>;

      // One document per device: re-subscribing on the same device just
      // overwrites its own doc, so counts never double.
      await setDoc(
        doc(db, "pushSubscriptions", encodeURIComponent(subscription.endpoint)),
        {
          ownerUid: user.uid,
          ownerEmail: String(user.email || ""),
          endpoint: subscription.endpoint,
          keys: {
            p256dh: String(keys.p256dh || ""),
            auth: String(keys.auth || ""),
          },
          createdAt: serverTimestamp(),
          "Updated Date": serverTimestamp(),
        }
      );

      setStatus("on");
    } catch (err) {
      console.error("Failed to enable notifications:", err);
      setError("Could not enable notifications on this device. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const disableNotifications = async () => {
    setError("");
    setBusy(true);

    try {
      const registration = await navigator.serviceWorker.getRegistration(
        PUSH_SW_URL
      );

      if (registration) {
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          await deleteDoc(
            doc(
              db,
              "pushSubscriptions",
              encodeURIComponent(subscription.endpoint)
            )
          );
          await subscription.unsubscribe();
        }
      }

      setStatus("ready");
    } catch (err) {
      console.error("Failed to disable notifications:", err);
      setError("Could not disable notifications. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration(
        PUSH_SW_URL
      );

      await registration?.showNotification("RUNIT Fantasy", {
        body: "It works — deadlines, rewards and league news will land here. 🔔",
        icon: "/icon.png",
        data: { url: "/" },
      });
    } catch (err) {
      console.error("Test notification failed:", err);
      setError("The test notification could not be shown.");
    }
  };

  return (
    <div
      style={{
        maxWidth: "520px",
        margin: "1.5rem auto 0",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "1.25rem",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: "0.8rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          fontWeight: 900,
          fontSize: "1rem",
        }}
      >
        <span style={{ fontSize: "1.2rem" }}>🔔</span>
        Notifications
      </div>

      <div
        style={{
          color: "var(--text-muted)",
          fontSize: "0.82rem",
          lineHeight: 1.6,
        }}
      >
        Get a phone or desktop notification for deadlines, shop drops, rewards
        and league news — even when the site is closed.
      </div>

      {status === "checking" && (
        <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Checking this device…
        </div>
      )}

      {status === "unsupported" && (
        <div
          style={{
            fontSize: "0.82rem",
            lineHeight: 1.6,
            color: "var(--text-muted)",
          }}
        >
          This browser can&apos;t receive push notifications. On iPhone, add the
          site to your Home Screen first (Share → Add to Home Screen) and open
          it from there — Android and desktop work out of the box.
        </div>
      )}

      {status === "blocked" && (
        <div
          style={{
            fontSize: "0.82rem",
            lineHeight: 1.6,
            color: "var(--text-muted)",
          }}
        >
          Notifications are blocked for this site. Allow them from the padlock
          icon in your browser&apos;s address bar, then reload this page.
        </div>
      )}

      {!configured && (
        <div
          style={{
            fontSize: "0.82rem",
            lineHeight: 1.6,
            color: "var(--text-muted)",
          }}
        >
          Notifications aren&apos;t configured on the server yet — the admin
          still needs to set the push keys.
        </div>
      )}

      {status === "ready" && configured && (
        <button
          type="button"
          onClick={enableNotifications}
          disabled={busy}
          style={{
            padding: "0.8rem",
            borderRadius: "12px",
            border: "none",
            background: busy ? "rgba(255,255,255,0.08)" : "var(--blue)",
            color: busy ? "var(--text-muted)" : "#fff",
            fontWeight: 900,
            fontSize: "0.85rem",
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Enabling…" : "Enable notifications"}
        </button>
      )}

      {status === "on" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.85rem",
              fontWeight: 800,
              color: "var(--green)",
            }}
          >
            ✓ Enabled on this device
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.6rem",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={sendTestNotification}
              style={{
                padding: "0.6rem 0.9rem",
                borderRadius: "12px",
                border: "1px solid rgba(107,159,255,0.45)",
                background: "rgba(3,71,244,0.12)",
                color: "#8bb5ff",
                fontWeight: 900,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              Send test
            </button>

            <button
              type="button"
              onClick={disableNotifications}
              disabled={busy}
              style={{
                padding: "0.6rem 0.9rem",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text-muted)",
                fontWeight: 900,
                fontSize: "0.8rem",
                cursor: busy ? "not-allowed" : "pointer",
              }}
            >
              {busy ? "Turning off…" : "Turn off"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
