# Growthloop — Plan técnico de desarrollo

> Cómo está construido hoy + cómo implementar los cambios del PLAN-PRODUCTO.md.
> Visión de ingeniería: workstreams, dependencias, tamaño, riesgo y orden de ejecución.

---

## 0. Cómo está construido hoy (as-is)

**Stack**
- **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**.
- **Supabase** = fuente de verdad: Postgres + **RLS** + Realtime.
- **Zustand** (`src/lib/store.ts`) = caché en memoria del cliente; lecturas **síncronas**; tras cada write se llama `reloadData()` (refetch completo).
- **IA** = Route Handlers (`app/api/ai/*`, runtime nodejs) que llaman a Anthropic; la API key vive solo en el server; gating por `authAndPlan`.
- **Deploy** Vercel.

**Flujo de datos**
```
Supabase (RLS, source of truth)  →  Zustand store (sync, reloadData tras write)  →  Componentes
```

**Persistencia: muy basada en JSONB** (ventaja clave para iterar sin migraciones):
- `sessions.result` (jsonb) — estado vivo de la sesión por paso.
- `initiatives.data` (jsonb) — `InitiativeData` con sub-objetos `focus / proof / follow / learn / consolidate`.
- `teams.data` (jsonb) — `TeamData` (contract, cadence, objective, foda, library, celebrated…).
- `sessions.mode` (`live|async`) — **ya existe**, hoy casi sin uso (lo usamos para el async-collection actual).

**Motor de sesión (la "sala")**
- `src/app/sala/[sessionId]/page.tsx` ≈ **8000 líneas, un solo componente** con dispatch por `session.type` (`if (session.type === "X")` por retro).
- `STEP_SEQ[type] = string[]` define la secuencia de pasos; `setStep(sessionId, stepKey, idx)` avanza.
- `needsAll` (lista de stepKeys) controla cuándo se cargan TODAS las tarjetas (anti-anonimato durante la escritura).
- `finalizeSession(session, opts)` cierra: loguea, guarda en `initiatives.data[dataKey]`, opcional `stageOverride`, marca `finalized` (RPC `merge_session_result`), `status="closed"`.
- Realtime (`subscribeSession`) + **polling 2s** de fallback.
- `isFacil` ramifica facilitador vs miembro **en todo el componente**.

**Retros** (`src/lib/retros/registry.ts`)
- `RetroDefinition`: `id, name, stage, category, sessionType, entryStep, phases[], duration, asyncAvailable, sensitive, recommended, implemented, …`.
- `RetroPhase = { name, minutes?, note? }` — **sin tag async/live por fase** (solo el flag a nivel retro).
- ~52 retros. `CANONICAL_RETRO` (la primaria por etapa) ya existe.

**Modelo de loop (initiative)**
- Etapas actuales: **focus / ideation / follow / learn** (Analizar/Diseñar/Probar/Aprender). `normalizeStage` mapea legacy.
- La **progresión de etapa es manual** (el facilitador cierra la etapa); `nextStageForward` hoy se usa solo para logging.

**Output**
- `RetroResult.tsx` reconstruye la salida **por tipo** (`teamradar→radar`, `whyhappening→árbol`, etc.). Cada retro guarda en `result` con **claves propias no normalizadas** (`trAvg`, `whRoot`, `fwDecision`, …).
- `loadSessionMemories` arma las memorias (resiliente).

**Roles & RLS**
- Roles: superadmin / admin / facilitator / coordinator / member.
- `visible_org_ids() / visible_team_ids() / visible_session_ids()` + `my_role/my_org/my_team`.
- **El miembro NO puede escribir `initiatives`** (RLS). RPCs existentes: `merge_session_result`, `join_session_by_code`, `accept_invitation`, `get_invitation_by_token`.

**Navegación**
- `AppShell` con `navItemsFor(role)`; `access.ts` con PREFIXES por rol; `MemberChrome` para miembros.
- `equipos/[id]` (~1200 líneas) con sistema de tabs (Catálogo, Loops, Sesiones, Pulso, Ritmo) + sidebar (Progreso + Madurez).

**Testing**
- ⚠️ **No hay suite de tests automatizados.** Hoy se valida con `tsc --noEmit` + `next build` + prueba manual. Es un riesgo para los refactors grandes (ver §5).

---

## 1. Diagnóstico técnico: los cimientos a tocar (y su riesgo)

