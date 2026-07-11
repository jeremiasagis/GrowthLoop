"use client";

/* ============================================================
   Hub de Desafíos (facilitador) — el backlog vivo, ahora como
   tablero Kanban con drag & drop. Junta lo que sale de lo
   fundacional (FODA), del clima y de lo que plantean los miembros;
   el facilitador lo tría y lo rutea arrastrando entre columnas:
   Sugeridos → Abiertos → En marcha → Hechos. Los botones de acción
   siguen ahí (para touch y para lo que DnD no cubre).
   ============================================================ */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getTeam } from "@/lib/repository";
import { getTeamInputs, voiceKind, type TeamInput } from "@/lib/voice";
import {
  getChallenges, createChallenge, updateChallenge, convertChallengeToLoop,
  suggestedChallenges, domainMeta, DOMAINS, type Challenge, type Suggestion, type ChallengeScope,
} from "@/lib/challenges";
import { retroById, type RetroDefinition } from "@/lib/retros/registry";
import { SessionLauncher } from "@/components/SessionLauncher";
import { getDetectionSummary } from "@/lib/detect";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const DETECT_LENSES = [
  { id: "exploration-team-radar", label: "Cómo nos sentimos", icon: "Activity", color: "var(--warning)", desc: "Radar de clima" },
  { id: "exploration-sailboat", label: "Qué nos frena", icon: "Anchor", color: "var(--st-proof)", desc: "Sailboat: vientos y anclas" },
  { id: "focus-client-voice", label: "Mirada del cliente", icon: "Handshake", color: "var(--violet)", desc: "La voz del cliente" },
];
const SOURCE_LABEL: Record<string, string> = {
  fundacional: "FODA", clima: "Clima", plantear: "Un integrante", "360": "360", retro: "Retro", manual: "Manual", self: "Propio",
};

type ColKey = "sugg" | "open" | "routed" | "done";
const COLS: { key: ColKey; title: string; icon: string; accent: string; hint: string }[] = [
  { key: "sugg", title: "Sugeridos", icon: "Sparkles", accent: "var(--violet)", hint: "De fundaciones, clima y lo que plantea el equipo" },
  { key: "open", title: "Abiertos", icon: "Inbox", accent: "var(--ink-2)", hint: "Triados y listos para arrancar" },
  { key: "routed", title: "En marcha", icon: "RefreshCw", accent: "var(--green)", hint: "Colectivos → loop · individuales → desarrollo" },
  { key: "done", title: "Hechos", icon: "CircleCheck", accent: "var(--success)", hint: "Cerrados" },
];

