/* ============================================================
   Growthloop — Sesiones en vivo (multiplayer) sobre Supabase
   ------------------------------------------------------------
   El estado de la sesión vive en la base; Supabase Realtime
   sincroniza facilitador + miembros. Este módulo es la costura
   de datos del slice de Pulso (y la base para los demás pasos).
   ============================================================ */

import { getSupabaseBrowserClient } from "./supabase/client";
import { reloadData } from "./store";

export interface LiveSession {
  id: string;
  teamId: string;
  initiativeId?: string;
  type: string;       // explore | focus | proof | follow | learn
  mode: string;       // live | async
  status: string;     // live | closed
  stepKey?: string;   // paso actual (lo maneja el facilitador)
  stepIndex: number;
  createdBy?: string;
  retro?: string;     // qué retrospectiva eligió el facilitador (catálogo)
  joinCode?: string;  // código corto para unirse (QR / tipeo)
  result: Record<string, unknown>;  // resultado vivo del paso (causa raíz, etc.)
}

// Pulso: dimensión → valor 0-100 (la gente puntúa 1-5; se convierte con to100).
export type PulseResponse = Record<string, number>;
export interface Participant { userId: string; name: string; initials: string; lastSeen?: string; }
export interface SessionCard { id: string; columnKey: string; text: string; anonymous: boolean; authorId?: string; clusterId?: string; }
export interface SessionCluster { id: string; name: string; }
// userId viene enmascarado (null) salvo en tus propias filas — anonimato real a nivel base.
// voterKey = hash estable por sesión, sirve para contar votantes distintos sin identificar.
export interface SessionVote { id: string; clusterId: string; userId: string | null; voterKey: string; }
export interface SessionInput { userId: string | null; key: string; value: Record<string, unknown>; voterKey: string; }

const RETRO_NAME: Record<string, string> = {
  founding: "Sesión Fundacional", foda: "FODA del equipo",
  explore: "Exploración", focus: "Foco · impacto/esfuerzo", proof: "Ideación",
  learn: "Aprendizaje",
};

// Ciclo de mejora nuevo. Exploración es un módulo aparte (no avanza el ciclo).
const CYCLE = ["objectives", "focus", "ideation", "follow", "learn"];
// Tipo de sesión (retro) → etapa del ciclo que completa.
// "explore" como sesión de iniciativa legacy completaba el arranque del ciclo.
const TYPE_TO_STAGE: Record<string, string> = {
  explore: "objectives", objectives: "objectives", focus: "focus",
  proof: "ideation", ideation: "ideation", follow: "follow", learn: "learn",
};
function nextStageForward(current: string | undefined | null, completedType: string): string | undefined {
  const completed = TYPE_TO_STAGE[completedType];
  // Si la sesión cerrada no es una etapa del ciclo (founding/foda/exploration), no tocar la etapa.
  if (!completed || CYCLE.indexOf(completed) < 0) return current ?? undefined;
  const cur = current ? (TYPE_TO_STAGE[current] ?? current) : undefined;
  const want = CYCLE[Math.min(CYCLE.length - 1, CYCLE.indexOf(completed) + 1)];
  if (!cur || CYCLE.indexOf(cur) < 0) return want;
  return CYCLE.indexOf(want) > CYCLE.indexOf(cur) ? want : cur;
}

const newId = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapSession(r: any): LiveSession {
  return {
    id: r.id, teamId: r.team_id, initiativeId: r.initiative_id ?? undefined,
    type: r.type, mode: r.mode, status: r.status,
    stepKey: r.step_key ?? undefined, stepIndex: r.step_index ?? 0, createdBy: r.created_by ?? undefined,
    retro: r.retro ?? undefined, joinCode: r.join_code ?? undefined, result: (r.result as Record<string, unknown>) ?? {},
  };
}

// Código de sala: 5 caracteres, sin ambiguos (O/0/I/1).
const JOIN_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newJoinCode = () => Array.from({ length: 5 }, () => JOIN_CHARS[Math.floor(Math.random() * JOIN_CHARS.length)]).join("");

/** Busca una sesión EN VIVO por su código de sala (respeta RLS: solo equipos visibles). */
export async function getSessionByCode(code: string): Promise<LiveSession | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("sessions").select("*")
    .eq("join_code", code.trim().toUpperCase()).eq("status", "live")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ? mapSession(data) : null;
}

// ── Lectura ──
export async function getSession(id: string): Promise<LiveSession | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("sessions").select("*").eq("id", id).maybeSingle();
  return data ? mapSession(data) : null;
}

