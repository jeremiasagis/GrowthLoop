"use client";

/* ============================================================
   Panel de Fundaciones — fotos congeladas del equipo (contrato,
   FODA, clima) con su historial: congelar la versión actual, ver
   una versión congelada, y comparar con la anterior. Reusado por
   el facilitador (canEdit) y el miembro (read-only).
   ============================================================ */

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Button, Card, Bar } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { overallOf, to5, dimVal, PULSE_DIMS, type Team } from "@/lib/data";
import {
  getFoundations, createFoundation, deleteFoundation, fmtFoundationDate,
  FOUNDATION_META, FOUNDATION_ORDER, type Foundation, type FoundationKind,
} from "@/lib/foundations";

/* eslint-disable @typescript-eslint/no-explicit-any */
const FODA_Q = [
  { key: "f", label: "Fortalezas", color: "var(--success)" },
  { key: "o", label: "Oportunidades", color: "var(--info)" },
  { key: "d", label: "Debilidades", color: "var(--warning)" },
  { key: "a", label: "Amenazas", color: "var(--risk)" },
];

function FodaView({ data, prev }: { data: any; prev?: any }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 10 }}>
      {FODA_Q.map((q) => {
        const items: string[] = data?.[q.key] ?? [];
        const prevSet = new Set<string>(prev?.[q.key] ?? []);
        const curSet = new Set<string>(items);
        const removed: string[] = prev ? (prev[q.key] ?? []).filter((x: string) => !curSet.has(x)) : [];
        return (
          <div key={q.key} style={{ border: `1px solid color-mix(in srgb, ${q.color} 35%, var(--line))`, borderRadius: "var(--r-md)", padding: 12, background: `color-mix(in srgb, ${q.color} 5%, var(--card))` }}>
            <div className="eyebrow" style={{ color: q.color, marginBottom: 8 }}>{q.label}</div>
            {items.length === 0 && removed.length === 0 ? <p className="muted" style={{ fontSize: "var(--t-xs)", fontStyle: "italic" }}>—</p> : (
              <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
                {items.map((it, i) => { const isNew = prev && !prevSet.has(it); return <li key={i} style={{ fontSize: "var(--t-sm)", lineHeight: 1.4 }}>{it}{isNew && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "var(--green)" }}>nuevo</span>}</li>; })}
                {removed.map((it, i) => <li key={`r${i}`} style={{ fontSize: "var(--t-sm)", lineHeight: 1.4, textDecoration: "line-through", opacity: 0.5 }}>{it}</li>)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ContractView({ data }: { data: any }) {
  const answers: Record<string, string> = data?.answers ?? {};
  const entries = Object.entries(answers).filter(([, v]) => (v ?? "").trim());
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data?.signedNames?.length ? <p className="muted" style={{ fontSize: "var(--t-xs)" }}>Firmado por {data.signedNames.join(", ")}.</p> : null}
      {entries.length === 0 ? <p className="muted" style={{ fontSize: "var(--t-sm)" }}>Sin acuerdos registrados.</p> :
        entries.map(([k, v], i) => (
          <div key={i} style={{ padding: "10px 12px", background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>{k}</div>
            <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.5 }}>{v}</p>
          </div>
        ))}
    </div>
  );
}

function ClimaView({ data, prev }: { data: any; prev?: any }) {
  const dims: Record<string, number> = data?.dims ?? {};
  const prevDims: Record<string, number> | undefined = prev?.dims;
  const overall: number = data?.overall ?? 0;
  const prevOverall: number | undefined = prev?.overall;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800 }}>{overall}</span>
        <span className="muted" style={{ fontSize: "var(--t-sm)" }}>/100 general</span>
        {prevOverall != null && overall - prevOverall !== 0 && <span style={{ fontSize: "var(--t-sm)", fontWeight: 700, color: overall - prevOverall > 0 ? "var(--success)" : "var(--risk)" }}>{overall - prevOverall > 0 ? "▲ +" : "▼ "}{overall - prevOverall}</span>}
      </div>
      {PULSE_DIMS.map((pd) => {
        const v = dims[pd.key]; if (v == null) return null;
        const pv = prevDims?.[pd.key];
        const delta = pv != null ? to5(v) - to5(pv) : 0;
        return (
          <div key={pd.key}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{pd.label}</span>
              <span className="num" style={{ fontWeight: 700, color: pd.color }}>{to5(v).toFixed(1)}{delta !== 0 && <span style={{ marginLeft: 5, fontSize: "var(--t-xs)", color: delta > 0 ? "var(--success)" : "var(--risk)" }}>{delta > 0 ? "+" : ""}{delta.toFixed(1)}</span>}</span>
            </div>
            <Bar value={v} color={pd.color} />
          </div>
        );
      })}
    </div>
  );
}

export function FoundationView({ kind, data, prev }: { kind: FoundationKind; data: any; prev?: any }) {
  if (kind === "foda") return <FodaView data={data} prev={prev} />;
  if (kind === "contract") return <ContractView data={data} />;
  if (kind === "clima") return <ClimaView data={data} prev={prev} />;
  return null;
}

