# Supabase — esquema y migraciones de Growthloop

Estas migraciones son la **fuente de verdad** del esquema. A partir de ahora,
todo cambio de base se agrega como un archivo nuevo acá (nunca SQL suelto).

## Archivos

| Orden | Archivo | Qué hace |
|------|---------|----------|
| 0001 | `20260606090001_baseline_schema.sql` | Esquema actual reconstruido desde el código. **Idempotente** (`if not exists`): en tu proyecto existente es no-op para las tablas que ya tenés. Sirve para entornos nuevos y como documentación. |
| 0002 | `20260606090002_live_sessions.sql` | **NUEVO.** Tablas de sesión en vivo (multiplayer) + vista de anonimato + Realtime. Esto sí crea cosas en tu base. |

> Próxima migración (0003): **RLS** — políticas por rol/membresía. La hacemos
> después de tener andando el primer flujo multiplayer (el slice de Pulso).

## Cómo correrlas

**Opción A — SQL Editor (lo que venís haciendo):**
Abrí cada archivo, pegá su contenido en el SQL Editor del proyecto y `Run`.
Corré primero 0001, después 0002.

**Opción B — Supabase CLI (recomendado a futuro):**
```bash
supabase link --project-ref ukxjjlpbozwiyohttphe
supabase db push
```

## Notas

- **`profiles`**: el baseline incluye una reconstrucción. Si ya tenés esa tabla
  con otras columnas, el `create table if not exists` no la toca — verificá que
  tenga al menos `role`, `org_id`, `team_id` (los usa el scoping/auth).
- **`variables` y `experiments`** son del modelo viejo (a deprecar en favor de
  `initiatives`). Quedan en el baseline para no romper la carga actual.
- **Anonimato de tarjetas**: leé siempre desde la vista `session_cards_view`
  (enmascara el autor de las anónimas). Escribí en `session_cards`.
