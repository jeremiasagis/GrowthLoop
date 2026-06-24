# Growthloop — Plan de transformación a producto premium de mejora continua

> Documento de estrategia + diseño para validar. No es código todavía.
> De acá sale el plan de fases que armamos juntos.

---

## 0. La tesis en una frase

**Dejás de ser "una app de retros" y pasás a ser "el sistema operativo de la mejora continua de un equipo, con un coach de IA".**

La retro deja de ser el producto. El producto es el **resultado**: el loop que se cierra, la señal que se mueve, el equipo que madura. Eso ningún competidor lo vende, porque están atados al modelo "evento".

**Métrica norte del producto (la que define si sos premium):**
> Loops cerrados con señal movida, por equipo, por trimestre.

Si eso sube, el cliente renueva. Todo lo demás es medio.

---

## 1. Reposicionamiento (la decisión madre)

| Hoy (categoría comoditizada) | Premium (nueva categoría) |
|---|---|
| "Hacé una retro" | "Tu equipo mejora de forma continua y medible" |
| Evento puntual | Programa continuo |
| Board que exportás y olvidás | Sistema que se vuelve más valioso con cada ciclo |
| Competís feature por feature | Competís por resultado y por coaching |
| Centro = catálogo de retros | Centro = Mis loops |

Competidores en la categoría vieja: Parabol, Retrium, TeamRetro, EasyRetro, Metro Retro. Todos venden lo mismo. Si tu mejor argumento es "tengo 49 retros ordenadas", perdés.

---

## 2. Los 5 pilares del cambio (en orden de impacto)

### Pilar 1 — El Loop es el héroe, no el catálogo
- **Loops precargados (playbooks):** Innovación, Entregas/Calidad, Comunicación, Cliente, Onboarding, Retrabajo. Cada uno trae el camino completo: retro por etapa, señal sugerida, seed de Norte.
- **Loop express base:** el genérico de 1 sesión punta a punta (ya existe el flujo guiado).
- **Reencuadre de navegación:** el centro es "Mis loops". El catálogo pasa a ser "la caja de herramientas que alimenta tus loops".
- **Por qué diferencia:** convertís la hoja en blanco en un playbook de consultor.

### Pilar 2 — Separar "pasos del loop" de "caja de herramientas" + reorganizar por propósito
- Dos cosas hoy mezcladas:
  - **Pasos del loop** (su output alimenta el modelo de datos): causa raíz, diseño de la apuesta, ¿qué sigue?, cierre. Pertenecen a una etapa.
  - **Caja de herramientas** (transversales, sirven siempre): check-ins, cierres, priorización, radares, energizers.
- **Eje principal de organización: propósito.**
- **Entrada por síntoma:** "¿qué le pasa a tu equipo?" → recomienda.
- **Curaduría:** 1 primaria por output; el resto plegado como "variantes"; cortar clones reales. De ~49 a ~25 visibles + variantes a demanda. No sobre-reducir.

### Pilar 3 — Norte como coach del loop (no asistente suelto)
- **Proactivo:** detecta señales (clima cayendo, loop estancado) y propone el próximo paso.
- **Coach del facilitador en vivo:** le sopla solo a él durante la sesión.
- **Guía del playbook:** lo lleva de la mano por el loop precargado.
- **Puente async→vivo:** pre-agrupa y resume lo que llegó async para que la sesión en vivo arranque caliente.
- **Por qué diferencia:** vendés un coach de mejora continua escalable, no software.

### Pilar 4 — El compounding (ya construido, falta conectarlo al relato)
- **Señal automática** (hecho) → la mejora es medible.
- **Compromisos con seguimiento** (hecho) → cierra el gap ejecución.
- **Madurez** (hecho) → el equipo se ve creciendo como practicante de CI.
- **Relato + Reporte ejecutivo + Benchmark** (hecho) → la memoria se vuelve valor para el sponsor y comparación entre equipos.
- **Por qué diferencia:** cada ciclo deja al equipo y a la org más inteligentes. Retención + moat de datos.

### Pilar 5 — El modelo híbrido async/sync (el nuevo grande) → detalle en §3

