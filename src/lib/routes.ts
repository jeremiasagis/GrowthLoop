/* Builders de rutas — un único lugar donde viven los paths. */
export const routes = {
  dashboard: () => "/dashboard",
  orgs: () => "/organizaciones",
  team: (teamId: string) => `/equipos/${teamId}`,
  map: (teamId: string) => `/equipos/${teamId}/mapa`,
  sessions: () => "/sesiones",
  session: (teamId: string) => `/sesion/${teamId}`,
  facilitators: () => "/facilitadores",
  reports: () => "/reportes",
  settings: () => "/ajustes",
  register: () => "/registro",
};
