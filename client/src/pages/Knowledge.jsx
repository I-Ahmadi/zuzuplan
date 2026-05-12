import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Clock3,
  FileText,
  FolderKanban,
  Pin,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PAGE_SIZE } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { createDoc, deleteDoc, getProjectDocs, updateDoc } from "@/lib/doc-api";
import { getProjects } from "@/lib/project-api";
import { cn } from "@/lib/utils";

const DAY_MS = 1000 * 60 * 60 * 24;
const FILTERS = [
  { value: "all", label: "All docs" },
  { value: "pinned", label: "Pinned" },
  { value: "mine", label: "Created by me" },
  { value: "recent", label: "Recently updated" },
];

function resultMessage(result, fallback) {
  return result?.error?.message || fallback;
}

function relativeDate(value) {
  if (!value) return "No update";
  const diff = Date.now() - new Date(value).getTime();
  const days = Math.max(0, Math.floor(diff / DAY_MS));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function isRecent(value) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() <= DAY_MS * 7;
}

function MetricCard({ label, value, detail, icon: Icon }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/50 text-primary">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function DocRow({ doc, active, onSelect }) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-start gap-3 rounded-md border p-3 text-left text-sm transition-colors hover:border-primary/60 hover:bg-accent/45",
        active && "border-primary/70 bg-primary/10"
      )}
      onClick={() => onSelect(doc.id)}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/45 text-primary">
        <FileText className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold">{doc.title}</span>
          {doc.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-primary" /> : null}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {doc.space?.name || "Space"} - {doc.createdBy?.name || doc.createdBy?.email || "Space doc"}
        </span>
        <span className="mt-2 block text-xs text-muted-foreground">Updated {relativeDate(doc.updatedAt || doc.createdAt)}</span>
      </span>
    </button>
  );
}