### Pilar 6 — La capa de información: output, orden, análisis y presentación → detalle en §3·B y §3·C
- Hoy la info que produce cada retro/loop/equipo está **fragmentada y cruda**: ves tarjetas reconstruidas, datos sueltos, pero no una **conclusión clara** ni el **hilo** que conecta todo.
- Falta una capa que **obtenga, ordene, analice y presente** la información en cada nivel (retro → loop → equipo → org → plataforma).
- Incluye la **consola del superadmin** y el **activo de datos** cross-org/industria.
- **Por qué diferencia:** es lo que convierte "datos de retros" en **inteligencia** — para el equipo, para el sponsor, y como activo de la plataforma a futuro.

---

## 3. El modelo híbrido async/sync (en detalle)

### 3.1 El principio que ordena todo
La unidad de async **no es la retro, es la fase**. Cada retro/etapa es una secuencia de fases, y cada fase tiene naturaleza distinta:

| Tipo de trabajo | Naturaleza | Modo natural |
|---|---|---|
| **Divergir / generar** (escribir, brainstorm, votar, puntuar, reflexionar, pulso) | individual | **Async** ✅ (a veces mejor que en vivo: sin anclaje, todos aportan) |
| **Converger / decidir / relacional** (debatir clusters, llegar a la causa, diseñar la apuesta, decidir, conversaciones sensibles, celebrar) | colectivo | **En vivo** 🔴 |

### 3.2 La regla de oro (lo que evita que se vuelva un caos)
> **El async sirve para cruzar un corte que IGUAL iba a existir. Nunca para crear un corte nuevo.**

- "Async-ok" = la fase **PUEDE** ir async, no que **DEBE**. Es una capacidad, no una obligación.
- Si ya están juntos y pueden seguir → siguen en vivo, incluidas las fases async-ables. No se fragmenta nada.
- El async **jamás** interrumpe un flujo en vivo. Solo aparece en momentos naturales (ver §3.4).
- El async tiene que **siempre restar coordinación, nunca sumarla**. Si meterlo te obligaría a cortar algo que fluía y re-coordinar, es la opción equivocada y la plataforma no te la ofrece (o la ofrece como "para la próxima").

### 3.3 Los tres modos (asignados a fases, no a retros)
- **Async** → fases de recolección/divergencia. Se abren como "tarea del equipo" con deadline + nudges.
- **En vivo (live-locked)** → fases de convergencia/decisión/relacionales. Vienen bloqueadas por default con explicación gentil ("esta conversación pierde valor en async"), pero overridables.
- **Híbrido** (default de casi todo el loop) → recolección async ANTES, y la sesión en vivo arranca ya cargada → el tiempo sincrónico va directo a discutir y decidir.

### 3.4 Las dos pantallas donde se ofrece async (y solo estas dos)

**Pantalla A — Al abrir el trabajo (planificación):**

```
┌──────────────────────────────────────────────────────────────┐
│  Abrir: ¿Por qué está pasando?   ·  etapa Analizar           │
│ ─────────────────────────────────────────────────────────────│
│  Esta retro tiene 3 fases:                                    │
│                                                               │
│    ①  Escribir causas posibles        ⏳ async-able    ~10'   │
│    ②  Votar las más fuertes           ⏳ async-able    ~5'    │
│    ③  Discutir y armar el árbol        🔴 en vivo       ~20'   │
│                                                               │
│   💡 Podés mandar ① y ② async antes. La sesión en vivo        │
│      arranca ya con las causas votadas → solo discuten.       │
│                                                               │
│    ┌───────────────────────────┐   ┌──────────────────────┐  │
│    │  Mandar ①②  async  ▸      │   │  Hacer todo en vivo  │  │
│    │  cierra en [ 7 días ▾ ]   │   │  ahora               │  │
│    └───────────────────────────┘   └──────────────────────┘  │
│                                                               │
│   Tiempo en vivo:  con prep async ~20'   ·   todo en vivo ~35'│
└──────────────────────────────────────────────────────────────┘
```

**Pantalla B — Al cerrar una sesión en vivo con loop pendiente:**

