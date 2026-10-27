"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Copy, ExternalLink, GitBranch, KeyRound, Plus, Radio, RotateCw } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { apiClient, type NewRepository } from "@/shared/api/api-client";

export default function RepositoriesPage() {
  const queryClient = useQueryClient();
  const [owner, setOwner] = useState("");
  const [name, setName] = useState("");
  const [newRepository, setNewRepository] = useState<NewRepository | null>(null);

  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false });
  const repositoriesQuery = useQuery({
    queryKey: ["repositories"], queryFn: apiClient.getRepositories, enabled: userQuery.isSuccess,
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
    <main className="min-h-screen px-4 py-7 text-slate-100 sm:px-6 sm:py-10 md:ml-64 md:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Configuration</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Dépôts suivis</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Ajoute un dépôt, puis colle les informations du webhook dans ses paramètres GitHub. Les événements reçus seront enregistrés par DevSync.</p>
        </header>

        <ol aria-label="Étapes de configuration" className="mt-6 grid gap-3 sm:grid-cols-3">
          <SetupStep number="1" title="Ajouter le dépôt" description="Saisis le propriétaire et le nom." active />
          <SetupStep number="2" title="Configurer le webhook" description="Copie l’URL et le secret dans GitHub." />
          <SetupStep number="3" title="Envoyer un événement" description="Fais un push ou ouvre une PR." />
        </ol>

        {userQuery.isPending && <div role="status" className="mt-6 rounded-xl border border-white/[0.08] bg-[#111827] p-4 text-sm text-slate-400">Vérification de ta session GitHub…</div>}

        {userQuery.isError && (
          <section className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[0.04] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-200">Connexion requise</p>
            <h2 className="mt-2 text-xl font-semibold">Ta session GitHub est inactive</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Reconnecte-toi avec GitHub pour renouveler ta session et retrouver tes dépôts. La session dure 7 jours.</p>
            <a href={apiClient.getGitHubLoginUrl()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">Se connecter avec GitHub <ArrowRight size={16} aria-hidden="true" /></a>
          </section>
        )}

        {userQuery.isSuccess && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.035] px-4 py-3">
            <p className="flex items-center gap-2 text-sm text-emerald-100"><span className="size-2 rounded-full bg-emerald-300" />Connecté à GitHub sous <strong>@{userQuery.data.githubLogin}</strong></p>
            <a href={apiClient.getGitHubLoginUrl()} className="text-xs font-medium text-indigo-300 underline-offset-4 hover:text-indigo-200 hover:underline">Renouveler ma session</a>
          </div>
        )}

        {userQuery.isSuccess && (
          <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.08] bg-[#111827] p-5 sm:p-6">
              <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-indigo-400/10 text-indigo-200"><Plus size={18} aria-hidden="true" /></span><div><h2 className="font-semibold">Ajouter un dépôt</h2><p className="mt-0.5 text-xs text-slate-500">Il doit exister sur GitHub.</p></div></div>
              <div className="mt-5 space-y-4">
                <label htmlFor="repo-owner" className="block text-sm font-medium text-slate-300">Propriétaire GitHub
                  <input id="repo-owner" required autoComplete="off" value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="ex. octocat" className="mt-2 min-h-11 w-full rounded-xl border border-white/[0.1] bg-[#0b1220] px-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15" />
                </label>
                <label htmlFor="repo-name" className="block text-sm font-medium text-slate-300">Nom du dépôt
                  <input id="repo-name" required autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} placeholder="ex. Hello-World" className="mt-2 min-h-11 w-full rounded-xl border border-white/[0.1] bg-[#0b1220] px-3 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/15" />
                </label>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">Exemple : pour <code className="rounded bg-white/[0.06] px-1 py-0.5 text-slate-300">github.com/octocat/Hello-World</code>, propriétaire = octocat, nom = Hello-World.</p>
              <button disabled={createRepository.isPending} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 disabled:cursor-wait disabled:opacity-60">
                <GitBranch size={16} aria-hidden="true" />{createRepository.isPending ? "Ajout en cours…" : "Ajouter ce dépôt"}
              </button>
              {createRepository.isError && <p role="alert" className="mt-3 text-sm text-rose-300">{createRepository.error.message}</p>}
            </form>

            <section aria-labelledby="tracked-repositories-heading" className="rounded-2xl border border-white/[0.08] bg-[#111827] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><h2 id="tracked-repositories-heading" className="font-semibold">Mes dépôts suivis</h2><p className="mt-1 text-xs text-slate-500">Dépôts rattachés à ton compte DevSync.</p></div><GitBranch size={18} className="text-slate-500" aria-hidden="true" /></div>
              {repositoriesQuery.isPending && <p role="status" className="mt-5 text-sm text-slate-400">Chargement des dépôts…</p>}
              {repositoriesQuery.isError && <p role="alert" className="mt-5 rounded-lg bg-rose-300/[0.06] p-3 text-sm text-rose-200">Impossible de charger les dépôts. Vérifie que le backend est démarré.</p>}
              {repositoriesQuery.data?.length === 0 && <div className="mt-5 rounded-xl border border-dashed border-white/[0.1] px-4 py-8 text-center"><GitBranch size={20} className="mx-auto text-slate-500" aria-hidden="true" /><p className="mt-3 text-sm font-medium">Aucun dépôt pour le moment</p><p className="mt-1 text-xs text-slate-500">Ajoute ton premier dépôt avec le formulaire.</p></div>}
              <ul className="mt-4 space-y-3">
                {repositoriesQuery.data?.map((repository) => (
                  <li key={repository.id} className="rounded-xl border border-white/[0.07] bg-[#0c1322] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div><a href={`https://github.com/${repository.fullName}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-medium text-white hover:text-indigo-200">{repository.fullName}<ExternalLink size={13} aria-label="Ouvre GitHub dans un nouvel onglet" /></a><p className="mt-1 text-xs text-slate-500">Ajouté le {new Date(repository.createdAt).toLocaleDateString("fr-FR")}</p></div>
                      <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-[10px] text-slate-400">Statut du webhook inconnu</span>
                    </div>
                    <p className="mt-3 break-all text-[11px] leading-5 text-slate-500">URL actuelle : {repository.webhookUrl}</p>
                    <div className="mt-3 border-t border-white/[0.06] pt-3">
                      <button type="button" disabled={rotateWebhookSecret.isPending} onClick={() => {
                        const confirmed = window.confirm("Cela invalide l’ancien secret. Tu devras remplacer le secret dans les paramètres du webhook GitHub. Continuer ?");
                        if (!confirmed) return;
                        setNewRepository(null);
                        rotateWebhookSecret.mutate(repository.id);
                      }} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-200/15 px-3 text-xs font-medium text-amber-100 transition hover:bg-amber-200/[0.06] focus-visible:outline-2 focus-visible:outline-amber-200 disabled:opacity-60">
                        <RotateCw size={14} aria-hidden="true" />{rotateWebhookSecret.isPending && rotateWebhookSecret.variables === repository.id ? "Renouvellement…" : "Renouveler le secret"}
                      </button>
                      <p className="mt-2 text-[11px] leading-4 text-slate-600">À utiliser si tu as perdu ou exposé l’ancien secret.</p>
                    </div>
                  </li>
                ))}
              </ul>
              {rotateWebhookSecret.isError && <p role="alert" className="mt-3 text-sm text-rose-300">{rotateWebhookSecret.error.message}</p>}
            </section>
          </div>
        )}

        {newRepository && <WebhookSetup repository={newRepository} />}

        <p className="mt-5 text-xs leading-5 text-slate-500"><KeyRound size={13} className="mr-1 inline" aria-hidden="true" />Le secret est enregistré chiffré et n’est affiché qu’au moment de sa création ou de son renouvellement.</p>
        <Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowRight size={14} className="rotate-180" aria-hidden="true" /> Retour à la vue d’ensemble</Link>
      </div>
    </main>
  );
}