/** Sesiones (cerradas o no) de una iniciativa, en orden cronológico. Para ver lo facilitado por etapa. */
export async function getInitiativeSessions(initiativeId: string): Promise<LiveSession[]> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("sessions").select("*")
    .eq("initiative_id", initiativeId).order("created_at", { ascending: true });
  return (data ?? []).map(mapSession);
}

/** Todo el contenido capturado en una sesión (tarjetas reveladas, clusters, votos, inputs). */
export async function getSessionContent(sessionId: string): Promise<{ cards: SessionCard[]; clusters: SessionCluster[]; votes: SessionVote[]; inputs: SessionInput[] }> {
  const [cards, clusters, votes, inputs] = await Promise.all([
    getCards(sessionId), getClusters(sessionId), getVotes(sessionId), getInputs(sessionId),
  ]);
  return { cards, clusters, votes, inputs };
}

/** Todas las sesiones cerradas de un equipo (para consolidar Exploración). */
export async function getClosedTeamSessions(teamId: string): Promise<LiveSession[]> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("sessions").select("*")
    .eq("team_id", teamId).eq("status", "closed")
    .order("created_at", { ascending: true });
  return (data ?? []).map(mapSession);
}

/** La última sesión CERRADA de un tipo para un equipo (ej: radar anterior). */
export async function getLastClosedTeamSession(teamId: string, type: string, excludeId?: string): Promise<LiveSession | null> {
  const supabase = getSupabaseBrowserClient();
  let q = supabase.from("sessions").select("*")
    .eq("team_id", teamId).eq("type", type).eq("status", "closed")
    .order("created_at", { ascending: false }).limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q.maybeSingle();
  return data ? mapSession(data) : null;
}

/** La sesión en vivo abierta de un equipo (si hay). */
export async function getOpenSessionForTeam(teamId: string): Promise<LiveSession | null> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("sessions").select("*")
    .eq("team_id", teamId).eq("status", "live")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ? mapSession(data) : null;
}

export async function getParticipants(sessionId: string): Promise<Participant[]> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("session_participants")
    .select("user_id,name,initials,last_seen").eq("session_id", sessionId);
  return (data ?? []).map((r: any) => ({ userId: r.user_id, name: r.name, initials: r.initials, lastSeen: r.last_seen }));
}

/** Heartbeat: marca que el usuario actual sigue en la sala (para contar presentes reales). */
export async function touchPresence(sessionId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("session_participants")
    .update({ last_seen: new Date().toISOString() })
    .eq("session_id", sessionId).eq("user_id", auth.user.id);
}

export async function getPulseResponses(sessionId: string): Promise<PulseResponse[]> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("session_pulse_view")
    .select("confianza,comunic,claridad,foco,seguridad,dims").eq("session_id", sessionId);
  // Pulso nuevo: jsonb dims; respuestas viejas: las 5 columnas legacy.
  return (data ?? []).map((r: any) =>
    (r.dims as PulseResponse) ?? { confianza: r.confianza, comunic: r.comunic, claridad: r.claridad, foco: r.foco, seguridad: r.seguridad },
  );
}

export async function hasResponded(sessionId: string, userId: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("session_pulse_responses")
    .select("user_id").eq("session_id", sessionId).eq("user_id", userId).maybeSingle();
  return !!data;
}

