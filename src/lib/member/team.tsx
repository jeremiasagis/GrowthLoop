"use client";

/* ============================================================
   Equipo activo del miembro (multi-equipo).
   Un miembro puede pertenecer a varios equipos (misma org u otra).
   El equipo elegido se guarda en localStorage; por defecto, el del perfil.
   ============================================================ */

import { createContext, useContext, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth/AuthContext";

type Ctx = { teamId?: string; setTeamId: (id: string) => void };
const MemberTeamCtx = createContext<Ctx | null>(null);

export function MemberTeamProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [override, setOverride] = useState<string | null>(() => {
    try { return localStorage.getItem("gl-member-team"); } catch { return null; }
  });
  const setTeamId = (id: string) => {
    setOverride(id);
    try { localStorage.setItem("gl-member-team", id); } catch { /* */ }
  };
  return <MemberTeamCtx.Provider value={{ teamId: override ?? user?.teamId, setTeamId }}>{children}</MemberTeamCtx.Provider>;
}

export function useMemberTeam(): Ctx {
  return useContext(MemberTeamCtx) ?? { teamId: undefined, setTeamId: () => {} };
}
