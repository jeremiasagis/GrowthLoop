"use client";

/* ============================================================
   Muro de reconocimiento del equipo — el miembro ve los kudos
   que recibió y el muro del equipo, y puede reconocer a un
   compañero. Celebratorio, sin ranking. Reusa KudosCard.
   ============================================================ */

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Button, Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { KudosCard, KUDO_EMOJIS } from "@/components/KudosCard";
import { getTeamKudos, giveKudo, deleteKudo, type Kudo } from "@/lib/kudos";
import type { Person } from "@/lib/data";

type Who = { name: string; initials?: string };

export function KudosWall({ teamId, members, facilitator, currentUserId }: {
  teamId: string;
  members: Person[];
  facilitator?: Person;
  currentUserId?: string;
}) {
  const { show } = useToast();
  const [list, setList] = useState<Kudo[]>([]);
  const [open, setOpen] = useState(false);
  const [toId, setToId] = useState("");
  const [emoji, setEmoji] = useState(KUDO_EMOJIS[0]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { let on = true; getTeamKudos(teamId).then((r) => { if (on) setList(r); }); return () => { on = false; }; }, [teamId]);
  const reload = () => getTeamKudos(teamId).then(setList);

  // Roster: user_id → nombre (miembros + facilitador).
  const roster = useMemo(() => {
    const m = new Map<string, Who>();
    for (const p of members) if (p.userId) m.set(p.userId, { name: p.name, initials: p.initials });
    if (facilitator?.userId) m.set(facilitator.userId, { name: facilitator.name, initials: facilitator.initials });
    return m;
  }, [members, facilitator]);
  const who = (id: string): Who => roster.get(id) ?? { name: "Alguien del equipo" };

  // A quién puedo reconocer: compañeros con cuenta, menos yo.
  const candidates = useMemo(() => {
    const arr: { userId: string; name: string; initials?: string }[] = [];
    const seen = new Set<string>();
    const push = (p?: Person) => { if (p?.userId && p.userId !== currentUserId && !seen.has(p.userId)) { seen.add(p.userId); arr.push({ userId: p.userId, name: p.name, initials: p.initials }); } };
    members.forEach(push); push(facilitator);
    return arr;
  }, [members, facilitator, currentUserId]);

  const received = currentUserId ? list.filter((k) => k.toUserId === currentUserId) : [];

  const submit = async () => {
    if (!toId || !text.trim() || busy) return;
    setBusy(true);
    const { error } = await giveKudo({ teamId, toUserId: toId, text, emoji });
    setBusy(false);
    if (error) { show(error, "TriangleAlert"); return; }
    setText(""); setToId(""); setOpen(false); show("Reconocimiento enviado 🎉", "Check"); reload();
  };
  const retract = async (id: string) => {
    const { error } = await deleteKudo(id);
    if (error) { show(error, "TriangleAlert"); return; }
    reload();
  };

  return (
    <div>
      {/* Recibidos + dar */}
      <Card pad={16} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: list.length ? 10 : 0, background: "linear-gradient(180deg, color-mix(in srgb, var(--warning) 7%, var(--card)), var(--card))", borderColor: "color-mix(in srgb, var(--warning) 28%, var(--line))" }}>
        <div style={{ width: 38, height: 38, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--warning) 16%, transparent)", color: "var(--warning)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Award" size={19} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{received.length ? `Recibiste ${received.length} ${received.length === 1 ? "reconocimiento" : "reconocimientos"} 👏` : "Reconocé a un compañero"}</div>
          <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{received.length ? "Cosas que tu equipo valora de vos" : "Un gracias concreto sube la confianza del equipo"}</div>
        </div>
        <Button size="sm" icon="Plus" disabled={!candidates.length} onClick={() => setOpen(true)}>Dar kudos</Button>
      </Card>

      {list.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.slice(0, 8).map((k, i) => {
            const mine = k.fromUserId === currentUserId;
            return (
              <div key={k.id} style={{ position: "relative" }}>
                <KudosCard idx={i} from={who(k.fromUserId)} to={who(k.toUserId)} text={k.text} emoji={k.emoji} />
                {mine && <button onClick={() => retract(k.id)} title="Quitar" style={{ position: "absolute", top: 8, right: 10, color: "var(--ink-3)", fontSize: "var(--t-xs)" }}><Icon name="X" size={14} /></button>}
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px,100%)", maxHeight: "88vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 24, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 38, height: 38, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--warning) 16%, transparent)", color: "var(--warning)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Award" size={19} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Reconocer a un compañero</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Queda en el muro del equipo.</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "var(--ink-2)" }}><Icon name="X" size={20} /></button>
            </div>

            <div className="eyebrow" style={{ marginBottom: 8 }}>¿A quién?</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {candidates.map((c) => {
                const on = toId === c.userId;
                return (
                  <button key={c.userId} onClick={() => setToId(c.userId)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px 6px 6px", borderRadius: "var(--r-full)", border: `1px solid ${on ? "var(--warning)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--warning) 12%, var(--card))" : "var(--card)", cursor: "pointer" }}>
                    <Avatar name={c.name} initials={c.initials} size={22} />
                    <span style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: on ? "var(--warning)" : "var(--ink-1)" }}>{c.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="eyebrow" style={{ marginBottom: 8 }}>Un emoji</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {KUDO_EMOJIS.map((e) => (
                <button key={e} onClick={() => setEmoji(e)} style={{ width: 40, height: 40, borderRadius: "var(--r-md)", fontSize: 20, border: `1px solid ${emoji === e ? "var(--warning)" : "var(--line-2)"}`, background: emoji === e ? "color-mix(in srgb, var(--warning) 12%, var(--card))" : "var(--card)", cursor: "pointer" }}>{e}</button>
              ))}
            </div>

            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="¿Qué querés agradecerle o destacar? Sé concreto." autoFocus
              style={{ width: "100%", minHeight: 90, background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: 12, fontSize: "var(--t-sm)", resize: "vertical", outline: "none" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button icon={busy ? "Loader" : "Send"} disabled={!toId || !text.trim() || busy} onClick={submit}>{busy ? "Enviando…" : "Reconocer"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