| # | Cimiento | Estado | Por qué importa | Riesgo |
|---|---|---|---|---|
| **A** | **El monolito de la sala** | 1 componente de 8k líneas | Async por fase, playbooks y output normalizado lo tocan | 🔴 Alto |
| **B** | **Outputs no normalizados** | cada retro guarda claves propias | Bloquea expediente del loop, capa de info y activo de datos | 🟠 Medio-alto |
| **C** | **Progresión de etapa manual** | sin motor de avance | El "loop como héroe" y los playbooks necesitan orquestar el camino | 🟡 Medio |
| **D** | **Writes de miembro bloqueados (RLS)** | solo facilitador escribe initiatives | El miembro no puede marcar sus compromisos | 🟢 Bajo (RPC acotada) |
| **E** | **Sin jobs en background** | todo es client-driven | Autocierre de async, nudges, recordatorios de consolidación | 🟡 Medio (infra nueva) |

> **Insight de ingeniería:** B (normalización de output) es **el desbloqueo central**. Sin un output normalizado por etapa, ni el expediente del loop, ni la inteligencia, ni el benchmark cross-org son confiables. Hay que hacerlo temprano y diseñarlo para **backfillear** desde lo que ya existe.

---

## 2. Decisiones de arquitectura clave

1. **Normalización de output (B):** agregar a `InitiativeData` un resumen normalizado por etapa — el **`LoopThread`**:
   ```
   data.thread = {
     symptom?, rootCause?, bet?: { if, then, signalMetric, signalTarget },
     signal?: { now, delta }, learning?, decision?
   }
   ```
   Se completa en `finalizeSession` (un mapeo por tipo de retro → campos del thread) y se **backfillea** computándolo desde `data.focus/proof/follow/learn` ya guardado. El expediente, el tablero y la inteligencia leen de `thread`, no de claves sueltas.

2. **Refactor de la sala (A): estrangulamiento, no big-bang.** Extraer gradualmente:
   - un **PhaseEngine** (estado de paso, async/live, gates) desacoplado del render;
   - los bloques por retro a componentes (`<Retro_Foda/>`, etc.) movidos de a uno.
   Nunca reescritura total. Cada extracción se valida con build + prueba manual.

3. **Async por fase (D-async):** tag por fase en el registry (`phases[i].mode: "async"|"live"`); el deadline va en `sessions.result.asyncUntil` (ya lo usamos); reusar la recolección de miembro existente; **Supabase Edge Function + pg_cron** para autocierre y nudges (infra E).

4. **Playbooks: data-driven, sin motor nuevo.** Una constante `LOOP_PLAYBOOKS` (+ opcional tabla a futuro). Crear loop desde un playbook = pre-setear stage→retro, señal y seed en `initiatives.data`. No cambia el engine.

5. **Superadmin & activo de datos:** las lecturas operacionales ya las permite RLS (superadmin ve todo). La **inteligencia cross-org** se sirve por **vistas SQL agregadas + anonimizadas** o RPC `security definer`, diseñadas sin PII desde el día 1.

6. **Member writes (D):** una RPC `set_my_commitment_status(initId, commitText, status)` `security definer` que valida que el usuario pertenece al equipo y solo toca el item que le corresponde.

---

## 3. Workstreams técnicos (mapeo cambio → trabajo)

> Tamaño: **S** = días · **M** = 1–2 semanas · **L** = semanas.

### WS1 — Fundaciones (output normalizado + extracción del motor) · **L** · riesgo 🔴
- Definir `LoopThread` en `data.ts`; mapear cada retro a campos del thread en `finalizeSession`.
- Backfill: función que computa `thread` desde `data.focus/proof/follow/learn` existentes.
- Empezar la extracción del PhaseEngine de la sala (primer corte: estado de paso + gates).
- **Depende de:** nada. **Habilita:** WS4, WS5, WS8.

### WS2 — Loop Playbooks · **M** · riesgo 🟢
- `LOOP_PLAYBOOKS` (5 recetas + express + a medida) con `{ camino[], señal, seed }`.
- Flujo "Crear loop": entrada por síntoma → playbook → `createInitiative` con `data` pre-seteada (seed + señal + camino).
- Reusar `InitiativeModal` + `SessionLauncher`.
- **Depende de:** curaduría (primarias). **Habilita:** "loop como héroe".

