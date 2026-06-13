"use client";

/* Capa de vida de la sala: reacciones flotantes 👍❤️🔥 que cualquiera tira y
   todos ven, + indicador de "alguien está sumando…". Autónomo: lee la sesión
   de la URL y se dibuja sobre todo con un portal. */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { joinLiveBus } from "@/lib/session";

const REACTIONS = ["👍", "❤️", "🔥", "💡", "👏", "🎉"];
let _id = 0;

interface Floaty { id: number; emoji: string; left: number; dur: number }

export function RoomLiveFx() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params?.sessionId;
  const { user } = useAuth();
  const [floaties, setFloaties] = useState<Floaty[]>([]);
  const [typing, setTyping] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const busRef = useRef<ReturnType<typeof joinLiveBus> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef(0);

  useEffect(() => { setMounted(true); }, []);

  const addFloaty = (emoji: string) => {
    const id = ++_id;
    setFloaties((f) => [...f, { id, emoji, left: 8 + Math.random() * 84, dur: 2.6 + Math.random() * 1.1 }]);
    setTimeout(() => setFloaties((f) => f.filter((x) => x.id !== id)), 4000);
  };

  useEffect(() => {
    if (!sessionId) return;
    const bus = joinLiveBus(sessionId, {
      onReaction: (emoji) => addFloaty(emoji),
      onTyping: (name) => {
        setTyping(name);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 2200);
      },
    });
    busRef.current = bus;
    // Detecta escritura en cualquier input/textarea de la sala (sin tocar cada campo).
    const onInput = (e: Event) => {
      const t = e.target as HTMLElement;
      if (!t || (t.tagName !== "INPUT" && t.tagName !== "TEXTAREA")) return;
      const now = Date.now();
      if (now - lastSent.current < 1500) return; // throttle
      lastSent.current = now;
      if (user) bus.sendTyping(user.name.split(" ")[0]);
    };
    document.addEventListener("input", onInput, true);
    return () => { document.removeEventListener("input", onInput, true); bus.unsub(); busRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, user?.id]);

  const fire = (emoji: string) => { addFloaty(emoji); busRef.current?.sendReaction(emoji, user?.name ?? ""); };

  if (!mounted || !sessionId) return null;

  return createPortal(
    <>
      {/* reacciones subiendo */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 60, overflow: "hidden" }} aria-hidden>
        {floaties.map((f) => (
          <span key={f.id} style={{ position: "absolute", bottom: 90, left: `${f.left}%`, fontSize: 34, animation: `gl-react ${f.dur}s ease-out forwards`, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))" }}>{f.emoji}</span>
        ))}
      </div>
      {/* "alguien está sumando…" */}
      {typing && (
        <div className="stage-hide" style={{ position: "fixed", bottom: 76, left: "50%", transform: "translateX(-50%)", zIndex: 61, background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-full)", padding: "6px 14px", fontSize: "var(--t-xs)", fontWeight: 600, color: "var(--ink-1)", boxShadow: "var(--sh-sm)", display: "flex", alignItems: "center", gap: 7, animation: "pop-in .2s var(--spring)" }}>
          <span style={{ display: "inline-flex", gap: 2 }}>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--green)", animation: "gl-typing .9s infinite" }} />
            <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--green)", animation: "gl-typing .9s infinite .15s" }} />
            <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--green)", animation: "gl-typing .9s infinite .3s" }} />
          </span>
          {typing} está sumando…
        </div>
      )}
      {/* barra de reacciones */}
      <div style={{ position: "fixed", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 61, display: "flex", gap: 4, background: "color-mix(in srgb, var(--bg-2) 92%, transparent)", backdropFilter: "blur(8px)", border: "1px solid var(--line-2)", borderRadius: "var(--r-full)", padding: "6px 8px", boxShadow: "var(--sh-md)" }}>
        {REACTIONS.map((e) => (
          <button key={e} onClick={() => fire(e)} title="Reaccionar" style={{ fontSize: 22, lineHeight: 1, padding: "4px 6px", borderRadius: "var(--r-full)", transition: "transform .12s var(--spring)" }}
            onPointerDown={(ev) => { (ev.currentTarget as HTMLElement).style.transform = "scale(1.4)"; }}
            onPointerUp={(ev) => { (ev.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            onPointerLeave={(ev) => { (ev.currentTarget as HTMLElement).style.transform = "scale(1)"; }}>
            {e}
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}
