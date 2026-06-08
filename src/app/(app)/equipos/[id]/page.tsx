"use client";

import { useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  AlertBanner, AvatarStack, Bar, Button, Card, CopyLink, EmptyState, Pill,
  PulseChart, SectionTitle, StageBadge, Trend,
} from "@/components/ui";
import {
  createInitiative, deleteTeam, getFacilitators, getInitiatives, getTeam, inviteMember,
  setInitiativeStage, setInitiativeStatus, setTeamCadence, setTeamObjective, updateInitiative,
} from "@/lib/repository";
import { CYCLE_STAGES, FOUNDING_QUESTIONS, PULSE_DIMS, STAGES, type Initiative, type StageKey, type Team, type TeamObjective } from "@/lib/data";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/Toast";
import { createLiveSession } from "@/lib/session";

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

function PulseDetail({ team }: { team: Team }) {
  if (team.pulse.length === 0) {
    return (
      <Card pad={0}>
        <EmptyState icon="Activity" title="Sin datos de pulso todavía">
          El pulso del equipo se construye con cada sesión. Cuando hagas la primera, vas a ver acá la evolución.
        </EmptyState>
      </Card>
    );
  }
  const first = team.pulse[0], last = team.pulse[team.pulse.length - 1];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card pad={20}>
        <SectionTitle icon="Activity" sub="5 dimensiones a lo largo de las sesiones">Pulso del equipo</SectionTitle>
        <PulseChart data={team.pulse} dims={PULSE_DIMS} height={300} />
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
        {PULSE_DIMS.map((d) => {
          const delta = last[d.key] - first[d.key];
          return (
            <Card key={d.key} pad={16}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color }} />
                <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{d.label}</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 700 }}>{last[d.key]}</span>
                <Trend dir={delta >= 0 ? "up" : "down"} value={(delta >= 0 ? "+" : "") + delta} />
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

function ContractCard({ team }: { team: Team }) {
  const c = team.data?.contract;
  const [open, setOpen] = useState(false);
  if (!c) return null;
  return (
    <Card pad={20}>
      <SectionTitle icon="Handshake" sub={`Firmado · ${c.date}`}
        right={<button onClick={() => setOpen((o) => !o)} style={{ color: "var(--green)", fontSize: "var(--t-sm)", fontWeight: 600 }}>{open ? "Ocultar" : "Ver"}</button>}>
        Contrato del equipo
      </SectionTitle>
      {c.answers?.purpose && <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, marginTop: 4 }}>{c.answers.purpose}</p>}
      {open && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {FOUNDING_QUESTIONS.map((q) => (
            <div key={q.key}>
              <div className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600 }}>{q.q}</div>
              <div style={{ fontSize: "var(--t-sm)", lineHeight: 1.45, color: c.answers?.[q.key] ? "var(--ink-0)" : "var(--ink-3)" }}>{c.answers?.[q.key] || "—"}</div>
            </div>
          ))}
        </div>
      )}
      {!!(c.signedNames?.length) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
          {c.signedNames!.map((n) => <span key={n} className="num" style={{ fontSize: "var(--t-xs)", color: "var(--green)", background: "var(--success-bg)", borderRadius: 99, padding: "2px 9px", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="PenLine" size={11} />{n}</span>)}
        </div>
      )}
    </Card>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = title.trim().length > 2;

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const res = editing
      ? await updateInitiative(editing.id, { title, description: desc })
      : await createInitiative({ teamId, title, description: desc });
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
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Objetivo / qué van a mejorar</label>
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

function InitiativeCard({ team, init, isFacil, onChanged, onEdit }: { team: Team; init: Initiative; isFacil: boolean; onChanged: () => void; onEdit: () => void }) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const startLive = async () => {
    const res = await createLiveSession({ teamId: team.id, initiativeId: init.id, type: init.stage });
    if (res.error || !res.session) { show(res.error ?? "No se pudo abrir la sesión", "TriangleAlert"); return; }
    router.push(`/sala/${res.session.id}`);
  };
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{init.title}</span>
            {done && <Pill color="var(--success)" bg="var(--success-bg)" icon="CircleCheck">Cerrada</Pill>}
            {paused && <Pill color="var(--warning)" bg="var(--warning-bg)" icon="Pause">Pausada</Pill>}
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

function SeguimientoPanel({ team, isFacil, onOpenPulse, onInvite }: { team: Team; isFacil: boolean; onOpenPulse: () => void; onInvite: () => void }) {
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

        {isFacil && <ObjetivoCard teamId={team.id} objective={objective} isFacil={isFacil} onSaved={refresh} />}

        {isFacil && (() => {
          const membersDone = team.members.length > 0;
          const objectiveDone = !!objective;
          const contractDone = hasContract;
          const initDone = inits.length > 0;
          if (membersDone && objectiveDone && contractDone && initDone) return null;
          const STEPS = [
            { done: membersDone, n: 1, title: "Invitá a los integrantes", desc: "Sumá al equipo para que participen en vivo.", btn: "Invitar", icon: "UserPlus", onClick: onInvite },
            { done: objectiveDone, n: 2, title: "Definí el objetivo del equipo", desc: "El Norte al que van a apuntar las iniciativas. Cargalo en la tarjeta de arriba.", btn: "Definir objetivo", icon: "Compass", onClick: () => { const el = document.querySelector("textarea"); (el as HTMLElement | null)?.focus(); } },
            { done: contractDone, n: 3, title: "Hagan la Sesión Fundacional", desc: "Acuerden cómo va a funcionar el equipo y firmen el contrato.", btn: launching ? "Abriendo…" : "Iniciar Fundacional", icon: "Handshake", onClick: startFounding },
            { done: initDone, n: 4, title: "Creen la primera iniciativa", desc: "Lo que el equipo va a trabajar para mejorar.", btn: "Nueva iniciativa", icon: "Plus", onClick: newInitiative },
          ];
          const nextIdx = STEPS.findIndex((s) => !s.done);
          return (
            <Card pad={18} style={{ borderColor: "color-mix(in srgb, var(--st-explore) 40%, var(--line))", background: "color-mix(in srgb, var(--st-explore) 8%, transparent)" }}>
              <div className="eyebrow" style={{ color: "var(--st-explore)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}><Icon name="Rocket" size={14} /> Primeros pasos del equipo</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {STEPS.map((s, i) => {
                  const isNext = i === nextIdx;
                  return (
                    <div key={s.n} style={{ display: "flex", alignItems: "center", gap: 12, opacity: s.done || isNext ? 1 : 0.55 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 99, flexShrink: 0, display: "grid", placeItems: "center", background: s.done ? "var(--success)" : isNext ? "color-mix(in srgb, var(--st-explore) 22%, transparent)" : "var(--card-2)", color: s.done ? "#08120c" : isNext ? "var(--st-explore)" : "var(--ink-3)", border: `1px solid ${s.done ? "var(--success)" : isNext ? "var(--st-explore)" : "var(--line-2)"}`, fontWeight: 800, fontSize: "var(--t-xs)" }}>{s.done ? <Icon name="Check" size={14} /> : s.n}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", textDecoration: s.done ? "line-through" : "none", color: s.done ? "var(--ink-2)" : "var(--ink-0)" }}>{s.title}</div>
                        {isNext && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{s.desc}</p>}
                      </div>
                      {isNext && <Button size="sm" icon={s.icon} disabled={s.btn === "Abriendo…"} onClick={s.onClick}>{s.btn}</Button>}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })()}

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
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {shown.map((i) => <InitiativeCard key={i.id} team={team} init={i} isFacil={isFacil} onChanged={refresh} onEdit={() => setEditing(i)} />)}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card pad={20}>
          <SectionTitle icon="Activity" sub="Promedio de las dimensiones"
            right={<button onClick={onOpenPulse} style={{ color: "var(--green)", fontSize: "var(--t-sm)", fontWeight: 600 }}>Detalle</button>}>
            Pulso del equipo
          </SectionTitle>
          <PulseChart data={team.pulse} dims={PULSE_DIMS} height={200} />
        </Card>
        <Card pad={20}>
          <SectionTitle icon="HeartPulse">Salud rápida</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Row label="Seguridad ψ" value={team.psychSafety + "%"} color={lowSafety ? "var(--warning)" : "var(--success)"} pct={team.psychSafety} />
            <Row label="Iniciativas en curso" value={counts.active} />
            <Row label="Pruebas corriendo" value={(team.initiatives ?? []).filter((i) => i.stage === "proof").length} />
            <Row label="Sesiones realizadas" value={team.sessions.length} />
          </div>
        </Card>
        <RitmoCard teamId={team.id} everyDays={cadence} lastSessionAt={live.data?.lastSessionAt} isFacil={isFacil} onSaved={refresh} />
        {hasContract && <ContractCard team={team} />}
      </div>

      {modal && <InitiativeModal teamId={team.id} onClose={() => setModal(false)} onSaved={refresh} />}
      {editing && <InitiativeModal teamId={team.id} editing={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {gate && <FoundingGateModal launching={launching} onClose={() => setGate(false)} onStart={startFounding} />}
    </div>
  );
}

function InviteMemberModal({ team, onClose }: { team: Team; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const valid = /\S+@\S+\.\S+/.test(email);

  const invite = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const res = await inviteMember({ teamId: team.id, orgId: team.orgId, email });
    setBusy(false);
    if (res.error) setError(res.error); else if (res.token) setToken(res.token);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(460px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
          <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center" }}><Icon name="UserPlus" size={20} /></div>
          <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 700 }}>Invitar integrante</h3>
        </div>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 18 }}>A <b style={{ color: "var(--ink-1)" }}>{team.name}</b>. Se genera un link para que la persona se registre y participe de las sesiones.</p>
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
  const [tab, setTab] = useState("seguimiento");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [delBusy, setDelBusy] = useState(false);

  if (!team) return <div className="screen-pad">Equipo no encontrado.</div>;
  const lead = team.facilitatorId ? getFacilitators().find((f) => f.id === team.facilitatorId) : undefined;
  const doDeleteTeam = async () => { setDelBusy(true); const res = await deleteTeam(team.id); setDelBusy(false); if (res.error) { show(res.error, "TriangleAlert"); return; } show("Equipo eliminado", "Trash2"); router.push("/organizaciones"); };
  const lowSafety = team.psychSafety > 0 && team.psychSafety < 70;

  const TABS = [
    { key: "seguimiento", label: "Seguimiento", icon: "Target" },
    { key: "pulso", label: "Pulso", icon: "Activity" },
    { key: "sesiones", label: "Sesiones", icon: "History" },
  ];

  return (
    <div className="screen-pad">
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
            <StageBadge stage={team.stage} />
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
          <Button variant="secondary" icon="Library" onClick={() => router.push(`/equipos/${team.id}/biblioteca`)}>Biblioteca</Button>
          <Button variant="secondary" icon="FileBarChart" onClick={() => router.push(`/reporte/${team.id}`)}>Reporte</Button>
          {isFacil && <Button icon="UserPlus" onClick={() => setInviteOpen(true)}>Invitar integrante</Button>}
          {isFacil && <Button variant="ghost" icon="Trash2" onClick={() => setDelOpen(true)} style={{ color: "var(--risk)" }}>Eliminar</Button>}
        </div>
      </div>

      {lowSafety && (
        <div style={{ marginBottom: 18 }}>
          <AlertBanner type="warning" icon="ShieldAlert" title="Seguridad psicológica baja"
            action={<Button size="sm" variant="secondary" onClick={() => show("Abriendo el protocolo de seguridad psicológica…", "ShieldAlert")}>Ver protocolo</Button>}>
            El puntaje del equipo es <b className="num">{team.psychSafety}%</b>, por debajo del umbral de 70%. Cuidá el clima antes de profundizar en causas.
          </AlertBanner>
        </div>
      )}

      <div style={{ marginBottom: 20 }}><Tabs tabs={TABS} active={tab} onChange={setTab} /></div>

      {tab === "seguimiento" && <SeguimientoPanel team={team} isFacil={isFacil} onOpenPulse={() => setTab("pulso")} onInvite={() => setInviteOpen(true)} />}

      {tab === "pulso" && <PulseDetail team={team} />}

      {tab === "sesiones" && (
        team.sessions.length ? <SessionsLog team={team} /> : (
          <Card>
            <EmptyState icon="History" title="Sin sesiones aún">
              Las sesiones se hacen dentro de cada iniciativa. Abrí una iniciativa en <b style={{ color: "var(--ink-1)" }}>Seguimiento</b> y arrancá una sesión desde ahí; acá vas a ver el registro de todas.
            </EmptyState>
          </Card>
        )
      )}

      {inviteOpen && <InviteMemberModal team={team} onClose={() => setInviteOpen(false)} />}
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
