"use client";

/* ============================================================
   Consola de plataforma (PLAN-PRODUCTO · §3·C) — SOLO superadmin.
   A) Operacional: panorama + usuarios + loops de toda la plataforma.
   B) Inteligencia agregada (el activo de datos): decisiones, etapas,
      sectores y tasa de señal movida — agregados, sin contenido
      privado (las reflexiones nunca se exponen · decisión §10 Q8).
   Todo se lee del store, que para el superadmin ya trae todo (RLS).
   ============================================================ */

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Card, EmptyState, Pill, SectionTitle } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthContext";
import { getAdmins, getFacilitators, getInitiatives, getOrg, getOrgs, getTeams } from "@/lib/repository";
import { loopThread } from "@/lib/loop";
import { STAGES, normalizeStage, type StageKey } from "@/lib/data";

const DEC: Record<string, { l: string; c: string }> = {
  implement: { l: "Implementar", c: "var(--success)" },
  iterate: { l: "Iterar", c: "var(--st-proof)" },
  pivot: { l: "Pivotar", c: "var(--warning)" },
  pause: { l: "Pausar", c: "var(--ink-2)" },
};

function Bars({ data, total, color }: { data: { label: string; n: number; c?: string }[]; total: number; color?: string }) {
  if (!total) return <p className="muted" style={{ fontSize: "var(--t-sm)", fontStyle: "italic" }}>Sin datos todavía.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.filter((d) => d.n > 0).map((d) => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 110, flex: "none", fontSize: "var(--t-xs)", fontWeight: 600 }}>{d.label}</span>
          <div style={{ flex: 1, height: 8, borderRadius: 99, background: "var(--line)", overflow: "hidden" }}>
            <div style={{ width: `${Math.round((d.n / total) * 100)}%`, height: "100%", background: d.c ?? color ?? "var(--green)" }} />
          </div>
          <span className="num muted" style={{ width: 28, textAlign: "right", fontSize: "var(--t-xs)" }}>{d.n}</span>
        </div>
      ))}
    </div>
  );
}

