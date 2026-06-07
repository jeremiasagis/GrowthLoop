"use client";

/* ============================================================
   Componente reutilizable — TIMER de sesión
   ------------------------------------------------------------
   Presentacional: recibe el tiempo y los callbacks. La sincronización
   (compartir el reloj entre facilitador y miembros) la maneja la sesión.
   - Facilitador (control=true): puede pausar/reanudar, reiniciar, +1m.
   - Miembros (control=false): solo ven el reloj.
   - Pulsa en los últimos 30 segundos.
   ============================================================ */

import { Icon } from "@/components/icon";

const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export function SessionTimer({
  secs, total, running, control, onToggle, onReset, onAdd, compact,
}: {
  secs: number; total: number; running: boolean; control?: boolean;
  onToggle?: () => void; onReset?: () => void; onAdd?: () => void; compact?: boolean;
}) {
  const danger = secs <= 30 && secs > 0;
  const pct = total > 0 ? Math.max(0, Math.min(100, (secs / total) * 100)) : 0;
  const color = danger ? "var(--risk)" : "var(--green)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: compact ? "auto" : "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: compact ? "6px 12px" : "8px 16px", borderRadius: "var(--r-md)", background: danger ? "var(--risk-bg)" : "var(--card)", border: `1px solid ${danger ? "rgba(239,68,68,0.4)" : "var(--line-2)"}` }}>
          <Icon name={running ? "Timer" : "TimerOff"} size={compact ? 17 : 20} style={{ color: danger ? "var(--risk)" : "var(--ink-2)" }} />
          <span className="num" style={{ fontSize: compact ? "var(--t-lg)" : "var(--t-2xl)", fontWeight: 800, color: danger ? "var(--risk)" : "var(--ink-0)", minWidth: compact ? 52 : 78, textAlign: "center", animation: danger && running ? "timer-pulse 1s infinite" : "none", letterSpacing: "-0.02em" }}>{fmt(secs)}</span>
        </div>
        {control ? (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={onToggle} title={running ? "Pausar" : "Reanudar"} style={ctrlBtn}><Icon name={running ? "Pause" : "Play"} size={16} /></button>
            {onReset && <button onClick={onReset} title="Reiniciar" style={ctrlBtn}><Icon name="RotateCcw" size={16} /></button>}
            {onAdd && <button onClick={onAdd} title="+1 minuto" style={{ ...ctrlBtn, width: "auto", padding: "0 11px", gap: 4 }}><Icon name="Plus" size={15} /><span style={{ fontSize: "var(--t-xs)", fontWeight: 700 }}>1m</span></button>}
          </div>
        ) : (
          <span className="muted" style={{ fontSize: "var(--t-xs)" }}>El facilitador controla el tiempo</span>
        )}
      </div>
      {!compact && (
        <div style={{ height: 6, borderRadius: 99, background: "var(--card-2)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width .9s linear, background .3s", boxShadow: danger ? "0 0 8px var(--risk)" : "0 0 8px var(--green-glow)" }} />
        </div>
      )}
    </div>
  );
}

const ctrlBtn: React.CSSProperties = {
  width: 34, height: 34, borderRadius: "var(--r-sm)", background: "var(--card)", border: "1px solid var(--line-2)",
  color: "var(--ink-1)", display: "inline-flex", alignItems: "center", justifyContent: "center",
};
