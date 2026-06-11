"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui";

/** Modal del facilitador: QR + código de sala para que el equipo se sume. */
export function JoinModal({ url, code, onClose }: { url: string; code?: string; onClose: () => void }) {
  const [qr, setQr] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 340, margin: 1, color: { dark: "#0B1220", light: "#FFFFFF" } })
      .then(setQr).catch(() => { /* */ });
  }, [url]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* */ }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(7,11,22,0.72)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(420px,100%)", background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-lg)", padding: 26, textAlign: "center", animation: "pop-in .25s var(--spring)" }}>
        <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 800, letterSpacing: "-0.02em" }}>Sumate a la sesión</h3>
        <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 6, marginBottom: 18 }}>Escaneá el QR con la cámara, o entrá con el código desde Growthloop.</p>

        <div style={{ width: 220, height: 220, margin: "0 auto 18px", background: "#fff", borderRadius: "var(--r-md)", display: "grid", placeItems: "center", padding: 10 }}>
          {qr ? <img src={qr} alt="QR de la sesión" style={{ width: "100%", height: "100%", display: "block" }} /> : <span style={{ color: "#0B1220", fontSize: "var(--t-sm)" }}>Generando…</span>}
        </div>

        {code && (
          <div style={{ marginBottom: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Código de sala</div>
            <div className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800, letterSpacing: "0.18em", color: "var(--green)" }}>{code}</div>
            <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 4 }}>En Growthloop: <b style={{ color: "var(--ink-1)" }}>Unirse a una sesión</b> → tipeá el código.</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Button variant="secondary" icon={copied ? "Check" : "Link"} onClick={copy}>{copied ? "Link copiado" : "Copiar link"}</Button>
          <Button icon="Check" onClick={onClose}>Listo</Button>
        </div>
      </div>
    </div>
  );
}
