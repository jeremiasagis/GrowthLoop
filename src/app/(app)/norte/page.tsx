"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, Pill } from "@/components/ui";
import { getInitiatives, getOrg, getOrgs, getTeams } from "@/lib/repository";
import { overallOf, planLimits, STAGES, teamLiveStage, to5, type Org, type Team } from "@/lib/data";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

type Action = {
  kind: "triage" | "orgReport" | "retroPlan" | "libraryDigest";
  label: string; sub: string; icon: string;
};

const ACTIONS: Action[] = [
  { kind: "triage", label: "¿Qué necesita mi atención?", sub: "Norte escanea todos los equipos y prioriza lo urgente: inactividad, clima cayendo, iniciativas frenadas, vencimientos.", icon: "BellRing" },
  { kind: "orgReport", label: "Reporte unificado de la organización", sub: "Un informe ejecutivo con el estado de todos los equipos y los temas que se repiten.", icon: "FileBarChart" },
  { kind: "retroPlan", label: "¿Qué retro le conviene a cada equipo?", sub: "Norte mira la etapa y el clima de cada equipo y recomienda el próximo paso.", icon: "Radio" },
  { kind: "libraryDigest", label: "Resumen de aprendizajes", sub: "Destila la biblioteca de toda la organización en patrones y aprendizajes transferibles.", icon: "Library" },
];

/* ── Builders de contexto (client-side, con los datos del store) ── */
function teamLine(t: Team): string {
  const stage = STAGES[teamLiveStage(t) ?? t.stage]?.label ?? "—";
  const pulse = t.pulse?.length ? `${overallOf(t.pulse[t.pulse.length - 1])}/100` : "sin pulso";
  return `${t.name} (${t.area || "—"}) · etapa ${stage} · clima ${pulse}`;
}

/* Tope de caracteres del contexto. Por debajo del slice de la ruta (14000)
   para que el corte ocurra acá —en límites de registro— y nunca a la mitad. */
const CTX_BUDGET = 13000;

/* Une registros ENTEROS hasta CTX_BUDGET y, si quedó algo afuera, se lo dice
   al modelo para que no reporte parcial como si fuera total. */
function joinBudget(header: string, records: string[], sep: string, budget: number, noun: string): string {
  const parts: string[] = [];
  let used = header.length, kept = 0;
  for (const r of records) {
    if (kept > 0 && used + r.length + sep.length > budget) break;
    parts.push(r); used += r.length + sep.length; kept++;
  }
  const body = parts.join(sep);
  const omitted = records.length - kept;
  const note = omitted > 0
    ? `${sep}(Nota: se omitieron ${omitted} ${noun} por tamaño; este resumen incluye ${kept} de ${records.length}. No completes los faltantes: trabajá solo con lo incluido y aclaralo si hace falta.)`
    : "";
  return header ? header + sep + body + note : body + note;
}

function buildOrgReport(org: Org, teams: Team[]): string {
  const header = `Organización: ${org.name}. Sector: ${org.sector}. ${teams.length} equipo(s).`;
  const records = teams.map((t) => {
    const L: string[] = [`## ${teamLine(t)}`];
    if (t.data?.objective?.text) L.push(`Objetivo del equipo: ${t.data.objective.text}.`);
    const inits = getInitiatives(t.id);
    if (inits.length) {
      L.push(`Iniciativas (${inits.length}):`);
      for (const i of inits) {
        const dec = i.data?.learn?.decision;
        L.push(`- ${i.title} — etapa ${STAGES[i.stage]?.label ?? i.stage}, estado ${i.status}${dec ? `, decisión: ${dec}` : ""}.`);
      }
    } else L.push("Sin iniciativas todavía.");
    const lib = t.data?.library ?? [];
    if (lib.length) L.push(`Aprendizajes en biblioteca: ${lib.length}.`);
    return L.join("\n");
  });
  return joinBudget(header, records, "\n", CTX_BUDGET, "equipos");
}

