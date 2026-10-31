import Link from "next/link";
import { apiClient } from "@/shared/api/api-client";

const activity = [
  { type: "Pull request", title: "Améliore la gestion des erreurs", repository: "acme / api", color: "bg-fuchsia-500" },
  { type: "Push", title: "Ajoute la page de paramètres", repository: "acme / dashboard", color: "bg-cyan-400" },
  { type: "Issue", title: "Mettre à jour les dépendances", repository: "acme / api", color: "bg-amber-400" },
];

const steps = [
  { number: "01", title: "Connecte GitHub", description: "Ouvre une session avec ton compte GitHub pour accéder à ton espace personnel." },
  { number: "02", title: "Ajoute un dépôt", description: "Choisis un dépôt, puis configure dans GitHub le webhook fourni par DevSync." },
  { number: "03", title: "Suis les changements", description: "Retrouve les pushes, pull requests et issues dans ton fil d’activité." },
];

const spectrum = ["bg-fuchsia-500", "bg-violet-500", "bg-blue-500", "bg-cyan-400", "bg-lime-400", "bg-amber-400", "bg-orange-500"];

export function LandingPage() {
  return (
    <main className="landing-page min-h-screen overflow-hidden bg-[#fdfcfe] text-[#17131d]">
      <header className="landing-header mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-14">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.06em]" aria-label="DevSync, accueil">
          <span className="landing-mark" aria-hidden="true"><span /><span /><span /><span /></span>
          DevSync
        </Link>
        <nav aria-label="Navigation de la page" className="hidden items-center gap-8 text-sm font-semibold sm:flex">
          <a href="#fonctionnement" className="transition-colors hover:text-violet-700">Découvrir</a>
          <a href="#fonctionnalites" className="transition-colors hover:text-violet-700">Fonctionnalités</a>
        </nav>
        <a href={apiClient.getGitHubLoginUrl()} className="landing-login rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold transition hover:border-black hover:bg-black hover:text-white">
          Connexion GitHub
        </a>
      </header>

      <section className="landing-hero relative mx-auto grid max-w-[1440px] items-center gap-12 px-5 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-14 lg:pb-32 lg:pt-20">
        <div className="landing-copy relative z-10">
          <p className="landing-eyebrow">La veille technique qui suit ton rythme</p>
          <h1 className="landing-title mt-5 max-w-3xl text-[clamp(2.6rem,6.1vw,6rem)] font-extrabold leading-[0.98] tracking-[-0.075em]">
            Les infos de tes<br />dépôts à portée<br />de main<br /><span className="landing-gradient-text whitespace-nowrap">(et de vue)</span>
          </h1>
          <p className="mt-7 max-w-xl text-base leading-7 text-[#514c58] sm:text-lg sm:leading-8">
            L’activité GitHub et les dépendances de tes projets réunies dans un espace clair. Moins d’onglets ouverts, plus de visibilité sur ce qui change.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href={apiClient.getGitHubLoginUrl()} className="landing-cta inline-flex min-h-12 items-center justify-center rounded-full bg-[#17131d] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600">
              Commencer avec GitHub <span className="ml-2 text-lg" aria-hidden="true">↗</span>
            </a>
            <a href="#fonctionnement" className="inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-semibold transition hover:bg-black/[0.05]">Découvrir DevSync</a>
          </div>
          <p className="mt-5 text-base text-[#716c77]">Tes dépôts restent associés à ton compte DevSync.</p>
        </div>

        <div className="landing-art relative mx-auto w-full max-w-[620px] lg:ml-auto">
          <div className="landing-orb landing-orb-one" aria-hidden="true" />
          <div className="landing-orb landing-orb-two" aria-hidden="true" />
          <div className="landing-equalizer" aria-hidden="true">{spectrum.map((color, index) => <span key={index} className={color} style={{ animationDelay: `${index * 90}ms` }} />)}</div>
          <section aria-label="Exemple de tableau d’activité DevSync" className="landing-dashboard relative z-10 rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_32px_100px_-42px_rgba(55,30,85,0.5)] backdrop-blur-xl sm:p-7">
            <div className="flex items-center justify-between border-b border-black/[0.08] pb-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-[#17131d] text-sm font-bold text-white">D</span>
                <div><p className="text-sm font-bold">Ton activité</p><p className="mt-0.5 text-[13px] text-[#716c77]">Aperçu de l’interface</p></div>
              </div>
              <div className="flex items-center gap-1.5" aria-label="Synchronisé avec GitHub">
                <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" /><span className="text-xs font-semibold text-[#514c58]">GitHub</span>
              </div>
            </div>
            <div className="divide-y divide-black/[0.07]">
              {activity.map((item) => (
                <article key={item.title} className="landing-activity flex gap-4 py-5 first:pt-5">
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${item.color}`} aria-hidden="true" />
                  <div className="min-w-0"><p className="text-[13px] font-semibold text-[#716c77]">{item.type}</p><p className="mt-1 truncate text-sm font-bold">{item.title}</p><p className="mt-1 text-[13px] text-[#716c77]">{item.repository}</p></div>
                  <span className="ml-auto mt-1 text-[13px] text-[#928d98]">Exemple</span>
                </article>
              ))}
            </div>
            <div className="landing-scan mt-2 rounded-2xl bg-[#17131d] p-4 text-white sm:p-5">
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold">Dépendances</p><span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold">Scan manuel</span></div>
              <p className="mt-2 text-base leading-7 text-white/70">Repère les versions obsolètes et les vulnérabilités connues.</p>
              <div className="mt-4 flex h-1.5 overflow-hidden rounded-full">{spectrum.map((color, index) => <span key={index} className={`flex-1 ${color}`} />)}</div>
            </div>
          </section>
          <p className="relative z-10 mt-4 text-center text-[13px] text-[#716c77]">Données d’exemple — ton activité apparaît après configuration.</p>
        </div>
      </section>

      <section id="fonctionnalites" className="landing-dark-section relative overflow-hidden bg-[#17131d] text-white">
        <div className="landing-dark-glow" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-14">
          <div className="max-w-4xl">
            <p className="landing-eyebrow landing-eyebrow-light">Tout ce qui bouge, en un regard</p>
            <h2 className="landing-section-title mt-5 text-4xl font-extrabold leading-[0.98] tracking-[-0.065em] sm:text-6xl lg:text-7xl">Du code qui évolue.<br /><span className="landing-gradient-text">Une vue qui suit.</span></h2>
          </div>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <FeatureCard number="01" title="L’activité Git" description="Retrouve les pushes, pull requests et issues reçus par tes webhooks GitHub." accent="from-fuchsia-500 to-violet-500" />
            <FeatureCard number="02" title="Les dépendances" description="Lance un scan manuel d’un dépôt public suivi ou d’un package.json." accent="from-blue-500 to-cyan-400" />
            <FeatureCard number="03" title="Ton espace" description="Chaque compte dispose de ses propres dépôts et de son propre fil d’activité." accent="from-lime-400 to-amber-400" />
          </div>
        </div>
      </section>

      <section id="fonctionnement" className="mx-auto max-w-[1440px] px-5 py-20 sm:px-8 sm:py-28 lg:px-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="landing-eyebrow">Prêt en quelques étapes</p><h2 className="landing-section-title mt-4 max-w-3xl text-4xl font-extrabold leading-[0.98] tracking-[-0.065em] sm:text-6xl">De GitHub à ton fil.<br />C’est tout.</h2></div>
          <p className="max-w-sm text-base leading-7 text-[#716c77]">Les webhooks sont configurés manuellement pour garder la mise en place simple et transparente.</p>
        </div>
        <ol className="mt-12 grid gap-3 md:grid-cols-3">
          {steps.map((step) => <li key={step.number} className="landing-step rounded-3xl border border-black/[0.09] p-6 sm:p-7"><span className="text-sm font-extrabold text-violet-700">{step.number}</span><h3 className="mt-9 text-xl font-extrabold tracking-tight">{step.title}</h3><p className="mt-3 text-base leading-7 text-[#625d68]">{step.description}</p></li>)}
        </ol>
      </section>

      <section className="landing-bottom relative overflow-hidden bg-[#f0ebff]">
        <div className="landing-bottom-inner relative mx-auto flex max-w-[1440px] flex-col gap-8 px-5 py-16 sm:px-8 sm:py-20 md:flex-row md:items-center md:justify-between lg:px-14">
          <div><p className="landing-eyebrow">Prends le fil</p><h2 className="landing-section-title mt-3 max-w-2xl text-4xl font-extrabold leading-[0.98] tracking-[-0.065em] sm:text-5xl">Tes projets avancent.<br />Reste dans le mouvement.</h2></div>
          <a href={apiClient.getGitHubLoginUrl()} className="landing-cta inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-[#17131d] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-violet-700">Connexion avec GitHub <span className="ml-2 text-lg" aria-hidden="true">↗</span></a>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-3 bg-[#17131d] px-5 py-6 text-sm text-white/65 sm:flex-row sm:px-8 lg:px-14">
        <Link href="/" className="font-extrabold tracking-[-0.05em] text-white">DevSync</Link>
        <span>Veille technique pour tes dépôts GitHub</span>
      </footer>
    </main>
  );
}

function FeatureCard({ number, title, description, accent }: { number: string; title: string; description: string; accent: string }) {
  return <article className="landing-feature-card group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-6 transition duration-300 hover:-translate-y-1 hover:bg-white/[0.08] sm:p-7"><div className={`mb-8 h-1.5 w-16 rounded-full bg-gradient-to-r ${accent}`} /><p className="text-xs font-bold text-white/45">{number}</p><h3 className="mt-3 text-xl font-extrabold tracking-tight">{title}</h3><p className="mt-3 max-w-sm text-base leading-7 text-white/70">{description}</p></article>;
}
