"use client";

/* ============================================================
   La voz del equipo (lado facilitador). Lo que los miembros
   plantean de forma asincrónica (problema / idea / pregunta):
   el facilitador lo ve, lo marca visto, lo usa como semilla de
   una exploración/loop, o lo archiva.
   ============================================================ */

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getTeamInputs, setTeamInputStatus, deleteTeamInput, voiceKind, type TeamInput } from "@/lib/voice";
import type { Team } from "@/lib/data";

function fmtDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : d.toLocaleDateString("es", { day: "2-digit", month: "short" });
}

const STATUS: Record<string, { l: string; c: string }> = {
  new: { l: "Nuevo", c: "var(--green)" },
  seen: { l: "Visto", c: "var(--info)" },
  converted: { l: "Convertido en loop", c: "var(--success)" },
  archived: { l: "Archivado", c: "var(--ink-3)" },
};

export function TeamVoicePanel({ team }: { team: Team }) {
  const { show } = useToast();
  const [list, setList] = useState<TeamInput[]>([]);
  const [showArch, setShowArch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { let on = true; getTeamInputs(team.id).then((r) => { if (on) { setList(r); setLoading(false); } }); return () => { on = false; }; }, [team.id]);
  const reload = () => getTeamInputs(team.id).then(setList);

  const nameOf = (uid: string) => team.members.find((m) => m.userId === uid)?.name ?? "Alguien del equipo";
  const set = async (id: string, status: string) => { const { error } = await setTeamInputStatus(id, status); if (error) { show("No se pudo guardar.", "TriangleAlert"); return; } reload(); };
  const del = async (id: string) => { const { error } = await deleteTeamInput(id); if (error) { show("No se pudo quitar.", "TriangleAlert"); return; } reload(); };

  if (loading) return null;

  const visible = list.filter((it) => showArch || it.status !== "archived");
  const pending = list.filter((it) => it.status === "new").length;
  const archived = list.filter((it) => it.status === "archived").length;

  return (
    <Card pad={18} style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: visible.length ? 12 : 0 }}>
        <Icon name="Megaphone" size={15} style={{ color: "var(--green)" }} />
        <span style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>La voz del equipo</span>
        {pending > 0 && <span className="num" style={{ background: "var(--green)", color: "#06140d", borderRadius: 99, padding: "1px 8px", fontSize: "var(--t-xs)", fontWeight: 700 }}>{pending} nuevo{pending === 1 ? "" : "s"}</span>}
        {archived > 0 && <button onClick={() => setShowArch((v) => !v)} className="muted" style={{ marginLeft: "auto", fontSize: "var(--t-xs)", fontWeight: 600 }}>{showArch ? "Ocultar archivados" : `Ver archivados (${archived})`}</button>}
      </div>

      {list.length === 0 ? (
        <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Cuando un integrante plantee un problema, una idea o una pregunta, lo vas a ver acá para sumarlo a la mejora.</p>
      ) : visible.length === 0 ? (
        <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Nada pendiente. 🎉</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {visible.map((it) => {
            const k = voiceKind(it.kind);
            const stt = STATUS[it.status] ?? STATUS.new;
            const archived = it.status === "archived";
            return (
              <div key={it.id} style={{ display: "flex", gap: 10, padding: "11px 12px", background: "var(--card-2)", border: "1px solid var(--line)", borderLeft: `3px solid ${k.color}`, borderRadius: "var(--r-md)", opacity: archived ? 0.6 : 1 }}>
                <Icon name={k.icon} size={16} style={{ color: k.color, flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                    <span style={{ fontSize: "var(--t-xs)", fontWeight: 700 }}>{nameOf(it.authorUserId)}</span>
                    <span className="muted num" style={{ fontSize: "var(--t-xs)" }}>{fmtDate(it.createdAt)}</span>
                    <span style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: stt.c }}>· {stt.l}</span>
                  </div>
                  <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.45 }}>{it.text}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
                    {it.status === "new" && <button onClick={() => set(it.id, "seen")} style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--info)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Eye" size={13} /> Marcar visto</button>}
                    {it.status !== "converted" && <button onClick={() => set(it.id, "converted")} style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--success)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="RefreshCw" size={13} /> Se volvió un loop</button>}
                    {!archived ? (
                      <button onClick={() => set(it.id, "archived")} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Archive" size={13} /> Archivar</button>
                    ) : (
                      <button onClick={() => del(it.id)} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Trash2" size={13} /> Borrar</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
