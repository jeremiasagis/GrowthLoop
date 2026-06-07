"use client";

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/AppShell";
import { Avatar, AvatarStack, Bar, Button, Card, Pill, ProgressRing, StageBadge } from "@/components/ui";
import { createInitiative, getInitiatives, getTeam, recordSession } from "@/lib/repository";
import { useToast } from "@/components/Toast";
import { PULSE_DIMS, STAGES, type Initiative, type StageKey, type Team } from "@/lib/data";

// Orden del ciclo; sólo avanzamos hacia adelante, nunca para atrás.
const CYCLE: StageKey[] = ["explore", "focus", "proof", "follow", "learn"];
function advancedStage(current: StageKey | undefined, completed: StageKey): StageKey | undefined {
  const want = CYCLE[Math.min(CYCLE.length - 1, CYCLE.indexOf(completed) + 1)];
  if (!current) return want;
  return CYCLE.indexOf(want) > CYCLE.indexOf(current) ? want : current;
}

/* ============================================================
   Tipos de sesión — el catálogo del ciclo de mejora.
   Cada uno tiene su propio flujo (más abajo).
   ============================================================ */
interface SessionType {
  key: "explore" | "focus" | "proof" | "follow" | "learn";
  stage: StageKey;
  name: string;   // la pregunta guía
  short: string;  // el nombre de la etapa
  icon: string;
  color: string;
  async: boolean; // ¿puede hacerse asincrónica?
  desc: string;
  out: string;    // qué resultado deja
}

const SESSION_TYPES: SessionType[] = [
  { key: "explore", stage: "explore", name: "¿Dónde estamos?", short: "Exploración", icon: "Compass", color: "var(--st-explore)", async: true,
    desc: "Sacar a la luz las tensiones del equipo y priorizar cuál atender primero.", out: "Mapa de tensiones" },
  { key: "focus", stage: "focus", name: "¿Por qué pasa esto?", short: "Foco", icon: "Crosshair", color: "var(--st-focus)", async: false,
    desc: "Profundizar en una tensión hasta encontrar su causa raíz. Sin culpables.", out: "Causa raíz" },
  { key: "proof", stage: "proof", name: "Diseñar la apuesta", short: "Prueba", icon: "FlaskConical", color: "var(--st-proof)", async: false,
    desc: "Convertir la causa en una prueba concreta y medible: una apuesta.", out: "La apuesta" },
  { key: "follow", stage: "follow", name: "¿Cómo vamos?", short: "Seguimiento", icon: "Activity", color: "var(--st-follow)", async: true,
    desc: "Revisar el avance de la prueba en curso y destrabar lo que haga falta.", out: "Estado del avance" },
  { key: "learn", stage: "learn", name: "Cerrar el ciclo", short: "Aprendizaje", icon: "GraduationCap", color: "var(--st-learn)", async: false,
    desc: "Mirar qué aprendimos y decidir si consolidar, iterar o soltar.", out: "Aprendizaje" },
];

/* ── countdown timer hook ─────────────────────────────────── */
function useTimer(initial: number) {
  const [secs, setSecs] = useState(initial);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => setSecs((s) => { if (s <= 1) { if (ref.current) clearInterval(ref.current); setRunning(false); return 0; } return s - 1; }), 1000);
      return () => { if (ref.current) clearInterval(ref.current); };
    }
  }, [running]);
  return {
    secs, running,
    start: () => setRunning(true),
    pause: () => setRunning(false),
    reset: (n?: number) => { setRunning(false); setSecs(n != null ? n : initial); },
    addMin: () => setSecs((s) => s + 60),
  };
}
type Timer = ReturnType<typeof useTimer>;
const fmt = (s: number) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

function IconBtn({ icon, onClick, label, active }: { icon: string; onClick?: () => void; label?: string; active?: boolean }) {
  return (
    <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 9px", borderRadius: "var(--r-sm)", background: active ? "var(--green-soft)" : "var(--card)", border: "1px solid var(--line-2)", color: active ? "var(--green)" : "var(--ink-1)", fontSize: "var(--t-xs)", fontWeight: 600 }}>
      <Icon name={icon} size={15} />{label}
    </button>
  );
}

function TimerWidget({ timer, compact }: { timer: Timer; compact?: boolean }) {
  const danger = timer.secs <= 60 && timer.secs > 0 && timer.running;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: compact ? "6px 12px" : "8px 14px", borderRadius: "var(--r-md)", background: danger ? "var(--risk-bg)" : "var(--card)", border: "1px solid " + (danger ? "rgba(239,68,68,0.4)" : "var(--line-2)") }}>
        <Icon name={timer.running ? "Timer" : "TimerOff"} size={17} style={{ color: danger ? "var(--risk)" : "var(--ink-2)" }} />
        <span className="num" style={{ fontSize: "var(--t-lg)", fontWeight: 700, color: danger ? "var(--risk)" : "var(--ink-0)", animation: danger ? "timer-pulse 1s infinite" : "none", minWidth: 52, textAlign: "center" }}>{fmt(timer.secs)}</span>
      </div>
      {!compact && (
        <div style={{ display: "flex", gap: 4 }}>
          <IconBtn icon={timer.running ? "Pause" : "Play"} onClick={() => (timer.running ? timer.pause() : timer.start())} />
          <IconBtn icon="RotateCcw" onClick={() => timer.reset()} />
          <IconBtn icon="Plus" onClick={timer.addMin} label="+1m" />
        </div>
      )}
    </div>
  );
}

function StepHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 22 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 9, color: "var(--green)", marginBottom: 6 }}>
        <Icon name={icon} size={20} /><span className="eyebrow" style={{ color: "var(--green)" }}>Bloque en vivo</span>
      </div>
      <h2 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h2>
      <p className="muted" style={{ marginTop: 6, maxWidth: 520, marginInline: "auto", fontSize: "var(--t-sm)" }}>{sub}</p>
    </div>
  );
}

let _idc = 0;
const uid = (p = "c") => p + (++_idc) + "_" + _idc * 7;
type Note = { id: string; text: string; mine: boolean };

