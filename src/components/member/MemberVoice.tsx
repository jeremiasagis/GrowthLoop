"use client";

/* ============================================================
   La voz del miembro — plantear algo al equipo sin esperar una
   sesión (problema / idea / pregunta) y ver el estado de lo que
   ya planteó. El facilitador lo recibe en su tablero de equipo.
   ============================================================ */

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import {
  createTeamInput, getMyTeamInputs, deleteTeamInput, VOICE_KINDS, voiceKind,
  type VoiceKind, type TeamInput,
} from "@/lib/voice";

const MY_STATUS: Record<string, { l: string; c: string }> = {
  new: { l: "Enviado", c: "var(--ink-2)" },
  seen: { l: "El facilitador lo vio", c: "var(--info)" },
  converted: { l: "Se volvió un loop", c: "var(--success)" },
  archived: { l: "Archivado", c: "var(--ink-3)" },
};

export function MemberVoice({ teamId, onSubmitted }: { teamId: string; onSubmitted?: (kind: VoiceKind) => void }) {
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<VoiceKind>("idea");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<TeamInput[]>([]);

  useEffect(() => { let on = true; getMyTeamInputs(teamId).then((r) => { if (on) setList(r); }); return () => { on = false; }; }, [teamId]);
  const reload = () => getMyTeamInputs(teamId).then(setList);

  const submit = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    const { error } = await createTeamInput(teamId, kind, t);
    setBusy(false);
    if (error) { show("No se pudo enviar.", "TriangleAlert"); return; }
    const k = kind;
    setText(""); setOpen(false);
    show(k === "idea" ? "Tu idea ya está en el banco del equipo" : "Lo planteaste al equipo", "Check");
    reload(); onSubmitted?.(k);
  };
  const retract = async (id: string) => {
    const { error } = await deleteTeamInput(id);
    if (error) { show("No se pudo quitar.", "TriangleAlert"); return; }
    reload();
  };

  const km = voiceKind(kind);

  return (
    <div>
      <button onClick={() => setOpen(true)} style={{ width: "100%", textAlign: "left" }}>
        <Card pad={16} hover style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: "linear-gradient(180deg, color-mix(in srgb, var(--green) 6%, var(--card)), var(--card))", borderColor: "color-mix(in srgb, var(--green) 28%, var(--line))" }}>
          <div style={{ width: 38, height: 38, borderRadius: "var(--r-md)", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Megaphone" size={19} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>Plantear algo al equipo</div>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>Un problema, una idea o una pregunta — sin esperar la próxima sesión</div>
          </div>
          <Icon name="Plus" size={18} style={{ color: "var(--green)" }} />
        </Card>
      </button>

      {list.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {list.map((it) => {
            const k = voiceKind(it.kind);
            const stt = MY_STATUS[it.status] ?? MY_STATUS.new;
            return (
              <Card key={it.id} pad={12} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Icon name={k.icon} size={15} style={{ color: k.color, flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "var(--t-sm)", lineHeight: 1.45 }}>{it.text}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
                    <span style={{ fontSize: "var(--t-xs)", fontWeight: 700, color: stt.c }}>{stt.l}</span>
                    {it.status === "new" && <button onClick={() => retract(it.id)} className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600 }}>· quitar</button>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {open && (
        <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(7,11,22,0.7)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(520px,100%)", maxHeight: "88vh", overflowY: "auto", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 24, animation: "pop-in .25s var(--spring)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 38, height: 38, borderRadius: "var(--r-md)", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", flex: "none" }}><Icon name="Megaphone" size={19} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "var(--t-md)" }}>Plantear algo al equipo</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{kind === "idea" ? "Tu idea va al banco del equipo — todos la ven y pueden apoyarla." : "Le llega en privado a tu facilitador para sumarlo a la mejora."}</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "var(--ink-2)" }}><Icon name="X" size={20} /></button>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {VOICE_KINDS.map((v) => {
                const on = kind === v.key;
                return (
                  <button key={v.key} onClick={() => setKind(v.key)} style={{ flex: 1, padding: "9px 6px", borderRadius: "var(--r-md)", fontSize: "var(--t-xs)", fontWeight: 700, border: `1px solid ${on ? v.color : "var(--line-2)"}`, background: on ? `color-mix(in srgb, ${v.color} 12%, var(--card))` : "var(--card)", color: on ? v.color : "var(--ink-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    <Icon name={v.icon} size={14} /> {v.label}
                  </button>
                );
              })}
            </div>

            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={km.placeholder} autoFocus
              style={{ width: "100%", minHeight: 100, background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: 12, fontSize: "var(--t-sm)", resize: "vertical", outline: "none" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button icon={busy ? "Loader" : "Send"} disabled={!text.trim() || busy} onClick={submit}>{busy ? "Enviando…" : "Plantearlo"}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
