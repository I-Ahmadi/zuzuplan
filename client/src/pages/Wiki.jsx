import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Edit3, FileText, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/ui/avatar";
import { getProject } from "@/lib/project-api";
import { createWikiPage, deleteWikiPage, getWikiPages, updateWikiPage } from "@/lib/wiki-api";
import { cn } from "@/lib/utils";

function resultMessage(result, fallback) {
  return result?.error?.message || fallback;
}

function formatDate(value) {
  if (!value) return "No updates";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function emptyForm() {
  return { title: "", content: "" };
}

function WikiEditorDialog({ open, mode, form, setForm, pending, onClose, onSubmit }) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Wiki Page" : "Create Wiki Page"}</DialogTitle>
          <p className="text-sm text-muted-foreground">Capture project context, decisions, and shared reference notes.</p>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="wiki-title">Title</Label>
            <Input
              id="wiki-title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Release checklist"
              maxLength={160}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wiki-content">Content</Label>
            <Textarea
              id="wiki-content"
              className="min-h-[320px] resize-y font-mono text-sm"
              value={form.content}
              onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
              placeholder="Use simple Markdown-style notes for headings, lists, links, and decisions."
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={pending || !form.title.trim()} onClick={onSubmit}>
            {pending ? "Saving..." : mode === "edit" ? "Save changes" : "Create page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteWikiDialog({ page, pending, onCancel, onConfirm }) {
  return (
    <Dialog open={Boolean(page)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {page?.title}?</DialogTitle>
          <p className="text-sm text-muted-foreground">This permanently removes the Wiki page from this space.</p>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>Cancel</Button>
          <Button type="button" variant="destructive" disabled={pending} onClick={onConfirm}>
            <Trash2 className="h-4 w-4" />
            {pending ? "Deleting..." : "Delete page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ canCreate, onCreate }) {
  return (
    <div className="rounded-md border border-dashed p-8 text-center">
      <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">No Wiki pages yet</p>
      <p className="mt-1 text-sm text-muted-foreground">Create the first project reference page for decisions, setup notes, or team conventions.</p>
      {canCreate ? (
        <Button type="button" className="mt-4" size="sm" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          Create page
        </Button>
      ) : null}
    </div>
  );
}

export default function Wiki() {
  const { projectId } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [dialogMode, setDialogMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deletePage, setDeletePage] = useState(null);
  const [message, setMessage] = useState("");

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  });

  const wikiQuery = useQuery({
    queryKey: ["wiki-pages", projectId, search],
    queryFn: () => getWikiPages(projectId, { search }),
    enabled: Boolean(projectId),
  });

  const project = projectQuery.data?.data;
  const permissions = wikiQuery.data?.data?.permissions || [];
  const pages = wikiQuery.data?.data?.items || [];
  const canCreate = permissions.includes("wiki.create");
  const loading = projectQuery.isLoading || wikiQuery.isLoading;

  const selectedPage = useMemo(() => (
    pages.find((page) => page.id === selectedId) || pages[0] || null
  ), [pages, selectedId]);

  const recentPages = pages.slice(0, 5);

  useEffect(() => {
    if (selectedPage && selectedPage.id !== selectedId) {
      setSelectedId(selectedPage.id);
    }
  }, [selectedId, selectedPage]);

  function invalidateWiki() {
    queryClient.invalidateQueries({ queryKey: ["wiki-pages", projectId] });
  }

  const createMutation = useMutation({
    mutationFn: (payload) => createWikiPage(projectId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not create Wiki page."));
        return;
      }
      setMessage("");
      setDialogMode(null);
      setForm(emptyForm());
      setSelectedId(result.data.id);
      invalidateWiki();
    },
    onError: () => setMessage("Could not create Wiki page."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ pageId, payload }) => updateWikiPage(projectId, pageId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not update Wiki page."));
        return;
      }
      setMessage("");
      setDialogMode(null);
      setForm(emptyForm());
      setSelectedId(result.data.id);
      invalidateWiki();
    },
    onError: () => setMessage("Could not update Wiki page."),
  });

  const deleteMutation = useMutation({
    mutationFn: (pageId) => deleteWikiPage(projectId, pageId),
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(resultMessage(result, "Could not delete Wiki page."));
        return;
      }
      setMessage("");
      setDeletePage(null);
      setSelectedId("");
      invalidateWiki();
    },
    onError: () => setMessage("Could not delete Wiki page."),
  });

  function openCreate() {
    setMessage("");
    setForm(emptyForm());
    setDialogMode("create");
  }

  function openEdit(page) {
    setMessage("");
    setForm({ title: page.title || "", content: page.content || "" });
    setDialogMode("edit");
  }

  function submitDialog() {
    const payload = { title: form.title.trim(), content: form.content };
    if (dialogMode === "edit" && selectedPage) {
      updateMutation.mutate({ pageId: selectedPage.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{project?.name || "Space"} Wiki</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Wiki</h1>
          <p className="mt-1 text-sm text-muted-foreground">Durable project knowledge, decisions, and reference notes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={projectId ? `/spaces/${projectId}/issues` : "/spaces"}>Open issues</Link>
          </Button>
          {canCreate ? (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New page
            </Button>
          ) : null}
        </div>
      </div>

      {message ? <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{message}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.42fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-3 p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search Wiki pages..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen className="h-4 w-4 text-primary" />
                Pages
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-3">
              {pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={cn(
                    "flex w-full min-w-0 items-start gap-2 rounded-md border p-3 text-left transition-colors hover:border-primary/60 hover:bg-accent/45",
                    selectedPage?.id === page.id && "border-primary/70 bg-primary/10"
                  )}
                  onClick={() => setSelectedId(page.id)}
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{page.title}</span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      Updated {formatDate(page.updatedAt)}
                    </span>
                  </span>
                </button>
              ))}
              {!loading && !pages.length ? <EmptyState canCreate={canCreate} onCreate={openCreate} /> : null}
              {loading ? <p className="p-4 text-center text-sm text-muted-foreground">Loading Wiki pages...</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b px-4 py-3">
              <CardTitle className="text-base">Recently Updated</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {recentPages.map((page) => (
                <button key={page.id} type="button" className="flex w-full items-center gap-2 text-left text-sm" onClick={() => setSelectedId(page.id)}>
                  <UserAvatar user={page.lastUpdatedBy} fallback={page.lastUpdatedBy?.name || page.lastUpdatedBy?.email || "U"} className="h-7 w-7" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{page.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{page.lastUpdatedBy?.name || page.lastUpdatedBy?.email || "Unknown"} - {formatDate(page.updatedAt)}</span>
                  </span>
                </button>
              ))}
              {!recentPages.length ? <p className="text-sm text-muted-foreground">No recent Wiki activity.</p> : null}
            </CardContent>
          </Card>
        </div>

        <Card className="min-h-[520px]">
          {selectedPage ? (
            <>
              <CardHeader className="border-b px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-xl">{selectedPage.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Created by {selectedPage.createdBy?.name || selectedPage.createdBy?.email || "Unknown"} - Updated {formatDate(selectedPage.updatedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {selectedPage.canEdit ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => openEdit(selectedPage)}>
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </Button>
                    ) : null}
                    {selectedPage.canDelete ? (
                      <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletePage(selectedPage)}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {selectedPage.content?.trim() ? (
                  <article className="whitespace-pre-wrap text-sm leading-7 text-foreground">{selectedPage.content}</article>
                ) : (
                  <div className="rounded-md border border-dashed p-8 text-center">
                    <p className="text-sm font-medium">This page is empty</p>
                    <p className="mt-1 text-sm text-muted-foreground">Add setup notes, team decisions, or project reference material.</p>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex min-h-[520px] items-center justify-center p-6">
              <EmptyState canCreate={canCreate} onCreate={openCreate} />
            </CardContent>
          )}
        </Card>
      </div>

      <WikiEditorDialog
        open={Boolean(dialogMode)}
        mode={dialogMode}
        form={form}
        setForm={setForm}
        pending={saving}
        onClose={() => setDialogMode(null)}
        onSubmit={submitDialog}
      />
      <DeleteWikiDialog
        page={deletePage}
        pending={deleteMutation.isPending}
        onCancel={() => setDeletePage(null)}
        onConfirm={() => deletePage && deleteMutation.mutate(deletePage.id)}
      />
    </div>
  );
}
