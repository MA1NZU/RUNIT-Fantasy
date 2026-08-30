"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { logout } from "@/lib/auth";
import Link from "next/link";
import SitePopup from "@/components/SitePopup";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/team", label: "My Team" },
  { href: "/transfers", label: "Transfers" },
  { href: "/shop", label: "Shop" },
  { href: "/inventory", label: "Inventory" },
  { href: "/profile", label: "Profile" },
];

const ADMIN_EMAIL = "yahyaayman2006@gmail.com";

export default function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const handleLogout = () => {
    setMenuOpen(false);
    logout().then(() => router.replace("/login"));
  };

  if (loading) {
    return (
      <div
        className="app-state"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!user && pathname !== "/login") {
    return (
      <div
        className="app-state"
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <p style={{ color: "var(--text-muted)" }}>Redirecting...</p>
      </div>
    );
  }

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const links =
    user?.email === ADMIN_EMAIL
      ? [...NAV, { href: "/admin", label: "Admin" }]
      : NAV;

  return (
    <div className="app-shell">
      <nav
        className="site-nav"
        aria-label="Main navigation"
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          padding: "0.875rem 2rem",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div className="site-nav-bar">
          <Link
            href="/"
            className="site-brand"
            style={{
              color: "var(--accent)",
              fontWeight: 700,
              fontSize: "1rem",
              minWidth: "140px",
            }}
          >
            RUNIT Fantasy
          </Link>

          <div
            className="site-nav-links desktop-nav"
            style={{
              display: "flex",
              gap: "0.25rem",
              flex: 1,
              justifyContent: "center",
            }}
          >
            {links.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: active ? 600 : 400,
                    color: active ? "#fff" : "var(--text-muted)",
                    background: active ? "var(--blue)" : "transparent",
                    padding: "0.4rem 1rem",
                    borderRadius: "7px",
                    textDecoration: "none",
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div
            className="site-account desktop-nav"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              minWidth: "140px",
              justifyContent: "flex-end",
            }}
          >
            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
              {user?.email?.split("@")[0]}
            </span>

            <button
              type="button"
              onClick={handleLogout}
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

          <button
            type="button"
            className="mobile-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span>
            <span>Menu</span>
          </button>
        </div>

        <div
          id="mobile-navigation"
          className={`mobile-nav-panel${menuOpen ? " is-open" : ""}`}
          aria-hidden={!menuOpen}
        >
          <div className="mobile-nav-links">
            {links.map((link) => {
              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`mobile-nav-link${active ? " is-active" : ""}`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="mobile-nav-account">
            <span>{user?.email}</span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="app-shell-content">{children}</div>

      <SitePopup />
    </div>
  );
}
