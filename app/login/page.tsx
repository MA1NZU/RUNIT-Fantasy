"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail, loginWithGoogle, resetPassword } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmail = async () => {
    setError("");
    setMessage("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push("/");
    } catch {
      setError("Invalid email or password.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    setMessage("");
    try {
      await loginWithGoogle();
      router.push("/");
    } catch {
      setError("Google sign-in failed.");
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    setMessage("");
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setMessage("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError("Failed to send reset email. Verify your email is correct.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "2.5rem",
        width: "100%",
        maxWidth: "400px",
      }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--accent)", marginBottom: "0.5rem" }}>
          RUNIT Fantasy
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>Sign in to your account</p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              fontSize: "1rem",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEmail()}
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                fontSize: "1rem",
                outline: "none",
              }}
            />
            <button 
              onClick={handleForgotPassword}
              type="button"
              style={{ 
                alignSelf: "flex-end", 
                background: "none", 
                border: "none", 
                color: "var(--blue)", 
                fontSize: "0.75rem", 
                cursor: "pointer",
                padding: 0,
                opacity: 0.8
              }}
            >
              Forgot Password?
            </button>
          </div>
        </div>

        {error && (
          <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>
        )}
        {message && (
          <p style={{ color: "var(--green)", fontSize: "0.85rem", marginBottom: "1rem" }}>{message}</p>
        )}

        <button
          onClick={handleEmail}
          disabled={loading}
          style={{
            width: "100%",
            background: "var(--accent)",
            color: "#000",
            fontWeight: 700,
            padding: "0.75rem",
            borderRadius: "8px",
            border: "none",
            fontSize: "1rem",
            cursor: loading ? "default" : "pointer",
            marginBottom: "0.75rem",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Please wait..." : "Sign in with Email"}
        </button>

        <button
          onClick={handleGoogle}
          type="button"
          style={{
            width: "100%",
            background: "var(--surface)",
            color: "var(--text)",
            fontWeight: 600,
            padding: "0.75rem",
            borderRadius: "8px",
            border: "1px solid var(--border)",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
