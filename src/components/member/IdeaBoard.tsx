"use client";

/* ============================================================
   Banco de ideas social — el miembro ve las ideas que planteó
   todo el equipo y suma "+1" a las que comparte. Innovar juntos.
   Los problemas/preguntas siguen privados (van al facilitador).
   ============================================================ */

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { getTeamIdeas, voteTeamInput, unvoteTeamInput, type TeamIdea } from "@/lib/voice";

const STATUS_META: Record<string, { l: string; c: string }> = {
  converted: { l: "Se volvió un loop", c: "var(--success)" },
  seen: { l: "El facilitador la vio", c: "var(--info)" },
};

export function IdeaBoard({ teamId, refreshKey = 0 }: { teamId: string; refreshKey?: number }) {
  const { show } = useToast();
  const [ideas, setIdeas] = useState<TeamIdea[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = () => getTeamIdeas(teamId).then(setIdeas);
  useEffect(() => { let on = true; getTeamIdeas(teamId).then((r) => { if (on) setIdeas(r); }); return () => { on = false; }; }, [teamId, refreshKey]);

  const toggle = async (it: TeamIdea) => {
    if (busy) return;
    setBusy(it.id);
    // Optimista.
    setIdeas((prev) => prev.map((x) => x.id === it.id ? { ...x, votedByMe: !x.votedByMe, votes: x.votes + (x.votedByMe ? -1 : 1) } : x));
    const { error } = it.votedByMe ? await unvoteTeamInput(it.id) : await voteTeamInput(it.id, teamId);
    setBusy(null);
    if (error) { show("No se pudo registrar el voto.", "TriangleAlert"); reload(); return; }
  };

  if (!ideas.length) {
    return (
      <Card pad={16}>
        <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Todavía no hay ideas del equipo. Planteá la primera arriba y va a aparecer acá para que los demás la apoyen.</p>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {ideas.map((it) => {
        const st = STATUS_META[it.status];
        return (
          <Card key={it.id} pad={12} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <button onClick={() => toggle(it)} disabled={busy === it.id} title={it.votedByMe ? "Quitar mi apoyo" : "Yo también lo veo"}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, minWidth: 44, padding: "5px 0", borderRadius: "var(--r-md)", border: `1px solid ${it.votedByMe ? "var(--green)" : "var(--line-2)"}`, background: it.votedByMe ? "var(--green-soft)" : "var(--card)", color: it.votedByMe ? "var(--green)" : "var(--ink-2)", cursor: "pointer", flex: "none" }}>
              <Icon name="ChevronUp" size={16} />
              <span className="num" style={{ fontSize: "var(--t-sm)", fontWeight: 800, lineHeight: 1 }}>{it.votes}</span>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.45 }}>{it.text}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                {it.mine && <span style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--green)" }}>Tu idea</span>}
                {st && <span style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: st.c }}>· {st.l}</span>}
              </div>
            </div>
            <Icon name="Lightbulb" size={15} style={{ color: "var(--st-proof)", flexShrink: 0, marginTop: 2 }} />
          </Card>
        );
      })}
    </div>
  );
}
