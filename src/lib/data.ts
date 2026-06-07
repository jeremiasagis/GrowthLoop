/* ============================================================
   Growthloop — Mock data + domain constants (typed)
   ------------------------------------------------------------
   Esta es la fuente de datos "semilla". Las pantallas NO la
   importan directamente: lo hacen a través de `repository.ts`,
   que es la única costura para enchufar Supabase más adelante.
   ============================================================ */

export type StageKey =
  | "queue" | "explore" | "focus" | "proof"
  | "follow" | "learn" | "consol" | "improved" | "paused";

export interface Stage {
  key: StageKey;
  label: string;
  color: string; // CSS var reference
  n: string;
}

// ── Stage metadata (the spiral of continuous improvement) ──
export const STAGES: Record<StageKey, Stage> = {
  queue:    { key: "queue",    label: "Cola",          color: "var(--st-queue)",    n: "·" },
  explore:  { key: "explore",  label: "Exploración",   color: "var(--st-explore)",  n: "1" },
  focus:    { key: "focus",    label: "Foco",          color: "var(--st-focus)",    n: "2" },
  proof:    { key: "proof",    label: "Prueba",        color: "var(--st-proof)",    n: "3" },
  follow:   { key: "follow",   label: "Seguimiento",   color: "var(--st-follow)",   n: "4" },
  learn:    { key: "learn",    label: "Aprendizaje",   color: "var(--st-learn)",    n: "5" },
  consol:   { key: "consol",   label: "Consolidación", color: "var(--st-consol)",   n: "✦" },
  improved: { key: "improved", label: "Mejorada",      color: "var(--st-improved)", n: "✓" },
  paused:   { key: "paused",   label: "Pausada",       color: "var(--st-paused)",   n: "‖" },
};

export const STAGE_ORDER: StageKey[] = [
  "queue", "explore", "focus", "proof", "follow", "learn", "consol", "improved",
];

// Las etapas que recorre una iniciativa (el ciclo de mejora, en orden).
export const CYCLE_STAGES: StageKey[] = ["explore", "focus", "proof", "follow", "learn"];

// The 5-stage guided process used by the session stepper
export const PROCESS = [
  { id: 0, key: "contract", label: "Contratación", sub: "Facilitador + líder" },
  { id: 1, key: "explore",  label: "Exploración",  sub: "Sacar las variables" },
  { id: 2, key: "focus",    label: "Foco",         sub: "Profundizar" },
  { id: 3, key: "proof",    label: "Prueba",       sub: "Diseñar una apuesta" },
  { id: 4, key: "follow",   label: "Seguimiento",  sub: "Acompañar 15 días" },
  { id: 5, key: "learn",    label: "Aprendizaje",  sub: "Cerrar el ciclo" },
] as const;

// 5 health-pulse dimensions
export interface PulseDim {
  key: "confianza" | "comunic" | "claridad" | "foco" | "seguridad";
  label: string;
  color: string;
}
export const PULSE_DIMS: PulseDim[] = [
  { key: "confianza", label: "Confianza",    color: "#00E87A" },
  { key: "comunic",   label: "Comunicación", color: "#3B82F6" },
  { key: "claridad",  label: "Claridad",     color: "#7C3AED" },
  { key: "foco",      label: "Foco",         color: "#06B6D4" },
  { key: "seguridad", label: "Seguridad ψ",  color: "#F59E0B" },
];

// ── People ──
export interface Person {
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
}

export type VarState = "critical" | "developing" | "acceptable";
export type Trend = "up" | "down" | "flat";

export interface Variable {
  id: string;
  name: string;
  stage: StageKey;
  sessions: number;
  last: string;
  trend: Trend;
  state: VarState;
  source: string;
  desc: string;
  hasExp?: boolean;
}

export interface Experiment {
  varId: string;
  varName: string;
  apuesta: { if: string; then: string; signal: string; by: string };
  accion: string;
  responsable: Person;
  signalName: string;
  baseline: number;
  current: number;
  target: number;
  unit: string;
  dayOf: number;
  dayTotal: number;
  status: string;
  filters: { observable: boolean; measurable: boolean; teamDependent: boolean };
}

