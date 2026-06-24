# Plan de desarrollo — Capa individual (1-a-1 + 360) y profundización del loop

> Plan técnico para validar antes de implementar. OKR descartado.
> Dos tracks independientes: **A) módulo 1-a-1 + 360** y **B) profundizar el loop**.
> Stack base y convenciones: ver `PLAN-TECNICO.md` (Next 16, Supabase+RLS, Zustand, jsonb-heavy, repository layer, sala monolito).

---

## Contexto

- **A) 1-a-1 + 360:** extender el mismo modelo del loop a la **capa individual**. El 1-a-1 es "el loop de la persona": 360 (diagnóstico) → conversación → compromisos → próximo 360 (avance). **Desarrollo, no evaluación.** El anonimato de pares y la privacidad del 1-a-1 son innegociables (son el cimiento de la confianza).
- **B) Profundizar el loop:** hacer real la "mejora medible" (la señal que se mueve) y cerrar el ciclo de aprendizaje. Es donde el producto es único → **se hace primero**.

---

# PARTE A — Módulo 1-a-1 + 360 (capa individual)

> ⚠️ Es el más pesado de todo: **necesita tablas nuevas + RLS fina** (a diferencia de casi todo lo anterior, que vivía en jsonb). No es un fin de semana.

## A.0 Principio de diseño
El 1-a-1 espeja el loop, pero para la persona:

| Loop del equipo | 1-a-1 de la persona |
|---|---|
| Pulso/Radar | **360 de competencias** (auto + líder + pares) |
| Conversación de la etapa | **1-a-1 guiado** (agenda sembrada por las brechas + señales del equipo) |
| Compromisos del loop | **Compromisos de desarrollo** (se arrastran) |
| Señal que se mueve | **Competencia que mejora** entre 360 y 360 |

El valor está en la **brecha** (auto vs. líder vs. pares): puntos ciegos y fortalezas ocultas. El 360 **alimenta la conversación**, no es una encuesta suelta.

## A.1 Modelo de datos

**Competencias (config, reusa el patrón `pulseDims`):**
- `teams.data.competencies: { key, label }[]` (jsonb, sin migración). Default = un set base (Comunicación, Autonomía, Colaboración, Foco en resultados, Aprendizaje…). Editable por el líder, igual que "¿Qué medimos?" del pulso.

**Tablas nuevas (migración):**
- `talent_reviews` — un ciclo de 360 de una persona.
  `id uuid pk · team_id (fk) · subject_user_id (fk auth.users) · status (open|closed) · competencies jsonb (snapshot) · created_by · created_at · closed_at`
- `talent_ratings` — cada evaluación (de un rater sobre el subject).
  `id uuid pk · review_id (fk) · rater_user_id (fk) · rater_role (self|leader|peer) · ratings jsonb {compKey:1-5} · comment text? · created_at` · UNIQUE(review_id, rater_user_id)
- `one_on_ones` — la conversación.
  `id uuid pk · team_id (fk) · leader_user_id (fk) · member_user_id (fk) · date · review_id (fk?) · agenda jsonb · notes text (privado) · commitments jsonb [{text,who,status,due}] · created_at`

## A.2 RLS / privacidad (lo más delicado del módulo)
- **`talent_ratings`:** cada rater escribe **solo lo suyo** (`rater_user_id = auth.uid()`). **Nunca** se expone el rating individual de un par. La lectura **agregada** va por **RPC `security definer`** `get_review_aggregate(review_id)` que devuelve: self, leader, y **promedio de pares (mínimo 3, si no, oculto)**. El subject ve su agregado; el líder lo ve.
- **`one_on_ones`:** visibles solo a **líder + miembro** (`leader_user_id = auth.uid() OR member_user_id = auth.uid()`). Las `notes` son del 1-a-1 (compartidas líder↔miembro), no públicas.
- **`talent_reviews`:** lectura por `visible_team_ids()`; escritura líder/admin.
- **RPCs nuevas:** `get_review_aggregate(review_id)`, `submit_talent_rating(review_id, ratings, comment)`, `set_my_oneonone_commitment(oneonone_id, text, status)` (espeja la de loops).

## A.3 Repositorio / store
- Nuevas funciones: `createReview`, `closeReview`, `submitTalentRating` (rpc), `getReviewAggregate` (rpc), `getReviewsForTeam`, `createOneOnOne`, `updateOneOnOne`, `getOneOnOnes(memberId|leaderId)`, `setMyOneOnOneCommitment` (rpc).
- Store: cargar `one_on_ones` y `talent_reviews` de los equipos visibles (o lazy por página para no inflar `loadData`).

## A.4 IA (Norte)
- Nuevo kind `oneononePrep` en `/api/ai/norte`: arma la **agenda del 1-a-1** a partir de (brechas del 360 + señales del equipo + compromisos arrastrados). Reusa el patrón `authAndPlan` + tool_use.

## A.5 UI / rutas
- **Facilitador — sección "Personas"** (pestaña nueva en el equipo, o `/equipos/[id]/personas`): por cada miembro → **radar de brecha** (PulseRadar con `compare`: auto vs. otros), historial de 1-a-1s, botones **[Iniciar 360]** / **[Abrir 1-a-1]**.
- **Flujo 360:** crear review → invitar raters (líder + pares) → puntúan (reusa la UI de rating del pulso) → cerrar → radar de brecha + comentarios.
- **Vista 1-a-1:** agenda (Norte) + notas privadas + compromisos (reusa el patrón de compromisos).
- **Miembro:** auto-evaluarse en su review, puntuar a pares cuando lo invitan, y ver sus 1-a-1s + compromisos (el home del miembro ya tiene "Tus compromisos" → se extiende a los de 1-a-1).

