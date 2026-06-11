import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Growthloop — El movimiento continuo del equipo que aprende",
  description:
    "Plataforma de acompañamiento de equipos: facilitá sesiones, seguí variables y mejorá el pulso del equipo de forma continua.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/* Tema día/noche: aplica la preferencia guardada antes de pintar (default = día). */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('gl-theme')==='dark')document.documentElement.dataset.theme='dark';}catch(e){}` }} />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
