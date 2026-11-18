"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, isUnauthorizedError } from "@/shared/api/api-client";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false });
  const channelsQuery = useQuery({ queryKey: ["notification-channels"], queryFn: apiClient.getNotificationChannels, enabled: userQuery.isSuccess });
  const createChannel = useMutation({
    mutationFn: apiClient.createDiscordChannel,
    onSuccess: () => {
      setWebhookUrl("");
      setMessage("Discord est connecté. Envoie un message de test pour vérifier le canal.");
      void queryClient.invalidateQueries({ queryKey: ["notification-channels"] });
    },
  });
  const updateChannel = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => apiClient.updateNotificationChannel(id, enabled),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notification-channels"] }),
  });
  const deleteChannel = useMutation({
    mutationFn: apiClient.deleteNotificationChannel,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notification-channels"] }),
  });
  const testChannel = useMutation({
    mutationFn: apiClient.testNotificationChannel,
    onSuccess: () => setMessage("Message de test envoyé à Discord."),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    createChannel.mutate(webhookUrl.trim());
  }

  return (
    <main className="workspace-page min-h-screen px-4 py-7 text-emerald-950 sm:px-6 sm:py-10 md:ml-64 md:px-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="landing-eyebrow">Alertes GitHub</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Notifications</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625d68]">Reçois dans Discord les pushes, pull requests et issues que DevSync enregistre.</p>
        </header>

        {userQuery.isPending && <p role="status">Vérification de ta session GitHub…</p>}
        {userQuery.isError && isUnauthorizedError(userQuery.error) && <section className="workspace-card rounded-2xl border p-5">
          <h2 className="font-bold">Session GitHub inactive</h2>
          <a href={apiClient.getGitHubLoginUrl()} className="workspace-primary-button mt-4 inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold">Se connecter à GitHub</a>
        </section>}
        {userQuery.isError && !isUnauthorizedError(userQuery.error) && <p role="alert" className="workspace-alert workspace-alert-error">Le serveur DevSync ne répond pas. Vérifie que le backend est démarré.</p>}

        {userQuery.isSuccess && <>
          <section className="workspace-card rounded-2xl border p-5 sm:p-6">
            <h2 className="text-lg font-bold">Connecter un webhook Discord</h2>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm leading-6 text-[#625d68]">
              <li>Dans Discord, ouvre les paramètres du salon où tu veux recevoir les alertes.</li>
              <li>Crée un webhook, puis copie son URL.</li>
              <li>Colle cette URL ci-dessous. DevSync la chiffre avant de la sauvegarder et ne la réaffiche pas.</li>
            </ol>
            <form onSubmit={submit} className="mt-5">
              <label htmlFor="discord-webhook" className="block text-sm font-semibold">URL du webhook Discord</label>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <input id="discord-webhook" type="url" required autoComplete="off" value={webhookUrl} onChange={(event) => setWebhookUrl(event.target.value)} placeholder="https://discord.com/api/webhooks/…" className="workspace-input min-h-11 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm" />
                <button type="submit" disabled={createChannel.isPending} className="workspace-primary-button min-h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-60">{createChannel.isPending ? "Connexion…" : "Connecter Discord"}</button>
              </div>
            </form>
            {createChannel.isError && <p role="alert" className="mt-3 text-sm text-rose-700">{createChannel.error.message}</p>}
          </section>

          {message && <p role="status" className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-950">{message}</p>}
          {testChannel.isError && <p role="alert" className="text-sm text-rose-700">{testChannel.error.message}</p>}
          {updateChannel.isError && <p role="alert" className="text-sm text-rose-700">{updateChannel.error.message}</p>}
          {deleteChannel.isError && <p role="alert" className="text-sm text-rose-700">{deleteChannel.error.message}</p>}

          <section aria-labelledby="channels-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="channels-heading" className="text-xl font-extrabold">Mes canaux</h2>
              {channelsQuery.data && <span className="text-sm text-[#625d68]">{channelsQuery.data.length}</span>}
            </div>
            {channelsQuery.isPending && <p role="status">Chargement des canaux…</p>}
            {channelsQuery.isError && <p role="alert" className="text-sm text-rose-700">Impossible de charger les canaux. {channelsQuery.error.message}</p>}
            {channelsQuery.data?.length === 0 && <p className="workspace-card rounded-2xl border p-5 text-sm">Aucun canal connecté. Ajoute ton premier webhook Discord ci-dessus.</p>}
            {channelsQuery.data?.map((channel) => <article key={channel.id} className="workspace-card flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-bold">Discord</h3>
                <p className="mt-1 text-sm text-[#625d68]">{channel.enabled ? "Actif — les nouveaux événements seront envoyés." : "En pause — aucun événement ne sera envoyé."}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={testChannel.isPending} onClick={() => { setMessage(null); testChannel.mutate(channel.id); }} className="workspace-secondary-button min-h-10 rounded-lg px-3 text-sm font-semibold">{testChannel.isPending && testChannel.variables === channel.id ? "Envoi…" : "Envoyer un test"}</button>
                <button type="button" disabled={updateChannel.isPending} onClick={() => updateChannel.mutate({ id: channel.id, enabled: !channel.enabled })} className="workspace-secondary-button min-h-10 rounded-lg px-3 text-sm font-semibold">{channel.enabled ? "Mettre en pause" : "Réactiver"}</button>
                <button type="button" disabled={deleteChannel.isPending} onClick={() => { if (window.confirm("Supprimer ce canal Discord ?")) deleteChannel.mutate(channel.id); }} className="min-h-10 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">Supprimer</button>
              </div>
            </article>)}
          </section>
        </>}
      </div>
    </main>
  );
}
