"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Avatar, Button, Card, Pill, SectionTitle } from "@/components/ui";
import { CURRENT_USER, MY_ORG, ROLES } from "@/lib/data";
import { getFacilitators, getTeams } from "@/lib/repository";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/Toast";

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)}
      style={{ width: 42, height: 24, borderRadius: 99, background: on ? "var(--green)" : "var(--card-2)", border: "1px solid " + (on ? "var(--green)" : "var(--line-2)"), position: "relative", flex: "none", transition: "background .18s" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: 99, background: on ? "#06121f" : "var(--ink-2)", transition: "left .18s var(--spring)" }} />
    </button>
  );
}

function Field({ label, value, type = "text" }: { label: string; value: string; type?: string }) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>{label}</label>
      <input type={type} value={v} onChange={(e) => setV(e.target.value)}
        style={{ width: "100%", background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" }} />
    </div>
  );
}

function SettingRow({ title, desc, control }: { title: string; desc: string; control: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "var(--t-sm)", fontWeight: 600 }}>{title}</div>
        <div className="muted" style={{ fontSize: "var(--t-xs)", marginTop: 2 }}>{desc}</div>
      </div>
      {control}
    </div>
  );
}

const TABS = [
  { key: "perfil", label: "Perfil", icon: "UserRound" },
  { key: "org", label: "Organización", icon: "Building2" },
  { key: "notif", label: "Notificaciones", icon: "Bell" },
  { key: "plan", label: "Plan", icon: "CreditCard" },
];

export default function AjustesPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { show } = useToast();
  const [tab, setTab] = useState("perfil");
  const [notif, setNotif] = useState({ checkin: true, safety: true, weekly: false, mentions: true });
  const profile = user ?? CURRENT_USER;
  const role = ROLES[user?.role ?? "admin"];
  const doLogout = () => { logout(); router.replace("/login"); };
  const orgName = user?.role === "superadmin" ? "Growthloop · plataforma" : (user?.orgName || MY_ORG.name);
  const orgStats = { facilitadores: getFacilitators().length, equipos: getTeams().length, sesiones: 0 };

  return (
    <div className="screen-pad">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Ajustes</h1>
        <p className="muted" style={{ marginTop: 4 }}>Perfil, organización, notificaciones y plan.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24, alignItems: "start" }} className="team-grid">
        {/* sub-nav */}
        <Card pad={8} style={{ position: "sticky", top: 16 }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {TABS.map((t) => {
              const on = tab === t.key;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: "var(--r-md)", textAlign: "left", fontSize: "var(--t-sm)", fontWeight: on ? 600 : 500, color: on ? "var(--ink-0)" : "var(--ink-2)", background: on ? "var(--card-2)" : "transparent", borderLeft: on ? "2px solid var(--green)" : "2px solid transparent" }}>
                  <span style={{ color: on ? "var(--green)" : "var(--ink-2)", display: "inline-flex" }}><Icon name={t.icon} size={17} /></span>
                  {t.label}
                </button>
              );
            })}
          </nav>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          {tab === "perfil" && (
            <Card pad={22}>
              <SectionTitle icon="UserRound">Tu perfil</SectionTitle>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
                <Avatar name={profile.name} initials={profile.initials} size={64} idx={0} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "var(--t-lg)" }}>{profile.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: role.color }} />
                    <span className="muted" style={{ fontSize: "var(--t-sm)" }}>{role.label}</span>
                  </div>
                </div>
                <Button size="sm" variant="secondary" icon="Camera" style={{ marginLeft: "auto" }} onClick={() => show("Subí tu foto de perfil (demo).", "Camera")}>Cambiar foto</Button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="modesel-grid">
                <Field label="Nombre y apellido" value={profile.name} />
                <Field label="Correo" value={profile.email || "—"} type="email" />
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
                <Button icon="Check" onClick={() => show("Cambios guardados.")}>Guardar cambios</Button>
                <Button variant="ghost" icon="LogOut" onClick={doLogout}>Cerrar sesión</Button>
              </div>
            </Card>
          )}

          {tab === "org" && (
            <Card pad={22}>
              <SectionTitle icon="Building2" sub="Datos de tu espacio de trabajo">Organización</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="modesel-grid">
                <Field label="Nombre" value={orgName} />
                <Field label="Plan" value={MY_ORG.plan} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 20 }} className="modesel-grid">
                {[["Facilitadores", orgStats.facilitadores], ["Equipos", orgStats.equipos], ["Sesiones/mes", orgStats.sesiones]].map(([l, v]) => (
                  <div key={l} style={{ background: "var(--card-2)", border: "1px solid var(--line)", borderRadius: "var(--r-md)", padding: "14px 16px" }}>
                    <div className="num" style={{ fontSize: "var(--t-xl)", fontWeight: 700 }}>{v}</div>
                    <div className="muted" style={{ fontSize: "var(--t-xs)" }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 22 }}>
                <Button variant="secondary" icon="UsersRound" onClick={() => router.push("/facilitadores")}>Gestionar facilitadores</Button>
              </div>
            </Card>
          )}

          {tab === "notif" && (
            <Card pad={22}>
              <SectionTitle icon="Bell" sub="Elegí cuándo querés que te avisemos">Notificaciones</SectionTitle>
              <SettingRow title="Check-in atrasado" desc="Cuando vence el seguimiento de una prueba sin registrar avance." control={<Toggle on={notif.checkin} onChange={(v) => setNotif((n) => ({ ...n, checkin: v }))} />} />
              <SettingRow title="Seguridad psicológica baja" desc="Cuando un equipo cae por debajo del umbral del 70%." control={<Toggle on={notif.safety} onChange={(v) => setNotif((n) => ({ ...n, safety: v }))} />} />
              <SettingRow title="Resumen semanal" desc="Un correo los lunes con el estado de tus equipos." control={<Toggle on={notif.weekly} onChange={(v) => setNotif((n) => ({ ...n, weekly: v }))} />} />
              <SettingRow title="Menciones y comentarios" desc="Cuando alguien te menciona en una sesión o reporte." control={<Toggle on={notif.mentions} onChange={(v) => setNotif((n) => ({ ...n, mentions: v }))} />} />
            </Card>
          )}

          {tab === "plan" && (
            <Card pad={22}>
              <SectionTitle icon="CreditCard">Tu plan</SectionTitle>
              <Card glow pad={20} style={{ background: "linear-gradient(180deg, rgba(0,232,122,0.06), var(--card))", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <Pill color="var(--green)" bg="var(--success-bg)" icon="Sparkles">Plan {MY_ORG.plan}</Pill>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10 }}>
                      <span className="num" style={{ fontSize: "var(--t-3xl)", fontWeight: 800 }}>9</span>
                      <span className="muted">equipos activos · facturación mensual</span>
                    </div>
                  </div>
                  <Button variant="secondary" icon="ArrowUpRight" onClick={() => show("Te contactamos para cambiar de plan.", "ArrowUpRight")}>Cambiar de plan</Button>
                </div>
              </Card>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {["Equipos ilimitados", "Sesiones en vivo y asíncronas", "Reportes ejecutivos para el sponsor", "Soporte prioritario"].map((b) => (
                  <div key={b} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: "var(--t-sm)" }}>
                    <span style={{ color: "var(--green)", display: "inline-flex" }}><Icon name="Check" size={16} /></span>{b}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
