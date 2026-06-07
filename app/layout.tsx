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
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo — left */}
        <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: "1rem", letterSpacing: "0.5px", minWidth: "140px" }}>
          RUNIT Fantasy
        </span>

        {/* Nav links — center */}
        <div style={{ display: "flex", gap: "0.25rem", flex: 1, justifyContent: "center" }}>
          {[
            { href: "/", label: "Home" },
            { href: "/leaderboard", label: "Leaderboard" },
            { href: "/team", label: "My Team" },
            { href: "/transfers", label: "Transfers" },
            ...(user?.email === "yahyaayman2006@gmail.com" ? [{ href: "/admin", label: "Admin" }] : []),
          ].map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              
                key={href}
                href={href}
                style={{
                  fontSize: "0.875rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#fff" : "var(--text-muted)",
                  background: isActive ? "var(--blue)" : "transparent",
                  padding: "0.4rem 1rem",
                  borderRadius: "7px",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </a>
            );
          })}
        </div>

        {/* User + logout — right */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: "140px", justifyContent: "flex-end" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            {user?.email?.split("@")[0]}
          </span>
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