```
┌──────────────────────────────────────────────────────────────┐
│  Cerraste:  Analizar ✓                                        │
│  Lo que sigue en el loop:                                     │
│ ─────────────────────────────────────────────────────────────│
│    Diseñar la apuesta          🔴 conviene en vivo            │
│    Probar · check-in de señal  ⏳ async-able                  │
│                                                               │
│  ¿Cómo seguimos?                                              │
│                                                               │
│    ○  Otro día en vivo        (agendás una sesión)            │
│    ◉  Mandar lo async ahora   (el check-in lo cargan cuando   │
│       cierra en [ 7 días ▾ ]   puedan; vos cerrás después)    │
│    ○  Seguir ahora            (si todavía tienen tiempo)      │
│                                                               │
│   💡 Diseñar la apuesta es una decisión del equipo: mejor en  │
│      vivo. El check-in de señal sí puede ir async.            │
│                                                               │
│                  [  Confirmar cómo seguimos  ]                │
└──────────────────────────────────────────────────────────────┘
```

**Regla de UX:** dentro de una sesión en vivo el facilitador solo aprieta "siguiente" y fluye, atravesando fases async-ables sin un solo deadline ni interrupción. El async nunca se cruza en el medio.

### 3.5 El puente de Norte (async → vivo arranca caliente)
Cuando cierra la ventana async, Norte:
- agrupa/clusteriza las tarjetas,
- resume los temas principales,
- deja la sesión en vivo lista para empezar en la **convergencia**, no desde cero.

Resultado: una retro de 90' se vuelve **async de prep (sin reunión) + 20-25' en vivo de pura decisión**.

### 3.6 A nivel loop (no solo retro)
```
  Analizar      ⏳ buena parte async (juntar datos, votar causas)
  Diseñar       🔴 en vivo (la apuesta es un compromiso del equipo)
  Probar        ⏳ async (cada uno reporta su parte de la señal)
  Aprender      🔴 en vivo (cierre + decisión "¿qué sigue?")
```
El loop muestra: "estas etapas avanzan solas async; estas dos necesitan una sesión en vivo".

### 3.7 Mapa fase → modo (rule of thumb para etiquetar)
| Fase / actividad | Modo default |
|---|---|
| Escribir tarjetas / brainstorm | async-ok |
| Votar / puntuar / priorizar (dot voting) | async-ok |
| Reflexión individual / carta / pulso | async-ok |
| Check-in de señal (reportar un número) | async-ok |
| Clustering con debate | en vivo (draft async/IA ok) |
| Discusión de causa raíz | en vivo |
| Diseño de la apuesta | en vivo (live-lock) |
| Decisión "¿qué sigue?" | en vivo (live-lock) |
| Relacional / sensible (¿cómo nos relacionamos?, Speed Dating) | en vivo (live-lock duro) |
| Celebración / Kudos | async-ok, mejor en vivo |

---

## 3·B. La capa de información (output, orden, análisis, presentación) — Pilar 6

**El problema actual (lo que se siente usándola):** la información está **fragmentada y cruda**. Se ven tarjetas reconstruidas y datos sueltos, pero falta la **conclusión** y el **hilo** que conecta todo. Hace falta una capa que **obtenga, ordene, analice y presente** en cada nivel.

**Principio:** cada nivel de la jerarquía tiene **UNA vista canónica**, clara y accionable. **Conclusión primero, detalle después.** Nunca volcar data cruda.

### Los 5 niveles de información

**Nivel 1 — Output de una retro ("qué produjo")**
- Hoy: reconstrucción de tarjetas (crudo).
- Premium: un artefacto legible. Arriba, **el insight principal destilado por Norte** ("la causa más votada fue X"). Abajo, la visualización + detalle plegable. *1 retro = 1 conclusión + respaldo.*

**Nivel 2 — El expediente del loop (one-pager)**
El **hilo causal completo** en una sola vista (hoy está disperso entre etapas):

