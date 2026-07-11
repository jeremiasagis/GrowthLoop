"use client";

/* ============================================================
   Banner de sesiones abiertas. El único dato realmente valioso del
   viejo "Sesiones": que hay una sesión (en vivo o async) abierta
   ahora en alguno de mis equipos. Se muestra donde tiene contexto
   (Inicio, Mis loops), con acceso directo a la sala.
   ============================================================ */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, Pill } from "@/components/ui";
import { getTeams } from "@/lib/repository";
import { getOpenSessionForTeam, type LiveSession } from "@/lib/session";
import { retroById } from "@/lib/retros/registry";
import type { Team } from "@/lib/data";

export function OpenSessionsBanner() {
  const router = useRouter();
  const teams = getTeams();
  const ids = teams.map((t) => t.id).join(",");
  const [rows, setRows] = useState<{ s: LiveSession; team: Team }[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const res = await Promise.all(teams.map(async (t) => {
        const s = await getOpenSessionForTeam(t.id);
        return s ? { s, team: t } : null;
      }));
      if (active) setRows(res.filter(Boolean) as { s: LiveSession; team: Team }[]);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  if (!rows.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
      {rows.map(({ s, team }) => {
        const isAsync = (s.result as { async?: boolean } | undefined)?.async;
        const c = isAsync ? "var(--info)" : "var(--green)";
        const name = retroById(s.retro)?.name ?? s.type;
        return (
          <Card key={s.id} pad={16} glow={!isAsync} className={isAsync ? "" : "gl-live-border"} style={{ border: `1px solid color-mix(in srgb, ${c} 45%, var(--line))`, background: `color-mix(in srgb, ${c} 7%, var(--card))` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ width: 32, height: 32, borderRadius: "var(--r-md)", background: `color-mix(in srgb, ${c} 16%, transparent)`, color: c, display: "grid", placeItems: "center", flex: "none" }}><Icon name={isAsync ? "Clock" : "Radio"} size={16} /></span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{name} {isAsync ? <Pill color="var(--info)" bg="color-mix(in srgb, var(--info) 14%, transparent)">async</Pill> : <Pill color="var(--green)" bg="var(--success-bg)">en vivo</Pill>}</div>
                <div className="muted" style={{ fontSize: "var(--t-xs)" }}><Icon name="Users" size={11} /> {team.name}</div>
              </div>
              <Button size="sm" iconRight="ArrowRight" onClick={() => router.push(`/sala/${s.id}`)}>Ir a la sala</Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
