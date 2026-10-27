import { Activity, Boxes, GitBranch } from "lucide-react";
import { StatCard } from "@/shared/ui/stat-card";

const dashboardStats = [
  { label: "Dépôts suivis", value: "—", icon: GitBranch, note: "À retrouver dans la section Dépôts" },
  { label: "Événements reçus", value: "—", icon: Activity, note: "Le tableau d’activité arrive bientôt" },
  { label: "Veille dépendances", value: "Bientôt", icon: Boxes, note: "L’analyse des versions n’est pas encore disponible" },
];

export function DashboardStats() {
  return <section aria-label="État des fonctionnalités" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    {dashboardStats.map((stat) => <StatCard key={stat.label} {...stat} />)}
  </section>;
}
