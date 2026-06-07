/**
 * Growthloop — Crea los usuarios de prueba en Supabase Auth.
 * Usa la anon key + signUp (no necesita la service_role key).
 * El trigger `handle_new_user` crea el profile con el rol del metadata.
 *
 * Requisitos previos:
 *   1) Haber corrido supabase/profiles.sql en el SQL Editor.
 *   2) Haber desactivado "Confirm email" en Authentication settings.
 *
 * Cómo correrlo (desde la carpeta growthloop):
 *   node --env-file=.env.local scripts/seed-auth.mjs
 */

import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ¿Corriste con --env-file=.env.local?");
  process.exit(1);
}

const USERS = [
  { email: "superadmin@growthloop.com", password: "password",
    data: { name: "Sol Vega", initials: "SV", role: "superadmin" } },
  { email: "admin@bancandino.com", password: "password",
    data: { name: "Roberto Méndez", initials: "RM", role: "admin", org_id: "o1", org_name: "Banco Andino" } },
  { email: "daniela@bancandino.com", password: "password",
    data: { name: "Daniela Ríos", initials: "DR", role: "facilitator", org_id: "o1", org_name: "Banco Andino" } },
  { email: "juan@bancandino.com", password: "password",
    data: { name: "Juan Morales", initials: "JM", role: "member", org_id: "o1", org_name: "Banco Andino", team_id: "t1" } },
  { email: "jeremiasagis@gmail.com", password: "123456",
    data: { name: "Jeremías Agis", initials: "JA", role: "superadmin", org_id: "o1", org_name: "Banco Andino", team_id: "t1", can_switch_role: "true" } },
];

for (const u of USERS) {
  const supabase = createClient(URL, KEY);
  const { data, error } = await supabase.auth.signUp({
    email: u.email,
    password: u.password,
    options: { data: u.data },
  });
  if (error) {
    console.log(`✗ ${u.email.padEnd(28)} → ${error.message}`);
  } else {
    console.log(`✓ ${u.email.padEnd(28)} → ${u.data.role}${data.user ? "" : " (revisar)"}`);
  }
  await supabase.auth.signOut();
}

console.log("\nListo. Si alguno dice 'User already registered', ya existía (está OK).");
