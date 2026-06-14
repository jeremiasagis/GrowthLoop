"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { homeFor } from "@/lib/auth/access";
import { GrowthMark, Logo } from "@/components/AppShell";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ThemeToggle } from "@/components/ThemeToggle";
import { STAGES, type StageKey } from "@/lib/data";

// ⚠️ Reemplazar por el número real (formato internacional sin +, ej: 5491122334455)
const WHATSAPP = "5491100000000";
const waLink = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hola, me interesa llevar Growthloop a mi organización.")}`;

// Posiciones de los 5 nodos alrededor del círculo (en % del contenedor cuadrado), desde arriba en sentido horario.
const NODE_POS = [
  { x: 50, y: 10 },    // Objetivos (arriba)
  { x: 88, y: 37.6 },  // Foco
  { x: 73.5, y: 82.4 }, // Ideación
  { x: 26.5, y: 82.4 }, // Seguimiento
  { x: 12, y: 37.6 },  // Aprendizaje
];
// Flechas de dirección en los puntos medios del anillo, rotadas en sentido horario.
const ARROW_POS = [
  { x: 73.5, y: 17.6, rot: 36 },
  { x: 88, y: 62.4, rot: 108 },
  { x: 50, y: 90, rot: 180 },
  { x: 12, y: 62.4, rot: 252 },
  { x: 26.5, y: 17.6, rot: 324 },
];

const CYCLE: { key: StageKey; desc: string }[] = [
  { key: "objectives", desc: "¿Qué vamos a mejorar? El equipo detecta sus tensiones y define el foco del ciclo." },
  { key: "focus", desc: "¿Por qué pasa? Priorizan por impacto y esfuerzo y encuentran la causa raíz." },
  { key: "ideation", desc: "¿Qué probamos? Idean soluciones y diseñan una apuesta con señal y responsable." },
  { key: "follow", desc: "¿Cómo viene? Check-ins de la prueba: miden la señal, destraban obstáculos y ajustan." },
  { key: "learn", desc: "¿Qué aprendimos? Miran el resultado, guardan los aprendizajes y deciden el próximo paso." },
];

const AUDIENCE = [
  { icon: "UserCog", title: "Para facilitadores", desc: "Conducís sesiones que mueven la aguja, con una estructura probada que te guía paso a paso." },
  { icon: "Building2", title: "Para empresas", desc: "Visibilidad real del avance de cada equipo, con reportes claros y una biblioteca de aprendizajes." },
  { icon: "Users", title: "Para los equipos", desc: "Participan en vivo, votan en anonimato y ven que sus ideas se vuelven mejoras concretas." },
];

const PRICING: { plan: string; price: string; tagline: string; features: string[]; cta: string; to: "registro" | "wa"; highlight?: boolean }[] = [
  { plan: "Starter", price: "Gratis", tagline: "Para empezar solo, hoy", to: "registro", cta: "Empezá gratis",
    features: ["1 equipo", "2 retros esenciales por etapa", "Sesiones en vivo y anónimas", "Biblioteca de aprendizajes"] },
  { plan: "Pro", price: "Para facilitadores", tagline: "Acompañá a varios equipos", to: "wa", cta: "Quiero Pro", highlight: true,
    features: ["Hasta 10 equipos", "Las 49 retros, todas desbloqueadas", "✨ Copiloto de IA en cada sesión", "Reporte ejecutivo con IA", "Modo escenario + reacciones en vivo"] },
  { plan: "Business", price: "A medida", tagline: "Para empresas y sus líderes", to: "wa", cta: "Hablar con ventas",
    features: ["Equipos y facilitadores ilimitados", "Tus líderes facilitan sus equipos", "Panel de organización + coordinadores", "Onboarding y soporte"] },
];

