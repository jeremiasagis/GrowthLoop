"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { useAuth } from "@/lib/auth/AuthContext";
import { homeFor } from "@/lib/auth/access";
import { ROLES, ROLE_ORDER, type RoleKey } from "@/lib/data";

/**
 * Selector de rol para la cuenta de prueba (canSwitchRole).
 * Permite previsualizar la plataforma como cada rol.
 */
export function RoleSwitcher({ up = false, compact = false }: { up?: boolean; compact?: boolean }) {
  const { user, role, setRole } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  if (!user?.canSwitchRole || !role) return null;
  const cur = ROLES[role];

  const pick = (r: RoleKey) => {
    setRole(r);
    setOpen(false);
    router.push(homeFor(r));
  };

  return (
    <div style={{ position: "relative" }}>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 70 }} />
          <div style={{ position: "absolute", left: 0, right: 0, [up ? "bottom" : "top"]: "calc(100% + 8px)", zIndex: 71, background: "var(--elevated)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-lg)", padding: 8, animation: "fade-up .15s var(--ease)", minWidth: 240 }}>
            <div className="eyebrow" style={{ padding: "6px 8px 8px" }}>Ver la plataforma como</div>
            {ROLE_ORDER.map((k) => {
              const r = ROLES[k];
              const on = k === role;
              return (
                <button key={k} onClick={() => pick(k)}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", textAlign: "left", padding: "9px 8px", borderRadius: "var(--r-md)", background: on ? "var(--card)" : "transparent", transition: "background .12s" }}
                  onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--card-2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = on ? "var(--card)" : "transparent"; }}>
                  <span style={{ color: r.color, display: "inline-flex", marginTop: 1, flex: "none" }}><Icon name={r.icon} size={18} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{r.label}</span>
                      {on && <span style={{ color: "var(--green)", display: "inline-flex" }}><Icon name="Check" size={14} /></span>}
                    </span>
                    <span className="muted" style={{ fontSize: "var(--t-xs)", display: "block", lineHeight: 1.4, marginTop: 2 }}>{r.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <button onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 8, width: compact ? "auto" : "100%", padding: compact ? "7px 10px" : "8px 10px", borderRadius: "var(--r-md)", border: "1px solid var(--line-2)", background: "var(--card-2)", textAlign: "left" }}>
        <span style={{ width: 8, height: 8, borderRadius: 99, background: cur.color, flex: "none" }} />
        {!compact && <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Viendo como</span>}
        <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{cur.label}</span>
        <span className="muted" style={{ display: "inline-flex", marginLeft: "auto" }}><Icon name="ChevronsUpDown" size={15} /></span>
      </button>
    </div>
  );
}
