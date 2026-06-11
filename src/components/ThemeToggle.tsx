"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

/** Botón día/noche. Default = día (claro). Persiste en localStorage('gl-theme'). */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => { setDark(document.documentElement.dataset.theme === "dark"); }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    if (next) document.documentElement.dataset.theme = "dark";
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("gl-theme", next ? "dark" : "light"); } catch { /* */ }
  };

  return (
    <button
      onClick={toggle}
      title={dark ? "Cambiar a modo día" : "Cambiar a modo noche"}
      aria-label={dark ? "Modo día" : "Modo noche"}
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: compact ? "8px" : "8px 12px",
        borderRadius: "var(--r-md)", border: "1px solid var(--line-2)", background: "var(--card)",
        color: "var(--ink-1)", fontSize: "var(--t-sm)", fontWeight: 600,
      }}
    >
      <Icon name={dark ? "Sun" : "Moon"} size={16} style={{ color: dark ? "var(--warning)" : "var(--violet)" }} />
      {!compact && (dark ? "Modo día" : "Modo noche")}
    </button>
  );
}
