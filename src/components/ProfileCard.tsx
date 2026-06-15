"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button, Card, SectionTitle } from "@/components/ui";
import { ROLES } from "@/lib/data";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/Toast";

/** Perfil mínimo y autónomo: cambiar nombre, cambiar contraseña y cerrar sesión.
 *  Sirve para los roles que no tienen la página completa de Ajustes (miembro, coordinador). */
export function ProfileCard() {
  const router = useRouter();
  const { user, logout, updateName, updatePassword } = useAuth();
  const { show } = useToast();
  const [nameDraft, setNameDraft] = useState(user?.name ?? "");
  const [passDraft, setPassDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const role = ROLES[user?.role ?? "member"];
  const doLogout = () => { logout(); router.replace("/login"); };

  const save = async () => {
    if (saving || !user) return;
    setSaving(true);
    if (nameDraft.trim().length >= 2 && nameDraft.trim() !== user.name) {
      const res = await updateName(nameDraft);
      if (res.error) { setSaving(false); show(res.error, "TriangleAlert"); return; }
    }
    if (passDraft) {
      if (passDraft.length < 6) { setSaving(false); show("La contraseña debe tener al menos 6 caracteres.", "TriangleAlert"); return; }
      const res = await updatePassword(passDraft);
      if (res.error) { setSaving(false); show(res.error, "TriangleAlert"); return; }
      setPassDraft("");
    }
    setSaving(false);
    show("Perfil actualizado.");
  };

  const inputStyle: React.CSSProperties = { width: "100%", background: "var(--card-2)", border: "1px solid var(--line-2)", borderRadius: "var(--r-md)", color: "var(--ink-0)", padding: "11px 13px", fontSize: "var(--t-base)", outline: "none" };

  return (
    <Card pad={22} style={{ maxWidth: 520 }}>
      <SectionTitle icon="UserRound">Tu perfil</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
        <Avatar name={user?.name} initials={user?.initials} size={64} idx={4} />
        <div>
          <div style={{ fontWeight: 700, fontSize: "var(--t-lg)" }}>{user?.name ?? "—"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: role.color }} />
            <span className="muted" style={{ fontSize: "var(--t-sm)" }}>{role.label}</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Nombre y apellido</label>
          <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Correo <span className="faint" style={{ textTransform: "none", letterSpacing: 0 }}>(no se puede cambiar)</span></label>
          <input value={user?.email || "—"} readOnly style={{ ...inputStyle, border: "1px solid var(--line)", color: "var(--ink-2)" }} />
        </div>
        <div>
          <label className="eyebrow" style={{ display: "block", marginBottom: 7 }}>Nueva contraseña <span className="faint" style={{ textTransform: "none", letterSpacing: 0 }}>(opcional)</span></label>
          <input type="password" value={passDraft} onChange={(e) => setPassDraft(e.target.value)} placeholder="Dejala vacía para no cambiarla" style={inputStyle} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
        <Button icon="Check" disabled={saving} onClick={save}>{saving ? "Guardando…" : "Guardar cambios"}</Button>
        <Button variant="ghost" icon="LogOut" onClick={doLogout}>Cerrar sesión</Button>
      </div>
    </Card>
  );
}
