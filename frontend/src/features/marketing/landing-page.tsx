import Link from "next/link";
import { Activity, ArrowUpRight, GitBranch, ShieldCheck, Sparkles } from "lucide-react";
import { apiClient } from "@/shared/api/api-client";

const previewEvents = [
  { kind: "Pull request", title: "Améliore la gestion des erreurs", repo: "acme / api", tone: "preview-dot-indigo" },
  { kind: "Push", title: "Ajoute la page de paramètres", repo: "acme / dashboard", tone: "preview-dot-cyan" },
  { kind: "Issue", title: "Mettre à jour les dépendances", repo: "acme / api", tone: "preview-dot-muted" },
];

const features = [
  { icon: Activity, title: "L’activité, au même endroit", description: "Retrouve les pushes, pull requests et issues reçus par tes webhooks GitHub." },
  { icon: GitBranch, title: "Tes dépôts sous les yeux", description: "Suis tes projets GitHub dans un espace privé, dépôt par dépôt." },
  { icon: Sparkles, title: "Des résumés utiles", description: "Génère un résumé quotidien des changements enregistrés dans DevSync." },
];

export function LandingPage() {
  return (
    <main className="landing-page min-h-screen overflow-hidden">
      <header className="landing-header mx-auto flex max-w-[1360px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <Link href="/" className="landing-brand flex items-center gap-2.5 text-lg font-bold tracking-[-0.055em]" aria-label="DevSync, accueil">
          <BrandMark /> DevSync
        </Link>
        <nav aria-label="Navigation principale" className="hidden items-center gap-8 text-sm font-medium sm:flex">
          <a href="#fonctionnalites">Fonctionnalités</a>
          <a href="#demarrage">Comment ça marche</a>
        </nav>
        <a href={apiClient.getGitHubLoginUrl()} className="landing-login rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors">
          Connexion GitHub
        </a>
      </header>

      <section className="landing-hero relative mx-auto grid max-w-[1360px] items-center gap-14 px-5 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-16 lg:min-h-[720px] lg:grid-cols-[1.02fr_.98fr] lg:gap-8 lg:px-12 lg:py-20">
        <div className="landing-copy relative z-10">
          <p className="landing-eyebrow">La veille technique de tes projets</p>
          <h1 className="landing-title mt-5">
            Les infos de tes<br />dépôts à portée<br />de main
            <span className="landing-gradient-text block whitespace-nowrap">(et de vue)</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 sm:text-lg sm:leading-8">
            L’activité GitHub, les dépendances et les résumés de tes projets réunis dans un espace simple à parcourir.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={apiClient.getGitHubLoginUrl()} className="landing-cta inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold">
              Commencer avec GitHub <ArrowUpRight size={17} aria-hidden="true" />
            </a>
            <a href="#fonctionnalites" className="landing-secondary-link inline-flex min-h-12 items-center rounded-xl px-4 text-sm font-semibold">Découvrir DevSync</a>
          </div>
          <p className="landing-privacy mt-5 inline-flex items-center gap-2 text-sm"><ShieldCheck size={15} aria-hidden="true" /> Tes dépôts restent associés à ton compte.</p>
        </div>

        <div className="landing-art relative mx-auto w-full max-w-[620px] lg:ml-auto">
          <div className="landing-equalizer" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
          <section aria-label="Aperçu du tableau d’activité DevSync" className="landing-dashboard relative z-10 rounded-[1.6rem] border p-5 sm:p-7">
            <div className="flex items-center justify-between border-b pb-5">
              <div className="flex items-center gap-3">
                <span className="preview-app-icon"><BrandMark /></span>
                <div><p className="text-sm font-semibold">Vue d’ensemble</p><p className="preview-muted mt-0.5 text-xs">Ton activité récente</p></div>
              </div>
              <span className="preview-live"><span /> En direct</span>
            </div>
            <div className="grid grid-cols-2 gap-3 py-5">
              <div className="preview-stat"><p className="preview-muted text-xs">Dépôts suivis</p><p className="mt-2 text-2xl font-semibold">04</p></div>
              <div className="preview-stat"><p className="preview-muted text-xs">Événements</p><p className="mt-2 text-2xl font-semibold">18</p></div>
            </div>
            <div className="preview-list-heading flex items-center justify-between border-t pt-4">
              <p className="text-sm font-semibold">Activité Git</p><span className="preview-muted text-xs">Aujourd’hui</span>
            </div>
            <ol className="preview-event-list mt-2 divide-y">
              {previewEvents.map((event) => (
                <li key={event.title} className="flex items-center gap-3 py-4">
                  <span className={`preview-event-dot ${event.tone}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{event.title}</p><p className="preview-muted mt-1 text-xs">{event.repo} · {event.kind}</p></div>
                  <span className="preview-muted text-[11px]">récent</span>
                </li>
              ))}
            </ol>
            <div className="preview-digest mt-2 flex items-center gap-3 rounded-xl p-4">
              <span className="preview-digest-icon"><Sparkles size={16} aria-hidden="true" /></span>
              <div><p className="text-sm font-semibold">Résumé quotidien</p><p className="preview-muted mt-1 text-xs">Les changements, résumés pour toi.</p></div>
              <ArrowUpRight className="preview-muted ml-auto" size={16} aria-hidden="true" />
            </div>
          </section>
          <p className="preview-caption mt-4 text-center text-xs">Aperçu de l’interface DevSync</p>
        </div>
      </section>

      <section id="fonctionnalites" className="landing-features relative overflow-hidden border-y">
        <div className="mx-auto max-w-[1360px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
          <div className="max-w-3xl">
            <p className="landing-eyebrow">Un espace, trois repères</p>
            <h2 className="landing-section-title mt-4 text-4xl font-bold leading-[1.04] tracking-[-0.06em] sm:text-6xl">Garde le fil.<br /><span className="landing-gradient-text">Sans ouvrir dix onglets.</span></h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }, index) => (
              <article key={title} className="landing-feature-card rounded-2xl border p-6 sm:p-7">
                <span className="landing-feature-icon"><Icon size={19} aria-hidden="true" /></span>
                <p className="landing-feature-number mt-8">0{index + 1}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{title}</h3>
                <p className="landing-feature-description mt-3 text-sm leading-6">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="demarrage" className="mx-auto max-w-[1360px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div><p className="landing-eyebrow">Trois étapes pour commencer</p><h2 className="landing-section-title mt-4 text-4xl font-bold leading-[1.04] tracking-[-0.06em] sm:text-5xl">De GitHub à ton fil.<br />Tout simplement.</h2></div>
          <p className="landing-how-copy max-w-md text-sm leading-6">Tu ajoutes ton dépôt, tu configures manuellement le webhook fourni, puis DevSync affiche les événements reçus.</p>
        </div>
        <ol className="landing-steps mt-10 grid gap-3 md:grid-cols-3">
          <Step number="01" title="Connecte GitHub" description="Ouvre ton espace personnel avec ton compte GitHub." />
          <Step number="02" title="Ajoute un dépôt" description="Choisis un dépôt et configure son webhook dans GitHub." />
          <Step number="03" title="Suis les changements" description="Retrouve l’activité, les analyses et les résumés dans DevSync." />
        </ol>
      </section>

      <section className="landing-bottom relative overflow-hidden border-t">
        <div className="landing-bottom-inner relative mx-auto flex max-w-[1360px] flex-col gap-7 px-5 py-14 sm:px-8 sm:py-16 md:flex-row md:items-center md:justify-between lg:px-12">
          <div><p className="landing-eyebrow">Ton prochain espace de travail</p><h2 className="landing-section-title mt-3 text-3xl font-bold tracking-[-0.055em] sm:text-4xl">Tes dépôts. Tout le signal.</h2></div>
          <a href={apiClient.getGitHubLoginUrl()} className="landing-cta inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold">Connexion avec GitHub <ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
      </section>

      <footer className="landing-footer flex flex-col items-center justify-between gap-3 px-5 py-6 text-sm sm:flex-row sm:px-8 lg:px-12">
        <Link href="/" className="landing-brand flex items-center gap-2 font-bold"><BrandMark /> DevSync</Link>
        <span>Veille technique pour tes dépôts GitHub</span>
      </footer>
    </main>
  );
}

function BrandMark() {
  return <span className="landing-mark" aria-hidden="true"><span /><span /><span /><span /></span>;
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return <li className="landing-step rounded-2xl border p-6 sm:p-7"><span>{number}</span><h3 className="mt-8 text-lg font-semibold">{title}</h3><p className="landing-step-copy mt-2 text-sm leading-6">{description}</p></li>;
}
