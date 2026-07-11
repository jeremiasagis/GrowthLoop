"use client";

/* ============================================================
   Hub de Desafíos (facilitador) — el backlog vivo. Junta lo que
   sale de lo fundacional (FODA), del clima y de lo que plantean
   los miembros; el facilitador lo tría (colectivo/individual +
   dominio) y lo rutea: colectivo → loop; individual → desarrollo.
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

/** Las 3 lentes de detección (retros para descubrir desafíos). Tope duro de 3. */
const DETECT_LENSES = [
  { id: "exploration-team-radar", label: "Cómo nos sentimos", icon: "Activity", color: "var(--warning)", desc: "Radar de clima" },
  { id: "exploration-sailboat", label: "Qué nos frena", icon: "Anchor", color: "var(--st-proof)", desc: "Sailboat: vientos y anclas" },
  { id: "focus-client-voice", label: "Mirada del cliente", icon: "Handshake", color: "var(--violet)", desc: "La voz del cliente" },
];

const SOURCE_LABEL: Record<string, string> = {
  fundacional: "FODA", clima: "Clima", plantear: "Un integrante", "360": "360", retro: "Retro", manual: "Manual",
};

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

  const open = list.filter((c) => c.status === "open");
  const routed = list.filter((c) => c.status === "routed");
  const joinable = (team.members ?? []).filter((m) => m.userId);

  const addFromSugg = async (s: Suggestion) => {
    setBusy(s.sourceRef);
    const { error } = await createChallenge({ teamId: team.id, title: s.title, detail: s.detail, scope: s.scope, domain: s.domain, source: s.source, sourceRef: s.sourceRef });
    setBusy(null);
    if (error) { show("No se pudo agregar.", "TriangleAlert"); return; }
    show("Agregado al backlog", "Check"); reload();
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

  return (
    <div className="screen-pad" style={{ maxWidth: 860 }}>
      <button onClick={() => router.push(`/equipos/${team.id}`)} className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 600, marginBottom: 10 }}><Icon name="ChevronLeft" size={13} /> {team.name}</button>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Desafíos</h1>
        <p className="muted" style={{ marginTop: 4 }}>Lo que el equipo tiene para mejorar, individual y colectivo. Los colectivos se convierten en loops; los individuales van a desarrollo.</p>
      </div>

      {/* Salir a detectar */}
      <Card pad={18} style={{ marginBottom: 18 }}>
        <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color: "var(--green)" }}><Icon name="Radar" size={13} /> Salir a detectar</div>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginBottom: 12 }}>Corré una retro corta con el equipo para descubrir nuevos desafíos desde tres miradas.</p>
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
      </Card>

      {/* Sugeridos */}
      {sugg.length > 0 && (
        <Card pad={18} style={{ marginBottom: 18 }}>
          <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, color: "var(--violet)" }}><Icon name="Sparkles" size={13} /> Sugeridos (de las fundaciones, el clima y lo que plantea el equipo)</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sugg.slice(0, 8).map((s) => (
              <div key={s.sourceRef} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", flex: "none" }}>{SOURCE_LABEL[s.source] ?? s.source}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: "var(--t-sm)" }}>{s.title}</span>
                <Button size="sm" variant="secondary" icon={busy === s.sourceRef ? "Loader" : "Plus"} disabled={busy === s.sourceRef} onClick={() => addFromSugg(s)}>Agregar</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Alta manual */}
      <Card pad={16} style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addManual()} placeholder="Sumar un desafío a mano…" style={{ flex: 1, minWidth: 0, background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" }} />
          <Button icon={busy === "manual" ? "Loader" : "Plus"} disabled={!addTitle.trim() || busy === "manual"} onClick={addManual}>Agregar</Button>
        </div>
      </Card>

      {/* Backlog */}
      <div className="eyebrow" style={{ marginBottom: 10 }}>Backlog · {open.length} abierto{open.length === 1 ? "" : "s"}</div>
      {open.length === 0 ? (
        <Card pad={20}><p className="muted" style={{ fontSize: "var(--t-sm)", textAlign: "center" }}>Sin desafíos abiertos. Agregá desde los sugeridos o a mano.</p></Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {open.map((c) => {
            const dm = domainMeta(c.domain);
            return (
              <Card key={c.id} pad={16} style={{ borderLeft: `3px solid ${dm.color}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{c.title}</div>
                    {c.detail && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2, lineHeight: 1.4 }}>{c.detail}</p>}
                  </div>
                  <button onClick={() => patch(c, { status: "archived" })} title="Archivar" style={{ color: "var(--ink-3)", flex: "none" }}><Icon name="Archive" size={15} /></button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                  <ScopeToggle value={c.scope} onChange={(s) => patch(c, { scope: s })} />
                  <button onClick={() => setPickDomain(pickDomain === c.id ? null : c.id)} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 700, border: `1px solid ${dm.color}`, background: `color-mix(in srgb, ${dm.color} 12%, var(--card))`, color: dm.color }}><Icon name={dm.icon} size={12} /> {dm.label}</button>
                  <span style={{ flex: 1 }} />
                  {c.scope === "collective" ? (
                    <Button size="sm" icon={busy === c.id ? "Loader" : "RefreshCw"} disabled={busy === c.id} onClick={() => toLoop(c)}>Convertir en loop</Button>
                  ) : joinable.length === 0 ? (
                    <span className="muted" style={{ fontSize: "var(--t-xs)", fontStyle: "italic" }}>Cuando se unan integrantes, asignás este foco a una persona.</span>
                  ) : (
                    <select value={c.assigneeUserId ?? ""} onChange={(e) => patch(c, { assigneeUserId: e.target.value || undefined })}
                      style={{ background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "6px 9px", fontSize: "var(--t-xs)", fontWeight: 600, outline: "none" }}>
                      <option value="">Asignar a…</option>
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
              </Card>
            );
          })}
        </div>
      )}

      {/* Convertidos en loop */}
      {routed.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="eyebrow" style={{ marginBottom: 10 }}>Convertidos en loop</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {routed.map((c) => (
              <button key={c.id} onClick={() => c.loopId && router.push(`/equipos/${team.id}/iniciativa/${c.loopId}`)} style={{ textAlign: "left" }}>
                <Card pad={12} hover style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <Icon name="RefreshCw" size={14} style={{ color: "var(--green)", flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: "var(--t-sm)", fontWeight: 600 }}>{c.title}</span>
                  <Icon name="ChevronRight" size={15} style={{ color: "var(--ink-3)" }} />
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {detectRetro && <SessionLauncher team={team} initialRetro={detectRetro} onClose={() => setDetectRetro(null)} />}
    </div>
  );
}
