import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, CheckCircle2, GitBranch, GitPullRequest, Rocket, Search, Ship, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PAGE_SIZE, PaginationControls } from "@/components/ui/pagination";
import { getProjects } from "@/lib/project-api";
import { createDeployment, createPullRequest, createRelease, getDeployments, getPullRequests, getReleases } from "@/lib/delivery-api";
import { createIntegration, getIntegrations } from "@/lib/integration-api";
import { cn } from "@/lib/utils";

const CONFIG = {
  integrations: {
    title: "Integrations",
    description: "Connect engineering systems that feed PR, deployment, and release visibility.",
    icon: Boxes,
    queryKey: "integrations",
    fetcher: getIntegrations,
    creator: createIntegration,
    empty: "No integrations connected yet.",
    primary: "Connect repository",
  },
  "pull-requests": {
    title: "Pull Requests",
    description: "Track review state, CI health, merge status, and linked issues.",
    icon: GitPullRequest,
    queryKey: "pull-requests",
    fetcher: getPullRequests,
    creator: createPullRequest,
    empty: "No pull requests tracked yet.",
    primary: "Track pull request",
  },
  deployments: {
    title: "Deployments",
    description: "Monitor staging, preview, and production delivery signals.",
    icon: Rocket,
    queryKey: "deployments",
    fetcher: getDeployments,
    creator: createDeployment,
    empty: "No deployments recorded yet.",
    primary: "Record deployment",
  },
  releases: {
    title: "Releases",
    description: "Plan and track shipped versions with engineering context.",
    icon: Ship,
    queryKey: "releases",
    fetcher: getReleases,
    creator: createRelease,
    empty: "No releases planned yet.",
    primary: "Create release",
  },
};
function badgeTone(value) {
  if (["SUCCESS", "SHIPPED", "MERGED", "APPROVED", "CONNECTED"].includes(value)) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
  if (["FAILED", "ERROR", "CHANGES_REQUESTED"].includes(value)) return "border-red-500/30 bg-red-500/10 text-red-500";
  if (["PENDING", "RUNNING", "SHIPPING", "REQUESTED"].includes(value)) return "border-orange-500/30 bg-orange-500/10 text-orange-500";
  return "border-border bg-muted/35 text-muted-foreground";
}

function StatusBadge({ children }) {
  return <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[11px] font-semibold", badgeTone(children))}>{children}</span>;
}

function activeProject(projects) {
  const stored = localStorage.getItem("currentProjectId");
  return projects.find((project) => project.id === stored) || projects[0] || null;
}