function ScopeToggle({ value, onChange }: { value: ChallengeScope; onChange: (s: ChallengeScope) => void }) {
  return (
    <div style={{ display: "inline-flex", gap: 4 }}>
      {(["collective", "individual"] as ChallengeScope[]).map((s) => {
        const on = value === s;
        return (
          <button key={s} onClick={() => onChange(s)} style={{ padding: "3px 9px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 700, border: `1px solid ${on ? "var(--green)" : "var(--line-2)"}`, background: on ? "var(--green-soft)" : "var(--card)", color: on ? "var(--green)" : "var(--ink-2)" }}>
            {s === "collective" ? "Colectivo" : "Individual"}
          </button>
        );
      })}
    </div>
  );
}

export default function DesafiosPage() {
  const router = useRouter();
  const { show } = useToast();
  const { id: teamId } = useParams<{ id: string }>();
  const team = getTeam(teamId);
  const [list, setList] = useState<Challenge[]>([]);
  const [inputs, setInputs] = useState<TeamInput[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [addTitle, setAddTitle] = useState("");
  const [pickDomain, setPickDomain] = useState<string | null>(null);
  const [detectRetro, setDetectRetro] = useState<RetroDefinition | null>(null);
  const [dragOver, setDragOver] = useState<ColKey | null>(null);
  const [synthBusy, setSynthBusy] = useState(false);
  const [synth, setSynth] = useState<{ title: string; detail: string; scope: ChallengeScope; domain: string }[] | null>(null);

  useEffect(() => {
    if (!team?.id) return; const tid = team.id;
    let on = true;
    getChallenges(tid).then((r) => on && setList(r));
    getTeamInputs(tid).then((r) => on && setInputs(r));
    return () => { on = false; };
  }, [team?.id]);
  const reload = () => team && getChallenges(team.id).then(setList);

  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">Equipo no encontrado.</p></Card></div>;

  const existingRefs = new Set(list.map((c) => c.sourceRef).filter(Boolean));
  const existingTitles = new Set(list.map((c) => c.title.toLowerCase().trim()));
  const sugg: Suggestion[] = [
    ...suggestedChallenges(team),
    ...inputs.filter((i) => i.status !== "archived").map((i) => ({
      title: i.text.length > 90 ? i.text.slice(0, 90) + "…" : i.text,
      detail: `Planteado por un integrante (${voiceKind(i.kind).label.toLowerCase()}).`,
      scope: "collective" as ChallengeScope, domain: "otro", source: "plantear", sourceRef: `input:${i.id}`,
    })),
  ].filter((s) => !existingRefs.has(s.sourceRef) && !existingTitles.has(s.title.toLowerCase().trim()));

  const byStatus = (st: string) => list.filter((c) => c.status === st);
  const joinable = (team.members ?? []).filter((m) => m.userId);
  const count: Record<ColKey, number> = { sugg: sugg.length, open: byStatus("open").length, routed: byStatus("routed").length, done: byStatus("done").length };

  const addFromSugg = async (s: Suggestion): Promise<Challenge | null> => {
    const { error, id } = await createChallenge({ teamId: team.id, title: s.title, detail: s.detail, scope: s.scope, domain: s.domain, source: s.source, sourceRef: s.sourceRef });
    if (error || !id) { show("No se pudo agregar.", "TriangleAlert"); return null; }
    return { id, teamId: team.id, title: s.title, detail: s.detail, scope: s.scope, domain: s.domain, source: s.source, sourceRef: s.sourceRef, status: "open" };
  };
  const addManual = async () => {
    const t = addTitle.trim(); if (!t) return;
    setBusy("manual");
    const { error } = await createChallenge({ teamId: team.id, title: t, scope: "collective", source: "manual" });
    setBusy(null);
    if (error) { show("No se pudo agregar.", "TriangleAlert"); return; }
    setAddTitle(""); reload();
  };
  const toLoop = async (c: Challenge) => {
    setBusy(c.id);
    const { error } = await convertChallengeToLoop(c);
    setBusy(null);
    if (error) { show(error, "TriangleAlert"); return; }
    show("Se creó el loop", "Check"); reload();
  };
  const patch = async (c: Challenge, p: Partial<Challenge>) => { await updateChallenge(c.id, p); reload(); };

  // WS6 · IA sintetiza lo detectado en las retros → desafíos propuestos.
  const synthesize = async () => {
    if (synthBusy) return;
    setSynthBusy(true);
    try {
      const summary = await getDetectionSummary(team.id);
      if (!summary.count) { show("Todavía no hay detecciones. Corré una lente de arriba primero.", "Info"); return; }
      const { data: s } = await getSupabaseBrowserClient().auth.getSession();
      const res = await fetch("/api/ai/detect-synth", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ context: summary.text }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { show(json.error ?? "No se pudo sintetizar.", "TriangleAlert"); return; }
      const ch = (json.challenges ?? []) as { title: string; detail: string; scope: ChallengeScope; domain: string }[];
      if (!ch.length) { show("La IA no encontró desafíos claros en lo detectado.", "Info"); return; }
      setSynth(ch);
    } catch { show("No se pudo sintetizar.", "TriangleAlert"); }
    finally { setSynthBusy(false); }
  };
  const addSynth = async (c: { title: string; detail: string; scope: ChallengeScope; domain: string }, idx: number) => {
    setBusy(`synth-${idx}`);
    const { error } = await createChallenge({ teamId: team.id, title: c.title, detail: c.detail, scope: c.scope, domain: c.domain, source: "retro" });
    setBusy(null);
    if (error) { show("No se pudo agregar.", "TriangleAlert"); return; }
    setSynth((prev) => prev?.filter((_, i) => i !== idx) ?? null);
    show("Agregado al backlog", "Check"); reload();
  };

  // ── Drag & drop ──
  const onDrop = async (col: ColKey, e: React.DragEvent) => {
    e.preventDefault(); setDragOver(null);
    const payload = e.dataTransfer.getData("text/plain");
    if (!payload) return;
    const [kind, ref] = payload.split(":::");

    if (kind === "sugg") {
      if (col !== "open") { if (col === "routed") { /* materializar y rutear */ } else return; }
      const s = sugg.find((x) => x.sourceRef === ref);
      if (!s) return;
      setBusy(ref);
      const created = await addFromSugg(s);
      setBusy(null);
      if (!created) return;
      if (col === "routed" && created.scope === "collective") { await toLoop(created); return; }
      show("Agregado al backlog", "Check"); reload();
      return;
    }

    // Mover un desafío existente.
    const c = list.find((x) => x.id === ref);
    if (!c) return;
    if (col === "open" && c.status !== "open") return patch(c, { status: "open" });
    if (col === "done" && c.status !== "done") return patch(c, { status: "done" });
    if (col === "routed" && c.status !== "routed") {
      if (c.scope === "collective" && !c.loopId) return toLoop(c);
      return patch(c, { status: "routed" });
    }
  };

  const dragProps = (payload: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData("text/plain", payload); e.dataTransfer.effectAllowed = "move"; },
    style: { cursor: "grab" as const },
  });

  const renderCard = (c: Challenge) => {
    const dm = domainMeta(c.domain);
    return (
      <div key={c.id} {...dragProps(`chal:::${c.id}`)}>
        <Card pad={13} style={{ borderLeft: `3px solid ${dm.color}`, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Icon name="GripVertical" size={14} style={{ color: "var(--ink-3)", flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{c.title}</div>
              {c.detail && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2, lineHeight: 1.4 }}>{c.detail}</p>}
            </div>
            {c.status !== "done" && <button onClick={() => patch(c, { status: "archived" })} title="Archivar" style={{ color: "var(--ink-3)", flex: "none" }}><Icon name="Archive" size={14} /></button>}
          </div>
          {c.status === "open" && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                <ScopeToggle value={c.scope} onChange={(s) => patch(c, { scope: s })} />
                <button onClick={() => setPickDomain(pickDomain === c.id ? null : c.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 700, border: `1px solid ${dm.color}`, background: `color-mix(in srgb, ${dm.color} 12%, var(--card))`, color: dm.color }}><Icon name={dm.icon} size={12} /> {dm.label}</button>
              </div>
              <div style={{ marginTop: 10 }}>
                {c.scope === "collective" ? (
                  <Button size="sm" full icon={busy === c.id ? "Loader" : "RefreshCw"} disabled={busy === c.id} onClick={() => toLoop(c)}>Convertir en loop</Button>
                ) : joinable.length === 0 ? (
                  <span className="muted" style={{ fontSize: "var(--t-xs)", fontStyle: "italic" }}>Cuando se unan integrantes, asignás este foco.</span>
                ) : (
                  <select value={c.assigneeUserId ?? ""} onChange={(e) => patch(c, { assigneeUserId: e.target.value || undefined })}
                    style={{ width: "100%", background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "6px 9px", fontSize: "var(--t-xs)", fontWeight: 600, outline: "none" }}>
                    <option value="">Asignar foco a…</option>
                    {joinable.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                  </select>
                )}
              </div>
              {pickDomain === c.id && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                  {DOMAINS.map((d) => { const m = domainMeta(d); const on = (c.domain ?? "otro") === d; return (
                    <button key={d} onClick={() => { patch(c, { domain: d }); setPickDomain(null); }} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 600, border: `1px solid ${on ? m.color : "var(--line-2)"}`, background: on ? `color-mix(in srgb, ${m.color} 12%, var(--card))` : "var(--card)", color: on ? m.color : "var(--ink-2)" }}><Icon name={m.icon} size={12} /> {m.label}</button>
                  ); })}
                </div>
              )}
            </>
          )}
          {c.status === "routed" && c.loopId && (
            <button onClick={() => router.push(`/equipos/${team.id}/iniciativa/${c.loopId}`)} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--green)" }}><Icon name="ExternalLink" size={12} /> Ver el loop</button>
          )}
          {c.status === "routed" && !c.loopId && c.scope === "individual" && (
            <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 8, fontStyle: "italic" }}>Foco individual en desarrollo.</div>
          )}
        </Card>
      </div>
    );
  };

  const renderSugg = (s: Suggestion) => (
    <div key={s.sourceRef} {...dragProps(`sugg:::${s.sourceRef}`)}>
      <Card pad={12} style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <Icon name="GripVertical" size={14} style={{ color: "var(--ink-3)", flexShrink: 0, marginTop: 2 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase" }}>{SOURCE_LABEL[s.source] ?? s.source}</span>
            <div style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>{s.title}</div>
          </div>
        </div>
        <Button size="sm" full variant="secondary" icon={busy === s.sourceRef ? "Loader" : "Plus"} disabled={busy === s.sourceRef}
          onClick={async () => { setBusy(s.sourceRef); const c = await addFromSugg(s); setBusy(null); if (c) { show("Agregado al backlog", "Check"); reload(); } }}
          style={{ marginTop: 8 }}>Agregar</Button>
      </Card>
    </div>
  );

  return (
    <div className="screen-pad">
      <button onClick={() => router.push(`/equipos/${team.id}`)} className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 600, marginBottom: 10 }}><Icon name="ChevronLeft" size={13} /> {team.name}</button>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Desafíos</h1>
        <p className="muted" style={{ marginTop: 4 }}>Arrastrá las tarjetas entre columnas para triarlas y ponerlas en marcha. Los colectivos se convierten en loops; los individuales van a desarrollo.</p>
      </div>

      {/* Salir a detectar */}
      <Card pad={16} style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: "var(--green)" }}><Icon name="Radar" size={13} /> Salir a detectar</div>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 12 }}>Corré una retro corta con el equipo para descubrir nuevos desafíos desde tres miradas.</p>
          </div>
          <Button size="sm" variant="secondary" icon={synthBusy ? "Loader" : "Sparkles"} disabled={synthBusy} onClick={synthesize}>{synthBusy ? "Leyendo…" : "Sintetizar con IA"}</Button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 10 }}>
          {DETECT_LENSES.map((l) => (
            <button key={l.id} onClick={() => { const r = retroById(l.id); if (r) setDetectRetro(r); }}
              style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "12px", borderRadius: "var(--r-md)", border: `1px solid ${l.color}`, background: `color-mix(in srgb, ${l.color} 7%, var(--card))`, cursor: "pointer" }}>
              <Icon name={l.icon} size={18} style={{ color: l.color, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{l.label}</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{l.desc}</div>
              </div>
            </button>
          ))}
        </div>
        {synth && synth.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: "var(--violet)" }}><Icon name="Sparkles" size={13} /> La IA leyó lo detectado y propone</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {synth.map((c, i) => {
                const dm = domainMeta(c.domain);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: "color-mix(in srgb, var(--violet) 5%, var(--card-2))", border: "1px solid color-mix(in srgb, var(--violet) 22%, var(--line))", borderRadius: "var(--r-md)" }}>
                    <Icon name={dm.icon} size={15} style={{ color: dm.color, flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{c.title}</div>
                      {c.detail && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 1 }}>{c.detail}</p>}
                      <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase" }}>{c.scope === "individual" ? "Individual" : "Colectivo"} · {dm.label}</span>
                    </div>
                    <Button size="sm" variant="secondary" icon={busy === `synth-${i}` ? "Loader" : "Plus"} disabled={busy === `synth-${i}`} onClick={() => addSynth(c, i)}>Agregar</Button>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setSynth(null)} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600, marginTop: 8 }}>Descartar propuestas</button>
          </div>
        )}
      </Card>

      {/* Alta manual */}
      <Card pad={14} style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addManual()} placeholder="Sumar un desafío a mano…" style={{ flex: 1, minWidth: 0, background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
          <Button icon={busy === "manual" ? "Loader" : "Plus"} disabled={!addTitle.trim() || busy === "manual"} onClick={addManual}>Agregar</Button>
        </div>
      </Card>

      {/* Tablero Kanban */}
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, alignItems: "flex-start" }}>
        {COLS.map((col) => {
          const items = col.key === "sugg" ? sugg : byStatus(col.key);
          const isOver = dragOver === col.key;
          return (
            <div key={col.key}
              onDragOver={(e) => { e.preventDefault(); if (dragOver !== col.key) setDragOver(col.key); }}
              onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(null); }}
              onDrop={(e) => onDrop(col.key, e)}
              style={{ flex: "1 0 250px", minWidth: 250, maxWidth: 340, background: isOver ? "color-mix(in srgb, var(--green) 8%, var(--bg-2))" : "var(--bg-2)", border: `1px solid ${isOver ? "color-mix(in srgb, var(--green) 45%, var(--line))" : "var(--line)"}`, borderRadius: "var(--r-lg)", padding: 12, transition: "background .15s, border-color .15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                <Icon name={col.icon} size={14} style={{ color: col.accent }} />
                <span style={{ fontWeight: 800, fontSize: "var(--t-sm)" }}>{col.title}</span>
                <span className="num" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--ink-3)", background: "var(--card-2)", borderRadius: "var(--r-full)", padding: "1px 8px" }}>{count[col.key]}</span>
              </div>
              <p className="muted" style={{ fontSize: 10, marginBottom: 10, lineHeight: 1.4 }}>{col.hint}</p>
              <div style={{ minHeight: 60 }}>
                {items.length === 0 ? (
                  <div style={{ border: "1px dashed var(--line-2)", borderRadius: "var(--r-md)", padding: "18px 10px", textAlign: "center", color: "var(--ink-3)", fontSize: "var(--t-xs)" }}>
                    {isOver ? "Soltá acá" : "—"}
                  </div>
                ) : col.key === "sugg" ? items.map((s) => renderSugg(s as Suggestion)) : (items as Challenge[]).map(renderCard)}
              </div>
            </div>
          );
        })}
      </div>

      {detectRetro && <SessionLauncher team={team} initialRetro={detectRetro} onClose={() => setDetectRetro(null)} />}
    </div>
  );
}
