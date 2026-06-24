"use client";

/* ============================================================
   Página de evaluación 360 (focalizada, fuera del AppShell, como
   la sala). El que entra evalúa al sujeto en cada competencia (1-5)
   + un comentario opcional. Anónimo entre pares (solo se muestra el
   agregado, mínimo 3). PLAN-DESARROLLO Parte A.
   ============================================================ */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card } from "@/components/ui";
import { Logo } from "@/components/AppShell";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTeam } from "@/lib/repository";
import { getReview, getMyRating, submitRating, type TalentReview } from "@/lib/talent";

export default function Review360Page() {
  const router = useRouter();
  const { reviewId } = useParams<{ reviewId: string }>();
  const { user } = useAuth();
  const [review, setReview] = useState<TalentReview | null | undefined>(undefined);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const r = await getReview(reviewId);
      if (!active) return;
      setReview(r);
      if (r) {
        const mine = await getMyRating(reviewId);
        if (active && mine) { setDraft(mine.ratings); setComment(mine.comment ?? ""); setSubmitted(true); }
      }
    })();
    return () => { active = false; };
  }, [reviewId]);

  if (review === undefined) return <Frame><p className="muted">Cargando…</p></Frame>;
  if (review === null) return <Frame><Card pad={28} style={{ textAlign: "center", maxWidth: 420 }}><h2 style={{ fontWeight: 800 }}>Evaluación no encontrada</h2><p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8 }}>El link puede haber vencido o no tenés acceso.</p></Card></Frame>;
  if (review.status === "closed") return <Frame><Card pad={28} style={{ textAlign: "center", maxWidth: 420 }}><div style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "var(--card-2)", color: "var(--ink-2)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}><Icon name="Lock" size={24} /></div><h2 style={{ fontWeight: 800 }}>Esta evaluación ya cerró</h2></Card></Frame>;

  const team = getTeam(review.teamId);
  const subject = team?.members.find((m) => m.userId === review.subjectUserId);
  const isSelf = user?.id === review.subjectUserId;
  const subjectName = isSelf ? "vos mismo/a" : (subject?.name ?? "la persona");

  const send = async () => {
    if (busy) return;
    setBusy(true);
    const { error } = await submitRating(reviewId, draft, comment.trim() || undefined);
    setBusy(false);
    if (!error) setSubmitted(true);
  };

  return (
    <Frame>
      <div style={{ width: "min(560px,100%)" }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <span className="eyebrow" style={{ color: "var(--green)" }}>Evaluación 360 · desarrollo</span>
          <h1 style={{ fontSize: "var(--t-xl)", fontWeight: 800, marginTop: 4 }}>Cómo ves a {subjectName}</h1>
          <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>Puntuá del 1 al 5 cada competencia. {isSelf ? "Es tu autoevaluación." : "Anónimo: solo se muestra el promedio del equipo."}</p>
        </div>

        {submitted ? (
          <Card pad={28} style={{ textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "var(--r-lg)", background: "var(--success-bg)", color: "var(--green)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}><Icon name="Check" size={26} /></div>
            <h2 style={{ fontWeight: 800 }}>¡Listo, gracias!</h2>
            <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 8 }}>Tu evaluación quedó guardada. Podés volver a entrar y editarla mientras esté abierta.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
              <Button variant="secondary" icon="Pencil" onClick={() => setSubmitted(false)}>Editar</Button>
              <Button icon="ArrowLeft" onClick={() => router.push(user?.role === "member" ? "/member" : "/dashboard")}>Volver</Button>
            </div>
          </Card>
        ) : (
          <Card pad={24}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {review.competencies.map((c) => (
                <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ flex: 1, minWidth: 150, fontSize: "var(--t-sm)", fontWeight: 600 }}>{c.label}</span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {[1, 2, 3, 4, 5].map((v) => {
                      const on = draft[c.key] === v;
                      return <button key={v} onClick={() => setDraft((s) => ({ ...s, [c.key]: v }))} className="num" style={{ width: 36, height: 36, borderRadius: 99, fontWeight: 800, fontSize: "var(--t-sm)", border: `1.5px solid ${on ? "var(--green)" : "var(--line-2)"}`, background: on ? "color-mix(in srgb, var(--green) 22%, transparent)" : "var(--card)", color: on ? "var(--green)" : "var(--ink-2)" }}>{v}</button>;
                    })}
                  </div>
                </div>
              ))}
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Un ejemplo concreto o algo que quieras destacar (opcional)…" style={{ background: "var(--card)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "10px 12px", fontSize: "var(--t-sm)", outline: "none", resize: "vertical" }} />
              <Button full size="lg" icon={busy ? "Loader" : "Send"} disabled={busy || review.competencies.some((c) => !draft[c.key])} onClick={send}>{busy ? "Enviando…" : "Enviar mi evaluación"}</Button>
              {review.competencies.some((c) => !draft[c.key]) && <p className="muted" style={{ fontSize: "var(--t-xs)", textAlign: "center" }}>Puntuá todas las competencias para enviar.</p>}
            </div>
          </Card>
        )}
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-1)", display: "flex", flexDirection: "column" }}>
      <header style={{ padding: "16px 24px", borderBottom: "1px solid var(--line)" }}><Logo /></header>
      <main style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "40px 20px" }}>{children}</main>
    </div>
  );
}
