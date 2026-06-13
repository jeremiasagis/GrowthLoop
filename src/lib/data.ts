/* ============================================================
   Growthloop — Mock data + domain constants (typed)
   ------------------------------------------------------------
   Esta es la fuente de datos "semilla". Las pantallas NO la
   importan directamente: lo hacen a través de `repository.ts`,
   que es la única costura para enchufar Supabase más adelante.
   ============================================================ */

// ── Modelo de etapas ──
// PARTE A — Módulo de diagnóstico (fuera del ciclo, opcional):
//   exploration → output: mapa de variables priorizadas.
// PARTE B — Ciclo de mejora (se repite por variable):
//   objectives → focus → ideation → follow → learn
export type CycleStage = "objectives" | "focus" | "ideation" | "follow" | "learn";
export type DiagnosticModule = "exploration";

export type StageKey =
  | CycleStage | DiagnosticModule
  // legacy (datos viejos en DB; se normalizan con normalizeStage)
  | "queue" | "explore" | "proof" | "consol" | "improved" | "paused";

export interface Stage {
  key: StageKey;
  label: string;
  color: string; // CSS var reference
  n: string;
  module?: boolean; // true = módulo de diagnóstico, no etapa del ciclo
}

// ── Stage metadata ──
export const STAGES: Record<StageKey, Stage> = {
  queue:       { key: "queue",       label: "Cola",          color: "var(--st-queue)",    n: "·" },
  exploration: { key: "exploration", label: "Exploración",   color: "var(--st-explore)",  n: "◇", module: true },
  objectives:  { key: "objectives",  label: "Objetivos",     color: "var(--st-objectives)", n: "1" },
  focus:       { key: "focus",       label: "Foco",          color: "var(--st-focus)",    n: "2" },
  ideation:    { key: "ideation",    label: "Ideación",      color: "var(--st-proof)",    n: "3" },
  follow:      { key: "follow",      label: "Seguimiento",   color: "#F59E0B",            n: "4" },
  learn:       { key: "learn",       label: "Aprendizaje",   color: "var(--st-learn)",    n: "5" },
  // legacy — solo para que los datos viejos sigan renderizando
  explore:     { key: "explore",     label: "Exploración",   color: "var(--st-explore)",  n: "◇" },
  proof:       { key: "proof",       label: "Ideación",      color: "var(--st-proof)",    n: "3" },
  consol:      { key: "consol",      label: "Consolidación", color: "var(--st-consol)",   n: "✦" },
  improved:    { key: "improved",    label: "Mejorada",      color: "var(--st-improved)", n: "✓" },
  paused:      { key: "paused",      label: "Pausada",       color: "var(--st-paused)",   n: "‖" },
};

export const STAGE_ORDER: StageKey[] = [
  "queue", "exploration", "objectives", "focus", "ideation", "follow", "learn", "consol", "improved",
];

// Las etapas que recorre una iniciativa (el ciclo de mejora, en orden).
export const CYCLE_STAGES: StageKey[] = ["objectives", "focus", "ideation", "follow", "learn"];

/** La etapa siguiente del ciclo (undefined si es la última o no es del ciclo). */
export function nextCycleStage(s: StageKey): StageKey | undefined {
  const i = CYCLE_STAGES.indexOf(normalizeStage(s));
  return i >= 0 && i < CYCLE_STAGES.length - 1 ? CYCLE_STAGES[i + 1] : undefined;
}

/** Normaliza valores de etapa viejos guardados en DB al modelo nuevo. */
export function normalizeStage(s: string | null | undefined): StageKey {
  if (s === "explore") return "objectives"; // arranque del ciclo viejo → arranque del nuevo
  if (s === "proof") return "ideation";
  return (s as StageKey) || "objectives";
}

/** Etapa "viva" del equipo: la más avanzada entre sus iniciativas activas.
 *  (teams.stage quedó del modelo viejo y nunca se actualiza — no usarla para mostrar.) */
export function teamLiveStage(t: { initiatives?: { stage: StageKey; status: string }[] }): StageKey | undefined {
  const act = (t.initiatives ?? []).filter((i) => i.status === "active");
  if (!act.length) return undefined;
  return normalizeStage(act.reduce((best, i) => (CYCLE_STAGES.indexOf(normalizeStage(i.stage)) > CYCLE_STAGES.indexOf(normalizeStage(best.stage)) ? i : best)).stage);
}

