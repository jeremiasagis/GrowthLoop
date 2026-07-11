"use client";

/* ============================================================
   Command palette (⌘K / Ctrl+K) — buscador universal para
   facilitador/admin/superadmin: saltar a un equipo, un loop, una
   persona, o disparar una acción rápida. Navegación por teclado.
   Todo cliente-side sobre el store ya acotado por RLS.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./icon";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTeams } from "@/lib/repository";
import { STAGES } from "@/lib/data";

interface Cmd { id: string; group: string; label: string; sub?: string; icon: string; href: string; keywords?: string }

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function CommandPalette() {
  const router = useRouter();
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Miembro/coordinador usan otro chrome; el palette es del área principal.
  const enabled = role === "facilitator" || role === "admin" || role === "superadmin";

  // Abrir/cerrar con ⌘K / Ctrl+K.
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("gl-open-cmdk", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("gl-open-cmdk", onOpen); };
  }, [enabled]);

  useEffect(() => { if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);

  // Índice de comandos (se arma al abrir).
  const commands = useMemo<Cmd[]>(() => {
    if (!open) return [];
    const out: Cmd[] = [];
    // Acciones rápidas.
    out.push({ id: "go-inicio", group: "Ir a", label: "Inicio", icon: "House", href: "/dashboard" });
    if (role === "facilitator") {
      out.push({ id: "go-loops", group: "Ir a", label: "Mis loops", icon: "RefreshCw", href: "/mis-loops" });
      out.push({ id: "act-newteam", group: "Acciones", label: "Crear equipo", icon: "Plus", href: "/equipos/nuevo" });
    }
    if (role === "admin" || role === "superadmin") out.push({ id: "go-org", group: "Ir a", label: "Organización · cultura y desarrollo", icon: "Network", href: "/organizacion" });
    if (role === "superadmin") { out.push({ id: "go-consola", group: "Ir a", label: "Consola", icon: "LayoutDashboard", href: "/consola" }); out.push({ id: "go-almacen", group: "Ir a", label: "Almacén de retros", icon: "Archive", href: "/almacen" }); }
    out.push({ id: "go-orgs", group: "Ir a", label: role === "facilitator" ? "Mis equipos" : "Organizaciones", icon: "Building2", href: "/organizaciones" });
    out.push({ id: "go-reportes", group: "Ir a", label: "Reportes", icon: "FileBarChart", href: "/reportes" });
    out.push({ id: "go-norte", group: "Ir a", label: "Norte", icon: "Compass", href: "/norte" });
    out.push({ id: "go-ajustes", group: "Ir a", label: "Ajustes", icon: "Settings", href: "/ajustes" });

    // Equipos, loops y personas del alcance.
    const teams = getTeams();
    for (const t of teams) {
      out.push({ id: `team-${t.id}`, group: "Equipos", label: t.name, sub: t.org, icon: "Users", href: `/equipos/${t.id}`, keywords: `${t.area ?? ""} ${t.org ?? ""}` });
      for (const i of t.initiatives ?? []) {
        const st = STAGES[i.stage]?.label ?? "";
        out.push({ id: `loop-${i.id}`, group: "Loops", label: i.title, sub: `${t.name} · ${st}`, icon: "RefreshCw", href: `/equipos/${t.id}/iniciativa/${i.id}`, keywords: t.name });
      }
      for (const p of t.members ?? []) {
        if (!p.name) continue;
        out.push({ id: `person-${t.id}-${p.name}`, group: "Personas", label: p.name, sub: `${t.name} · desarrollo`, icon: "User", href: `/equipos/${t.id}/personas`, keywords: t.name });
      }
    }
    return out;
  }, [open, role]);

  // Filtro.
  const results = useMemo(() => {
    const nq = norm(q.trim());
    const list = !nq ? commands : commands.filter((c) => norm(`${c.label} ${c.sub ?? ""} ${c.keywords ?? ""}`).includes(nq));
    return list.slice(0, 40);
  }, [q, commands]);

  useEffect(() => { setActive(0); }, [q]);

  const run = (c?: Cmd) => { if (!c) return; setOpen(false); router.push(c.href); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); run(results[active]); }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!enabled || !open) return null;

  // Agrupar respetando el orden y el índice global (para el teclado).
  let idx = -1;
  const groups: { name: string; items: { c: Cmd; i: number }[] }[] = [];
  for (const c of results) {
    idx++;
    const g = groups.find((x) => x.name === c.group);
    const entry = { c, i: idx };
    if (g) g.items.push(entry); else groups.push({ name: c.group, items: [entry] });
  }

  return (
    <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(7,11,22,0.6)", backdropFilter: "blur(6px)", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: "12vh", padding: "12vh 20px 20px" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(620px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", boxShadow: "var(--sh-lg)", overflow: "hidden", animation: "pop-in .18s var(--spring)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
          <Icon name="Search" size={18} style={{ color: "var(--ink-2)", flexShrink: 0 }} />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Buscar equipo, loop, persona o acción…"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--ink-0)", fontSize: "var(--t-md)" }} />
          <kbd style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-3)", border: "1px solid var(--line-2)", borderRadius: 5, padding: "2px 6px" }}>ESC</kbd>
        </div>
        <div ref={listRef} style={{ maxHeight: "56vh", overflowY: "auto", padding: 8 }}>
          {results.length === 0 ? (
            <div className="muted" style={{ padding: "28px 16px", textAlign: "center", fontSize: "var(--t-sm)" }}>Sin resultados para “{q}”.</div>
          ) : groups.map((g) => (
            <div key={g.name} style={{ marginBottom: 6 }}>
              <div className="eyebrow" style={{ padding: "6px 10px 4px", color: "var(--ink-3)" }}>{g.name}</div>
              {g.items.map(({ c, i }) => {
                const on = i === active;
                return (
                  <button key={c.id} data-idx={i} onMouseEnter={() => setActive(i)} onClick={() => run(c)}
                    style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 10px", borderRadius: "var(--r-md)", textAlign: "left", background: on ? "var(--card)" : "transparent", border: `1px solid ${on ? "color-mix(in srgb, var(--green) 35%, var(--line))" : "transparent"}` }}>
                    <span style={{ width: 30, height: 30, borderRadius: "var(--r-sm)", background: "var(--card-2)", color: on ? "var(--green)" : "var(--ink-2)", display: "grid", placeItems: "center", flex: "none" }}><Icon name={c.icon} size={15} /></span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "var(--t-sm)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.label}</div>
                      {c.sub && <div className="muted" style={{ fontSize: "var(--t-xs)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.sub}</div>}
                    </div>
                    {on && <Icon name="CornerDownLeft" size={14} style={{ color: "var(--ink-3)", flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 14px", borderTop: "1px solid var(--line)", fontSize: 11, color: "var(--ink-3)" }}>
          <span><kbd style={{ fontWeight: 700 }}>↑↓</kbd> navegar</span>
          <span><kbd style={{ fontWeight: 700 }}>↵</kbd> abrir</span>
          <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="Command" size={11} /> K para abrir</span>
        </div>
      </div>
    </div>
  );
}