/** La "versión actual" de cada fundación, tomada del estado vivo del equipo. */
function currentOf(team: Team, kind: FoundationKind): Record<string, unknown> | null {
  if (kind === "contract") {
    const c = team.data?.contract;
    if (!c || !c.answers || Object.keys(c.answers).length === 0) return null;
    return { answers: c.answers, signedNames: c.signedNames, date: c.date };
  }
  if (kind === "foda") {
    const f = team.data?.foda;
    if (!f || !(f.f?.length || f.o?.length || f.d?.length || f.a?.length)) return null;
    return { f: f.f ?? [], o: f.o ?? [], d: f.d ?? [], a: f.a ?? [], date: f.date };
  }
  // clima
  const latest = team.pulse?.[team.pulse.length - 1];
  if (!latest) return null;
  const dims: Record<string, number> = {};
  for (const pd of PULSE_DIMS) { const v = dimVal(latest, pd.key); if (v != null) dims[pd.key] = v; }
  return { dims, overall: overallOf(latest), date: latest.date, label: latest.label };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function KindBlock({ team, kind, list, canEdit, onChanged }: { team: Team; kind: FoundationKind; list: Foundation[]; canEdit: boolean; onChanged: () => void }) {
  const { show } = useToast();
  const meta = FOUNDATION_META[kind];
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cmpId, setCmpId] = useState<string | null>(null);
  const current = currentOf(team, kind);

  const snapshot = async () => {
    if (!current) { show("Todavía no hay una versión actual para congelar.", "TriangleAlert"); return; }
    setBusy(true);
    const { error } = await createFoundation(team.id, kind, current);
    setBusy(false);
    if (error) { show("No se pudo guardar.", "TriangleAlert"); return; }
    show("Versión congelada", "Check");
    onChanged();
  };
  const remove = async (id: string) => {
    const { error } = await deleteFoundation(id);
    if (error) { show("No se pudo borrar.", "TriangleAlert"); return; }
    onChanged();
  };

  return (
    <Card pad={18} style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: list.length || current ? 12 : 0 }}>
        <span style={{ width: 38, height: 38, borderRadius: "var(--r-md)", background: `color-mix(in srgb, ${meta.color} 16%, transparent)`, color: meta.color, display: "grid", placeItems: "center", flex: "none" }}><Icon name={meta.icon} size={19} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>{meta.label}</div>
          <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{meta.desc}</div>
        </div>
        {canEdit && current && <Button size="sm" variant="secondary" icon={busy ? "Loader" : "Camera"} disabled={busy} onClick={snapshot}>Congelar versión actual</Button>}
      </div>

      {list.length === 0 ? (
        <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>{current ? "Todavía no congelaste ninguna versión." : "Todavía no hay datos para esta fundación."}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map((snap, i) => {
            const older = list[i + 1];
            const isOpen = openId === snap.id;
            const isCmp = cmpId === snap.id;
            return (
              <div key={snap.id} style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "10px 12px", background: "var(--card-2)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "var(--t-sm)", fontWeight: 700 }}>{fmtFoundationDate(snap.createdAt)}</span>
                  {i === 0 && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--green)" }}>última</span>}
                  <span style={{ flex: 1 }} />
                  <button onClick={() => { setOpenId(isOpen ? null : snap.id); setCmpId(null); }} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 700 }}>{isOpen ? "Cerrar" : "Ver"}</button>
                  {older && <button onClick={() => { setCmpId(isCmp ? null : snap.id); setOpenId(null); }} style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--info)" }}>{isCmp ? "Cerrar" : "Comparar con anterior"}</button>}
                  {canEdit && <button onClick={() => remove(snap.id)} title="Borrar" style={{ color: "var(--ink-3)" }}><Icon name="Trash2" size={14} /></button>}
                </div>
                {isOpen && <div style={{ marginTop: 12 }}><FoundationView kind={kind} data={snap.data} /></div>}
                {isCmp && older && (
                  <div style={{ marginTop: 12 }}>
                    <div className="muted" style={{ fontSize: "var(--t-xs)", marginBottom: 8 }}>Comparado con la versión del {fmtFoundationDate(older.createdAt)} (nuevo en verde, quitado tachado).</div>
                    <FoundationView kind={kind} data={snap.data} prev={older.data} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function FoundationsPanel({ team, canEdit }: { team: Team; canEdit: boolean }) {
  const [founds, setFounds] = useState<Foundation[]>([]);
  useEffect(() => { let on = true; getFoundations(team.id).then((r) => { if (on) setFounds(r); }); return () => { on = false; }; }, [team.id]);
  const reload = () => getFoundations(team.id).then(setFounds);

  return (
    <div>
      {FOUNDATION_ORDER.map((kind) => (
        <KindBlock key={kind} team={team} kind={kind} list={founds.filter((f) => f.kind === kind)} canEdit={canEdit} onChanged={reload} />
      ))}
    </div>
  );
}
