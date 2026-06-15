"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar } from "@/components/ui";
import { Logo } from "@/components/AppShell";
import { RoleSwitcher } from "@/components/auth/RoleSwitcher";
import { useAuth } from "@/lib/auth/AuthContext";

const NAV = [
  { href: "/member", label: "Inicio", icon: "House" },
  { href: "/member/equipo", label: "Mi equipo", icon: "Users" },
  { href: "/member/iniciativas", label: "Iniciativas", icon: "Target" },
  { href: "/member/sesiones", label: "Sesiones", icon: "Radio" },
  { href: "/member/biblioteca", label: "Biblioteca", icon: "Library" },
  { href: "/member/reflection", label: "Reflexiones", icon: "BookHeart" },
  { href: "/member/perfil", label: "Perfil", icon: "UserRound" },
];

const isActive = (pathname: string, href: string) =>
  href === "/member" ? pathname === "/member" : pathname.startsWith(href);

function MemberFooter() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const doLogout = () => { logout(); router.replace("/login"); };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px" }}>
      <Link href="/member/perfil" title="Ver mi perfil" style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        <Avatar name={user?.name} initials={user?.initials} size={34} idx={4} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name ?? "Miembro"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--warning)", flex: "none" }} /><span className="muted" style={{ fontSize: "var(--t-xs)" }}>Miembro</span></div>
        </div>
      </Link>
      <ThemeToggle compact />
      <button onClick={doLogout} title="Cerrar sesión" style={{ color: "var(--ink-2)", padding: 8, borderRadius: "var(--r-md)", display: "inline-flex", flex: "none" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-2)"; e.currentTarget.style.color = "var(--risk)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-2)"; }}>
        <Icon name="LogOut" size={18} />
      </button>
    </div>
  );
}

function MemberSidebar() {
  const pathname = usePathname();
  return (
    <aside className="gl-sidebar" style={{ width: 248, flex: "none", background: "var(--bg-2)", borderRight: "1px solid var(--line)", height: "100vh", position: "sticky", top: 0, flexDirection: "column", padding: "20px 14px" }}>
      <div style={{ padding: "4px 8px 22px" }}><Logo /></div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
        {NAV.map((item) => {
          const on = isActive(pathname, item.href);
          return (
            <Link key={item.href} href={item.href}
              style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: "var(--r-md)", color: on ? "var(--ink-0)" : "var(--ink-2)", background: on ? "var(--card)" : "transparent", fontWeight: on ? 600 : 500, fontSize: "var(--t-base)", transition: "all .15s", borderLeft: on ? "2px solid var(--green)" : "2px solid transparent" }}
              onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--card-2)"; }}
              onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ color: on ? "var(--green)" : "var(--ink-2)", display: "inline-flex" }}><Icon name={item.icon} size={19} /></span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ marginTop: "auto", borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <RoleSwitcher up />
        <MemberFooter />
      </div>
    </aside>
  );
}

function MemberMobile() {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  return (
    <>
      <header className="gl-mobile-only" style={{ position: "sticky", top: 0, zIndex: 30, alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "color-mix(in srgb, var(--bg-1) 88%, transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--line)" }}>
        <Logo />
        <button onClick={() => setDrawer(true)} style={{ color: "var(--ink-1)", display: "inline-flex", padding: 6 }}><Icon name="Menu" size={24} /></button>
      </header>
      <nav className="gl-mobile-only" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, justifyContent: "space-around", alignItems: "center", background: "color-mix(in srgb, var(--bg-2) 94%, transparent)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--line)", padding: "8px 6px calc(8px + env(safe-area-inset-bottom))" }}>
        {NAV.filter((t) => t.href !== "/member/perfil").map((t) => {
          const on = isActive(pathname, t.href);
          return <Link key={t.href} href={t.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--green)" : "var(--ink-2)", minWidth: 60, padding: "2px 0" }}><Icon name={t.icon} size={21} /><span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span></Link>;
        })}
      </nav>
      {drawer && (
        <div className="gl-mobile-only" onClick={() => setDrawer(false)} style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(7,11,22,0.6)", backdropFilter: "blur(4px)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(280px,82%)", background: "var(--bg-2)", borderLeft: "1px solid var(--line)", padding: 18, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}><Logo /><button onClick={() => setDrawer(false)} style={{ color: "var(--ink-2)" }}><Icon name="X" size={22} /></button></div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>{NAV.map((item) => { const on = isActive(pathname, item.href); return <Link key={item.href} href={item.href} onClick={() => setDrawer(false)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px", borderRadius: "var(--r-md)", color: on ? "var(--green)" : "var(--ink-1)", background: on ? "var(--card)" : "transparent", fontWeight: 600 }}><Icon name={item.icon} size={20} />{item.label}</Link>; })}</nav>
            <div style={{ marginTop: "auto", borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 10 }}><RoleSwitcher /><MemberFooter /></div>
          </div>
        </div>
      )}
    </>
  );
}

export function MemberChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <MemberMobile />
      <div className="gl-shell">
        <MemberSidebar />
        <main className="gl-main">{children}</main>
      </div>
    </>
  );
}