export default function Knowledge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedDocId, setSelectedDocId] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocSpaceId, setNewDocSpaceId] = useState("");
  const [draft, setDraft] = useState({ title: "", content: "" });
  const [error, setError] = useState("");

  const spacesQuery = useQuery({ queryKey: ["spaces", "knowledge"], queryFn: () => getProjects({ limit: PAGE_SIZE }) });
  const spaces = spacesQuery.data?.data || [];
  const docQueries = useQueries({
    queries: spaces.map((space) => ({
      queryKey: ["knowledge-docs", space.id],
      queryFn: () => getProjectDocs(space.id, { limit: PAGE_SIZE }),
      enabled: Boolean(space.id),
    })),
  });
  const loading = spacesQuery.isLoading || docQueries.some((query) => query.isLoading);

  useEffect(() => {
    if (!newDocSpaceId && spaces[0]?.id) setNewDocSpaceId(spaces[0].id);
  }, [newDocSpaceId, spaces]);

  const docs = useMemo(() => (
    docQueries.flatMap((query, index) => (query.data?.data || []).map((doc) => ({ ...doc, space: spaces[index] })))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
  ), [docQueries, spaces]);

  const filteredDocs = useMemo(() => {
    return docs.filter((doc) => {
      if (spaceFilter && doc.space?.id !== spaceFilter) return false;
      if (filter === "pinned" && !doc.pinned) return false;
      if (filter === "mine" && doc.createdById !== user?.id && doc.createdBy?.id !== user?.id) return false;
      if (filter === "recent" && !isRecent(doc.updatedAt || doc.createdAt)) return false;
      if (search.trim()) {
        const haystack = [doc.title, doc.content, doc.space?.name, doc.createdBy?.name, doc.createdBy?.email].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [docs, filter, search, spaceFilter, user?.id]);

  const selectedDoc = docs.find((doc) => doc.id === selectedDocId) || filteredDocs[0] || null;

  useEffect(() => {
    if (!selectedDoc) {
      setDraft({ title: "", content: "" });
      return;
    }
    setSelectedDocId(selectedDoc.id);
    setDraft({ title: selectedDoc.title || "", content: selectedDoc.content || "" });
  }, [selectedDoc?.id]);

  function invalidateDocs(projectId) {
    queryClient.invalidateQueries({ queryKey: ["knowledge-docs", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-docs", projectId] });
  }

  const createMutation = useMutation({
    mutationFn: ({ projectId, payload }) => createDoc(projectId, payload),
    onSuccess: (result, variables) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not create document."));
        return;
      }
      setError("");
      setNewDocTitle("");
      setSelectedDocId(result.data.id);
      invalidateDocs(variables.projectId);
    },
    onError: () => setError("Could not create document."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ doc, payload }) => updateDoc(doc.space.id, doc.id, payload),
    onSuccess: (result, variables) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not update document."));
        return;
      }
      setError("");
      invalidateDocs(variables.doc.space.id);
    },
    onError: () => setError("Could not update document."),
  });

  const deleteMutation = useMutation({
    mutationFn: (doc) => deleteDoc(doc.space.id, doc.id),
    onSuccess: (result, doc) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not delete document."));
        return;
      }
      setError("");
      setSelectedDocId("");
      invalidateDocs(doc.space.id);
    },
    onError: () => setError("Could not delete document."),
  });

  function createNewDoc(event) {
    event.preventDefault();
    if (!newDocSpaceId || !newDocTitle.trim()) return;
    setError("");
    createMutation.mutate({ projectId: newDocSpaceId, payload: { title: newDocTitle.trim(), content: "" } });
  }

  function saveSelectedDoc() {
    if (!selectedDoc || !draft.title.trim()) return;
    setError("");
    updateMutation.mutate({ doc: selectedDoc, payload: { title: draft.title.trim(), content: draft.content } });
  }

  function togglePinned() {
    if (!selectedDoc) return;
    setError("");
    updateMutation.mutate({ doc: selectedDoc, payload: { pinned: !selectedDoc.pinned } });
  }

  const pinnedCount = docs.filter((doc) => doc.pinned).length;
  const recentCount = docs.filter((doc) => isRecent(doc.updatedAt || doc.createdAt)).length;
  const spacesWithDocs = new Set(docs.map((doc) => doc.space?.id).filter(Boolean)).size;

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Knowledge</h1>
          <p className="mt-1 text-sm text-muted-foreground">A cross-space library for docs, decisions, notes, and team references.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["knowledge-docs"] })}>
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Documents" value={docs.length} detail="Across accessible spaces" icon={BookOpen} />
        <MetricCard label="Pinned" value={pinnedCount} detail="Important references" icon={Pin} />
        <MetricCard label="Recent" value={recentCount} detail="Updated this week" icon={Clock3} />
        <MetricCard label="Spaces" value={spacesWithDocs} detail="With knowledge docs" icon={FolderKanban} />
      </div>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardContent className="space-y-3 p-3">
          <form className="grid gap-2 lg:grid-cols-[180px_minmax(240px,1fr)_auto]" onSubmit={createNewDoc}>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={newDocSpaceId} onChange={(event) => setNewDocSpaceId(event.target.value)} aria-label="Document space">
              {spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
            </select>
            <Input value={newDocTitle} onChange={(event) => setNewDocTitle(event.target.value)} placeholder="New document title" />
            <Button type="submit" disabled={!newDocTitle.trim() || !newDocSpaceId || createMutation.isPending}>
              <Plus className="h-4 w-4" />
              New doc
            </Button>
          </form>
          <div className="grid gap-2 lg:grid-cols-[minmax(240px,1fr)_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search docs, spaces, owners, or content" />
            </div>
            <select className="h-9 rounded-md border bg-background px-3 text-sm" value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)} aria-label="Filter by space">
              <option value="">All spaces</option>
              {spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
            </select>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <Button key={item.value} type="button" variant={filter === item.value ? "default" : "outline"} size="sm" onClick={() => setFilter(item.value)}>
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Library
            </CardTitle>
            <p className="text-sm text-muted-foreground">{filteredDocs.length} matching docs</p>
          </CardHeader>
          <CardContent className="max-h-[calc(100vh-25rem)] min-h-[420px] space-y-2 overflow-y-auto p-3">
            {filteredDocs.map((doc) => (
              <DocRow key={doc.id} doc={doc} active={selectedDoc?.id === doc.id} onSelect={setSelectedDocId} />
            ))}
            {!filteredDocs.length ? (
              <EmptyState
                title={loading ? "Loading knowledge..." : "No documents found"}
                description={loading ? "Gathering docs across your spaces." : "Create a document or adjust filters to build your knowledge base."}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b px-4 py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Document
            </CardTitle>
            <p className="text-sm text-muted-foreground">Edit shared notes, specs, decisions, and references in one focused panel.</p>
          </CardHeader>
          <CardContent className="p-4">
            {selectedDoc ? (
              <div className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto]">
                  <Input className="h-10 text-lg font-semibold" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="icon" className="h-10 w-10" onClick={togglePinned} aria-label="Pin document" disabled={updateMutation.isPending}>
                      {selectedDoc.pinned ? <Star className="h-4 w-4 fill-primary text-primary" /> : <Pin className="h-4 w-4" />}
                    </Button>
                    <Button type="button" onClick={saveSelectedDoc} disabled={!draft.title.trim() || updateMutation.isPending}>
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                    <Button type="button" variant="outline" onClick={() => deleteMutation.mutate(selectedDoc)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded border bg-muted/35 px-2 py-1">{selectedDoc.space?.name || "Space"}</span>
                  <span className="rounded border bg-muted/35 px-2 py-1">Updated {relativeDate(selectedDoc.updatedAt || selectedDoc.createdAt)}</span>
                  <span className="rounded border bg-muted/35 px-2 py-1">{selectedDoc.createdBy?.name || selectedDoc.createdBy?.email || "Space doc"}</span>
                </div>
                <Textarea
                  className="min-h-[460px] resize-y"
                  value={draft.content}
                  onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
                  placeholder="Write notes, specs, decisions, links, or team references..."
                />
                <Button asChild variant="outline" size="sm">
                  <Link to={`/spaces/${selectedDoc.space.id}/issues?view=docs`}>Open in space docs</Link>
                </Button>
              </div>
            ) : (
              <EmptyState
                title="Select or create a document"
                description="Your global knowledge library will appear here as spaces add docs."
                action={
                  <Button asChild size="sm">
                    <Link to="/spaces">Open spaces</Link>
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
