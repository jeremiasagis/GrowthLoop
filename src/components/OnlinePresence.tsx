"use client";

/* Avatares "en línea" — quién está viendo el mismo equipo ahora.
   Se alimenta de usePresence. Se oculta si estás solo. */

import { Avatar } from "@/components/ui";
import type { PresentUser } from "@/lib/presence";

export function OnlinePresence({ users, max = 5, hideIfAlone = true }: { users: PresentUser[]; max?: number; hideIfAlone?: boolean }) {
  if (!users.length || (hideIfAlone && users.length <= 1)) return null;
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }} title={users.map((u) => u.name).join(", ")}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: "var(--green)", boxShadow: "0 0 7px var(--green)", animation: "glow-pulse 1.6s infinite", flex: "none" }} />
      <div style={{ display: "inline-flex", alignItems: "center" }}>
        {shown.map((u, i) => (
          <div key={u.userId} style={{ marginLeft: i === 0 ? 0 : -8, border: "2px solid var(--bg-2)", borderRadius: 99, position: "relative", zIndex: shown.length - i }}>
            <Avatar name={u.name} initials={u.initials} size={24} idx={i} />
          </div>
        ))}
        {extra > 0 && <span style={{ marginLeft: -6, width: 24, height: 24, borderRadius: 99, background: "var(--card-2)", border: "2px solid var(--bg-2)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, color: "var(--ink-2)" }}>+{extra}</span>}
      </div>
      <span className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600 }}>{users.length} en línea</span>
    </div>
  );
}
