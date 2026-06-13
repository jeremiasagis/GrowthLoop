"use client";

/* Card de reconocimiento: quién lo da → quién lo recibe, texto y emoji. */

import { Avatar } from "@/components/ui";
import { Icon } from "@/components/icon";

export const KUDO_EMOJIS = ["👏", "🙏", "💪", "⭐", "🔥"];

export function KudosCard({
  from, to, text, emoji, idx = 0, big = false,
}: {
  from: { name: string; initials?: string };
  to: { name: string; initials?: string };
  text: string;
  emoji?: string;
  idx?: number;
  big?: boolean;
}) {
  return (
    <div style={{
      background: "var(--card)", border: "1px solid color-mix(in srgb, var(--warning) 30%, var(--line))",
      borderRadius: "var(--r-lg)", padding: big ? 22 : 15,
      animation: `pop-in .4s var(--spring) ${idx * 0.05}s both`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: big ? 14 : 10 }}>
        <Avatar name={from.name} initials={from.initials} size={big ? 38 : 30} idx={idx} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-3)" }}>
          <Icon name="ArrowRight" size={big ? 18 : 15} />
          {emoji && <span style={{ fontSize: big ? 26 : 20 }}>{emoji}</span>}
          <Icon name="ArrowRight" size={big ? 18 : 15} />
        </div>
        <Avatar name={to.name} initials={to.initials} size={big ? 38 : 30} idx={idx + 3} />
        <div style={{ marginLeft: 4, minWidth: 0 }}>
          <div style={{ fontSize: big ? "var(--t-sm)" : "var(--t-xs)", lineHeight: 1.2 }}>
            <b>{from.name}</b> <span className="muted">→</span> <b>{to.name}</b>
          </div>
        </div>
      </div>
      <p style={{ fontSize: big ? "var(--t-md)" : "var(--t-sm)", lineHeight: 1.5, color: "var(--ink-0)" }}>{text}</p>
    </div>
  );
}
