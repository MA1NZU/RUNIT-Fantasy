"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function Home() {
  const [status, setStatus] = useState("Checking Firebase...");

  useEffect(() => {
    getDocs(collection(db, "test"))
      .then(() => setStatus("✅ Firebase connected!"))
      .catch(() => setStatus("❌ Firebase connection failed"));
  }, []);

  return (
    <main>
      <h1>Fantasy Game</h1>
      <p>{status}</p>
    </main>
  );
}
