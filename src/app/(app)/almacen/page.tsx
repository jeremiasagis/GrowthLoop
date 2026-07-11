"use client";

/* ============================================================
   Almacén de retros (superadmin) — TODAS las retros del catálogo,
   activas y archivadas. Nada se pierde (viven en código); acá el
   superadmin elige cuáles se ofrecen en el producto y puede
   reactivar las archivadas cuando quiera.
   ============================================================ */

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/lib/auth/AuthContext";
import { RETRO_REGISTRY } from "@/lib/retros/registry";
import { STAGES } from "@/lib/data";
import { getRetroStatus, setRetroActive, isRetroActive } from "@/lib/retro-status";

export default function AlmacenPage() {
  const { user } = useAuth();
  const { show } = useToast();
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => { getRetroStatus().then(setStatus); }, []);

  const stages = useMemo(() => [...new Set(RETRO_REGISTRY.map((r) => r.stage))], []);
  const activeCount = RETRO_REGISTRY.filter((r) => isRetroActive(status, r.id)).length;

  if (user?.role !== "superadmin") {
    return <div className="screen-pad"><Card pad={24}><p className="muted">Solo el superadmin puede ver el almacén de retros.</p></Card></div>;
  }

  const toggle = async (id: string, active: boolean) => {
    setBusy(id);
    const { error } = await setRetroActive(id, active);
    setBusy(null);
    if (error) { show("No se pudo guardar.", "TriangleAlert"); return; }
    setStatus((s) => ({ ...s, [id]: active }));
  };

  const ql = q.toLowerCase().trim();
  const match = (r: (typeof RETRO_REGISTRY)[number]) => !ql || r.name.toLowerCase().includes(ql) || r.id.toLowerCase().includes(ql) || (r.description ?? "").toLowerCase().includes(ql);

  return (
    <div className="screen-pad" style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Almacén de retros</h1>
        <p className="muted" style={{ marginTop: 4 }}>Todo el catálogo. Archivá lo que no quieras ofrecer en el producto — nada se pierde, lo reactivás cuando quieras. <b className="num" style={{ color: "var(--green)" }}>{activeCount}</b> activas de {RETRO_REGISTRY.length}.</p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, id o descripción…" style={{ width: "100%", background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none" }} />
      </div>

      {stages.map((st) => {
        const rows = RETRO_REGISTRY.filter((r) => r.stage === st && match(r));
        if (!rows.length) return null;
        const meta = STAGES[st as keyof typeof STAGES];
        return (
          <div key={st} style={{ marginBottom: 22 }}>
            <div className="eyebrow" style={{ marginBottom: 10, color: meta?.color ?? "var(--ink-2)" }}>{meta?.label ?? st}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((r) => {
                const active = isRetroActive(status, r.id);
                return (
                  <Card key={r.id} pad={14} style={{ display: "flex", alignItems: "center", gap: 12, opacity: active ? 1 : 0.62 }}>
                    <span title={r.category === "growthloop" ? "Propia de Growthloop" : "Clásica"} style={{ width: 30, height: 30, borderRadius: "var(--r-md)", display: "grid", placeItems: "center", flex: "none", background: r.category === "growthloop" ? "var(--green-soft)" : "var(--card-2)", color: r.category === "growthloop" ? "var(--green)" : "var(--ink-2)" }}><Icon name={r.category === "growthloop" ? "Sparkles" : "BookOpen"} size={15} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{r.name}</span>
                        {!r.implemented && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-3)" }}>PRÓXIMAMENTE</span>}
                      </div>
                      <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>
                    </div>
                    <button disabled={busy === r.id} onClick={() => toggle(r.id, !active)}
                      style={{ flex: "none", padding: "6px 12px", borderRadius: "var(--r-full)", fontSize: "var(--t-xs)", fontWeight: 700, border: `1px solid ${active ? "var(--green)" : "var(--line-2)"}`, background: active ? "var(--green-soft)" : "var(--card)", color: active ? "var(--green)" : "var(--ink-2)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Icon name={active ? "Check" : "Archive"} size={13} /> {active ? "Activa" : "Archivada"}
                    </button>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
