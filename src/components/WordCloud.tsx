"use client";

/* Nube de palabras: las más repetidas se ven más grandes. Sin atribución. */

const CLOUD_COLORS = ["var(--green)", "#3B82F6", "#7C3AED", "#06B6D4", "#F59E0B", "#EC4899", "#A3E635"];

export function WordCloud({ words, size = "md" }: { words: string[]; size?: "md" | "lg" }) {
  const freq = new Map<string, { label: string; n: number }>();
  for (const w of words) {
    const k = w.trim().toLowerCase();
    if (!k) continue;
    const cur = freq.get(k);
    if (cur) cur.n += 1; else freq.set(k, { label: w.trim(), n: 1 });
  }
  const items = [...freq.values()].sort((a, b) => b.n - a.n);
  if (!items.length) return <p className="muted" style={{ textAlign: "center", fontSize: "var(--t-sm)", padding: 20 }}>Todavía no hay palabras.</p>;
  const base = size === "lg" ? 18 : 15;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", alignItems: "baseline", justifyContent: "center", padding: "10px 0" }}>
      {items.map((it, i) => (
        <span key={it.label.toLowerCase()} className="num" style={{
          fontSize: base + Math.min(it.n - 1, 4) * 9, fontWeight: it.n > 1 ? 800 : 600,
          color: CLOUD_COLORS[i % CLOUD_COLORS.length], lineHeight: 1.2,
          animation: `pop-in .4s var(--spring) ${i * 0.05}s both`,
        }}>
          {it.label}{it.n > 1 && <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 3 }}>×{it.n}</span>}
        </span>
      ))}
    </div>
  );
}
