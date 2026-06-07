"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { canAccess, homeFor } from "@/lib/auth/access";
import { GrowthMark } from "@/components/AppShell";

function FullScreenLoader() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-1)" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <span style={{ animation: "spin 1.1s linear infinite", display: "inline-flex" }}><GrowthMark size={34} /></span>
        <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Cargando…</span>
      </div>
    </div>
  );
}

/**
 * Protege un subárbol de rutas. Si no hay sesión → /login.
 * Si el rol no puede ver la ruta actual → a su home.
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, role, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (role && !canAccess(role, pathname)) {
      router.replace(homeFor(role));
    }
  }, [loading, isAuthenticated, role, pathname, router]);

  if (loading) return <FullScreenLoader />;
  if (!isAuthenticated) return <FullScreenLoader />;
  if (role && !canAccess(role, pathname)) return <FullScreenLoader />;
  return <>{children}</>;
}