## A.6 Workstreams (Parte A)
| WS | Qué | Tamaño | Riesgo |
|---|---|---|---|
| A1 | Migración: 3 tablas + RLS + RPCs (hand-off SQL) | L | 🔴 privacidad |
| A2 | Config de competencias (jsonb, reusa pulseDims) | S | 🟢 |
| A3 | Flujo 360 (crear/invitar/puntuar/cerrar) | M | 🟠 |
| A4 | Radar de brecha (reusa PulseRadar compare) | S | 🟢 |
| A5 | Vista 1-a-1 + compromisos + RPC | M | 🟡 |
| A6 | Norte: prep de agenda del 1-a-1 | S–M | 🟢 |
| A7 | Lado miembro (auto-eval, puntuar pares, ver 1-a-1s) | M | 🟡 |

---

# PARTE B — Profundización del loop

> Reusa casi todo lo ya construido (LoopThread, compromisos, señal/webhook, consolidación). Bajo riesgo, alto valor. **Va primero.**

## B.1 Señal real / integraciones 🥇
- **Ya hecho:** webhook por loop (`/api/signal/[initId]`) + carga manual/CSV (`SignalSource`).
- **Sumar:** documentar "recetas" de integración (Sheets+Zapier/Make, n8n, script) — sin OAuth propio (evita mantenimiento). Opcional a futuro: conector Sheets nativo (M–L, **no** MVP).
- **Norte "calidad de la apuesta":** chequeo (¿señal? ¿meta? ¿plazo?) al diseñar — reglas, sin IA obligatoria.
- Tamaño: **S** (recetas + nudge); L si se hace conector OAuth (diferir).

## B.2 Decisión adaptativa (Norte)
- En Aprender / detalle del loop: según el **delta de la señal vs. la meta**, sugerir **iterar / pivotar / implementar / pausar** (reglas determinísticas + rationale opcional de IA). Cierra el ciclo de aprendizaje. Reusa `loopThread` + el `LoopRing` que ya dobla en iterar/pivotar.
- Tamaño: **M** · riesgo 🟢.

## B.3 Accountability entre sesiones
- **Ya hecho:** TeamCommitments + RPC del miembro + nudges in-app.
- **Sumar:** recordatorios (cron) de compromisos vencidos + vista transversal "qué nos comprometimos / qué cumplimos" por loop. El cron = hand-off de infra (pg_cron, ya habilitado).
- Tamaño: **S–M** · riesgo 🟡 (cron).

## B.4 Verificar consolidación
- **Ya existe:** `consolidate.pending/due` + el recordatorio.
- **Sumar:** reforzar el "check" (¿el cambio aguantó 30 días? sí/parcial/no) como confirmación explícita, que alimenta el `LoopThread` (decision/outcome). Tamaño: **S**.

## B.5 Compounding
- Norte sobre la Biblioteca: al **crear/diseñar** un loop, sugerir aprendizajes pasados relevantes ("ojo, ya probaron X"). Reusa `/api/ai/library`.
- Tamaño: **M** · riesgo 🟢.

---

## Migraciones / hand-offs (SQL que corrés vos)
1. **Parte A:** las 3 tablas + sus policies RLS + las RPCs (`get_review_aggregate`, `submit_talent_rating`, `set_my_oneonone_commitment`). Es la entrega de SQL más grande hasta ahora.
2. **Parte B:** (opcional) un `cron.schedule` para recordatorios de compromisos vencidos (pg_cron ya está habilitado).

## Riesgos
- **Parte A:** privacidad/RLS (anonimato de pares, 1-a-1 privado) — lo más sensible; tablas nuevas; sin tests automatizados → validar a mano con cuidado.
- **Parte B:** evitar el conector OAuth de Sheets (mantenimiento) — usar webhook/recetas. Bajo riesgo en general.

## Secuencia recomendada (sprints)
- **Sprint 1 (B):** B1 (señal: recetas + nudge de calidad) + B2 (decisión adaptativa). *Donde sos único, bajo riesgo.*
- **Sprint 2 (B):** B3 (accountability + recordatorios) + B4 (consolidación) + B5 (compounding).
- **Sprint 3 (A):** A1 (migración+RLS) + A2 (competencias) + A3 (flujo 360) + A4 (radar de brecha). *Núcleo del 360.*
- **Sprint 4 (A):** A5 (1-a-1 + compromisos) + A6 (Norte prep) + A7 (lado miembro). *El 1-a-1 completo.*

> Recomendación: hacer **toda la Parte B primero** (refuerza el moat, bajo riesgo) y la **Parte A** cuando tengas un equipo corriendo loops de verdad (el módulo grande, con su SQL/RLS).

## Decisiones de la Parte A (resueltas)
1. **Competencias:** editables por equipo (reusa el patrón `pulseDims` / "¿Qué medimos?").
2. **Dispara el 360:** solo el líder/facilitador.
3. **Elige los pares:** el líder/facilitador (flujo de invitación lo arma el líder).
4. **Modo:** **ambos.** Base = on-demand por persona (`talent_reviews` es por `subject_user_id`). Ciclo de equipo = atajo que crea N reviews en lote (uno por miembro); opcional un `cycle_id`/tag para agruparlas en la vista. El líder elige cada vez.

Implicancias de diseño:
- No hay "auto-360" del miembro: el miembro solo **responde** (auto-eval + puntuar pares cuando el líder lo invita).
- El líder, al crear el review, **selecciona los pares** que van a puntuar → genera las invitaciones/visibilidad de rating para esa review.
- El "ciclo de equipo" reusa el mismo flujo, en lote.