```
┌───────────────────────────────────────────────────────────┐
│  Loop: Reducir entregas tardías          ◐ 60%  · Probar  │
│ ──────────────────────────────────────────────────────────│
│  EL HILO                                                   │
│   Síntoma    "nos atrasamos con las entregas"              │
│      ↓                                                      │
│   Causa      Diseño nos pasa todo sobre la hora            │
│      ↓                                                      │
│   Apuesta    Si fijamos un cutoff 48h antes → menos atrasos│
│      ↓                                                      │
│   Señal      % entregas a tiempo                           │
│              Antes 55%  →  Ahora 72%  →  Meta 90%   ▲ +17  │
│      ↓                                                      │
│   Aprendido  (se completa al cerrar el ciclo)              │
│ ──────────────────────────────────────────────────────────│
│   Compromisos 4/6 ✓     ·     Próximo check-in: 3 días     │
└───────────────────────────────────────────────────────────┘
```

**Nivel 3 — El tablero del equipo**
Loops activos y su estado · clima en el tiempo · madurez · compromisos · relato/biblioteca. Responde *"¿cómo está este equipo?"* en una mirada.

**Nivel 4 — La vista de organización**
Benchmark (hecho) · reporte ejecutivo (hecho) · digest de aprendizajes (hecho) · Norte org report (hecho). **Falta:** una *home de org* que los junte y dé el panorama de un vistazo.

**Nivel 5 — La consola de plataforma (superadmin)** → §3·C

### Norte como capa de análisis (transversal)
En cada nivel, *"preguntale a tus datos"* en lenguaje natural (ya existe en Biblioteca; extender a loops y cross-equipo). Norte **destila**, no solo reconstruye.

### Principios de diseño del output
- **Conclusión primero**, detalle después.
- **Trazabilidad:** el hilo causal del loop, siempre visible.
- **Comparabilidad:** outputs estandarizados → se pueden agregar y comparar.
- **Una vista canónica por nivel:** no 5 lugares para lo mismo.

> ⚠️ **Dependencia clave:** esta capa necesita la **curaduría del Pilar 2**. Si cada retro guarda su output en un formato propio, no se puede agregar ni comparar. Estandarizar las primarias es lo que hace posible toda la inteligencia (niveles 3, 4 y 5).

---

## 3·C. La consola de plataforma y el activo de datos (superadmin)

Dos cosas distintas que **no hay que mezclar**:

### A) Operacional — gestión de la plataforma
Todo lo que un superadmin necesita para operar, claro y ordenado:
- **Usuarios:** todos, con rol, org, equipo, última actividad, estado. Buscable, filtrable, ordenable.
- **Orgs y equipos:** estructura completa, plan, actividad.
- **Loops:** todos los loops de todas las orgs, su estado y señal.
- **Métricas de plataforma:** activos, adopción, retención, loops cerrados, señales movidas.

```
┌───────────────────────────────────────────────────────────┐
│  Consola de plataforma                          Superadmin │
│ ──────────────────────────────────────────────────────────│
│  Activos 142 · Orgs 18 · Equipos 64 · Loops 230 (41 ✓ tri)│
│ ──────────────────────────────────────────────────────────│
│  [ Usuarios ]  [ Orgs ]  [ Loops ]  [ Inteligencia ]      │
│                                                            │
│  Usuario        Rol          Org         Últ. act.  Loops │
│  ──────────────────────────────────────────────────────── │
│  Ana Pérez      Facilitador  Aliantec    hoy         3    │
│  Juan Gómez     Miembro      TeamCook     2 días      —    │
│  …                                                         │
│                                                            │
│  ▸ Inteligencia · Causa raíz #1 en SaaS: "deuda técnica"  │
└───────────────────────────────────────────────────────────┘
```

### B) Inteligencia agregada — el activo de datos (el oro a futuro)
Con muchos loops de muchos equipos, industrias y empresas tenés un dataset único:
- Causas raíz más comunes **por industria**.
- Tasa de éxito **por tipo de loop** (¿Comunicación funciona más que Entregas?).
- Apuestas que más mueven la señal.
- Patrones de madurez por sector.

Esto es **moat de datos** y, a futuro, **producto vendible** (benchmark de industria: "los equipos como el tuyo…").

> 🔒 **Privacidad (definir desde el día 1):** lo **operacional** es legítimo para el superadmin (operás la plataforma). La **inteligencia cross-org** debe ser **anonimizada y agregada**. Nunca exponer datos identificables de una empresa a otra.

---

## 3·D. La experiencia del miembro (hoy: espectador pasivo)

