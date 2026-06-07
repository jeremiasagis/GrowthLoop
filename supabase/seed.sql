-- ============================================================
-- Growthloop — Datos de ejemplo (seed)
-- ------------------------------------------------------------
-- Corré PRIMERO `schema.sql` y DESPUÉS este archivo, en el
-- SQL Editor de tu proyecto Supabase. Es idempotente: podés
-- volver a correrlo (hace upsert / limpia y recarga).
-- ============================================================

-- Limpieza (orden inverso por las foreign keys)
truncate session_logs, pulse_points, experiments, variables,
  team_members, teams, facilitators, organizations restart identity cascade;

-- ── Organizaciones ──
insert into organizations (id, name, sector, leader, leader_role, contract, since, status) values
  ('o1', 'Banco Andino',       'Servicios financieros', 'Roberto Méndez', 'Gerente de Operaciones',   '6 meses', 'feb 2026', 'Activo'),
  ('o2', 'Logística del Sur',  'Logística',             'Ana Belmonte',   'Directora de Operaciones', '3 meses', 'abr 2026', 'Activo'),
  ('o3', 'Clínica Vida',       'Salud',                 'Dr. Iván Soler', 'Director Médico',          '4 meses', 'mar 2026', 'Piloto');

-- ── Facilitadores ──
insert into facilitators (id, name, email, initials, teams, sessions_month, health, status, is_you) values
  ('f1', 'Daniela Ríos',   'daniela@growthloop.io',   'DR', 4, 9, 73,   'active',  true),
  ('f2', 'Martín Sosa',    'martin.sosa@cliente.com', 'MS', 3, 6, 68,   'active',  false),
  ('f3', 'Carla Beltrán',  'carla.b@cliente.com',     'CB', 2, 4, 81,   'active',  false),
  ('f4', 'Joaquín Vera',   'j.vera@cliente.com',      'JV', 2, 3, 64,   'active',  false),
  ('f5', 'Lucía Ferreyra', 'lucia.f@cliente.com',     'LF', 0, 0, null, 'invited', false);

-- ── Equipos ──
insert into teams (id, org_id, name, area, purpose, client_type, facilitator_id, psych_safety, stage, active_var, days_left, blocked) values
  ('t1', 'o1', 'Operaciones Centro',   'Operaciones',  'Procesar solicitudes de crédito con rapidez y sin errores.', 'Interno', 'f1', 62, 'proof',   'Reuniones sin decisiones', 8,  false),
  ('t2', 'o1', 'Riesgo y Cumplimiento','Riesgo',       'Aprobar operaciones cuidando a la empresa y al cliente.',    'Interno', 'f1', 78, 'follow',  'Tiempos de aprobación',    4,  true),
  ('t3', 'o2', 'Última Milla',         'Distribución', 'Entregar a tiempo sin quemar al equipo de reparto.',         'Interno', 'f1', 81, 'explore', 'Rutas que se solapan',     0,  false),
  ('t4', 'o3', 'Urgencias',            'Atención',     'Atender rápido sin perder la calidez con el paciente.',      'Interno', 'f1', 70, 'focus',   'Saturación en picos',      11, false);

-- ── Integrantes de los equipos ──
insert into team_members (team_id, name, initials) values
  ('t1','Mariana López','ML'),('t1','Julián Pérez','JP'),('t1','Sofía Núñez','SN'),('t1','Andrés Gil','AG'),('t1','Lucía Vega','LV'),('t1','Tomás Ruiz','TR'),
  ('t2','Paula Sáenz','PS'),('t2','Diego Mora','DM'),('t2','Inés Castro','IC'),('t2','Bruno Lara','BL'),
  ('t3','Carla Díaz','CD'),('t3','Marcos Ortiz','MO'),('t3','Vale Soto','VS'),('t3','Hugo Paz','HP'),('t3','Rita Mena','RM'),
  ('t4','Dra. Elena Ramos','DE'),('t4','Pedro Cano','PC'),('t4','Lía Ferro','LF');

