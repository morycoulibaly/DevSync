"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiClient, isUnauthorizedError, type DependencyScan, type DependencyScanJobStatus } from "@/shared/api/api-client";

const initialPackageJson = `{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0"
  }
}`;
const SCANS_PER_PAGE = 5;

const severityLabels = {
  LOW: "Faible",
  MODERATE: "Modérée",
  HIGH: "Élevée",
  CRITICAL: "Critique",
} as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function DependenciesPage() {
  const queryClient = useQueryClient();
  const [packageJsonText, setPackageJsonText] = useState(initialPackageJson);
  const [packageLockText, setPackageLockText] = useState("");
  const [selectedRepositoryId, setSelectedRepositoryId] = useState("");
  const [scanMode, setScanMode] = useState<"repository" | "paste">("repository");
  const [repositoryPackageJsonPath, setRepositoryPackageJsonPath] = useState("package.json");
  const [repositoryPackageLockPath, setRepositoryPackageLockPath] = useState("package-lock.json");
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [asyncScanError, setAsyncScanError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);
  const userQuery = useQuery({
    queryKey: ["current-user"],
    queryFn: apiClient.getCurrentUser,
    retry: false,
  });
  const scansQuery = useQuery({
    queryKey: ["dependency-scans"],
    queryFn: apiClient.getDependencyScans,
    enabled: userQuery.isSuccess,
    retry: false,
  });
  const activeJobQuery = useQuery({
    queryKey: ["dependency-scan-job", activeJobId],
    queryFn: () => apiClient.getDependencyScanJob(activeJobId!),
    enabled: Boolean(activeJobId),
    refetchInterval: (query) => {
      const state = query.state.data?.state;
      return !activeJobId || state === "completed" || state === "failed" ? false : 1000;
    },
  });
  const repositoriesQuery = useQuery({
    queryKey: ["repositories"],
    queryFn: apiClient.getRepositories,
    enabled: userQuery.isSuccess,
    retry: false,
  });
  const scans = scansQuery.data ?? [];
  const historyPageCount = Math.max(1, Math.ceil(scans.length / SCANS_PER_PAGE));
  const visibleScans = scans.slice((historyPage - 1) * SCANS_PER_PAGE, historyPage * SCANS_PER_PAGE);
  const selectedScan = scans.find((scan) => scan.id === selectedScanId) ?? scans[0] ?? null;

  const addScanToHistory = useCallback((scan: DependencyScan) => {
    queryClient.setQueryData<DependencyScan[]>(["dependency-scans"], (previous) => [
      scan,
      ...(previous ?? []).filter((item) => item.id !== scan.id),
    ]);
    setSelectedScanId(scan.id);
    setHistoryPage(1);
  }, [queryClient]);
  const scanMutation = useMutation({
    mutationFn: ({ packageJson, packageLock }: { packageJson: Record<string, unknown>; packageLock?: Record<string, unknown> }) =>
      apiClient.scanPackageJson(packageJson, packageLock),
    onSuccess: (job) => setActiveJobId(job.id),
  });
  const repositoryScanMutation = useMutation({
    mutationFn: () => apiClient.scanRepositoryDependencies(selectedRepositoryId, repositoryPackageJsonPath.trim(), repositoryPackageLockPath.trim() || undefined),
    onSuccess: (job) => setActiveJobId(job.id),
  });

  const jobStatus = activeJobQuery.data as DependencyScanJobStatus | undefined;
  useEffect(() => {
    if (jobStatus?.state === "completed" && jobStatus.result) {
      addScanToHistory(jobStatus.result);
      setActiveJobId(null);
      setAsyncScanError(null);
    } else if (jobStatus?.state === "failed") {
      setAsyncScanError(jobStatus.error ?? "Le scan a échoué. Consulte les informations puis réessaie.");
      setActiveJobId(null);
    }
  }, [jobStatus, addScanToHistory]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    try {
      const parsedPackageJson: unknown = JSON.parse(packageJsonText);
      if (typeof parsedPackageJson !== "object" || parsedPackageJson === null || Array.isArray(parsedPackageJson)) {
        setLocalError("Le contenu doit être un objet package.json.");
        return;
      }
      let parsedPackageLock: Record<string, unknown> | undefined;
      if (packageLockText.trim()) {
        const value: unknown = JSON.parse(packageLockText);
        if (typeof value !== "object" || value === null || Array.isArray(value)) {
          setLocalError("Le contenu du package-lock.json doit être un objet JSON.");
          return;
        }
        parsedPackageLock = value as Record<string, unknown>;
      }
      scanMutation.mutate({ packageJson: parsedPackageJson as Record<string, unknown>, packageLock: parsedPackageLock });
    } catch {
      setLocalError("Le JSON est invalide. Vérifie les guillemets et les virgules.");
    }
  }

  return (
    <main className="workspace-page min-h-screen px-4 py-7 text-emerald-950 sm:px-6 sm:py-10 md:ml-64 md:px-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="landing-eyebrow">Veille de tes projets</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Vérifier les dépendances</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625d68]">Repère les versions anciennes et les avis de sécurité. Choisis un dépôt déjà suivi ou colle les fichiers de ton projet.</p>
        </header>

        {userQuery.isPending && <p role="status">Vérification de ta session GitHub…</p>}
        {userQuery.isError && isUnauthorizedError(userQuery.error) && (
          <section className="rounded-2xl border border-emerald-950/10 bg-white p-5">
            <h2 className="text-lg font-semibold">Session GitHub inactive</h2>
            <a href={apiClient.getGitHubLoginUrl()} className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800">Se connecter à GitHub</a>
          </section>
        )}
        {userQuery.isError && !isUnauthorizedError(userQuery.error) && <section role="alert" className="workspace-alert workspace-alert-error">
          <p className="font-bold">Le serveur DevSync ne répond pas.</p>
          <p className="mt-1">Vérifie que le backend est démarré, puis réessaie.</p>
          <button type="button" onClick={() => void userQuery.refetch()} className="workspace-secondary-button mt-3 min-h-9 rounded-lg px-3 text-sm font-bold">Réessayer</button>
        </section>}

        {userQuery.isSuccess && (
          <>
            <section aria-label="Choisir le type d’analyse" className="flex flex-col gap-4 rounded-2xl border border-emerald-950/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold">Que veux-tu analyser ?</h2>
                <p className="mt-1 text-sm text-[#625d68]">Choisis une seule méthode pour afficher le formulaire correspondant.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f4f0f8] p-1">
                <button type="button" aria-pressed={scanMode === "repository"} onClick={() => setScanMode("repository")} className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition ${scanMode === "repository" ? "bg-white text-violet-800 shadow-sm" : "text-[#625d68] hover:text-[#17131d]"}`}>
                  Dépôt suivi
                </button>
                <button type="button" aria-pressed={scanMode === "paste"} onClick={() => setScanMode("paste")} className={`min-h-10 rounded-lg px-3 text-sm font-semibold transition ${scanMode === "paste" ? "bg-white text-violet-800 shadow-sm" : "text-[#625d68] hover:text-[#17131d]"}`}>
                  Coller mes fichiers
                </button>
              </div>
            </section>

            {scanMode === "repository" && <section className="workspace-card rounded-2xl border p-5 sm:p-6">
              <h2 className="text-lg font-bold">Analyser un dépôt GitHub</h2>
              <p className="mt-2 text-sm leading-6 text-[#625d68]">DevSync lira le package.json et, s’il existe, le package-lock.json. Pour un monorepo, indique le chemin du dossier de l’application.</p>
              {repositoriesQuery.isError && <p role="alert" className="mt-3 text-sm text-rose-700">Impossible de charger les dépôts suivis. {repositoriesQuery.error.message}</p>}
              {repositoriesQuery.data?.length === 0 && <p className="mt-4 rounded-xl bg-violet-50 p-4 text-sm">Tu n’as pas encore de dépôt dans ton espace. Ajoute-en un pour lancer cette analyse.</p>}
              <form onSubmit={(event) => {
                event.preventDefault();
                repositoryScanMutation.mutate();
              }} className="mt-4 grid gap-3 sm:grid-cols-2 sm:items-end">
                <label htmlFor="repository-package-path" className="grid gap-1.5 text-sm font-medium">
                  Chemin du package.json
                  <input id="repository-package-path" required value={repositoryPackageJsonPath} onChange={(event) => setRepositoryPackageJsonPath(event.target.value)} placeholder="package.json" className="h-11 min-w-0 rounded-lg border border-emerald-950/15 bg-white px-3 text-sm outline-none focus:border-emerald-600" />
                </label>
                <label htmlFor="repository-package-lock-path" className="grid gap-1.5 text-sm font-medium">
                  Chemin du package-lock.json
                  <input id="repository-package-lock-path" value={repositoryPackageLockPath} onChange={(event) => setRepositoryPackageLockPath(event.target.value)} placeholder="package-lock.json (facultatif)" className="h-11 min-w-0 rounded-lg border border-emerald-950/15 bg-white px-3 text-sm outline-none focus:border-emerald-600" />
                </label>
                <label htmlFor="repository-to-scan" className="grid gap-1.5 text-sm font-medium">
                  Dépôt à analyser
                <select
                  id="repository-to-scan"
                  required
                  value={selectedRepositoryId}
                  onChange={(event) => setSelectedRepositoryId(event.target.value)}
                  disabled={repositoriesQuery.isPending || !repositoriesQuery.data?.length}
                  className="h-11 min-w-0 rounded-lg border border-emerald-950/15 bg-white px-3 text-sm outline-none focus:border-emerald-600"
                >
                  <option value="">Choisis un dépôt suivi</option>
                  {repositoriesQuery.data?.map((repository) => <option key={repository.id} value={repository.id}>{repository.fullName}</option>)}
                </select>
                </label>
                <button type="submit" disabled={!selectedRepositoryId || repositoryScanMutation.isPending || Boolean(activeJobId) || !repositoryPackageJsonPath.trim()} className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                  {repositoryScanMutation.isPending || activeJobId ? "Analyse du dépôt…" : "Analyser le dépôt"}
                </button>
              </form>
              {repositoryScanMutation.isError && <p role="alert" className="mt-3 text-sm text-rose-700">{repositoryScanMutation.error.message}</p>}
              {asyncScanError && <p role="alert" className="mt-3 text-sm text-rose-700">{asyncScanError}</p>}
              {activeJobQuery.isError && <p role="alert" className="mt-3 text-sm text-rose-700">Impossible de suivre le scan. {activeJobQuery.error.message}</p>}
              {repositoriesQuery.data?.length === 0 && <Link href="/repositories" className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-900">Ajouter un dépôt suivi</Link>}
            </section>}

            {scanMode === "paste" && <section className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
              <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-950/10 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-bold">Coller les fichiers du projet</h2>
                <p className="mt-2 text-sm leading-6 text-[#625d68]">Copie le contenu des fichiers JSON. Le lockfile permet de vérifier les versions exactes installées.</p>
                <label htmlFor="package-json" className="mt-5 block text-sm font-medium">Contenu du package.json</label>
                <textarea
                  id="package-json"
                  required
                  spellCheck={false}
                  value={packageJsonText}
                  onChange={(event) => setPackageJsonText(event.target.value)}
                  className="mt-2 min-h-64 w-full resize-y rounded-xl border border-emerald-950/15 bg-emerald-50/50 p-4 font-mono text-sm leading-6 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                />
                <label htmlFor="package-lock-json" className="mt-4 block text-sm font-medium">Contenu du package-lock.json (facultatif)</label>
                <textarea id="package-lock-json" spellCheck={false} value={packageLockText} onChange={(event) => setPackageLockText(event.target.value)} placeholder="Colle le contenu du package-lock.json pour une analyse plus précise" className="mt-2 min-h-40 w-full resize-y rounded-xl border border-emerald-950/15 bg-emerald-50/50 p-4 font-mono text-sm leading-6 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15" />
                {localError && <p role="alert" className="mt-3 text-sm text-rose-700">{localError}</p>}
                {scanMutation.isError && <p role="alert" className="mt-3 text-sm text-rose-700">{scanMutation.error.message}</p>}
                <button type="submit" disabled={scanMutation.isPending || Boolean(activeJobId)} className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                  {scanMutation.isPending || activeJobId ? "Analyse en cours…" : "Lancer l’analyse"}
                </button>
                {activeJobId && <p className="mt-3 text-sm" role="status">Scan {jobStatus?.state === "active" ? "en cours" : "dans la file d’attente"}…</p>}
              </form>

              <section className="rounded-2xl border border-emerald-950/10 bg-white p-5 sm:p-6">
                <h2 className="text-lg font-semibold">Comment lire le résultat</h2>
                <dl className="mt-4 space-y-4 text-sm leading-6">
                  <div><dt className="font-semibold">Plage déclarée</dt><dd>La plage de versions du fichier, par exemple ^4.2.0.</dd></div>
                  <div><dt className="font-semibold">Dernière version</dt><dd>La version marquée latest par le registre npm.</dd></div>
                  <div><dt className="font-semibold">Version installée</dt><dd>Si un lockfile est fourni, la version exacte utilisée par le projet.</dd></div>
                  <div><dt className="font-semibold">Avis de sécurité</dt><dd>OSV vérifie la version installée quand le lockfile est disponible.</dd></div>
                </dl>
                <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Sans lockfile, DevSync utilise la version minimale indiquée par la plage déclarée. Le scan ne modifie pas le projet.</p>
              </section>
            </section>}

            {scansQuery.isError && <p role="alert" className="text-sm text-rose-700">Impossible de charger l’historique des scans. {scansQuery.error.message}</p>}
            {scansQuery.isPending && <p role="status">Chargement des derniers scans…</p>}
            {scansQuery.isSuccess && scans.length === 0 && <p>Aucun scan enregistré pour le moment.</p>}
            {scans.length > 0 && (
              <section aria-labelledby="scan-history-heading" className="rounded-2xl border border-emerald-950/10 bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><h2 id="scan-history-heading" className="text-lg font-semibold">Historique des analyses</h2><p className="mt-1 text-sm">{scans.length} analyse{scans.length === 1 ? "" : "s"} récente{scans.length === 1 ? "" : "s"}</p></div>
                  {historyPageCount > 1 && <span className="text-sm">Page {historyPage} sur {historyPageCount}</span>}
                </div>
                <ul className="mt-4 divide-y divide-emerald-950/10">
                  {visibleScans.map((scan) => <li key={scan.id} className="py-1"><ScanHistoryEntry scan={scan} selected={selectedScan?.id === scan.id} onSelect={() => setSelectedScanId(scan.id)} /></li>)}
                </ul>
                {historyPageCount > 1 && (
                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" disabled={historyPage === 1} onClick={() => {
                      const nextPage = Math.max(1, historyPage - 1);
                      setHistoryPage(nextPage);
                      setSelectedScanId(scans[(nextPage - 1) * SCANS_PER_PAGE]?.id ?? null);
                    }} className="min-h-9 rounded-full border border-emerald-950/10 px-4 text-sm font-medium disabled:opacity-40">Précédente</button>
                    <button type="button" disabled={historyPage === historyPageCount} onClick={() => {
                      const nextPage = Math.min(historyPageCount, historyPage + 1);
                      setHistoryPage(nextPage);
                      setSelectedScanId(scans[(nextPage - 1) * SCANS_PER_PAGE]?.id ?? null);
                    }} className="min-h-9 rounded-full border border-emerald-950/10 px-4 text-sm font-medium disabled:opacity-40">Suivante</button>
                  </div>
                )}
              </section>
            )}
            {selectedScan && <ScanResults scan={selectedScan} />}
          </>
        )}
      </div>
    </main>
  );
}

function ScanHistoryEntry({ scan, selected, onSelect }: { scan: DependencyScan; selected: boolean; onSelect: () => void }) {
  const dependencyCount = new Set(scan.findings.map((finding) => finding.packageName)).size;
  const vulnerabilityCount = scan.findings.filter((finding) => finding.advisoryId).length;
  const outdatedCount = new Set(scan.findings.filter((finding) => finding.isOutdated).map((finding) => finding.packageName)).size;

  return (
    <button type="button" aria-pressed={selected} onClick={onSelect} className={`w-full rounded-xl px-4 py-3 text-left transition ${selected ? "bg-violet-50 ring-1 ring-violet-200" : "hover:bg-black/[0.035]"}`}>
      <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="font-semibold">{scan.repository?.fullName ?? "package.json collé"}</span>
        <time className="text-sm text-emerald-950/65" dateTime={scan.createdAt}>{formatDate(scan.createdAt)}</time>
      </span>
      <span className="mt-1 block text-sm text-emerald-950/70">{dependencyCount} dépendance{dependencyCount === 1 ? "" : "s"} · {outdatedCount} obsolète{outdatedCount === 1 ? "" : "s"} · {vulnerabilityCount} avis de sécurité</span>
    </button>
  );
}

function ScanResults({ scan }: { scan: DependencyScan }) {
  const dependencyCount = new Set(scan.findings.map((finding) => finding.packageName)).size;
  const vulnerabilityCount = scan.findings.filter((finding) => finding.advisoryId).length;
  const outdatedCount = new Set(scan.findings.filter((finding) => finding.isOutdated).map((finding) => finding.packageName)).size;

  return (
    <section className="rounded-2xl border border-emerald-950/10 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">Résultat : {scan.repository?.fullName ?? "package.json fourni"}</h2>
        <time className="text-sm text-emerald-950" dateTime={scan.createdAt}>{formatDate(scan.createdAt)}</time>
      </div>
      <p className="mt-2 text-sm">{dependencyCount} dépendance{dependencyCount === 1 ? "" : "s"} · {outdatedCount} obsolète{outdatedCount === 1 ? "" : "s"} · {vulnerabilityCount} avis de sécurité</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead><tr className="border-b border-emerald-950/15">
            <th scope="col" className="py-3 pr-4 font-semibold">Dépendance</th>
            <th scope="col" className="py-3 pr-4 font-semibold">Déclarée</th>
            <th scope="col" className="py-3 pr-4 font-semibold">Installée</th>
            <th scope="col" className="py-3 pr-4 font-semibold">Dernière</th>
            <th scope="col" className="py-3 pr-4 font-semibold">État</th>
            <th scope="col" className="py-3 font-semibold">Sécurité</th>
          </tr></thead>
          <tbody>
            {scan.findings.map((finding) => (
              <tr key={finding.id} className="border-b border-emerald-950/10 last:border-0">
                <td className="py-3 pr-4 font-medium">{finding.packageName}</td>
                <td className="py-3 pr-4 font-mono text-xs">{finding.currentRange}</td>
                <td className="py-3 pr-4 font-mono text-xs">{finding.installedVersion ?? "—"}</td>
                <td className="py-3 pr-4 font-mono text-xs">{finding.latestVersion ?? "Introuvable"}</td>
                <td className="py-3 pr-4">{finding.isOutdated ? "Obsolète" : "À jour"}</td>
                <td className="py-3">
                  {finding.advisoryId ? (
                    <span>
                      {finding.severity ? severityLabels[finding.severity] : "Avis connu"}{" "}
                      <a href={finding.advisoryUrl ?? undefined} target="_blank" rel="noreferrer" className="font-medium text-emerald-700 underline underline-offset-2">{finding.advisoryId}</a>
                      {finding.fixedVersion ? ` · corrigé en ${finding.fixedVersion}` : ""}
                    </span>
                  ) : "Aucun avis trouvé"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
