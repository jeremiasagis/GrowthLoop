"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { RoleSwitcher } from "@/components/auth/RoleSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/lib/auth/AuthContext";

export function CoordinatorChrome({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const doLogout = () => { logout(); router.replace("/login"); };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-1)" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 22px", background: "color-mix(in srgb, var(--bg-1) 88%, transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <Logo />
          <div className="hide-sm" style={{ width: 1, height: 24, background: "var(--line)" }} />
          <div className="hide-sm" style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)" }}>
            <Icon name="Telescope" size={15} className="" style={{ color: "#06B6D4" }} />
            <span className="muted">Coordinación</span>
            {user?.orgName && <><span className="faint">·</span><b>{user.orgName}</b></>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ThemeToggle compact />
          <RoleSwitcher compact />
          <button onClick={() => router.push("/coordinador/perfil")} title="Mi perfil"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--ink-2)", padding: "7px 10px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", fontSize: "var(--t-sm)", fontWeight: 600 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--ink-0)"; e.currentTarget.style.borderColor = "var(--line-2)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}>
            <Icon name="UserRound" size={16} /> <span className="hide-sm">Perfil</span>
          </button>
          <button onClick={doLogout} title="Cerrar sesión"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--ink-2)", padding: "7px 10px", borderRadius: "var(--r-md)", border: "1px solid var(--line)", fontSize: "var(--t-sm)", fontWeight: 600 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--risk)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--ink-2)"; e.currentTarget.style.borderColor = "var(--line)"; }}>
            <Icon name="LogOut" size={16} /> <span className="hide-sm">Salir</span>
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 1320, margin: "0 auto" }}>{children}</main>
    </div>
  );
}
