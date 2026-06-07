"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { logout } from "@/lib/auth";
import "./globals.css";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  // still checking auth
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}>
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  // not logged in — render nothing while redirect happens
  if (!user && pathname !== "/login") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
      }}>
        <p style={{ color: "var(--text-muted)" }}>Redirecting...</p>
      </div>
    );
  }

  // on login page — just show it with no navbar
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // logged in — show full app
  return (
    <>
      <nav style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        padding: "0.875rem 2rem",
        display: "flex",
        gap: "1.5rem",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "1rem", letterSpacing: "0.5px" }}>
          RUNIT Fantasy
        </span>
        <a href="/" style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Home</a>
        <a href="/leaderboard" style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Leaderboard</a>
        <a href="/team" style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>My Team</a>
        <a href="/transfers" style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Transfers</a>
        {user?.email === "yahyaayman2006@gmail.com" && (
          <a href="/admin" style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Admin</a>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{user?.email}</span>
          <button
            onClick={() => logout().then(() => router.replace("/login"))}
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              padding: "0.35rem 0.85rem",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.8rem",
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main style={{ padding: "2rem" }}>{children}</main>
    </>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AuthGuard>{children}</AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
