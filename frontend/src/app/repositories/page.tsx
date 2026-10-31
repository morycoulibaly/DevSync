"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { apiClient, isUnauthorizedError, type NewRepository } from "@/shared/api/api-client";

export default function RepositoriesPage() {
  const queryClient = useQueryClient();
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [newRepository, setNewRepository] = useState<NewRepository | null>(null);

  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false });
  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: apiClient.getRepositories,
    enabled: userQuery.isSuccess,
  });
  const createRepository = useMutation({
    mutationFn: apiClient.createRepository,
    onSuccess: (repository) => {
      setNewRepository(repository);
      setOwner("");
      setName("");
      void queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });
  const rotateWebhookSecret = useMutation({
    mutationFn: apiClient.rotateWebhookSecret,
    onSuccess: (repository) => {
      setNewRepository(repository);
      void queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNewRepository(null);
    createRepository.mutate({ owner: owner.trim(), name: name.trim() });
  }

  return (
    <main className="workspace-page min-h-screen px-4 py-7 text-emerald-950 sm:px-6 sm:py-10 md:ml-64 md:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="landing-eyebrow">Tes projets GitHub</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Dépôts suivis</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625d68]">Ajoute un dépôt, puis configure son webhook GitHub pour recevoir les pushes, pull requests et issues dans DevSync.</p>
        </header>

        <ol aria-label="Étapes de configuration" className="grid gap-3 sm:grid-cols-3">
          <SetupStep number="1" title="Ajouter le dépôt" description="Saisis le propriétaire et le nom." active />
          <SetupStep number="2" title="Configurer le webhook" description="Copie l’URL et le secret dans GitHub." />
          <SetupStep number="3" title="Envoyer un événement" description="Fais un push ou ouvre une PR." />
        </ol>

        {userQuery.isPending && <p role="status" className="rounded-xl border border-emerald-950/10 bg-white p-4">Vérification de ta session GitHub…</p>}

        {userQuery.isError && isUnauthorizedError(userQuery.error) && (
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">Connexion requise</p>
            <h2 className="mt-2 text-xl font-semibold">Ta session GitHub est inactive</h2>
            <p className="mt-2 max-w-xl text-sm leading-6">Reconnecte-toi avec GitHub pour retrouver tes dépôts. La session dure 7 jours.</p>
            <a href={apiClient.getGitHubLoginUrl()} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">Se connecter avec GitHub</a>
          </section>
        )}
        {userQuery.isError && !isUnauthorizedError(userQuery.error) && <section role="alert" className="workspace-alert workspace-alert-error">
          <p className="font-bold">Le serveur DevSync ne répond pas.</p>
          <p className="mt-1">Vérifie que le backend est démarré, puis réessaie.</p>
          <button type="button" onClick={() => void userQuery.refetch()} className="workspace-secondary-button mt-3 min-h-9 rounded-lg px-3 text-sm font-bold">Réessayer</button>
        </section>}

        {userQuery.isSuccess && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm">Connecté à GitHub sous <strong>@{userQuery.data.githubLogin}</strong></p>
            <a href={apiClient.getGitHubLoginUrl()} className="text-sm font-medium text-emerald-700 hover:text-emerald-900">Renouveler ma session</a>
          </div>
        )}

        {userQuery.isSuccess && (
          <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-950/10 bg-white p-5 sm:p-6">
              <h2 className="font-semibold">Ajouter un dépôt</h2>
              <p className="mt-1 text-sm">Le dépôt doit déjà exister sur GitHub.</p>
              <div className="mt-5 space-y-4">
                <label htmlFor="repo-owner" className="block text-sm font-medium">
                  Propriétaire GitHub
                  <input id="repo-owner" required autoComplete="off" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="ex. octocat" className="mt-2 min-h-11 w-full rounded-lg border border-emerald-950/15 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15" />
                </label>
                <label htmlFor="repo-name" className="block text-sm font-medium">
                  Nom du dépôt
                  <input id="repo-name" required autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} placeholder="ex. Hello-World" className="mt-2 min-h-11 w-full rounded-lg border border-emerald-950/15 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15" />
                </label>
              </div>
              <button disabled={createRepository.isPending} className="mt-5 inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                {createRepository.isPending ? "Ajout…" : "Ajouter"}
              </button>
              {createRepository.isError && <p role="alert" className="mt-3 text-sm text-rose-700">{createRepository.error.message}</p>}
            </form>

            <section className="rounded-2xl border border-emerald-950/10 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold">Mes dépôts <span className="font-normal">({repositoriesQuery.data?.length ?? 0})</span></h2>
              {repositoriesQuery.isPending && <p role="status" className="mt-4">Chargement…</p>}
              {repositoriesQuery.isError && <p role="alert" className="mt-4 text-sm text-rose-700">Impossible de charger les dépôts. Vérifie que le backend est démarré.</p>}
              {repositoriesQuery.data?.length === 0 && <p className="mt-4 text-sm">Aucun dépôt suivi.</p>}
              <ul className="mt-4 space-y-3">
                {repositoriesQuery.data?.map((repository) => (
                  <li key={repository.id} className="rounded-xl border border-emerald-950/10 bg-emerald-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <a href={`https://github.com/${repository.fullName}`} target="_blank" rel="noreferrer" className="font-medium hover:text-emerald-700">{repository.fullName}</a>
                      <span className="rounded-full border border-emerald-950/10 px-2.5 py-1 text-xs">Webhook à vérifier sur GitHub</span>
                    </div>
                    <SavedWebhookUrl value={repository.webhookUrl} />
                    <button type="button" disabled={rotateWebhookSecret.isPending} onClick={() => {
                      const confirmed = window.confirm("L’ancien secret ne fonctionnera plus. Remplace-le aussi dans les paramètres GitHub. Continuer ?");
                      if (!confirmed) return;
                      setNewRepository(null);
                      rotateWebhookSecret.mutate(repository.id);
                    }} className="mt-3 min-h-9 rounded-lg border border-emerald-950/10 px-3 text-xs font-medium text-emerald-950 hover:bg-white disabled:opacity-60">
                      {rotateWebhookSecret.isPending && rotateWebhookSecret.variables === repository.id ? "Renouvellement…" : "Renouveler le secret"}
                    </button>
                  </li>
                ))}
              </ul>
              {rotateWebhookSecret.isError && <p role="alert" className="mt-3 text-sm text-rose-700">{rotateWebhookSecret.error.message}</p>}
            </section>
          </div>
        )}

        {newRepository && <WebhookSetup repository={newRepository} />}
      </div>
    </main>
  );
}

