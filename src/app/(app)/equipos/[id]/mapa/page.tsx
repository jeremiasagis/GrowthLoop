"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, Pill, StageBadge, StateDot, Trend } from "@/components/ui";
import { getTeam } from "@/lib/repository";
import { useToast } from "@/components/Toast";
import { PROCESS, STAGE_ORDER, STAGES, type Variable } from "@/lib/data";

const ORDER = STAGE_ORDER;

interface LogEntry { name: string; from: string; to: string; reason: string; date: string }

function VarChip({ v, onClick, dragging, compact }: { v: Variable; onClick?: () => void; dragging?: boolean; compact?: boolean }) {
  const st = STAGES[v.stage];
  return (
    <div onClick={onClick}
      style={{
        background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid " + st.color,
        borderRadius: "var(--r-md)", padding: compact ? "10px 12px" : "12px 13px", cursor: "grab",
        boxShadow: dragging ? "var(--sh-lg)" : "none", opacity: dragging ? 0.5 : 1,
        transition: "border-color .15s, transform .1s", userSelect: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--line-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--line)")}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <StateDot state={v.state} />
          <span style={{ fontWeight: 600, fontSize: "var(--t-sm)", lineHeight: 1.3 }}>{v.name}</span>
        </div>
        <Trend dir={v.trend} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--t-xs)", color: "var(--ink-2)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Radio" size={12} /> {v.sessions}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Clock" size={12} /> {v.last}</span>
        {v.hasExp && <span style={{ marginLeft: "auto", color: "var(--st-proof)", display: "inline-flex", alignItems: "center", gap: 3 }}><Icon name="FlaskConical" size={12} /> prueba</span>}
      </div>
    </div>
  );
}

function VarDrawer({ v, onClose, onAdvance }: { v: Variable; onClose: () => void; onAdvance: () => void }) {
  const st = STAGES[v.stage];
  const idx = PROCESS.findIndex((p) => p.key === v.stage);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(7,11,22,0.6)", backdropFilter: "blur(4px)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(440px, 92vw)", background: "var(--bg-2)", borderLeft: "1px solid var(--line)", overflowY: "auto", animation: "fade-up .25s var(--ease)" }}>
        <div style={{ padding: 22, borderBottom: "1px solid var(--line)", borderTop: "3px solid " + st.color }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}><StageBadge stage={v.stage} /><Pill icon="GitBranch">{v.source}</Pill></div>
              <h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{v.name}</h2>
            </div>
            <button onClick={onClose} style={{ color: "var(--ink-2)" }}><Icon name="X" size={22} /></button>
          </div>
          <p className="muted" style={{ marginTop: 10, fontSize: "var(--t-sm)", lineHeight: 1.6 }}>{v.desc}</p>
        </div>
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>En el proceso</div>
            <div style={{ display: "flex", gap: 4 }}>
              {PROCESS.slice(1).map((p, i) => {
                const done = i <= idx - 1, cur = i === idx - 1;
                return <div key={p.id} title={p.label} style={{ flex: 1, height: 6, borderRadius: 99, background: done || cur ? st.color : "var(--card-2)", opacity: cur ? 1 : done ? 0.6 : 1 }} />;
              })}
            </div>
            <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 6 }}>Etapa actual: <b style={{ color: st.color }}>{st.label}</b></div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Historia ({v.sessions} sesiones)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {v.sessions ? Array.from({ length: Math.min(v.sessions, 4) }).map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "10px 12px", background: "var(--card)", borderRadius: "var(--r-sm)", border: "1px solid var(--line)", fontSize: "var(--t-sm)" }}>
                  <span className="num" style={{ color: "var(--ink-3)" }}>0{v.sessions - i}</span>
                  <span>{["Mapa de tensiones", "Causa raíz identificada", "Idea elegida", "Prueba definida"][i] || "Avance registrado"}</span>
                </div>
              )) : <div className="muted" style={{ fontSize: "var(--t-sm)" }}>Todavía sin sesiones para esta variable.</div>}
            </div>
          </div>
          <Button full icon="ArrowRight" onClick={onAdvance}>Avanzar a la siguiente etapa</Button>
        </div>
      </div>
    </div>
  );
}