export interface SessionLog {
  id: string;
  date: string;
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
  explore?: { priority?: string; tensions?: { name: string; signals: number; dots: number }[]; pausedCount?: number; purpose?: string; criticalStage?: string };
  focus?: { rootCause?: string; cause?: string; causes?: string[]; whys?: string[]; secondaryCauses?: { name: string; votes: number; signals?: number }[] };
  proof?: { betIf?: string; betThen?: string; signal?: string; responsible?: string; deadline?: string; risks?: string[]; committed?: number };
  follow?: { current?: number; target?: number; unit?: string; signalName?: string; onTrack?: boolean; blockers?: string[]; decision?: string };
  learn?: { result?: string; learnings?: string[]; decision?: string };
  consolidate?: { outcome?: string; note?: string; date?: string };
}

export interface Initiative {
  id: string;
  teamId: string;
  title: string;
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
  activeVar: string;
  daysLeft: number;
  pulse: PulsePoint[];
  vars: Variable[];
  experiment: Experiment | null;
  sessions: SessionLog[];
  initiatives?: Initiative[];
  blocked?: boolean;
  facilitatorId?: string;
  data?: TeamData;
}

/** Datos a nivel equipo guardados en teams.data (jsonb). */
export interface TeamData {
  contract?: TeamContract;
}

/** Contrato de equipo acordado y firmado en la Sesión Fundacional. */
export interface TeamContract {
  answers: Record<string, string>; // clave de pregunta -> acuerdo escrito
  signedBy: string[];              // ids de quienes firmaron
  signedNames?: string[];
  date: string;                    // fecha de la sesión fundacional
}

/** Las 5 preguntas del contrato fundacional. */
export const FOUNDING_QUESTIONS: { key: string; q: string; hint: string }[] = [
  { key: "purpose", q: "¿Para qué existe este equipo?", hint: "El propósito que nos une, más allá de las tareas." },
  { key: "decide", q: "¿Cómo tomamos las decisiones?", hint: "Quién decide qué, y cómo resolvemos cuando urge." },
  { key: "talk", q: "¿Cómo nos hablamos cuando algo no funciona?", hint: "El acuerdo de comunicación honesta y respetuosa." },
  { key: "disagree", q: "¿Qué hacemos cuando no estamos de acuerdo?", hint: "Cómo procesamos el conflicto sin romper el equipo." },
  { key: "commit", q: "¿Qué nos comprometemos a sostener?", hint: "Los compromisos mínimos que todos firmamos." },
];

// ── Variables for the core team (Operaciones Centro) ──
const T1_VARS: Variable[] = [
  { id: "v1", name: "Reuniones sin decisiones", stage: "proof", sessions: 3, last: "hace 2 días", trend: "up", state: "developing",
    source: "Sesión Exploración", desc: "Las reuniones de equipo terminan sin acuerdos claros ni responsables, y los temas se repiten semana a semana.", hasExp: true },
  { id: "v2", name: "Traspaso entre turnos", stage: "follow", sessions: 4, last: "hace 5 días", trend: "up", state: "developing",
    source: "Observación", desc: "La información se pierde en el cambio de turno: el turno entrante no sabe qué quedó pendiente." },
  { id: "v3", name: "Sobrecarga de los líderes", stage: "focus", sessions: 2, last: "hace 1 día", trend: "flat", state: "critical",
    source: "Encuesta previa", desc: "Los coordinadores resuelven todo personalmente; el equipo no toma decisiones sin ellos." },
  { id: "v4", name: "El feedback no llega", stage: "explore", sessions: 1, last: "hace 8 días", trend: "flat", state: "developing",
    source: "Sesión TeamCook", desc: "La gente no recibe devoluciones sobre su trabajo, ni positivas ni de mejora." },
  { id: "v5", name: "Retrabajo en reportes", stage: "queue", sessions: 0, last: "sin actividad", trend: "flat", state: "critical",
    source: "Entrevista", desc: "Los reportes se rehacen 2 o 3 veces por datos inconsistentes entre áreas." },
  { id: "v6", name: "Onboarding lento", stage: "queue", sessions: 0, last: "sin actividad", trend: "flat", state: "developing",
    source: "Observación", desc: "Una persona nueva tarda más de un mes en ser autónoma." },
  { id: "v7", name: "Silos entre áreas", stage: "learn", sessions: 5, last: "hace 3 días", trend: "up", state: "acceptable",
    source: "Combinación", desc: "Operaciones y Riesgo no comparten contexto; cada uno optimiza lo suyo." },
  { id: "v8", name: "Errores en captura", stage: "consol", sessions: 5, last: "hace 6 días", trend: "up", state: "acceptable",
    source: "Encuesta previa", desc: "Errores de tipeo al ingresar solicitudes generan rechazos evitables." },
  { id: "v9", name: "Prioridades que cambian", stage: "improved", sessions: 6, last: "hace 12 días", trend: "up", state: "acceptable",
    source: "Sesión Exploración", desc: "Las prioridades cambiaban a media semana; ahora hay un acuerdo de congelamiento." },
  { id: "v10", name: "Clima en las 1:1", stage: "paused", sessions: 2, last: "hace 20 días", trend: "down", state: "developing",
    source: "Entrevista", desc: "Pausada a pedido del líder hasta cerrar la reorganización del área." },
];