-- ── Variables (equipo Operaciones Centro) ──
insert into variables (id, team_id, name, stage, sessions, last_seen, trend, state, source, descr, has_exp) values
  ('v1','t1','Reuniones sin decisiones','proof',3,'hace 2 días','up','developing','Sesión Exploración','Las reuniones de equipo terminan sin acuerdos claros ni responsables, y los temas se repiten semana a semana.',true),
  ('v2','t1','Traspaso entre turnos','follow',4,'hace 5 días','up','developing','Observación','La información se pierde en el cambio de turno: el turno entrante no sabe qué quedó pendiente.',false),
  ('v3','t1','Sobrecarga de los líderes','focus',2,'hace 1 día','flat','critical','Encuesta previa','Los coordinadores resuelven todo personalmente; el equipo no toma decisiones sin ellos.',false),
  ('v4','t1','El feedback no llega','explore',1,'hace 8 días','flat','developing','Sesión TeamCook','La gente no recibe devoluciones sobre su trabajo, ni positivas ni de mejora.',false),
  ('v5','t1','Retrabajo en reportes','queue',0,'sin actividad','flat','critical','Entrevista','Los reportes se rehacen 2 o 3 veces por datos inconsistentes entre áreas.',false),
  ('v6','t1','Onboarding lento','queue',0,'sin actividad','flat','developing','Observación','Una persona nueva tarda más de un mes en ser autónoma.',false),
  ('v7','t1','Silos entre áreas','learn',5,'hace 3 días','up','acceptable','Combinación','Operaciones y Riesgo no comparten contexto; cada uno optimiza lo suyo.',false),
  ('v8','t1','Errores en captura','consol',5,'hace 6 días','up','acceptable','Encuesta previa','Errores de tipeo al ingresar solicitudes generan rechazos evitables.',false),
  ('v9','t1','Prioridades que cambian','improved',6,'hace 12 días','up','acceptable','Sesión Exploración','Las prioridades cambiaban a media semana; ahora hay un acuerdo de congelamiento.',false),
  ('v10','t1','Clima en las 1:1','paused',2,'hace 20 días','down','developing','Entrevista','Pausada a pedido del líder hasta cerrar la reorganización del área.',false);

-- ── Experimento activo (la prueba sobre v1) ──
insert into experiments (team_id, variable_id, apuesta_if, apuesta_then, signal_name, baseline, current_value, target, unit, day_of, day_total, status, due_date) values
  ('t1','v1','cerramos cada reunión con las decisiones y responsables por escrito','el equipo avanza sin volver a discutir los mismos temas','% de reuniones con decisiones registradas',40,62,80,'%',7,15,'on-track','18 de junio');

-- ── Pulso por sesión ──
insert into pulse_points (team_id, label, date, confianza, comunic, claridad, foco, seguridad) values
  ('t1','S1','30 abr',60,58,55,62,54),('t1','S2','07 may',64,60,58,66,58),('t1','S3','14 may',63,64,62,65,56),('t1','S4','21 may',68,66,66,70,60),('t1','S5','28 may',72,70,69,74,62),
  ('t2','S1','02 may',70,68,66,64,72),('t2','S2','09 may',72,70,70,68,74),('t2','S3','16 may',74,73,72,72,76),('t2','S4','23 may',76,75,75,74,78),
  ('t3','S1','12 may',74,72,70,76,80),('t3','S2','19 may',78,76,74,79,81),
  ('t4','S1','05 may',66,64,62,68,66),('t4','S2','12 may',68,66,65,70,68),('t4','S3','19 may',70,69,68,71,70);

-- ── Bitácora de sesiones (equipo Operaciones Centro) ──
insert into session_logs (id, team_id, date, stage, retro, pulse, delta, out_text) values
  ('s5','t1','28 may','proof','Diseño de la prueba',74,3,'Prueba definida: actas de decisión'),
  ('s4','t1','21 may','proof','¿Cuál elegimos?',71,2,'Idea elegida con ICE'),
  ('s3','t1','14 may','focus','¿Por qué pasa esto?',69,-1,'Causa raíz: agenda sin cierre'),
  ('s2','t1','07 may','focus','Impacto y frecuencia',70,4,'Problema priorizado'),
  ('s1','t1','30 abr','explore','¿Dónde estamos?',66,0,'Mapa de tensiones inicial');
