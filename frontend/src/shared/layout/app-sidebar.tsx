"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { apiClient, isUnauthorizedError } from "@/shared/api/api-client";

const navigationGroups = [
  { label: "Suivi", items: [
    { label: "Vue d’ensemble", href: "/" },
    { label: "Dépôts suivis", href: "/repositories" },
  ] },
  { label: "Analyses", items: [
    { label: "Dépendances", href: "/dependencies" },
    { label: "Résumé quotidien", href: "/digest" },
    { label: "Notifications", href: "/notifications" },
  ] },
];

function NavigationLinks({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const links = navigationGroups.flatMap((group) => group.items);

  function renderLink({ label, href }: { label: string; href: string }) {
      const active = pathname === href;
      const className = mobile
        ? `workspace-nav-link workspace-nav-mobile flex min-h-11 items-center rounded-xl px-3.5 text-sm font-medium ${active ? "workspace-nav-active font-semibold" : ""}`
        : `workspace-nav-link flex items-center rounded-lg px-3 py-2.5 text-sm ${active ? "workspace-nav-active font-medium" : ""}`;

      return <Link key={label} href={href} aria-current={active ? "page" : undefined} onClick={onNavigate} className={className}>{label}</Link>;
  }

  return mobile
    ? <nav aria-label="Navigation principale" className="workspace-mobile-navigation grid gap-1">{links.map(renderLink)}</nav>
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

  if (userQuery.isPending) return <span className="text-xs text-white/60">Chargement…</span>;
  if (userQuery.isError && isUnauthorizedError(userQuery.error)) return <a href={apiClient.getGitHubLoginUrl()} className="workspace-session-button inline-flex min-h-11 items-center rounded-xl px-3.5 text-sm font-semibold">Se connecter</a>;
  if (userQuery.isError) return <button type="button" onClick={() => void userQuery.refetch()} className="min-h-11 rounded-xl border border-white/15 px-3.5 text-sm font-semibold text-white">Réessayer</button>;

  return <a href={apiClient.getGitHubLoginUrl()} className="inline-flex min-h-11 items-center rounded-xl border border-white/15 px-3.5 text-sm font-medium text-white hover:bg-white/10">Renouveler</a>;
}

function MobileLogoutAction() {
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false });
  const logout = useMutation({
    mutationFn: apiClient.logout,
    onSuccess: () => window.location.reload(),
  });

  if (!userQuery.isSuccess) return null;

  return <div className="workspace-mobile-account mt-2 border-t pt-2">
    <p className="truncate px-3.5 py-2 text-xs text-white/55">Connecté sous @{userQuery.data.githubLogin}</p>
    <button
      type="button"
      disabled={logout.isPending}
      onClick={() => logout.mutate()}
      className="workspace-mobile-logout flex min-h-11 w-full items-center gap-2 rounded-xl px-3.5 text-sm font-semibold disabled:opacity-60"
    >
      <LogOut size={16} aria-hidden="true" />
      {logout.isPending ? "Déconnexion…" : "Se déconnecter"}
    </button>
    {logout.isError && <p role="alert" className="px-3.5 py-2 text-xs">Impossible de fermer la session. Réessaie.</p>}
  </div>;
}

export function AppSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userQuery = useQuery({ queryKey: ["current-user"], queryFn: apiClient.getCurrentUser, retry: false });

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isMobileMenuOpen]);

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
    <header className="workspace-mobile-header sticky top-0 z-30 border-b px-4 py-3 md:hidden">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="workspace-brand flex items-center gap-2 font-extrabold"><BrandMark />DevSync</Link>
        <div className="flex items-center gap-2">
          <MobileSessionStatus />
          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Fermer la navigation" : "Ouvrir la navigation"}
            aria-controls="mobile-navigation"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="workspace-menu-toggle grid size-11 shrink-0 place-items-center rounded-xl"
          >
            {isMobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {isMobileMenuOpen && <div id="mobile-navigation" className="workspace-mobile-menu mt-3 rounded-2xl border p-2">
        <NavigationLinks mobile onNavigate={() => setIsMobileMenuOpen(false)} />
        <MobileLogoutAction />
      </div>}
    </header>
  </>;
}

function BrandMark() {
  return <span className="landing-mark" aria-hidden="true"><span /><span /><span /><span /></span>;
}
