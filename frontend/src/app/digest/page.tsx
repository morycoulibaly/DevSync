"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, isUnauthorizedError, type DailyDigest } from "@/shared/api/api-client";

function yesterdayUtcDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDigestDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(value));
}

export default function DigestPage() {
  const queryClient = useQueryClient();
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [digestDate, setDigestDate] = useState(yesterdayUtcDate);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false });
  const repositoriesQuery = useQuery({ queryKey: ["repositories"], queryFn: apiClient.getRepositories, enabled: userQuery.isSuccess, retry: false });
  const digestsQuery = useQuery({ queryKey: ["digests"], queryFn: apiClient.getDigests, enabled: userQuery.isSuccess, retry: false });
  const jobQuery = useQuery({
    queryKey: ["digest-job", jobId],
    queryFn: () => apiClient.getDigestJob(jobId!),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return !jobId || state === "completed" || state === "failed" ? false : 1000;
    },
  });
  const generateMutation = useMutation({
    mutationFn: () => apiClient.generateDigest(selectedRepositoryId, digestDate),
    onSuccess: (job) => {
      setJobError(null);
      setJobId(job.id);
    },
  });

  useEffect(() => {
    const state = jobQuery.data?.state;
    if (state === "completed") {
      void queryClient.invalidateQueries({ queryKey: ["digests"] });
      setJobId(null);
      setJobError(null);
    } else if (state === "failed") {
      setJobError(jobQuery.data?.error ?? "Le résumé n’a pas pu être généré.");
      setJobId(null);
    }
  }, [jobQuery.data, queryClient]);

  const digests: DailyDigest[] = digestsQuery.data ?? [];

  return (
    <main className="workspace-page min-h-screen px-4 py-7 text-emerald-950 sm:px-6 sm:py-10 md:ml-64 md:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="landing-eyebrow">Synthèse de ton activité GitHub</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Résumé quotidien</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625d68]">Choisis un dépôt et une journée. DevSync résume les événements GitHub reçus pour cette période.</p>
        </header>

        {userQuery.isPending && <p role="status">Vérification de ta session GitHub…</p>}
        {userQuery.isError && isUnauthorizedError(userQuery.error) && <section className="workspace-card rounded-2xl border p-5">
          <h2 className="text-lg font-semibold">Session GitHub inactive</h2>
          <a href={apiClient.getGitHubLoginUrl()} className="workspace-primary-button mt-4 inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold">Se connecter à GitHub</a>
        </section>}
        {userQuery.isError && !isUnauthorizedError(userQuery.error) && <section role="alert" className="workspace-alert workspace-alert-error">
          <p className="font-bold">Le serveur DevSync ne répond pas.</p>
          <p className="mt-1">Vérifie que le backend est démarré, puis réessaie.</p>
          <button type="button" onClick={() => void userQuery.refetch()} className="workspace-secondary-button mt-3 min-h-9 rounded-lg px-3 text-sm font-bold">Réessayer</button>
        </section>}

        {userQuery.isSuccess && <>
          <section className="workspace-card rounded-2xl border p-5 sm:p-6">
            <h2 className="text-lg font-bold">Créer un résumé</h2>
            <p className="mt-2 text-sm leading-6 text-[#625d68]">Le résumé utilise les événements déjà enregistrés. Tu peux actualiser un résumé existant ; les dates futures ne sont pas disponibles.</p>
            {repositoriesQuery.data?.length === 0 && <p className="mt-3 rounded-xl bg-violet-50 p-4 text-sm">Ajoute d’abord un dépôt suivi pour pouvoir créer un résumé.</p>}
            <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={(event) => {
              event.preventDefault();
              generateMutation.mutate();
            }}>
              <label className="grid gap-1.5 text-sm font-medium" htmlFor="digest-repository">Dépôt
                <select id="digest-repository" required value={selectedRepositoryId} onChange={(event) => setSelectedRepositoryId(event.target.value)} disabled={!repositoriesQuery.data?.length} className="workspace-input h-11 rounded-lg border px-3">
                  <option value="">Choisis un dépôt</option>
                  {repositoriesQuery.data?.map((repository) => <option key={repository.id} value={repository.id}>{repository.fullName}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-medium" htmlFor="digest-date">Date du résumé
                <input id="digest-date" type="date" required max={todayUtcDate()} value={digestDate} onChange={(event) => setDigestDate(event.target.value)} className="workspace-input h-11 rounded-lg border px-3" />
              </label>
              <button type="submit" disabled={!selectedRepositoryId || generateMutation.isPending || Boolean(jobId)} className="workspace-primary-button min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-60">
                {generateMutation.isPending || jobId ? "Génération…" : "Générer / actualiser"}
              </button>
            </form>
            {generateMutation.isError && <p role="alert" className="mt-3 text-sm text-rose-700">{generateMutation.error.message}</p>}
            {jobError && <p role="alert" className="mt-3 text-sm text-rose-700">{jobError}</p>}
            {jobQuery.isError && <p role="alert" className="mt-3 text-sm text-rose-700">Impossible de suivre la génération. {jobQuery.error.message}</p>}
            {jobId && <p className="mt-3 text-sm" role="status">{jobQuery.data?.state === "active" ? "Le résumé est en cours de rédaction…" : "Le résumé attend son tour…"}</p>}
          </section>

          <section className="space-y-3" aria-labelledby="digest-history-heading">
            <div className="flex items-end justify-between gap-3">
              <h2 id="digest-history-heading" className="text-xl font-extrabold">Résumés enregistrés</h2>
              {digests.length > 0 && <span className="text-sm">{digests.length}</span>}
            </div>
            {digestsQuery.isPending && <p role="status">Chargement des résumés…</p>}
            {digestsQuery.isError && <p role="alert" className="text-sm text-rose-700">Impossible de charger les résumés. {digestsQuery.error.message}</p>}
            {digestsQuery.isSuccess && digests.length === 0 && <p className="workspace-card rounded-2xl border p-5 text-sm">Aucun résumé pour le moment.</p>}
            {digests.map((digest) => <DigestCard key={digest.id} digest={digest} />)}
          </section>
        </>}
      </div>
    </main>
  );
}

function DigestCard({ digest }: { digest: DailyDigest }) {
  return <article className="workspace-card rounded-2xl border p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="text-base font-semibold">{digest.repository.fullName}</h3>
        <time className="mt-1 block text-sm text-emerald-950/65" dateTime={digest.date}>{formatDigestDate(digest.date)}</time>
      </div>
      <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-900">{digest.eventCount} événement{digest.eventCount === 1 ? "" : "s"}</span>
    </div>
    {digest.status === "GENERATED" && <p className="mt-4 whitespace-pre-line text-sm leading-7">{digest.summary}</p>}
    {digest.status === "PENDING" && <p className="mt-4 text-sm">Résumé en attente.</p>}
    {digest.status === "FAILED" && <p className="mt-4 text-sm text-rose-700">La génération a échoué. Tu peux la relancer pour ce dépôt et cette date.</p>}
    {digest.model && <p className="mt-4 text-xs text-emerald-950/55">Modèle : {digest.model}</p>}
  </article>;
}