// ── Active experiment (la prueba) on v1 ──
const T1_EXPERIMENT: Experiment = {
  varId: "v1",
  varName: "Reuniones sin decisiones",
  apuesta: {
    if: "cerramos cada reunión con las decisiones y responsables por escrito",
    then: "el equipo avanza sin volver a discutir los mismos temas",
    signal: "el % de reuniones que terminan con decisiones registradas",
    by: "18 de junio",
  },
  accion: "Cerrar cada reunión con un acta de 3 líneas: decisión · responsable · fecha.",
  responsable: member("Mariana López"),
  signalName: "% de reuniones con decisiones registradas",
  baseline: 40, current: 62, target: 80, unit: "%",
  dayOf: 7, dayTotal: 15,
  status: "on-track",
  filters: { observable: true, measurable: true, teamDependent: true },
};

// ── Sessions log (past) for the core team ──
const T1_SESSIONS: SessionLog[] = [
  { id: "s5", date: "28 may", stage: "proof",   retro: "Diseño de la prueba", pulse: 74, delta: +3, out: "Prueba definida: actas de decisión" },
  { id: "s4", date: "21 may", stage: "proof",   retro: "¿Cuál elegimos?",     pulse: 71, delta: +2, out: "Idea elegida con ICE" },
  { id: "s3", date: "14 may", stage: "focus",   retro: "¿Por qué pasa esto?",  pulse: 69, delta: -1, out: "Causa raíz: agenda sin cierre" },
  { id: "s2", date: "07 may", stage: "focus",   retro: "Impacto y frecuencia", pulse: 70, delta: +4, out: "Problema priorizado" },
  { id: "s1", date: "30 abr", stage: "explore", retro: "¿Dónde estamos?",      pulse: 66, delta: 0,  out: "Mapa de tensiones inicial" },
];