export default function ConsolaPage() {
  const router = useRouter();
  const { role } = useAuth();
  if (role !== "superadmin") {
    return <div className="screen-pad"><Card pad={0}><EmptyState icon="ShieldAlert" title="Solo para superadmin">Esta consola es de la plataforma.</EmptyState></Card></div>;
  }

  const orgs = getOrgs();
  const teams = getTeams();
  const facs = getFacilitators();
  const admins = getAdmins();
  const loops = teams.flatMap((t) => getInitiatives(t.id).map((i) => ({ i, team: t })));
  const active = loops.filter((x) => x.i.status === "active");
  const closed = loops.filter((x) => x.i.status === "done" || !!x.i.data?.learn?.decision);
  const moved = closed.filter((x) => { const s = loopThread(x.i).signal; return s?.delta != null && s.delta !== 0; });

  // Usuarios (metadata operacional; NUNCA contenido privado).
  const users: { name: string; role: string; color: string; org: string; team: string }[] = [];
  admins.forEach((a) => users.push({ name: a.name, role: "Admin", color: "var(--green)", org: a.orgName || "—", team: "—" }));
  facs.forEach((f) => users.push({ name: f.name, role: "Facilitador", color: "var(--info)", org: getOrg(f.orgId ?? "")?.name ?? "—", team: "—" }));
  teams.forEach((t) => (t.members ?? []).forEach((m) => users.push({ name: m.name, role: "Miembro", color: "var(--warning)", org: t.org, team: t.name })));

  // Inteligencia agregada.
  const decisions = { implement: 0, iterate: 0, pivot: 0, pause: 0 } as Record<string, number>;
  closed.forEach((x) => { const d = x.i.data?.learn?.decision; if (d && decisions[d] != null) decisions[d]++; });
  const decTotal = Object.values(decisions).reduce((a, b) => a + b, 0);
  const byStage = {} as Record<string, number>;
  active.forEach((x) => { const st = normalizeStage(x.i.stage); byStage[st] = (byStage[st] ?? 0) + 1; });
  const bySector = {} as Record<string, number>;
  loops.forEach((x) => { const sec = getOrg(x.team.orgId)?.sector || "Sin sector"; bySector[sec] = (bySector[sec] ?? 0) + 1; });

  const metrics = [
    { label: "Organizaciones", value: orgs.length, icon: "Building2", color: "var(--green)" },
    { label: "Equipos", value: teams.length, icon: "Users", color: "var(--info)" },
    { label: "Usuarios", value: users.length, icon: "UserRound", color: "var(--warning)" },
    { label: "Loops activos", value: active.length, icon: "RefreshCw", color: "var(--st-proof)" },
    { label: "Loops cerrados", value: closed.length, icon: "CircleCheck", color: "var(--st-learn)" },
    { label: "Señales movidas", value: moved.length, icon: "TrendingUp", color: "var(--success)" },
  ];

  return (
    <div className="screen-pad" style={{ maxWidth: 1000 }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Consola de plataforma</h1>
        <p className="muted" style={{ marginTop: 4 }}>El estado de toda la plataforma y la inteligencia agregada de los loops.</p>
      </div>

      {/* Panorama */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: 12, marginBottom: 24 }}>
        {metrics.map((m) => (
          <Card key={m.label} pad={16}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Icon name={m.icon} size={16} style={{ color: m.color }} />
              <span className="muted" style={{ fontSize: "var(--t-xs)", fontWeight: 600 }}>{m.label}</span>
            </div>
            <div className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800 }}>{m.value}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 16, marginBottom: 16 }}>
        <Card pad={20}>
          <SectionTitle icon="GitFork" sub={`${decTotal} loops cerrados`}>Decisiones de cierre</SectionTitle>
          <div style={{ marginTop: 10 }}>
            <Bars total={decTotal} data={["implement", "iterate", "pivot", "pause"].map((k) => ({ label: DEC[k].l, n: decisions[k], c: DEC[k].c }))} />
          </div>
        </Card>
        <Card pad={20}>
          <SectionTitle icon="Layers" sub={`${active.length} loops activos`}>Loops por etapa</SectionTitle>
          <div style={{ marginTop: 10 }}>
            <Bars total={active.length} data={(["focus", "ideation", "follow", "learn"] as StageKey[]).map((st) => ({ label: STAGES[st].label, n: byStage[st] ?? 0, c: STAGES[st].color }))} />
          </div>
        </Card>
        <Card pad={20}>
          <SectionTitle icon="Briefcase" sub="Loops por sector (anonimizado)">Por industria</SectionTitle>
          <div style={{ marginTop: 10 }}>
            <Bars total={loops.length} color="var(--violet)" data={Object.entries(bySector).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, n]) => ({ label, n }))} />
          </div>
        </Card>
        <Card pad={20}>
          <SectionTitle icon="TrendingUp" sub="De los loops cerrados, cuántos movieron su señal">Tasa de señal movida</SectionTitle>
          <div style={{ textAlign: "center", marginTop: 14 }}>
            <span className="num" style={{ fontSize: 40, fontWeight: 800, color: "var(--success)" }}>{closed.length ? Math.round((moved.length / closed.length) * 100) : 0}%</span>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{moved.length}/{closed.length} loops</div>
          </div>
        </Card>
      </div>

      {/* Usuarios */}
      <Card pad={20}>
        <SectionTitle icon="UsersRound" sub={`${users.length} en total`}>Usuarios de la plataforma</SectionTitle>
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line-2)" }}>
                {["Nombre", "Rol", "Organización", "Equipo"].map((h) => <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: "var(--t-xs)", fontWeight: 700, color: "var(--ink-3)" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {users.slice(0, 200).map((u, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td style={{ padding: "9px 10px", fontSize: "var(--t-sm)", fontWeight: 600 }}>{u.name}</td>
                  <td style={{ padding: "9px 10px" }}><Pill color={u.color} bg={`color-mix(in srgb, ${u.color} 14%, transparent)`}>{u.role}</Pill></td>
                  <td style={{ padding: "9px 10px", fontSize: "var(--t-sm)" }} className="muted">{u.org}</td>
                  <td style={{ padding: "9px 10px", fontSize: "var(--t-sm)" }} className="muted">{u.team}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length > 200 && <p className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 8 }}>Mostrando los primeros 200 de {users.length}.</p>}
        </div>
      </Card>

      <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 16, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="ShieldCheck" size={13} /> Esta consola muestra metadata operacional y agregados. El contenido privado (reflexiones, tarjetas anónimas) nunca se expone.
      </p>
    </div>
  );
}