const AI_USES = [
  { icon: "Layers", title: "Agrupa las tarjetas", desc: "Junta lo que el equipo escribe por tema y le pone nombre, en segundos." },
  { icon: "Lightbulb", title: "Sugiere qué retro hacer", desc: "Según el estado del equipo y lo que querés trabajar hoy." },
  { icon: "PenLine", title: "Redacta por vos", desc: "Causa raíz, narrativa del resultado y la apuesta — borradores que editás." },
  { icon: "FileText", title: "Arma el informe del ciclo", desc: "Un resumen ejecutivo listo para compartir con el líder o la empresa." },
  { icon: "Search", title: "Responde tu biblioteca", desc: "Preguntás en lenguaje natural y encuentra los aprendizajes que importan." },
];

const WHY = [
  { icon: "Radio", title: "En vivo y facilitado", desc: "Todos en la misma pantalla, conducidos por un facilitador. Nada de planillas que nadie completa." },
  { icon: "EyeOff", title: "Anónimo y seguro", desc: "Las votaciones son anónimas y ocultas hasta que el facilitador las revela. Se dice lo que hay que decir." },
  { icon: "Library", title: "Queda registrado", desc: "Cada ciclo deja aprendizajes, apuestas y causas raíz guardados. La mejora se vuelve memoria del equipo." },
  { icon: "Trophy", title: "Gamificada", desc: "El equipo sube de nivel, mantiene su racha y desbloquea logros a medida que mejora. La constancia se vuelve hábito, con energía." },
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
            <ThemeToggle compact />
            <span className="hide-sm"><Button variant="secondary" icon="LogIn" onClick={() => router.push("/login")}>Iniciar sesión</Button></span>
            <Button icon="Rocket" onClick={() => router.push("/registro")}>Empezá gratis</Button>
          </div>
        </Section>
      </header>

      {/* hero */}
      <Section style={{ paddingTop: 72, paddingBottom: 64, textAlign: "center" }}>
        <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: "var(--r-full)", background: "var(--green-soft)", color: "var(--green)", marginBottom: 22 }}>
          <Icon name="Sprout" size={14} /> Mejora continua · gamificada · con IA
        </span>
        <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, maxWidth: 880, margin: "0 auto 20px" }}>
          El <span style={{ color: "var(--green)" }}>loop</span> que convierte las reuniones en mejoras reales
        </h1>
        <p className="muted" style={{ fontSize: "var(--t-lg)", lineHeight: 1.6, maxWidth: 660, margin: "0 auto 32px" }}>
          Growthloop hace que tu equipo detecte lo que lo traba, pruebe soluciones y deje aprendizajes —
          en sesiones en vivo, facilitadas y anónimas, <b style={{ color: "var(--violet)" }}>con un copiloto de IA</b>. Sin planillas que nadie mira.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Button size="lg" icon="Rocket" onClick={() => router.push("/registro")}>Empezá gratis</Button>
          <a href={waLink} target="_blank" rel="noreferrer">
            <Button size="lg" variant="secondary" icon="MessageCircle">Quiero llevarlo a mi empresa</Button>
          </a>
        </div>
        <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 18 }}>Plan Starter gratis para facilitadores · sin tarjeta · 1 equipo y las retros esenciales.</p>
      </Section>

      {/* cómo funciona — el ciclo */}
      <Section style={{ paddingTop: 40, paddingBottom: 64 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>Un ciclo simple, que se repite</h2>
          <p className="muted" style={{ fontSize: "var(--t-base)", maxWidth: 640, margin: "0 auto", lineHeight: 1.6 }}>
            Cada iniciativa de mejora recorre cinco etapas, en sesiones en vivo. El equipo arranca con la <b style={{ color: "var(--ink-1)" }}>Sesión Fundacional</b> (su acuerdo de trabajo) y el módulo de <b style={{ color: "var(--st-explore)" }}>Exploración</b> (¿dónde estamos?), y desde ahí el ciclo se repite.
          </p>
        </div>
        {/* círculo (desktop) */}
        <div className="gl-ring-wrap">
          <svg className="gl-ring" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
            <circle cx="50" cy="50" r="40" fill="none" stroke="color-mix(in srgb, var(--green) 38%, transparent)" strokeWidth="0.5" strokeDasharray="1.6 2.2" />
          </svg>
          {CYCLE.map(({ key }, i) => {
            const st = STAGES[key];
            const p = NODE_POS[i];
            return (
              <div key={key} className="gl-node" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                <span className="gl-node-badge num" style={{ background: `color-mix(in srgb, ${st.color} 18%, var(--card))`, borderColor: st.color, color: st.color }}>{st.n}</span>
                <span className="gl-node-label">{st.label}</span>
              </div>
            );
          })}
          {ARROW_POS.map((a, i) => (
            <span key={i} className="gl-arrow" style={{ left: `${a.x}%`, top: `${a.y}%`, transform: `translate(-50%,-50%) rotate(${a.rot}deg)` }}><Icon name="ChevronRight" size={18} /></span>
          ))}
          <div className="gl-hub">
            <span style={{ display: "inline-flex", animation: "spin 9s linear infinite" }}><Icon name="RefreshCw" size={28} /></span>
            <span style={{ fontWeight: 800, fontSize: "var(--t-sm)", marginTop: 4 }}>se repite</span>
            <span className="faint" style={{ fontSize: 11, lineHeight: 1.3 }}>cada vuelta sube<br />hacia el objetivo</span>
          </div>
        </div>

        {/* leyenda / detalle (y único contenido en mobile) */}
        <div className="gl-legend">
          {CYCLE.map(({ key, desc }) => {
            const st = STAGES[key];
            return (
              <div key={key} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span className="num" style={{ flex: "0 0 auto", width: 26, height: 26, borderRadius: "var(--r-full)", display: "grid", placeItems: "center", background: `color-mix(in srgb, ${st.color} 16%, transparent)`, color: st.color, fontWeight: 800, fontSize: "var(--t-xs)" }}>{st.n}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-sm)" }}>{st.label}</div>
                  <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.5, marginTop: 2 }}>{desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="muted" style={{ textAlign: "center", marginTop: 28, fontSize: "var(--t-sm)" }}>
          <span className="faint">Arranca una vez con la Sesión Fundacional · después, cada vuelta es Objetivos → Foco → Ideación → Seguimiento → Aprendizaje.</span>
        </p>

        <style>{`
          .gl-ring-wrap { position: relative; width: 100%; max-width: 460px; aspect-ratio: 1/1; margin: 0 auto; }
          .gl-ring { position: absolute; inset: 0; width: 100%; height: 100%; }
          .gl-node { position: absolute; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 7px; width: 130px; }
          .gl-node-badge { width: 48px; height: 48px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: 18px; border: 2px solid; }
          .gl-node-label { font-weight: 700; font-size: 15px; text-align: center; white-space: nowrap; }
          .gl-arrow { position: absolute; color: color-mix(in srgb, var(--green) 60%, var(--ink-3)); }
          .gl-hub { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; text-align: center; color: var(--green); width: 130px; }
          .gl-legend { display: none; }
          @media (max-width: 720px) {
            .gl-ring-wrap { display: none; }
            .gl-legend { display: grid; grid-template-columns: 1fr; gap: 16px; max-width: 420px; margin: 0 auto; }
          }
        `}</style>
      </Section>

      {/* por qué */}
      <Section style={{ paddingTop: 40, paddingBottom: 64 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
          {WHY.map((w) => (
            <Card key={w.title} pad={24} style={{ flex: "1 1 240px", maxWidth: 340 }}>
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

      {/* IA */}
      <Section style={{ paddingTop: 40, paddingBottom: 64 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: "var(--r-full)", background: "color-mix(in srgb, var(--violet) 14%, transparent)", color: "var(--violet)", marginBottom: 18 }}>
            <Icon name="Sparkles" size={14} /> Con inteligencia artificial
          </span>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>Un copiloto que facilita con vos</h2>
          <p className="muted" style={{ fontSize: "var(--t-base)", maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
            La IA hace el trabajo pesado de la facilitación: sintetiza, redacta y resume — vos revisás y decidís. Incluida en los planes Pro y Business.
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16 }}>
          {AI_USES.map((a) => (
            <Card key={a.title} pad={22} style={{ flex: "0 1 280px", maxWidth: 320, border: "1px solid color-mix(in srgb, var(--violet) 22%, var(--line))" }}>
              <div style={{ width: 44, height: 44, borderRadius: "var(--r-md)", background: "color-mix(in srgb, var(--violet) 14%, transparent)", color: "var(--violet)", display: "grid", placeItems: "center", marginBottom: 14 }}>
                <Icon name={a.icon} size={22} />
              </div>
              <h3 style={{ fontSize: "var(--t-md)", fontWeight: 700, marginBottom: 6 }}>{a.title}</h3>
              <p className="muted" style={{ fontSize: "var(--t-sm)", lineHeight: 1.6 }}>{a.desc}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* planes */}
      <Section style={{ paddingTop: 40, paddingBottom: 72 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>Planes para cada momento</h2>
          <p className="muted" style={{ fontSize: "var(--t-base)", maxWidth: 560, margin: "0 auto", lineHeight: 1.6 }}>
            Empezá gratis con un equipo. Cuando crezcas —más equipos, más retros o tu empresa entera— pasás a Pro o Business.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, alignItems: "stretch" }}>
          {PRICING.map((p) => (
            <Card key={p.plan} pad={26} glow={p.highlight} style={{ display: "flex", flexDirection: "column", gap: 16, borderColor: p.highlight ? "color-mix(in srgb, var(--green) 45%, transparent)" : undefined, background: p.highlight ? "linear-gradient(180deg, rgba(0,232,122,0.07), var(--card))" : undefined }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <h3 style={{ fontSize: "var(--t-lg)", fontWeight: 800 }}>{p.plan}</h3>
                  {p.highlight && <span className="eyebrow" style={{ padding: "3px 9px", borderRadius: "var(--r-full)", background: "var(--green-soft)", color: "var(--green)" }}>Popular</span>}
                </div>
                <div className="num" style={{ fontSize: "var(--t-2xl)", fontWeight: 800, color: p.highlight ? "var(--green)" : "var(--ink-0)" }}>{p.price}</div>
                <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 4 }}>{p.tagline}</p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
                {p.features.map((f) => (
                  <div key={f} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: "var(--t-sm)" }}>
                    <Icon name="Check" size={16} style={{ color: "var(--green)", flexShrink: 0, marginTop: 1 }} />
                    <span style={{ lineHeight: 1.45 }}>{f}</span>
                  </div>
                ))}
              </div>
              {p.to === "registro"
                ? <Button full size="lg" variant={p.highlight ? "primary" : "secondary"} icon="Rocket" onClick={() => router.push("/registro")}>{p.cta}</Button>
                : <a href={waLink} target="_blank" rel="noreferrer" style={{ display: "block" }}><Button full size="lg" variant={p.highlight ? "primary" : "secondary"} icon="MessageCircle">{p.cta}</Button></a>}
            </Card>
          ))}
        </div>
      </Section>

      {/* CTA final */}
      <Section style={{ paddingBottom: 80 }}>
        <Card glow pad={40} style={{ textAlign: "center", background: "linear-gradient(180deg, rgba(0,232,122,0.08), var(--card))", borderColor: "color-mix(in srgb, var(--green) 35%, transparent)" }}>
          <h2 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10 }}>Probalo con tu primer equipo, gratis</h2>
          <p className="muted" style={{ fontSize: "var(--t-base)", maxWidth: 540, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Creá tu cuenta de facilitador en un minuto y corré tu primera sesión. ¿Sos una empresa? Escribinos y armamos tu plan Business.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Button size="lg" icon="Rocket" onClick={() => router.push("/registro")}>Empezá gratis</Button>
            <a href={waLink} target="_blank" rel="noreferrer">
              <Button size="lg" variant="secondary" icon="MessageCircle">Hablar con ventas</Button>
            </a>
          </div>
          <p className="faint" style={{ fontSize: "var(--t-xs)", marginTop: 16 }}>¿Ya tenés cuenta? <button onClick={() => router.push("/login")} style={{ color: "var(--green)", fontWeight: 600 }}>Iniciar sesión</button></p>
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
