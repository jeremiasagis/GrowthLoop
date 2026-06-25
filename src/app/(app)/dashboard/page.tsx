"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  Avatar, AvatarStack, Button, Card, EmptyState, SectionTitle, Sparkline, StageBadge,
} from "@/components/ui";
import { STAGES, overallOf, teamLiveStage, to5, type Team } from "@/lib/data";
import { getFacilitators, getTeams } from "@/lib/repository";
import { teamProgress } from "@/lib/gamification";
import { OpenSessionsBanner } from "@/components/OpenSessionsBanner";
import { RoleDashboard } from "@/components/RoleDashboard";
import { useAuth } from "@/lib/auth/AuthContext";

/* ── Onboarding del facilitador: primeros pasos guiados ─────── */
function CoachOnboarding({ teams, go }: { teams: Team[]; go: (href: string) => void }) {
  const [dismissed, setDismissed] = useState(() => typeof window !== "undefined" && localStorage.getItem("gl_coach_onboarded") === "1");
  const t0 = teams[0];
  const teamPath = t0 ? `/equipos/${t0.id}` : "/equipos/nuevo";
  const steps = [
    { done: teams.length > 0, label: "Creá tu primer equipo", desc: "Tu espacio de trabajo con sus integrantes.", cta: "Crear equipo", to: "/equipos/nuevo" },
    { done: teams.some((t) => !!t.data?.contract), label: "Hagan la Sesión Fundacional", desc: "El acuerdo de cómo van a trabajar juntos.", cta: "Ir al equipo", to: teamPath },
    { done: teams.some((t) => !!(t.data as { explorationClosedAt?: string } | undefined)?.explorationClosedAt), label: "Exploren: ¿dónde estamos?", desc: "El diagnóstico que abre el primer ciclo.", cta: "Ir al equipo", to: teamPath },
    { done: teams.some((t) => (t.initiatives?.length ?? 0) > 0), label: "Arranquen su primera iniciativa", desc: "Lo que el equipo va a mejorar.", cta: "Ir al equipo", to: teamPath },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed || doneCount === steps.length) return null;
  const next = steps.find((s) => !s.done)!;
  const dismiss = () => { try { localStorage.setItem("gl_coach_onboarded", "1"); } catch {} setDismissed(true); };
  return (
    <Card pad={22} glow style={{ marginBottom: 24, background: "linear-gradient(180deg, rgba(0,232,122,0.07), var(--card))", borderColor: "color-mix(in srgb, var(--green) 35%, transparent)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--green)", marginBottom: 6 }}><Icon name="Rocket" size={14} /> Primeros pasos</div>
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em" }}>Poné en marcha tu primer equipo</h2>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>{doneCount} de {steps.length} listos · te toma unos minutos por paso.</p>
        </div>
        <button onClick={dismiss} title="Ocultar" style={{ color: "var(--ink-3)", flex: "none" }}><Icon name="X" size={18} /></button>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "var(--card-2)", overflow: "hidden", margin: "14px 0 16px" }}>
        <div style={{ height: "100%", width: `${(doneCount / steps.length) * 100}%`, background: "var(--green)", borderRadius: 99, transition: "width .4s var(--ease)" }} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((s, i) => {
          const isNext = s === next;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: "var(--r-md)", background: isNext ? "var(--card)" : "transparent", border: `1px solid ${isNext ? "color-mix(in srgb, var(--green) 35%, var(--line))" : "transparent"}` }}>
              <Icon name={s.done ? "CheckCircle2" : isNext ? "Circle" : "Circle"} size={20} style={{ color: s.done ? "var(--green)" : isNext ? "var(--green)" : "var(--ink-3)", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "var(--t-sm)", fontWeight: s.done ? 500 : 700, textDecoration: s.done ? "line-through" : "none", color: s.done ? "var(--ink-2)" : "var(--ink-0)" }}>{s.label}</div>
                {isNext && <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{s.desc}</div>}
              </div>
              {isNext && <Button size="sm" icon="ArrowRight" onClick={() => go(s.to)}>{s.cta}</Button>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ── Team card ────────────────────────────────────────────── */
function TeamCard({ team, go }: { team: Team; go: (href: string) => void }) {
  const st = STAGES[teamLiveStage(team) ?? "queue"];
  const pulseSeries = team.pulse.map(overallOf);
  const lowSafety = team.psychSafety > 0 && team.psychSafety < 70;
  const activeInits = (team.initiatives ?? []).filter((i) => i.status === "active");
  const focusInit = activeInits[0];
  const g = teamProgress(team);
  return (
    <Card hover onClick={() => go(`/equipos/${team.id}`)} pad={18} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>
            {team.org}
          </div>
          <div style={{ fontWeight: 700, fontSize: "var(--t-md)", letterSpacing: "-0.01em" }}>{team.name}</div>
        </div>
        <StageBadge stage={teamLiveStage(team) ?? "queue"} size="sm" />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--green)", background: "var(--green-soft)", padding: "3px 9px", borderRadius: "var(--r-full)" }}><Icon name="Trophy" size={12} /> {g.level.name}</span>
        {g.streak > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--warning)" }}><Icon name="Flame" size={12} /> {g.streak}</span>}
        {g.cycles > 0 && <span className="muted" style={{ fontSize: "var(--t-xs)" }}>· {g.cycles} {g.cycles === 1 ? "ciclo" : "ciclos"}</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--card-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
        <span style={{ color: focusInit ? st.color : "var(--ink-3)", display: "inline-flex" }}><Icon name="Target" size={16} /></span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Iniciativa activa</div>
          <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, color: focusInit ? "var(--ink-0)" : "var(--ink-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {focusInit?.title ?? "Sin iniciativas todavía"}
          </div>
        </div>
        {activeInits.length > 0 && (
          <div style={{ textAlign: "right", flex: "none" }}>
            <div className="num" style={{ fontSize: "var(--t-md)", fontWeight: 700, color: "var(--ink-0)" }}>
              {activeInits.length}
            </div>
            <div className="muted" style={{ fontSize: 10 }}>en curso</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div>
            <div className="muted" style={{ fontSize: 10, marginBottom: 2 }}>Confianza</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="num" style={{ fontWeight: 700, fontSize: "var(--t-base)", color: lowSafety ? "var(--warning)" : "var(--success)" }}>
                {team.psychSafety === 0 ? "—" : `${to5(team.psychSafety).toFixed(1)}/5`}
              </span>
              {lowSafety && (
                <span style={{ color: "var(--warning)", display: "inline-flex" }} title="Bajo umbral">
                  <Icon name="TriangleAlert" size={14} />
                </span>
              )}
            </div>
          </div>
          <div style={{ width: 1, height: 30, background: "var(--line)" }} />
          <div>
            <div className="muted" style={{ fontSize: 10, marginBottom: 4 }}>Pulso</div>
            <Sparkline
              data={pulseSeries.length > 1 ? pulseSeries : [...pulseSeries, ...pulseSeries]}
              color={lowSafety ? "var(--warning)" : "var(--green)"} w={70} h={22}
            />
          </div>
        </div>
        <AvatarStack people={team.members} max={4} size={28} />
      </div>
    </Card>
  );
}

/* ── Org stat (admin panel) ───────────────────────────────── */
function OrgStat({
  icon, color, label, value, sub, border,
}: { icon: string; color: string; label: string; value: number; sub: string; border?: boolean }) {
  return (
    <div style={{ padding: "18px 20px", borderLeft: border ? "1px solid var(--line)" : "none", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--ink-2)", fontSize: "var(--t-xs)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
        <span style={{ color }}><Icon name={icon} size={15} /></span>
        {label}
      </div>
      <span className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</span>
      <span className="muted" style={{ fontSize: "var(--t-xs)" }}>{sub}</span>
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role;
  const firstName = (user?.name ?? "Daniela").split(" ")[0];
  const isSuper = role === "superadmin";
  const isAdmin = role === "admin" || role === "superadmin";
  const isFacil = role === "facilitator";
  const go = (href: string) => router.push(href);

  const subtitle = isFacil
    ? "Acá vas a ver tus equipos, sesiones y avances."
    : isSuper
      ? "Gestioná organizaciones, admins y facilitadores de la plataforma."
      : "Gestioná las organizaciones y facilitadores de tu organización.";

  const teams = getTeams();
  const facilitators = getFacilitators();
  const activeFacils = facilitators.filter((f) => f.status === "active");
  const sessionsTotal = teams.reduce((a, t) => a + (t.sessions?.length ?? 0), 0);
  const alertColor: Record<string, [string, string]> = {
    risk: ["var(--risk)", "var(--risk-bg)"],
    warning: ["var(--warning)", "var(--warning-bg)"],
    info: ["var(--info)", "var(--info-bg)"],
  };
  // Alertas reales derivadas del estado de los equipos.
  type DashAlert = { type: "risk" | "warning" | "info"; icon: string; text: string; team: string; sub: string; teamId: string };
  const alerts: DashAlert[] = [];
  for (const t of teams) {
    if (t.psychSafety > 0 && t.psychSafety < 70)
      alerts.push({ type: "warning", icon: "HeartPulse", text: "Confianza baja en el equipo", team: t.name, sub: `confianza ${to5(t.psychSafety).toFixed(1)}/5`, teamId: t.id });
    const paused = (t.initiatives ?? []).filter((i) => i.status === "paused").length;
    if (paused) alerts.push({ type: "info", icon: "CirclePause", text: `${paused} ${paused === 1 ? "iniciativa en pausa" : "iniciativas en pausa"}`, team: t.name, sub: "para retomar", teamId: t.id });
    if ((t.sessions?.length ?? 0) === 0 && (t.initiatives?.length ?? 0) === 0)
      alerts.push({ type: "info", icon: "Sparkles", text: "Equipo nuevo sin actividad", team: t.name, sub: "arrancar con la Fundacional", teamId: t.id });
    // Cadencia: equipo que ya arrancó pero se pasó de su ritmo.
    const everyDays = t.data?.cadence?.everyDays ?? 14;
    const lastAt = t.data?.lastSessionAt;
    if (lastAt && (t.sessions?.length ?? 0) > 0) {
      const d = Math.floor((Date.now() - new Date(lastAt).getTime()) / 86400000);
      if (d > everyDays) alerts.push({ type: "warning", icon: "CalendarClock", text: "Sin sesiones hace un tiempo", team: t.name, sub: `hace ${d} días · ritmo ${everyDays === 7 ? "semanal" : "quincenal"}`, teamId: t.id });
    }
  }
  // Actividad reciente real (últimas sesiones registradas de todos los equipos).
  // Los ids llevan timestamp en base36 ("s" + Date.now().toString(36) + …): ordenan cross-equipo.
  const recent = teams
    .flatMap((t) => (t.sessions ?? []).map((s) => ({ ...s, teamName: t.name, teamId: t.id })))
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, 6);

  return (
    <div className="screen-pad">
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
          <h1 style={{ fontSize: "var(--t-3xl)", fontWeight: 800, letterSpacing: "-0.03em" }}>Buen día, {firstName}</h1>
          <p className="muted" style={{ marginTop: 4 }}>{subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {isFacil && (
            <>
              <Button variant="secondary" icon="FileBarChart" onClick={() => go("/reportes")}>Generar reporte</Button>
              <Button icon="UserPlus" onClick={() => go("/equipos/nuevo")}>Crear equipo</Button>
            </>
          )}
          {isSuper && (
            <>
              <Button variant="secondary" icon="Building2" onClick={() => go("/organizaciones")}>Nueva organización</Button>
              <Button variant="secondary" icon="UserPlus" onClick={() => go("/facilitadores")}>Invitar facilitador</Button>
              <Button icon="ShieldPlus" variant="violet" onClick={() => go("/admins")}>Crear admin</Button>
            </>
          )}
          {isAdmin && !isSuper && (
            <>
              <Button variant="secondary" icon="FileBarChart" onClick={() => go("/reportes")}>Generar reporte</Button>
              <Button variant="secondary" icon="UserPlus" onClick={() => go("/facilitadores")}>Invitar facilitador</Button>
              <Button icon="Building2" onClick={() => go("/organizaciones")}>Nueva organización</Button>
            </>
          )}
        </div>
      </div>

      {/* sesión abierta ahora (lo valioso del viejo "Sesiones") */}
      {isFacil && <OpenSessionsBanner />}

      {/* onboarding del coach */}
      {isFacil && <CoachOnboarding teams={teams} go={go} />}

      {/* panorama (KPIs con Δ + distribución + por equipo) */}
      <RoleDashboard teams={teams} role={role} go={go} />

      {/* admin: Mi organización */}
      {isAdmin && (
      <div style={{ marginBottom: 28 }}>
        <SectionTitle
          icon="Building2" sub="Vista de administrador · todo tu alcance"
          right={<Button size="sm" variant="secondary" icon="UsersRound" onClick={() => go("/facilitadores")}>Gestionar facilitadores</Button>}
        >
          Mi organización
        </SectionTitle>
        <Card pad={0} style={{ overflow: "hidden" }}>
          <div className="myorg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            <OrgStat icon="UserCog" color="var(--info)" label="Facilitadores activos" value={activeFacils.length} sub="en tu organización" />
            <OrgStat icon="Users" color="var(--green)" label="Equipos en total" value={teams.length} sub="entre todos los facilitadores" border />
            <OrgStat icon="Radio" color="var(--violet)" label="Sesiones realizadas" value={sessionsTotal} sub="en vivo, facilitadas" border />
          </div>
          <div style={{ borderTop: "1px solid var(--line)", padding: "8px 8px 10px" }}>
            <div className="eyebrow" style={{ padding: "8px 12px 6px" }}>Equipos por facilitador</div>
            {activeFacils.length === 0 && (
              <div className="muted" style={{ fontSize: "var(--t-sm)", padding: "8px 12px 14px" }}>
                Todavía no hay facilitadores. Invitá uno desde <button onClick={() => go("/facilitadores")} style={{ color: "var(--green)", fontWeight: 600 }}>Facilitadores</button>.
              </div>
            )}
            {activeFacils.map((f, i) => (
              <button
                key={f.id} onClick={() => go("/facilitadores")}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: "var(--r-md)", transition: "background .15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Avatar name={f.name} initials={f.initials} size={30} idx={i} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>
                    {f.name}
                    {f.you && <span className="muted" style={{ fontWeight: 400 }}> · vos</span>}
                  </div>
                  {(() => { const n = teams.filter((t) => t.facilitatorId === f.id).length; return (
                    <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{n} {n === 1 ? "equipo" : "equipos"}</div>
                  ); })()}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
                  <span className="faint"><Icon name="ChevronRight" size={16} /></span>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
      )}

      {/* main grid */}
      <div className="dash-grid">
        <div>
          <SectionTitle
            icon="LayoutGrid"
            right={
              <button onClick={() => go("/organizaciones")} style={{ color: "var(--green)", fontSize: "var(--t-sm)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
                Ver todos <Icon name="ArrowRight" size={14} />
              </button>
            }
          >
            {isFacil ? "Mis equipos" : "Equipos en acompañamiento"}
          </SectionTitle>
          {teams.length === 0 ? (
            <Card pad={0}>
              <EmptyState icon="Users" title="Todavía no hay equipos"
                action={isFacil ? <Button icon="Plus" onClick={() => go("/equipos/nuevo")}>Crear equipo</Button> : undefined}>
                {isFacil ? "Creá tu primer equipo e invitá a sus integrantes." : "Cuando los facilitadores creen equipos, los vas a ver acá."}
              </EmptyState>
            </Card>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 14 }}>
              {teams.map((t) => <TeamCard key={t.id} team={t} go={go} />)}
            </div>
          )}

          {teams.length > 1 && (
            <div style={{ marginTop: 26 }}>
              <SectionTitle icon="Trophy" sub="Comparativa sana entre equipos — sin ranking de personas">Progreso de los equipos</SectionTitle>
              <Card pad={0} style={{ overflow: "hidden" }}>
                {[...teams].map((t) => ({ t, g: teamProgress(t) })).sort((a, b) => b.g.xp - a.g.xp).map(({ t, g }, i, arr) => (
                  <button key={t.id} onClick={() => go(`/equipos/${t.id}`)} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--line)" : "none", background: "transparent" }}>
                    <span className="num" style={{ width: 22, fontWeight: 800, color: i === 0 ? "var(--green)" : "var(--ink-3)", fontSize: "var(--t-sm)" }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{t.name}</span>
                        <span className="num" style={{ fontSize: 10, fontWeight: 800, color: "var(--green)" }}>N{g.level.idx + 1}</span>
                        <span className="muted" style={{ fontSize: "var(--t-xs)" }}>{g.level.name}</span>
                      </div>
                      <div style={{ height: 5, borderRadius: 99, background: "var(--card-2)", overflow: "hidden", marginTop: 5, maxWidth: 240 }}><div style={{ height: "100%", width: `${g.pct}%`, background: "linear-gradient(90deg, var(--green), #3B82F6)", borderRadius: 99 }} /></div>
                    </div>
                    <span title="racha" className="num" style={{ fontSize: "var(--t-xs)", color: g.streak > 0 ? "var(--warning)" : "var(--ink-3)", fontWeight: 700, flexShrink: 0 }}>🔥 {g.streak}</span>
                    <span title="ciclos cerrados" className="num" style={{ fontSize: "var(--t-xs)", color: "var(--ink-2)", fontWeight: 700, flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="CircleCheck" size={13} style={{ color: "var(--success)" }} />{g.cycles}</span>
                    <span className="num muted" style={{ fontSize: "var(--t-xs)", flexShrink: 0, width: 56, textAlign: "right" }}>{g.xp} XP</span>
                  </button>
                ))}
              </Card>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* alerts */}
          <div>
            <SectionTitle icon="Bell">Atención</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {alerts.length === 0 && (
                <Card pad={16}><span className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin alertas por ahora. Todo en orden. 🌱</span></Card>
              )}
              {alerts.map((a, i) => {
                const [c] = alertColor[a.type];
                return (
                  <Card key={i} pad={14} hover onClick={() => go(`/equipos/${a.teamId}`)} style={{ display: "flex", gap: 12, alignItems: "flex-start", borderLeft: `3px solid ${c}` }}>
                    <span style={{ color: c, display: "inline-flex", marginTop: 1, flex: "none" }}><Icon name={a.icon} size={18} /></span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--t-sm)" }}>{a.text}</div>
                      <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{a.team} · {a.sub}</div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* actividad reciente */}
          <div>
            <SectionTitle icon="History">Actividad reciente</SectionTitle>
            <Card pad={recent.length ? 6 : 16}>
              {recent.length === 0 && (
                <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Todavía no hay sesiones realizadas.</span>
              )}
              {recent.map((u, i) => {
                const st = STAGES[u.stage] ?? { color: "var(--ink-3)" };
                return (
                  <button
                    key={u.id} onClick={() => go(`/equipos/${u.teamId}`)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "12px 12px",
                      borderRadius: "var(--r-md)", borderBottom: i < recent.length - 1 ? "1px solid var(--line)" : "none", transition: "background .15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ textAlign: "center", flex: "none", width: 52 }}>
                      <div className="muted num" style={{ fontSize: "var(--t-xs)" }}>{u.date}</div>
                    </div>
                    <div style={{ width: 3, alignSelf: "stretch", borderRadius: 99, background: st.color, flex: "none" }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "var(--t-sm)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.retro}</div>
                      <div className="muted" style={{ fontSize: "var(--t-xs)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.teamName} · {u.out}</div>
                    </div>
                    <span className="faint" style={{ flex: "none" }}><Icon name="ChevronRight" size={16} /></span>
                  </button>
                );
              })}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
