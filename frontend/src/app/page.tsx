"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient, isUnauthorizedError } from "@/shared/api/api-client";
import { ActivityFeed } from "@/features/activity/activity-feed";
import { LandingPage } from "@/features/marketing/landing-page";

export default function Home() {
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false });
  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: apiClient.getRepositories,
    enabled: userQuery.isSuccess,
  });
  const eventsQuery = useQuery({
    queryKey: ["events", 1, 20, {}],
    queryFn: () => apiClient.getEvents(1, 20),
    enabled: userQuery.isSuccess,
    retry: false,
  });
  const digestsQuery = useQuery({
    queryKey: ["digests"],
    queryFn: apiClient.getDigests,
    enabled: userQuery.isSuccess,
    retry: false,
  });

  if (userQuery.isError && isUnauthorizedError(userQuery.error)) return <LandingPage />;

  const repositories = repositoriesQuery.data ?? [];
  const hasRepositories = repositories.length > 0;
  const hasActivity = (eventsQuery.data?.total ?? 0) > 0;

  return (
    <main className="workspace-page min-h-screen px-4 py-7 text-emerald-950 sm:px-6 sm:py-10 md:ml-64 md:px-10">
      <div className="mx-auto max-w-6xl space-y-7">
        <header className="workspace-hero flex flex-wrap items-end justify-between gap-5 rounded-[1.75rem] border p-6 sm:p-8">
          <div className="max-w-2xl">
            <p className="landing-eyebrow">Ton espace DevSync</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-5xl">Suis ce qui change dans tes projets.</h1>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#625d68]">
              Activité GitHub, état des dépendances et résumés de la journée, réunis au même endroit.
            </p>
          </div>
          <Link href="/repositories" className="workspace-primary-button inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-bold">
            {hasRepositories ? "Gérer mes dépôts" : "Ajouter mon premier dépôt"}
          </Link>
        </header>

        {userQuery.isPending && <p role="status" className="workspace-card rounded-2xl border p-5">Chargement de ton espace…</p>}
        {userQuery.isError && <section role="alert" className="workspace-alert workspace-alert-error">
          <p className="font-bold">DevSync ne peut pas joindre son serveur.</p>
          <p className="mt-1">Vérifie que le backend est démarré, puis réessaie.</p>
          <button type="button" onClick={() => void userQuery.refetch()} className="workspace-secondary-button mt-3 min-h-9 rounded-lg px-3 text-sm font-bold">Réessayer</button>
        </section>}
        {repositoriesQuery.isError && <p role="alert" className="workspace-alert workspace-alert-error">Impossible de charger tes dépôts. Vérifie que le backend est démarré, puis actualise la page.</p>}

        {userQuery.isSuccess && (
          <>
            <section aria-label="État de tes outils" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <OverviewCard
                href="/repositories"
                label="Dépôts suivis"
                value={repositoriesQuery.isPending ? "…" : String(repositories.length)}
                detail={hasRepositories ? "Choisir ou configurer un dépôt" : "Commencer par en ajouter un"}
              />
              <OverviewCard
                href="#activity-heading"
                label="Activité reçue"
                value={eventsQuery.isPending ? "…" : eventsQuery.isError ? "—" : String(eventsQuery.data?.total ?? 0)}
                detail={eventsQuery.isError ? "Activité momentanément indisponible" : hasActivity ? "Événements enregistrés" : "À la première livraison GitHub"}
              />
              <OverviewCard href="/dependencies" label="Dépendances" value="Analyser" detail="Trouver les versions à mettre à jour" />
              <OverviewCard
                href="/digest"
                label="Daily digest"
                value={digestsQuery.isPending ? "…" : digestsQuery.isError ? "—" : String(digestsQuery.data?.length ?? 0)}
                detail={digestsQuery.isError ? "Résumés momentanément indisponibles" : "Résumés générés récemment"}
              />
            </section>

            <section aria-labelledby="next-step-heading" className="workspace-card rounded-2xl border p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-violet-700">{hasActivity ? "Tu es prêt" : "Pour commencer"}</p>
                  <h2 id="next-step-heading" className="mt-1 text-2xl font-extrabold tracking-tight">
                    {hasActivity ? "Ton flux GitHub est connecté." : hasRepositories ? "Relie GitHub à ton espace." : "Ajoute ton premier dépôt."}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625d68]">
                    {hasActivity
                      ? "Les événements reçus apparaissent dans le fil ci-dessous. Tu peux aussi lancer une analyse de dépendances ou créer un résumé."
                      : hasRepositories
                        ? "Ouvre la page Dépôts suivis, copie l’URL et le secret dans les paramètres Webhooks de GitHub, puis envoie un push pour vérifier la connexion."
                        : "Une fois le dépôt ajouté, DevSync te donnera l’adresse et le secret à enregistrer dans les paramètres Webhooks de GitHub."}
                  </p>
                </div>
                <Link href={hasActivity ? "/dependencies" : "/repositories"} className="workspace-secondary-button inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-bold">
                  {hasActivity ? "Analyser des dépendances" : hasRepositories ? "Configurer GitHub" : "Ajouter un dépôt"}
                </Link>
              </div>

              <ol className="mt-6 grid gap-3 md:grid-cols-3">
                <SetupStep number="1" complete={hasRepositories} title="Ajouter un dépôt" description="Choisis un dépôt GitHub à suivre." />
                <SetupStep number="2" complete={hasActivity} title="Relier le webhook" description="Ajoute l’URL et le secret dans GitHub." />
                <SetupStep number="3" complete={hasActivity} title="Voir l’activité" description="Les pushes, PR et issues arrivent ici." />
              </ol>
            </section>

            <ActivityFeed />
          </>
        )}
      </div>
    </main>
  );
}

function OverviewCard({ href, label, value, detail }: { href: string; label: string; value: string; detail: string }) {
  return (
    <Link href={href} className="workspace-card group rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-offset-4">
      <p className="text-sm font-semibold text-[#625d68]">{label}</p>
      <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-2 text-sm leading-5 text-[#625d68]">{detail}</p>
    </Link>
  );
}

function SetupStep({ number, complete, title, description }: { number: string; complete: boolean; title: string; description: string }) {
  return (
    <li className={`rounded-2xl border p-4 ${complete ? "workspace-step-complete" : "workspace-step"}`}>
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold">{complete ? "✓" : number}</span>
        <h3 className="font-bold">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-5 text-[#625d68]">{description}</p>
    </li>
  );
}
