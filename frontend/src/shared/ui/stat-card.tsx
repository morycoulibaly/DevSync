import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}

export function StatCard({ label, value, note, icon: Icon }: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-center justify-between text-sm text-slate-400"><span>{label}</span><Icon size={18} aria-hidden="true" /></div>
      <div className="mt-5 text-3xl font-semibold">{value}</div>
      <p className="mt-2 text-xs text-slate-500">{note}</p>
    </article>
  );
}
