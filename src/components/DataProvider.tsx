"use client";

import { useEffect } from "react";
import { loadData, useGLStore } from "@/lib/store";
import { GrowthMark } from "@/components/AppShell";

/**
 * Carga los datos (desde Supabase) una sola vez para las áreas
 * autenticadas. Muestra un loader breve la primera vez; después
 * la navegación es instantánea (los datos quedan en el store).
 */
export function DataProvider({ children }: { children: React.ReactNode }) {
  const loaded = useGLStore((s) => s.loaded);

  useEffect(() => {
    loadData();
  }, []);

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-1)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <span style={{ animation: "spin 1.1s linear infinite", display: "inline-flex" }}><GrowthMark size={34} /></span>
          <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Cargando datos…</span>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
