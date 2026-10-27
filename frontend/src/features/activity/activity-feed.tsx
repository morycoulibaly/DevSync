"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowDownLeft, ArrowUpRight, CircleAlert, GitPullRequest, LoaderCircle, RotateCw } from "lucide-react";
import { useState } from "react";
import { apiClient, type GitEvent, type GitEventType } from "@/shared/api/api-client";

const PAGE_SIZE = 20;

const eventAppearance: Record<GitEventType, { label: string; Icon: typeof Activity; color: string }> = {
  PUSH: { label: "Push", Icon: ArrowUpRight, color: "text-violet-200 bg-violet-300/10" },
  PULL_REQUEST: { label: "Pull request", Icon: GitPullRequest, color: "text-emerald-200 bg-emerald-300/10" },
  ISSUE: { label: "Issue", Icon: CircleAlert, color: "text-amber-100 bg-amber-300/10" },
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function EventRow({ event }: { event: GitEvent }) {
  const appearance = eventAppearance[event.type] ?? eventAppearance.PUSH;
  const { Icon } = appearance;
  const eventTitle = event.url ? <a href={event.url} target="_blank" rel="noreferrer" className="font-medium text-slate-100 underline decoration-white/20 underline-offset-4 transition hover:text-indigo-200 hover:decoration-indigo-300">{event.title || "Événement GitHub"}<span className="sr-only"> (ouvre GitHub dans un nouvel onglet)</span></a> : <span className="font-medium text-slate-100">{event.title || "Événement GitHub"}</span>;

  return <li className="flex gap-3 py-4 first:pt-0 last:pb-0">
    <div className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${appearance.color}`} aria-hidden="true"><Icon size={16} /></div>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
        <span className="font-medium text-slate-200">{event.actorLogin || "GitHub"}</span>
        <span aria-hidden="true">·</span><span>{appearance.label}{event.action ? ` · ${event.action}` : ""}</span>
        {event.status && <><span aria-hidden="true">·</span><span>{event.status}</span></>}
      </div>
      <div className="mt-1.5 break-words text-sm leading-5">{eventTitle}</div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-500">
        <span className="max-w-full truncate rounded-md bg-white/[0.04] px-1.5 py-0.5">{event.repositoryName}</span>
        <span aria-hidden="true">·</span><time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>
      </div>
    </div>
  </li>;
}

export function ActivityFeed() {
  const [page, setPage] = useState(1);
  const eventsQuery = useQuery({
    queryKey: ["events", page, PAGE_SIZE],
    queryFn: () => apiClient.getEvents(page, PAGE_SIZE),
    retry: false,
  });
  const totalPages = eventsQuery.data ? Math.max(1, Math.ceil(eventsQuery.data.total / PAGE_SIZE)) : 1;

  return <section aria-labelledby="activity-heading" className="rounded-2xl border border-white/[0.08] bg-[#111827]/75 p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-indigo-400/10 text-indigo-200"><Activity size={16} aria-hidden="true" /></span><h2 id="activity-heading" className="font-semibold text-white">Activité Git récente</h2></div>
        <p className="mt-2 text-xs leading-5 text-slate-400">Les derniers événements reçus depuis tes dépôts.</p>
      </div>
      <button type="button" onClick={() => void eventsQuery.refetch()} disabled={eventsQuery.isFetching} aria-label="Actualiser l’activité" title="Actualiser" className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50">
        <RotateCw size={15} className={eventsQuery.isFetching ? "animate-spin" : ""} aria-hidden="true" />
      </button>
    </div>

    {eventsQuery.isPending && <div role="status" className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-white/[0.06] py-12 text-sm text-slate-400"><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />Chargement de l’activité…</div>}

    {eventsQuery.isError && <div role="alert" className="mt-6 rounded-xl border border-rose-300/15 bg-rose-300/[0.04] p-4">
      <p className="text-sm font-medium text-rose-100">Impossible de charger l’activité.</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{eventsQuery.error.message}</p>
      <button type="button" onClick={() => void eventsQuery.refetch()} className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/[0.05]">Réessayer</button>
    </div>}

    {eventsQuery.isSuccess && eventsQuery.data.items.length === 0 && <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-5 py-9 text-center">
      <span className="grid size-11 place-items-center rounded-2xl bg-slate-800 text-slate-300"><ArrowDownLeft size={19} aria-hidden="true" /></span>
      <p className="mt-4 text-sm font-medium text-slate-200">Aucune activité reçue</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">Ajoute un dépôt, puis configure son webhook dans les paramètres GitHub. Les nouveaux push, pull requests et issues apparaîtront ici.</p>
    </div>}

    {eventsQuery.isSuccess && eventsQuery.data.items.length > 0 && <>
      <ol className="mt-5 divide-y divide-white/[0.06]" aria-label="Événements Git récents">
        {eventsQuery.data.items.map((event) => <EventRow key={event.id} event={event} />)}
      </ol>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4 text-xs text-slate-500">
        <span>{eventsQuery.data.total} événement{eventsQuery.data.total === 1 ? "" : "s"} · page {eventsQuery.data.page} sur {totalPages}</span>
        <div className="flex gap-2">
          <button type="button" disabled={page <= 1 || eventsQuery.isFetching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="min-h-9 rounded-lg border border-white/10 px-3 text-slate-200 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">Précédente</button>
          <button type="button" disabled={page >= totalPages || eventsQuery.isFetching} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="min-h-9 rounded-lg border border-white/10 px-3 text-slate-200 hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40">Suivante</button>
        </div>
      </div>
    </>}
  </section>;
}
