"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { homeFor } from "@/lib/auth/access";
import { GrowthMark, Logo } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { STAGES, type StageKey } from "@/lib/data";

// ⚠️ Reemplazar por el número real (formato internacional sin +, ej: 5491122334455)
const WHATSAPP = "5491100000000";
const waLink = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, me interesa llevar Growthloop a mi organización.")}`;

const CYCLE: { key: StageKey; desc: string }[] = [
  { key: "explore", desc: "¿Dónde estamos? Sacan a la luz las tensiones que traban al equipo." },
  { key: "focus", desc: "¿Por qué pasa? Encuentran la causa raíz, no el síntoma." },
  { key: "proof", desc: "¿Qué probamos? Diseñan 1 o 2 apuestas con acciones y responsables." },
  { key: "follow", desc: "¿Cómo vamos? Revisan la señal y destraban lo que frena." },
  { key: "learn", desc: "¿Qué aprendimos? Deciden consolidar, iterar o soltar." },
];

const AUDIENCE = [
  { icon: "UserCog", title: "Para facilitadores", desc: "Conducís sesiones que mueven la aguja, con una estructura probada que te guía paso a paso." },
  { icon: "Building2", title: "Para empresas", desc: "Visibilidad real del avance de cada equipo, con reportes claros y una biblioteca de aprendizajes." },
  { icon: "Users", title: "Para los equipos", desc: "Participan en vivo, votan en anonimato y ven que sus ideas se vuelven mejoras concretas." },
];

const WHY = [
  { icon: "Radio", title: "En vivo y facilitado", desc: "Todos en la misma pantalla, conducidos por un facilitador. Nada de planillas que nadie completa." },
  { icon: "EyeOff", title: "Anónimo y seguro", desc: "Las votaciones son anónimas y ocultas hasta que el facilitador las revela. Se dice lo que hay que decir." },
  { icon: "Library", title: "Queda registrado", desc: "Cada ciclo deja aprendizajes, apuestas y causas raíz guardados. La mejora se vuelve memoria del equipo." },
];