### WS3 — Reorg del catálogo · **M** · riesgo 🟢
- Extender `RetroDefinition`: `purpose`, `isTool` (vs paso de loop), `primaryOf?` (output canónico), `variants?`.
- Curar data (primarias/variantes/cortes) — trabajo de datos, no de motor.
- UI: catálogo por **propósito** + entrada por **síntoma** + separación "pasos del loop / caja de herramientas". Reescribir `RetroCatalog`.
- **Depende de:** decisiones del §10 (ya tomadas).

### WS4 — Híbrido async/sync · **L** · riesgo 🟠
- `phases[i].mode` en el registry (etiquetar las fases de las retros principales).
- Las **dos pantallas** (abrir trabajo / cómo seguimos) — nuevos componentes en el flujo de sesión.
- **Precarga**: la sesión en vivo arranca con el output async ya cargado (el PhaseEngine de WS1 lo habilita).
- Deadlines + nudges in-app (reusa async-collection actual).
- **Edge Function + pg_cron** (WS-infra) para autocierre opcional.
- **Depende de:** WS1 (engine).

### WS5 — Capa de información · **L** · riesgo 🟠
- **Expediente del loop** (one-pager con el hilo) → nueva cabecera del detalle del loop, lee `thread` (WS1). El detalle por etapa queda plegado.
- **Output de retro legible**: insight destilado por Norte arriba; reusar `RetroResult` debajo.
- **Tablero del equipo** unificado (compone lo que ya existe: loops + pulso + madurez + compromisos + relato).
- **Home de organización** (Nivel 4) que junte benchmark/reporte/digest (ya hechos).
- **Depende de:** WS1 (normalización).

### WS6 — Experiencia del miembro · **M** · riesgo 🟢
- RPC `set_my_commitment_status` (migración SQL que corre el usuario).
- Nuevo home del miembro: **Tu parte / Nuestro progreso / Mi voz** (reescribir `member/page.tsx`).
- `MemberLoopCard` (read-only, hilo simple).
- **Depende de:** WS1 (thread, para "Nuestro progreso") + WS-infra (RPC).

### WS7 — Norte coach · **L** · riesgo 🟠
- **Proactivo:** reglas determinísticas (clima cayendo, loop estancado, deadline) → card "Norte sugiere" in-app (reusa el patrón de `buildTriage`).
- **Puente async→vivo:** endpoint que pre-agrupa/resume las tarjetas async (nuevo `/api/ai/cluster` o kind en norte).
- **Guía del playbook:** textos contextuales por paso (data, no IA).
- (Más adelante) coach en vivo.
- **Depende de:** WS2 (playbooks), WS4 (async).

### WS8 — Consola de plataforma + activo de datos · **L** · riesgo 🟠 (privacidad)
- Ruta `consola-admin` (superadmin): usuarios / orgs / equipos / loops, buscable y filtrable; métricas de plataforma. Lecturas ya permitidas por RLS.
- **Inteligencia agregada:** vistas SQL **anonimizadas/agregadas** (causas comunes por industria, tasa de éxito por tipo de loop). Diseñar sin PII + consentimiento en ToS desde el día 1.
- **Depende de:** WS1 (thread normalizado para agregar) + decisión de privacidad (§10 Q8/Q9, ya tomada).

### WS-infra — Background jobs · **M** · riesgo 🟡
- Supabase **Edge Functions** + **pg_cron**: autocierre de async vencido, nudges de compromisos/consolidación, recordatorios.
- (Diferido) email/push — por ahora todo in-app.

---

## 4. Plan de fases técnico (alineado al producto)

| Fase producto | Workstreams técnicos | Tamaño | Prerrequisito |
|---|---|---|---|
| **F0 — Validación + curaduría** | datos: primarias/variantes/propósitos + etiquetar `phases[i].mode` | S–M | — |
| **F1 — Loop como héroe** | **WS2** (playbooks) + parte de **WS1** (thread + backfill) | M–L | F0 |
| **F2 — Reorg catálogo** | **WS3** | M | F0 |
| **F3 — Capa de información** | **WS5** (necesita WS1 completo) + **WS6** (miembro) | L | WS1 |
| **F4 — Híbrido async/sync** | **WS4** + **WS-infra** | L | WS1 |
| **F5 — Norte coach** | **WS7** | L | WS2, WS4 |
| **F6 — Consola + activo de datos** | **WS8** + **WS-infra** | L | WS1 |
| **F7 — Pulido premium** | onboarding, packaging | M | todo |

