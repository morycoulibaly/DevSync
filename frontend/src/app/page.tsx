"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowRight, Check, Circle, GitBranch, Radio, ShieldCheck, Sparkles } from "lucide-react";
import { apiClient } from "@/shared/api/api-client";
import { ActivityFeed } from "@/features/activity/activity-feed";

export default function Home() {
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false });
  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: apiClient.getRepositories,
    enabled: userQuery.isSuccess,
  });

  const repositoryCount = repositoriesQuery.data?.length ?? 0;
  const hasRepository = repositoryCount > 0;

  return (
    <main className="min-h-screen px-4 py-7 text-slate-100 sm:px-6 sm:py-10 md:ml-64 md:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Ton espace de travail</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Vue d’ensemble</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Un endroit pour suivre les changements de tes dépôts GitHub. Commençons par connecter ton premier dépôt.</p>
          </div>
          <Link href="/repositories" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-950/30 transition hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">
            <GitBranch size={16} aria-hidden="true" /> Gérer mes dépôts <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </header>

        <section aria-label="État de l’espace" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-white/[0.08] bg-[#111827] p-5">
            <div className="flex items-center justify-between text-sm text-slate-400"><span>Dépôts suivis</span><GitBranch size={17} className="text-indigo-300" aria-hidden="true" /></div>
            <p className="mt-4 text-3xl font-semibold tabular-nums">{repositoriesQuery.isSuccess ? repositoryCount : "—"}</p>
            <p className="mt-1 text-xs text-slate-500">{repositoriesQuery.isSuccess ? "dans ton espace DevSync" : "disponible après connexion"}</p>
          </article>
          <article className="rounded-2xl border border-white/[0.08] bg-[#111827] p-5">
            <div className="flex items-center justify-between text-sm text-slate-400"><span>Événements Git</span><Activity size={17} className="text-cyan-300" aria-hidden="true" /></div>
            <p className="mt-4 text-xl font-semibold">Affichage à venir</p>
            <p className="mt-1 text-xs text-slate-500">Les webhooks reçus sont enregistrés par l’API.</p>
          </article>
          <article className="rounded-2xl border border-white/[0.08] bg-[#111827] p-5 sm:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between text-sm text-slate-400"><span>Veille & résumés IA</span><Sparkles size={17} className="text-amber-300" aria-hidden="true" /></div>
            <p className="mt-4 text-xl font-semibold">En préparation</p>
            <p className="mt-1 text-xs text-slate-500">Les scanners et résumés ne sont pas encore activés.</p>
          </article>
        </section>

        {userQuery.isPending && <p role="status" className="mt-6 text-sm text-slate-400">Chargement de ton espace…</p>}

        {userQuery.isError && (
          <section className="mt-6 rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.05] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Première étape</p>
            <h2 className="mt-2 text-xl font-semibold">Connecte-toi avec GitHub</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Ta session est absente ou expirée. La connexion permet à DevSync de rattacher tes dépôts à ton compte.</p>
            <a href={apiClient.getGitHubLoginUrl()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-950 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Se connecter avec GitHub <ArrowRight size={16} aria-hidden="true" /></a>
          </section>
        )}

        {userQuery.isSuccess && repositoriesQuery.isError && (
          <p role="alert" className="mt-6 rounded-xl border border-rose-300/20 bg-rose-300/[0.05] p-4 text-sm text-rose-200">Impossible de charger les dépôts. Vérifie que l’API est démarrée, puis actualise la page.</p>
        )}

        {userQuery.isSuccess && repositoriesQuery.isPending && <p role="status" className="mt-6 text-sm text-slate-400">Chargement des dépôts…</p>}

        {userQuery.isSuccess && repositoriesQuery.isSuccess && !hasRepository && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111827]">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300/20 bg-indigo-300/[0.06] px-3 py-1 text-xs font-medium text-indigo-200"><Radio size={13} aria-hidden="true" /> Configuration initiale</div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight">Aucun dépôt suivi pour le moment</h2>
                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">Ajoute un dépôt que tu possèdes ou que tu peux configurer. DevSync te donnera l’URL et le secret à saisir dans les paramètres GitHub du dépôt.</p>
                <Link href="/repositories" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">Ajouter un dépôt <ArrowRight size={16} aria-hidden="true" /></Link>
              </div>
              <ol className="space-y-4 rounded-xl border border-white/[0.07] bg-[#0c1322] p-5">
                <Step number="1" title="Ajouter le dépôt" detail="Indique owner et nom du dépôt GitHub." active />
                <Step number="2" title="Configurer le webhook" detail="Copie l’URL et le secret affichés une seule fois." />
                <Step number="3" title="Recevoir les événements" detail="GitHub transmet ensuite les pushes, PR et issues." />
              </ol>
            </div>
          </section>
        )}

        {userQuery.isSuccess && repositoriesQuery.isSuccess && hasRepository && (
          <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <section aria-labelledby="repos-heading" className="rounded-2xl border border-white/[0.08] bg-[#111827] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div><h2 id="repos-heading" className="font-semibold">Tes dépôts</h2><p className="mt-1 text-sm text-slate-400">{repositoryCount} dépôt{repositoryCount === 1 ? "" : "s"} enregistré{repositoryCount === 1 ? "" : "s"} dans DevSync.</p></div>
                <Link href="/repositories" className="shrink-0 text-sm font-medium text-indigo-300 hover:text-indigo-200">Gérer <span aria-hidden="true">→</span></Link>
              </div>
              <ul className="mt-5 divide-y divide-white/[0.07]">
                {repositoriesQuery.data.map((repository) => (
                  <li key={repository.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div><p className="font-medium text-white">{repository.fullName}</p><p className="mt-1 text-xs text-slate-500">Ajouté le {new Date(repository.createdAt).toLocaleDateString("fr-FR")}</p></div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-400/15 px-2.5 py-1 text-[11px] text-slate-400"><Circle size={7} aria-hidden="true" /> Statut à vérifier sur GitHub</span>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="next-heading" className="rounded-2xl border border-white/[0.08] bg-[#111827] p-5 sm:p-6">
              <h2 id="next-heading" className="font-semibold">Prochaine étape</h2>
              <p className="mt-1 text-sm leading-5 text-slate-400">Dans GitHub, ajoute le webhook affiché par DevSync. Le tunnel Cloudflare doit rester ouvert pendant tes essais.</p>
              <div className="mt-5 flex gap-3 rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-amber-200" aria-hidden="true" />
                <p className="text-xs leading-5 text-amber-100/80">Le secret n’est visible qu’une fois. Si tu l’as perdu ou exposé, renouvelle-le dans la page Dépôts suivis.</p>
              </div>
              <Link href="/repositories" className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-indigo-300 hover:text-indigo-200">Ouvrir les dépôts suivis <ArrowRight size={15} aria-hidden="true" /></Link>
            </section>
          </div>
        )}

        {userQuery.isSuccess && <div className="mt-4"><ActivityFeed /></div>}
      </div>
    </main>
  );
}

function Step({ number, title, detail, active = false }: { number: string; title: string; detail: string; active?: boolean }) {
  return <li className="flex gap-3">
    <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${active ? "bg-indigo-400 text-slate-950" : "border border-white/10 text-slate-400"}`}>{number}</span>
    <span><span className={`text-sm font-medium ${active ? "text-white" : "text-slate-300"}`}>{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{detail}</span></span>
  </li>;
}
