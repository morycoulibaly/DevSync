import Link from "next/link";
import { ArrowRight, GitBranch } from "lucide-react";

export function PageHeader() {
  return <header className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-300">Ton espace développeur</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Vue d’ensemble</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Centralise les dépôts GitHub que tu suis. Commence par connecter un dépôt pour configurer la réception de ses événements.</p>
    </div>
    <Link href="/repositories" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-indigo-500 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 sm:self-auto">
      <GitBranch size={16} aria-hidden="true" /> Connecter un dépôt <ArrowRight size={15} aria-hidden="true" />
    </Link>
  </header>;
}
