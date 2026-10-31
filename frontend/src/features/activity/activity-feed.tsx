"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { apiClient, type GitEvent, type GitEventFilters, type GitEventStatus, type GitEventType } from "@/shared/api/api-client";

const PAGE_SIZE = 20;

const eventLabels: Record<GitEventType, string> = {
  PUSH: "Push",
  PULL_REQUEST: "Pull request",
  ISSUE: "Issue",
};

const statusLabels: Record<GitEventStatus, string> = {
  OPEN: "Ouvert",
  CLOSED: "Fermé",
  MERGED: "Fusionné",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

function EventRow({ event }: { event: GitEvent }) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        {event.url
          ? <a href={event.url} target="_blank" rel="noreferrer" className="break-words font-medium text-emerald-950 underline decoration-emerald-900/20 underline-offset-4 hover:text-emerald-800">{event.title || "Événement GitHub"}</a>
          : <span className="break-words font-medium text-emerald-950">{event.title || "Événement GitHub"}</span>}
        <time className="text-xs text-emerald-950" dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
      </div>
      <p className="mt-1 text-sm text-emerald-950">
        {event.repositoryName} <span className="mx-1">|</span> {event.actorLogin} <span className="mx-1">|</span>
        {eventLabels[event.type]}{event.action ? `, ${event.action}` : ""}{event.status ? `, ${statusLabels[event.status]}` : ""}
      </p>
    </li>
  );
}

export function ActivityFeed() {
  const [page, setPage] = useState(1);
  const [draftFilters, setDraftFilters] = useState({
    repositoryId: "",
    type: "" as GitEventType | "",
    status: "" as GitEventStatus | "",
    actorLogin: "",
  });
  const [filters, setFilters] = useState<GitEventFilters>({});
  const repositoriesQuery = useQuery({ queryKey: ["repositories"], queryFn: apiClient.getRepositories, retry: false });
  const eventsQuery = useQuery({
    queryKey: ["events", page, PAGE_SIZE, filters],
    queryFn: () => apiClient.getEvents(page, PAGE_SIZE, filters),
    retry: false,
    // GitHub push notifications arrive asynchronously; refresh the feed without
    // requiring the user to leave and reopen the dashboard.
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });
  const totalPages = eventsQuery.data ? Math.max(1, Math.ceil(eventsQuery.data.total / PAGE_SIZE)) : 1;
  const hasFilters = Object.values(filters).some(Boolean);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({
      ...(draftFilters.repositoryId ? { repositoryId: draftFilters.repositoryId } : {}),
      ...(draftFilters.type ? { type: draftFilters.type } : {}),
      ...(draftFilters.status ? { status: draftFilters.status } : {}),
      ...(draftFilters.actorLogin.trim() ? { actorLogin: draftFilters.actorLogin.trim() } : {}),
    });
    setPage(1);
  }

  function clearFilters() {
    setDraftFilters({ repositoryId: "", type: "", status: "", actorLogin: "" });
    setFilters({});
    setPage(1);
  }

  return (
    <section aria-labelledby="activity-heading" className="rounded-2xl border border-emerald-950/10 bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="activity-heading" className="text-lg font-semibold text-emerald-950">Activité Git</h2>
        <button type="button" onClick={() => void eventsQuery.refetch()} disabled={eventsQuery.isFetching} className="min-h-9 rounded-lg border border-emerald-950/10 px-3 text-xs font-medium text-emerald-900 hover:bg-emerald-50 disabled:opacity-50">
          {eventsQuery.isFetching ? "Actualisation…" : "Actualiser"}
        </button>
      </div>

      <form onSubmit={applyFilters} className="mt-4 grid gap-3 rounded-xl bg-emerald-50/70 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1.5 text-xs font-medium text-emerald-900">
          Dépôt
          <select value={draftFilters.repositoryId} onChange={(event) => setDraftFilters((current) => ({ ...current, repositoryId: event.target.value }))} className="h-10 rounded-lg border border-emerald-950/10 bg-white px-3 text-sm outline-none focus:border-emerald-600">
            <option value="">Tous les dépôts</option>
            {repositoriesQuery.data?.map((repository) => <option key={repository.id} value={repository.id}>{repository.fullName}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-emerald-900">
          Type
          <select value={draftFilters.type} onChange={(event) => setDraftFilters((current) => ({ ...current, type: event.target.value as GitEventType | "" }))} className="h-10 rounded-lg border border-emerald-950/10 bg-white px-3 text-sm outline-none focus:border-emerald-600">
            <option value="">Tous les types</option>
            <option value="PUSH">Push</option>
            <option value="PULL_REQUEST">Pull request</option>
            <option value="ISSUE">Issue</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-emerald-900">
          Statut
          <select value={draftFilters.status} onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value as GitEventStatus | "" }))} className="h-10 rounded-lg border border-emerald-950/10 bg-white px-3 text-sm outline-none focus:border-emerald-600">
            <option value="">Tous les statuts</option>
            <option value="OPEN">Ouvert</option>
            <option value="CLOSED">Fermé</option>
            <option value="MERGED">Fusionné</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-emerald-900">
          Contributeur
          <input value={draftFilters.actorLogin} onChange={(event) => setDraftFilters((current) => ({ ...current, actorLogin: event.target.value }))} placeholder="Login GitHub" className="h-10 rounded-lg border border-emerald-950/10 bg-white px-3 text-sm outline-none placeholder:text-emerald-900/50 focus:border-emerald-600" />
        </label>
        <div className="flex gap-2 sm:col-span-2 xl:col-span-4">
          <button type="submit" disabled={eventsQuery.isFetching} className="min-h-9 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">Appliquer</button>
          {hasFilters && <button type="button" onClick={clearFilters} disabled={eventsQuery.isFetching} className="min-h-9 rounded-lg border border-emerald-950/10 bg-white px-3 text-xs font-medium text-emerald-900 hover:bg-emerald-950/[0.04] disabled:opacity-60">Effacer</button>}
        </div>
      </form>

      {eventsQuery.isPending && <p role="status" className="py-8 text-sm">Chargement…</p>}
      {eventsQuery.isError && <p role="alert" className="py-6 text-sm text-rose-700">Impossible de charger l’activité. {eventsQuery.error.message}</p>}
      {eventsQuery.isSuccess && eventsQuery.data.items.length === 0 && (
        <p className="py-8 text-sm text-emerald-950">{hasFilters ? "Aucun événement pour ces filtres." : "Aucune activité. Configure un webhook GitHub en JSON puis envoie un push."}</p>
      )}
      {eventsQuery.isSuccess && eventsQuery.data.items.length > 0 && (
        <>
          <ol className="mt-4 divide-y divide-emerald-950/10" aria-label="Événements Git">
            {eventsQuery.data.items.map((event) => <EventRow key={event.id} event={event} />)}
          </ol>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-950/10 pt-4 text-xs text-emerald-950">
            <span>{eventsQuery.data.total} événement{eventsQuery.data.total === 1 ? "" : "s"} · page {eventsQuery.data.page} / {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1 || eventsQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="min-h-9 rounded-lg border border-emerald-950/10 px-3 text-emerald-950 hover:bg-emerald-50 disabled:opacity-40">Précédente</button>
              <button type="button" disabled={page >= totalPages || eventsQuery.isFetching} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="min-h-9 rounded-lg border border-emerald-950/10 px-3 text-emerald-950 hover:bg-emerald-50 disabled:opacity-40">Suivante</button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
