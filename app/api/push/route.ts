import { NextRequest, NextResponse } from "next/server";
import { sendNotification, setVapidDetails } from "web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StoredSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

type FirestoreListResponse = {
  documents?: Array<{
    name?: string;
    fields?: Record<string, any>;
  }>;
  nextPageToken?: string;
};

function parseSubscriptionDoc(doc: {
  name?: string;
  fields?: Record<string, any>;
}): StoredSubscription | null {
  const fields = doc.fields || {};

  const endpoint = String(fields.endpoint?.stringValue || "");
  const p256dh = String(fields.keys?.mapValue?.fields?.p256dh?.stringValue || "");
  const auth = String(fields.keys?.mapValue?.fields?.auth?.stringValue || "");

  if (!endpoint || !p256dh || !auth) return null;

  return { endpoint, keys: { p256dh, auth } };
}

/**
 * Sends a Web Push notification to every manager who enabled notifications.
 *
 * Authorization is delegated to the existing Firestore rules: the caller
 * must pass their Firebase sign-in token, and only the admin's token is
 * allowed to list the whole pushSubscriptions collection. That keeps this
 * route free of any server-side Firebase credentials — the only secret it
 * holds is the VAPID private key.
 */
export async function POST(req: NextRequest) {
  let requestBody: any;

  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const title = String(requestBody?.title || "").trim();
  const message = String(requestBody?.body || "").trim();
  const url = String(requestBody?.url || "/").trim() || "/";
  const idToken = String(requestBody?.idToken || "");

  if (!title || !message) {
    return NextResponse.json(
      { error: "A title and a message are required." },
      { status: 400 }
    );
  }

  if (!idToken) {
    return NextResponse.json(
      { error: "Missing sign-in token. Reload the admin panel and try again." },
      { status: 401 }
    );
  }

  const publicKey =
    process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  const subject =
    process.env.VAPID_SUBJECT || "mailto:admin@runit-fantasy.vercel.app";

  if (!publicKey || !privateKey) {
    return NextResponse.json(
      {
        error:
          "Push keys are not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel's environment variables, then redeploy.",
      },
      { status: 500 }
    );
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";

  if (!projectId) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_FIREBASE_PROJECT_ID." },
      { status: 500 }
    );
  }

  setVapidDetails(subject, publicKey, privateKey);

  // Load every stored subscription through the Firestore REST API using the
  // caller's sign-in token. The security rules decide who may read them:
  // only the admin can list the whole collection.
  const subscriptions: StoredSubscription[] = [];
  let pageToken = "";

  try {
    do {
      const listUrl =
        `https://firestore.googleapis.com/v1/projects/${projectId}` +
        `/databases/(default)/documents/pushSubscriptions?pageSize=300` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "");

      const listRes = await fetch(listUrl, {
        headers: { Authorization: `Bearer ${idToken}` },
        cache: "no-store",
      });

      if (listRes.status === 401 || listRes.status === 403) {
        return NextResponse.json(
          {
            error:
              "Not allowed. Publish the updated Firestore rules and make sure you are signed in as the admin.",
          },
          { status: 403 }
        );
      }

      if (!listRes.ok) {
        return NextResponse.json(
          {
            error: `Could not read push subscriptions (Firestore responded ${listRes.status}).`,
          },
          { status: 502 }
        );
      }

      const data = (await listRes.json()) as FirestoreListResponse;

      (data.documents || []).forEach((doc) => {
        const subscription = parseSubscriptionDoc(doc);

        if (subscription) subscriptions.push(subscription);
      });

      pageToken = data.nextPageToken || "";
    } while (pageToken);
  } catch (err) {
    console.error("Failed to load push subscriptions:", err);

    return NextResponse.json(
      { error: "Failed to load push subscriptions." },
      { status: 500 }
    );
  }

  if (subscriptions.length === 0) {
    return NextResponse.json({
      sent: 0,
      failed: 0,
      removedExpired: 0,
      total: 0,
      message: "No managers have enabled notifications yet.",
    });
  }

  const payload = JSON.stringify({ title, body: message, url });

  const results = await Promise.allSettled(
    subscriptions.map((subscription) => sendNotification(subscription, payload))
  );

  let sent = 0;
  const expired: StoredSubscription[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      sent += 1;

      return;
    }

    const statusCode = Number(
      (result.reason as any)?.statusCode || 0
    );

    // 404 / 410 mean the browser threw the subscription away — the doc is
    // stale and should be removed so the count stays accurate.
    if (statusCode === 404 || statusCode === 410) {
      expired.push(subscriptions[index]);
    }
  });

  if (expired.length > 0) {
    await Promise.allSettled(
      expired.map((subscription) => {
        const docId = encodeURIComponent(subscription.endpoint);
        const deleteUrl =
          `https://firestore.googleapis.com/v1/projects/${projectId}` +
          `/databases/(default)/documents/pushSubscriptions/${docId}`;

        return fetch(deleteUrl, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${idToken}` },
        });
      })
    );
  }

  return NextResponse.json({
    sent,
    failed: subscriptions.length - sent,
    removedExpired: expired.length,
    total: subscriptions.length,
  });
}
