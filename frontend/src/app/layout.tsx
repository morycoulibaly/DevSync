import type { Metadata } from "next";
import { AppSidebar } from "@/shared/layout/app-sidebar";
import { AppProviders } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevSync — Tes dépôts. Tout le signal.",
  description: "L’activité GitHub et les dépendances de tes projets réunies dans un espace clair.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" data-scroll-behavior="smooth">
      <body>
        <AppProviders>
          <AppSidebar />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
