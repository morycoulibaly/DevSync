"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiClient, isUnauthorizedError } from "@/shared/api/api-client";

const navigationGroups = [
  { label: "SUIVI", items: [
    { label: "Vue d’ensemble", href: "/" },
    { label: "Dépôts suivis", href: "/repositories" },
  ] },
  { label: "ANALYSES", items: [
    { label: "Dépendances", href: "/dependencies" },
    { label: "Résumé quotidien", href: "/digest" },
  ] },
];

function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  const links = navigationGroups.flatMap((group) => group.items);

  function renderLink({ label, href }: { label: string; href: string }) {
      const active = pathname === href;
      const className = mobile
        ? `workspace-nav-link workspace-nav-mobile flex shrink-0 items-center rounded-lg px-3 py-2 text-xs font-medium ${active ? "workspace-nav-active" : ""}`
        : `workspace-nav-link flex items-center rounded-lg px-3 py-2.5 text-sm ${active ? "workspace-nav-active font-medium" : ""}`;

      return <Link key={label} href={href} aria-current={active ? "page" : undefined} className={className}>{label}</Link>;
  }

  return mobile
    ? <nav aria-label="Navigation principale" className="flex gap-2 overflow-x-auto pb-1">{links.map(renderLink)}</nav>
    : <nav aria-label="Navigation principale" className="mt-8 space-y-6">
      {navigationGroups.map((group) => <div key={group.label}>
        <p className="workspace-nav-group-label mb-2 px-3">{group.label}</p>
        <div className="space-y-1">{group.items.map(renderLink)}</div>
      </div>)}
    </nav>;
}

function SessionStatus() {
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false, refetchOnWindowFocus: true });
  const logout = useMutation({ mutationFn: apiClient.logout, onSuccess: () => window.location.reload() });

  if (userQuery.isPending) return <div className="p-2 text-xs" role="status">Chargement…</div>;
  if (userQuery.isError && isUnauthorizedError(userQuery.error)) return <div className="workspace-session-card rounded-xl border p-4">
    <p className="text-sm font-medium">Session GitHub inactive</p>
    <a href={apiClient.getGitHubLoginUrl()} className="workspace-session-button mt-3 inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-semibold transition">Se connecter</a>
  </div>;
  if (userQuery.isError) return <div className="workspace-session-card rounded-xl border p-4">
    <p className="text-sm font-medium">Serveur DevSync indisponible</p>
    <button type="button" onClick={() => void userQuery.refetch()} className="mt-3 text-xs font-semibold text-violet-300 hover:text-white">Réessayer</button>
  </div>;

  return <div className="workspace-session-card rounded-xl border p-4">
    <p className="truncate text-sm font-medium">@{userQuery.data.githubLogin}</p>
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
      <a href={apiClient.getGitHubLoginUrl()} className="text-xs font-medium text-violet-300 hover:text-white">Renouveler la session</a>
      <button type="button" disabled={logout.isPending} onClick={() => logout.mutate()} className="text-xs text-white/60 hover:text-white disabled:opacity-60">{logout.isPending ? "Déconnexion…" : "Se déconnecter"}</button>
    </div>
    {logout.isError && <p role="alert" className="mt-2 text-xs text-rose-700">{logout.error.message}</p>}
  </div>;
}

function MobileSessionStatus() {
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false, refetchOnWindowFocus: true });

  if (userQuery.isPending) return <span className="text-[11px] text-white/60">Chargement…</span>;
  if (userQuery.isError && isUnauthorizedError(userQuery.error)) return <a href={apiClient.getGitHubLoginUrl()} className="workspace-session-button rounded-full px-3 py-2 text-xs font-semibold">Se connecter</a>;
  if (userQuery.isError) return <button type="button" onClick={() => void userQuery.refetch()} className="rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white">Réessayer</button>;

  return <div className="flex items-center gap-2">
    <span className="max-w-24 truncate text-[11px] text-white/75">@{userQuery.data.githubLogin}</span>
    <a href={apiClient.getGitHubLoginUrl()} className="rounded-full border border-white/15 px-3 py-2 text-xs font-medium text-white hover:bg-white/10">Renouveler</a>
  </div>;
}

export function AppSidebar() {
  const pathname = usePathname();
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false });

  // La page d’accueil devient une landing publique tant que la session est absente.
  if (pathname === "/" && !userQuery.isSuccess) return null;

  return <>
    <aside className="workspace-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r p-5 md:flex">
      <Link href="/" className="workspace-brand flex items-center gap-2.5 rounded-lg text-lg font-extrabold tracking-tight focus-visible:outline-2">
        <BrandMark />DevSync
      </Link>
      <NavigationLinks />
      <div className="mt-auto"><SessionStatus /></div>
    </aside>
    <header className="workspace-mobile-header sticky top-0 z-30 border-b px-4 py-3 backdrop-blur md:hidden">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="workspace-brand flex items-center gap-2 font-extrabold"><BrandMark />DevSync</Link>
        <MobileSessionStatus />
      </div>
      <NavigationLinks mobile />
    </header>
  </>;
}

function BrandMark() {
  return <span className="landing-mark" aria-hidden="true"><span /><span /><span /><span /></span>;
}
