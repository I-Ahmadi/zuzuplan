import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, GitBranch, GitPullRequest, RefreshCw, Rocket, Ship, Webhook, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PAGE_SIZE } from "@/components/ui/pagination";
import { getDeployments, getPullRequests, getReleases } from "@/lib/delivery-api";
import { createIntegration, getIntegrations, startGitHubOAuth, syncGitHubRepository } from "@/lib/integration-api";
import { getProjects } from "@/lib/project-api";
import { cn } from "@/lib/utils";

const GITHUB_APP_NAME = import.meta.env.VITE_GITHUB_APP_NAME || "zuzuplan";
const DELIVERY_TABS = [
  { id: "pull-requests", label: "Pull Requests", icon: GitPullRequest },
  { id: "deployments", label: "Deployments", icon: Rocket },
  { id: "releases", label: "Releases", icon: Ship },
];

function activeProject(projects) {
  const stored = localStorage.getItem("currentProjectId");
  return projects.find((project) => project.id === stored) || projects[0] || null;
}

function normalizeRepository(value) {
  const trimmed = String(value || "").trim().replace(/\.git$/i, "");
  const match = trimmed.match(/github\.com[:/]+([^/\s]+)\/([^/\s#?]+)/i);
  if (match) return `${match[1]}/${match[2]}`;
  return trimmed.replace(/^\/+|\/+$/g, "");
}

function StatCard({ icon: Icon, label, value, caption }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-md border bg-muted/20 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{caption}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ children }) {
  return (
    <span className={cn(
      "inline-flex rounded border px-2 py-1 text-xs font-semibold",
      children === "CONNECTED" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-border bg-muted/30 text-muted-foreground",
    )}>
      {children}
    </span>
  );
}

function DeliveryList({ type, items, loading }) {
  if (loading) {
    return <p className="p-6 text-sm text-muted-foreground">Loading GitHub {type.replace("-", " ")}...</p>;
  }

  if (!items.length) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        <GitBranch className="mx-auto mb-2 h-8 w-8" />
        No GitHub {type.replace("-", " ")} found for this project yet.
      </div>
    );
  }

  return items.map((item) => {
    const title = item.title || item.version || item.repository || item.environment || "Untitled";
    const subtitle = type === "pull-requests"
      ? `${item.repository} #${item.number}${item.branch ? ` - ${item.branch}` : ""}`
      : type === "deployments"
        ? `${item.environment} - ${item.version || "No version"}${item.pullRequest ? ` - PR #${item.pullRequest.number}` : ""}`
        : `${item.version || "No version"} - ${item.summary || "No summary"}`;
    const status = item.status || item.reviewState || "UNKNOWN";

    return (
      <div key={item.id} className="grid gap-3 border-b px-4 py-3 text-sm last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge>{status}</StatusBadge>
          {item.reviewState ? <StatusBadge>{item.reviewState}</StatusBadge> : null}
          {item.ciStatus ? <StatusBadge>{item.ciStatus}</StatusBadge> : null}
        </div>
        <p className="text-xs text-muted-foreground">{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</p>
      </div>
    );
  });
}

export default function GitHubIntegration() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const [repository, setRepository] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: ["projects", "github"], queryFn: () => getProjects({ limit: PAGE_SIZE }) });
  const projects = projectsQuery.data?.data || [];
  const project = useMemo(() => activeProject(projects), [projects]);
  const activeTab = new URLSearchParams(search).get("tab") || "pull-requests";

  const integrationsQuery = useQuery({
    queryKey: ["github-integrations", project?.id],
    queryFn: () => getIntegrations(project.id, { provider: "GITHUB", limit: PAGE_SIZE }),
    enabled: Boolean(project?.id),
  });
  const pullRequestsQuery = useQuery({
    queryKey: ["github-pull-requests", project?.id],
    queryFn: () => getPullRequests(project.id, { limit: PAGE_SIZE }),
    enabled: Boolean(project?.id),
  });
  const deploymentsQuery = useQuery({
    queryKey: ["github-deployments", project?.id],
    queryFn: () => getDeployments(project.id, { limit: PAGE_SIZE }),
    enabled: Boolean(project?.id),
  });
  const releasesQuery = useQuery({
    queryKey: ["github-releases", project?.id],
    queryFn: () => getReleases(project.id, { limit: PAGE_SIZE }),
    enabled: Boolean(project?.id),
  });

  const githubIntegrations = integrationsQuery.data?.data || [];
  const oauthConnection = githubIntegrations.find((item) => item.config?.accessToken);
  const repositoryIntegrations = githubIntegrations.filter((item) => item.repository);
  const webhookUrl = `${window.location.origin.replace(/:\d+$/, ":3000")}/api/github/webhook`;
  const deliveryQueries = {
    "pull-requests": pullRequestsQuery,
    deployments: deploymentsQuery,
    releases: releasesQuery,
  };

  const oauthMutation = useMutation({
    mutationFn: () => startGitHubOAuth(project.id),
    onSuccess: (result) => {
      if (result?.success && result.data?.url) {
        window.location.href = result.data.url;
        return;
      }
      setMessage(result?.error?.message || "GitHub OAuth is not configured.");
    },
    onError: () => setMessage("Could not start GitHub OAuth."),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => createIntegration(project.id, payload),
    onSuccess: () => {
      setRepository("");
      setName("");
      setMessage("Repository connected. You can sync it now.");
      queryClient.invalidateQueries({ queryKey: ["github-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: () => setMessage("Could not connect repository."),
  });

  const syncMutation = useMutation({
    mutationFn: (integrationId) => syncGitHubRepository(project.id, integrationId),
    onSuccess: (result) => {
      const summary = result?.data;
      setMessage(summary
        ? `Sync complete: ${summary.createdIssues} issues created, ${summary.importedPullRequests} PRs, ${summary.importedReleases} releases, ${summary.importedDeployments} deployments.`
        : "Repository synced.");
      queryClient.invalidateQueries({ queryKey: ["github-integrations"] });
      queryClient.invalidateQueries({ queryKey: ["github-pull-requests"] });
      queryClient.invalidateQueries({ queryKey: ["github-deployments"] });
      queryClient.invalidateQueries({ queryKey: ["github-releases"] });
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      queryClient.invalidateQueries({ queryKey: ["pull-requests"] });
      queryClient.invalidateQueries({ queryKey: ["deployments"] });
      queryClient.invalidateQueries({ queryKey: ["releases"] });
    },
    onError: () => setMessage("Could not sync repository. Check OAuth, repository access, and backend logs."),
  });

  function submitRepository(event) {
    event.preventDefault();
    const normalized = normalizeRepository(repository);
    if (!normalized) {
      setMessage("Enter a repository as owner/repo or a GitHub URL.");
      return;
    }
    createMutation.mutate({
      provider: "GITHUB",
      name: name || normalized,
      repository: normalized,
      status: "CONNECTED",
    });
  }

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <GitBranch className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">GitHub</h1>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Connect repositories, import existing engineering work, and keep PR, release, and deployment signals flowing into ZuzuPlan.
          </p>
        </div>
        <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
          {project?.name || "No project selected"}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard icon={GitPullRequest} label="Pull requests" value={pullRequestsQuery.data?.pagination?.total || 0} caption="Tracked in this project" />
        <StatCard icon={Rocket} label="Deployments" value={deploymentsQuery.data?.pagination?.total || 0} caption="Imported or webhook-created" />
        <StatCard icon={Ship} label="Releases" value={releasesQuery.data?.pagination?.total || 0} caption="GitHub releases in ZuzuPlan" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card>
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="text-base">Connect GitHub</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">OAuth connection</p>
                  <p className="mt-1 text-muted-foreground">
                    {oauthConnection ? "GitHub OAuth is connected for repository sync." : "Connect OAuth before syncing existing repositories."}
                  </p>
                </div>
                <StatusBadge>{oauthConnection ? "CONNECTED" : "NOT CONNECTED"}</StatusBadge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!project?.id || oauthMutation.isPending} onClick={() => oauthMutation.mutate()}>
                  <ExternalLink className="h-4 w-4" />
                  {oauthConnection ? "Reconnect OAuth" : "Connect GitHub OAuth"}
                </Button>
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={`https://github.com/apps/${GITHUB_APP_NAME}/installations/new`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Install GitHub App
                  </a>
                </Button>
              </div>
            </div>

            <form className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={submitRepository}>
              <Input placeholder="Repository, e.g. owner/repo or GitHub URL" value={repository} onChange={(event) => setRepository(event.target.value)} />
              <Input placeholder="Display name" value={name} onChange={(event) => setName(event.target.value)} />
              <Button disabled={!project?.id || createMutation.isPending}>
                <Zap className="h-4 w-4" />
                Connect repository
              </Button>
            </form>
            {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="h-4 w-4 text-primary" />
              Webhook setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-4 text-sm text-muted-foreground">
            <div className="rounded-md border bg-background p-3 font-mono text-xs text-foreground">
              {webhookUrl}
            </div>
            <p>Use a public tunnel for local development, then add this URL in GitHub repository webhooks.</p>
            <p>Enable pull requests, reviews, checks, workflow runs, deployments, and deployment statuses.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-base">Connected repositories</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {integrationsQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading GitHub repositories...</p>
          ) : repositoryIntegrations.length ? (
            repositoryIntegrations.map((item) => {
              const summary = item.config?.lastSyncSummary;
              return (
                <div key={item.id} className="grid gap-3 border-b px-4 py-3 text-sm last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{item.name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">GitHub - {item.repository}</p>
                    {summary ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Last sync: {summary.createdIssues} issues created, {summary.updatedIssues} updated, {summary.importedPullRequests} PRs, {summary.importedReleases || 0} releases, {summary.importedDeployments || 0} deployments
                      </p>
                    ) : null}
                  </div>
                  <StatusBadge>{item.status}</StatusBadge>
                  <Button type="button" variant="outline" size="sm" disabled={syncMutation.isPending && syncMutation.variables === item.id} onClick={() => syncMutation.mutate(item.id)}>
                    <RefreshCw className="h-4 w-4" />
                    {syncMutation.isPending && syncMutation.variables === item.id ? "Syncing..." : "Sync repository"}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <GitBranch className="mx-auto mb-2 h-8 w-8" />
              No GitHub repositories connected yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-base">GitHub delivery</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Pull requests, deployments, and releases are consolidated here.</p>
            </div>
            <div className="flex min-w-0 gap-1 overflow-x-auto">
              {DELIVERY_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <Button
                    key={tab.id}
                    type="button"
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    onClick={() => navigate(`/github?tab=${tab.id}`)}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DeliveryList
            type={activeTab}
            items={deliveryQueries[activeTab]?.data?.data || []}
            loading={deliveryQueries[activeTab]?.isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
