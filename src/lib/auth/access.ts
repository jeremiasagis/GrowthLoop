/* ============================================================
   Growthloop — Reglas de acceso por rol (mock)
   ------------------------------------------------------------
   Jerarquía:
   - superadmin: dueño de la plataforma. Crea ADMINS, organizaciones
     y facilitadores. NO hace sesiones.
   - admin: gestiona su organización (organizaciones + facilitadores).
     NO hace sesiones. NO crea admins.
   - facilitator/líder: crea equipos y es el único que hace sesiones.
   - member: pertenece a equipos.
   ============================================================ */

import type { RoleKey } from "@/lib/data";

const SUPERADMIN_PREFIXES = [
  "/dashboard", "/organizaciones", "/organizacion", "/equipos", "/mis-loops", "/admins", "/consola", "/almacen",
  "/facilitadores", "/reportes", "/reporte", "/norte", "/sala", "/360", "/lab", "/ajustes",
];
const ADMIN_PREFIXES = [
  "/dashboard", "/organizaciones", "/organizacion", "/equipos", "/mis-loops",
  "/facilitadores", "/reportes", "/reporte", "/norte", "/sala", "/360", "/lab", "/ajustes",
];
const FACILITATOR_PREFIXES = [
  "/dashboard", "/organizaciones", "/equipos", "/mis-loops",
  "/sesiones", "/foda", "/sala", "/360", "/reportes", "/reporte", "/norte", "/lab", "/ajustes",
];
const MEMBER_PREFIXES = ["/member", "/sessions", "/sala", "/360"];
// Coordinador: observador de una organización (solo lectura, panel propio).
const COORDINATOR_PREFIXES = ["/coordinador"];

const PREFIXES: Record<RoleKey, string[]> = {
  superadmin: SUPERADMIN_PREFIXES,
  admin: ADMIN_PREFIXES,
  facilitator: FACILITATOR_PREFIXES,
  member: MEMBER_PREFIXES,
  coordinator: COORDINATOR_PREFIXES,
};

// Rutas públicas (no requieren login).
export const PUBLIC_PREFIXES = ["/login", "/invite", "/registro", "/reset"];

function matches(prefixes: string[], pathname: string): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Home de cada rol tras el login. */
export function homeFor(role: RoleKey): string {
  if (role === "member") return "/member";
  if (role === "coordinator") return "/coordinador";
  return "/dashboard";
}

/** ¿Este rol puede acceder a esta ruta? */
export function canAccess(role: RoleKey, pathname: string): boolean {
  // Unirse a una sesión por código: cualquier usuario logueado.
  if (pathname === "/join" || pathname.startsWith("/join/")) return true;
  // Crear equipo es exclusivo del facilitador (es quien arma los equipos).
  if (pathname === "/equipos/nuevo" || pathname.startsWith("/equipos/nuevo/")) {
    return role === "facilitator";
  }
  return matches(PREFIXES[role] ?? [], pathname);
}

/** ¿Es una ruta pública (sin guard)? */
export function isPublicRoute(pathname: string): boolean {
  return matches(PUBLIC_PREFIXES, pathname);
}
