"use client";

import { Activity, Boxes, GitBranch, LayoutDashboard, LogOut, Sparkles } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiClient } from "@/shared/api/api-client";

const navigation = [
  { label: "Vue d’ensemble", href: "/", icon: LayoutDashboard, available: true },
  { label: "Dépôts suivis", href: "/repositories", icon: GitBranch, available: true },
  { label: "Dépendances", href: "#", icon: Boxes, available: false },
  { label: "Daily digest", href: "#", icon: Sparkles, available: false },
];

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return <nav aria-label="Navigation principale" className={mobile ? "flex gap-2 overflow-x-auto pb-1" : "mt-8 space-y-1"}>
    {navigation.map(({ label, href, icon: Icon, available }) => {
      const active = available && pathname === href;
      const className = mobile
        ? `flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${active ? "bg-indigo-400/15 text-indigo-100" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"}`
        : `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? "bg-white/[0.07] text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`;

      return available ? <Link key={label} href={href} aria-current={active ? "page" : undefined} className={className}>
        <Icon size={16} aria-hidden="true" />{label}
      </Link> : <span key={label} aria-disabled="true" title="Cette fonctionnalité n’est pas encore disponible." className={`${className} cursor-not-allowed opacity-55`}>
        <Icon size={16} aria-hidden="true" />{label}{!mobile && <span className="ml-auto text-[10px]">Bientôt</span>}
      </span>;
    })}
  </nav>;
}

function SessionStatus() {
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false, refetchOnWindowFocus: true });
  const logout = useMutation({ mutationFn: apiClient.logout, onSuccess: () => window.location.reload() });

  if (userQuery.isPending) return <div className="rounded-xl border border-white/[0.08] p-4 text-xs text-slate-400" role="status">Vérification de la session…</div>;
  if (userQuery.isError) return <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.04] p-4">
    <p className="flex items-center gap-2 text-xs font-semibold text-amber-100"><span className="size-2 rounded-full bg-amber-300" />Session GitHub inactive</p>
    <p className="mt-2 text-xs leading-5 text-slate-400">Reconnecte-toi pour gérer tes dépôts.</p>
    <a href={apiClient.getGitHubLoginUrl()} className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-indigo-500 px-3 text-xs font-semibold text-white transition hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300">Se connecter avec GitHub</a>
  </div>;

  return <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.035] p-4">
    <p className="flex items-center gap-2 text-xs font-semibold text-emerald-100"><span className="size-2 rounded-full bg-emerald-300" />Connecté à GitHub</p>
    <p className="mt-2 truncate text-sm font-medium text-white">@{userQuery.data.githubLogin}</p>
    <p className="mt-1 text-[11px] leading-4 text-slate-500">La session expire après 7 jours.</p>
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <a href={apiClient.getGitHubLoginUrl()} className="text-xs font-medium text-indigo-300 underline-offset-4 hover:text-indigo-200 hover:underline">Renouveler la session</a>
      <button type="button" disabled={logout.isPending} onClick={() => logout.mutate()} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-60"><LogOut size={13} aria-hidden="true" />{logout.isPending ? "Déconnexion…" : "Se déconnecter"}</button>
    </div>
    {logout.isError && <p role="alert" className="mt-2 text-xs text-rose-300">{logout.error.message}</p>}
  </div>;
}

function MobileSessionStatus() {
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false, refetchOnWindowFocus: true });

  if (userQuery.isPending) return <span className="text-[11px] text-slate-500">Vérification…</span>;
  if (userQuery.isError) return <a href={apiClient.getGitHubLoginUrl()} className="rounded-lg bg-indigo-500 px-3 py-2 text-xs font-semibold text-white">Se connecter</a>;

  return <div className="flex items-center gap-2">
    <span className="max-w-24 truncate text-[11px] text-emerald-200">@{userQuery.data.githubLogin}</span>
    <a href={apiClient.getGitHubLoginUrl()} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/[0.05]">Renouveler</a>
  </div>;
}

export function AppSidebar() {
  return <>
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.07] bg-[#0a1020] p-5 md:flex">
      <Link href="/" className="flex items-center gap-3 rounded-lg text-lg font-semibold tracking-tight text-white focus-visible:outline-2 focus-visible:outline-indigo-300">
        <span className="grid size-9 place-items-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-950/50"><GitBranch size={18} aria-hidden="true" /></span>
        DevSync
      </Link>
      <p className="mt-10 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Espace de travail</p>
      <NavigationLinks />
      <div className="mt-auto space-y-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-xs leading-5 text-slate-400">
          <Activity size={15} className="mb-2 text-indigo-300" aria-hidden="true" />
          Les webhooks GitHub reçus sont enregistrés. Le fil d’activité arrivera dans une prochaine étape.
        </div>
        <SessionStatus />
      </div>
    </aside>
    <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#0a1020]/95 px-4 py-3 backdrop-blur md:hidden">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-white"><span className="grid size-8 place-items-center rounded-lg bg-indigo-500"><GitBranch size={16} aria-hidden="true" /></span>DevSync</Link>
        <MobileSessionStatus />
      </div>
      <NavigationLinks mobile />
    </header>
  </>;
}
