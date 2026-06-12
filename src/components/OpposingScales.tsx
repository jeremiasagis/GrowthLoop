"use client";

/* Escala de opuestos: los puntos HOY (azul) e IDEAL (verde) de todo el
   equipo superpuestos sobre la misma escala 1-10, con sus promedios. */

export function OpposingScale({ a, b, today, ideal }: { a: string; b: string; today: number[]; ideal: number[] }) {
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
  const tAvg = avg(today), iAvg = avg(ideal);
  const x = (v: number) => `${((v - 1) / 9) * 100}%`;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 10 }}>
        <span style={{ fontSize: "var(--t-sm)", fontWeight: 800 }}>{a}</span>
        <span style={{ fontSize: "var(--t-sm)", fontWeight: 800 }}>{b}</span>
      </div>
      <div style={{ position: "relative", height: 54, margin: "0 6px" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 24, height: 5, borderRadius: 99, background: "var(--card-2)" }} />
        {[1, 4, 7, 10].map((m) => <span key={m} className="num muted" style={{ position: "absolute", left: x(m), top: 36, fontSize: 9, transform: "translateX(-50%)" }}>{m}</span>)}
        {today.map((v, i) => <span key={`t${i}`} title="hoy" style={{ position: "absolute", left: x(v), top: 18, width: 15, height: 15, borderRadius: 99, background: "color-mix(in srgb, #3B82F6 35%, var(--card))", border: "2px solid #3B82F6", transform: "translateX(-50%)", animation: `pop-in .35s var(--spring) ${i * 0.05}s both` }} />)}
        {ideal.map((v, i) => <span key={`i${i}`} title="ideal" style={{ position: "absolute", left: x(v), top: 4, width: 15, height: 15, borderRadius: 99, background: "color-mix(in srgb, var(--green) 35%, var(--card))", border: "2px solid var(--green)", transform: "translateX(-50%)", animation: `pop-in .35s var(--spring) ${i * 0.05}s both` }} />)}
        {tAvg != null && <span style={{ position: "absolute", left: x(tAvg), top: 14, width: 3, height: 24, background: "#3B82F6", transform: "translateX(-50%)", borderRadius: 2 }} title={`hoy prom. ${tAvg.toFixed(1)}`} />}
        {iAvg != null && <span style={{ position: "absolute", left: x(iAvg), top: 0, width: 3, height: 24, background: "var(--green)", transform: "translateX(-50%)", borderRadius: 2 }} title={`ideal prom. ${iAvg.toFixed(1)}`} />}
      </div>
      {tAvg != null && iAvg != null && (
        <div className="muted num" style={{ fontSize: "var(--t-xs)", textAlign: "center", marginTop: 2 }}>
          <span style={{ color: "#3B82F6", fontWeight: 700 }}>hoy {tAvg.toFixed(1)}</span> · <span style={{ color: "var(--green)", fontWeight: 700 }}>ideal {iAvg.toFixed(1)}</span> · brecha {Math.abs(iAvg - tAvg).toFixed(1)}
        </div>
      )}
    </div>
  );
}