**El problema:** hoy el miembro **mira**. Entra, ve el estado del equipo y links ("iniciativas / sesiones / biblioteca"). No ve **qué tiene que hacer él**, no **siente su contribución ni el progreso**, y no puede **cerrar sus propios compromisos** (RLS solo deja escribir al facilitador). Es justo el rol donde más pesa la capa de coaching (seguridad, ownership, progreso visible) — y el que define si la mejora continua sucede.

**Reencuadre: tres bloques en su home.**

**1) Tu parte (acción) — lo que está sobre mí**
- Aportes async pendientes (con deadline) → la base ya está construida.
- **Mis compromisos**, que el propio miembro pueda **marcar hechos** → necesita una RPC `security definer` para que un miembro actualice solo lo suyo (el ítem que quedó pendiente del Pilar 4).
- Próxima sesión en vivo.
- *Es un "to-do" personal, no un tablero de estado.*

**2) Nuestro progreso (motivación / compounding) — lo que estamos logrando**
- Los loops y su **hilo** (versión miembro del expediente: síntoma → apuesta → señal), no "iniciativas".
- **Señales que se movieron** ("nuestra apuesta subió +17").
- Madurez del equipo + el relato.
- *Que el miembro VEA y SIENTA que el equipo mejora y que es parte.*

**3) Mi voz y mi recorrido (coaching / seguridad)**
- Reflexiones conectadas al loop.
- "Aportaste en N sesiones" / reconocer que su voz (anónima) moldeó decisiones — sin romper el anonimato de los demás.
- *Cierra el círculo emocional: se siente escuchado y dueño.*

```
┌───────────────────────────────────────────────┐
│  Hola, Ana 👋                                  │
│ ───────────────────────────────────────────────│
│  TU PARTE                                       │
│   📝 Aporte pendiente · "¿Por qué se atrasa?"   │
│      cierra en 3 días            [ Sumar → ]    │
│   ✅ Tus compromisos (2)                        │
│      • Mandar specs 48h antes    [ marcar ✓ ]   │
│      • Avisar bloqueos en daily  [ marcar ✓ ]   │
│   📅 Próxima sesión en vivo: jue 15 h           │
│ ───────────────────────────────────────────────│
│  NUESTRO PROGRESO                               │
│   🔁 Reducir entregas tardías     ▲ señal +17   │
│   🏆 Madurez del equipo: En práctica            │
│   📖 Ver el relato del equipo                    │
│ ───────────────────────────────────────────────│
│  MI VOZ                                         │
│   Tus reflexiones · 4    ·    Aportaste en 6    │
└───────────────────────────────────────────────┘
```

**Qué NO mostrarle al miembro:** benchmark, reporte ejecutivo, consola de plataforma — eso es de facilitador / sponsor / superadmin. El miembro va enfocado en **participar, aportar y ver progreso**.

**Privacidad:** cada miembro ve **sus propios** aportes claros; los de los demás siguen enmascarados.

---

## 4. Reorganización de retros (detalle)

### 4.1 Los ~8 propósitos (eje principal)
Diagnosticar · Priorizar · Encontrar causa · Idear · Decidir · Medir · Cerrar/Celebrar · Alinear al equipo.

### 4.2 Entrada por síntoma (la puerta diferenciadora)
"¿Qué le pasa a tu equipo?" → *nos atrasamos · hay roces · estamos desmotivados · no sabemos qué priorizar · no cerramos nada · perdimos al cliente* → recomienda retro/loop.

### 4.3 Mapa de clones a curar (output → primaria + variantes)
| Output | Candidatas | **Primaria (decidida)** | Variantes |
|---|---|---|---|
| Fuerzas que impulsan/frenan | Sailboat, Hot Air Balloon | **Sailboat** (más rica: viento/ancla/rocas/isla) | Hot Air Balloon |
| Clima / ánimo | Mad Sad Glad, One Word | **Mad Sad Glad** | One Word (express) |
| Causa raíz | ¿Por qué está pasando?, Fishbone | **¿Por qué está pasando?** (nativa, alimenta la data) | Fishbone (visual) |
| Priorizar qué atacar | Impacto/Esfuerzo, Impacto y frecuencia | **Impacto/Esfuerzo** (2×2 universal) | Impacto y frecuencia |
| Dónde se rompe (proceso interno) | ¿Dónde se traba?, Service Design | **¿Dónde se traba?** | Service Design = primaria del intent "journey del cliente" |
| Empezar/dejar/seguir | SSC, DAKI, Starfish | **Start·Stop·Continue** | DAKI, Starfish |
| Qué pasó / qué aprendimos | ¿Qué pasó?, ¿Qué aprendimos?, 4 L's | **¿Qué pasó? + ¿Qué aprendimos?** (pasos del loop) | 4 L's (all-in-one suelto) |