> **Camino crítico:** **WS1 (fundaciones)** atraviesa casi todo. Conviene arrancar WS1 en paralelo con F0/F1 aunque no se "vea", porque desbloquea info, async y datos.

---

## 5. Riesgos técnicos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| **Refactor de la sala rompe sesiones en vivo** | Estrangulamiento (extraer de a poco), feature-flags, probar cada retro tras moverla. Es lo más delicado. |
| **Sin tests automatizados** | Antes del refactor, agregar tests mínimos a `finalizeSession`, `normalizeStage` y al backfill del `thread`. Smoke test del build en cada paso. |
| **Outputs no normalizados → datos sucios** | El `thread` con backfill + validación; no exponer inteligencia hasta tener cobertura razonable. |
| **Async + Realtime: estados raros** | El async no fragmenta el vivo (solo 2 pantallas); el cron solo autocierra, no avanza pasos en vivo. |
| **Privacidad del activo de datos** | Agregación/anonimización por diseño; ToS; nunca PII cross-org. Revisar con criterio legal antes de exponer. |
| **`reloadData()` full refetch** | A medida que crezca el dataset, el refetch global puede pesar. A futuro: refrescos selectivos. No bloqueante hoy. |
| **Migraciones manuales** (no hay MCP al proyecto correcto) | Entregar SQL listo para que el usuario lo corra; documentar cada migración. |

---

## 6. Infra nueva necesaria
- **Edge Functions + pg_cron** (Supabase) para jobs (async autocierre, nudges). 
- **`SUPABASE_SERVICE_ROLE_KEY`** en Vercel (ya requerido por el webhook de señal).
- (Diferido) proveedor de **email** (Resend) o **push** para nudges fuera de la app.
- Vistas/【RPC】 SQL nuevas: `set_my_commitment_status`, vistas agregadas anonimizadas.

---

## 7. Orden recomendado de ejecución (primer sprint)

**Sprint 1 — Fundaciones invisibles + primer valor visible**
1. **WS1 arranque:** definir `LoopThread`, mapear `finalizeSession`, backfill desde `data` existente. *(desbloquea todo)*
2. **F0 curaduría (datos):** primarias/variantes/propósitos + etiquetar `phases[i].mode` de las retros principales.
3. **WS2 playbooks (MVP):** 1–2 playbooks end-to-end + flujo "elegí tu objetivo". *(primer "wow" del reposicionamiento)*

Con eso validás el camino crítico (WS1) y mostrás el cambio de categoría (loop como héroe) sin tocar todavía lo más riesgoso (refactor profundo de la sala / async).

**Siguientes:** F2 (catálogo) → F3 (info layer + miembro) → F4 (async) → F5 (Norte coach) → F6 (consola/datos).

---

## 8. Anexo — anclas de código (dónde tocar)

| Área | Archivo:función |
|---|---|
| Store / reload | `src/lib/store.ts` (loadData/reloadData) |
| Repositorio (writes) | `src/lib/repository.ts` (patchInitiativeData, createInitiative, setInitiativeStage…) |
| Tipos de datos | `src/lib/data.ts` (InitiativeData, TeamData, CYCLE_STAGES, normalizeStage) |
| Motor de sesión | `src/app/sala/[sessionId]/page.tsx` (STEP_SEQ, needsAll, dispatch por type) |
| Avance/cierre | `src/lib/session.ts` (setStep, finalizeSession, loadSessionMemories, subscribeSession) |
| Retros | `src/lib/retros/registry.ts` (RetroDefinition, phases, CANONICAL_RETRO) |
| Output | `src/components/RetroResult.tsx` (reconstrucción por tipo) |
| Detalle del loop | `src/app/(app)/equipos/[id]/iniciativa/[initId]/page.tsx` (StageBody → futuro expediente) |
| Team page / tabs | `src/app/(app)/equipos/[id]/page.tsx` (RetroCatalog, SeguimientoPanel, TeamSidebar) |
| Lanzador | `src/components/SessionLauncher.tsx` (modo live/async, playbooks) |
| Miembro | `src/app/member/page.tsx` + `src/components/member/MemberChrome.tsx` |
| Navegación / gating | `src/components/AppShell.tsx` (navItemsFor) + `src/lib/auth/access.ts` (PREFIXES) |
| IA | `src/app/api/ai/*` (norte, replay, library, loop, suggest) + `src/lib/ai-guard.ts` |
| RLS / RPC | `supabase/migrations/*.sql` (visible_*, merge_session_result, join_session_by_code) |