function FormPanel({ area, projectId, onCreated }) {
  const config = CONFIG[area];
  const [form, setForm] = useState({});
  const mutation = useMutation({
    mutationFn: (payload) => config.creator(projectId, payload),
    onSuccess: (result) => {
      if (result?.success) {
        setForm({});
        onCreated();
      }
    },
  });

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const defaults = {
      integrations: { provider: form.provider || "GITLAB", name: form.name || form.repository || form.provider || "GitLab", repository: form.repository, status: "CONNECTED" },
      "pull-requests": { provider: "GITHUB", repository: form.repository, number: form.number, title: form.title, url: form.url, branch: form.branch, status: "OPEN", reviewState: "REQUESTED", ciStatus: "UNKNOWN" },
      deployments: { environment: form.environment || "staging", status: form.status || "PENDING", version: form.version, url: form.url, deployedBy: form.deployedBy },
      releases: { title: form.title, version: form.version, status: form.status || "PLANNED", summary: form.summary },
    };
    mutation.mutate(defaults[area]);
  }

  return (
    <Card>
      <CardHeader className="border-b px-4 py-3">
        <CardTitle className="text-base">{config.primary}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {area === "integrations" ? (
          <div className="mb-3 rounded-md border bg-muted/20 p-3 text-sm text-muted-foreground">
            GitHub setup has moved to the dedicated GitHub page. Use this area for other engineering integrations as they are added.
          </div>
        ) : null}
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" onSubmit={submit}>
          {area === "integrations" ? (
            <>
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.provider || "GITLAB"} onChange={(event) => update("provider", event.target.value)}>
                <option value="GITLAB">GitLab</option>
              </select>
              <Input placeholder="Repository, e.g. org/app" value={form.repository || ""} onChange={(event) => update("repository", event.target.value)} />
              <Input placeholder="Display name" value={form.name || ""} onChange={(event) => update("name", event.target.value)} />
            </>
          ) : null}
          {area === "pull-requests" ? (
            <>
              <Input required placeholder="Repository" value={form.repository || ""} onChange={(event) => update("repository", event.target.value)} />
              <Input required type="number" placeholder="PR number" value={form.number || ""} onChange={(event) => update("number", event.target.value)} />
              <Input required placeholder="Title" value={form.title || ""} onChange={(event) => update("title", event.target.value)} />
              <Input placeholder="Branch" value={form.branch || ""} onChange={(event) => update("branch", event.target.value)} />
            </>
          ) : null}
          {area === "deployments" ? (
            <>
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.environment || "staging"} onChange={(event) => update("environment", event.target.value)}>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="preview">Preview</option>
              </select>
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.status || "PENDING"} onChange={(event) => update("status", event.target.value)}>
                <option value="PENDING">Pending</option>
                <option value="RUNNING">Running</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </select>
              <Input placeholder="Version / SHA" value={form.version || ""} onChange={(event) => update("version", event.target.value)} />
              <Input placeholder="Deployment URL" value={form.url || ""} onChange={(event) => update("url", event.target.value)} />
            </>
          ) : null}
          {area === "releases" ? (
            <>
              <Input required placeholder="Release title" value={form.title || ""} onChange={(event) => update("title", event.target.value)} />
              <Input placeholder="Version" value={form.version || ""} onChange={(event) => update("version", event.target.value)} />
              <select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.status || "PLANNED"} onChange={(event) => update("status", event.target.value)}>
                <option value="PLANNED">Planned</option>
                <option value="SHIPPING">Shipping</option>
                <option value="SHIPPED">Shipped</option>
              </select>
              <Input placeholder="Summary" value={form.summary || ""} onChange={(event) => update("summary", event.target.value)} />
            </>
          ) : null}
          <Button className="h-9 md:col-span-2 xl:col-span-1" disabled={mutation.isPending || !projectId}>
            <Zap className="h-4 w-4" />
            {mutation.isPending ? "Saving..." : config.primary}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ItemRow({ area, item }) {
  const title = item.title || item.name || item.version || item.repository || "Untitled";
  const subtitle = area === "pull-requests"
    ? `${item.repository} #${item.number}${item.branch ? ` · ${item.branch}` : ""}`
    : area === "deployments"
      ? `${item.environment} · ${item.version || "No version"}`
      : area === "integrations"
        ? `${item.provider} · ${item.repository || "No repository"}`
        : `${item.version || "No version"} · ${item.summary || "No summary"}`;
  const status = item.status || item.reviewState || "UNKNOWN";
  const syncSummary = item.config?.lastSyncSummary;

  return (
    <div className="grid gap-3 border-b px-4 py-3 text-sm last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
      <div className="min-w-0">
        <p className="truncate font-semibold">{title}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p>
        {area === "integrations" && syncSummary ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Last sync: {syncSummary.createdIssues} issues created, {syncSummary.updatedIssues} updated, {syncSummary.importedPullRequests} PRs imported
            {syncSummary.importedReleases !== undefined ? `, ${syncSummary.importedReleases} releases` : ""}
            {syncSummary.importedDeployments !== undefined ? `, ${syncSummary.importedDeployments} deployments` : ""}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge>{status}</StatusBadge>
        {item.reviewState ? <StatusBadge>{item.reviewState}</StatusBadge> : null}
        {item.ciStatus ? <StatusBadge>{item.ciStatus}</StatusBadge> : null}
      </div>
      <p className="text-xs text-muted-foreground">{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</p>
    </div>
  );
}

export default function EngineeringDelivery({ area }) {
  const config = CONFIG[area] || CONFIG["pull-requests"];
  const Icon = config.icon;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: ["projects", "delivery"], queryFn: () => getProjects({ limit: PAGE_SIZE }) });
  const projects = projectsQuery.data?.data || [];
  const project = useMemo(() => activeProject(projects), [projects]);
  const itemsQuery = useQuery({
    queryKey: [config.queryKey, project?.id, search, page],
    queryFn: () => config.fetcher(project.id, { search, page, limit: PAGE_SIZE }),
    enabled: Boolean(project?.id),
  });
  const rawItems = itemsQuery.data?.data || [];
  const items = area === "integrations" ? rawItems.filter((item) => item.provider !== "GITHUB") : rawItems;
  const pagination = itemsQuery.data?.pagination;

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{config.title}</h1>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{config.description}</p>
        </div>
        <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
          {project?.name || "No project selected"}
        </div>
      </div>

      <FormPanel area={area} projectId={project?.id} onCreated={() => queryClient.invalidateQueries({ queryKey: [config.queryKey] })} />

      <Card>
        <CardHeader className="border-b px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Tracked {config.title.toLowerCase()}
            </CardTitle>
            <div className="relative md:w-80">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="h-9 pl-8" placeholder={`Search ${config.title.toLowerCase()}`} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {itemsQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading {config.title.toLowerCase()}...</p>
          ) : items.length ? (
            items.map((item) => <ItemRow key={item.id} area={area} item={item} />)
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <GitBranch className="mx-auto mb-2 h-8 w-8" />
              {config.empty}
            </div>
          )}
        </CardContent>
      </Card>
      <PaginationControls pagination={pagination} onPageChange={setPage} />
    </div>
  );
}