> Nota: "¿Dónde estamos?" (funciona/frena/nadie dice) NO es del cluster de fuerzas — es su propio intent ("foto honesta del estado"), queda como primaria de ese intent.

### 4.4 Retros transversales (cross-stage) — van a la caja de herramientas
Radar del Equipo, Perfection Game, Mad Sad Glad/One Word (check-in), ROTI/Kudos (cierre), Start·Stop·Continue/DAKI/Starfish, Impacto/Esfuerzo, Sailboat/Hot Air Balloon, Fishbone, Timeline, Lean Coffee, ¿Cómo estamos como equipo?

---

## 5. Los Loop Playbooks (detalle)

### 5.1 Estructura de datos de una receta (borrador)
```
LoopPlaybook = {
  key, nombre, ícono, descripción, síntoma_que_resuelve,
  seed_de_norte: { problema, causa_tipica, apuesta_ejemplo },
  señal_sugerida: { métrica, unidad },
  camino: [
    { etapa: "focus",     retroPrimaria, modoSugerido: { async:[...], live:[...] } },
    { etapa: "ideation",  retroPrimaria, modoSugerido: {...} },
    { etapa: "follow",    retroPrimaria, modoSugerido: {...} },
    { etapa: "learn",     retroPrimaria, modoSugerido: {...} },
  ],
}
```

### 5.2 Playbooks iniciales (set de lanzamiento — decidido)
Criterio: cada playbook de lanzamiento debe tener una **señal medible y obvia**. Por eso Innovación y Onboarding se difieren a una v2 (su señal es difusa).
- 📦 **Entregas y calidad** — ¿Dónde se traba? + causa raíz → diseño de la prueba. Señal: % a tiempo / defectos.
- 💬 **Comunicación interna** — ¿Cómo nos relacionamos? → Pares de Opuestos. Señal: dimensión Comunicación del radar (ya la medís).
- 🤝 **Relación con el cliente** — La voz del cliente + Service Design. Señal: NPS / reclamos.
- 🔁 **Eficiencia / retrabajo** — causa raíz → apuesta. Señal: % retrabajo / tiempo de ciclo.
- 🌡️ **Clima y motivación** — Radar del Equipo → apuesta. Señal: pulso general (señal lista, sin instrumentar nada).
- ⚡ **Express (1 sesión)** — el flujo guiado punta a punta.
- 🧩 **A medida (desde cero)** — para el que ya sabe qué quiere.

*v2 (cuando crezca la librería):* 🚀 Innovación/Creatividad · 🧭 Onboarding.

### 5.3 Flujo "elegí tu objetivo"
Mis loops → "Crear loop" → elegís un playbook (o express, o desde cero) → nace con etapas, retros, señal y seed puestos → empezás.

---

## 6. La capa de coaching (lo que casi nadie cuida)
La plataforma debe **encarnar** los principios del coaching de equipos:
- **Seguridad psicológica** (anonimato) — cimiento, comunicarlo fuerte.
- **Ownership** (compromisos con responsable) — el cambio es del equipo.
- **Experimentos chicos** (la apuesta medible) — baja el miedo al cambio.
- **Progreso visible** (señal, madurez, relato) — sostiene la motivación.
- **Reflexión estructurada** (etapa Aprender) — lo que distingue mejorar de solo trabajar.

Objetivo: que el producto **te haga sentir acompañado** → dejás de ser herramienta y pasás a ser programa. Premium emocional, no solo funcional.

---

