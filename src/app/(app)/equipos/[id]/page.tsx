"use client";

import { useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  AlertBanner, AvatarStack, Avatar, Bar, Button, Card, EmptyState, Pill,
  PulseChart, ProgressRing, SectionTitle, StageBadge, Trend,
} from "@/components/ui";
import {
  createInitiative, getFacilitators, getInitiatives, getTeam,
  setInitiativeStage, setInitiativeStatus, updateInitiative,
} from "@/lib/repository";
import { CYCLE_STAGES, PULSE_DIMS, STAGES, type Initiative, type StageKey, type Team } from "@/lib/data";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/Toast";

function Hl({ children, c = "var(--green)" }: { children: ReactNode; c?: string }) {
  return (
    <span style={{ color: c, fontWeight: 600, borderBottom: `1.5px solid color-mix(in srgb, ${c} 40%, transparent)`, paddingBottom: 1 }}>
      {children}
    </span>
  );
}

function ExperimentCard({ team, isFacil }: { team: Team; isFacil: boolean }) {
  const router = useRouter();
  const e = team.experiment;
  if (!e) return null;
  const pct = Math.round(((e.current - e.baseline) / (e.target - e.baseline)) * 100);
  const ringVal = e.dayOf / e.dayTotal;
  const daysLeft = e.dayTotal - e.dayOf;
  return (
    <Card glow pad={0} style={{ overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "linear-gradient(180deg, rgba(0,232,122,0.06), transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--st-proof)", display: "inline-flex" }}><Icon name="FlaskConical" size={19} /></span>
          <div>
            <div style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>Prueba en curso</div>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>sobre <b style={{ color: "var(--ink-1)" }}>{e.varName}</b></div>
          </div>
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, color: "var(--success)", background: "var(--success-bg)", border: "1px solid var(--line)" }}>
          <Icon name="Activity" size={12} /> En marcha
        </span>
      </div>

      <div className="exp-body" style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 20, padding: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>La apuesta</div>
            <p style={{ fontSize: "var(--t-md)", lineHeight: 1.55 }}>
              Creemos que si <Hl>{e.apuesta.if}</Hl>, lograremos que <Hl c="var(--st-proof)">{e.apuesta.then}</Hl>.
            </p>
          </div>
          <div style={{ background: "var(--card-2)", borderRadius: "var(--r-md)", padding: 14, border: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, color: "var(--ink-1)" }}>Señal de avance</span>
              <span className="muted" style={{ fontSize: "var(--t-xs)" }}>{e.signalName}</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
              <span className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 700, color: "var(--green)" }}>{e.current}{e.unit}</span>
              <Trend dir="up" value={"+" + (e.current - e.baseline)} />
              <span className="muted" style={{ fontSize: "var(--t-sm)", marginLeft: "auto" }}>meta <b className="num" style={{ color: "var(--ink-0)" }}>{e.target}{e.unit}</b></span>
            </div>
            <div style={{ position: "relative" }}>
              <Bar value={pct} glow />
              <div className="muted num" style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10 }}>
                <span>inicio {e.baseline}{e.unit}</span><span>{pct}% del camino</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar name={e.responsable.name} initials={e.responsable.initials} size={28} idx={2} />
              <div><div className="muted" style={{ fontSize: 10 }}>Responsable</div><div style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{e.responsable.name}</div></div>
            </div>
            {isFacil && <Button size="sm" variant="secondary" icon="ClipboardCheck" onClick={() => router.push(`/sesion/${team.id}`)} style={{ marginLeft: "auto" }}>Hacer check-in</Button>}
          </div>
        </div>

        <div className="exp-ring" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, paddingLeft: 8 }}>
          <ProgressRing value={ringVal} size={108} stroke={9} color={daysLeft <= 3 ? "var(--warning)" : "var(--green)"}>
            <span className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 700, lineHeight: 1 }}>{daysLeft}</span>
            <span className="muted" style={{ fontSize: 10 }}>días</span>
          </ProgressRing>
          <div className="muted num" style={{ fontSize: "var(--t-xs)" }}>día {e.dayOf} de {e.dayTotal}</div>
        </div>
      </div>
    </Card>
  );
}

function SessionsLog({ team }: { team: Team }) {
  return (
    <Card pad={20}>
      <SectionTitle icon="History">Sesiones recientes</SectionTitle>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: 6, top: 8, bottom: 8, width: 2, background: "var(--line)" }} />
        {team.sessions.map((s, i) => {
          const st = STAGES[s.stage];
          return (
            <div key={s.id} style={{ display: "flex", gap: 14, paddingBottom: i < team.sessions.length - 1 ? 16 : 0, position: "relative" }}>
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
                <Button size="sm" icon="Radio" disabled={busy} onClick={() => router.push(`/sesion/${team.id}?init=${init.id}`)}>Abrir sesión</Button>
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function SeguimientoPanel({ team, isFacil, onOpenPulse }: { team: Team; isFacil: boolean; onOpenPulse: () => void }) {
  const [, setNonce] = useState(0);
  const refresh = () => setNonce((n) => n + 1);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Initiative | null>(null);
  const [filter, setFilter] = useState<Initiative["status"]>("active");
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
          {isFacil && <Button icon="Plus" onClick={() => setModal(true)}>Nueva iniciativa</Button>}
        </div>

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
              action={isFacil ? <Button icon="Plus" onClick={() => setModal(true)}>Crear la primera</Button> : undefined}>
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

        {team.experiment && <ExperimentCard team={team} isFacil={isFacil} />}
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
            <Row label="Pruebas corriendo" value={team.experiment ? 1 : 0} />
            <Row label="Sesiones realizadas" value={team.sessions.length} />
          </div>
        </Card>
      </div>

      {modal && <InitiativeModal teamId={team.id} onClose={() => setModal(false)} onSaved={refresh} />}
      {editing && <InitiativeModal teamId={team.id} editing={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

export default function TeamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { show } = useToast();
  const isFacil = user?.role === "facilitator";
  const team = getTeam(params.id || "t1");
  const [tab, setTab] = useState("seguimiento");

  if (!team) return <div className="screen-pad">Equipo no encontrado.</div>;
  const lead = team.facilitatorId ? getFacilitators().find((f) => f.id === team.facilitatorId) : undefined;
  const lowSafety = team.psychSafety < 70;

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
          <Button variant="secondary" icon="Spline" onClick={() => router.push(`/equipos/${team.id}/mapa`)}>Ver mapa</Button>
          <Button variant="secondary" icon="FileBarChart" onClick={() => router.push("/reportes")}>Reporte</Button>
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

      {tab === "seguimiento" && <SeguimientoPanel team={team} isFacil={isFacil} onOpenPulse={() => setTab("pulso")} />}

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
    </div>
  );
}
