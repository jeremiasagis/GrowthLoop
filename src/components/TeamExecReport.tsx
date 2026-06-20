"use client";

/* ============================================================
   Reporte ejecutivo de UN equipo, de 1 click. Norte arma un
   resumen para sponsor/management a partir de los datos reales
   del equipo: objetivo, clima, loops en curso con su señal, qué
   se movió y aprendizajes. Pensado para compartir hacia arriba.
   ============================================================ */

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getInitiatives } from "@/lib/repository";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { STAGES, overallOf, to5, type Team } from "@/lib/data";

function buildTeamReport(team: Team): string {
  const L: string[] = [`Equipo: ${team.name}${team.area ? ` (${team.area})` : ""}.`];
  if (team.data?.objective?.text) L.push(`Objetivo del equipo: ${team.data.objective.text}.`);
  if (team.psychSafety > 0) L.push(`Confianza del equipo: ${to5(team.psychSafety).toFixed(1)}/5.`);
  if (team.pulse?.length) {
    const last = overallOf(team.pulse[team.pulse.length - 1]);
    const first = overallOf(team.pulse[0]);
    L.push(`Clima actual: ${last}/100${team.pulse.length > 1 ? ` (venía de ${first}/100).` : "."}`);
  } else L.push("Todavía no hay pulso de clima registrado.");
  if (team.data?.cadence?.everyDays) L.push(`Ritmo sugerido: cada ${team.data.cadence.everyDays} días.`);
  if (team.data?.lastSessionAt) L.push(`Última sesión: ${new Date(team.data.lastSessionAt).toLocaleDateString("es")}.`);

  const inits = getInitiatives(team.id);
  if (inits.length) {
    L.push(`\nLoops (${inits.length}):`);
    for (const i of inits) {
      const d = i.data ?? {};
      const parts: string[] = [`- "${i.title}" — etapa ${STAGES[i.stage]?.label ?? i.stage}, estado ${i.status}.`];
      if (d.focus?.rootCause) parts.push(`Problema/causa: ${d.focus.rootCause}.`);
      const betThen = d.proof?.betThen ?? d.proof?.bets?.[0]?.betThen;
      if (betThen) parts.push(`Apuesta: ${betThen}.`);
      // Señal antes → ahora → meta (lo que haya).
      const metric = d.proof?.signalMetric ?? d.follow?.signalName;
      const now = d.follow?.signalNow ?? (d.follow?.current != null ? `${d.follow.current}${d.follow.unit ?? ""}` : undefined);
      const target = d.proof?.signalTarget ?? (d.follow?.target != null ? `${d.follow.target}${d.follow.unit ?? ""}` : undefined);
      if (metric || now || target) parts.push(`Señal${metric ? ` (${metric})` : ""}:${now ? ` ahora ${now}` : ""}${target ? ` / meta ${target}` : ""}.`);
      if (d.learn?.result) parts.push(`Resultado: ${d.learn.result}.`);
      if (d.learn?.decision) parts.push(`Decisión: ${d.learn.decision}.`);
      if (d.consolidate?.pending && d.consolidate.due) parts.push(`Consolidación pendiente (vence ${d.consolidate.due}).`);
      L.push(parts.join(" "));
    }
  } else L.push("\nTodavía no hay loops en curso.");

  const transfer = (team.data?.library ?? []).filter((e) => e.transferable);
  if (transfer.length) {
    L.push(`\nAprendizajes transferibles (${transfer.length}):`);
    transfer.slice(0, 12).forEach((e) => L.push(`- ${e.text}.`));
  }
  return L.join("\n");
}

export function TeamExecReport({ team, aiEnabled }: { team: Team; aiEnabled: boolean }) {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const run = async () => {
    if (busy) return;
    if (!aiEnabled) { show("✨ El reporte ejecutivo está en el plan Pro.", "Lock"); return; }
    const ctx = buildTeamReport(team).trim();
    setBusy(true);
    try {
      const { data: s } = await getSupabaseBrowserClient().auth.getSession();
      const res = await fetch("/api/ai/norte", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${s.session?.access_token ?? ""}` },
        body: JSON.stringify({ kind: "teamReport", context: ctx }),
      });
      const json = await res.json();
      if (!res.ok || json.error) { show(json.error ?? "No se pudo generar el reporte.", "TriangleAlert"); return; }
      setReport(json.text ?? "");
    } catch { show("No se pudo contactar a la IA.", "TriangleAlert"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <Button size="sm" variant="secondary" icon={busy ? "Loader" : aiEnabled ? "FileBarChart" : "Lock"} disabled={busy} onClick={run}>
        {busy ? "Generando…" : "Reporte ejecutivo"}
      </Button>

      {report !== null && (
        <div onClick={() => setReport(null)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(720px,100%)", maxHeight: "86vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--violet) 16%, transparent)", color: "var(--violet)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="FileBarChart" size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "var(--t-lg)" }}>Reporte ejecutivo · {team.name}</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Generado por Norte · revisalo antes de compartir</div>
              </div>
              <button onClick={() => setReport(null)} style={{ color: "var(--ink-2)" }}><Icon name="X" size={22} /></button>
            </div>
            <div style={{ padding: "16px 18px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", fontSize: "var(--t-sm)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{report || "Sin datos suficientes para el reporte."}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <Button variant="secondary" icon="Copy" onClick={() => { navigator.clipboard?.writeText(report ?? ""); show("Copiado", "Check"); }}>Copiar</Button>
              <Button icon="Check" onClick={() => setReport(null)}>Listo</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