function KanbanView({ vars, setVars, onOpen, log }: { vars: Variable[]; setVars: React.Dispatch<React.SetStateAction<Variable[]>>; onOpen: (v: Variable) => void; log: (e: Omit<LogEntry, "date">) => void }) {
  const [drag, setDrag] = useState<{ id: string; from: string } | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; from: string; to: string } | null>(null);
  const [reason, setReason] = useState("");

  const move = (id: string, to: string) => {
    const v = vars.find((x) => x.id === id);
    if (!v || v.stage === to) { setDrag(null); setOverCol(null); return; }
    setPending({ id, from: v.stage, to });
    setOverCol(null);
  };
  const confirm = () => {
    if (!pending) return;
    setVars((vs) => vs.map((v) => (v.id === pending.id ? { ...v, stage: pending.to as Variable["stage"], last: "hace instantes" } : v)));
    log({ name: vars.find((v) => v.id === pending.id)!.name, from: STAGES[pending.from as Variable["stage"]].label, to: STAGES[pending.to as Variable["stage"]].label, reason: reason || "Sin motivo registrado" });
    setPending(null); setReason(""); setDrag(null);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 14 }}>
        {ORDER.map((stage) => {
          const st = STAGES[stage];
          const col = vars.filter((v) => v.stage === stage);
          const isOver = overCol === stage;
          return (
            <div key={stage}
              onDragOver={(e) => { e.preventDefault(); setOverCol(stage); }}
              onDragLeave={() => setOverCol((o) => (o === stage ? null : o))}
              onDrop={(e) => { e.preventDefault(); drag && move(drag.id, stage); }}
              style={{ flex: "0 0 248px", width: 248, background: isOver ? `color-mix(in srgb, ${st.color} 10%, var(--bg-2))` : "var(--bg-2)", border: "1px solid " + (isOver ? st.color : "var(--line)"), borderRadius: "var(--r-lg)", padding: 12, minHeight: 220, transition: "all .15s" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "0 2px" }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: st.color, boxShadow: "0 0 7px " + st.color }} />
                <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{st.label}</span>
                <span className="num" style={{ marginLeft: "auto", color: "var(--ink-2)", fontSize: "var(--t-xs)", background: "var(--card-2)", borderRadius: 99, padding: "2px 8px" }}>{col.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, minHeight: 40 }}>
                {col.map((v) => (
                  <div key={v.id} draggable
                    onDragStart={() => setDrag({ id: v.id, from: stage })}
                    onDragEnd={() => { setDrag(null); setOverCol(null); }}>
                    <VarChip v={v} dragging={!!drag && drag.id === v.id} onClick={() => onOpen(v)} compact />
                  </div>
                ))}
                {!col.length && <div style={{ border: "1px dashed var(--line-2)", borderRadius: "var(--r-sm)", padding: "14px 10px", textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-xs)" }}>Soltá una variable acá</div>}
              </div>
            </div>
          );
        })}
      </div>

      {pending && (
        <div onClick={() => { setPending(null); setReason(""); }} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(440px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 24, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ color: "var(--green)" }}><Icon name="GitCommitHorizontal" size={20} /></span>
              <h3 style={{ fontSize: "var(--t-md)", fontWeight: 700 }}>Registrar el cambio</h3>
            </div>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 16 }}>
              Movés <b style={{ color: "var(--ink-0)" }}>{vars.find((v) => v.id === pending.id)?.name}</b> de <span style={{ color: STAGES[pending.from as Variable["stage"]].color }}>{STAGES[pending.from as Variable["stage"]].label}</span> a <span style={{ color: STAGES[pending.to as Variable["stage"]].color }}>{STAGES[pending.to as Variable["stage"]].label}</span>. ¿Por qué?
            </p>
            <textarea autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: el equipo decidió priorizar esta variable por su impacto en clientes…"
              style={{ width: "100%", minHeight: 84, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: 12, fontSize: "var(--t-sm)", resize: "vertical", outline: "none" }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <Button variant="ghost" onClick={() => { setPending(null); setReason(""); }}>Cancelar</Button>
              <Button icon="Check" onClick={confirm}>Guardar cambio</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SpiralView({ vars, onOpen }: { vars: Variable[]; onOpen: (v: Variable) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const size = 660, cx = size / 2, cy = size / 2;
  const ringStages = ORDER;
  const rOuter = 290, rInner = 58;
  const stageRadius = (i: number) => rOuter - (i / (ringStages.length - 1)) * (rOuter - rInner);
  const spiralPts: [number, number][] = [];
  const turns = ringStages.length - 1;
  for (let t = 0; t <= turns; t += 0.02) {
    const r = rOuter - (t / turns) * (rOuter - rInner);
    const a = -Math.PI / 2 + t * 2 * Math.PI;
    spiralPts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const spiralD = spiralPts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");

  const placed = useMemo(() => {
    return ringStages.flatMap((stage, si) => {
      const inStage = vars.filter((v) => v.stage === stage);
      const r = stageRadius(si);
      return inStage.map((v, k) => {
        const base = -Math.PI / 2 + si * 0.7;
        const a = base + (k - (inStage.length - 1) / 2) * 0.62;
        return { v, x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), color: STAGES[stage].color };
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vars]);

  return (
    <Card pad={0} style={{ overflow: "hidden" }}>
      <div className="spiral-wrap" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 0 }}>
        <div style={{ position: "relative", display: "grid", placeItems: "center", padding: 16, background: "radial-gradient(circle at center, rgba(0,232,122,0.05), transparent 60%)" }}>
          <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 560, display: "block" }}>
            {ringStages.map((stage, i) => (
              <circle key={stage} cx={cx} cy={cy} r={stageRadius(i)} fill="none" stroke={STAGES[stage].color} strokeOpacity="0.12" strokeWidth="1" />
            ))}
            <path d={spiralD} fill="none" stroke="url(#spiralGrad)" strokeWidth="2.5" strokeLinecap="round" opacity="0.55" />
            <defs>
              <linearGradient id="spiralGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--st-queue)" /><stop offset="0.5" stopColor="var(--st-proof)" /><stop offset="1" stopColor="var(--green)" />
              </linearGradient>
            </defs>
            <circle cx={cx} cy={cy} r={rInner - 12} fill="var(--bg-2)" stroke="var(--green)" strokeOpacity="0.4" />
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--green)">Mejora</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="var(--ink-2)">sostenida</text>
            {placed.map(({ v, x, y, color }) => {
              const on = hover === v.id;
              return (
                <g key={v.id} style={{ cursor: "pointer" }} onMouseEnter={() => setHover(v.id)} onMouseLeave={() => setHover(null)} onClick={() => onOpen(v)}>
                  <circle cx={x} cy={y} r={on ? 11 : 8} fill={color} stroke="var(--bg-1)" strokeWidth="2.5" style={{ filter: on ? `drop-shadow(0 0 8px ${color})` : "none", transition: "r .15s" }} />
                  {on && (
                    <g>
                      <rect x={x + 14} y={y - 16} width={Math.min(v.name.length * 7.2 + 16, 210)} height="30" rx="8" fill="var(--elevated)" stroke="var(--line-2)" />
                      <text x={x + 24} y={y + 4} fontSize="12.5" fontWeight="600" fill="var(--ink-0)">{v.name.length > 26 ? v.name.slice(0, 25) + "…" : v.name}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
        <div className="spiral-legend" style={{ borderLeft: "1px solid var(--line)", padding: 18, background: "var(--bg-2)" }}>
          <div className="eyebrow" style={{ marginBottom: 14 }}>El recorrido</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {ringStages.map((stage) => {
              const c = vars.filter((v) => v.stage === stage).length;
              const st = STAGES[stage];
              return (
                <div key={stage} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 8px", borderRadius: "var(--r-sm)", background: c ? "var(--card)" : "transparent", border: "1px solid " + (c ? "var(--line)" : "transparent") }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: st.color, flex: "none" }} />
                  <span style={{ fontSize: "var(--t-sm)", fontWeight: c ? 600 : 500, color: c ? "var(--ink-0)" : "var(--ink-2)" }}>{st.label}</span>
                  <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: c ? st.color : "var(--ink-3)", fontWeight: 700 }}>{c}</span>
                </div>
              );
            })}
          </div>
          <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 16, lineHeight: 1.6 }}>
            Las variables giran hacia el centro a medida que avanzan. El ciclo nunca termina: una variable mejorada deja lugar a la siguiente.
          </p>
        </div>
      </div>
    </Card>
  );
}

function TimelineView({ vars, onOpen }: { vars: Variable[]; onOpen: (v: Variable) => void }) {
  const steps = ORDER;
  const stageIdx = (s: string) => steps.indexOf(s as Variable["stage"]);
  const sorted = [...vars].sort((a, b) => stageIdx(b.stage) - stageIdx(a.stage));
  return (
    <Card pad={0} style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", borderBottom: "1px solid var(--line)", minWidth: 720 }}>
        <div style={{ padding: "12px 16px", fontSize: "var(--t-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--ink-2)" }}>Variable</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
          {steps.map((s) => (
            <div key={s} style={{ padding: "12px 4px", textAlign: "center", fontSize: 10, fontWeight: 700, color: STAGES[s].color, borderLeft: "1px solid var(--line)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{STAGES[s].label}</div>
          ))}
        </div>
      </div>
      <div style={{ minWidth: 720 }}>
        {sorted.map((v, ri) => {
          const idx = stageIdx(v.stage);
          return (
            <div key={v.id} onClick={() => onOpen(v)} style={{ display: "grid", gridTemplateColumns: "210px 1fr", borderBottom: ri < sorted.length - 1 ? "1px solid var(--line)" : "none", cursor: "pointer", transition: "background .15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--card-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <StateDot state={v.state} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                  <div className="muted" style={{ fontSize: 10 }}>{v.sessions} ses · {v.last}</div>
                </div>
              </div>
              <div style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${steps.length}, 1fr)`, alignItems: "center" }}>
                {steps.map((s) => <div key={s} style={{ borderLeft: "1px solid var(--line)", height: "100%" }} />)}
                <div style={{ position: "absolute", left: `calc(100%/${steps.length}/2)`, right: `calc(100%/${steps.length}/2)`, height: 5, top: "50%", transform: "translateY(-50%)", background: "var(--card-2)", borderRadius: 99 }} />
                <div style={{ position: "absolute", left: `calc(100%/${steps.length}/2)`, width: `calc((100% - 100%/${steps.length}) * ${idx / (steps.length - 1)})`, height: 5, top: "50%", transform: "translateY(-50%)", background: STAGES[v.stage].color, borderRadius: 99, boxShadow: "0 0 8px " + STAGES[v.stage].color, transition: "width .6s var(--ease)" }} />
                <div style={{ position: "absolute", left: `calc(100%/${steps.length} * ${idx} + 100%/${steps.length}/2)`, top: "50%", transform: "translate(-50%,-50%)" }}>
                  <div style={{ width: 16, height: 16, borderRadius: 99, background: STAGES[v.stage].color, border: "3px solid var(--bg-1)", boxShadow: "0 0 0 1px " + STAGES[v.stage].color, position: "relative" }}>
                    {v.hasExp && <span style={{ position: "absolute", inset: 0, borderRadius: 99, animation: "glow-pulse 2s infinite" }} />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function LogPanel({ entries, onClose }: { entries: LogEntry[]; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(7,11,22,0.5)" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(380px,92vw)", background: "var(--bg-2)", borderLeft: "1px solid var(--line)", padding: 20, overflowY: "auto", animation: "fade-up .2s var(--ease)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontWeight: 700, fontSize: "var(--t-md)", display: "flex", alignItems: "center", gap: 8 }}><Icon name="History" size={18} /> Registro de cambios</h3>
          <button onClick={onClose} style={{ color: "var(--ink-2)" }}><Icon name="X" size={20} /></button>
        </div>
        {entries.length ? entries.map((e, i) => (
          <div key={i} style={{ padding: 13, background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", marginBottom: 10 }}>
            <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, marginBottom: 5 }}>{e.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "var(--t-xs)", marginBottom: 6 }}>
              <span className="muted">{e.from}</span><Icon name="ArrowRight" size={12} /><span style={{ color: "var(--green)" }}>{e.to}</span>
            </div>
            <div className="muted" style={{ fontSize: "var(--t-xs)", fontStyle: "italic" }}>“{e.reason}”</div>
          </div>
        )) : <EmptyState icon="History" title="Sin cambios todavía">Cuando muevas una variable entre etapas, el motivo del cambio quedará registrado acá con fecha.</EmptyState>}
      </div>
    </div>
  );
}

export default function MapaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const team = getTeam(params.id || "t1");
  const [view, setView] = useState("kanban");
  const [vars, setVars] = useState<Variable[]>(() => (team ? team.vars.map((v) => ({ ...v })) : []));
  const [open, setOpen] = useState<Variable | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [showLog, setShowLog] = useState(false);
  const addLog = (e: Omit<LogEntry, "date">) => setLog((l) => [{ ...e, date: "hoy" }, ...l]);

  if (!team) return <div className="screen-pad">Equipo no encontrado.</div>;

  const VIEWS = [
    { key: "kanban", label: "Kanban", icon: "Columns3" },
    { key: "spiral", label: "Espiral", icon: "Spline" },
    { key: "timeline", label: "Línea de tiempo", icon: "GanttChartSquare" },
  ];

  return (
    <div className="screen-pad" style={{ maxWidth: 1400 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "var(--t-sm)", marginBottom: 14 }}>
        <button onClick={() => router.push(`/equipos/${team.id}`)} className="muted">{team.name}</button>
        <span className="faint"><Icon name="ChevronRight" size={13} /></span>
        <span style={{ fontWeight: 600 }}>Mapa de mejora</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Mapa de mejora</h1>
          <p className="muted" style={{ marginTop: 4 }}>{vars.length} variables · cada una avanza por el ciclo a su ritmo</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="dark" icon="History" onClick={() => setShowLog(true)}>Registro{log.length ? " (" + log.length + ")" : ""}</Button>
          <Button icon="Plus" onClick={() => show("Agregá una variable nueva al mapa (demo).", "Plus")}>Agregar variable</Button>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ display: "inline-flex", background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: 4, gap: 2 }}>
          {VIEWS.map((vw) => {
            const on = view === vw.key;
            return (
              <button key={vw.key} onClick={() => setView(vw.key)}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: "var(--r-sm)", fontSize: "var(--t-sm)", fontWeight: 600, color: on ? "#062012" : "var(--ink-2)", background: on ? "var(--green)" : "transparent", transition: "all .15s" }}>
                <Icon name={vw.icon} size={16} />{vw.label}
              </button>
            );
          })}
        </div>
        {view === "kanban" && <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="MousePointer2" size={13} /> Arrastrá las tarjetas entre etapas — te pedimos el motivo</span>}
      </div>

      {view === "kanban" && <KanbanView vars={vars} setVars={setVars} onOpen={setOpen} log={addLog} />}
      {view === "spiral" && <SpiralView vars={vars} onOpen={setOpen} />}
      {view === "timeline" && <TimelineView vars={vars} onOpen={setOpen} />}

      {open && <VarDrawer v={open} onClose={() => setOpen(null)} onAdvance={() => router.push(`/equipos/${team.id}`)} />}
      {showLog && <LogPanel entries={log} onClose={() => setShowLog(false)} />}
    </div>
  );
}
