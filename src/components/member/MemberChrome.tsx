"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { RoleSwitcher } from "@/components/auth/RoleSwitcher";
import { useAuth } from "@/lib/auth/AuthContext";

const TABS = [
  { href: "/member", label: "Inicio", icon: "House" },
  { href: "/member/pending", label: "Sesión", icon: "Radio" },
  { href: "/member/reflection", label: "Reflexiones", icon: "BookHeart" },
];

const isActive = (pathname: string, href: string) =>
  href === "/member" ? pathname === "/member" : pathname.startsWith(href);

export function MemberChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const firstName = (user?.name ?? "").split(" ")[0] || "miembro";
  const doLogout = () => { logout(); router.replace("/login"); };

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 78, background: "var(--bg-1)" }}>
      {/* header */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", background: "color-mix(in srgb, var(--bg-1) 88%, transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--line)" }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <RoleSwitcher compact />
          <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }} className="hide-sm">Hola, {firstName}</span>
          <button onClick={doLogout} title="Cerrar sesión"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--ink-2)", padding: "7px 10px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", fontSize: "var(--t-sm)", fontWeight: 600 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--risk)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}>
            <Icon name="LogOut" size={16} /> <span className="hide-sm">Salir</span>
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 40px" }}>{children}</main>

      {/* bottom tabs */}
      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40, display: "flex", justifyContent: "space-around", alignItems: "center", background: "color-mix(in srgb, var(--bg-2) 94%, transparent)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--line)", padding: "8px 6px calc(8px + env(safe-area-inset-bottom))" }}>
        {TABS.map((t) => {
          const on = isActive(pathname, t.href);
          return (
            <Link key={t.href} href={t.href}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, color: on ? "var(--green)" : "var(--ink-2)", minWidth: 72, padding: "2px 0" }}>
              <Icon name={t.icon} size={22} />
              <span style={{ fontSize: 11, fontWeight: 600 }}>{t.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
