"use client";

/* ============================================================
   Grilla de constancia estilo GitHub — cuadraditos que se
   encienden con la actividad del equipo (sesiones + pulsos). La
   racha se lee de un vistazo y gamifica la cadencia de mejora.
   ============================================================ */

import { useMemo } from "react";

const DAY = 86400000;
const DOW = ["L", "M", "M", "J", "V", "S", "D"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

const dayKey = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

export function StreakGrid({ dates, weeks = 16, now = Date.now() }: { dates: (string | undefined)[]; weeks?: number; now?: number }) {
  const { cols, activeDays, dayStreak, level } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const iso of dates) {
      if (!iso) continue;
      const d = new Date(iso);
      if (isNaN(d.getTime())) continue;
      const k = dayKey(d.getTime());
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const todayDow = (today.getDay() + 6) % 7; // 0 = lunes
    const thisMonday = todayMs - todayDow * DAY;
    const startMs = thisMonday - (weeks - 1) * 7 * DAY;

    const level = (c: number) => (c <= 0 ? 0 : c === 1 ? 1 : c === 2 ? 2 : 3);
    const cols: { ms: number; lvl: number; future: boolean; month: number }[][] = [];
    let activeDays = 0;
    for (let w = 0; w < weeks; w++) {
      const col: { ms: number; lvl: number; future: boolean; month: number }[] = [];
      for (let r = 0; r < 7; r++) {
        const ms = startMs + (w * 7 + r) * DAY;
        const future = ms > todayMs;
        const c = future ? 0 : (counts.get(dayKey(ms)) ?? 0);
        if (c > 0) activeDays++;
        col.push({ ms, lvl: level(c), future, month: new Date(ms).getMonth() });
      }
      cols.push(col);
    }

    // Racha de días consecutivos hasta hoy con actividad.
    let dayStreak = 0;
    for (let k = 0; ; k++) {
      const c = counts.get(dayKey(todayMs - k * DAY)) ?? 0;
      if (c > 0) dayStreak++;
      else if (k === 0) break; // hoy sin actividad → 0 (pero seguimos si ayer tuvo)
      else break;
    }
    // Si hoy no tuvo pero ayer sí, contamos desde ayer.
    if (dayStreak === 0) {
      for (let k = 1; ; k++) {
        const c = counts.get(dayKey(todayMs - k * DAY)) ?? 0;
        if (c > 0) dayStreak++; else break;
      }
    }

    return { cols, activeDays, dayStreak, level };
  }, [dates, weeks, now]);

  const lvlColor = (l: number) => l === 0 ? "var(--card-2)" : `color-mix(in srgb, var(--green) ${l === 1 ? 30 : l === 2 ? 60 : 100}%, var(--card-2))`;

  // Etiquetas de mes: primera semana donde cambia el mes de la fila superior.
  const monthLabels = cols.map((col, i) => {
    const m = col[0].month;
    const prev = i > 0 ? cols[i - 1][0].month : -1;
    return m !== prev ? MONTHS[m] : "";
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🔥</span>
          <div>
            <div style={{ fontSize: "var(--t-sm)", fontWeight: 800 }}>{dayStreak} {dayStreak === 1 ? "día" : "días"} de racha</div>
            <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{activeDays} días activos en {weeks} semanas</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--ink-3)" }}>
          <span>menos</span>
          {[0, 1, 2, 3].map((l) => <span key={l} style={{ width: 10, height: 10, borderRadius: 3, background: lvlColor(l), border: "1px solid var(--line)" }} />)}
          <span>más</span>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "inline-flex", flexDirection: "column", gap: 4, minWidth: "min-content" }}>
          {/* meses */}
          <div style={{ display: "flex", gap: 3, paddingLeft: 16 }}>
            {monthLabels.map((m, i) => <div key={i} style={{ width: 12, fontSize: 9, color: "var(--ink-3)", textAlign: "left", overflow: "visible", whiteSpace: "nowrap" }}>{m}</div>)}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {/* días de la semana */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 0 }}>
              {DOW.map((d, i) => <div key={i} style={{ width: 12, height: 12, fontSize: 8, color: "var(--ink-3)", display: "grid", placeItems: "center" }}>{i % 2 === 0 ? d : ""}</div>)}
            </div>
            {/* semanas */}
            <div style={{ display: "flex", gap: 3 }}>
              {cols.map((col, wi) => (
                <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {col.map((cell, ri) => (
                    <div key={ri} title={cell.future ? "" : `${new Date(cell.ms).toLocaleDateString("es", { day: "2-digit", month: "short" })}`}
                      style={{ width: 12, height: 12, borderRadius: 3, background: cell.future ? "transparent" : lvlColor(cell.lvl), border: cell.future ? "none" : `1px solid ${cell.lvl > 0 ? "transparent" : "var(--line)"}` }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
