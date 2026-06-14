"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  AlertBanner, Avatar, AvatarStack, Bar, Button, Card, CopyLink, EmptyState, Pill,
  PulseRadar, PulseTrend, SectionTitle, StageBadge, Trend,
} from "@/components/ui";
import {
  createInitiative, createObjective, deleteTeam, getFacilitators, getInitiatives, getTeam, inviteMember,
  markCelebrated, removeTeamMember, setInitiativeObjective, setInitiativeStage, setInitiativeStatus, setObjectiveStatus, setTeamCadence, setTeamObjective, updateInitiative,
} from "@/lib/repository";
import { CYCLE_STAGES, FOUNDING_QUESTIONS, PULSE_DIMS, STAGES, dimVal, teamLiveStage, to5, type Initiative, type StageKey, type Team, type TeamObjective } from "@/lib/data";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/Toast";
import { createLiveSession, getClosedTeamSessions, getOpenSessionForTeam, loadSessionMemories, setResult, type LiveSession, type SessionMemory } from "@/lib/session";
import { JoinModal } from "@/components/session/JoinModal";
import { SessionLauncher } from "@/components/SessionLauncher";
import { retrosForStage } from "@/lib/retros/registry";
import { FodaGrid } from "@/components/FodaGrid";
import { MemoryCard } from "@/components/RetroResult";
import { SignalProgressChart } from "@/components/SignalProgressChart";
import { Celebration } from "@/components/Celebration";
import { teamProgress } from "@/lib/gamification";

function SessionsLog({ team }: { team: Team }) {
  const [n, setN] = useState(8);
  const shown = team.sessions.slice(0, n);
  return (
    <Card pad={20}>
      <SectionTitle icon="History" sub={team.sessions.length > 8 ? `${team.sessions.length} en total` : undefined}>Sesiones recientes</SectionTitle>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 2, background: "var(--line)" }} />
        {shown.map((s, i) => {
          const st = STAGES[s.stage] ?? { color: "var(--ink-3)" };
          return (
            <div key={s.id} style={{ display: "flex", gap: 14, paddingBottom: i < shown.length - 1 ? 16 : 0, position: "relative" }}>
              <span style={{ width: 14, height: 14, borderRadius: 99, background: "var(--bg-1)", border: "2px solid " + st.color, marginTop: 2, flex: "none", zIndex: 1 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: "var(--t-sm)" }}>{s.retro}</span>
                  <StageBadge stage={s.stage} size="sm" />
                  <span className="muted num" style={{ fontSize: "var(--t-xs)", marginLeft: "auto" }}>{s.date}</span>
                </div>
                <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 3, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="CornerDownRight" size={13} /> {s.out}
                  <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, color: s.delta >= 0 ? "var(--success)" : "var(--risk)" }}>
                    pulso {s.pulse} {s.delta !== 0 && <Trend dir={s.delta >= 0 ? "up" : "down"} value={(s.delta >= 0 ? "+" : "") + s.delta} />}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {team.sessions.length > n && (
        <button onClick={() => setN((x) => x + 12)} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5, marginTop: 14 }}>
          <Icon name="ChevronDown" size={13} /> Ver más ({team.sessions.length - n})
        </button>
      )}
    </Card>
  );
}

function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: string; icon: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--line)", overflowX: "auto" }}>
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <button key={t.key} onClick={() => onChange(t.key)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "11px 14px", fontSize: "var(--t-sm)", fontWeight: 600, color: on ? "var(--ink-0)" : "var(--ink-2)", borderBottom: "2px solid " + (on ? "var(--green)" : "transparent"), marginBottom: -1, whiteSpace: "nowrap" }}>
            <Icon name={t.icon} size={16} />{t.label}
          </button>
        );
      })}
    </div>
  );
}

function Row({ label, value, color, pct }: { label: string; value: ReactNode; color?: string; pct?: number }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: pct != null ? 6 : 0 }}>
        <span className="muted" style={{ fontSize: "var(--t-sm)" }}>{label}</span>
        <span className="num" style={{ fontWeight: 700, color: color || "var(--ink-0)" }}>{value}</span>
      </div>
      {pct != null && <Bar value={pct} color={color || "var(--green)"} height={6} />}
    </div>
  );
}