// ── Teams ──
export const TEAMS: Team[] = [
  {
    id: "t1", org: "Banco Andino", orgId: "o1", name: "Operaciones Centro", area: "Operaciones",
    purpose: "Procesar solicitudes de crédito con rapidez y sin errores.",
    clientType: "Interno", facilitator: FACILITATOR,
    members: [member("Mariana López"), member("Julián Pérez"), member("Sofía Núñez"), member("Andrés Gil"), member("Lucía Vega"), member("Tomás Ruiz")],
    psychSafety: 62, stage: "proof", activeVar: "Reuniones sin decisiones", daysLeft: 8,
    pulse: [
      { label: "S1", date: "30 abr", confianza: 60, comunic: 58, claridad: 55, foco: 62, seguridad: 54 },
      { label: "S2", date: "07 may", confianza: 64, comunic: 60, claridad: 58, foco: 66, seguridad: 58 },
      { label: "S3", date: "14 may", confianza: 63, comunic: 64, claridad: 62, foco: 65, seguridad: 56 },
      { label: "S4", date: "21 may", confianza: 68, comunic: 66, claridad: 66, foco: 70, seguridad: 60 },
      { label: "S5", date: "28 may", confianza: 72, comunic: 70, claridad: 69, foco: 74, seguridad: 62 },
    ],
    vars: T1_VARS, experiment: T1_EXPERIMENT, sessions: T1_SESSIONS,
  },
  {
    id: "t2", org: "Banco Andino", orgId: "o1", name: "Riesgo y Cumplimiento", area: "Riesgo",
    purpose: "Aprobar operaciones cuidando a la empresa y al cliente.",
    clientType: "Interno", facilitator: FACILITATOR,
    members: [member("Paula Sáenz"), member("Diego Mora"), member("Inés Castro"), member("Bruno Lara")],
    psychSafety: 78, stage: "follow", activeVar: "Tiempos de aprobación", daysLeft: 4,
    pulse: [
      { label: "S1", date: "02 may", confianza: 70, comunic: 68, claridad: 66, foco: 64, seguridad: 72 },
      { label: "S2", date: "09 may", confianza: 72, comunic: 70, claridad: 70, foco: 68, seguridad: 74 },
      { label: "S3", date: "16 may", confianza: 74, comunic: 73, claridad: 72, foco: 72, seguridad: 76 },
      { label: "S4", date: "23 may", confianza: 76, comunic: 75, claridad: 75, foco: 74, seguridad: 78 },
    ],
    vars: [], experiment: null, sessions: [], blocked: true,
  },
  {
    id: "t3", org: "Logística del Sur", orgId: "o2", name: "Última Milla", area: "Distribución",
    purpose: "Entregar a tiempo sin quemar al equipo de reparto.",
    clientType: "Interno", facilitator: FACILITATOR,
    members: [member("Carla Díaz"), member("Marcos Ortiz"), member("Vale Soto"), member("Hugo Paz"), member("Rita Mena")],
    psychSafety: 81, stage: "explore", activeVar: "Rutas que se solapan", daysLeft: 0,
    pulse: [
      { label: "S1", date: "12 may", confianza: 74, comunic: 72, claridad: 70, foco: 76, seguridad: 80 },
      { label: "S2", date: "19 may", confianza: 78, comunic: 76, claridad: 74, foco: 79, seguridad: 81 },
    ],
    vars: [], experiment: null, sessions: [],
  },
  {
    id: "t4", org: "Clínica Vida", orgId: "o3", name: "Urgencias", area: "Atención",
    purpose: "Atender rápido sin perder la calidez con el paciente.",
    clientType: "Interno", facilitator: FACILITATOR,
    members: [member("Dra. Elena Ramos"), member("Pedro Cano"), member("Lía Ferro")],
    psychSafety: 70, stage: "focus", activeVar: "Saturación en picos", daysLeft: 11,
    pulse: [
      { label: "S1", date: "05 may", confianza: 66, comunic: 64, claridad: 62, foco: 68, seguridad: 66 },
      { label: "S2", date: "12 may", confianza: 68, comunic: 66, claridad: 65, foco: 70, seguridad: 68 },
      { label: "S3", date: "19 may", confianza: 70, comunic: 69, claridad: 68, foco: 71, seguridad: 70 },
    ],
    vars: [], experiment: null, sessions: [],
  },
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

// ── Dashboard alerts ──
export interface Alert {
  type: "risk" | "warning" | "info";
  icon: string;
  text: string;
  team: string;
  sub: string;
}
export const ALERTS: Alert[] = [];

// ── Upcoming sessions ──
export interface Upcoming {
  id: string;
  team: string;
  org: string;
  date: string;
  time: string;
  stage: StageKey;
  retro: string;
  mode: "Remoto" | "Presencial";
}
export const UPCOMING: Upcoming[] = [];

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

// Admin's organization workspace summary
export const MY_ORG = {
  name: "Growthloop",
  plan: "Consultora",
  facilitatorsActive: 0,
  teamsTotal: 0,
  sessionsMonth: 0,
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
  orgId?: string;
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

export const teamById = (id: string) => TEAMS.find((t) => t.id === id);
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

// Sesión activa/pendiente por equipo (en vivo o asincrónica)
export interface ActiveSession {
  id: string;
  teamId: string;
  retro: string;
  stage: StageKey;
  live: boolean;            // está sucediendo ahora mismo
  mode: "live" | "async";
  dueHours?: number;        // para asincrónicas: horas restantes
  date?: string;
  time?: string;
  roomCode?: string;
}
export const ACTIVE_SESSIONS: ActiveSession[] = [];

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
