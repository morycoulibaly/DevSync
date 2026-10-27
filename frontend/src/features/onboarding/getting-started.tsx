import Link from "next/link";
import { ArrowRight, Check, Circle, GitBranch, RadioTower } from "lucide-react";

const steps = [
  { title: "Enregistrer un dépôt", description: "Indique son propriétaire et son nom GitHub.", done: false },
  { title: "Ajouter le webhook dans GitHub", description: "Copie l’URL et le secret fournis par DevSync.", done: false },
  { title: "Recevoir les événements", description: "Les push, pull requests et issues sont sauvegardés.", done: true },
];

export function GettingStarted() {
  return <section aria-labelledby="getting-started-heading" className="rounded-2xl border border-white/[0.08] bg-[#111827]/75 p-5 sm:p-6">
    <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-emerald-300/10 text-emerald-200"><GitBranch size={16} aria-hidden="true" /></span><h2 id="getting-started-heading" className="font-semibold text-white">Comment commencer</h2></div>
    <p className="mt-2 text-xs leading-5 text-slate-400">Trois étapes simples pour connecter un dépôt.</p>
    <ol className="mt-6 space-y-5">
      {steps.map(({ title, description, done }, index) => <li className="flex gap-3" key={title}>
        <span className={`grid size-7 shrink-0 place-items-center rounded-full ${done ? "bg-emerald-300/10 text-emerald-200" : "border border-white/10 bg-white/[0.025] text-slate-400"}`} aria-label={done ? "Étape disponible" : `Étape ${index + 1}`}>
          {done ? <Check size={14} aria-hidden="true" /> : <span className="text-[11px]">{index + 1}</span>}
        </span>
        <span className="pt-0.5"><b className="text-sm font-medium text-slate-200">{title}</b><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
      </li>)}
    </ol>
    <div className="mt-6 rounded-xl border border-indigo-300/10 bg-indigo-300/[0.04] p-3.5">
      <div className="flex gap-2.5"><RadioTower size={15} className="mt-0.5 shrink-0 text-indigo-200" aria-hidden="true" /><p className="text-xs leading-5 text-slate-400">Le webhook peut être testé sur ta machine avec un tunnel public temporaire. Son adresse change si le tunnel redémarre.</p></div>
    </div>
    <Link href="/repositories" className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-3 text-xs font-semibold text-slate-100 transition hover:bg-white/10">Configurer un dépôt <ArrowRight size={14} aria-hidden="true" /></Link>
  </section>;
}