// ── Escritura ──
export async function createLiveSession(p: { teamId: string; initiativeId?: string; type: string; retro?: string; firstStep?: string }): Promise<{ session?: LiveSession; error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  // Primer paso "real" de cada tipo (sin pulso). El pulso se antepone abajo si toca.
  const NORMAL_FIRST: Record<string, string> = { founding: "welcome", explore: "cards", focus: "matrix", proof: "ideas", learn: "result" };
  const normalFirst = p.firstStep ?? (NORMAL_FIRST[p.type] || "cards");
  // Pulso semanal: si el equipo no hizo pulso esta semana (lun–dom), la sesión arranca con el pulso.
  // La Sesión Fundacional nunca lleva pulso (es el contrato inicial).
  let firstStep = normalFirst;
  // founding/foda: arranque del equipo. teamradar: ya es una medición.
  // relationships: retro sensible, el encuadre va primero.
  if (!["founding", "foda", "teamradar", "relationships", "expclose"].includes(p.type)) {
    const { data: teamRow } = await supabase.from("teams").select("data").eq("id", p.teamId).maybeSingle();
    const lastPulseAt = (teamRow?.data as { lastPulseAt?: string } | null)?.lastPulseAt;
    const d = new Date(); const dow = (d.getDay() + 6) % 7;
    const weekStart = new Date(d); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(d.getDate() - dow);
    let needPulse = !lastPulseAt || new Date(lastPulseAt) < weekStart;
    if (!needPulse) {
      // Upgrade: si el equipo nunca midió el pulso de 8 dimensiones, lo pedimos igual.
      const { data: hasNew } = await supabase.from("pulse_points")
        .select("dims").eq("team_id", p.teamId).not("dims", "is", null).limit(1);
      if (!hasNew?.length) needPulse = true;
    }
    if (needPulse) firstStep = "pulse";
  }
  // Cerrar cualquier sesión anterior que haya quedado abierta en el equipo
  // (evita "fantasmas" en vivo y garantiza una sola sesión activa por equipo).
  await supabase.from("sessions").update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("team_id", p.teamId).eq("status", "live");
  const { data, error } = await supabase.from("sessions").insert({
    team_id: p.teamId, initiative_id: p.initiativeId ?? null, type: p.type,
    mode: "live", status: "live", step_key: firstStep, step_index: 0,
    created_by: auth.user?.id ?? null, retro: p.retro ?? null, join_code: newJoinCode(),
    // Si el pulso se antepuso, recordamos el paso pedido para retomar ahí después.
    result: p.firstStep ? { entryStep: p.firstStep } : {},
  }).select().single();
  if (error) return { error: error.message };
  return { session: mapSession(data) };
}

/** Registra al usuario actual como presente en la sala. */
export async function joinSession(sessionId: string, name: string, initials: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("session_participants").upsert(
    { session_id: sessionId, user_id: auth.user.id, name, initials, last_seen: new Date().toISOString() },
    { onConflict: "session_id,user_id" },
  );
}

export async function submitPulse(sessionId: string, r: PulseResponse): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "Sesión expirada." };
  const overall = pulseOverall(r);
  const { error } = await supabase.from("session_pulse_responses").upsert(
    {
      session_id: sessionId, user_id: auth.user.id, dims: r,
      // Columnas legacy (por compatibilidad con datos/vistas viejas).
      confianza: r.confianza ?? overall, comunic: r.comunic ?? overall, claridad: r.claridad ?? overall,
      foco: overall, seguridad: r.confianza ?? overall,
    },
    { onConflict: "session_id,user_id" },
  );
  return { error: error?.message };
}

export async function setStep(sessionId: string, stepKey: string, stepIndex: number): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.from("sessions").update({ step_key: stepKey, step_index: stepIndex }).eq("id", sessionId);
  // El timer es por paso: al avanzar/retroceder se apaga (evita timers huérfanos
  // que siguen tickeando y re-renderizando la sala para siempre).
  await supabase.rpc("merge_session_result", { p_session_id: sessionId, p_patch: { timer: null } });
}

/** Mergea valores en el resultado vivo de la sesión (atómico en el servidor; lo ven todos por Realtime). */
export async function setResult(sessionId: string, partial: Record<string, unknown>): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.rpc("merge_session_result", { p_session_id: sessionId, p_patch: partial });
}

// ── Tarjetas (anónimas o públicas) ──
export async function addCard(sessionId: string, columnKey: string, text: string, anonymous: boolean): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("session_cards").insert({
    session_id: sessionId, author_id: auth.user?.id ?? null, column_key: columnKey, text: text.trim(), anonymous,
  });
  return { error: error?.message };
}

/** Todas las tarjetas (vista que enmascara el autor de las anónimas). Solo al revelar. */
export async function getCards(sessionId: string): Promise<SessionCard[]> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("session_cards_view").select("*")
    .eq("session_id", sessionId).order("created_at", { ascending: true });
  return (data ?? []).map((r: any) => ({
    id: r.id, columnKey: r.column_key, text: r.text, anonymous: r.anonymous,
    authorId: r.author_id ?? undefined, clusterId: r.cluster_id ?? undefined,
  }));
}

/** Las tarjetas propias (con texto), para que el miembro vea las suyas durante la escritura. */
export async function getMyCards(sessionId: string, userId: string): Promise<SessionCard[]> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("session_cards").select("*")
    .eq("session_id", sessionId).eq("author_id", userId).order("created_at", { ascending: true });
  return (data ?? []).map((r: any) => ({
    id: r.id, columnKey: r.column_key, text: r.text, anonymous: r.anonymous,
    authorId: r.author_id ?? undefined, clusterId: r.cluster_id ?? undefined,
  }));
}