// Pulso del equipo: 8 dimensiones. Cada miembro puntúa 1-5 en anónimo;
// internamente se guarda 0-100 (1→0, 5→100) para promediar y graficar.
export interface PulseDim {
  key: string;
  label: string;
  color: string;
}
export const PULSE_DIMS: PulseDim[] = [
  { key: "comunic",        label: "Comunicación interna",     color: "#3B82F6" },
  { key: "claridad",       label: "Claridad de objetivos",    color: "#7C3AED" },
  { key: "confianza",      label: "Confianza entre miembros", color: "#00E87A" },
  { key: "entregas",       label: "Calidad de las entregas",  color: "#06B6D4" },
  { key: "cliente",        label: "Relación con el cliente",  color: "#F59E0B" },
  { key: "carga",          label: "Carga de trabajo",         color: "#EF4444" },
  { key: "decisiones",     label: "Toma de decisiones",       color: "#EC4899" },
  { key: "reconocimiento", label: "Reconocimiento",           color: "#A3E635" },
];
// Conversión entre la escala interna (0-100) y la que ve la gente (1-5).
export const to5 = (v: number) => 1 + (v / 100) * 4;
export const to100 = (v5: number) => Math.round(((v5 - 1) / 4) * 100);
/** Valor 0-100 de una dimensión en un punto de pulso (nuevo jsonb o columnas legacy). */
export function dimVal(p: PulsePoint, key: string): number | undefined {
  if (p.dims && p.dims[key] != null) return p.dims[key];
  const legacy = p as unknown as Record<string, number | undefined>;
  return ["confianza", "comunic", "claridad", "foco", "seguridad"].includes(key) ? legacy[key] : undefined;
}
/** Promedio general 0-100 de un punto de pulso (sobre las dimensiones que tenga). */
export function overallOf(p: PulsePoint): number {
  const vals = p.dims ? Object.values(p.dims) : [p.confianza, p.comunic, p.claridad, p.foco, p.seguridad];
  const nums = vals.filter((v): v is number => typeof v === "number");
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

// ── People ──
export interface Person {
  id?: string;     // id de la ficha team_members (para gestionarla)
  name: string;
  initials: string;
}
export const FACILITATOR: Person & { role: string } = {
  name: "Daniela Ríos",
  role: "Facilitadora",
  initials: "DR",
};

export function member(name: string): Person {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return { name, initials };
}

export interface PulsePoint {
  label: string;
  date: string;
  confianza: number;
  comunic: number;
  claridad: number;
  foco: number;
  seguridad: number;
  dims?: Record<string, number>; // pulso nuevo: 8 dimensiones, 0-100
}

export interface SessionLog {
  id: string;
  date: string;
  createdAt?: string;   // ISO (para racha y orden real)
  stage: StageKey;
  retro: string;
  pulse: number;
  delta: number;
  out: string;
  initiativeId?: string;
}

// ── Iniciativas: las líneas de trabajo del equipo ──
// Cada una nace de una exploración, define un objetivo a mejorar y
// recorre su propio ciclo de etapas con sus propias sesiones.
// Varias pueden convivir en paralelo, en etapas distintas.
// Resultados que va dejando cada etapa del ciclo (los escribe el conductor).
export interface InitiativeData {
  explore?: { priority?: string; tensions?: { name: string; signals: number; dots: number }[]; pausedCount?: number; purpose?: string; criticalStage?: string; causes?: string[] };
  focus?: { rootCause?: string; roots?: string[]; cause?: string; causes?: string[]; whys?: string[]; secondaryCauses?: { name: string; votes: number; signals?: number }[]; blockStage?: string; blockPct?: number; blockFormulation?: string; priorityProblems?: string[]; clientName?: string; clientGap?: string; clientFbTask?: { how: string; who: string; due: string }; perfectionScore?: number; candidateFactors?: string[]; tensionPair?: string; tensionHypothesis?: string; journeyCritical?: string; journeyFinding?: string; staceyZone?: string; staceyAdvice?: string };
  proof?: { betIf?: string; betThen?: string; signal?: string; signalMetric?: string; signalTarget?: string; signalHow?: string; responsible?: string; deadline?: string; actions?: { text: string; who: string }[]; mitigations?: { risk: string; plan: string }[]; bets?: ProofBet[]; risks?: string[]; committed?: number; secondaryIdeas?: { name: string; ice: number }[] };
  follow?: { current?: number; target?: number; unit?: string; signalName?: string; signalNow?: string; onTrack?: boolean; blockers?: string[]; actionStatus?: { text: string; who: string; status: string }[]; betCheckins?: { name: string; signal: string; value: string; pct: number; actions: { text: string; who: string; status: string }[] }[]; newActions?: { text: string; who: string }[]; escalateTo?: string; decision?: string };
  learn?: { result?: string; results?: string[]; achieved?: string[]; learnings?: string[]; highlights?: { name: string; votes: number }[]; decision?: string; decisions?: string[] };
  consolidate?: { outcome?: string; note?: string; date?: string };
}

/** Objetivo del equipo (puede haber varios; cada uno agrupa iniciativas). */
export interface Objective {
  id: string;
  teamId: string;
  text: string;
  metric?: string;
  target?: string;
  horizon?: string;
  status: "active" | "achieved" | "archived";
}

export interface Initiative {
  id: string;
  teamId: string;
  title: string;
  objectiveId?: string;
  description?: string;
  stage: StageKey;
  status: "active" | "done" | "paused";
  createdAt?: string;
  sessionsCount?: number;
  data?: InitiativeData;
}

export interface Team {
  id: string;
  org: string;
  orgId: string;
  name: string;
  area: string;
  purpose: string;
  clientType: string;
  facilitator: Person & { role: string };
  members: Person[];
  psychSafety: number;
  stage: StageKey;
  pulse: PulsePoint[];
  sessions: SessionLog[];
  initiatives?: Initiative[];
  objectives?: Objective[];
  blocked?: boolean;
  facilitatorId?: string;
  data?: TeamData;
}

/** Datos a nivel equipo guardados en teams.data (jsonb). */
export interface TeamData {
  contract?: TeamContract;
  lastPulseAt?: string;   // ISO; última vez que el equipo hizo el pulso (para el pulso semanal)
  lastSessionAt?: string; // ISO; última sesión cerrada (para la cadencia)
  objective?: TeamObjective; // el "Norte" del equipo
  cadence?: { everyDays: number }; // ritmo sugerido (7 = semanal, 14 = quincenal)
  foda?: { f?: string[]; o?: string[]; d?: string[]; a?: string[]; date?: string }; // diagnóstico FODA inicial
  explorationClosedAt?: string; // ISO; cuándo se cerró el módulo de Exploración
  celebrated?: { level: number; cycles: number }; // hasta dónde ya festejamos (evita repetir confetti)
}

/** El "Norte" del equipo: a qué apuntan las iniciativas de mejora. */
export interface TeamObjective {
  text: string;       // el objetivo/desafío en una frase
  metric?: string;    // qué señal lo mide (opcional)
  target?: string;    // meta de esa señal (opcional)
  horizon?: string;   // horizonte temporal (ej. "este trimestre")
  setAt?: string;     // ISO
}

/** Contrato de equipo acordado y firmado en la Sesión Fundacional. */
export interface TeamContract {
  answers: Record<string, string>; // clave de pregunta -> acuerdo escrito
  signedBy: string[];              // ids de quienes firmaron
  signedNames?: string[];
  date: string;                    // fecha de la sesión fundacional
}

/** Una apuesta del experimento (puede haber 1 o 2 en paralelo). */
export interface ProofBet {
  name?: string;
  betIf?: string;
  betThen?: string;
  signalMetric?: string;
  signalTarget?: string;
  signalHow?: string;
  deadline?: string;
  actions?: { text: string; who: string }[];
  mitigations?: { risk: string; plan: string }[];
}

/** Las 5 preguntas del contrato fundacional. */
export const FOUNDING_QUESTIONS: { key: string; q: string; hint: string }[] = [
  { key: "purpose", q: "¿Para qué existe este equipo?", hint: "El propósito que nos une, más allá de las tareas." },
  { key: "decide", q: "¿Cómo tomamos las decisiones?", hint: "Quién decide qué, y cómo resolvemos cuando urge." },
  { key: "talk", q: "¿Cómo nos hablamos cuando algo no funciona?", hint: "El acuerdo de comunicación honesta y respetuosa." },
  { key: "disagree", q: "¿Qué hacemos cuando no estamos de acuerdo?", hint: "Cómo procesamos el conflicto sin romper el equipo." },
  { key: "commit", q: "¿Qué nos comprometemos a sostener?", hint: "Los compromisos mínimos que todos firmamos." },
];

// ── Organizations ──
export interface Org {
  id: string;
  name: string;
  sector: string;
  teams: number;
  leader: string;
  leaderRole: string;
  contract: string;
  since: string;
  status: "Activo" | "Piloto";
  ownerId?: string;
  ownerEmail?: string;
}
export const ORGS: Org[] = [
  { id: "o1", name: "Banco Andino", sector: "Servicios financieros", teams: 2, leader: "Roberto Méndez", leaderRole: "Gerente de Operaciones", contract: "6 meses", since: "feb 2026", status: "Activo" },
  { id: "o2", name: "Logística del Sur", sector: "Logística", teams: 1, leader: "Ana Belmonte", leaderRole: "Directora de Operaciones", contract: "3 meses", since: "abr 2026", status: "Activo" },
  { id: "o3", name: "Clínica Vida", sector: "Salud", teams: 1, leader: "Dr. Iván Soler", leaderRole: "Director Médico", contract: "4 meses", since: "mar 2026", status: "Piloto" },
];

// ── User model & roles ──
export type RoleKey = "superadmin" | "admin" | "facilitator" | "coordinator" | "member";
export interface Role {
  key: RoleKey;
  label: string;
  short: string;
  icon: string;
  color: string;
  desc: string;
}
export const ROLES: Record<RoleKey, Role> = {
  superadmin:  { key: "superadmin",  label: "Superadmin",  short: "Plataforma",   icon: "ShieldCheck", color: "var(--violet)",  desc: "Dueño de la plataforma Growthloop. Configuración global y creación de admins." },
  admin:       { key: "admin",       label: "Admin",       short: "Organización", icon: "Building2",   color: "var(--green)",   desc: "Gestiona toda su organización: facilitadores, equipos, reportes. Puede facilitar directamente." },
  facilitator: { key: "facilitator", label: "Facilitador", short: "Equipos",      icon: "UserCog",     color: "var(--info)",    desc: "Acompaña sus equipos asignados y facilita sesiones en vivo o asíncronas." },
  coordinator: { key: "coordinator", label: "Coordinador", short: "Observador",   icon: "Telescope",   color: "#06B6D4",        desc: "Observa en vivo una organización: equipos, facilitadores y avance. Solo lectura." },
  member:      { key: "member",      label: "Miembro",     short: "Mi equipo",    icon: "User",        color: "var(--warning)", desc: "Participa en las sesiones, ve el avance de su equipo y sus reflexiones privadas." },
};
export const ROLE_ORDER: RoleKey[] = ["superadmin", "admin", "facilitator", "coordinator", "member"];

export const CURRENT_USER = {
  name: "Daniela Ríos",
  initials: "DR",
  flavor: "consultant",
  email: "daniela@growthloop.io",
};

// Facilitators / leaders within the admin's scope
export interface Facilitator {
  id: string;
  name: string;
  email: string;
  initials: string;
  teams: number;
  sessionsMonth: number;
  health: number | null;
  status: "active" | "invited" | "inactive";
  you?: boolean;
  orgId?: string;        // org "home" (la primera / principal)
  orgIds?: string[];     // TODAS las organizaciones a las que pertenece (multi-org)
}
export const FACILITATORS: Facilitator[] = [
  { id: "f1", name: "Daniela Ríos",   email: "daniela@growthloop.io",   initials: "DR", teams: 4, sessionsMonth: 9, health: 73,   status: "active", you: true },
  { id: "f2", name: "Martín Sosa",    email: "martin.sosa@cliente.com", initials: "MS", teams: 3, sessionsMonth: 6, health: 68,   status: "active" },
  { id: "f3", name: "Carla Beltrán",  email: "carla.b@cliente.com",     initials: "CB", teams: 2, sessionsMonth: 4, health: 81,   status: "active" },
  { id: "f4", name: "Joaquín Vera",   email: "j.vera@cliente.com",      initials: "JV", teams: 2, sessionsMonth: 3, health: 64,   status: "active" },
  { id: "f5", name: "Lucía Ferreyra", email: "lucia.f@cliente.com",     initials: "LF", teams: 0, sessionsMonth: 0, health: null, status: "invited" },
];

// ── Admins (gestionados solo por el superadmin) ──────────────
export interface Admin {
  id: string;
  name: string;
  email: string;
  initials: string;
  orgName: string;
  orgs: number;
  facilitators: number;
  status: "active" | "invited";
  you?: boolean;
  orgId?: string;
}
export const ADMINS: Admin[] = [];

export const orgById = (id: string) => ORGS.find((o) => o.id === id);

// ── Member-facing mock data ──────────────────────────────────
// Reflexiones privadas del miembro (solo él/ella las ve)
export interface Reflection {
  id: string;
  date: string;
  prompt: string;
  text: string;
}
export const REFLECTIONS: Reflection[] = [];

// Invitaciones pendientes (token → datos de la invitación)
export interface Invite {
  token: string;
  orgId?: string;
  orgName: string;
  role: RoleKey;
  roleLabel: string;
  teamId?: string;
  teamName?: string;
  inviter: string;
}
export const INVITES: Record<string, Invite> = {
  abc123: { token: "abc123", orgId: "o1", orgName: "Banco Andino", role: "member", roleLabel: "Miembro", teamId: "t1", teamName: "Operaciones Centro", inviter: "Daniela Ríos" },
};
