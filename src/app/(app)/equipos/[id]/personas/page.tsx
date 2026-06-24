"use client";

/* ============================================================
   Personas — la capa individual del equipo (PLAN-DESARROLLO Parte A).
   Lista de integrantes (el 1-a-1 de cada uno) + el editor de
   competencias que mide el 360. Solo facilitador/admin.
   ============================================================ */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, EmptyState, SectionTitle } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getTeam, mergeTeamData } from "@/lib/repository";
import { teamCompetencies, DEFAULT_COMPETENCIES } from "@/lib/talent";
import type { Competency } from "@/lib/data";

export default function PersonasPage() {
  const router = useRouter();
  const { show } = useToast();
  const { id: teamId } = useParams<{ id: string }>();
  const team = getTeam(teamId);
  const [comps, setComps] = useState<Competency[]>(() => teamCompetencies(team).map((c) => ({ ...c })));
  const [baseline, setBaseline] = useState<Competency[]>(() => teamCompetencies(team).map((c) => ({ ...c })));
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(comps) !== JSON.stringify(baseline);

  if (!team) return <div className="screen-pad"><Card pad={24}><p className="muted">Equipo no encontrado.</p></Card></div>;

  const members = team.members ?? [];
  const save = async () => {
    setSaving(true);
    const res = await mergeTeamData(team.id, { competencies: comps });
    setSaving(false);
    if (res?.error) { show("No se pudo guardar.", "TriangleAlert"); return; }
    setBaseline(comps.map((c) => ({ ...c }))); show("Competencias guardadas.", "Check");
  };

  return (
    <div className="screen-pad" style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 6 }}>
        <button onClick={() => router.push(`/equipos/${team.id}`)} className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "var(--t-xs)", fontWeight: 600 }}><Icon name="ChevronLeft" size={13} /> {team.name}</button>
      </div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Personas</h1>
        <p className="muted" style={{ marginTop: 4 }}>Acompañá a cada integrante: su 360 de competencias y sus 1-a-1, conectados a las señales del equipo.</p>
      </div>

      {/* Editor de competencias */}
      <Card pad={16} style={{ marginBottom: 22 }}>
        <button onClick={() => setOpen((o) => !o)} style={{ display: "flex", width: "100%", alignItems: "center", gap: 8, textAlign: "left" }}>
          <Icon name="SlidersHorizontal" size={15} style={{ color: "var(--ink-2)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>Competencias que medimos</div>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Lo que el 360 evalúa en cada persona ({comps.length}).</div>
          </div>
          <Icon name={open ? "ChevronUp" : "ChevronDown"} size={16} style={{ color: "var(--ink-3)" }} />
        </button>
        {open && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {comps.map((c) => (
                <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input value={c.label} onChange={(e) => setComps(comps.map((x) => x.key === c.key ? { ...x, label: e.target.value } : x))} style={{ flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)", color: "var(--ink-0)", padding: "8px 10px", fontSize: "var(--t-sm)", outline: "none" }} />
                  <button disabled={comps.length <= 3} onClick={() => setComps(comps.filter((x) => x.key !== c.key))} title={comps.length <= 3 ? "Mínimo 3" : "Quitar"} style={{ color: comps.length <= 3 ? "var(--ink-3)" : "var(--risk)", padding: 4 }}><Icon name="Trash2" size={15} /></button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, alignItems: "center" }}>
              {comps.length < 10 && <Button size="sm" variant="secondary" icon="Plus" onClick={() => setComps([...comps, { key: `c${Date.now().toString(36)}`, label: `Competencia ${comps.length + 1}` }])}>Agregar</Button>}
              <button onClick={() => setComps(DEFAULT_COMPETENCIES.map((c) => ({ ...c })))} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600 }}>Restaurar las de fábrica</button>
              <span style={{ flex: 1 }} />
              {dirty && <Button size="sm" icon={saving ? "Loader" : "Check"} disabled={saving} onClick={save}>Guardar</Button>}
            </div>
          </div>
        )}
      </Card>

      {/* Integrantes */}
      <SectionTitle icon="Users" sub={`${members.length} integrantes`}>Integrantes</SectionTitle>
      {members.length === 0 ? (
        <Card pad={0}><EmptyState icon="Users" title="Todavía no hay integrantes">Invitá a tu equipo para empezar con los 1-a-1 y el 360.</EmptyState></Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 12, marginTop: 10 }}>
          {members.map((m) => {
            const joined = !!m.userId;
            return (
              <button key={m.id ?? m.name} disabled={!joined} onClick={() => joined && router.push(`/equipos/${team.id}/personas/${m.userId}`)}
                style={{ textAlign: "left", display: "flex", alignItems: "center", gap: 12, padding: "14px", background: "var(--card)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", cursor: joined ? "pointer" : "default", opacity: joined ? 1 : 0.6 }}>
                <span style={{ width: 38, height: 38, borderRadius: 99, background: "var(--card-2)", color: "var(--ink-1)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: "var(--t-sm)", flex: "none" }}>{m.initials}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{m.name}</div>
                  <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{joined ? "360 · 1-a-1" : "pendiente de unirse"}</div>
                </div>
                {joined && <Icon name="ChevronRight" size={16} style={{ color: "var(--ink-3)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
