"use client";

/* ============================================================
   Señal automática / manual. Deja al facilitador alimentar la
   señal de un loop sin necesidad de una sesión de Seguimiento:
   - Manual: cargar un valor puntual (fecha + valor).
   - CSV: pegar una serie ("valor" o "fecha,valor" por línea).
   - Automática:
       · Desde la app: atar la señal a algo que la app ya mide
         (clima del equipo / compromisos cumplidos). Se llena sola
         con el historial y se actualiza cuando el equipo avanza.
       · Webhook: una fuente externa empuja el valor (Sheets/n8n…).
   Todo escribe en data.follow.signalLog (única fuente de verdad).
   ============================================================ */

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { patchInitiativeData } from "@/lib/repository";
import {
  internalSignalNow, syncedSignalLog, SIGNAL_SOURCE_LABEL, SIGNAL_SOURCE_UNIT, type InternalSource,
} from "@/lib/loop";
import type { Initiative, Team } from "@/lib/data";

const today = () => new Date().toISOString().slice(0, 10);
const fieldStyle: React.CSSProperties = { background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "9px 11px", fontSize: "var(--t-sm)", outline: "none" };

export function SignalSource({ init, team, onChanged }: { init: Initiative; team: Team; onChanged: () => void }) {
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"manual" | "csv" | "auto">("manual");
  const [busy, setBusy] = useState(false);
  const [date, setDate] = useState(today());
  const [value, setValue] = useState("");
  const [csv, setCsv] = useState("");
  const [showHook, setShowHook] = useState(false);

  const fl = init.data?.follow;
  const log = fl?.signalLog ?? [];
  const token = fl?.signalToken;
  const source = fl?.signalSource as InternalSource | undefined;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const hookUrl = token ? `${origin}/api/signal/${init.id}?key=${token}` : "";

  const save = async (points: { date: string; value: string }[], extra?: Record<string, unknown>) => {
    setBusy(true);
    const { error } = await patchInitiativeData(init.id, "follow", { signalLog: [...log, ...points], ...(extra ?? {}) });
    setBusy(false);
    if (error) { show("No se pudo guardar.", "TriangleAlert"); return false; }
    onChanged();
    return true;
  };

  const addManual = async () => {
    if (!value.trim()) return;
    if (await save([{ date: date || today(), value: value.trim() }])) { setValue(""); show("Valor agregado", "Check"); }
  };
  const importCsv = async () => {
    const rows = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const parts = l.split(/[,;\t]/).map((p) => p.trim());
      return parts.length >= 2 ? { date: parts[0], value: parts[1] } : { date: today(), value: parts[0] };
    }).filter((p) => p.value);
    if (!rows.length) { show("No encontré valores para importar.", "TriangleAlert"); return; }
    if (await save(rows)) { setCsv(""); show(`${rows.length} valores importados`, "Check"); }
  };
  const genToken = async () => {
    const t = (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Math.random()}`.slice(2)).replace(/-/g, "").slice(0, 24);
    setBusy(true);
    const { error } = await patchInitiativeData(init.id, "follow", { signalToken: t });
    setBusy(false);
    if (error) { show("No se pudo generar el token.", "TriangleAlert"); return; }
    onChanged();
    show("Webhook activado", "Check");
  };

  // ── Señal automática interna (clima / compromisos) ──
  const bindSource = async (s: InternalSource) => {
    setBusy(true);
    const tmp = { ...init, data: { ...init.data, follow: { ...fl, signalSource: s } } } as Initiative;
    const synced = syncedSignalLog(team, tmp);
    const patch: Record<string, unknown> = { signalSource: s };
    if (synced) patch.signalLog = synced;
    const { error } = await patchInitiativeData(init.id, "follow", patch);
    setBusy(false);
    if (error) { show("No se pudo conectar.", "TriangleAlert"); return; }
    onChanged();
    show(`Conectado a ${SIGNAL_SOURCE_LABEL[s]}`, "Check");
  };
  const syncNow = async () => {
    const synced = syncedSignalLog(team, init);
    if (!synced) { show("La señal ya está al día.", "Check"); return; }
    setBusy(true);
    const { error } = await patchInitiativeData(init.id, "follow", { signalLog: synced });
    setBusy(false);
    if (error) { show("No se pudo actualizar.", "TriangleAlert"); return; }
    onChanged();
    show("Señal actualizada", "Check");
  };
  const unbind = async () => {
    setBusy(true);
    const { error } = await patchInitiativeData(init.id, "follow", { signalSource: undefined });
    setBusy(false);
    if (error) { show("No se pudo desconectar.", "TriangleAlert"); return; }
    onChanged();
    show("Señal desconectada", "Check");
  };

  const TabBtn = ({ k, label, icon }: { k: typeof tab; label: string; icon: string }) => (
    <button onClick={() => setTab(k)} style={{ flex: 1, padding: "8px 6px", borderRadius: "var(--r-md)", fontSize: "var(--t-xs)", fontWeight: 700, border: `1px solid ${tab === k ? "var(--st-proof)" : "var(--line-2)"}`, background: tab === k ? "color-mix(in srgb, var(--st-proof) 12%, var(--card))" : "var(--card)", color: tab === k ? "var(--st-proof)" : "var(--ink-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
      <Icon name={icon} size={13} /> {label}
    </button>
  );

  return (
    <>
      <Button size="sm" variant="secondary" icon="Plus" onClick={() => setOpen(true)}>Cargar señal</Button>

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", maxHeight: "88vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 24, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ width: 38, height: 38, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--st-proof) 16%, transparent)", color: "var(--st-proof)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Activity" size={19} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Cargar la señal</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{init.data?.proof?.signalMetric || "La métrica del experimento"}</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "var(--ink-2)" }}><Icon name="X" size={20} /></button>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              <TabBtn k="manual" label="Manual" icon="Pencil" />
              <TabBtn k="csv" label="Importar" icon="Table" />
              <TabBtn k="auto" label="Automática" icon="Zap" />
            </div>

            {tab === "manual" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...fieldStyle, flex: "none" }} />
                  <input value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addManual()} placeholder="Valor de la señal (ej: 42, 3.5, 80%)" style={{ ...fieldStyle, flex: 1 }} />
                </div>
                <Button icon="Plus" disabled={busy || !value.trim()} onClick={addManual}>{busy ? "Guardando…" : "Agregar valor"}</Button>
                <p className="muted" style={{ fontSize: "var(--t-xs)" }}>Ya hay {log.length} {log.length === 1 ? "valor cargado" : "valores cargados"}.</p>
              </div>
            )}

            {tab === "csv" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p className="muted" style={{ fontSize: "var(--t-xs)" }}>Pegá una serie: un valor por línea, o <code>fecha,valor</code> (ej: <code>2026-06-01,40</code>).</p>
                <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={6} placeholder={"2026-06-01,40\n2026-06-08,52\n2026-06-15,61"} style={{ ...fieldStyle, fontFamily: "var(--mono)", resize: "vertical" }} />
                <Button icon="Upload" disabled={busy || !csv.trim()} onClick={importCsv}>{busy ? "Importando…" : "Importar valores"}</Button>
              </div>
            )}

            {tab === "auto" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* ── Desde la app (interna) ── */}
                <div>
                  <div className="eyebrow" style={{ marginBottom: 6 }}>Desde la app · sin configurar nada</div>
                  <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, marginBottom: 10 }}>Atá la señal a algo que la app ya mide. Trae el historial y se actualiza sola cuando el equipo avanza.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(["pulse", "commitments"] as InternalSource[]).map((s) => {
                      const active = source === s;
                      const now = internalSignalNow(team, init, s);
                      return (
                        <button key={s} disabled={busy} onClick={() => (active ? unbind() : bindSource(s))}
                          style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", padding: "11px 12px", borderRadius: "var(--r-md)", border: `1px solid ${active ? "var(--st-proof)" : "var(--line-2)"}`, background: active ? "color-mix(in srgb, var(--st-proof) 10%, var(--card))" : "var(--card)" }}>
                          <Icon name={s === "pulse" ? "Activity" : "CircleCheck"} size={17} style={{ color: active ? "var(--st-proof)" : "var(--ink-2)", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{SIGNAL_SOURCE_LABEL[s]}</div>
                            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{now != null ? `Ahora: ${now}${SIGNAL_SOURCE_UNIT[s]}` : "todavía sin datos"}</div>
                          </div>
                          {active && <Icon name="Check" size={16} style={{ color: "var(--st-proof)", flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                  </div>
                  {source && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                      <Button size="sm" variant="secondary" icon="RefreshCw" disabled={busy} onClick={syncNow}>Actualizar ahora</Button>
                      <span className="muted" style={{ fontSize: "var(--t-xs)" }}>Conectado a {SIGNAL_SOURCE_LABEL[source]} · {log.length} valores. Tocá de nuevo la fuente para desconectar.</span>
                    </div>
                  )}
                </div>

                {/* ── Webhook (fuente externa) ── */}
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <button onClick={() => setShowHook((v) => !v)} style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, textAlign: "left" }}>
                    <Icon name="Webhook" size={14} style={{ color: "var(--ink-2)", flexShrink: 0 }} />
                    <span style={{ flex: 1, fontWeight: 700, fontSize: "var(--t-sm)" }}>Fuente externa (webhook)</span>
                    <Icon name={showHook ? "ChevronUp" : "ChevronDown"} size={16} style={{ color: "var(--ink-3)" }} />
                  </button>
                  {showHook && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                      <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>Para una métrica que vive fuera de la app: conectá Google Sheets + Zapier/Make, n8n o un script para que empuje el valor solo.</p>
                      {!token ? (
                        <Button icon="Webhook" disabled={busy} onClick={genToken}>{busy ? "Activando…" : "Activar webhook"}</Button>
                      ) : (
                        <>
                          <div>
                            <div className="eyebrow" style={{ marginBottom: 5 }}>URL del webhook (POST)</div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <code style={{ flex: 1, minWidth: 0, fontSize: "var(--t-xs)", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", padding: "9px 11px", overflowX: "auto", whiteSpace: "nowrap" }}>{hookUrl}</code>
                              <Button size="sm" variant="secondary" icon="Copy" onClick={() => { navigator.clipboard?.writeText(hookUrl); show("URL copiada", "Check"); }}>Copiar</Button>
                            </div>
                          </div>
                          <div>
                            <div className="eyebrow" style={{ marginBottom: 5 }}>Ejemplo</div>
                            <code style={{ display: "block", fontSize: "var(--t-xs)", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", padding: "10px 12px", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{`curl -X POST "${hookUrl}" \\\n  -H "content-type: application/json" \\\n  -d '{"value": "61"}'`}</code>
                          </div>
                          <p className="muted" style={{ fontSize: "var(--t-xs)" }}>El body acepta <code>{`{ "value": "61", "date"?: "2026-06-20" }`}</code>. Si no mandás fecha, usa la de hoy. Cuidá el token: quien lo tenga puede cargar valores.</p>
                          <Button size="sm" variant="secondary" icon="RefreshCw" disabled={busy} onClick={genToken}>Regenerar token</Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
