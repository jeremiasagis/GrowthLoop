"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./icon";
import { Avatar, Button } from "./ui";
import { ROLES, type RoleKey } from "@/lib/data";
import { useAuth } from "@/lib/auth/AuthContext";
import { RoleSwitcher } from "./auth/RoleSwitcher";
import { ThemeToggle } from "./ThemeToggle";

/* ── Brand mark: a continuous loop with a moving node ─────── */
export function GrowthMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 4 a12 12 0 1 1 -8.5 3.5" stroke="var(--green)" strokeWidth="3" strokeLinecap="round"
        style={{ filter: "drop-shadow(0 0 4px var(--green-glow))" }} />
      <path d="M7.5 7.5 L7.5 13 M7.5 7.5 L13 7.5" stroke="var(--green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 4px var(--green-glow))" }} />
      <circle cx="16" cy="4" r="3" fill="var(--green)" style={{ filter: "drop-shadow(0 0 5px var(--green))" }} />
    </svg>
  );
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <GrowthMark size={26} />
      {!compact && (
        <span style={{ fontWeight: 800, fontSize: "var(--t-md)", letterSpacing: "-0.02em" }}>
          Growth<span style={{ color: "var(--green)" }}>loop</span>
        </span>
      )}
    </div>
  );
}

/* ── Navigation model (role-aware) ────────────────────────── */
interface NavItem {
  href: string;
  label: string;
  icon: string;
}

function navItemsFor(role: RoleKey | null): NavItem[] {
  const inicio = { href: "/dashboard", label: "Inicio", icon: "House" };
  const reportes = { href: "/reportes", label: "Reportes", icon: "FileBarChart" };
  const norte = { href: "/norte", label: "Norte", icon: "Compass" };
  const ajustes = { href: "/ajustes", label: "Ajustes", icon: "Settings" };
  const facilitadores = { href: "/facilitadores", label: "Facilitadores", icon: "UsersRound" };

  // Facilitador/líder: crea equipos y hace sesiones.
  if (role === "facilitator") {
    return [
      inicio,
      { href: "/mis-loops", label: "Mis loops", icon: "RefreshCw" },
      { href: "/organizaciones", label: "Mis equipos", icon: "Building2" },
      reportes, norte, ajustes,
    ];
  }
  // Superadmin: además gestiona los admins de la plataforma. No hace sesiones.
  if (role === "superadmin") {
    return [
      inicio,
      { href: "/consola", label: "Consola", icon: "LayoutDashboard" },
      { href: "/organizaciones", label: "Organizaciones", icon: "Building2" },
      { href: "/admins", label: "Admins", icon: "ShieldCheck" },
      facilitadores, reportes, norte, ajustes,
    ];
  }
  // Admin: gestiona su organización (orgs + facilitadores). No hace sesiones.
  return [
    inicio,
    { href: "/organizaciones", label: "Organizaciones", icon: "Building2" },
    facilitadores, reportes, norte, ajustes,
  ];
}

const isActive = (pathname: string, href: string) =>
  href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

/* ── User card + logout (sidebar footer) ──────────────────── */
function UserFooter() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const role = user ? ROLES[user.role] : ROLES.admin;
  const doLogout = () => { logout(); router.replace("/login"); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={() => router.push("/ajustes")} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textAlign: "left" }}>
        <Avatar name={user?.name} initials={user?.initials} size={36} idx={0} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name ?? "Invitada"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: role.color, flex: "none" }} />
            <span className="muted" style={{ fontSize: "var(--t-xs)" }}>{role.label}</span>
          </div>
        </div>
      </button>
      <ThemeToggle compact />
      <button onClick={doLogout} title="Cerrar sesión"
        style={{ color: "var(--ink-2)", padding: 8, borderRadius: "var(--r-md)", display: "inline-flex", flex: "none" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-2)"; e.currentTarget.style.color = "var(--risk)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-2)"; }}>
        <Icon name="LogOut" size={18} />
      </button>
    </div>
  );
}