## 7. Modelo premium (diferido — no es prioridad ahora)
Idea gruesa, a definir después:
- **Starter:** corre algunos loops, básico.
- **Pro:** loops con IA, señal, compromisos — la diferenciación normal.
- **Premium/Business:** Norte proactivo + coach, benchmark, reporte ejecutivo, inteligencia de toda la org.
El salto de precio se sostiene en outcome + coaching + inteligencia organizacional, no en "más features".

---

## 8. Plan de fases propuesto (borrador para armar juntos)

> Fases por objetivo, sin fechas. Cada una deja algo usable.

**Fase 0 — Validación + curaduría (diseño, poco código)**
- Definir los ~8 propósitos y mapear las 49 retros a (propósito + es-paso-de-loop / es-herramienta).
- Decidir primarias / variantes / cortes.
- Etiquetar cada fase de cada retro como async-ok / live-only.
- Salida: el "mapa maestro" de retros.

**Fase 1 — El Loop como héroe (máxima diferenciación, no rompe nada)**
- Loop Playbooks (estructura de datos + 5-6 recetas).
- Loop express base.
- Navegación "Mis loops" primero; catálogo pasa a "caja de herramientas".

**Fase 2 — Reorganización del catálogo**
- Eje propósito + entrada por síntoma.
- Separar pasos-del-loop de caja-de-herramientas.
- Aplicar curaduría (primaria + variantes plegadas).

**Fase 3 — La capa de información (output legible)**
- Nivel 1: output de retro con insight destilado por Norte (conclusión arriba, detalle plegado).
- Nivel 2: el **expediente del loop** (one-pager con el hilo causal completo).
- Nivel 3: tablero del equipo unificado.
- **Vista del miembro renovada** (Tu parte / Nuestro progreso / Mi voz) + RPC para que el miembro marque sus compromisos.
- Depende de la curaduría (Fase 2) para estandarizar outputs.

**Fase 4 — Híbrido async/sync**
- Etiquetas de fase en el motor de sesión.
- Las dos pantallas (abrir trabajo / cómo seguimos).
- Precarga de la sesión en vivo con el output async.
- Deadlines + nudges (in-app; ya tenemos la base async).

**Fase 5 — Norte coach**
- Puente async→vivo (pre-cluster/resumen).
- Norte proactivo (sugiere el próximo loop/paso).
- Guía del playbook.
- (Más adelante) coach del facilitador en vivo.

**Fase 6 — Consola de plataforma + activo de datos (superadmin)**
- Operacional: usuarios / orgs / equipos / loops, buscable y filtrable, con métricas de plataforma.
- Home de organización (Nivel 4 unificado).
- Inteligencia agregada anonimizada (cross-org/industria) — define la línea de privacidad primero.

**Fase 7 — Pulido premium**
- Conectar el compounding al relato (onboarding que vende el loop).
- Packaging / planes (cuando sea prioridad).

---

## 9. Riesgos / qué NO hacer
- No quedarse en "ordené mejor las retros" → seguís en la categoría equivocada.
- No sobre-reducir → perdés la profundidad, que es activo.
- No hacer la IA un chiche → tiene que conducir, no decorar.
- No enterrar el loop bajo el catálogo → el loop primero, siempre.
- No forzar async dentro de un flujo en vivo → async solo en las dos pantallas, nunca en el medio.

---

## 10. Validación — decisiones del consultor

Respuestas tomadas entendiendo el propósito (sistema de mejora continua, no app de retros), el mercado (equipos/orgs B2B que quieren mejorar de forma medible) y lo realista de construir.

**1. ¿Los playbooks iniciales son los correctos?**
→ **Sí, pero curados a 5 + Express + A medida** (ver §5.2). Criterio: cada uno debe tener **señal medible y obvia**. **Difiero Innovación y Onboarding a v2** porque su señal es difusa (riesgo de "loop que se siente lindo pero no mueve nada"). Sumo **Clima y motivación** porque la señal ya existe (el pulso) — es la victoria más fácil.

**2. ¿Primaria de cada cluster?** → Decididas en la tabla §4.3. Regla: gana la que da **output más estructurado** (mejor para la capa de datos) y más **universal**. Sailboat, Mad Sad Glad, ¿Por qué está pasando?, Impacto/Esfuerzo, ¿Dónde se traba?, Start·Stop·Continue, y los pasos nativos de Aprender.