function PulseDetail({ team, isFacil }: { team: Team; isFacil: boolean }) {
  const router = useRouter();
  const { show } = useToast();
  const [pulsing, setPulsing] = useState(false);
  const [openPulse, setOpenPulse] = useState<LiveSession | null>(null);
  const [shareSession, setShareSession] = useState<LiveSession | null>(null);
  // Detectar si hay un pulso abierto (en vivo o async) para este equipo.
  useEffect(() => {
    let active = true;
    getOpenSessionForTeam(team.id).then((s) => { if (active) setOpenPulse(s && s.type === "pulse" ? s : null); });
    return () => { active = false; };
  }, [team.id]);
  const takePulse = async () => {
    if (pulsing) return;
    setPulsing(true);
    const res = await createLiveSession({ teamId: team.id, type: "pulse", firstStep: "pulse" });
    setPulsing(false);
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir el pulso", "TriangleAlert"); return; }
    router.push(`/sala/${res.session.id}`);
  };
  const sendPulseAsync = async () => {
    if (pulsing) return;
    setPulsing(true);
    const res = await createLiveSession({ teamId: team.id, type: "pulse", firstStep: "pulse" });
    if (res.session) await setResult(res.session.id, { async: true });
    setPulsing(false);
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir el pulso", "TriangleAlert"); return; }
    setOpenPulse(res.session);
    setShareSession(res.session); // muestra el link/QR para compartir, sin entrar a la sala
  };
  const shareUrl = (s: LiveSession) => typeof window !== "undefined" ? `${window.location.origin}/join?code=${s.joinCode ?? ""}` : "";
  const TakePulseBtns = isFacil ? (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Button variant="secondary" icon="Send" disabled={pulsing} onClick={sendPulseAsync}>Enviar pulso (async)</Button>
      <Button icon="Activity" disabled={pulsing} onClick={takePulse}>Tomar en vivo</Button>
    </div>
  ) : null;
  const PulseHeader = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <div>
        <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em" }}>Pulso del equipo</h2>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>Una medición anónima de la salud del equipo. En vivo, o async para que cada uno responda cuando pueda.</p>
      </div>
      {TakePulseBtns}
    </div>
  );
  // Banner del pulso async en curso (el facilitador entra a ver/cerrar cuando quiera).
  const OpenPulseBanner = (isFacil && openPulse) ? (
    <Card pad={16} style={{ border: "1px solid color-mix(in srgb, var(--green) 40%, var(--line))", background: "color-mix(in srgb, var(--green) 7%, var(--card))" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", animation: "pulse-soft 2s infinite", color: "var(--green)" }}><Icon name="Radio" size={20} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Pulso en curso{openPulse.result?.async ? " · async" : " · en vivo"}</div>
          <div className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>Compartí el link para que respondan, y entrá a ver el radar y cerrarlo cuando quieras.</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="secondary" icon="QrCode" onClick={() => setShareSession(openPulse)}>Compartir</Button>
          <Button icon="ArrowRight" onClick={() => router.push(`/sala/${openPulse.id}`)}>Ver / cerrar</Button>
        </div>
      </div>
    </Card>
  ) : null;
  const ShareModal = shareSession ? <JoinModal url={shareUrl(shareSession)} code={shareSession.joinCode} onClose={() => setShareSession(null)} /> : null;
  if (team.pulse.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {PulseHeader}
        {OpenPulseBanner}
        <HealthCard team={team} />
        <Card pad={0}>
          <EmptyState icon="Activity" title="Sin datos de pulso todavía"
            action={TakePulseBtns ?? undefined}>
            El pulso es una medición anónima: el equipo puntúa 8 dimensiones del 1 al 5 y ves el radar promedio. Tomalo en vivo, o mandalo async para que respondan cuando puedan.
          </EmptyState>
        </Card>
        {ShareModal}
      </div>
    );
  }
  const first = team.pulse[0], last = team.pulse[team.pulse.length - 1];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {PulseHeader}
      {OpenPulseBanner}
      {ShareModal}
      <HealthCard team={team} />
      <Card pad={20}>
        <SectionTitle icon="Radar" sub="El radar promedio de la última medición (escala 1-5)">Radar del equipo</SectionTitle>
        <div style={{ maxWidth: 460, margin: "0 auto" }}><PulseRadar values={last.dims ?? {}} size={380} /></div>
      </Card>
      <Card pad={20}>
        <SectionTitle icon="Activity" sub="Promedio general a lo largo de las sesiones">Evolución del pulso</SectionTitle>
        <PulseTrend data={team.pulse} height={220} />
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
        {PULSE_DIMS.map((d) => {
          const lastV = dimVal(last, d.key), firstV = dimVal(first, d.key);
          if (lastV == null) return null;
          const delta = firstV != null ? to5(lastV) - to5(firstV) : 0;
          return (
            <Card key={d.key} pad={16}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{d.label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 700 }}>{to5(lastV).toFixed(1)}</span>
                <Trend dir={delta >= 0 ? "up" : "down"} value={(delta >= 0 ? "+" : "") + delta.toFixed(1)} />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const fieldStyle: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" };

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es", { day: "2-digit", month: "short" });
}


/** El contrato del equipo en un modal (accesible desde el header). */
function ContractModal({ team, onClose }: { team: Team; onClose: () => void }) {
  const c = team.data?.contract;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px,100%)", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 24, animation: "pop-in .25s var(--spring)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ width: 36, height: 36, borderRadius: "var(--r-md)", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="Handshake" size={18} /></span>
          <div><h3 style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>Contrato del equipo</h3>{c?.date && <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Firmado · {c.date}</span>}</div>
          <button onClick={onClose} style={{ marginLeft: "auto", color: "var(--ink-2)" }}><Icon name="X" size={18} /></button>
        </div>
        {!c ? (
          <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, marginTop: 12 }}>Todavía no firmaron el contrato. Se crea en la <b style={{ color: "var(--ink-0)" }}>Sesión Fundacional</b> — donde el equipo acuerda cómo va a funcionar.</p>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              {FOUNDING_QUESTIONS.map((q) => (
                <div key={q.key}>
                  <div className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600 }}>{q.q}</div>
                  <div style={{ fontSize: "var(--t-sm)", lineHeight: 1.45, color: c.answers?.[q.key] ? "var(--ink-0)" : "var(--ink-3)" }}>{c.answers?.[q.key] || "—"}</div>
                </div>
              ))}
            </div>
            {!!(c.signedNames?.length) && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                <div className="eyebrow" style={{ marginBottom: 8 }}>Firmado por</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {c.signedNames!.map((n) => <span key={n} className="num" style={{ fontSize: "var(--t-xs)", color: "var(--green)", background: "var(--success-bg)", borderRadius: 99, padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="PenLine" size={11} />{n}</span>)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function FoundingGateModal({ launching, onClose, onStart }: { launching: boolean; onClose: () => void; onStart: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--st-explore) 18%, transparent)", color: "var(--st-explore)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="Handshake" size={28} /></div>
        <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>Antes de arrancar: la Sesión Fundacional</h3>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, lineHeight: 1.55 }}>Todavía no hicieron la Sesión Fundacional. Es donde el equipo acuerda <b style={{ color: "var(--ink-0)" }}>cómo va a funcionar</b> —propósito, decisiones, comunicación, desacuerdos y compromisos— y firma su contrato. Es el cimiento de todas las iniciativas.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <Button full size="lg" icon="Handshake" disabled={launching} onClick={onStart}>{launching ? "Abriendo…" : "Iniciar Sesión Fundacional"}</Button>
          <Button full variant="ghost" onClick={onClose}>Ahora no</Button>
        </div>
      </div>
    </div>
  );
}

function InitiativeModal({ teamId, editing, onClose, onSaved }: { teamId: string; editing?: Initiative; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [desc, setDesc] = useState(editing?.description ?? "");
  const [objectiveId, setObjectiveId] = useState(editing?.objectiveId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = title.trim().length > 2;
  const objectives = (getTeam(teamId)?.objectives ?? []).filter((o) => o.status === "active");

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const res = editing
      ? await updateInitiative(editing.id, { title, description: desc })
      : await createInitiative({ teamId, title, description: desc, objectiveId: objectiveId || null });
    if (editing && (editing.objectiveId ?? "") !== objectiveId) await setInitiativeObjective(editing.id, objectiveId || null);
    setBusy(false);
    if (res.error) setError(res.error);
    else { onSaved(); onClose(); }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(480px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center" }}><Icon name="Target" size={20} /></div>
          <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 700 }}>{editing ? "Editar iniciativa" : "Nueva iniciativa"}</h3>
        </div>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 18 }}>{editing ? "Actualizá el objetivo o el detalle de la iniciativa." : <>Definí qué va a trabajar el equipo. Arranca en <b style={{ color: "var(--st-explore)" }}>Exploración</b> y después avanza por las etapas del ciclo.</>}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {objectives.length > 0 && (
            <div>
              <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>¿Dónde nace esta iniciativa?</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {objectives.map((o) => { const on = objectiveId === o.id; return (
                  <button key={o.id} onClick={() => setObjectiveId(o.id)} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: "var(--r-md)", background: on ? "var(--green-soft)" : "var(--card)", border: `1px solid ${on ? "var(--green)" : "var(--line-2)"}`, fontSize: "var(--t-sm)", fontWeight: 600 }}>
                    <Icon name={on ? "CircleCheck" : "Compass"} size={15} style={{ color: on ? "var(--green)" : "var(--ink-3)", flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>{o.text}</span>
                  </button>
                ); })}
                <button onClick={() => setObjectiveId("")} style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 9, padding: "9px 12px", borderRadius: "var(--r-md)", background: objectiveId === "" ? "var(--green-soft)" : "var(--card)", border: `1px solid ${objectiveId === "" ? "var(--green)" : "var(--line-2)"}`, fontSize: "var(--t-sm)", fontWeight: 600 }}>
                  <Icon name={objectiveId === "" ? "CircleCheck" : "CircleDashed"} size={15} style={{ color: objectiveId === "" ? "var(--green)" : "var(--ink-3)", flexShrink: 0 }} />
                  <span className="muted">Suelta · sin objetivo</span>
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Nombre de la iniciativa · qué van a mejorar</label>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Reducir el retrabajo en reportes" style={fieldStyle} onKeyDown={(e) => e.key === "Enter" && save()} />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Detalle <span className="faint">(opcional)</span></label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Contexto, por qué es importante, qué señal quieren mover…" rows={3} style={{ ...fieldStyle, resize: "vertical", fontFamily: "inherit" }} />
          </div>
        </div>
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600, marginTop: 14 }}>
            <Icon name="TriangleAlert" size={16} /> {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button icon="Check" disabled={!valid || busy} onClick={save}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear iniciativa"}</Button>
        </div>
      </div>
    </div>
  );
}

/** Ficha de la prueba en curso: visible mientras la iniciativa está en Seguimiento.
   Indicadores visuales (días, en riesgo) — sin recordatorios automáticos. */