/** Conteo por columna (sin exponer contenido — para el modo escritura a ciegas). */
export async function getCardCounts(sessionId: string): Promise<Record<string, number>> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("session_cards").select("column_key").eq("session_id", sessionId);
  const c: Record<string, number> = {};
  (data ?? []).forEach((r: any) => { c[r.column_key] = (c[r.column_key] ?? 0) + 1; });
  return c;
}

// ── Agrupar (clusters / tensiones) ──
export async function getClusters(sessionId: string): Promise<SessionCluster[]> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("session_clusters").select("id,name").eq("session_id", sessionId).order("created_at", { ascending: true });
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name }));
}
export async function createCluster(sessionId: string, name: string): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("session_clusters").insert({ session_id: sessionId, name }).select("id").single();
  return error ? null : data.id;
}
export async function renameCluster(id: string, name: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.from("session_clusters").update({ name }).eq("id", id);
}
export async function deleteCluster(id: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.from("session_clusters").delete().eq("id", id); // cards.cluster_id -> null por FK
}
export async function assignCardToCluster(cardId: string, clusterId: string | null): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.from("session_cards").update({ cluster_id: clusterId }).eq("id", cardId);
}

// ── Aportes genéricos de miembros (confirmaciones, ICE, etc.) ──
export async function getInputs(sessionId: string): Promise<SessionInput[]> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("session_inputs_view").select("user_id,key,value,voter_key").eq("session_id", sessionId);
  return (data ?? []).map((r: any) => ({ userId: r.user_id, key: r.key, value: (r.value as Record<string, unknown>) ?? {}, voterKey: r.voter_key }));
}
export async function setMyInput(sessionId: string, key: string, value: Record<string, unknown>, isPrivate = false): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("session_inputs").upsert(
    { session_id: sessionId, user_id: auth.user.id, key, value, private: isPrivate },
    { onConflict: "session_id,user_id,key" },
  );
}

// ── Votar (un punto por fila) ──
/** Borra una tarjeta (facilitador: duplicadas, typos, inapropiadas). */
export async function deleteCard(cardId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.from("session_cards").delete().eq("id", cardId);
}

export async function getVotes(sessionId: string): Promise<SessionVote[]> {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.from("session_votes_view").select("id,cluster_id,user_id,voter_key").eq("session_id", sessionId);
  return (data ?? []).map((r: any) => ({ id: r.id, clusterId: r.cluster_id, userId: r.user_id, voterKey: r.voter_key }));
}
export async function addVote(sessionId: string, clusterId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from("session_votes").insert({ session_id: sessionId, cluster_id: clusterId, user_id: auth.user.id });
}
export async function removeVote(sessionId: string, clusterId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data } = await supabase.from("session_votes").select("id")
    .eq("session_id", sessionId).eq("cluster_id", clusterId).eq("user_id", auth.user.id).limit(1);
  if (data && data[0]) await supabase.from("session_votes").delete().eq("id", data[0].id);
}

/** Cierra la sesión: persiste el pulso como punto real del equipo (si hubo),
 *  lo registra en el log de sesiones y marca la sesión como cerrada. */