/* ── Brainstorm reutilizable (input + lista con respuestas simuladas) ── */
function Brainstorm({ color, placeholder, seed, items, setItems }: { color: string; placeholder: string; seed: string[]; items: Note[]; setItems: React.Dispatch<React.SetStateAction<Note[]>> }) {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    const used = items.filter((i) => !i.mine).length;
    if (used >= seed.length) return;
    const t = setTimeout(() => setItems((prev) => {
      const u = prev.filter((i) => !i.mine).length;
      if (u >= seed.length) return prev;
      return [...prev, { id: uid(), text: seed[u], mine: false }];
    }), 1700);
    return () => clearTimeout(t);
  }, [items, seed, setItems]);
  const add = () => { const t = draft.trim(); if (!t) return; setItems((p) => [...p, { id: uid(), text: t, mine: true }]); setDraft(""); };
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
        <Button icon="Plus" onClick={add}>Sumar</Button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {items.map((c, i) => (
          <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${color}`, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", lineHeight: 1.45, animation: `pop-in .4s var(--spring) ${i * 0.03}s both` }}>
            {c.text}{c.mine && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--ink-3)" }}>· tuya</span>}
          </div>
        ))}
        {!items.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-sm)", textAlign: "center", padding: 24 }}>Sumá la primera…</div>}
      </div>
    </div>
  );
}

/* ── Elegir una opción de varias ── */
function PickOne({ options, value, onChange }: { options: { key: string; label: string; desc: string; icon: string; color: string }[]; value: string; onChange: (k: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px,1fr))", gap: 14, maxWidth: 760, margin: "0 auto", width: "100%" }}>
      {options.map((o) => {
        const on = value === o.key;
        return (
          <button key={o.key} onClick={() => onChange(o.key)}
            style={{ textAlign: "left", padding: 18, borderRadius: "var(--r-lg)", background: on ? `color-mix(in srgb, ${o.color} 14%, var(--card))` : "var(--card)", border: `1px solid ${on ? o.color : "var(--line-2)"}`, boxShadow: on ? `0 0 0 1px ${o.color}` : "none", transition: "all .15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ color: o.color, display: "inline-flex" }}><Icon name={o.icon} size={20} /></span>
              <span style={{ fontWeight: 700 }}>{o.label}</span>
              {on && <span style={{ marginLeft: "auto", color: o.color }}><Icon name="CheckCircle2" size={18} /></span>}
            </div>
            <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.45 }}>{o.desc}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ── Cierre genérico para los flujos nuevos ── */
function CloseSummary({ team, type, title, lines, suggestion, onClose }: { team: Team; type: SessionType; title: string; lines: { label: string; value: ReactNode }[]; suggestion?: string; onClose: () => void }) {
  const { show } = useToast();
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: "var(--r-lg)", background: `color-mix(in srgb, ${type.color} 18%, transparent)`, display: "grid", placeItems: "center", margin: "0 auto 14px", color: type.color, animation: "glow-pulse 2.5s infinite" }}><Icon name="Check" size={32} /></div>
        <h2 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h2>
        <p className="muted" style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="Save" size={15} /> Guardado en {team.name}</p>
      </div>
      <Card pad={0} style={{ overflow: "hidden" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "14px 18px", borderBottom: i < lines.length - 1 ? "1px solid var(--line)" : "none" }}>
            <span className="muted" style={{ fontSize: "var(--t-sm)", width: 120, flex: "none" }}>{l.label}</span>
            <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, minWidth: 0 }}>{l.value}</span>
          </div>
        ))}
      </Card>
      {suggestion && (
        <Card pad={16} style={{ marginTop: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: "var(--st-proof)", display: "inline-flex", marginTop: 2 }}><Icon name="Sparkles" size={20} /></span>
            <div><div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 4 }}>Próximo paso sugerido</div><p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{suggestion}</p></div>
          </div>
        </Card>
      )}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
        <Button variant="secondary" icon="FileDown" onClick={() => show("Exportando PDF…", "FileDown")}>Exportar PDF</Button>
        <Button icon="Check" onClick={onClose}>Cerrar sesión</Button>
      </div>
    </div>
  );
}

/* ── Chrome compartido para los flujos (header + stepper + footer) ── */
function FlowChrome({ team, type, steps, step, setStep, onExit, timer, onPrev, onNext, nextLabel = "Siguiente", canNext = true, note, children }: {
  team: Team; type: SessionType; steps: { key: string; label: string; icon: string; secs: number }[]; step: number; setStep: (n: number) => void;
  onExit: () => void; timer?: Timer; onPrev?: () => void; onNext?: () => void; nextLabel?: string; canNext?: boolean; note?: string; children: ReactNode;
}) {
  const cur = steps[step];
  const isClose = cur.key === "close";
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: `radial-gradient(1200px 600px at 50% -200px, color-mix(in srgb, ${type.color} 12%, transparent), transparent), var(--bg-1)` }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 22px", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 30, background: "color-mix(in srgb, var(--bg-1) 88%, transparent)", backdropFilter: "blur(12px)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <button onClick={onExit} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600 }}><Icon name="X" size={18} /> Salir</button>
          <div style={{ width: 1, height: 26, background: "var(--line)" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: type.color, boxShadow: "0 0 8px " + type.color, animation: "glow-pulse 1.5s infinite" }} />
              <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{type.name}</span>
              <StageBadge stage={type.stage} size="sm" />
            </div>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{team.name} · en vivo</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="hide-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AvatarStack people={team.members} max={5} size={26} />
            <span className="muted" style={{ fontSize: "var(--t-xs)" }}>{team.members.length} en sala</span>
          </div>
          {timer && cur.secs > 0 && <TimerWidget timer={timer} />}
        </div>
      </header>

      <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "14px 22px", borderBottom: "1px solid var(--line)", overflowX: "auto", background: "var(--bg-2)" }}>
        {steps.map((s, i) => {
          const done = i < step, on = i === step;
          return (
            <span key={s.key} style={{ display: "inline-flex", alignItems: "center" }}>
              <button onClick={() => i <= step && setStep(i)} style={{ display: "flex", alignItems: "center", gap: 8, flex: "none", cursor: i <= step ? "pointer" : "default" }}>
                <span style={{ width: 30, height: 30, borderRadius: 99, display: "grid", placeItems: "center", flex: "none", background: on ? type.color : done ? `color-mix(in srgb, ${type.color} 16%, transparent)` : "var(--card)", border: "1px solid " + (on || done ? type.color : "var(--line-2)"), color: on ? "#08120c" : done ? type.color : "var(--ink-2)" }}>
                  {done ? <Icon name="Check" size={15} /> : <Icon name={s.icon} size={15} />}
                </span>
                <span className="hide-sm" style={{ fontSize: "var(--t-sm)", fontWeight: on ? 700 : 500, color: on ? "var(--ink-0)" : done ? "var(--ink-1)" : "var(--ink-3)" }}>{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className="hide-sm" style={{ width: 28, height: 2, background: done ? type.color : "var(--line)", margin: "0 10px", flex: "none" }} />}
              {i < steps.length - 1 && <div className="show-sm" style={{ width: 16 }} />}
            </span>
          );
        })}
      </div>

      <main style={{ flex: 1, padding: "32px 22px 120px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 1100 }} key={step}>{children}</div>
      </main>

      {!isClose && onNext && (
        <footer style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 22px", borderTop: "1px solid var(--line)", background: "color-mix(in srgb, var(--bg-1) 92%, transparent)", backdropFilter: "blur(12px)" }}>
          <Button variant="ghost" icon="ArrowLeft" onClick={onPrev} disabled={step === 0}>Atrás</Button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {note && <span className="muted hide-sm" style={{ fontSize: "var(--t-xs)" }}>{note}</span>}
            <Button iconRight="ArrowRight" onClick={onNext} disabled={!canNext}>{nextLabel}</Button>
          </div>
        </footer>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   EXPLORACIÓN — flujo completo (pulso → tarjetas → mapa)
   ════════════════════════════════════════════════════════════ */
const COLS = [
  { key: "works", label: "Lo que funciona", color: "var(--success)", icon: "ThumbsUp" },
  { key: "blocks", label: "Lo que nos traba", color: "var(--warning)", icon: "Construction" },
  { key: "unsaid", label: "Lo que nadie dice", color: "var(--violet)", icon: "EyeOff" },
] as const;
type ColKey = (typeof COLS)[number]["key"];
const POOL: Record<ColKey, string[]> = {
  works: ["Nos cubrimos entre compañeros cuando hay picos", "El equipo conoce muy bien el producto", "Las mañanas fluyen mejor desde el nuevo turno", "Cuando hay un problema grave, nos unimos rápido"],
  blocks: ["Las reuniones no terminan en decisiones", "Esperamos al coordinador para casi todo", "Los reportes se rehacen dos o tres veces", "La info se pierde en el cambio de turno"],
  unsaid: ["Hay temas que evitamos para no incomodar", "Algunos sienten que su voz no cuenta", "Nos cuesta ser sinceros sobre los errores", "Se habla del clima en los pasillos, no en la mesa"],
};
interface CardItem { id: string; col: ColKey; text: string; mine: boolean }
interface Cluster { id: string; name: string; cardIds: string[]; dots: number }
interface SState { pulseResponded: number; pulseRevealed: boolean; cards: CardItem[]; clusters: Cluster[] }

function seedExplore(team: Team): SState {
  const cards: CardItem[] = [];
  (["works", "blocks", "unsaid"] as ColKey[]).forEach((col) => POOL[col].forEach((text) => cards.push({ id: uid(), col, text, mine: false })));
  return { pulseResponded: team.members.length, pulseRevealed: true, cards, clusters: [] };
}

function PulseStep({ team, state, setState }: { team: Team; state: SState; setState: React.Dispatch<React.SetStateAction<SState>> }) {
  const dims = PULSE_DIMS;
  const responded = state.pulseResponded;
  const total = team.members.length;
  useEffect(() => {
    if (state.pulseResponded < total) {
      const t = setTimeout(() => setState((s) => ({ ...s, pulseResponded: Math.min(total, s.pulseResponded + 1) })), 900);
      return () => clearTimeout(t);
    }
  }, [state.pulseResponded, total, setState]);
  const revealed = state.pulseRevealed;
  const avg: Record<string, number> = { confianza: 60, comunic: 58, claridad: 55, foco: 62, seguridad: 54 };
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <StepHeader icon="Activity" title="Pulso del equipo" sub="5 señales, anónimas. 2 minutos para responder sin pensarlo demasiado." />
      <Card pad={24}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex" }}>{team.members.slice(0, responded).map((m, i) => <span key={i} style={{ marginLeft: i ? -8 : 0, animation: "pop-in .3s var(--spring)" }}><Avatar name={m.name} initials={m.initials} size={28} idx={i} /></span>)}</div>
            <span className="muted num" style={{ fontSize: "var(--t-sm)" }}>{responded}/{total} respondieron</span>
          </div>
          {responded >= total && !revealed && <Button size="sm" icon="Eye" onClick={() => setState((s) => ({ ...s, pulseRevealed: true }))}>Revelar promedio</Button>}
          {revealed && <Pill color="var(--success)" bg="var(--success-bg)" icon="Check">Anónimo · guardado</Pill>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {dims.map((d) => (
            <div key={d.key}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: "var(--t-sm)", fontWeight: 600, display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: d.color }} />{d.label}</span>
                {revealed && <span className="num" style={{ fontWeight: 700, color: d.color }}>{avg[d.key]}</span>}
              </div>
              {revealed ? <Bar value={avg[d.key]} color={d.color} glow /> : (
                <div style={{ height: 8, borderRadius: 99, background: "var(--card-2)", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, background: `linear-gradient(90deg, transparent, ${d.color}44, transparent)`, animation: "shimmer 1.5s infinite", backgroundSize: "200% 100%" }} />
                </div>
              )}
            </div>
          ))}
        </div>
        {!revealed && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 18, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="Lock" size={13} /> Los puntajes individuales nunca se muestran. Solo el promedio del equipo.</p>}
      </Card>
    </div>
  );
}

function CardsStep({ state, setState, revealed }: { state: SState; setState: React.Dispatch<React.SetStateAction<SState>>; revealed: boolean }) {
  const [drafts, setDrafts] = useState<Record<ColKey, string>>({ works: "", blocks: "", unsaid: "" });
  useEffect(() => {
    if (revealed) return;
    const counts: Record<ColKey, number> = { works: 0, blocks: 0, unsaid: 0 };
    state.cards.forEach((c) => (counts[c.col] += 1));
    const candidates = COLS.map((c) => c.key).filter((k) => counts[k] < POOL[k].length);
    if (!candidates.length) return;
    const next = candidates.sort((a, b) => counts[a] - counts[b])[0];
    const t = setTimeout(() => {
      setState((s) => {
        const used = s.cards.filter((c) => c.col === next).length;
        if (used >= POOL[next].length) return s;
        return { ...s, cards: [...s.cards, { id: uid(), col: next, text: POOL[next][used], mine: false }] };
      });
    }, 1600);
    return () => clearTimeout(t);
  }, [state.cards.length, revealed, state.cards, setState]);

  const add = (col: ColKey) => {
    const text = drafts[col].trim();
    if (!text) return;
    setState((s) => ({ ...s, cards: [...s.cards, { id: uid(), col, text, mine: true }] }));
    setDrafts((d) => ({ ...d, [col]: "" }));
  };

  return (
    <div style={{ width: "100%" }}>
      <StepHeader icon={revealed ? "Eye" : "PenLine"}
        title={revealed ? "Revelación simultánea" : "Escritura anónima"}
        sub={revealed ? "Todas las tarjetas a la vista al mismo tiempo. Nadie sabe quién escribió qué." : "Cada quien escribe en silencio. Las tarjetas quedan ocultas hasta que el tiempo termine."} />
      <div className="cards-cols" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {COLS.map((col) => {
          const cards = state.cards.filter((c) => c.col === col.key);
          return (
            <div key={col.key} style={{ background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: "var(--r-lg)", padding: 14, display: "flex", flexDirection: "column", minHeight: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <span style={{ color: col.color, display: "inline-flex" }}><Icon name={col.icon} size={17} /></span>
                <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{col.label}</span>
                <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", color: "var(--ink-2)", background: "var(--card)", borderRadius: 99, padding: "2px 8px" }}>{cards.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                {cards.map((c, i) => (
                  revealed ? (
                    <div key={c.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: "3px solid " + col.color, borderRadius: "var(--r-md)", padding: "11px 13px", fontSize: "var(--t-sm)", lineHeight: 1.45, animation: `pop-in .45s var(--spring) ${i * 0.06}s both` }}>
                      {c.text}{c.mine && <span style={{ marginLeft: 6, fontSize: 10, color: "var(--ink-3)" }}>· tuya</span>}
                    </div>
                  ) : (
                    <div key={c.id} style={{ background: "linear-gradient(135deg, var(--card), var(--bg-2))", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", padding: "13px", display: "flex", alignItems: "center", gap: 8, animation: "card-in .3s var(--ease)" }}>
                      <Icon name="Lock" size={14} style={{ color: col.color }} />
                      <span style={{ flex: 1, height: 5, borderRadius: 99, background: "repeating-linear-gradient(90deg, var(--line-2) 0 14px, transparent 14px 22px)" }} />
                    </div>
                  )
                ))}
                {!cards.length && <div style={{ color: "var(--ink-3)", fontSize: "var(--t-xs)", textAlign: "center", padding: 20 }}>Sin tarjetas aún…</div>}
              </div>
              {!revealed && (
                <div style={{ marginTop: 12, display: "flex", gap: 6 }}>
                  <input value={drafts[col.key]} onChange={(e) => setDrafts((d) => ({ ...d, [col.key]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && add(col.key)} placeholder="Sumar tarjeta…"
                    style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
                  <button onClick={() => add(col.key)} style={{ background: col.color, color: "#06121f", borderRadius: "var(--r-sm)", padding: "0 11px", display: "grid", placeItems: "center" }}><Icon name="Plus" size={16} /></button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClusterStep({ state, setState }: { state: SState; setState: React.Dispatch<React.SetStateAction<SState>> }) {
  const [sel, setSel] = useState<string[]>([]);
  const clustered = new Set(state.clusters.flatMap((c) => c.cardIds));
  const loose = state.cards.filter((c) => !clustered.has(c.id));
  const colOf = (id: string) => state.cards.find((c) => c.id === id)!;
  const colMeta = (key: ColKey) => COLS.find((c) => c.key === key)!;

  const group = () => {
    if (sel.length < 1) return;
    const n = state.clusters.length + 1;
    setState((s) => ({ ...s, clusters: [...s.clusters, { id: uid("cl"), name: "Tensión " + n, cardIds: [...sel], dots: 0 }] }));
    setSel([]);
  };
  const rename = (id: string, name: string) => setState((s) => ({ ...s, clusters: s.clusters.map((c) => (c.id === id ? { ...c, name } : c)) }));
  const dissolve = (id: string) => setState((s) => ({ ...s, clusters: s.clusters.filter((c) => c.id !== id) }));

  return (
    <div style={{ width: "100%" }}>
      <StepHeader icon="Group" title="Agrupar en tensiones" sub="Juntá las tarjetas que hablan de lo mismo. Seleccioná varias y armá un grupo." />
      <div className="cluster-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span className="eyebrow">Tarjetas sueltas ({loose.length})</span>
            {sel.length > 0 && <Button size="sm" icon="Group" onClick={group}>Agrupar {sel.length}</Button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px,1fr))", gap: 10 }}>
            {loose.map((c) => {
              const cm = colMeta(c.col); const on = sel.includes(c.id);
              return (
                <button key={c.id} onClick={() => setSel((s) => (on ? s.filter((x) => x !== c.id) : [...s, c.id]))}
                  style={{ textAlign: "left", background: on ? "var(--green-soft)" : "var(--card)", border: "1px solid " + (on ? "var(--green)" : "var(--line)"), borderLeft: "3px solid " + cm.color, borderRadius: "var(--r-md)", padding: "11px 12px", fontSize: "var(--t-sm)", lineHeight: 1.4, position: "relative", transition: "all .12s" }}>
                  {on && <span style={{ position: "absolute", top: 8, right: 8, color: "var(--green)" }}><Icon name="CheckCircle2" size={15} /></span>}
                  {c.text}
                </button>
              );
            })}
            {!loose.length && <div style={{ gridColumn: "1/-1", color: "var(--ink-3)", fontSize: "var(--t-sm)", padding: 20, textAlign: "center" }}>Todas las tarjetas están agrupadas.</div>}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span className="eyebrow">Tensiones ({state.clusters.length})</span>
          {state.clusters.map((cl) => (
            <Card key={cl.id} pad={14}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ color: "var(--green)" }}><Icon name="Layers" size={16} /></span>
                <input value={cl.name} onChange={(e) => rename(cl.id, e.target.value)} style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: "var(--ink-0)", fontWeight: 700, fontSize: "var(--t-sm)", outline: "none", borderBottom: "1px dashed var(--line-2)" }} />
                <button onClick={() => dissolve(cl.id)} style={{ color: "var(--ink-3)" }}><Icon name="Trash2" size={15} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {cl.cardIds.map((id) => { const c = colOf(id); const cm = colMeta(c.col); return (
                  <div key={id} style={{ fontSize: "var(--t-xs)", color: "var(--ink-1)", padding: "6px 8px", background: "var(--card-2)", borderRadius: "var(--r-sm)", borderLeft: "2px solid " + cm.color }}>{c.text}</div>
                ); })}
              </div>
            </Card>
          ))}
          {!state.clusters.length && <div style={{ border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)", padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-sm)" }}>Seleccioná tarjetas a la izquierda y agrupalas para formar tensiones.</div>}
        </div>
      </div>
    </div>
  );
}

function VoteStep({ team, state, setState }: { team: Team; state: SState; setState: React.Dispatch<React.SetStateAction<SState>> }) {
  const dotsPer = 2, voters = Math.max(1, team.members.length), totalDots = voters * dotsPer;
  const used = state.clusters.reduce((a, c) => a + c.dots, 0);
  const left = totalDots - used;
  const max = Math.max(1, ...state.clusters.map((c) => c.dots));
  const addDot = (id: string, delta: number) =>
    setState((s) => ({ ...s, clusters: s.clusters.map((c) => (c.id === id ? { ...c, dots: Math.max(0, delta > 0 ? Math.min(c.dots + 1, c.dots + left) : c.dots - 1) } : c)) }));
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
      <StepHeader icon="Vote" title="Votación con puntos" sub={`Cada integrante tiene ${dotsPer} puntos. ¿Qué tensión atendemos primero?`} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 18 }}>
        <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Puntos disponibles</span>
        <div style={{ display: "flex", gap: 4 }}>{Array.from({ length: totalDots }).map((_, i) => <span key={i} style={{ width: 11, height: 11, borderRadius: 99, background: i < left ? "var(--green)" : "var(--card-2)", boxShadow: i < left ? "0 0 6px var(--green)" : "none", transition: "all .2s" }} />)}</div>
        <span className="num" style={{ fontWeight: 700, color: "var(--green)" }}>{left}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[...state.clusters].sort((a, b) => b.dots - a.dots).map((cl, rank) => (
          <Card key={cl.id} pad={16} glow={rank === 0 && cl.dots > 0}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span className="num" style={{ fontSize: "var(--t-lg)", fontWeight: 700, color: rank === 0 && cl.dots > 0 ? "var(--green)" : "var(--ink-3)", width: 24 }}>{rank + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-base)", marginBottom: 6 }}>{cl.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, maxWidth: 320 }}><Bar value={(cl.dots / max) * 100} color={rank === 0 && cl.dots > 0 ? "var(--green)" : "var(--violet)"} height={7} glow={rank === 0} /></div>
                  <div style={{ display: "flex", gap: 3 }}>{Array.from({ length: cl.dots }).map((_, i) => <span key={i} style={{ width: 9, height: 9, borderRadius: 99, background: "var(--green)", animation: "pop-in .3s var(--spring)" }} />)}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => addDot(cl.id, -1)} disabled={cl.dots === 0} style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: "var(--card-2)", border: "1px solid var(--line-2)", color: "var(--ink-1)", opacity: cl.dots === 0 ? 0.4 : 1 }}><Icon name="Minus" size={15} /></button>
                <span className="num" style={{ width: 24, textAlign: "center", fontWeight: 700, fontSize: "var(--t-md)" }}>{cl.dots}</span>
                <button onClick={() => addDot(cl.id, 1)} disabled={left === 0} style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: left === 0 ? "var(--card-2)" : "var(--green)", border: "1px solid var(--line-2)", color: left === 0 ? "var(--ink-3)" : "#06121f" }}><Icon name="Plus" size={15} /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ExploreClose({ team, init, state, onClose }: { team: Team; init?: Initiative; state: SState; onClose: () => void }) {
  const { show } = useToast();
  const ranked = [...state.clusters].sort((a, b) => b.dots - a.dots);
  const top = ranked[0];
  const others = ranked.slice(1);
  const [savedOthers, setSavedOthers] = useState(false);
  const [savingOthers, setSavingOthers] = useState(false);
  const finish = async () => {
    await recordSession({
      teamId: team.id, initiativeId: init?.id, sessionStage: "explore",
      retro: "¿Dónde estamos?", out: `Mapa de tensiones · prioridad: ${top?.name ?? "—"}`,
      stageData: {
        priority: top?.name ?? null,
        tensions: ranked.map((c) => ({ name: c.name, signals: c.cardIds.length, dots: c.dots })),
        pausedCount: savedOthers ? others.length : 0,
      },
      newStage: advancedStage(init?.stage, "explore"),
    });
    onClose();
  };
  const pauseOthers = async () => {
    if (!others.length || savingOthers || savedOthers) return;
    setSavingOthers(true);
    let err: string | undefined;
    for (const cl of others) {
      const r = await createInitiative({ teamId: team.id, title: cl.name, status: "paused" });
      if (r.error) err = r.error;
    }
    setSavingOthers(false);
    if (err) show(err, "TriangleAlert");
    else { setSavedOthers(true); show(`${others.length} ${others.length === 1 ? "tensión guardada" : "tensiones guardadas"} como pausadas`, "Check"); }
  };
  return (
    <div style={{ maxWidth: 700, margin: "0 auto", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: "var(--r-lg)", background: "var(--success-bg)", display: "grid", placeItems: "center", margin: "0 auto 14px", animation: "glow-pulse 2.5s infinite", color: "var(--green)" }}><Icon name="Check" size={32} /></div>
        <h2 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Mapa de tensiones</h2>
        <p className="muted" style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="Save" size={15} /> Guardado automáticamente en {team.name}</p>
      </div>
      <Card pad={0} style={{ overflow: "hidden" }}>
        {ranked.map((cl, i) => (
          <div key={cl.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", borderBottom: i < ranked.length - 1 ? "1px solid var(--line)" : "none", background: i === 0 ? "linear-gradient(90deg, var(--green-soft), transparent)" : "transparent" }}>
            <span className="num" style={{ fontSize: "var(--t-lg)", fontWeight: 700, color: i === 0 ? "var(--green)" : "var(--ink-3)" }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700 }}>{cl.name}</div>
              <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{cl.cardIds.length} señales agrupadas</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="num" style={{ fontWeight: 700, color: i === 0 ? "var(--green)" : "var(--ink-1)" }}>{cl.dots}</span>
              <Icon name="Vote" size={15} style={{ color: "var(--ink-3)" }} />
            </div>
            {i === 0 && <Pill color="var(--green)" bg="var(--success-bg)">prioridad</Pill>}
          </div>
        ))}
        {!ranked.length && <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-sm)" }}>No se agruparon tensiones en esta sesión.</div>}
      </Card>
      {top && (
        <Card pad={18} style={{ marginTop: 16, borderColor: "var(--line-2)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: "var(--st-proof)", display: "inline-flex", marginTop: 2 }}><Icon name="Sparkles" size={20} /></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 4 }}>Sugerencia para la próxima sesión</div>
              <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>Llevá <b style={{ color: "var(--ink-0)" }}>“{top.name}”</b> a la etapa de <b style={{ color: "var(--st-focus)" }}>Foco</b> para entender por qué pasa antes de diseñar una prueba.</p>
            </div>
          </div>
        </Card>
      )}
      {others.length > 0 && (
        <Card pad={18} style={{ marginTop: 12, borderColor: "var(--line-2)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ color: "var(--warning)", display: "inline-flex" }}><Icon name="Pause" size={20} /></span>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", marginBottom: 4 }}>Las demás tensiones</div>
              <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>Trabajás <b style={{ color: "var(--ink-0)" }}>“{top.name}”</b> ahora. Las otras <b className="num">{others.length}</b> quedan como iniciativas <b style={{ color: "var(--warning)" }}>pausadas</b> del equipo, para retomar más adelante.</p>
            </div>
            <Button variant={savedOthers ? "secondary" : "primary"} icon={savedOthers ? "Check" : "Pause"} disabled={savingOthers || savedOthers} onClick={pauseOthers}>
              {savedOthers ? "Guardadas" : savingOthers ? "Guardando…" : `Pausar las demás (${others.length})`}
            </Button>
          </div>
        </Card>
      )}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
        <Button variant="secondary" icon="FileDown" onClick={() => show("Exportando PDF…", "FileDown")}>Exportar PDF</Button>
        <Button variant="secondary" icon="Share2" onClick={() => show("Compartido con el líder del equipo.", "Share2")}>Compartir con líder</Button>
        <Button icon="Check" onClick={finish}>Cerrar sesión</Button>
      </div>
    </div>
  );
}

function ExploreFlow({ team, type, origin, init, onExit }: { team: Team; type: SessionType; origin: "live" | "async"; init?: Initiative; onExit: () => void }) {
  const seeded = origin === "async";
  const STEPS = [
    { key: "pulse", label: "Pulso", icon: "Activity", secs: 120 },
    { key: "cards", label: "Tarjetas", icon: "PenLine", secs: 300 },
    { key: "reveal", label: "Revelar", icon: "Eye", secs: 0 },
    { key: "cluster", label: "Agrupar", icon: "Group", secs: 0 },
    { key: "vote", label: "Votar", icon: "Vote", secs: 0 },
    { key: "close", label: "Mapa", icon: "Map", secs: 0 },
  ];
  const [step, setStep] = useState(seeded ? 2 : 0);
  const [state, setState] = useState<SState>(() => (seeded ? seedExplore(team) : { pulseResponded: 0, pulseRevealed: false, cards: [], clusters: [] }));
  const timer = useTimer(120);
  const cur = STEPS[step];
  const isAsync = origin === "async";
  useEffect(() => {
    if (cur.key === "pulse") timer.reset(120);
    if (cur.key === "cards") timer.reset(300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));
  const canNext = cur.key === "cluster" ? state.clusters.length >= 1 : true;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "radial-gradient(1200px 600px at 50% -200px, rgba(124,58,237,0.10), transparent), var(--bg-1)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 22px", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 30, background: "color-mix(in srgb, var(--bg-1) 88%, transparent)", backdropFilter: "blur(12px)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <button onClick={onExit} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600 }}><Icon name="X" size={18} /> Salir</button>
          <div style={{ width: 1, height: 26, background: "var(--line)" }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: isAsync ? "var(--violet)" : "var(--risk)", boxShadow: "0 0 8px " + (isAsync ? "var(--violet)" : "var(--risk)"), animation: isAsync ? "none" : "glow-pulse 1.5s infinite" }} />
              <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{type.name}</span>
              <StageBadge stage="explore" size="sm" />
            </div>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{team.name} · {isAsync ? "revisión asíncrona" : "en vivo"}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="hide-sm" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <AvatarStack people={team.members} max={5} size={26} />
            <span className="muted" style={{ fontSize: "var(--t-xs)" }}>{team.members.length} {isAsync ? "respondieron" : "en sala"}</span>
          </div>
          {cur.secs > 0 && <TimerWidget timer={timer} />}
        </div>
      </header>

      <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "14px 22px", borderBottom: "1px solid var(--line)", overflowX: "auto", background: "var(--bg-2)" }}>
        {STEPS.map((s, i) => {
          const done = i < step, on = i === step;
          return (
            <span key={s.key} style={{ display: "inline-flex", alignItems: "center" }}>
              <button onClick={() => i <= step && setStep(i)} style={{ display: "flex", alignItems: "center", gap: 8, flex: "none", cursor: i <= step ? "pointer" : "default" }}>
                <span style={{ width: 30, height: 30, borderRadius: 99, display: "grid", placeItems: "center", flex: "none", background: on ? "var(--green)" : done ? "var(--green-soft)" : "var(--card)", border: "1px solid " + (on || done ? "var(--green)" : "var(--line-2)"), color: on ? "#06121f" : done ? "var(--green)" : "var(--ink-2)" }}>
                  {done ? <Icon name="Check" size={15} /> : <Icon name={s.icon} size={15} />}
                </span>
                <span className="hide-sm" style={{ fontSize: "var(--t-sm)", fontWeight: on ? 700 : 500, color: on ? "var(--ink-0)" : done ? "var(--ink-1)" : "var(--ink-3)" }}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <div className="hide-sm" style={{ width: 28, height: 2, background: done ? "var(--green)" : "var(--line)", margin: "0 10px", flex: "none" }} />}
              {i < STEPS.length - 1 && <div className="show-sm" style={{ width: 16 }} />}
            </span>
          );
        })}
      </div>

      <main style={{ flex: 1, padding: "32px 22px 120px", display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 1100 }} key={step}>
          {cur.key === "pulse" && <PulseStep team={team} state={state} setState={setState} />}
          {cur.key === "cards" && <CardsStep state={state} setState={setState} revealed={false} />}
          {cur.key === "reveal" && <CardsStep state={state} setState={setState} revealed={true} />}
          {cur.key === "cluster" && <ClusterStep state={state} setState={setState} />}
          {cur.key === "vote" && <VoteStep team={team} state={state} setState={setState} />}
          {cur.key === "close" && <ExploreClose team={team} init={init} state={state} onClose={onExit} />}
        </div>
      </main>

      {cur.key !== "close" && (
        <footer style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 22px", borderTop: "1px solid var(--line)", background: "color-mix(in srgb, var(--bg-1) 92%, transparent)", backdropFilter: "blur(12px)" }}>
          <Button variant="ghost" icon="ArrowLeft" onClick={prev} disabled={step === 0}>Atrás</Button>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {cur.key === "cluster" && !canNext && <span className="muted hide-sm" style={{ fontSize: "var(--t-xs)" }}>Armá al menos una tensión para continuar</span>}
            {cur.key === "cards" && <span className="muted hide-sm" style={{ fontSize: "var(--t-xs)" }}>{state.cards.length} tarjetas · ocultas</span>}
            <Button iconRight="ArrowRight" onClick={next} disabled={!canNext}>
              {cur.key === "cards" ? "Revelar tarjetas" : cur.key === "vote" ? "Cerrar votación" : "Siguiente"}
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FOCO — ¿Por qué pasa esto? (causas → 5 porqués → causa raíz)
   ════════════════════════════════════════════════════════════ */
const FOCUS_CAUSES = ["La agenda no se prepara con tiempo", "Nadie toma nota de los acuerdos", "Arrancamos tarde y se corta el cierre", "Se mezclan temas operativos con decisiones", "No hay un responsable claro por punto"];

function FocusFlow({ team, type, init, onExit }: { team: Team; type: SessionType; init?: Initiative; onExit: () => void }) {
  const subject = init?.title || "la tensión priorizada";
  const STEPS = [
    { key: "subject", label: "Tensión", icon: "Crosshair", secs: 0 },
    { key: "causes", label: "Causas", icon: "GitBranch", secs: 240 },
    { key: "whys", label: "5 porqués", icon: "CornerDownRight", secs: 0 },
    { key: "root", label: "Causa raíz", icon: "Target", secs: 0 },
    { key: "close", label: "Cierre", icon: "Check", secs: 0 },
  ];
  const [step, setStep] = useState(0);
  const timer = useTimer(240);
  useEffect(() => { if (STEPS[step].secs > 0) timer.reset(STEPS[step].secs); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [step]);
  const [causes, setCauses] = useState<Note[]>([]);
  const [whys, setWhys] = useState(["", "", ""]);
  const [root, setRoot] = useState("");
  const cur = STEPS[step];
  const canNext = cur.key === "causes" ? causes.length >= 1 : cur.key === "root" ? root.trim().length > 1 : true;
  const finish = async () => {
    await recordSession({
      teamId: team.id, initiativeId: init?.id, sessionStage: "focus",
      retro: "¿Por qué pasa esto?", out: `Causa raíz: ${root || "—"}`,
      stageData: { rootCause: root, causes: causes.map((c) => c.text), whys: whys.filter(Boolean) },
      newStage: advancedStage(init?.stage, "focus"),
    });
    onExit();
  };

  let content: ReactNode = null;
  if (cur.key === "subject") {
    content = (
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
        <StepHeader icon="Crosshair" title="¿Por qué pasa esto?" sub="Antes de proponer soluciones, entendamos la raíz. Hablamos de causas, no de personas." />
        <Card pad={24}>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Tensión a profundizar</div>
          <div style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>{subject}</div>
          <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>En esta sesión vamos a juntar las posibles causas, encadenar porqués hasta el fondo y quedarnos con la causa raíz que mejor la explica.</p>
        </Card>
      </div>
    );
  } else if (cur.key === "causes") {
    content = (
      <div style={{ width: "100%" }}>
        <StepHeader icon="GitBranch" title="¿Por qué creés que pasa?" sub="Tirá todas las causas posibles. Después vamos a profundizar en la más fuerte." />
        <Brainstorm color={type.color} placeholder="Una posible causa…" seed={FOCUS_CAUSES} items={causes} setItems={setCauses} />
      </div>
    );
  } else if (cur.key === "whys") {
    content = (
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
        <StepHeader icon="CornerDownRight" title="Los 5 porqués" sub="Encadená porqués para ir del síntoma a la causa de fondo." />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {whys.map((w, i) => (
            <div key={i}>
              <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>¿Por qué? · nivel {i + 1}</label>
              <input value={w} onChange={(e) => setWhys((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))} placeholder={i === 0 ? "Porque…" : "¿Y por qué pasa eso?"}
                style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
            </div>
          ))}
        </div>
      </div>
    );
  } else if (cur.key === "root") {
    content = (
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
        <StepHeader icon="Target" title="La causa raíz" sub="Elegí una de las causas que juntaron o redactala en una frase." />
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {causes.map((c) => {
            const on = root === c.text;
            return (
              <button key={c.id} onClick={() => setRoot(c.text)} style={{ textAlign: "left", padding: "11px 13px", borderRadius: "var(--r-md)", background: on ? `color-mix(in srgb, ${type.color} 14%, var(--card))` : "var(--card)", border: `1px solid ${on ? type.color : "var(--line)"}`, fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: on ? type.color : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={16} /></span>{c.text}
              </button>
            );
          })}
          {!causes.length && <div className="muted" style={{ fontSize: "var(--t-sm)" }}>No juntaron causas; escribí la raíz a mano abajo.</div>}
        </div>
        <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Causa raíz (en una frase)</label>
        <input value={root} onChange={(e) => setRoot(e.target.value)} placeholder="La causa de fondo es…"
          style={{ width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
      </div>
    );
  } else {
    content = (
      <CloseSummary team={team} type={type} title="Causa raíz identificada"
        lines={[{ label: "Tensión", value: subject }, { label: "Causa raíz", value: root || "—" }, { label: "Causas exploradas", value: causes.length }]}
        suggestion={`Con la causa clara, el próximo paso es diseñar una prueba sobre “${root || subject}” en la etapa de Prueba.`}
        onClose={finish} />
    );
  }

  return (
    <FlowChrome team={team} type={type} steps={STEPS} step={step} setStep={setStep} onExit={onExit} timer={timer}
      onPrev={() => setStep(Math.max(0, step - 1))} onNext={cur.key === "close" ? undefined : () => setStep(Math.min(STEPS.length - 1, step + 1))}
      nextLabel={cur.key === "root" ? "Cerrar foco" : "Siguiente"} canNext={canNext}>
      {content}
    </FlowChrome>
  );
}

/* ════════════════════════════════════════════════════════════
   PRUEBA — Diseñar la apuesta (ideas → elegir → apuesta → plan)
   ════════════════════════════════════════════════════════════ */
const PROOF_IDEAS = ["Acta de 3 líneas al cerrar cada reunión", "Un dueño por cada decisión", "Timebox de 10' por tema", "Tablero visible con los acuerdos", "Revisar pendientes al inicio"];

function ProofFlow({ team, type, init, onExit }: { team: Team; type: SessionType; init?: Initiative; onExit: () => void }) {
  const STEPS = [
    { key: "ideas", label: "Ideas", icon: "Lightbulb", secs: 240 },
    { key: "choose", label: "Elegir", icon: "ListChecks", secs: 0 },
    { key: "bet", label: "La apuesta", icon: "Dices", secs: 0 },
    { key: "plan", label: "Plan", icon: "ClipboardCheck", secs: 0 },
    { key: "close", label: "Cierre", icon: "Check", secs: 0 },
  ];
  const [step, setStep] = useState(0);
  const timer = useTimer(240);
  useEffect(() => { if (STEPS[step].secs > 0) timer.reset(STEPS[step].secs); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [step]);
  const [ideas, setIdeas] = useState<Note[]>([]);
  const [chosen, setChosen] = useState<string>("");
  const [betIf, setBetIf] = useState("");
  const [betThen, setBetThen] = useState("");
  const [signal, setSignal] = useState("");
  const [resp, setResp] = useState("");
  const [deadline, setDeadline] = useState("15 días");
  const cur = STEPS[step];
  const chosenText = ideas.find((i) => i.id === chosen)?.text || "";

  const canNext = cur.key === "ideas" ? ideas.length >= 1
    : cur.key === "choose" ? !!chosen
    : cur.key === "bet" ? betIf.trim().length > 2 && betThen.trim().length > 2
    : cur.key === "plan" ? !!resp && !!deadline
    : true;

  // prellenar la apuesta con la idea elegida
  useEffect(() => { if (cur.key === "bet" && !betIf && chosenText) setBetIf(chosenText); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [cur.key]);

  const finish = async () => {
    await recordSession({
      teamId: team.id, initiativeId: init?.id, sessionStage: "proof",
      retro: "Diseñar la apuesta", out: `Apuesta: ${betThen || "—"}`,
      stageData: { betIf, betThen, signal, responsible: resp, deadline },
      newStage: advancedStage(init?.stage, "proof"),
    });
    onExit();
  };

  const field: React.CSSProperties = { width: "100%", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" };

  let content: ReactNode = null;
  if (cur.key === "ideas") {
    content = (
      <div style={{ width: "100%" }}>
        <StepHeader icon="Lightbulb" title="¿Qué podríamos probar?" sub={init?.title ? `Ideas para mover “${init.title}”. Sin juzgar todavía: cantidad primero.` : "Tirá ideas de soluciones. Sin juzgar todavía: cantidad primero."} />
        <Brainstorm color={type.color} placeholder="Una idea para probar…" seed={PROOF_IDEAS} items={ideas} setItems={setIdeas} />
      </div>
    );
  } else if (cur.key === "choose") {
    content = (
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
        <StepHeader icon="ListChecks" title="¿Cuál apostamos?" sub="Elegí la idea más simple de probar y con más impacto posible." />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ideas.map((c) => {
            const on = chosen === c.id;
            return (
              <button key={c.id} onClick={() => setChosen(c.id)} style={{ textAlign: "left", padding: "13px 14px", borderRadius: "var(--r-md)", background: on ? `color-mix(in srgb, ${type.color} 14%, var(--card))` : "var(--card)", border: `1px solid ${on ? type.color : "var(--line)"}`, fontSize: "var(--t-sm)", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: on ? type.color : "var(--ink-3)" }}><Icon name={on ? "CircleCheck" : "Circle"} size={17} /></span>{c.text}
              </button>
            );
          })}
        </div>
      </div>
    );
  } else if (cur.key === "bet") {
    content = (
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
        <StepHeader icon="Dices" title="La apuesta" sub="Escribí la hipótesis como una apuesta: si hacemos algo, esperamos un resultado." />
        <Card pad={20} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Creemos que si… <span className="faint">(la acción)</span></label>
            <textarea value={betIf} onChange={(e) => setBetIf(e.target.value)} rows={2} placeholder="cerramos cada reunión con decisiones por escrito" style={{ ...field, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>…lograremos que <span className="faint">(el resultado esperado)</span></label>
            <textarea value={betThen} onChange={(e) => setBetThen(e.target.value)} rows={2} placeholder="el equipo avance sin volver a discutir lo mismo" style={{ ...field, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>¿Qué señal vamos a mirar?</label>
            <input value={signal} onChange={(e) => setSignal(e.target.value)} placeholder="% de reuniones que terminan con decisiones registradas" style={field} />
          </div>
        </Card>
      </div>
    );
  } else if (cur.key === "plan") {
    content = (
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
        <StepHeader icon="ClipboardCheck" title="El plan" sub="¿Quién la lleva adelante y en cuánto tiempo la revisamos?" />
        <Card pad={20} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 9 }}>Responsable</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {team.members.map((m, i) => {
                const on = resp === m.name;
                return (
                  <button key={i} onClick={() => setResp(m.name)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px 6px 6px", borderRadius: "var(--r-full)", background: on ? `color-mix(in srgb, ${type.color} 16%, var(--card))` : "var(--card)", border: `1px solid ${on ? type.color : "var(--line-2)"}`, fontSize: "var(--t-sm)", fontWeight: 600 }}>
                    <Avatar name={m.name} initials={m.initials} size={24} idx={i} />{m.name}
                  </button>
                );
              })}
              {!team.members.length && <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Este equipo todavía no tiene integrantes.</span>}
            </div>
          </div>
          <div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 9 }}>Plazo para revisar</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["1 semana", "15 días", "30 días"].map((d) => {
                const on = deadline === d;
                return <button key={d} onClick={() => setDeadline(d)} style={{ padding: "9px 14px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? type.color : "var(--card-2)", color: on ? "#08120c" : "var(--ink-1)", border: "1px solid " + (on ? type.color : "var(--line-2)") }}>{d}</button>;
              })}
            </div>
          </div>
        </Card>
      </div>
    );
  } else {
    content = (
      <CloseSummary team={team} type={type} title="Apuesta definida"
        lines={[
          { label: "La apuesta", value: <>Si <b>{betIf || "…"}</b>, entonces <b>{betThen || "…"}</b>.</> },
          { label: "Señal", value: signal || "—" },
          { label: "Responsable", value: resp || "—" },
          { label: "Revisión", value: `en ${deadline}` },
        ]}
        suggestion={`La prueba queda en marcha. Acompañala con una sesión de Seguimiento en ${deadline} para ver cómo va.`}
        onClose={finish} />
    );
  }

  return (
    <FlowChrome team={team} type={type} steps={STEPS} step={step} setStep={setStep} onExit={onExit} timer={timer}
      onPrev={() => setStep(Math.max(0, step - 1))} onNext={cur.key === "close" ? undefined : () => setStep(Math.min(STEPS.length - 1, step + 1))}
      nextLabel={cur.key === "plan" ? "Lanzar la prueba" : "Siguiente"} canNext={canNext}>
      {content}
    </FlowChrome>
  );
}

/* ════════════════════════════════════════════════════════════
   SEGUIMIENTO — ¿Cómo vamos? (pulso → avance → trabas)
   ════════════════════════════════════════════════════════════ */
const FOLLOW_BLOCKERS = ["Cuesta sostenerlo cuando hay apuro", "Falta que lo hagan todos, no solo algunos", "El tablero no siempre se actualiza"];

function FollowFlow({ team, type, origin, init, onExit }: { team: Team; type: SessionType; origin: "live" | "async"; init?: Initiative; onExit: () => void }) {
  const STEPS = [
    { key: "pulse", label: "Pulso", icon: "Activity", secs: 90 },
    { key: "progress", label: "Avance", icon: "TrendingUp", secs: 0 },
    { key: "blockers", label: "Trabas", icon: "Construction", secs: 180 },
    { key: "close", label: "Cierre", icon: "Check", secs: 0 },
  ];
  const exp = team.experiment;
  const base = exp?.baseline ?? 40;
  const target = exp?.target ?? 80;
  const unit = exp?.unit ?? "%";
  const signalName = exp?.signalName ?? "Señal de avance";
  const [step, setStep] = useState(origin === "async" ? 1 : 0);
  const timer = useTimer(90);
  useEffect(() => { if (STEPS[step].secs > 0) timer.reset(STEPS[step].secs); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [step]);
  const [ps, setPs] = useState<SState>({ pulseResponded: 0, pulseRevealed: false, cards: [], clusters: [] });
  const [current, setCurrent] = useState(exp?.current ?? base);
  const [blockers, setBlockers] = useState<Note[]>([]);
  const cur = STEPS[step];
  const lo = Math.min(base, target), hi = Math.max(base, target);
  const pct = Math.max(0, Math.min(100, ((current - base) / (target - base)) * 100));
  const onTrack = pct >= 50;
  const finish = async () => {
    await recordSession({
      teamId: team.id, initiativeId: init?.id, sessionStage: "follow",
      retro: "¿Cómo vamos?", out: `Avance: ${current}${unit} (${onTrack ? "en camino" : "atención"})`,
      stageData: { current, target, unit, signalName, onTrack, blockers: blockers.map((b) => b.text) },
      newStage: advancedStage(init?.stage, "proof"),
    });
    onExit();
  };

  let content: ReactNode = null;
  if (cur.key === "pulse") {
    content = <PulseStep team={team} state={ps} setState={setPs} />;
  } else if (cur.key === "progress") {
    content = (
      <div style={{ maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <StepHeader icon="TrendingUp" title="¿Cómo viene la señal?" sub="Movemos el marcador a dónde está hoy la prueba en curso." />
        <Card pad={24}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{signalName}</span>
            <Pill color={onTrack ? "var(--success)" : "var(--warning)"} bg={onTrack ? "var(--success-bg)" : "var(--warning-bg)"} icon={onTrack ? "TrendingUp" : "TriangleAlert"}>{onTrack ? "En camino" : "Necesita atención"}</Pill>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
            <span className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, color: type.color }}>{current}{unit}</span>
            <span className="muted" style={{ fontSize: "var(--t-sm)", marginLeft: "auto" }}>meta <b className="num" style={{ color: "var(--ink-0)" }}>{target}{unit}</b></span>
          </div>
          <Bar value={pct} glow color={onTrack ? "var(--green)" : "var(--warning)"} />
          <div className="muted num" style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 10 }}>
            <span>inicio {base}{unit}</span><span>{Math.round(pct)}% del camino</span>
          </div>
          <input type="range" min={lo} max={hi} value={current} onChange={(e) => setCurrent(Number(e.target.value))} style={{ width: "100%", marginTop: 20, accentColor: type.color }} />
          <p className="muted" style={{ fontSize: "var(--t-xs)", textAlign: "center", marginTop: 6 }}>Arrastrá para registrar el valor de hoy</p>
        </Card>
      </div>
    );
  } else if (cur.key === "blockers") {
    content = (
      <div style={{ width: "100%" }}>
        <StepHeader icon="Construction" title="¿Qué nos está trabando?" sub="Lo que dificulta sostener la prueba. Si no hay trabas, seguí de largo." />
        <Brainstorm color={type.color} placeholder="Algo que nos traba…" seed={FOLLOW_BLOCKERS} items={blockers} setItems={setBlockers} />
      </div>
    );
  } else {
    content = (
      <CloseSummary team={team} type={type} title="Avance registrado"
        lines={[
          { label: "Señal", value: signalName },
          { label: "Avance", value: `${current}${unit} de ${target}${unit} (${Math.round(pct)}%)` },
          { label: "Estado", value: onTrack ? "En camino" : "Necesita atención" },
          { label: "Trabas", value: blockers.length },
        ]}
        suggestion={onTrack ? "Si la prueba se sostiene, cerrá el ciclo con una sesión de Aprendizaje." : "Hay trabas: puede que convenga ajustar la apuesta en una nueva sesión de Prueba."}
        onClose={finish} />
    );
  }

  return (
    <FlowChrome team={team} type={type} steps={STEPS} step={step} setStep={setStep} onExit={onExit} timer={timer}
      onPrev={() => setStep(Math.max(0, step - 1))} onNext={cur.key === "close" ? undefined : () => setStep(Math.min(STEPS.length - 1, step + 1))}
      nextLabel={cur.key === "blockers" ? "Cerrar seguimiento" : "Siguiente"} canNext={true}>
      {content}
    </FlowChrome>
  );
}

/* ════════════════════════════════════════════════════════════
   APRENDIZAJE — Cerrar el ciclo (resultado → aprendizajes → decisión)
   ════════════════════════════════════════════════════════════ */
const LEARN_NOTES = ["El acta corta sí se sostiene", "Cuando hay un dueño, el tema avanza", "Lo visible ayuda a no repetir temas"];
const RESULT_OPTS = [
  { key: "yes", label: "Funcionó", desc: "La señal mejoró como esperábamos.", icon: "CircleCheck", color: "var(--success)" },
  { key: "partial", label: "A medias", desc: "Hubo avance, pero no lo suficiente.", icon: "CircleDot", color: "var(--warning)" },
  { key: "no", label: "No funcionó", desc: "No movió la aguja o surgió algo nuevo.", icon: "CircleX", color: "var(--risk)" },
];
const DECISION_OPTS = [
  { key: "consolidate", label: "Consolidar", desc: "Volverlo un hábito del equipo.", icon: "Anchor", color: "var(--success)" },
  { key: "iterate", label: "Iterar", desc: "Ajustar la apuesta y volver a probar.", icon: "RefreshCw", color: "var(--st-proof)" },
  { key: "drop", label: "Soltar", desc: "Dejarla y atender otra tensión.", icon: "Archive", color: "var(--ink-2)" },
];

function LearnFlow({ team, type, init, onExit }: { team: Team; type: SessionType; init?: Initiative; onExit: () => void }) {
  const STEPS = [
    { key: "result", label: "Resultado", icon: "Flag", secs: 0 },
    { key: "learn", label: "Aprendizajes", icon: "Lightbulb", secs: 180 },
    { key: "decision", label: "Decisión", icon: "GitFork", secs: 0 },
    { key: "close", label: "Cierre", icon: "Check", secs: 0 },
  ];
  const [step, setStep] = useState(0);
  const timer = useTimer(180);
  useEffect(() => { if (STEPS[step].secs > 0) timer.reset(STEPS[step].secs); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [step]);
  const [result, setResult] = useState("");
  const [learnings, setLearnings] = useState<Note[]>([]);
  const [decision, setDecision] = useState("");
  const cur = STEPS[step];
  const canNext = cur.key === "result" ? !!result : cur.key === "learn" ? learnings.length >= 1 : cur.key === "decision" ? !!decision : true;
  const resultLabel = RESULT_OPTS.find((o) => o.key === result)?.label ?? "—";
  const decisionLabel = DECISION_OPTS.find((o) => o.key === decision)?.label ?? "—";
  const sugg = decision === "consolidate" ? "Iniciativa cerrada y consolidada. Arrancá una nueva para la próxima tensión."
    : decision === "iterate" ? "La iniciativa vuelve a Prueba para diseñar una nueva apuesta."
    : decision === "drop" ? "Iniciativa cerrada. Volvé a Exploración para elegir la próxima tensión."
    : "";
  const finish = async () => {
    const status: Initiative["status"] | undefined =
      decision === "iterate" ? "active" : decision === "consolidate" || decision === "drop" ? "done" : undefined;
    const newStage: StageKey | undefined = decision === "iterate" ? "proof" : undefined;
    await recordSession({
      teamId: team.id, initiativeId: init?.id, sessionStage: "learn",
      retro: "Cerrar el ciclo", out: `Resultado: ${resultLabel} · Decisión: ${decisionLabel}`,
      stageData: { result, learnings: learnings.map((l) => l.text), decision },
      newStage, status,
    });
    onExit();
  };

  let content: ReactNode = null;
  if (cur.key === "result") {
    content = (
      <div style={{ width: "100%" }}>
        <StepHeader icon="Flag" title={init?.title ? `¿Cómo cerró “${init.title}”?` : "¿Funcionó la prueba?"} sub="La mirada honesta del equipo sobre el resultado." />
        <PickOne options={RESULT_OPTS} value={result} onChange={setResult} />
      </div>
    );
  } else if (cur.key === "learn") {
    content = (
      <div style={{ width: "100%" }}>
        <StepHeader icon="Lightbulb" title="¿Qué aprendimos?" sub="Lo que nos llevamos, sirva o no la prueba. Esto queda para el equipo." />
        <Brainstorm color={type.color} placeholder="Un aprendizaje…" seed={LEARN_NOTES} items={learnings} setItems={setLearnings} />
      </div>
    );
  } else if (cur.key === "decision") {
    content = (
      <div style={{ width: "100%" }}>
        <StepHeader icon="GitFork" title="¿Y ahora qué?" sub="Decidimos juntos cómo seguimos con esta iniciativa." />
        <PickOne options={DECISION_OPTS} value={decision} onChange={setDecision} />
      </div>
    );
  } else {
    content = (
      <CloseSummary team={team} type={type} title="Ciclo cerrado"
        lines={[{ label: "Resultado", value: resultLabel }, { label: "Aprendizajes", value: learnings.length }, { label: "Decisión", value: decisionLabel }]}
        suggestion={sugg} onClose={finish} />
    );
  }

  return (
    <FlowChrome team={team} type={type} steps={STEPS} step={step} setStep={setStep} onExit={onExit} timer={timer}
      onPrev={() => setStep(Math.max(0, step - 1))} onNext={cur.key === "close" ? undefined : () => setStep(Math.min(STEPS.length - 1, step + 1))}
      nextLabel={cur.key === "decision" ? "Cerrar ciclo" : "Siguiente"} canNext={canNext}>
      {content}
    </FlowChrome>
  );
}

/* ════════════════════════════════════════════════════════════
   Selector de tipo + modo + setup asíncrono
   ════════════════════════════════════════════════════════════ */
function ModeShell({ team, onExit, children }: { team: Team; onExit: () => void; children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "radial-gradient(1100px 520px at 50% -160px, rgba(124,58,237,0.12), transparent), var(--bg-1)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: "1px solid var(--line)" }}>
        <button onClick={onExit} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--ink-2)", fontSize: "var(--t-sm)", fontWeight: 600 }}><Icon name="X" size={18} /> Salir</button>
        <Logo />
        <span style={{ width: 60 }} />
      </header>
      <main style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 20px 80px" }}>{children}</main>
    </div>
  );
}

function TypeSelector({ team, initTitle, recommended, onExit, onPick }: { team: Team; initTitle?: string; recommended?: StageKey; onExit: () => void; onPick: (t: SessionType) => void }) {
  return (
    <ModeShell team={team} onExit={onExit}>
      <div style={{ width: "100%", maxWidth: 920 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>¿Qué sesión querés abrir?</h1>
          <p className="muted" style={{ marginTop: 8, fontSize: "var(--t-sm)" }}>
            {team.name}{initTitle ? <> · <b style={{ color: "var(--ink-1)" }}>{initTitle}</b></> : null}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(265px, 1fr))", gap: 16 }}>
          {SESSION_TYPES.map((t) => {
            const rec = recommended && t.stage === recommended;
            return (
              <button key={t.key} onClick={() => onPick(t)}
                style={{ textAlign: "left", display: "flex", flexDirection: "column", padding: 20, borderRadius: "var(--r-xl)", background: "var(--card)", border: `1px solid ${rec ? t.color : "var(--line-2)"}`, boxShadow: rec ? `0 0 0 1px ${t.color}` : "none", transition: "all .18s var(--ease)", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = rec ? t.color : "var(--line-2)"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 46, height: 46, borderRadius: "var(--r-lg)", background: `color-mix(in srgb, ${t.color} 16%, transparent)`, color: t.color, display: "grid", placeItems: "center", flex: "none" }}><Icon name={t.icon} size={23} /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="eyebrow" style={{ color: t.color }}>{t.short}</div>
                    <div style={{ fontSize: "var(--t-md)", fontWeight: 800, letterSpacing: "-0.01em" }}>{t.name}</div>
                  </div>
                  {rec && <span style={{ marginLeft: "auto" }}><Pill color={t.color} bg={`color-mix(in srgb, ${t.color} 16%, transparent)`} icon="Sparkles">Sugerida</Pill></span>}
                </div>
                <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, marginBottom: 14, flex: 1 }}>{t.desc}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                  <span className="muted" style={{ fontSize: "var(--t-xs)", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="Flag" size={12} /> {t.out}</span>
                  <span style={{ marginLeft: "auto" }}>
                    {t.async
                      ? <Pill color="var(--violet)" bg="var(--violet-soft)" icon="CalendarClock">En vivo o async</Pill>
                      : <Pill color="var(--green)" bg="var(--success-bg)" icon="Radio">Solo en vivo</Pill>}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </ModeShell>
  );
}

function ModeOption({ icon, tag, title, desc, bullets, color, cta, onClick }: { icon: string; tag: string; title: string; desc: string; bullets: string[]; color: string; cta: string; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <div onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ display: "flex", flexDirection: "column", padding: 24, borderRadius: "var(--r-xl)", background: "var(--card)", border: "1px solid " + (h ? color : "var(--line-2)"), boxShadow: h ? `0 0 0 1px ${color}, 0 18px 40px rgba(0,0,0,0.4)` : "none", transition: "all .2s var(--ease)", transform: h ? "translateY(-3px)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: `color-mix(in srgb, ${color} 16%, transparent)`, color, display: "grid", placeItems: "center", flex: "none" }}><Icon name={icon} size={26} /></div>
        <div><div className="eyebrow" style={{ color }}>{tag}</div><div style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</div></div>
      </div>
      <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.55, marginBottom: 16 }}>{desc}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
        {bullets.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "var(--t-sm)" }}>
            <span style={{ color, display: "inline-flex", flex: "none" }}><Icon name="Check" size={15} /></span>{b}
          </div>
        ))}
      </div>
      <Button full icon={icon} onClick={onClick} variant={color === "var(--green)" ? "primary" : "violet"} style={{ marginTop: "auto" }}>{cta}</Button>
    </div>
  );
}

function ModeSelector({ type, team, onExit, onLive, onAsync }: { type: SessionType; team: Team; onExit: () => void; onLive: () => void; onAsync: () => void }) {
  return (
    <ModeShell team={team} onExit={onExit}>
      <div style={{ width: "100%", maxWidth: 760 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>¿Cómo querés facilitar esta etapa?</h1>
          <p className="muted" style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8, fontSize: "var(--t-sm)" }}>
            <span style={{ fontWeight: 600, color: "var(--ink-1)" }}>{type.name}</span>
            <StageBadge stage={type.stage} size="sm" /> · {team.name}
          </p>
        </div>
        <div className="modesel-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <ModeOption icon="Radio" tag="En vivo" title="Sesión sincrónica" color="var(--green)"
            desc="Todo el equipo conectado al mismo tiempo. Vos guiás el ritmo, bloque por bloque."
            bullets={["Temporizador compartido", "Revelación simultánea", "Ideal para presencial o videollamada"]}
            cta="Iniciar en vivo" onClick={onLive} />
          <ModeOption icon="CalendarClock" tag="Asíncrono" title="Recolección por plazo" color="var(--violet)"
            desc="Cada quien responde cuando puede, dentro de una fecha límite. Vos cerrás y revisás."
            bullets={["Sin agenda compartida", "Respuestas anónimas hasta la fecha", "Ideal para equipos distribuidos"]}
            cta="Configurar asíncrona" onClick={onAsync} />
        </div>
      </div>
    </ModeShell>
  );
}

function AsyncSetup({ type, team, onExit, onCollected }: { type: SessionType; team: Team; onExit: () => void; onCollected: () => void }) {
  const [phase, setPhase] = useState<"setup" | "collecting">("setup");
  const [deadline, setDeadline] = useState("3 días");
  const [msg, setMsg] = useState("");
  const [responded, setResponded] = useState(0);
  const total = team.members.length;
  useEffect(() => {
    if (phase === "collecting" && responded < total) {
      const t = setTimeout(() => setResponded((r) => Math.min(total, r + 1)), 800);
      return () => clearTimeout(t);
    }
  }, [phase, responded, total]);

  return (
    <ModeShell team={team} onExit={onExit}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {phase === "setup" ? (
          <Card pad={28}>
            <div style={{ width: 48, height: 48, borderRadius: "var(--r-md)", background: "var(--violet-soft)", color: "var(--violet)", display: "grid", placeItems: "center", marginBottom: 16 }}><Icon name="CalendarClock" size={24} /></div>
            <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>Configurar recolección asíncrona</h1>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 22 }}>{type.name} · {team.name}</p>
            <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>Plazo para responder</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {["48 horas", "3 días", "1 semana"].map((d) => {
                const on = deadline === d;
                return <button key={d} onClick={() => setDeadline(d)} style={{ padding: "9px 14px", borderRadius: "var(--r-full)", fontSize: "var(--t-sm)", fontWeight: 600, background: on ? "var(--violet)" : "var(--card-2)", color: on ? "#fff" : "var(--ink-1)", border: "1px solid " + (on ? "var(--violet)" : "var(--line-2)") }}>{d}</button>;
              })}
            </div>
            <label className="eyebrow" style={{ display: "block", marginBottom: 8 }}>Mensaje al equipo <span className="faint" style={{ textTransform: "none", letterSpacing: 0 }}>(opcional)</span></label>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Tomate 5 minutos esta semana para responder con honestidad…"
              style={{ width: "100%", minHeight: 72, background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-sm)", resize: "vertical", outline: "none", marginBottom: 20 }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--card-2)", borderRadius: "var(--r-md)", border: "1px solid var(--line)", marginBottom: 22 }}>
              <AvatarStack people={team.members} max={5} size={26} />
              <span className="muted" style={{ fontSize: "var(--t-sm)" }}>Se enviará a <b style={{ color: "var(--ink-0)" }}>{total} integrantes</b></span>
            </div>
            <Button full icon="Send" variant="violet" onClick={() => setPhase("collecting")}>Enviar a {total} integrantes</Button>
          </Card>
        ) : (
          <Card pad={28} style={{ textAlign: "center" }}>
            <div style={{ margin: "0 auto 18px" }}>
              <ProgressRing value={total ? responded / total : 0} size={120} stroke={10} color="var(--violet)">
                <span className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 700, lineHeight: 1 }}>{responded}/{total}</span>
                <span className="muted" style={{ fontSize: 10 }}>respondieron</span>
              </ProgressRing>
            </div>
            <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>{responded < total ? "Recolectando respuestas…" : "¡Todos respondieron!"}</h1>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 18 }}>Cierra el <b style={{ color: "var(--ink-1)" }}>{deadline === "48 horas" ? "jueves 6 jun" : deadline === "3 días" ? "viernes 7 jun" : "miércoles 11 jun"}</b> · respuestas anónimas</p>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 22 }}>
              <div style={{ display: "flex" }}>{team.members.map((m, i) => (
                <span key={i} style={{ marginLeft: i ? -8 : 0, opacity: i < responded ? 1 : 0.25, transition: "opacity .3s" }}><Avatar name={m.name} initials={m.initials} size={32} idx={i} /></span>
              ))}</div>
            </div>
            <Button full iconRight="ArrowRight" onClick={onCollected}>Cerrar recolección y revisar</Button>
            <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 12 }}>Podés cerrar antes del plazo cuando tengas suficientes respuestas.</p>
          </Card>
        )}
      </div>
    </ModeShell>
  );
}

/* ── Orquestador ──────────────────────────────────────────── */
function SesionInner() {
  const params = useParams<{ teamId: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const team = getTeam(params.teamId || "t1");

  const initId = search.get("init") || undefined;
  const stageParam = (search.get("stage") as StageKey) || undefined;
  const init = team && initId ? getInitiatives(team.id).find((i) => i.id === initId) : undefined;
  const recommended = stageParam || init?.stage;

  const [type, setType] = useState<SessionType | null>(null);
  const [mode, setMode] = useState<null | "live" | "async">(null);
  const [origin, setOrigin] = useState<"live" | "async">("live");

  if (!team) return <div className="screen-pad">Equipo no encontrado.</div>;
  const exit = () => router.push(`/equipos/${team.id}`);
  const common = { team, init, onExit: exit };

  if (!type) {
    return <TypeSelector team={team} initTitle={init?.title} recommended={recommended} onExit={exit}
      onPick={(t) => { setType(t); if (!t.async) { setOrigin("live"); setMode("live"); } }} />;
  }
  if (type.async && !mode) {
    return <ModeSelector type={type} team={team} onExit={exit} onLive={() => { setOrigin("live"); setMode("live"); }} onAsync={() => setMode("async")} />;
  }
  if (mode === "async") {
    return <AsyncSetup type={type} team={team} onExit={exit} onCollected={() => { setOrigin("async"); setMode("live"); }} />;
  }

  switch (type.key) {
    case "explore": return <ExploreFlow team={team} type={type} origin={origin} init={init} onExit={exit} />;
    case "focus": return <FocusFlow type={type} {...common} />;
    case "proof": return <ProofFlow type={type} {...common} />;
    case "follow": return <FollowFlow team={team} type={type} origin={origin} init={init} onExit={exit} />;
    case "learn": return <LearnFlow type={type} {...common} />;
    default: return <ExploreFlow team={team} type={type} origin={origin} init={init} onExit={exit} />;
  }
}

export default function SesionPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-1)" }}><span className="muted">Cargando…</span></div>}>
      <SesionInner />
    </Suspense>
  );
}
