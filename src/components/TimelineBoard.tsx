"use client";

/* Timeline: hitos sobre una línea horizontal, eventos con su emoción debajo. */

export const TL_EMO = {
  pos: { emoji: "😊", label: "Positivo", color: "var(--success)" },
  neu: { emoji: "😐", label: "Neutral", color: "#94A3B8" },
  neg: { emoji: "😔", label: "Negativo", color: "var(--warning)" },
} as const;
export type TlEmo = keyof typeof TL_EMO;

export interface TlEvent { mIdx: number; emo: TlEmo; text: string; author?: string }

export function TimelineBoard({ milestones, events }: { milestones: string[]; events: TlEvent[] }) {
  return (
    <div style={{ overflowX: "auto", paddingBottom: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(milestones.length, 1)}, minmax(170px, 1fr))`, gap: 12, minWidth: milestones.length * 180 }}>
        {milestones.map((m, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "var(--t-sm)", padding: "6px 10px", background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", display: "inline-block", maxWidth: "100%" }}>{m}</div>
          </div>
        ))}
        {/* la línea del tiempo */}
        <div style={{ gridColumn: "1 / -1", position: "relative", height: 14, margin: "2px 0 6px" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 6, height: 2, background: "var(--line-2)" }} />
          {milestones.map((_, i) => (
            <span key={i} style={{ position: "absolute", left: `${((i + 0.5) / milestones.length) * 100}%`, top: 2, width: 10, height: 10, borderRadius: 99, background: "var(--bg-1)", border: "2px solid var(--green)", transform: "translateX(-50%)" }} />
          ))}
        </div>
        {milestones.map((_, i) => {
          const evs = events.filter((e) => e.mIdx === i);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {evs.map((e, k) => (
                <div key={k} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${TL_EMO[e.emo].color}`, borderRadius: "var(--r-md)", padding: "8px 10px", fontSize: "var(--t-xs)", lineHeight: 1.4, textAlign: "left", animation: `pop-in .35s var(--spring) ${k * 0.04}s both` }}>
                  <span style={{ marginRight: 5 }}>{TL_EMO[e.emo].emoji}</span>{e.text}
                  {e.author && <div className="muted" style={{ fontSize: 10, marginTop: 3 }}>· {e.author}</div>}
                </div>
              ))}
              {!evs.length && <div className="faint" style={{ fontSize: "var(--t-xs)", textAlign: "center", padding: 8 }}>—</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