function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <section style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px", ...style }}>{children}</section>;
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, role, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated && role) router.replace(homeFor(role));
  }, [loading, isAuthenticated, role, router]);

  // Mientras carga, o si ya está logueado (va a redirigir), mostramos un loader.
  if (loading || (isAuthenticated && role)) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-1)" }}>
        <span style={{ animation: "spin 1.1s linear infinite", display: "inline-flex" }}><GrowthMark size={34} /></span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1100px 560px at 50% -200px, rgba(0,232,122,0.10), transparent), var(--bg-1)", color: "var(--ink-0)" }}>
      {/* nav */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(10px)", background: "color-mix(in srgb, var(--bg-1) 72%, transparent)", borderBottom: "1px solid var(--line)" }}>
        <Section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px" }}>
          <Logo />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href={waLink} target="_blank" rel="noreferrer" className="hide-sm">
              <Button variant="secondary" icon="MessageCircle">Hablar con nosotros</Button>
            </a>
            <Button icon="LogIn" onClick={() => router.push("/login")}>Iniciar sesión</Button>
          </div>
        </Section>
      </header>

      {/* hero */}
      <Section style={{ paddingTop: 72, paddingBottom: 64, textAlign: "center" }}>
        <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: "var(--r-full)", background: "var(--green-soft)", color: "var(--green)", marginBottom: 22 }}>
          <Icon name="Sprout" size={14} /> Mejora continua para equipos
        </span>
        <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 880, margin: "0 auto 20px" }}>
          El <span style={{ color: "var(--green)" }}>loop</span> que convierte las reuniones en mejoras reales
        </h1>
        <p className="muted" style={{ fontSize: "var(--t-lg)", lineHeight: 1.6, maxWidth: 660, margin: "0 auto 32px" }}>
          Growthloop hace que tu equipo detecte lo que lo traba, pruebe soluciones y deje aprendizajes —
          en sesiones en vivo, facilitadas y anónimas. Sin planillas que nadie mira.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Button size="lg" icon="LogIn" onClick={() => router.push("/login")}>Iniciar sesión</Button>
          <a href={waLink} target="_blank" rel="noreferrer">
            <Button size="lg" variant="secondary" icon="MessageCircle">Quiero llevarlo a mi empresa</Button>
          </a>
        </div>
        <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 18 }}>El acceso es por invitación · te lo da tu administrador o facilitador.</p>
      </Section>

      {/* cómo funciona — el ciclo */}
      <Section style={{ paddingTop: 40, paddingBottom: 64 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>Un ciclo simple, que se repite</h2>
          <p className="muted" style={{ fontSize: "var(--t-base)", maxWidth: 620, margin: "0 auto", lineHeight: 1.6 }}>
            Cada iniciativa de mejora recorre cinco etapas. Arranca con la <b style={{ color: "var(--ink-1)" }}>Sesión Fundacional</b> (el acuerdo del equipo) y cierra consolidando lo que funcionó.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
          {CYCLE.map(({ key, desc }) => {
            const st = STAGES[key];
            return (
              <Card key={key} pad={20} style={{ borderTop: `3px solid ${st.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: "var(--r-full)", display: "grid", placeItems: "center", background: `color-mix(in srgb, ${st.color} 16%, transparent)`, color: st.color, fontWeight: 800, fontSize: "var(--t-sm)" }} className="num">{st.n}</span>
                  <span style={{ fontWeight: 700, fontSize: "var(--t-md)" }}>{st.label}</span>
                </div>
                <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.55 }}>{desc}</p>
              </Card>
            );
          })}
        </div>
      </Section>

      {/* por qué */}
      <Section style={{ paddingTop: 40, paddingBottom: 64 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {WHY.map((w) => (
            <Card key={w.title} pad={24}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", marginBottom: 14 }}>
                <Icon name={w.icon} size={22} />
              </div>
              <h3 style={{ fontSize: "var(--t-md)", fontWeight: 700, marginBottom: 6 }}>{w.title}</h3>
              <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.6 }}>{w.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* para quién */}
      <Section style={{ paddingTop: 40, paddingBottom: 72 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.02em" }}>Hecho para que la mejora pase</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          {AUDIENCE.map((a) => (
            <Card key={a.title} pad={24}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ color: "var(--violet)", display: "inline-flex" }}><Icon name={a.icon} size={22} /></span>
                <h3 style={{ fontSize: "var(--t-md)", fontWeight: 700 }}>{a.title}</h3>
              </div>
              <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.6 }}>{a.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* CTA final */}
      <Section style={{ paddingBottom: 80 }}>
        <Card glow pad={40} style={{ textAlign: "center", background: "linear-gradient(180deg, rgba(0,232,122,0.08), var(--card))", borderColor: "color-mix(in srgb, var(--green) 35%, transparent)" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>¿Lo llevás a tu organización?</h2>
          <p className="muted" style={{ fontSize: "var(--t-base)", maxWidth: 540, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Escribinos y te damos acceso para que lo pruebes con un equipo. Sin compromiso.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={waLink} target="_blank" rel="noreferrer">
              <Button size="lg" icon="MessageCircle">Hablar por WhatsApp</Button>
            </a>
            <Button size="lg" variant="secondary" icon="LogIn" onClick={() => router.push("/login")}>Ya tengo cuenta</Button>
          </div>
        </Card>
      </Section>

      {/* footer */}
      <footer style={{ borderTop: "1px solid var(--line)" }}>
        <Section style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "22px 24px", flexWrap: "wrap" }}>
          <Logo />
          <span className="faint" style={{ fontSize: "var(--t-xs)" }}>© 2026 Growthloop · consultas@teamcookgame.com</span>
        </Section>
      </footer>
    </div>
  );
}
