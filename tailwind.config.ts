import type { Config } from "tailwindcss";

/**
 * Growthloop — Tailwind theme.
 *
 * Nota: el proyecto usa Tailwind v4 (configuración CSS-first en `globals.css`
 * vía `@theme`). Este archivo se carga con la directiva `@config` para exponer
 * la paleta de marca como utilidades (`bg-primary`, `text-textMuted`, etc.).
 * Los tokens completos del sistema de diseño viven como variables CSS en
 * `src/app/globals.css`.
 */
const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00E87A",
        background: "#0A0F1E",
        card: "#1A2035",
        cardHover: "#2D3748",
        accent: "#7C3AED",
        textMuted: "#64748B",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
      },
      fontFamily: {
        sans: ["var(--sans)"],
        mono: ["var(--mono)"],
      },
    },
  },
  plugins: [],
};

export default config;
