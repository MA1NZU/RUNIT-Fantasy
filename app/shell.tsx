"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { logout } from "@/lib/auth";
import Link from "next/link";
import SitePopup from "@/components/SitePopup";

type NavIconName =
  | "home"
  | "leaderboard"
  | "team"
  | "transfers"
  | "shop"
  | "inventory"
  | "profile"
  | "admin"
  | "more";

type NavLink = {
  href: string;
  label: string;
  icon: NavIconName;
};

const NAV: NavLink[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/leaderboard", label: "Leaderboard", icon: "leaderboard" },
  { href: "/team", label: "My Team", icon: "team" },
  { href: "/transfers", label: "Transfers", icon: "transfers" },
  { href: "/shop", label: "Shop", icon: "shop" },
  { href: "/inventory", label: "Inventory", icon: "inventory" },
  { href: "/profile", label: "Profile", icon: "profile" },
];

const PRIMARY_MOBILE_HREFS = new Set([
  "/",
  "/leaderboard",
  "/team",
  "/transfers",
]);

const ADMIN_EMAIL = "yahyaayman2006@gmail.com";

function NavigationIcon({ icon }: { icon: NavIconName }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (icon) {
    case "home":
      return (
        <svg {...commonProps}>
          <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />
        </svg>
      );
    case "leaderboard":
      return (
        <svg {...commonProps}>
          <path d="M8 4h8v5a4 4 0 0 1-8 0Z" />
          <path d="M8 6H5v1a4 4 0 0 0 3 3.87M16 6h3v1a4 4 0 0 1-3 3.87M12 13v4M9 21h6M8 17h8" />
        </svg>
      );
    case "team":
      return (
        <svg {...commonProps}>
          <path d="M12 3 19 6v5c0 4.9-3.1 8.1-7 10-3.9-1.9-7-5.1-7-10V6Z" />
          <path d="m9.5 12 1.6 1.6 3.5-3.5" />
        </svg>
      );
    case "transfers":
      return (
        <svg {...commonProps}>
          <path d="M4 7h13M13 3l4 4-4 4M20 17H7M11 13l-4 4 4 4" />
        </svg>
      );
    case "shop":
      return (
        <svg {...commonProps}>
          <path d="M5 8h14l-1 12H6Z" />
          <path d="M9 9V6a3 3 0 0 1 6 0v3" />
        </svg>
      );
    case "inventory":
      return (
        <svg {...commonProps}>
          <path d="M4 7h16v13H4zM3 4h18v3H3z" />
          <path d="M10 11h4" />
        </svg>
      );
    case "profile":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        </svg>
      );
    case "admin":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.1 2.1-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56v.1h-3v-.1A1.7 1.7 0 0 0 10.7 18.64a1.7 1.7 0 0 0-1.88.34l-.06.06-2.1-2.1.06-.06A1.7 1.7 0 0 0 7.06 15a1.7 1.7 0 0 0-1.56-1.03h-.1v-3h.1A1.7 1.7 0 0 0 7.06 9.94a1.7 1.7 0 0 0-.34-1.88L6.66 8l2.1-2.1.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1.03-1.56v-.1h3v.1a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.1 2.1-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.1v3h-.1A1.7 1.7 0 0 0 19.4 15Z" />
        </svg>
      );
    case "more":
      return (
        <svg {...commonProps}>
          <circle cx="5" cy="12" r="1" fill="currentColor" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
          <circle cx="19" cy="12" r="1" fill="currentColor" />
        </svg>
      );
  }
}

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
      ? [...NAV, { href: "/admin", label: "Admin", icon: "admin" as const }]
      : NAV;
  const primaryMobileLinks = links.filter((link) =>
    PRIMARY_MOBILE_HREFS.has(link.href)
  );
  const moreMobileLinks = links.filter(
    (link) => !PRIMARY_MOBILE_HREFS.has(link.href)
  );
  const isMoreActive = moreMobileLinks.some((link) => link.href === pathname);

  const renderMobileLink = (link: NavLink) => {
    const active = pathname === link.href;

    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={() => setMenuOpen(false)}
        className={`mobile-nav-link${active ? " is-active" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        <NavigationIcon icon={link.icon} />
        <span>{link.label}</span>
      </Link>
    );
  };

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
          <div className="mobile-nav-sheet-title">More pages</div>
          <div className="mobile-nav-links mobile-nav-primary-links">
            {primaryMobileLinks.map(renderMobileLink)}
          </div>
          <div className="mobile-nav-links mobile-nav-more-links">
            {moreMobileLinks.map(renderMobileLink)}
          </div>

          <div className="mobile-nav-account">
            <span>{user?.email}</span>
            <button type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {primaryMobileLinks.map((link) => {
          const active = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`mobile-bottom-nav-item${active ? " is-active" : ""}`}
              aria-label={link.label}
              aria-current={active ? "page" : undefined}
              title={link.label}
            >
              <NavigationIcon icon={link.icon} />
            </Link>
          );
        })}

        <button
          type="button"
          className={`mobile-bottom-nav-item mobile-bottom-nav-more${
            menuOpen || isMoreActive ? " is-active" : ""
          }`}
          aria-label="More pages"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          title="More pages"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <NavigationIcon icon="more" />
        </button>
      </nav>

      <div className="app-shell-content">{children}</div>

      <SitePopup />
    </div>
  );
}
