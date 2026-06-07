"use client";

import { useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  AvatarStack, Bar, Button, Card, EmptyState, Pill, ProgressRing,
  PulseChart, SectionTitle, StageBadge, Stat,
} from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/Toast";
import {
  getFacilitators, getInitiatives, getTeam, setInitiativeStage, setInitiativeStatus,
} from "@/lib/repository";
import { createLiveSession } from "@/lib/session";
import { CYCLE_STAGES, PULSE_DIMS, STAGES, type Initiative, type StageKey, type Team } from "@/lib/data";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
}

const OUTCOME: Record<string, string> = {
  explore: "Tensiones detectadas y priorizadas",
  focus: "Causa raíz identificada",
  proof: "Apuesta diseñada y en marcha",
  follow: "Avance de la prueba registrado",
  learn: "Aprendizajes y decisión de cierre",
};

/* ── cuerpo de cada etapa ─────────────────────────────────── */
function StageBody({ st, init }: { st: StageKey; init: Initiative }) {
  const data = init.data ?? {};
  const empty = (text: string) => <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>{text}</p>;

  if (st === "explore") {
    const d = data.explore;
    if (!d?.tensions?.length && !d?.priority) return empty("Todavía no se hizo la sesión de exploración.");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {d?.priority && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--success-bg)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
            <Icon name="Star" size={16} style={{ color: "var(--green)" }} />
            <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Tensión priorizada:</span>
            <b style={{ fontSize: "var(--t-sm)" }}>{d.priority}</b>
          </div>
        )}
        {!!d?.tensions?.length && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {d.tensions.map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--card-2)", borderRadius: "var(--r-sm)", border: "1px solid var(--line)" }}>
                <span className="num" style={{ color: i === 0 ? "var(--green)" : "var(--ink-3)", fontWeight: 700, width: 18 }}>{i + 1}</span>
                <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, flex: 1, minWidth: 0 }}>{t.name}</span>
                <span className="muted" style={{ fontSize: "var(--t-xs)" }}>{t.signals} señales</span>
                <Pill color="var(--green)" bg="var(--success-bg)" icon="Vote">{t.dots}</Pill>
              </div>
            ))}
          </div>
        )}
        {!!d?.pausedCount && <p className="muted" style={{ fontSize: "var(--t-xs)" }}>{d.pausedCount} {d.pausedCount === 1 ? "tensión guardada" : "tensiones guardadas"} como iniciativas pausadas del equipo.</p>}
      </div>
    );
  }

  if (st === "focus") {
    const d = data.focus;
    if (!d?.rootCause && !d?.causes?.length) return empty("Todavía no se hizo la sesión de foco.");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {d?.rootCause && (
          <div style={{ padding: "12px 14px", background: "color-mix(in srgb, var(--st-focus) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--st-focus) 35%, transparent)", borderRadius: "var(--r-md)" }}>
            <div className="eyebrow" style={{ color: "var(--st-focus)", marginBottom: 4 }}>Causa raíz</div>
            <div style={{ fontSize: "var(--t-md)", fontWeight: 700 }}>{d.rootCause}</div>
          </div>
        )}
        {!!d?.causes?.length && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Causas exploradas</div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {d.causes.map((c, i) => <span key={i} style={{ fontSize: "var(--t-xs)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)" }}>{c}</span>)}
            </div>
          </div>
        )}
        {!!d?.whys?.length && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Los 5 porqués</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {d.whys.map((w, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: "var(--t-sm)" }}>
                  <Icon name="CornerDownRight" size={14} style={{ color: "var(--ink-3)", marginTop: 2, marginLeft: i * 14 }} />{w}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (st === "proof") {
    const d = data.proof;
    if (!d?.betIf && !d?.betThen) return empty("Todavía no se diseñó la apuesta.");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: "14px 16px", background: "color-mix(in srgb, var(--st-proof) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--st-proof) 30%, transparent)", borderRadius: "var(--r-md)" }}>
          <div className="eyebrow" style={{ color: "var(--st-proof)", marginBottom: 6 }}>La apuesta</div>
          <p style={{ fontSize: "var(--t-md)", lineHeight: 1.55 }}>
            Creemos que si <b style={{ color: "var(--green)" }}>{d?.betIf || "…"}</b>, lograremos que <b style={{ color: "var(--st-proof)" }}>{d?.betThen || "…"}</b>.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 12 }}>
          <Field label="Señal a mover" value={d?.signal || "—"} icon="Activity" />
          <Field label="Responsable" value={d?.responsible || "—"} icon="User" />
          <Field label="Plazo" value={d?.deadline || "—"} icon="CalendarClock" />
        </div>
      </div>
    );
  }

  if (st === "follow") {
    const d = data.follow;
    if (d?.current == null) return empty("Todavía no se hizo seguimiento de la prueba.");
    const target = d.target ?? 100;
    const pct = Math.max(0, Math.min(100, target ? (d.current / target) * 100 : 0));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: "var(--t-sm)" }}>{d.signalName || "Señal de avance"}</span>
          <Pill color={d.onTrack ? "var(--success)" : "var(--warning)"} bg={d.onTrack ? "var(--success-bg)" : "var(--warning-bg)"} icon={d.onTrack ? "TrendingUp" : "TriangleAlert"}>{d.onTrack ? "En camino" : "Necesita atención"}</Pill>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, color: "var(--st-follow)" }}>{d.current}{d.unit}</span>
          <span className="muted" style={{ fontSize: "var(--t-sm)", marginLeft: "auto" }}>meta <b className="num" style={{ color: "var(--ink-0)" }}>{target}{d.unit}</b></span>
        </div>
        <Bar value={pct} glow color={d.onTrack ? "var(--green)" : "var(--warning)"} />
        {!!d.blockers?.length && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 8, color: "var(--warning)" }}>Trabas</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {d.blockers.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 8, fontSize: "var(--t-sm)", padding: "7px 10px", background: "var(--card-2)", borderRadius: "var(--r-sm)", borderLeft: "2px solid var(--warning)" }}><Icon name="Construction" size={14} style={{ color: "var(--warning)" }} />{b}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // learn
  const d = data.learn;
  if (!d?.decision && !d?.learnings?.length) return empty("Todavía no se cerró el ciclo.");
  const resultMap: Record<string, { label: string; color: string }> = {
    yes: { label: "Funcionó", color: "var(--success)" }, partial: { label: "A medias", color: "var(--warning)" }, no: { label: "No funcionó", color: "var(--risk)" },
  };
  const decisionMap: Record<string, { label: string; color: string }> = {
    consolidate: { label: "Consolidar", color: "var(--success)" }, iterate: { label: "Iterar", color: "var(--st-proof)" }, drop: { label: "Soltar", color: "var(--ink-2)" },
  };
  const r = d?.result ? resultMap[d.result] : undefined;
  const dec = d?.decision ? decisionMap[d.decision] : undefined;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {r && <Pill color={r.color} bg={`color-mix(in srgb, ${r.color} 14%, transparent)`} icon="Flag">Resultado: {r.label}</Pill>}
        {dec && <Pill color={dec.color} bg={`color-mix(in srgb, ${dec.color} 14%, transparent)`} icon="GitFork">Decisión: {dec.label}</Pill>}
      </div>
      {!!d?.learnings?.length && (
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Aprendizajes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {d.learnings.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: "var(--t-sm)", padding: "7px 10px", background: "var(--card-2)", borderRadius: "var(--r-sm)", borderLeft: "2px solid var(--st-learn)" }}><Icon name="Lightbulb" size={14} style={{ color: "var(--st-learn)" }} />{l}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, icon }: { label: string; value: ReactNode; icon: string }) {
  return (
    <div style={{ padding: "10px 12px", background: "var(--card-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
      <div className="muted" style={{ fontSize: "var(--t-xs)", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><Icon name={icon} size={12} />{label}</div>
      <div style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{value}</div>
    </div>
  );
}

export default function InitiativeDetailPage() {
  const params = useParams<{ id: string; initId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();
  const [, setNonce] = useState(0);
  const refresh = () => setNonce((n) => n + 1);

  const teamId = params.id || "";
  const team = getTeam(teamId);
  const init = getInitiatives(teamId).find((i) => i.id === params.initId);
  const isFacil = user?.role === "facilitator";

  if (!team || !init) {
    return (
      <div className="screen-pad">
        <Card pad={0}><EmptyState icon="SearchX" title="Iniciativa no encontrada">No pudimos encontrar esta iniciativa. Puede que haya sido eliminada.</EmptyState></Card>
      </div>
    );
  }

  const done = init.status === "done";
  const paused = init.status === "paused";
  const curIdx = Math.max(0, CYCLE_STAGES.indexOf(init.stage));
  const sessions = team.sessions.filter((s) => s.initiativeId === init.id);
  const lead = team.facilitatorId ? getFacilitators().find((f) => f.id === team.facilitatorId) : undefined;
  const responsible = init.data?.proof?.responsible;
  const nextStage = CYCLE_STAGES[curIdx + 1];
  const statusMeta = done
    ? { label: "Cerrada", color: "var(--success)", bg: "var(--success-bg)", icon: "CircleCheck" }
    : paused
      ? { label: "Pausada", color: "var(--warning)", bg: "var(--warning-bg)", icon: "Pause" }
      : { label: "En curso", color: "var(--green)", bg: "var(--success-bg)", icon: "Activity" };

  const startLive = async () => {
    const res = await createLiveSession({ teamId: team.id, initiativeId: init.id, type: init.stage });
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir la sesión", "TriangleAlert"); return; }
    router.push(`/sala/${res.session.id}`);
  };
  const startConsolidate = async () => {
    const res = await createLiveSession({ teamId: team.id, initiativeId: init.id, type: "consolidate" });
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir la sesión", "TriangleAlert"); return; }
    router.push(`/sala/${res.session.id}`);
  };
  const canConsolidate = init.data?.learn?.decision === "consolidate" && !init.data?.consolidate;
  const consolidated = init.data?.consolidate;
  const changeStage = async (s: StageKey) => {
    const res = await setInitiativeStage(init.id, s);
    if (res.error) show(res.error, "TriangleAlert"); else { show(`Etapa: ${STAGES[s].label}`, "Check"); refresh(); }
  };
  const changeStatus = async (st: Initiative["status"]) => {
    const res = await setInitiativeStatus(init.id, st);
    if (res.error) show(res.error, "TriangleAlert"); else { show("Actualizada", "Check"); refresh(); }
  };
  const scrollTo = (st: StageKey) => document.getElementById(`stage-${st}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="screen-pad">
      {/* breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => router.push("/organizaciones")} className="muted">Equipos</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <button onClick={() => router.push(`/equipos/${team.id}`)} className="muted">{team.name}</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <span style={{ fontWeight: 600 }}>{init.title}</span>
      </div>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{init.title}</h1>
            <StageBadge stage={init.stage} />
            <Pill color={statusMeta.color} bg={statusMeta.bg} icon={statusMeta.icon}>{statusMeta.label}</Pill>
          </div>
          {init.description && <p className="muted" style={{ marginTop: 8, maxWidth: 620, lineHeight: 1.5 }}>{init.description}</p>}
        </div>
        {isFacil && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {!done && nextStage && <Button variant="secondary" icon="ChevronsRight" onClick={() => changeStage(nextStage)}>Avanzar a {STAGES[nextStage].label}</Button>}
            {done
              ? <Button variant="secondary" icon="RotateCcw" onClick={() => changeStatus("active")}>Reabrir</Button>
              : <Button icon="Users" onClick={startLive}>Abrir sesión en vivo</Button>}
          </div>
        )}
      </div>

      {isFacil && canConsolidate && (
        <Card pad={18} style={{ marginBottom: 20, borderColor: "color-mix(in srgb, var(--st-learn) 40%, var(--line))", background: "color-mix(in srgb, var(--st-learn) 8%, transparent)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--st-learn) 20%, transparent)", color: "var(--st-learn)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="Anchor" size={22} /></div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>Consolidación a 30 días</div>
              <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>El equipo decidió consolidar este cambio. Pasados ~30 días, hacé una micro-sesión para confirmar si se volvió hábito.</p>
            </div>
            <Button icon="Anchor" onClick={startConsolidate}>Hacer consolidación</Button>
          </div>
        </Card>
      )}
      {consolidated && (
        <Card pad={16} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Icon name="Anchor" size={16} style={{ color: "var(--st-learn)" }} />
            <span className="eyebrow">Consolidación{consolidated.date ? ` · ${consolidated.date}` : ""}</span>
            <Pill color="var(--st-learn)" bg="color-mix(in srgb, var(--st-learn) 14%, transparent)">{consolidated.outcome === "habit" ? "Se volvió hábito" : consolidated.outcome === "partial" ? "Parcial" : "Se perdió"}</Pill>
          </div>
          {consolidated.note && <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, lineHeight: 1.5 }}>{consolidated.note}</p>}
        </Card>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px,1fr))", gap: 14, marginBottom: 24 }}>
        <Card pad={16}><Stat label="Etapa actual" value={STAGES[init.stage].label} icon="Flag" color={STAGES[init.stage].color} /></Card>
        <Card pad={16}><Stat label="Sesiones" value={sessions.length} icon="History" color="var(--green)" /></Card>
        <Card pad={16}><Stat label="Responsable" value={responsible || "—"} icon="User" color="var(--info)" /></Card>
        <Card pad={16}><Stat label="Creada" value={fmtDate(init.createdAt)} icon="Calendar" color="var(--ink-2)" /></Card>
      </div>

      {/* riel del ciclo */}
      <Card pad={16} style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
          {CYCLE_STAGES.map((st, i) => {
            const meta = STAGES[st];
            const completed = done || i < curIdx;
            const current = !done && i === curIdx;
            return (
              <span key={st} style={{ display: "inline-flex", alignItems: "center" }}>
                <button onClick={() => scrollTo(st)} style={{ display: "flex", alignItems: "center", gap: 8, flex: "none", cursor: "pointer" }}>
                  <span style={{ width: 32, height: 32, borderRadius: 99, display: "grid", placeItems: "center", flex: "none", background: completed ? meta.color : current ? `color-mix(in srgb, ${meta.color} 18%, var(--card))` : "var(--card-2)", border: `1px solid ${completed || current ? meta.color : "var(--line-2)"}`, color: completed ? "#08120c" : current ? meta.color : "var(--ink-3)", fontWeight: 800, fontSize: "var(--t-sm)" }}>
                    {completed ? <Icon name="Check" size={15} /> : meta.n}
                  </span>
                  <span className="hide-sm" style={{ fontSize: "var(--t-sm)", fontWeight: current ? 700 : 500, color: current ? "var(--ink-0)" : completed ? "var(--ink-1)" : "var(--ink-3)" }}>{meta.label}</span>
                </button>
                {i < CYCLE_STAGES.length - 1 && <div style={{ width: 30, height: 2, background: completed ? meta.color : "var(--line)", margin: "0 10px", flex: "none" }} />}
              </span>
            );
          })}
        </div>
      </Card>

      <div className="team-grid">
        {/* columna principal: etapas + timeline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
          {CYCLE_STAGES.map((st, i) => {
            const meta = STAGES[st];
            const completed = done || i < curIdx;
            const current = !done && i === curIdx;
            return (
              <Card key={st} pad={20} id={`stage-${st}`} glow={current} style={{ opacity: completed || current ? 1 : 0.72 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                  <span style={{ width: 34, height: 34, borderRadius: 99, display: "grid", placeItems: "center", flex: "none", background: completed ? meta.color : current ? `color-mix(in srgb, ${meta.color} 18%, var(--card))` : "var(--card-2)", border: `1px solid ${completed || current ? meta.color : "var(--line-2)"}`, color: completed ? "#08120c" : current ? meta.color : "var(--ink-3)", fontWeight: 800 }}>
                    {completed ? <Icon name="Check" size={16} /> : meta.n}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "var(--t-md)", fontWeight: 800 }}>{meta.label}</div>
                    <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{OUTCOME[st]}</div>
                  </div>
                  <span style={{ marginLeft: "auto" }}>
                    {completed ? <Pill color="var(--success)" bg="var(--success-bg)" icon="Check">completada</Pill>
                      : current ? <Pill color={meta.color} bg={`color-mix(in srgb, ${meta.color} 16%, transparent)`} icon="Dot">en curso</Pill>
                        : <Pill icon="Clock">pendiente</Pill>}
                  </span>
                </div>
                <StageBody st={st} init={init} />
                {current && isFacil && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                    <Button size="sm" icon="Users" onClick={startLive}>Abrir sesión en vivo</Button>
                  </div>
                )}
              </Card>
            );
          })}

          {/* línea de tiempo de sesiones */}
          <Card pad={20}>
            <SectionTitle icon="History">Línea de tiempo de sesiones</SectionTitle>
            {sessions.length === 0 ? (
              <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Todavía no se registraron sesiones para esta iniciativa.</p>
            ) : (
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 2, background: "var(--line)" }} />
                {sessions.map((s, i) => {
                  const meta = STAGES[s.stage] ?? { color: "var(--ink-3)" };
                  return (
                    <div key={s.id} style={{ display: "flex", gap: 14, paddingBottom: i < sessions.length - 1 ? 16 : 0, position: "relative" }}>
                      <span style={{ width: 14, height: 14, borderRadius: 99, background: "var(--bg-1)", border: "2px solid " + meta.color, marginTop: 2, flex: "none", zIndex: 1 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: "var(--t-sm)" }}>{s.retro}</span>
                          <StageBadge stage={s.stage} size="sm" />
                          <span className="muted num" style={{ fontSize: "var(--t-xs)", marginLeft: "auto" }}>{s.date}</span>
                        </div>
                        <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}><Icon name="CornerDownRight" size={13} /> {s.out}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* columna lateral */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card pad={20}>
            <SectionTitle icon="Activity" sub="Evolución a lo largo de las sesiones">Pulso del equipo</SectionTitle>
            <PulseChart data={team.pulse} dims={PULSE_DIMS} height={200} />
          </Card>

          <Card pad={20}>
            <SectionTitle icon="Users">Equipo y responsables</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Integrantes</span>
                {team.members.length > 0 ? <AvatarStack people={team.members} max={6} size={28} /> : <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Sin integrantes</span>}
              </div>
              <Field label="Responsable de la prueba" value={responsible || "Sin asignar"} icon="UserCheck" />
              <Field label="Facilitador" value={lead?.name || "Sin asignar"} icon="UserCog" />
            </div>
          </Card>

          <Card pad={20}>
            <SectionTitle icon="HeartPulse">Estado</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "center", padding: "6px 0 12px" }}>
                <ProgressRing value={(curIdx + (done ? 1 : 0)) / CYCLE_STAGES.length} size={104} stroke={9} color={STAGES[init.stage].color}>
                  <span className="num" style={{ fontSize: "var(--t-lg)", fontWeight: 800, lineHeight: 1 }}>{Math.round(((curIdx + (done ? 1 : 0)) / CYCLE_STAGES.length) * 100)}%</span>
                  <span className="muted" style={{ fontSize: 10 }}>del ciclo</span>
                </ProgressRing>
              </div>
              {isFacil && !done && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {paused
                    ? <Button size="sm" variant="secondary" icon="Play" onClick={() => changeStatus("active")} full>Reactivar</Button>
                    : <Button size="sm" variant="ghost" icon="Pause" onClick={() => changeStatus("paused")}>Pausar</Button>}
                  <Button size="sm" variant="ghost" icon="CircleCheck" onClick={() => changeStatus("done")}>Cerrar</Button>
                </div>
              )}
            </div>
          </Card>

          <Card pad={20}>
            <SectionTitle icon="Share2">Informe</SectionTitle>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Button variant="secondary" icon="FileDown" full onClick={() => show("Exportando informe de la iniciativa…", "FileDown")}>Exportar PDF</Button>
              <Button variant="secondary" icon="Share2" full onClick={() => show("Compartido con el líder del equipo.", "Share2")}>Compartir con líder</Button>
            </div>
          </Card>
        </div>
      </div>

    </div>
  );
}
