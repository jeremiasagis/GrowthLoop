/* ============================================================
   Growthloop — Usuarios de ejemplo para el auth mock
   ------------------------------------------------------------
   Mismo patrón que `repository.ts`: estos datos viven separados
   y el día que conectes Supabase Auth, reemplazás la búsqueda
   por una consulta real. Los roles usan las mismas claves que
   `ROLES` en `data.ts` (superadmin | admin | facilitator | member).
   ============================================================ */

import type { RoleKey } from "@/lib/data";

export interface MockUser {
  id: string;
  name: string;
  email: string;
  password: string;
  initials: string;
  role: RoleKey;
  orgId?: string;
  orgName?: string;
  teamId?: string;
  /** Si es true, puede cambiar de rol desde la app (cuenta de prueba). */
  canSwitchRole?: boolean;
}

/** Usuario expuesto a la app (sin la contraseña). */
export type AuthUser = Omit<MockUser, "password">;

export const MOCK_USERS: MockUser[] = [
  {
    id: "u-super", name: "Sol Vega", email: "superadmin@growthloop.com",
    password: "password", initials: "SV", role: "superadmin",
  },
  {
    id: "u-admin", name: "Roberto Méndez", email: "admin@bancandino.com",
    password: "password", initials: "RM", role: "admin", orgId: "o1", orgName: "Banco Andino",
  },
  {
    id: "u-facil", name: "Daniela Ríos", email: "daniela@bancandino.com",
    password: "password", initials: "DR", role: "facilitator", orgId: "o1", orgName: "Banco Andino",
  },
  {
    id: "u-member", name: "Juan Morales", email: "juan@bancandino.com",
    password: "password", initials: "JM", role: "member", orgId: "o1", orgName: "Banco Andino", teamId: "t1",
  },
  // Cuenta de prueba multi-rol: entra y puede cambiar de rol desde la app.
  {
    id: "u-jeremias", name: "Jeremías Agis", email: "jeremiasagis@gmail.com",
    password: "1234", initials: "JA", role: "superadmin",
    orgId: "o1", orgName: "Banco Andino", teamId: "t1", canSwitchRole: true,
  },
];

/** Busca un usuario por email + password (case-insensitive en el email). */
export function findMockUser(email: string, password: string): AuthUser | null {
  const u = MOCK_USERS.find(
    (m) => m.email.toLowerCase() === email.trim().toLowerCase() && m.password === password,
  );
  if (!u) return null;
  const { password: _pw, ...safe } = u;
  void _pw;
  return safe;
}
