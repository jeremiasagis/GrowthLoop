"use client";

/* ============================================================
   Growthloop — Contexto de autenticación (Supabase Auth real)
   ------------------------------------------------------------
   Login/logout con Supabase Auth. El rol y los datos de la app
   vienen de la tabla `profiles` (1:1 con auth.users). La API que
   consumen los componentes (user, role, login, logout,
   isAuthenticated, loading, setRole, acceptInvite) no cambia.
   ============================================================ */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { setScope } from "@/lib/repository";
import type { RoleKey } from "@/lib/data";
import type { Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  role: RoleKey;
  orgId?: string;
  orgName?: string;
  teamId?: string;
  canSwitchRole?: boolean;
}

export interface InviteParams {
  email: string;
  password: string;
  name: string;
  role: RoleKey;
  orgId?: string;
  orgName?: string;
  teamId?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  role: RoleKey | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  setRole: (role: RoleKey) => void;
  acceptInvite: (params: InviteParams) => Promise<{ user?: AuthUser; error?: string }>;
  signupSolo: (params: { name: string; email: string; password: string }) => Promise<{ user?: AuthUser; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  updateName: (name: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function initialsFrom(name: string) {
  return name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

async function buildUser(session: Session | null): Promise<AuthUser | null> {
  if (!session?.user) return null;
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
  const email = session.user.email ?? "";
  if (!data) {
    // Sin profile (caso borde): rol por defecto member.
    return { id: session.user.id, email, name: email.split("@")[0], initials: email.slice(0, 2).toUpperCase(), role: "member" };
  }
  return {
    id: session.user.id,
    email,
    name: data.name ?? email.split("@")[0],
    initials: data.initials ?? email.slice(0, 2).toUpperCase(),
    role: (data.role ?? "member") as RoleKey,
    orgId: data.org_id ?? undefined,
    orgName: data.org_name ?? undefined,
    teamId: data.team_id ?? undefined,
    canSwitchRole: data.can_switch_role ?? false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [baseUser, setBaseUser] = useState<AuthUser | null>(null);
  const [previewRole, setPreviewRole] = useState<RoleKey | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      const u = await buildUser(data.session);
      if (active) { setBaseUser(u); setLoading(false); }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // IMPORTANTE: no llamar a Supabase (buildUser consulta `profiles`)
      // de forma síncrona dentro del callback → causa deadlock. Lo diferimos.
      setTimeout(async () => {
        const u = await buildUser(session);
        if (!active) return;
        setBaseUser(u);
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") setPreviewRole(null);
        setLoading(false);
      }, 0);
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  // Mantener el alcance de datos (qué org ve) sincronizado con el usuario/rol.
  useEffect(() => {
    setScope(baseUser ? { role: previewRole ?? baseUser.role, email: baseUser.email, orgId: baseUser.orgId } : null);
  }, [baseUser, previewRole]);

  const login = useCallback(async (email: string, password: string): Promise<AuthUser | null> => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.session) return null;
    const u = await buildUser(data.session);
    setBaseUser(u);
    setPreviewRole(null);
    return u;
  }, []);

  const logout = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setBaseUser(null);
    setPreviewRole(null);
  }, []);

  const setRole = useCallback((role: RoleKey) => {
    setBaseUser((prev) => {
      if (!prev?.canSwitchRole) return prev;
      setPreviewRole(role);
      return prev;
    });
  }, []);

  const acceptInvite = useCallback(async (p: InviteParams): Promise<{ user?: AuthUser; error?: string }> => {
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email: p.email.trim(),
      password: p.password,
      options: { data: {
        name: p.name, initials: initialsFrom(p.name), role: p.role,
        org_id: p.orgId, org_name: p.orgName, team_id: p.teamId,
      } },
    });
    if (error) return { error: error.message };
    if (!data.session) return { error: "Revisá tu correo para confirmar la cuenta." };
    // Escribimos el profile de forma determinística (rol + org + equipo de la
    // invitación). No dependemos del trigger; esto es lo que el scoping y el
    // multiplayer necesitan para saber a qué equipo/org pertenece el usuario.
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id, email: p.email.trim(), name: p.name, initials: initialsFrom(p.name),
        role: p.role, org_id: p.orgId ?? null, org_name: p.orgName ?? null, team_id: p.teamId ?? null,
      });
    }
    const u = await buildUser(data.session);
    setBaseUser(u);
    setPreviewRole(null);
    return { user: u ?? undefined };
  }, []);

  // Alta self-serve B2C: un facilitador se registra solo y se le provisiona
  // su cuenta personal (organización kind=solo, plan starter) vía RPC.
  const signupSolo = useCallback(async (p: { name: string; email: string; password: string }): Promise<{ user?: AuthUser; error?: string }> => {
    const supabase = getSupabaseBrowserClient();
    const name = p.name.trim();
    const { data, error } = await supabase.auth.signUp({
      email: p.email.trim(), password: p.password,
      options: { data: { name, initials: initialsFrom(name), role: "facilitator" } },
    });
    if (error) return { error: error.message };
    if (!data.session) return { error: "Revisá tu correo para confirmar la cuenta y después iniciá sesión." };
    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id, email: p.email.trim(), name, initials: initialsFrom(name), role: "facilitator",
      });
      const { error: provErr } = await supabase.rpc("signup_solo_facilitator", { p_name: name });
      if (provErr) return { error: provErr.message };
    }
    const u = await buildUser(data.session);
    setBaseUser(u);
    setPreviewRole(null);
    return { user: u ?? undefined };
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<{ error?: string }> => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset`,
    });
    return { error: error?.message };
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<{ error?: string }> => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message };
  }, []);

  const updateName = useCallback(async (name: string): Promise<{ error?: string }> => {
    const supabase = getSupabaseBrowserClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "No hay sesión." };
    const clean = name.trim();
    const initials = initialsFrom(clean);
    const { error } = await supabase.from("profiles").update({ name: clean, initials }).eq("id", auth.user.id);
    if (error) return { error: error.message };
    // Reflejar también en el directorio (facilitadores/admins se matchean por email).
    const email = (auth.user.email ?? "").toLowerCase();
    if (email) {
      await supabase.from("facilitators").update({ name: clean, initials }).eq("email", email);
      await supabase.from("admins").update({ name: clean, initials }).eq("email", email);
    }
    setBaseUser((prev) => (prev ? { ...prev, name: clean, initials } : prev));
    return {};
  }, []);

  // Rol efectivo: si la cuenta de prueba está previsualizando otro rol, usamos ese.
  const effectiveUser: AuthUser | null = baseUser
    ? { ...baseUser, role: previewRole ?? baseUser.role }
    : null;

  const value: AuthContextValue = {
    user: effectiveUser,
    role: effectiveUser?.role ?? null,
    isAuthenticated: !!effectiveUser,
    loading,
    login,
    logout,
    setRole,
    acceptInvite,
    signupSolo,
    requestPasswordReset,
    updatePassword,
    updateName,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
