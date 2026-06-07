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

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "var(--bg)",
      }}>
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!user && pathname !== "/login") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center",
        background: "var(--bg)",
      }}>
        <p style={{ color: "var(--text-muted)" }}>Redirecting...</p>
      </div>
    );
  }

  if (pathname === "/login") return <>{children}</>;

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/leaderboard", label: "Leaderboard" },
    { href: "/team", label: "My Team" },
    { href: "/transfers", label: "Transfers" },
    ...(user?.email === "yahyaayman2006@gmail.com" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

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
        <span style={{
          color: "var(--accent)", fontWeight: 700,
          fontSize: "1rem", letterSpacing: "0.5px", minWidth: "140px",
        }}>
          RUNIT Fantasy
        </span>

        <div style={{ display: "flex", gap: "0.25rem", flex: 1, justifyContent: "center" }}>
          {navLinks.map(({ href, label }) => {
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

        <div style={{
          display: "flex", alignItems: "center",
          gap: "1rem", minWidth: "140px", justifyContent: "flex-end",
        }}>
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
