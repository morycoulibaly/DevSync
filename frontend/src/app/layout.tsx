import type { Metadata } from "next";
import { AppSidebar } from "@/shared/layout/app-sidebar";
import { AppProviders } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevSync — Veille technique",
  description: "Activité Git, dépendances et résumés quotidiens au même endroit.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <AppProviders>
          <AppSidebar />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
