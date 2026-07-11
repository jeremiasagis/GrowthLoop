"use client";

/* ============================================================
   Card "Norte sugiere" — muestra las sugerencias proactivas del
   coach (reglas determinísticas, sin costo de IA) para el
   facilitador. PLAN-PRODUCTO · Pilar 3 (Norte coach).
   ============================================================ */

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card } from "@/components/ui";
import { norteSuggestions } from "@/lib/coach";
import type { Team } from "@/lib/data";

export function NorteSuggestions({ team, onGoTab }: { team: Team; onGoTab?: (tab: string) => void }) {
  const router = useRouter();
  const sugs = norteSuggestions(team);
  if (!sugs.length) return null;

  return (
    <Card pad={16} style={{ border: "1px solid color-mix(in srgb, var(--violet) 30%, var(--line))", background: "color-mix(in srgb, var(--violet) 5%, var(--card))" }}>
      <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: "var(--violet)" }}>
        <Icon name="Compass" size={13} /> Norte sugiere
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sugs.map((s) => (
          <div key={s.key} style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
            <Icon name={s.icon} size={16} style={{ color: s.color, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{s.title}</div>
              <div className="muted" style={{ fontSize: "var(--t-xs)", lineHeight: 1.45 }}>{s.text}</div>
            </div>
            {s.cta && (
              <Button size="sm" variant="secondary"
                onClick={() => { if (s.href) router.push(s.href); else if (s.initId) router.push(`/equipos/${team.id}/iniciativa/${s.initId}`); else if (s.tab) onGoTab?.(s.tab); }}>
                {s.cta}
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