**3. ¿Síntoma como pantalla principal o dentro de "Crear loop"?**
→ **Dentro de "Crear loop", como la primera pregunta** ("¿Qué le pasa a tu equipo?"). NO como home de la app. El home sigue siendo **"Mis loops"** (el loop es el héroe). Así la creación se siente como un coach que pregunta "¿qué pasa?", sin sacarle el protagonismo al loop.

**4. ¿Hasta dónde el live-lock?**
→ **Live-lock con override-con-fricción.** En vivo por default: **Diseñar la apuesta** y **la decisión "¿qué sigue?"** (son compromisos colectivos). Si el facilitador insiste en async, se permite **con una advertencia** ("esta parte pierde valor en async"). **Lo relacional/sensible** (¿cómo nos relacionamos?, Speed Dating) tiene lock más duro (advertencia fuerte). Coaching: guiás fuerte, no dictás. Realista para equipos 100% remotos/async.

**5. ¿Express antes o después de los playbooks?**
→ **Playbooks primero (protagonistas); Express y "A medida" como opciones secundarias abajo.** Liderás con "elegí tu objetivo" (el diferenciador, para el que no sabe por dónde empezar). Express es atajo de power-user, no la puerta principal.

**6. ¿Norte proactivo: avisos o espera?**
→ **In-app, no intrusivo (sin push/email por ahora).** Las sugerencias de Norte aparecen como una **card "Norte sugiere"** cuando el facilitador entra al tablero, nunca como notificación que persigue. Razón: email/push necesita infra (diferida) y arruina la confianza si spamea. "Empuja" suave: visible cuando entrás. Más adelante, digest semanal opt-in.

**7. ¿Expediente reemplaza o convive con el detalle?**
→ **Reemplaza y absorbe.** No mantenemos dos vistas. El expediente (one-pager con el hilo) **se vuelve la cabecera** del detalle del loop, y el detalle por etapa queda **plegado abajo**. Una sola página: conclusión/hilo arriba, detalle a demanda.

**8. ¿Qué ve el superadmin de cada usuario?**
→ **Metadata operacional completa (rol, org, equipo, actividad, loops, plan), pero NUNCA contenido privado.** Las **reflexiones privadas son sagradas** (son el cimiento de la seguridad psicológica: si el superadmin las lee, se cae toda la promesa). Y se **respeta el anonimato** de las tarjetas (no des-anonimizar autores). Para debug, acceso a contenido solo con escalamiento/consentimiento. Esto **no es opcional** — protege el core del producto.

**9. ¿El activo de datos es interno o vendible?**
→ **Diseñá para vendible desde el día 1, lanzá como interno.** Construí la agregación/anonimización bien hecha YA, y poné en los ToS que los datos pueden usarse **de forma anonimizada y agregada** para benchmarks. Aunque al principio lo uses solo internamente, evitás la pesadilla legal de retrofitear consentimiento cuando quieras vender el benchmark de industria.

**10. ¿El miembro marca sus compromisos? ¿Hilo completo o simple?**
→ **Sí, dejalo marcar SUS compromisos** (con la RPC `security definer` acotada — bajo costo, alto ownership; cierra el gap de ejecución). Y mostrale el **hilo en versión simple** (síntoma → apuesta → señal), sin controles de edición ni detalle de facilitación. La gestión completa queda solo para el facilitador.

---

### Resumen de las decisiones que cambian el diseño
- **5 playbooks medibles** + Express + A medida (Innovación/Onboarding a v2).
- **Síntoma** = puerta de "Crear loop", no home de la app.
- **Live-lock blando** (apuesta y decisión en vivo, override con aviso; relacional más duro).
- **Norte proactivo in-app**, sin push.
- **Expediente = nueva cabecera del detalle del loop** (no dos vistas).
- **Superadmin ve metadata, nunca contenido privado**; anonimato intocable.
- **Activo de datos: anonimizado/agregado desde el día 1**, consentimiento en ToS.
- **Miembro marca sus compromisos** (RPC) + ve el hilo simple.