export async function finalizeSession(session: LiveSession, opts: {
  pulseAvg?: PulseResponse | null; cardCount?: number; summaryText?: string;
  dataKey?: string; dataValue?: unknown; pausedNames?: string[];
  noAdvance?: boolean; status?: string; stageOverride?: string;
  teamData?: Record<string, unknown>;
}): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const date = new Date().toLocaleDateString("es", { day: "2-digit", month: "short" });
  const avg = opts.pulseAvg;
  const hasPulse = !!avg && Object.values(avg).some((v) => v > 0);
  const overall = hasPulse ? pulseOverall(avg!) : 0;

  if (hasPulse) {
    await supabase.from("pulse_points").insert({
      team_id: session.teamId, label: date, date, dims: avg,
      confianza: avg!.confianza ?? overall, comunic: avg!.comunic ?? overall, claridad: avg!.claridad ?? overall,
      foco: overall, seguridad: avg!.confianza ?? overall,
    });
  }
  const parts: string[] = [];
  if (opts.summaryText) parts.push(opts.summaryText);
  if (opts.cardCount) parts.push(`${opts.cardCount} ${opts.cardCount === 1 ? "señal" : "señales"}`);
  if (hasPulse) parts.push(`pulso ${overall}/100`);
  await supabase.from("session_logs").insert({
    id: newId("s"), team_id: session.teamId, initiative_id: session.initiativeId ?? null,
    date, stage: session.type, retro: RETRO_NAME[session.type] ?? "Sesión en vivo",
    out_text: parts.join(" · ") || "Sesión realizada", pulse: overall, delta: 0,
  });

  // Iniciativa: guardar resultados de la etapa, avanzar etapa, y (si hay) crear pausadas.
  if (session.initiativeId) {
    const { data: initRow } = await supabase.from("initiatives").select("stage,data,objective_id").eq("id", session.initiativeId).maybeSingle();
    const patch: Record<string, unknown> = {};
    if (opts.dataKey) {
      const prev = (initRow?.data as Record<string, unknown>) ?? {};
      const prevK = (prev[opts.dataKey] as Record<string, unknown>) ?? {};
      const dv = opts.dataValue && typeof opts.dataValue === "object" ? (opts.dataValue as Record<string, unknown>) : {};
      patch.data = { ...prev, [opts.dataKey]: { ...prevK, ...dv } };
    }
    // Modo libre: cerrar una sesión NO avanza la etapa. La etapa acumula
    // sesiones y el facilitador la cierra explícitamente desde la iniciativa
    // ("Cerrar etapa y avanzar"). stageOverride queda para casos puntuales
    // (ej: Aprendizaje con decisión de iterar vuelve la etapa a Ideación).
    const ns = opts.stageOverride;
    if (ns && ns !== (initRow?.stage as string)) patch.stage = ns;
    if (opts.status) patch.status = opts.status;
    if (Object.keys(patch).length) await supabase.from("initiatives").update(patch).eq("id", session.initiativeId);

    if (opts.pausedNames?.length) {
      const rows = opts.pausedNames.map((n) => ({
        id: newId("i"), team_id: session.teamId, title: n, stage: "objectives", status: "paused", data: {},
        objective_id: (initRow as { objective_id?: string } | null)?.objective_id ?? null, // heredan el objetivo
      }));
      await supabase.from("initiatives").insert(rows);
    }
  }

  // Equipo: guardar datos a nivel equipo (contrato, pulso semanal, y SIEMPRE la última sesión para la cadencia).
  {
    const { data: teamRow } = await supabase.from("teams").select("data").eq("id", session.teamId).maybeSingle();
    const prev = (teamRow?.data as Record<string, unknown>) ?? {};
    const now = new Date().toISOString();
    const patch = { ...prev, ...(opts.teamData ?? {}), ...(hasPulse ? { lastPulseAt: now } : {}), lastSessionAt: now };
    // psych_safety alimenta las alertas de clima: ahora es la Confianza entre miembros del último pulso.
    await supabase.from("teams").update({
      data: patch,
      ...(hasPulse ? { psych_safety: avg!.confianza ?? overall } : {}),
    }).eq("id", session.teamId);
  }

  const { error } = await supabase.from("sessions").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", session.id);
  await reloadData();
  return { error: error?.message };
}

export async function closeSession(sessionId: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.from("sessions").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", sessionId);
}

// ── Realtime ──
/** Se suscribe a todo lo que cambia dentro de una sesión. Devuelve el unsubscribe. */
export function subscribeSession(sessionId: string, onChange: () => void): () => void {
  const supabase = getSupabaseBrowserClient();
  const channel = supabase.channel(`session:${sessionId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "session_pulse_responses", filter: `session_id=eq.${sessionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "session_participants", filter: `session_id=eq.${sessionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "session_cards", filter: `session_id=eq.${sessionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "session_clusters", filter: `session_id=eq.${sessionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "session_votes", filter: `session_id=eq.${sessionId}` }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "session_inputs", filter: `session_id=eq.${sessionId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

/** Se suscribe a las sesiones de un equipo (para el banner del miembro). */
export function subscribeTeamSessions(teamId: string, onChange: () => void): () => void {
  const supabase = getSupabaseBrowserClient();
  const channel = supabase.channel(`team-sessions:${teamId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "sessions", filter: `team_id=eq.${teamId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

/** Promedio (redondeado) por dimensión de un conjunto de respuestas de pulso. */
export function averagePulse(responses: PulseResponse[]): PulseResponse {
  const out: PulseResponse = {};
  if (!responses.length) return out;
  const keys = new Set(responses.flatMap((r) => Object.keys(r)));
  for (const k of keys) {
    const vals = responses.map((r) => r[k]).filter((v) => typeof v === "number");
    if (vals.length) out[k] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }
  return out;
}

/** Promedio general 0-100 de una respuesta/promedio de pulso. */
export function pulseOverall(r: PulseResponse): number {
  const vals = Object.values(r).filter((v) => typeof v === "number");
  return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
}