function TestRunCard({ init }: { init: Initiative }) {
  const pf = init.data?.proof;
  const fl = init.data?.follow;
  if (!pf?.betIf && !pf?.betThen && !pf?.signalMetric) return null;
  const startedAt = fl?.startedAt;
  const deadline = pf?.deadline;
  const day = (() => {
    if (!startedAt || !deadline) return null;
    const s = new Date(startedAt).getTime(), d = new Date(deadline).getTime(), now = Date.now();
    if (isNaN(s) || isNaN(d)) return null;
    const total = Math.max(1, Math.round((d - s) / 86400000));
    const elapsed = Math.max(0, Math.round((now - s) / 86400000));
    return { total, elapsed, left: Math.round((d - now) / 86400000), pct: Math.min(100, Math.max(0, (elapsed / total) * 100)) };
  })();
  const hon = fl?.honesty;
  const honWorry = hon ? hon.yellow + hon.red > hon.green : false;
  const noCheckin = !startedAt;
  const overdue = day != null && day.left < 0;
  const closing = day != null && day.left >= 0 && day.left <= 2;
  const risk = fl?.decision === "stop" || fl?.decision === "adjust" || overdue || honWorry;
  const log = fl?.signalLog ?? [];
  const riskLabel = fl?.decision === "stop" ? "Marcada para detener" : fl?.decision === "adjust" ? "En ajuste" : overdue ? "Pasó la fecha de revisión" : honWorry ? "El equipo tiene dudas" : closing ? "Cierra pronto" : null;
  return (
    <div style={{ background: "color-mix(in srgb, var(--st-follow) 7%, var(--card-2))", border: `1px solid color-mix(in srgb, var(--st-follow) ${risk ? 50 : 28}%, var(--line))`, borderRadius: "var(--r-md)", padding: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span className="eyebrow" style={{ color: "var(--st-follow)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="FlaskConical" size={13} /> Prueba en curso</span>
        {riskLabel
          ? <Pill color={risk ? "var(--risk)" : "var(--warning)"} bg={risk ? "var(--risk-bg)" : "var(--warning-bg)"} icon="TriangleAlert">{riskLabel}</Pill>
          : noCheckin ? <Pill color="var(--ink-3)" bg="var(--card-2)" icon="Clock">Sin check-in aún</Pill> : <Pill color="var(--green)" bg="var(--success-bg)" icon="CircleCheck">En marcha</Pill>}
      </div>
      {(pf?.betIf || pf?.betThen) && <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, marginBottom: 8 }}>Si <b>{pf?.betIf || "…"}</b>, lograremos <b>{pf?.betThen || "…"}</b>.</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: "var(--t-xs)", marginBottom: day ? 10 : 0 }}>
        {pf?.signalMetric && <span><span className="muted">Señal:</span> <b>{pf.signalMetric}</b>{pf.signalTarget ? ` → ${pf.signalTarget}` : ""}</span>}
        {pf?.responsible && <span><span className="muted">Responsable:</span> <b>{pf.responsible}</b></span>}
        {deadline && <span><span className="muted">Revisión:</span> <b>{fmtDate(deadline)}</b></span>}
      </div>
      {day && (
        <div style={{ marginBottom: log.length ? 12 : 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--t-xs)", marginBottom: 4 }}>
            <span className="muted">Día {day.elapsed} de {day.total}</span>
            <span className="num" style={{ fontWeight: 700, color: overdue ? "var(--risk)" : closing ? "var(--warning)" : "var(--ink-2)" }}>{overdue ? `${Math.abs(day.left)} días pasados` : `${day.left} días restantes`}</span>
          </div>
          <div style={{ height: 6, borderRadius: 99, background: "var(--card)", overflow: "hidden" }}><div style={{ height: "100%", width: `${day.pct}%`, background: overdue ? "var(--risk)" : "var(--st-follow)", borderRadius: 99 }} /></div>
        </div>
      )}
      {log.length > 0 && <SignalProgressChart log={log} metric={undefined} target={pf?.signalTarget} height={70} />}
    </div>
  );
}

function InitiativeCard({ team, init, isFacil, onChanged, onEdit }: { team: Team; init: Initiative; isFacil: boolean; onChanged: () => void; onEdit: () => void }) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  // Modo libre: el botón abre el selector (etapa → retro → modo).
  const [launcherOpen, setLauncherOpen] = useState(false);
  const startLive = () => setLauncherOpen(true);
  const done = init.status === "done";
  const paused = init.status === "paused";
  const stageIdx = Math.max(0, CYCLE_STAGES.indexOf(init.stage));

  const changeStage = async (s: StageKey) => {
    if (busy || s === init.stage || done) return;
    setBusy(true);
    const res = await setInitiativeStage(init.id, s);
    setBusy(false);
    if (res.error) show(res.error, "TriangleAlert");
    else { show(`Etapa actualizada: ${STAGES[s].label}`, "Check"); onChanged(); }
  };
  const changeStatus = async (status: Initiative["status"]) => {
    setBusy(true);
    const res = await setInitiativeStatus(init.id, status);
    setBusy(false);
    if (res.error) show(res.error, "TriangleAlert");
    else { show(status === "done" ? "Iniciativa cerrada" : status === "paused" ? "Iniciativa pausada" : "Iniciativa reactivada", "Check"); onChanged(); }
  };

  return (
    <Card pad={18} style={{ display: "flex", flexDirection: "column", gap: 14, opacity: done || paused ? 0.72 : 1 }}>
      {launcherOpen && <SessionLauncher team={team} initiative={init} onClose={() => setLauncherOpen(false)} />}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{init.title}</span>
            {done && <Pill color="var(--success)" bg="var(--success-bg)" icon="CircleCheck">Cerrada</Pill>}
            {paused && <Pill color="var(--warning)" bg="var(--warning-bg)" icon="Pause">Pausada</Pill>}
            {init.data?.consolidate?.pending && !done && (() => { const left = init.data.consolidate.due ? Math.round((new Date(init.data.consolidate.due).getTime() - Date.now()) / 86400000) : null; return <Pill color="var(--st-follow)" bg="color-mix(in srgb, var(--st-follow) 14%, transparent)" icon="RefreshCw">{left != null && left > 0 ? `Consolidación · ${left}d` : "Consolidación · a verificar"}</Pill>; })()}
          </div>
          {init.description && <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4, lineHeight: 1.5 }}>{init.description}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
          <button onClick={() => router.push(`/equipos/${team.id}/iniciativa/${init.id}`)} title="Ver detalle" style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: "var(--card-2)", border: "1px solid var(--line-2)", color: "var(--ink-2)", display: "grid", placeItems: "center" }}><Icon name="Eye" size={15} /></button>
          {isFacil && <button onClick={onEdit} title="Editar" style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: "var(--card-2)", border: "1px solid var(--line-2)", color: "var(--ink-2)", display: "grid", placeItems: "center" }}><Icon name="Pencil" size={14} /></button>}
          <StageBadge stage={init.stage} />
        </div>
      </div>

      {/* ciclo de etapas */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {CYCLE_STAGES.map((st, idx) => {
          const meta = STAGES[st];
          const current = idx === stageIdx && !done;
          const past = idx < stageIdx || done;
          const clickable = isFacil && !done;
          return (
            <button
              key={st}
              onClick={() => clickable && changeStage(st)}
              disabled={!clickable || busy}
              title={clickable ? `Mover a ${meta.label}` : meta.label}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: "var(--r-full)",
                fontSize: "var(--t-xs)", fontWeight: 600, whiteSpace: "nowrap",
                cursor: clickable ? "pointer" : "default",
                color: current ? "#06140d" : past ? meta.color : "var(--ink-3)",
                background: current ? meta.color : past ? `color-mix(in srgb, ${meta.color} 16%, transparent)` : "var(--card-2)",
                border: `1px solid ${current || past ? `color-mix(in srgb, ${meta.color} 45%, transparent)` : "var(--line)"}`,
              }}
            >
              <span style={{ fontWeight: 800 }}>{meta.n}</span>{meta.label}
            </button>
          );
        })}
      </div>

      {init.stage === "follow" && !done && <TestRunCard init={init} />}

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", paddingTop: 4, borderTop: "1px solid var(--line)" }}>
        <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="Calendar" size={13} /> Creada {fmtDate(init.createdAt)}
        </span>
        <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Icon name="History" size={13} /> {init.sessionsCount ?? 0} {(init.sessionsCount ?? 0) === 1 ? "sesión" : "sesiones"}
        </span>
        {isFacil && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            {done && <Button size="sm" variant="secondary" icon="RotateCcw" disabled={busy} onClick={() => changeStatus("active")}>Reabrir</Button>}
            {paused && (
              <>
                <Button size="sm" variant="ghost" icon="CircleCheck" disabled={busy} onClick={() => changeStatus("done")}>Cerrar</Button>
                <Button size="sm" variant="secondary" icon="Play" disabled={busy} onClick={() => changeStatus("active")}>Reactivar</Button>
              </>
            )}
            {!done && !paused && (
              <>
                <Button size="sm" variant="ghost" icon="Pause" disabled={busy} onClick={() => changeStatus("paused")}>Pausar</Button>
                <Button size="sm" variant="ghost" icon="CircleCheck" disabled={busy} onClick={() => changeStatus("done")}>Cerrar</Button>
                <Button size="sm" icon="Users" disabled={busy} onClick={startLive}>Abrir sesión</Button>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/** El "Norte" del equipo: a qué apuntan las iniciativas. */
function ObjetivoCard({ teamId, objective, isFacil, onSaved }: { teamId: string; objective?: TeamObjective; isFacil: boolean; onSaved: () => void }) {
  const { show } = useToast();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState(objective?.text ?? "");
  const [metric, setMetric] = useState(objective?.metric ?? "");
  const [target, setTarget] = useState(objective?.target ?? "");
  const [horizon, setHorizon] = useState(objective?.horizon ?? "este trimestre");
  const inputStyle: React.CSSProperties = { width: "100%", background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" };
  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    const res = await setTeamObjective(teamId, { text: text.trim(), metric: metric.trim() || undefined, target: target.trim() || undefined, horizon: horizon.trim() || undefined });
    setBusy(false);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    setEditing(false); onSaved(); show("Objetivo del equipo guardado.");
  };

  if (editing || (!objective && isFacil)) {
    return (
      <Card pad={18} style={{ borderColor: "color-mix(in srgb, var(--green) 35%, var(--line))" }}>
        <SectionTitle icon="Compass" sub="El Norte al que apuntan las iniciativas">Objetivo del equipo</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="¿Qué quiere lograr este equipo? En una frase. Ej: reducir a la mitad el tiempo de respuesta a clientes." style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="modesel-grid">
            <input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="Señal que lo mide (opcional)" style={inputStyle} />
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Meta (opcional)" style={inputStyle} />
          </div>
          <input value={horizon} onChange={(e) => setHorizon(e.target.value)} placeholder="Horizonte (ej. este trimestre)" style={inputStyle} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            {objective && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>}
            <Button size="sm" icon="Check" disabled={!text.trim() || busy} onClick={save}>{busy ? "Guardando…" : "Guardar objetivo"}</Button>
          </div>
        </div>
      </Card>
    );
  }
  if (!objective) return null; // miembro sin objetivo definido: no mostramos nada
  return (
    <Card pad={18} style={{ borderColor: "color-mix(in srgb, var(--green) 35%, var(--line))", background: "linear-gradient(180deg, rgba(0,232,122,0.05), var(--card))" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div className="eyebrow" style={{ color: "var(--green)", display: "flex", alignItems: "center", gap: 6 }}><Icon name="Compass" size={14} /> Objetivo del equipo{objective.horizon ? ` · ${objective.horizon}` : ""}</div>
        {isFacil && <button onClick={() => setEditing(true)} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Pencil" size={12} /> Editar</button>}
      </div>
      <p style={{ fontSize: "var(--t-md)", fontWeight: 700, lineHeight: 1.4, marginTop: 8 }}>{objective.text}</p>
      {(objective.metric || objective.target) && (
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6 }}>Señal: {objective.metric || "—"}{objective.target ? ` · meta ${objective.target}` : ""}</p>
      )}
    </Card>
  );
}

/** Ritmo / cadencia del equipo: convierte la mejora en hábito. */
function RitmoCard({ teamId, everyDays, lastSessionAt, isFacil, onSaved }: { teamId: string; everyDays: number; lastSessionAt?: string; isFacil: boolean; onSaved: () => void }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const days = lastSessionAt ? Math.floor((Date.now() - new Date(lastSessionAt).getTime()) / 86400000) : null;
  const overdue = days !== null && days > everyDays;
  const setCad = async (d: number) => {
    if (d === everyDays || busy) return;
    setBusy(true);
    const res = await setTeamCadence(teamId, d);
    setBusy(false);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    onSaved();
  };
  return (
    <Card pad={20}>
      <SectionTitle icon="CalendarClock" sub="La mejora continua es un hábito, no un evento">Ritmo del equipo</SectionTitle>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4, marginBottom: 12 }}>
        {days === null ? (
          <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Todavía no hicieron sesiones.</span>
        ) : (
          <>
            <span className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 800, color: overdue ? "var(--warning)" : "var(--ink-0)" }}>{days === 0 ? "hoy" : `hace ${days}d`}</span>
            <span className="muted" style={{ fontSize: "var(--t-xs)" }}>la última sesión</span>
          </>
        )}
      </div>
      {overdue && <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: "var(--r-md)", background: "var(--warning-bg)", color: "var(--warning)", fontSize: "var(--t-xs)", fontWeight: 600, marginBottom: 12 }}><Icon name="Bell" size={14} /> Toca una nueva sesión para sostener el ritmo.</div>}
      <div style={{ display: "flex", gap: 8 }}>
        {[{ d: 7, l: "Semanal" }, { d: 14, l: "Quincenal" }].map((o) => {
          const on = everyDays === o.d;
          return (
            <button key={o.d} disabled={!isFacil || busy} onClick={() => setCad(o.d)}
              style={{ flex: 1, padding: "8px 0", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", fontWeight: 700, background: on ? "var(--green-soft)" : "var(--card-2)", color: on ? "var(--green)" : "var(--ink-2)", border: `1px solid ${on ? "var(--green)" : "var(--line-2)"}`, cursor: isFacil ? "pointer" : "default" }}>
              {o.l}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

/** Checklist de arranque del equipo: desplegable, arriba de las pestañas. */
function PrimerosPasos({ team, isFacil, onInvite, onGoTab }: { team: Team; isFacil: boolean; onInvite: () => void; onGoTab: (tab: string) => void }) {
  const router = useRouter();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  if (!isFacil) return null;
  const live = getTeam(team.id) ?? team;
  const membersDone = live.members.length > 0;
  const fodaDone = !!live.data?.foda;
  const objectiveDone = !!live.data?.objective || (live.objectives ?? []).some((o) => o.status === "active");
  const contractDone = !!live.data?.contract;
  const initDone = (live.initiatives ?? []).length > 0;
  if (membersDone && fodaDone && objectiveDone && contractDone && initDone) return null;
  const startSession = async (type: string) => {
    if (launching) return;
    setLaunching(true);
    const res = await createLiveSession({ teamId: team.id, type });
    setLaunching(false);
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir la sesión", "TriangleAlert"); return; }
    router.push(`/sala/${res.session.id}`);
  };
  const STEPS = [
    { done: membersDone, n: 1, title: "Invitá a los integrantes", desc: "Sumá al equipo para que participen en vivo.", btn: "Invitar", icon: "UserPlus", launch: false, onClick: onInvite },
    { done: fodaDone, n: 2, title: "Hagan el FODA del equipo", desc: "El diagnóstico inicial: fortalezas, oportunidades, debilidades y amenazas, en vivo y anónimo.", btn: launching ? "Abriendo…" : "Iniciar FODA", icon: "Grid2x2", launch: true, onClick: () => startSession("foda") },
    { done: objectiveDone, n: 3, title: "Definí el primer objetivo", desc: "El Norte al que van a apuntar las iniciativas.", btn: "Ir a Objetivos", icon: "Compass", launch: false, onClick: () => onGoTab("objetivos") },
    { done: contractDone, n: 4, title: "Hagan la Sesión Fundacional", desc: "Acuerden cómo va a funcionar el equipo y firmen el contrato.", btn: launching ? "Abriendo…" : "Iniciar Fundacional", icon: "Handshake", launch: true, onClick: () => startSession("founding") },
    { done: initDone, n: 5, title: "Creen la primera iniciativa", desc: "Lo que el equipo va a trabajar para mejorar.", btn: "Ir a Iniciativas", icon: "Target", launch: false, onClick: () => onGoTab("seguimiento") },
  ];
  const doneCount = STEPS.filter((s) => s.done).length;
  const nextIdx = STEPS.findIndex((s) => !s.done);
  return (
    <Card pad={0} style={{ marginBottom: 18, borderColor: "color-mix(in srgb, var(--st-explore) 40%, var(--line))", background: "color-mix(in srgb, var(--st-explore) 8%, transparent)", overflow: "hidden" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", textAlign: "left" }}>
        <Icon name="Rocket" size={15} style={{ color: "var(--st-explore)" }} />
        <span className="eyebrow" style={{ color: "var(--st-explore)" }}>Primeros pasos del equipo</span>
        <span className="num" style={{ fontSize: "var(--t-xs)", fontWeight: 800, color: "var(--ink-1)", background: "var(--card)", borderRadius: 99, padding: "2px 9px" }}>{doneCount}/{STEPS.length}</span>
        {!open && nextIdx >= 0 && <span className="muted" style={{ fontSize: "var(--t-xs)", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Siguiente: {STEPS[nextIdx].title}</span>}
        <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} style={{ color: "var(--ink-2)", marginLeft: "auto", flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "4px 16px 16px" }}>
          {STEPS.map((s, i) => {
            const isNext = i === nextIdx;
            return (
              <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 12, opacity: s.done || isNext ? 1 : 0.55 }}>
                <span style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center", background: s.done ? "var(--success)" : isNext ? "color-mix(in srgb, var(--st-explore) 22%, transparent)" : "var(--card-2)", color: s.done ? "#08120c" : isNext ? "var(--st-explore)" : "var(--ink-3)", border: `1px solid ${s.done ? "var(--success)" : isNext ? "var(--st-explore)" : "var(--line-2)"}`, fontWeight: 800, fontSize: "var(--t-xs)" }}>{s.done ? <Icon name="Check" size={14} /> : s.n}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", textDecoration: s.done ? "line-through" : "none", color: s.done ? "var(--ink-2)" : "var(--ink-0)" }}>{s.title}</div>
                  {isNext && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{s.desc}</p>}
                </div>
                {isNext && <Button size="sm" icon={s.icon} disabled={launching && s.launch} onClick={s.onClick}>{s.btn}</Button>}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/** Columna derecha del equipo: pulso, salud, ritmo y contrato (compartida entre pestañas). */
/** Panel de gamificación del equipo: nivel, XP, racha, misión y logros. */
function TeamProgressPanel({ team, onGoTab }: { team: Team; onGoTab?: (tab: string) => void }) {
  const g = teamProgress(team);
  const next = g.achievements.find((a) => !a.got && a.goal);
  return (
    <Card pad={20} style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--green) 7%, var(--card)), var(--card))", borderColor: "color-mix(in srgb, var(--green) 28%, var(--line))" }}>
      <SectionTitle icon="Trophy" sub={`${g.unlocked.length} logros · ${g.xp} XP`}>Progreso del equipo</SectionTitle>

      {/* Nivel + barra de XP */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span className="num" style={{ fontSize: "var(--t-xs)", fontWeight: 800, color: "var(--green)" }}>NIVEL {g.level.idx + 1}</span>
        <span style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>{g.level.name}</span>
      </div>
      <div style={{ height: 10, borderRadius: 99, background: "var(--card-2)", overflow: "hidden", border: "1px solid var(--line)" }}>
        <div style={{ height: "100%", width: `${g.pct}%`, background: "linear-gradient(90deg, var(--green), #3B82F6)", borderRadius: 99, transition: "width .6s var(--ease)" }} />
      </div>
      <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 5 }}>{g.level.next != null ? `Faltan ${g.toNext} XP para el próximo nivel` : "¡Nivel máximo alcanzado! 🏆"}</div>

      {/* Racha */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "9px 12px", borderRadius: "var(--r-md)", background: g.streak > 0 ? "color-mix(in srgb, var(--warning) 12%, transparent)" : "var(--card-2)", border: `1px solid ${g.streak > 0 ? "color-mix(in srgb, var(--warning) 35%, transparent)" : "var(--line)"}` }}>
        <span style={{ fontSize: 20 }}>🔥</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {g.streak > 0
            ? <><b className="num" style={{ color: "var(--warning)" }}>{g.streak}</b> <span style={{ fontSize: "var(--t-sm)" }}>{g.cadenceDays <= 7 ? (g.streak === 1 ? "semana" : "semanas") : (g.streak === 1 ? "quincena" : "quincenas")} seguidas con ritmo</span></>
            : <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin racha — retomen el ritmo de sesiones</span>}
        </div>
      </div>

      {/* Misión actual */}
      {g.mission && (() => {
        const m = g.mission;
        const clickable = !!(onGoTab && m.tab);
        return (
          <button onClick={() => clickable && onGoTab!(m.tab!)} disabled={!clickable}
            style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12, width: "100%", textAlign: "left", padding: "8px 10px", marginLeft: -10, marginRight: -10, borderRadius: "var(--r-md)", cursor: clickable ? "pointer" : "default", background: "transparent" }}>
            <span style={{ width: 30, height: 30, borderRadius: 99, background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", flexShrink: 0 }}><Icon name="Target" size={16} /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="eyebrow" style={{ color: "var(--green)" }}>Misión</div>
              <div style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{m.label}</div>
            </div>
            {clickable && <Icon name="ChevronRight" size={16} style={{ color: "var(--ink-3)" }} />}
          </button>
        );
      })()}

      {/* Próximo logro */}
      {next && (
        <div style={{ marginTop: 12, padding: "9px 12px", borderRadius: "var(--r-md)", background: "var(--card-2)", border: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
            <Icon name={next.icon} size={14} style={{ color: "var(--ink-2)" }} />
            <span style={{ fontSize: "var(--t-xs)", fontWeight: 700, flex: 1 }}>Próximo: {next.label}</span>
            <span className="num muted" style={{ fontSize: "var(--t-xs)" }}>{next.progress ?? 0}/{next.goal}</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: "var(--bg-2)", overflow: "hidden" }}><div style={{ height: "100%", width: `${Math.min(100, ((next.progress ?? 0) / (next.goal ?? 1)) * 100)}%`, background: "var(--ink-3)", borderRadius: 99 }} /></div>
        </div>
      )}

      {/* Insignias */}
      <div style={{ marginTop: 14 }}>
        <div className="eyebrow" style={{ marginBottom: 8 }}>Logros</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {g.achievements.map((a) => (
            <span key={a.key} title={`${a.label} — ${a.desc}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 9px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, background: a.got ? "var(--success-bg)" : "var(--card-2)", border: `1px solid ${a.got ? "color-mix(in srgb, var(--green) 40%, transparent)" : "var(--line)"}`, color: a.got ? "var(--green)" : "var(--ink-3)", opacity: a.got ? 1 : 0.6 }}>
              <Icon name={a.got ? a.icon : "Lock"} size={12} />{a.label}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TeamSidebar({ team, onGoTab }: { team: Team; onGoTab?: (tab: string) => void }) {
  const live = getTeam(team.id) ?? team;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <TeamProgressPanel team={live} onGoTab={onGoTab} />
    </div>
  );
}

/** Salud rápida del equipo (vive dentro de la pestaña Pulso). */
function HealthCard({ team }: { team: Team }) {
  const inits = getInitiatives(team.id);
  const lowSafety = team.psychSafety > 0 && team.psychSafety < 70;
  return (
    <Card pad={20}>
      <SectionTitle icon="HeartPulse">Salud rápida</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Row label="Confianza" value={team.psychSafety ? to5(team.psychSafety).toFixed(1) + "/5" : "—"} color={lowSafety ? "var(--warning)" : "var(--success)"} pct={team.psychSafety} />
        <Row label="Iniciativas en curso" value={inits.filter((i) => i.status === "active").length} />
        <Row label="Ideación en curso" value={inits.filter((i) => i.stage === "ideation" && i.status === "active").length} />
        <Row label="Sesiones realizadas" value={team.sessions.length} />
        {(() => {
          const doneOk = inits.filter((i) => i.status === "done" && i.data?.learn?.result).sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
          let streak = 0; for (const i of doneOk) { if (i.data?.learn?.result === "yes") streak++; else break; }
          return streak >= 2 ? <Row label="Racha de mejoras" value={`🔥 ${streak} seguidas`} color="var(--warning)" /> : null;
        })()}
      </div>
    </Card>
  );
}

/** Módulo de Exploración: diagnóstico del equipo, fuera del ciclo. */
function ExploracionSection({ team, isFacil }: { team: Team; isFacil: boolean }) {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const EXPLORE_TYPES = ["explore", "foda", "madsadglad", "oneword", "timeline", "balloon", "teamradar", "sailboat", "circles", "relationships", "expclose"];
  const expSessions = team.sessions.filter((s) => EXPLORE_TYPES.includes(s.stage));
  const closedAt = (team.data as { explorationClosedAt?: string } | undefined)?.explorationClosedAt;
  const catalog = retrosForStage("exploration").filter((r) => r.id !== "exploration-close");
  const doneNames = new Set(expSessions.map((s) => s.retro));
  // Memoria viva: las sesiones de Exploración con su contenido para reconstruir cada visualización.
  const [memories, setMemories] = useState<SessionMemory[]>([]);
  useEffect(() => {
    let active = true;
    (async () => {
      const ss = (await getClosedTeamSessions(team.id)).filter((s) => EXPLORE_TYPES.includes(s.type) && s.type !== "expclose");
      const mems = await loadSessionMemories(ss);
      if (active) setMemories(mems.reverse()); // más recientes primero
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team.id, team.sessions.length]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {launcherOpen && <SessionLauncher team={team} initialStage="exploration" onClose={() => setLauncherOpen(false)} />}
      <Card pad={20} style={{ border: "1.5px dashed color-mix(in srgb, var(--st-explore) 55%, var(--line))", background: "color-mix(in srgb, var(--st-explore) 6%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ width: 42, height: 42, borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--st-explore) 16%, transparent)", color: "var(--st-explore)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Telescope" size={21} /></span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Exploración <span className="muted" style={{ fontWeight: 500, fontSize: "var(--t-xs)" }}>· módulo de diagnóstico, fuera del ciclo</span></div>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>Para descubrir qué trabajar. Hagan las retros que necesiten y cierren con el mapa de mejoras. Si ya saben qué mejorar, pueden arrancar directo en Objetivos.</p>
          </div>
          {closedAt && <Pill color="var(--success)" bg="var(--success-bg)" icon="Map">Mapa generado · {new Date(closedAt).toLocaleDateString("es", { day: "2-digit", month: "short" })}</Pill>}
        </div>
        {isFacil && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <Button size="sm" icon="Users" onClick={() => setLauncherOpen(true)}>Abrir sesión de Exploración</Button>
          </div>
        )}
      </Card>

      <Card pad={20}>
        <SectionTitle icon="Layers" sub="El equipo elige cuáles hacer y en qué orden">Retros del módulo ({catalog.length})</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 10 }}>
          {catalog.map((r) => {
            const done = doneNames.has(r.name);
            return (
              <div key={r.id} style={{ display: "flex", gap: 10, padding: "11px 12px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", opacity: 1 }}>
                <span style={{ color: r.category === "growthloop" ? "var(--green)" : "var(--ink-2)", flexShrink: 0, marginTop: 2 }}><Icon name={r.category === "growthloop" ? "Sparkles" : "BookOpen"} size={15} /></span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{r.name}</span>
                    {done && <Pill color="var(--success)" bg="var(--success-bg)" icon="Check">hecha</Pill>}
                    {r.sensitive && <Pill color="var(--warning)" bg="var(--warning-bg)" icon="ShieldAlert">sensible</Pill>}
                  </div>
                  <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{r.description}</div>
                </div>
                <span className="num muted" style={{ fontSize: "var(--t-xs)", flexShrink: 0 }}>{r.duration}′</span>
              </div>
            );
          })}
        </div>
      </Card>

      {team.data?.foda && (
        <Card pad={20}>
          <SectionTitle icon="Grid2x2" sub={team.data.foda.date ? `Hecho el ${team.data.foda.date}` : "El diagnóstico FODA del equipo"}>FODA del equipo</SectionTitle>
          <FodaGrid team={team} />
        </Card>
      )}

      <Card pad={20}>
        <SectionTitle icon="History" sub="Todo lo que descubrió el equipo, siempre visible">Lo que produjo el equipo ({memories.length})</SectionTitle>
        {memories.length === 0
          ? <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Todavía no hicieron ninguna retro de Exploración.</p>
          : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{memories.map((m) => <MemoryCard key={m.id} mem={m} defaultOpen={false} />)}</div>}
        {isFacil && !closedAt && expSessions.length > 0 && (
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="Map" size={13} style={{ color: "var(--st-explore)" }} /> ¿Ya exploraron suficiente? Abran la retro <b>Cierre de Exploración</b> para votar prioridades y generar el mapa de mejoras.
          </p>
        )}
      </Card>
    </div>
  );
}

/** Objetivos del equipo (varios): cada uno agrupa iniciativas. */
function ObjetivosSection({ team, isFacil, onChanged, onGoIniciativas }: { team: Team; isFacil: boolean; onChanged: () => void; onGoIniciativas?: () => void }) {
  const router = useRouter();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(""); const [metric, setMetric] = useState(""); const [target, setTarget] = useState(""); const [horizon, setHorizon] = useState("este trimestre");
  const [busy, setBusy] = useState(false);
  const objectives = team.objectives ?? [];
  const actives = objectives.filter((o) => o.status === "active");
  const pastCount = objectives.length - actives.length;
  const inits = team.initiatives ?? [];
  const inputS: React.CSSProperties = { width: "100%", background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" };
  const create = async () => {
    if (!text.trim() || busy) return;
    setBusy(true);
    const res = await createObjective({ teamId: team.id, text, metric, target, horizon });
    setBusy(false);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    setText(""); setMetric(""); setTarget(""); setOpen(false); onChanged(); show("Objetivo creado.");
  };
  const mark = async (id: string, status: "achieved" | "archived", label: string) => {
    if (!window.confirm(`¿Marcar este objetivo como ${label}?`)) return;
    const res = await setObjectiveStatus(id, status);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    onChanged(); show(status === "achieved" ? "🎯 ¡Objetivo logrado!" : "Objetivo archivado.");
  };
  return (
    <Card pad={18} style={{ borderColor: "color-mix(in srgb, var(--green) 35%, var(--line))" }}>
      <SectionTitle icon="Compass" sub="Los Nortes del equipo · cada uno agrupa sus iniciativas"
        right={isFacil ? <Button size="sm" variant="secondary" icon="Plus" onClick={() => setOpen((o) => !o)}>Nuevo objetivo</Button> : undefined}>
        Objetivos
      </SectionTitle>
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "8px 0 14px", padding: 12, background: "var(--card-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)" }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="¿Qué quiere lograr el equipo? Ej: reducir a la mitad el tiempo de respuesta." style={{ ...inputS, minHeight: 52, resize: "vertical" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }} className="modesel-grid">
            <input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="Señal (opcional)" style={inputS} />
            <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Meta (opcional)" style={inputS} />
            <input value={horizon} onChange={(e) => setHorizon(e.target.value)} placeholder="Horizonte" style={inputS} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}><Button size="sm" icon="Check" disabled={!text.trim() || busy} onClick={create}>{busy ? "Creando…" : "Crear objetivo"}</Button></div>
        </div>
      )}
      {actives.length === 0 && !open && <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6 }}>{isFacil ? "Cargá el primer objetivo: el Norte al que van a apuntar las iniciativas." : "El facilitador todavía no cargó objetivos."}</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: actives.length ? 8 : 0 }}>
        {actives.map((o) => { const objInits = inits.filter((i) => i.objectiveId === o.id); return (
          <div key={o.id} style={{ padding: "12px 14px", background: "linear-gradient(180deg, rgba(0,232,122,0.05), var(--card-2))", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <Icon name="Compass" size={15} style={{ color: "var(--green)", marginTop: 3, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", lineHeight: 1.4 }}>{o.text}</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{o.metric ? `Señal: ${o.metric}${o.target ? ` · meta ${o.target}` : ""} · ` : ""}{o.horizon ?? ""}</div>
              </div>
              {isFacil && (
                <span style={{ display: "inline-flex", gap: 6, flexShrink: 0 }}>
                  <button title="Marcar logrado 🎯" onClick={() => mark(o.id, "achieved", "LOGRADO 🎯")} style={{ color: "var(--green)", display: "inline-flex", padding: 3 }}><Icon name="Trophy" size={15} /></button>
                  <button title="Archivar" onClick={() => mark(o.id, "archived", "archivado")} style={{ color: "var(--ink-3)", display: "inline-flex", padding: 3 }}><Icon name="Archive" size={15} /></button>
                </span>
              )}
            </div>
            {/* las iniciativas de este objetivo */}
            <div style={{ marginTop: 10, paddingLeft: 25, display: "flex", flexDirection: "column", gap: 6 }}>
              {objInits.map((i) => (
                <button key={i.id} onClick={() => router.push(`/equipos/${team.id}/iniciativa/${i.id}`)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: "var(--r-sm)", textAlign: "left", background: "var(--card)", border: "1px solid var(--line)" }}>
                  <Icon name="Target" size={13} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: "var(--t-sm)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.title}</span>
                  <StageBadge stage={i.stage} size="sm" />
                  <Icon name="ChevronRight" size={14} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                </button>
              ))}
              {objInits.length === 0 && (
                <button onClick={onGoIniciativas} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderRadius: "var(--r-sm)", textAlign: "left", border: "1px dashed var(--line-2)", color: "var(--ink-2)", fontSize: "var(--t-sm)" }}>
                  <Icon name="Plus" size={13} /> Sin iniciativas todavía · crear una en Iniciativas
                </button>
              )}
              {objInits.length > 0 && onGoIniciativas && (
                <button onClick={onGoIniciativas} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 5, color: "var(--green)", fontSize: "var(--t-xs)", fontWeight: 600, padding: "2px 0" }}>
                  Ir a Iniciativas <Icon name="ArrowRight" size={12} />
                </button>
              )}
            </div>
          </div>
        ); })}
      </div>
      {pastCount > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {objectives.filter((o) => o.status !== "active").map((o) => (
            <span key={o.id} title={o.text} style={{ fontSize: "var(--t-xs)", padding: "3px 10px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)", color: o.status === "achieved" ? "var(--green)" : "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 5, maxWidth: 260 }}>
              <Icon name={o.status === "achieved" ? "Trophy" : "Archive"} size={11} /><span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.text}</span>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function SeguimientoPanel({ team, isFacil, onOpenPulse, onInvite, onGoTab }: { team: Team; isFacil: boolean; onOpenPulse: () => void; onInvite: () => void; onGoTab?: (tab: string) => void }) {
  const router = useRouter();
  const { show } = useToast();
  const [, setNonce] = useState(0);
  const refresh = () => setNonce((n) => n + 1);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Initiative | null>(null);
  const [gate, setGate] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [filter, setFilter] = useState<Initiative["status"]>("active");
  const hasContract = !!team.data?.contract;
  const startFounding = async () => {
    if (launching) return;
    setLaunching(true);
    const res = await createLiveSession({ teamId: team.id, type: "founding" });
    setLaunching(false);
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir la sesión", "TriangleAlert"); return; }
    router.push(`/sala/${res.session.id}`);
  };
  const newInitiative = () => { if (!hasContract) setGate(true); else setModal(true); };
  const live = getTeam(team.id) ?? team;
  const objective = live.data?.objective;
  const cadence = live.data?.cadence?.everyDays ?? 14;
  const inits = getInitiatives(team.id);
  const counts = {
    active: inits.filter((i) => i.status === "active").length,
    paused: inits.filter((i) => i.status === "paused").length,
    done: inits.filter((i) => i.status === "done").length,
  };
  const shown = inits.filter((i) => i.status === filter);
  const lowSafety = team.psychSafety > 0 && team.psychSafety < 70;
  // Recordatorios derivados (sin cron): lo accionable que ya cumplió su fecha.
  const today = Date.now();
  const past = (iso?: string) => !!iso && new Date(iso).getTime() <= today;
  const reminders: { icon: string; color: string; text: string; cta: string; init: Initiative }[] = [
    ...inits.filter((i) => i.data?.consolidate?.pending && past(i.data.consolidate.due)).map((i) => ({ icon: "ClipboardCheck", color: "var(--st-follow)", text: `Consolidación de “${i.title}” lista para verificar`, cta: "Hacer el check", init: i })),
    ...inits.filter((i) => i.status === "paused" && past(i.data?.learn?.pauseReviewAt)).map((i) => ({ icon: "PlayCircle", color: "var(--warning)", text: `“${i.title}” quedó pausada para revisar`, cta: "Ver variable", init: i })),
    ...inits.filter((i) => past(i.data?.learn?.letterDate)).map((i) => ({ icon: "Mail", color: "var(--st-learn)", text: `La carta al equipo futuro de “${i.title}” cumplió su fecha`, cta: "Ver carta", init: i })),
  ];
  const FILTERS: { key: Initiative["status"]; label: string }[] = [
    { key: "active", label: "En curso" },
    { key: "paused", label: "Pausadas" },
    { key: "done", label: "Cerradas" },
  ];

  return (
    <div className="team-grid">
      <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em" }}>Iniciativas</h2>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>Lo que el equipo está trabajando para mejorar. Cada una recorre su propio ciclo.</p>
          </div>
          {isFacil && <Button icon="Plus" onClick={newInitiative}>Nueva iniciativa</Button>}
        </div>

        {reminders.length > 0 && (
          <Card pad={16} style={{ border: "1px solid color-mix(in srgb, var(--st-follow) 35%, var(--line))", background: "color-mix(in srgb, var(--st-follow) 6%, var(--card))" }}>
            <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: "var(--st-follow)" }}><Icon name="BellRing" size={13} /> Recordatorios del equipo</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reminders.map((rm, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <Icon name={rm.icon} size={16} style={{ color: rm.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 140, fontSize: "var(--t-sm)" }}>{rm.text}</span>
                  <Button size="sm" variant="secondary" onClick={() => router.push(`/equipos/${team.id}/iniciativa/${rm.init.id}`)}>{rm.cta}</Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            const c = counts[f.key];
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? "var(--green-soft)" : "var(--card)", color: on ? "var(--green)" : "var(--ink-2)", border: `1px solid ${on ? "var(--green)" : "var(--line-2)"}`, transition: "all .14s" }}>
                {f.label}
                <span className="num" style={{ background: on ? "var(--green)" : "var(--card-2)", color: on ? "#06140d" : "var(--ink-2)", borderRadius: 99, padding: "1px 7px", fontSize: "var(--t-xs)", fontWeight: 700 }}>{c}</span>
              </button>
            );
          })}
        </div>

        {inits.length === 0 ? (
          <Card pad={0}>
            <EmptyState icon="Target" title="Todavía no hay iniciativas"
              action={isFacil ? <Button icon="Plus" onClick={newInitiative}>Crear la primera</Button> : undefined}>
              Una iniciativa nace de una sesión de exploración: definís qué quieren mejorar y empieza a recorrer las etapas. Pueden convivir varias en paralelo.
            </EmptyState>
          </Card>
        ) : shown.length === 0 ? (
          <Card pad={0}>
            <EmptyState icon="Inbox" title={`Sin iniciativas ${FILTERS.find((f) => f.key === filter)!.label.toLowerCase()}`}>
              No hay iniciativas en este estado por ahora.
            </EmptyState>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {(() => {
              const objs = (live.objectives ?? []).filter((o) => o.status === "active");
              const groups: { key: string; label: string | null; items: typeof shown }[] = [
                ...objs.map((o) => ({ key: o.id, label: o.text, items: shown.filter((i) => i.objectiveId === o.id) })),
                { key: "none", label: null, items: shown.filter((i) => !i.objectiveId || !objs.some((o) => o.id === i.objectiveId)) },
              ].filter((g) => g.items.length > 0);
              return groups.map((g) => (
                <div key={g.key}>
                  <div className="eyebrow" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 6, color: g.label ? "var(--green)" : "var(--ink-3)" }}>
                    <Icon name={g.label ? "Compass" : "CircleDashed"} size={13} /> {g.label ?? "Sin objetivo"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {g.items.map((i) => <InitiativeCard key={i.id} team={team} init={i} isFacil={isFacil} onChanged={refresh} onEdit={() => setEditing(i)} />)}
                  </div>
                </div>
              ));
            })()}
          </div>
        )}
      </div>

      <TeamSidebar team={team} onGoTab={onGoTab} />

      {modal && <InitiativeModal teamId={team.id} onClose={() => setModal(false)} onSaved={refresh} />}
      {editing && <InitiativeModal teamId={team.id} editing={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {gate && <FoundingGateModal launching={launching} onClose={() => setGate(false)} onStart={startFounding} />}
    </div>
  );
}

function InviteMemberModal({ team, onClose }: { team: Team; onClose: () => void }) {
  const { show } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const valid = /\S+@\S+\.\S+/.test(email);
  const members = team.members.filter((m) => !m.id || !removed.has(m.id));

  const invite = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const res = await inviteMember({ teamId: team.id, orgId: team.orgId, email });
    setBusy(false);
    if (res.error) setError(res.error); else if (res.token) setToken(res.token);
  };

  const remove = async (m: { id?: string; name: string }) => {
    if (!m.id) return;
    if (!window.confirm(`¿Quitar a ${m.name} del equipo?`)) return;
    const res = await removeTeamMember(m.id);
    if (res.error) { show(res.error, "TriangleAlert"); return; }
    setRemoved((s) => new Set([...s, m.id!]));
    show(`${m.name} quitado del equipo.`);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center" }}><Icon name="UserPlus" size={20} /></div>
          <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 700 }}>Invitar integrante</h3>
        </div>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 18 }}>A <b style={{ color: "var(--ink-1)" }}>{team.name}</b>. Se genera un link para que la persona se registre y participe de las sesiones.</p>
        {members.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Integrantes actuales</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {members.map((m, i) => (
                <div key={m.id ?? i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-sm)", fontSize: "var(--t-sm)" }}>
                  <Avatar name={m.name} initials={m.initials} size={26} idx={i} />
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{m.name}</span>
                  {m.id && <button onClick={() => remove(m)} title="Quitar del equipo" style={{ color: "var(--ink-3)", display: "inline-flex", padding: 4 }}><Icon name="X" size={14} /></button>}
                </div>
              ))}
            </div>
          </div>
        )}
        {token ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontSize: "var(--t-sm)", fontWeight: 600 }}><Icon name="Check" size={16} /> Invitación lista. Pasale este link:</div>
            <CopyLink path={`/invite/${token}`} />
            <Button variant="ghost" onClick={onClose} style={{ alignSelf: "flex-end" }}>Listo</Button>
          </div>
        ) : (
          <>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Email del integrante</label>
            <input autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} onKeyDown={(e) => e.key === "Enter" && invite()} placeholder="persona@empresa.com"
              style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
            {error && <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#ff8b8b", fontSize: "var(--t-sm)", fontWeight: 600, marginTop: 12 }}><Icon name="TriangleAlert" size={16} /> {error}</div>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button icon="Link" disabled={!valid || busy} onClick={invite}>{busy ? "Generando…" : "Generar link"}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();
  const isFacil = user?.role === "facilitator";
  const team = getTeam(params.id ?? "");
  const [tab, setTab] = useState("objetivos");
  const [, setTeamNonce] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [protocolOpen, setProtocolOpen] = useState(false);
  const [celeb, setCeleb] = useState<{ title: string; subtitle?: string; emoji: string } | null>(null);

  // Celebración: confetti al subir de nivel o cerrar un ciclo (la 1ª vez fija la
  // línea de base en silencio para no festejar el historial retroactivo).
  useEffect(() => {
    if (!team) return;
    const g = teamProgress(team);
    const cel = team.data?.celebrated;
    let fired = false;
    if (!cel) { markCelebrated(team.id, { level: g.level.idx, cycles: g.cycles }); }
    else if (g.cycles > cel.cycles) {
      setCeleb({ title: "¡Ciclo de mejora cerrado! 🎉", subtitle: `El equipo completó ${g.cycles} ${g.cycles === 1 ? "mejora" : "mejoras"} de punta a punta`, emoji: "🏆" });
      markCelebrated(team.id, { level: g.level.idx, cycles: g.cycles }); fired = true;
    } else if (g.level.idx > cel.level) {
      setCeleb({ title: `¡Subieron a Nivel ${g.level.idx + 1}!`, subtitle: g.level.name, emoji: "⭐" });
      markCelebrated(team.id, { level: g.level.idx, cycles: g.cycles }); fired = true;
    }
    // Logro recién desbloqueado (recordado por navegador para no repetir).
    try {
      const key = `gl_ach_${team.id}`;
      const prevRaw = localStorage.getItem(key);
      const nowKeys = g.unlocked.map((a) => a.key);
      if (prevRaw === null) { localStorage.setItem(key, JSON.stringify(nowKeys)); }
      else {
        const prev = JSON.parse(prevRaw) as string[];
        const fresh = nowKeys.filter((k) => !prev.includes(k));
        if (fresh.length) {
          localStorage.setItem(key, JSON.stringify(nowKeys));
          if (!fired) { const a = g.achievements.find((x) => x.key === fresh[0]); if (a) setCeleb({ title: "¡Logro desbloqueado! 🏅", subtitle: a.label, emoji: "🏅" }); }
        }
      }
    } catch { /* localStorage no disponible */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team?.id, team?.sessions.length, team?.initiatives?.filter((i) => i.status === "done").length, team?.initiatives?.length, team?.data?.library?.length]);

  if (!team) return <div className="screen-pad">Equipo no encontrado.</div>;
  const g = teamProgress(team);
  const lead = team.facilitatorId ? getFacilitators().find((f) => f.id === team.facilitatorId) : undefined;
  const doDeleteTeam = async () => { setDelBusy(true); const res = await deleteTeam(team.id); setDelBusy(false); if (res.error) { show(res.error, "TriangleAlert"); return; } show("Equipo eliminado", "Trash2"); router.push("/organizaciones"); };
  const lowSafety = team.psychSafety > 0 && team.psychSafety < 70;

  const TABS = [
    { key: "exploracion", label: "Exploración", icon: "Telescope" },
    { key: "objetivos", label: "Objetivos", icon: "Compass" },
    { key: "seguimiento", label: "Iniciativas", icon: "Target" },
    { key: "pulso", label: "Pulso", icon: "Activity" },
    { key: "sesiones", label: "Sesiones", icon: "History" },
  ];

  return (
    <div className="screen-pad">
      <Celebration show={!!celeb} title={celeb?.title ?? ""} subtitle={celeb?.subtitle} emoji={celeb?.emoji} onDone={() => setCeleb(null)} />
      {protocolOpen && (
        <div onClick={() => setProtocolOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <span style={{ width: 44, height: 44, borderRadius: "var(--r-lg)", background: "var(--warning-bg)", color: "var(--warning)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="ShieldAlert" size={22} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "var(--t-lg)" }}>Protocolo de clima</div>
                <div className="muted" style={{ fontSize: "var(--t-sm)" }}>Confianza en <b className="num">{to5(team.psychSafety).toFixed(1)}/5</b> · por debajo del umbral</div>
              </div>
              <button onClick={() => setProtocolOpen(false)} style={{ color: "var(--ink-2)" }}><Icon name="X" size={22} /></button>
            </div>
            <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, marginBottom: 14 }}>
              Con la confianza baja, el equipo se va a guardar lo importante. Antes de profundizar en causas o conflictos, conviene recuperar el clima. Pasos sugeridos:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
              {[
                { n: 1, t: "Reconocé antes de pedir", d: "Arrancá con una retro de reconocimiento (Kudos) o de relación (¿Cómo nos relacionamos?). Suben la confianza sin exponer a nadie." },
                { n: 2, t: "Volvé al contrato", d: "Recordá en voz alta las reglas de seguridad que el equipo acordó. Si no hay contrato, hacé la Sesión Fundacional." },
                { n: 3, t: "Evitá lo sensible por ahora", d: "Postergá retros sensibles (ej. Speed Dating) y la profundización de causas hasta que la confianza se recupere." },
                { n: 4, t: "Volvé a medir", d: "Tomá el pulso de nuevo en la próxima sesión para ver si el clima mejora." },
              ].map((s) => (
                <div key={s.n} style={{ display: "flex", gap: 11, padding: "11px 13px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                  <span className="num" style={{ width: 24, height: 24, borderRadius: 99, background: "var(--warning-bg)", color: "var(--warning)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{s.n}</span>
                  <div><div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{s.t}</div><div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2, lineHeight: 1.5 }}>{s.d}</div></div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              {isFacil && <Button variant="secondary" icon="Telescope" onClick={() => { setProtocolOpen(false); setTab("exploracion"); }}>Ir a una retro de clima</Button>}
              <Button icon="Check" onClick={() => setProtocolOpen(false)}>Entendido</Button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", marginBottom: 14 }}>
        <button onClick={() => router.push("/organizaciones")} className="muted">Organizaciones</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <button onClick={() => router.push("/organizaciones")} className="muted">{team.org}</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <span style={{ fontWeight: 600 }}>{team.name}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{team.name}</h1>
            <StageBadge stage={teamLiveStage(team) ?? "queue"} />
            <span title={`${g.xp} XP · ${g.pct}% al próximo nivel`} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--green)", background: "var(--green-soft)", border: "1px solid color-mix(in srgb, var(--green) 30%, transparent)", padding: "4px 11px", borderRadius: "var(--r-full)" }}>
              <Icon name="Trophy" size={13} /> {g.level.name}
              {g.streak > 0 && <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "var(--warning)" }}><Icon name="Flame" size={12} /> {g.streak}</span>}
            </span>
          </div>
          <p className="muted" style={{ marginTop: 6, maxWidth: 560, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="Quote" size={15} /> {team.purpose}
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 12, flexWrap: "wrap" }}>
            <AvatarStack people={team.members} max={6} size={30} />
            <span className="muted" style={{ fontSize: "var(--t-sm)" }}>{team.members.length} integrantes · {team.area} · cliente {team.clientType.toLowerCase()}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", padding: "5px 10px", borderRadius: "var(--r-full)", background: "var(--card-2)", border: "1px solid var(--line)" }}>
              <Icon name="UserCog" size={14} className="" style={{ color: "var(--info)" }} />
              <span className="muted">Facilitador:</span>
              <b style={{ color: lead ? "var(--ink-0)" : "var(--ink-3)" }}>{lead?.name ?? "Sin asignar"}</b>
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="secondary" icon="Handshake" onClick={() => setContractOpen(true)}>Contrato</Button>
          <Button variant="secondary" icon="Library" onClick={() => router.push(`/equipos/${team.id}/biblioteca`)}>Biblioteca</Button>
          <Button variant="secondary" icon="FileBarChart" onClick={() => router.push(`/reporte/${team.id}`)}>Reporte</Button>
          {isFacil && <Button variant="secondary" icon="Settings" onClick={() => setSettingsOpen(true)}>Ajustes</Button>}
          {isFacil && <Button icon="UserPlus" onClick={() => setInviteOpen(true)}>Invitar integrante</Button>}
          {isFacil && <Button variant="ghost" icon="Trash2" onClick={() => setDelOpen(true)} style={{ color: "var(--risk)" }}>Eliminar</Button>}
        </div>
      </div>

      {lowSafety && (
        <div style={{ marginBottom: 18 }}>
          <AlertBanner type="warning" icon="ShieldAlert" title="Confianza baja en el equipo"
            action={<Button size="sm" variant="secondary" onClick={() => setProtocolOpen(true)}>Ver protocolo</Button>}>
            La confianza entre miembros está en <b className="num">{to5(team.psychSafety).toFixed(1)}/5</b>, por debajo del umbral. Cuidá el clima antes de profundizar en causas.
          </AlertBanner>
        </div>
      )}

      <PrimerosPasos team={team} isFacil={isFacil} onInvite={() => setInviteOpen(true)} onGoTab={setTab} />
      <div style={{ marginBottom: 20 }}><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {tab === "exploracion" && (
        <div className="team-grid">
          <div style={{ minWidth: 0 }}>
            <ExploracionSection team={getTeam(team.id) ?? team} isFacil={isFacil} />
          </div>
          <TeamSidebar team={team} onGoTab={setTab} />
        </div>
      )}

      {tab === "objetivos" && (
        <div className="team-grid">
          <div style={{ minWidth: 0 }}>
            <ObjetivosSection team={getTeam(team.id) ?? team} isFacil={isFacil} onChanged={() => setTeamNonce((n) => n + 1)} onGoIniciativas={() => setTab("seguimiento")} />
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 14 }}>
              Las iniciativas de cada objetivo se gestionan en la pestaña <button onClick={() => setTab("seguimiento")} style={{ color: "var(--green)", fontWeight: 600 }}>Iniciativas</button>.
            </p>
          </div>
          <TeamSidebar team={team} onGoTab={setTab} />
        </div>
      )}
      {tab === "seguimiento" && <SeguimientoPanel team={team} isFacil={isFacil} onOpenPulse={() => setTab("pulso")} onInvite={() => setInviteOpen(true)} onGoTab={setTab} />}

      {tab === "pulso" && <PulseDetail team={team} isFacil={isFacil} />}

      {tab === "sesiones" && (
        team.sessions.length ? <SessionsLog team={team} /> : (
          <Card>
            <EmptyState icon="History" title="Sin sesiones aún">
              Las sesiones se hacen dentro de cada iniciativa. Abrí una iniciativa en <b style={{ color: "var(--ink-1)" }}>Iniciativas</b> y arrancá una sesión desde ahí; acá vas a ver el registro de todas.
            </EmptyState>
          </Card>
        )
      )}

      {inviteOpen && <InviteMemberModal team={team} onClose={() => setInviteOpen(false)} />}
      {contractOpen && <ContractModal team={team} onClose={() => setContractOpen(false)} />}
      {settingsOpen && (
        <div onClick={() => setSettingsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 24, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}><Icon name="Settings" size={18} style={{ color: "var(--ink-2)" }} /><h3 style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>Ajustes del equipo</h3><button onClick={() => setSettingsOpen(false)} style={{ marginLeft: "auto", color: "var(--ink-2)" }}><Icon name="X" size={18} /></button></div>
            <RitmoCard teamId={team.id} everyDays={team.data?.cadence?.everyDays ?? 14} lastSessionAt={team.data?.lastSessionAt} isFacil={isFacil} onSaved={() => setTeamNonce((n) => n + 1)} />
          </div>
        </div>
      )}
      {delOpen && (
        <div onClick={() => setDelOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, textAlign: "center", animation: "pop-in .25s var(--spring)" }}>
            <div style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "var(--risk-bg)", color: "var(--risk)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="Trash2" size={26} /></div>
            <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>Eliminar “{team.name}”</h3>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, lineHeight: 1.55 }}>Se borran <b style={{ color: "var(--ink-0)" }}>todas sus iniciativas, sesiones, pulso e integrantes</b>. Esta acción no se puede deshacer.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <Button full size="lg" icon="Trash2" disabled={delBusy} onClick={doDeleteTeam} style={{ background: "var(--risk)", color: "#fff" }}>{delBusy ? "Eliminando…" : "Sí, eliminar el equipo"}</Button>
              <Button full variant="ghost" onClick={() => setDelOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