function buildRetroPlan(teams: Team[]): string {
  const records = teams.map((t) => {
    const inits = getInitiatives(t.id);
    const active = inits.filter((i) => i.status === "active").length;
    const last = t.sessions?.[t.sessions.length - 1];
    return `### ${t.name}\n- ${teamLine(t)}\n- Iniciativas activas: ${active} (de ${inits.length}).\n- Última sesión: ${last ? `${last.stage ?? "—"} (${last.date ?? "—"})` : "ninguna registrada"}.`;
  });
  return joinBudget("", records, "\n\n", CTX_BUDGET, "equipos");
}

const daysSince = (iso?: string): number | null => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null);

/** Alertas calculadas con reglas (determinísticas). La IA después prioriza y redacta. */
function buildTriage(teams: Team[]): string {
  const blocks: string[] = [];
  for (const t of teams) {
    const al: string[] = [];
    const last = daysSince(t.data?.lastSessionAt);
    const cad = t.data?.cadence?.everyDays ?? 7;
    if (last === null && (t.sessions?.length ?? 0) === 0) al.push("Todavía no hizo ninguna sesión.");
    else if (last !== null && last >= Math.max(14, cad * 2)) al.push(`Sin sesiones hace ${last} días (ritmo sugerido: cada ${cad}).`);

    if (t.psychSafety > 0 && t.psychSafety < 70) al.push(`Confianza del equipo baja: ${to5(t.psychSafety).toFixed(1)}/5.`);
    if ((t.pulse?.length ?? 0) >= 2) {
      const f = overallOf(t.pulse[0]), l = overallOf(t.pulse[t.pulse.length - 1]);
      if (l < f - 5) al.push(`El clima viene bajando (${f} → ${l} sobre 100).`);
    }

    const inits = getInitiatives(t.id);
    const active = inits.filter((i) => i.status === "active");
    if (active.length && last !== null && last >= 14) al.push(`${active.length} iniciativa(s) activa(s) sin movimiento reciente.`);
    for (const i of inits) {
      const overdue = i.data?.consolidate?.pending ? daysSince(i.data.consolidate.due) : null;
      if (overdue !== null && overdue > 0) al.push(`Consolidación vencida hace ${overdue} días en "${i.title}".`);
    }

    if (al.length) blocks.push(`## ${t.name} (${t.area || "—"})\n${al.map((x) => `- ${x}`).join("\n")}`);
  }
  return joinBudget("", blocks, "\n\n", CTX_BUDGET, "equipos");
}

function buildLibraryDigest(teams: Team[]): string {
  const records: string[] = [];
  for (const t of teams) {
    for (const e of t.data?.library ?? []) {
      records.push(`- [${t.name}] ${e.text}${e.type ? ` (tipo: ${e.type})` : ""}${e.stage ? `, etapa ${e.stage}` : ""}${e.transferable ? ", transferible" : ""}${e.highlighted ? ", destacado" : ""}.`);
    }
  }
  return records.length ? joinBudget("Aprendizajes registrados por los equipos:", records, "\n", CTX_BUDGET, "aprendizajes") : "";
}