/* ── Sidebar (desktop) ────────────────────────────────────── */
function Sidebar() {
  const pathname = usePathname();
  const { role } = useAuth();
  const items = navItemsFor(role);
  return (
    <aside
      className="gl-sidebar"
      style={{
        width: 248, flex: "none", background: "var(--bg-2)", borderRight: "1px solid var(--line)",
        height: "100vh", position: "sticky", top: 0, flexDirection: "column", padding: "20px 14px",
      }}
    >
      <div style={{ padding: "4px 8px 22px" }}><Logo /></div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
        {items.map((item) => {
          const on = isActive(pathname, item.href);
          return (
            <Link
              key={item.href} href={item.href}
              style={{
                display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: "var(--r-md)",
                color: on ? "var(--ink-0)" : "var(--ink-2)", background: on ? "var(--card)" : "transparent",
                fontWeight: on ? 600 : 500, fontSize: "var(--t-base)", transition: "all .15s", textAlign: "left",
                borderLeft: on ? "2px solid var(--green)" : "2px solid transparent",
              }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--card-2)"; }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ color: on ? "var(--green)" : "var(--ink-2)", display: "inline-flex" }}>
                <Icon name={item.icon} size={19} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <RoleSwitcher up />
        <UserFooter />
      </div>
    </aside>
  );
}

/* ── Mobile chrome: top bar + bottom tabs + drawer ────────── */
function MobileChrome() {
  const pathname = usePathname();
  const router = useRouter();
  const { role } = useAuth();
  const [drawer, setDrawer] = useState(false);

  const tabs: { href: string; label: string; icon: string; center?: boolean }[] =
    role === "facilitator"
      ? [
          { href: "/dashboard", label: "Inicio", icon: "House" },
          { href: "/organizaciones", label: "Equipos", icon: "Building2" },
          { href: "/sesiones", label: "Sesiones", icon: "Radio" },
          { href: "/norte", label: "Norte", icon: "Compass" },
          { href: "/reportes", label: "Reportes", icon: "FileBarChart" },
          { href: "/ajustes", label: "Perfil", icon: "User" },
        ]
      : role === "superadmin"
        ? [
            { href: "/dashboard", label: "Inicio", icon: "House" },
            { href: "/organizaciones", label: "Orgs", icon: "Building2" },
            { href: "/admins", label: "Admins", icon: "ShieldCheck" },
            { href: "/norte", label: "Norte", icon: "Compass" },
            { href: "/facilitadores", label: "Facilit.", icon: "UsersRound" },
            { href: "/ajustes", label: "Perfil", icon: "User" },
          ]
        : [
            { href: "/dashboard", label: "Inicio", icon: "House" },
            { href: "/organizaciones", label: "Orgs", icon: "Building2" },
            { href: "/norte", label: "Norte", icon: "Compass" },
            { href: "/facilitadores", label: "Facilit.", icon: "UsersRound" },
            { href: "/ajustes", label: "Perfil", icon: "User" },
          ];

  return (
    <>
      <header
        className="gl-mobile-only"
        style={{
          position: "sticky", top: 0, zIndex: 30, alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", background: "color-mix(in srgb, var(--bg-1) 88%, transparent)",
          backdropFilter: "blur(12px)", borderBottom: "1px solid var(--line)",
        }}
      >
        <Logo />
        <button onClick={() => setDrawer(true)} style={{ color: "var(--ink-1)", display: "inline-flex", padding: 6 }}>
          <Icon name="Menu" size={24} />
        </button>
      </header>

      <nav
        className="gl-mobile-only"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, justifyContent: "space-around",
          alignItems: "center", background: "color-mix(in srgb, var(--bg-2) 94%, transparent)",
          backdropFilter: "blur(12px)", borderTop: "1px solid var(--line)",
          padding: "8px 6px calc(8px + env(safe-area-inset-bottom))",
        }}
      >
        {tabs.map((t) => {
          const on = isActive(pathname, t.href);
          if (t.center) {
            return (
              <button key={t.href} onClick={() => router.push(t.href)}
                style={{ width: 50, height: 50, borderRadius: 16, background: "var(--green)", color: "#062012", display: "grid", placeItems: "center", boxShadow: "0 4px 16px rgba(0,232,122,0.4)", marginTop: -18 }}>
                <Icon name={t.icon} size={26} />
              </button>
            );
          }
          return (
            <Link key={t.href} href={t.href}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--green)" : "var(--ink-2)", minWidth: 56, padding: "2px 0" }}>
              <Icon name={t.icon} size={21} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
            </Link>
          );
        })}
      </nav>

      {drawer && (
        <div onClick={() => setDrawer(false)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(7,11,22,0.6)", backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 270, background: "var(--bg-2)", borderLeft: "1px solid var(--line)", padding: 18, animation: "fade-up .2s var(--ease)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Logo />
              <button onClick={() => setDrawer(false)} style={{ color: "var(--ink-2)" }}><Icon name="X" size={22} /></button>
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {navItemsFor(role).map((item) => {
                const on = isActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setDrawer(false)}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px", borderRadius: "var(--r-md)", color: on ? "var(--green)" : "var(--ink-1)", background: on ? "var(--card)" : "transparent", fontWeight: 600, textAlign: "left" }}>
                    <Icon name={item.icon} size={20} />{item.label}
                  </Link>
                );
              })}
            </nav>
            <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              <RoleSwitcher />
              <UserFooter />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── App shell wrapper ────────────────────────────────────── */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <MobileChrome />
      <div className="gl-shell">
        <Sidebar />
        <main className="gl-main">{children}</main>
      </div>
    </>
  );
}