function SetupStep({ number, title, description, active = false }: { number: string; title: string; description: string; active?: boolean }) {
  return <li className={`flex gap-3 rounded-xl border p-4 ${active ? "border-indigo-300/20 bg-indigo-300/[0.05]" : "border-white/[0.07] bg-[#111827]"}`}>
    <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold ${active ? "bg-indigo-400 text-slate-950" : "bg-white/[0.06] text-slate-400"}`}>{number}</span>
    <span><span className="text-sm font-medium text-slate-200">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
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
    <section aria-labelledby="webhook-setup-heading" className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.04] p-5 sm:p-6">
      <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-300/10 text-emerald-200"><Check size={18} aria-hidden="true" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">Action requise dans GitHub</p><h2 id="webhook-setup-heading" className="mt-1 text-lg font-semibold text-white">Webhook prêt pour {repository.fullName}</h2></div></div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Ouvre le dépôt GitHub, puis <strong>Settings → Webhooks → Add webhook</strong>. Colle les deux valeurs ci-dessous. Choisis le format <code className="rounded bg-black/20 px-1.5 py-0.5 text-emerald-100">application/json</code> et les événements Push, Pull requests et Issues.</p>
      <div className="mt-5 grid gap-3">
        <CopyField label="Payload URL" value={repository.webhookUrl} copied={copied === "url"} onCopy={() => copy(repository.webhookUrl, "url")} />
        <CopyField label="Secret (visible uniquement maintenant)" value={repository.webhookSecret} copied={copied === "secret"} onCopy={() => copy(repository.webhookSecret, "secret")} />
      </div>
      {copyError && <p role="alert" className="mt-3 text-xs text-rose-200">Copie automatique impossible. Sélectionne la valeur et copie-la manuellement.</p>}
      <div className="mt-4 rounded-xl border border-amber-200/15 bg-amber-200/[0.04] p-3 text-xs leading-5 text-amber-100/80"><strong>À retenir :</strong> le tunnel Cloudflare doit rester ouvert pendant le test. Ne partage pas le secret ; si tu quittes cette page, tu pourras en générer un autre avec « Renouveler le secret ».</div>
      <p className="mt-3 text-xs text-slate-500">Quand tu ajoutes le webhook, GitHub envoie un événement de test. Pour vérifier l’enregistrement d’une activité, fais ensuite un push ou ouvre une pull request.</p>
    </section>
  );
}

function CopyField({ label, value, copied, onCopy }: { label: string; value: string; copied: boolean; onCopy: () => void }) {
  return <div className="rounded-xl border border-white/[0.08] bg-[#0c1322] p-3 sm:flex sm:items-center sm:gap-4">
    <div className="min-w-0 flex-1"><p className="text-[11px] font-medium text-slate-400">{label}</p><code className="mt-1 block break-all font-mono text-xs leading-5 text-slate-200">{value}</code></div>
    <button type="button" onClick={onCopy} className="mt-3 inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-medium text-slate-300 transition hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-indigo-300 sm:mt-0"><Copy size={13} aria-hidden="true" />{copied ? "Copié" : "Copier"}</button>
  </div>;
}
