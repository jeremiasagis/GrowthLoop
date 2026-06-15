"use client";

import { ProfileCard } from "@/components/ProfileCard";

export default function MemberPerfilPage() {
  return (
    <div className="screen-pad">
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: "var(--t-2xl)", fontWeight: 800, letterSpacing: "-0.02em" }}>Perfil</h1>
        <p className="muted" style={{ marginTop: 4 }}>Tu nombre y tu contraseña.</p>
      </div>
      <ProfileCard />
    </div>
  );
}