function SavedWebhookUrl({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyWebhookUrl() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <details className="mt-3 rounded-xl border border-violet-200/70 bg-white/80 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-violet-800">Afficher l’adresse du webhook</summary>
      <p className="mt-3 text-xs leading-5 text-[#625d68]">À coller dans GitHub, dans les paramètres Webhooks de ce dépôt.</p>
      <code className="mt-2 block break-all rounded-lg bg-[#f6f3f8] p-3 font-mono text-xs leading-5">{value}</code>
      <button type="button" onClick={() => void copyWebhookUrl()} className="workspace-secondary-button mt-3 min-h-9 rounded-lg px-3 text-xs font-bold">
        {copied ? "Adresse copiée" : "Copier l’adresse"}
      </button>
    </details>
  );
}

function SetupStep({ number, title, description, active = false }: { number: string; title: string; description: string; active?: boolean }) {
  return <li className={`flex gap-3 rounded-xl border p-4 ${active ? "border-emerald-300 bg-emerald-50" : "border-emerald-950/10 bg-white"}`}>
    <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${active ? "bg-emerald-700 text-white" : "bg-emerald-100 text-emerald-950"}`}>{number}</span>
    <span><span className="text-sm font-medium">{title}</span><span className="mt-1 block text-xs leading-5">{description}</span></span>
  </li>;
}

function WebhookSetup({ repository }: { repository: NewRepository }) {
  const [copied, setCopied] = useState<"url" | "secret" | null>(null);
  const [copyError, setCopyError] = useState(false);

  async function copy(value: string, field: "url" | "secret") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      setCopyError(false);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-700/20 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Configurer le webhook pour {repository.fullName}</h2>
      <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-emerald-900/80">
        <li>Dans GitHub, ouvre Settings → Webhooks → Add webhook.</li>
        <li>Choisis le format application/json et les événements Push, Pull requests et Issues.</li>
        <li>Garde le tunnel Cloudflare ouvert pendant les essais.</li>
      </ol>
      <div className="mt-5 grid gap-3">
        <CopyField label="Payload URL" value={repository.webhookUrl} copied={copied === "url"} onCopy={() => copy(repository.webhookUrl, "url")} />
        <CopyField label="Secret — affiché une seule fois" value={repository.webhookSecret} copied={copied === "secret"} onCopy={() => copy(repository.webhookSecret, "secret")} />
      </div>
      {copyError && <p role="alert" className="mt-3 text-sm text-rose-700">Copie automatique impossible. Sélectionne la valeur et copie-la manuellement.</p>}
    </section>
  );
}

function CopyField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return (
    <div className="rounded-xl border border-emerald-950/10 bg-emerald-50/70 p-3 sm:flex sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">{label}</p>
        <code className="mt-1 block break-all font-mono text-xs leading-5">{value}</code>
      </div>
      <button type="button" onClick={onCopy} className="mt-3 min-h-9 rounded-lg border border-emerald-950/10 px-3 text-xs font-medium hover:bg-white sm:mt-0">
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}