export default function NortePage() {
  const { show } = useToast();
  const orgs = useMemo(() => getOrgs(), []);
  const [orgId, setOrgId] = useState(orgs[0]?.id ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; text: string } | null>(null);

  const org = orgId ? getOrg(orgId) : undefined;
  const teams = useMemo(() => getTeams().filter((t) => t.orgId === orgId), [orgId]);
  const aiEnabled = planLimits(org?.plan).ai;

  const run = async (a: Action) => {
    if (busy) return;
    if (!teams.length) { show("Esta organización todavía no tiene equipos.", "TriangleAlert"); return; }
    let ctx = "";
    if (a.kind === "triage") ctx = buildTriage(teams);
    else if (a.kind === "orgReport") ctx = buildOrgReport(org!, teams);
    else if (a.kind === "retroPlan") ctx = buildRetroPlan(teams);
    else ctx = buildLibraryDigest(teams);
    if (!ctx.trim()) {
      if (a.kind === "triage") { setResult({ title: a.label, text: "✅ Todo en orden.\n\nNingún equipo de esta organización tiene señales de alerta ahora mismo: actividad al día, clima estable y sin vencimientos." }); return; }
      show("Todavía no hay aprendizajes registrados para resumir.", "TriangleAlert"); return;
    }
    setBusy(a.kind);
    try {
      const { data: s } = await getSupabaseBrowserClient().auth.getSession();
      const res = await fetch("/api/ai/norte", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ kind: a.kind, context: ctx }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { show(json.error ?? "No se pudo generar.", "TriangleAlert"); return; }
      setResult({ title: a.label, text: json.text ?? "" });
    } catch { show("No se pudo contactar a la IA.", "TriangleAlert"); }
    finally { setBusy(null); }
  };

  return (
    <div className="screen-pad" style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 22 }}>
        <div style={{ width: 46, height: 46, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--violet) 16%, transparent)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}>
          <Icon name="Compass" size={24} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Norte</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 600 }}>Tu asistente de IA. Mira tus equipos de una organización y te ayuda con lo que cuesta hacer a mano.</p>
        </div>
        {orgs.length > 1 && (
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)}
            style={{ background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "9px 12px", fontSize: "var(--t-sm)", outline: "none", flex: "none" }}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}
      </div>

      {orgs.length === 0 ? (
        <Card pad={0}><EmptyState icon="Building2" title="Todavía no hay una organización">Cuando tengas una organización con equipos, Norte va a poder ayudarte acá.</EmptyState></Card>
      ) : !aiEnabled ? (
        <Card pad={26} style={{ textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
          <div style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "color-mix(in srgb, var(--violet) 16%, transparent)", color: "var(--violet)", display: "grid", placeItems: "center", margin: "0 auto 14px" }}><Icon name="Lock" size={26} /></div>
          <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>Norte está en el plan Pro</h3>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8, lineHeight: 1.55 }}>
            La organización <b style={{ color: "var(--ink-1)" }}>{org?.name}</b> está en un plan sin IA. Pasala a <b style={{ color: "var(--ink-1)" }}>Pro</b> para activar a Norte: reportes unificados, recomendación de retros y resumen de aprendizajes.
          </p>
        </Card>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Pill color="var(--violet)" bg="color-mix(in srgb, var(--violet) 16%, transparent)" icon="Sparkles">Pro · IA activa</Pill>
            <span className="muted" style={{ fontSize: "var(--t-sm)" }}>{teams.length} {teams.length === 1 ? "equipo" : "equipos"} en {org?.name}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 14 }}>
            {ACTIONS.map((a) => (
              <Card key={a.kind} pad={20} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 38, height: 38, borderRadius: "var(--r-md)", background: "var(--card-2)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={a.icon} size={19} /></span>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{a.label}</div>
                </div>
                <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, flex: 1 }}>{a.sub}</p>
                <Button variant="violet" icon={busy === a.kind ? "Loader" : "Sparkles"} disabled={!!busy} onClick={() => run(a)}>
                  {busy === a.kind ? "Pensando…" : "Generar"}
                </Button>
              </Card>
            ))}
          </div>
          <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="Info" size={13} /> Norte usa lo que ya cargaron los equipos. Revisá siempre el resultado antes de compartirlo.
          </p>
        </>
      )}

      {result && (
        <div onClick={() => setResult(null)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(720px,100%)", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--violet) 16%, transparent)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Compass" size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "var(--t-lg)" }}>{result.title}</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Generado por Norte · revisalo antes de compartir</div>
              </div>
              <button onClick={() => setResult(null)} style={{ color: "var(--ink-2)" }}><Icon name="X" size={22} /></button>
            </div>
            <div style={{ padding: "16px 18px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{result.text}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <Button variant="secondary" icon="Copy" onClick={() => { navigator.clipboard?.writeText(result.text); show("Copiado", "Check"); }}>Copiar</Button>
              <Button icon="Check" onClick={() => setResult(null)}>Listo</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
