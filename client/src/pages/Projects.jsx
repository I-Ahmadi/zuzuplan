import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, FolderKanban, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_SIZE, PaginationControls } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { createProject, deleteProject, getProject, getProjects, updateProject } from "@/lib/project-api";
import { cn } from "@/lib/utils";

const emptySpaceForm = {
  name: "",
  key: "",
  description: "",
  visibility: "private",
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private" },
  { value: "public", label: "Public" },
];

function getErrorMessage(result, fallback) {
  return result?.error?.message || fallback;
}

function normalizeSpaceForm(form) {
  return {
    name: form.name.trim(),
    key: form.key.trim().toUpperCase(),
    description: form.description.trim(),
    visibility: form.visibility,
  };
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function StatusIndicator({ status }) {
  const tone = {
    active: "bg-emerald-500",
    completed: "bg-blue-500",
    archived: "bg-muted-foreground",
  }[status] || "bg-muted-foreground";

  return (
    <span className="inline-flex items-center gap-2 text-xs capitalize text-foreground">
      <span className={cn("h-2 w-2 rounded-full", tone)} />
      {status || "Active"}
    </span>
  );
}

function ProgressCell({ value = 0 }) {
  const progress = Math.max(0, Math.min(100, Number(value) || 0));

  return (
    <div className="flex min-w-[110px] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-secondary">
        <div className="h-full rounded bg-primary" style={{ width: `${progress}%` }} />
      </div>
      <span className="w-8 text-right text-xs text-muted-foreground">{progress}%</span>
    </div>
  );
}

function SpaceDialog({ mode, open, form, setForm, pending, onClose, onSubmit }) {
  return (
    <Dialog open={open}>
      <DialogContent className="max-w-xl" onClick={(event) => event.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Space" : "Create Space"}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "edit" ? "Update the core details for this workspace." : "Create a workspace boundary for related work."}
          </p>
        </DialogHeader>
        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="space-name">Name</Label>
            <Input
              id="space-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Website redesign"
              autoFocus
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="space-key">Key</Label>
              <Input
                id="space-key"
                maxLength={10}
                value={form.key}
                onChange={(event) => setForm((current) => ({ ...current, key: event.target.value.toUpperCase() }))}
                placeholder="SPC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="space-visibility">Visibility</Label>
              <select
                id="space-visibility"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.visibility}
                onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value }))}
              >
                {VISIBILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="space-description">Description</Label>
            <Textarea
              id="space-description"
              className="min-h-24"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Scope, goals, or delivery notes"
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={pending}>
              <Plus className="h-4 w-4" />
              {pending ? "Saving..." : mode === "edit" ? "Save Space" : "Create Space"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SpaceActionsMenu({ space, onOpen, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 176;
    const menuHeight = 132;
    const left = Math.min(Math.max(rect.right - menuWidth, 8), window.innerWidth - menuWidth - 8);
    const opensUp = rect.bottom + menuHeight + 8 > window.innerHeight;
    const top = opensUp ? Math.max(rect.top - menuHeight - 4, 8) : rect.bottom + 4;
    setPosition({ top, left });
  }

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();

    function closeOnOutsideClick(event) {
      if (ref.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  function select(action) {
    setOpen(false);
    action();
  }

  return (
    <div className="inline-flex">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={`Actions for ${space.name}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={ref}
          className="fixed z-[100] w-44 rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
          style={{ top: position.top, left: position.left }}
        >
          <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent" onClick={() => select(onEdit)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-accent" onClick={() => select(() => onOpen(`/spaces/${space.id}/settings`))}>
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-destructive hover:bg-accent" onClick={() => select(onDelete)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>,
        document.body
      ) : null}
    </div>
  );
}

export default function Projects() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("");
  const [status, setStatus] = useState("");
  const [dialogMode, setDialogMode] = useState(null);
  const [editingSpaceId, setEditingSpaceId] = useState("");
  const [form, setForm] = useState(emptySpaceForm);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);

  const projectsQuery = useQuery({
    queryKey: ["projects", { search, visibility, status, page }],
    queryFn: () => getProjects({ search, visibility, status, page, limit: PAGE_SIZE }),
  });

  const editProjectQuery = useQuery({
    queryKey: ["project", editingSpaceId],
    queryFn: () => getProject(editingSpaceId),
    enabled: Boolean(editingSpaceId && dialogMode === "edit"),
  });

  const spaces = projectsQuery.data?.data || [];
  const pagination = projectsQuery.data?.pagination;
  const editingSpace = editProjectQuery.data?.data;

  useEffect(() => {
    setPage(1);
  }, [search, status, visibility]);

  useEffect(() => {
    if (!editingSpace || dialogMode !== "edit") return;
    setForm({
      name: editingSpace.name || "",
      key: editingSpace.key || "",
      description: editingSpace.description || "",
      visibility: editingSpace.visibility || "private",
    });
  }, [dialogMode, editingSpace]);

  function refreshSpaces() {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["projects", "sidebar"] });
    if (editingSpaceId) queryClient.invalidateQueries({ queryKey: ["project", editingSpaceId] });
  }

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(getErrorMessage(result, "Could not create space."));
        return;
      }
      setMessage("Space created.");
      setDialogMode(null);
      setForm(emptySpaceForm);
      refreshSpaces();
      if (result.data?.id) navigate(`/spaces/${result.data.id}`);
    },
    onError: (error) => setMessage(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => updateProject(id, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(getErrorMessage(result, "Could not update space."));
        return;
      }
      setMessage("Space updated.");
      setDialogMode(null);
      setEditingSpaceId("");
      setForm(emptySpaceForm);
      refreshSpaces();
    },
    onError: (error) => setMessage(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProject(id),
    onSuccess: (result, id) => {
      if (!result?.success) {
        setMessage(getErrorMessage(result, "Could not delete space."));
        return;
      }
      setMessage("Space deleted.");
      refreshSpaces();
      if (projectId === id) navigate("/spaces");
    },
    onError: (error) => setMessage(error.message),
  });

  function openCreateDialog() {
    setMessage("");
    setForm(emptySpaceForm);
    setEditingSpaceId("");
    setDialogMode("create");
  }

  function openEditDialog(space) {
    setMessage("");
    setEditingSpaceId(space.id);
    setForm({
      name: space.name || "",
      key: space.key || "",
      description: space.description || "",
      visibility: space.visibility || "private",
    });
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingSpaceId("");
    setForm(emptySpaceForm);
  }

  function submitSpace(event) {
    event.preventDefault();
    setMessage("");
    const payload = normalizeSpaceForm(form);
    if (!payload.name || !payload.key) {
      setMessage("Space name and key are required.");
      return;
    }

    if (dialogMode === "edit") {
      updateMutation.mutate({ id: editingSpaceId, payload });
      return;
    }

    createMutation.mutate(payload);
  }

  function deleteSpace(space) {
    if (!window.confirm(`Delete ${space.name}? This permanently removes its tasks, sprints, comments, and attachments metadata.`)) return;
    deleteMutation.mutate(space.id);
  }

  return (
    <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Spaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage spaces, access, lifecycle, and work boundaries.</p>
        </div>
      </div>

      {message ? <p className="rounded-md border bg-card p-3 text-sm">{message}</p> : null}

      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full min-w-[220px] flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-8 rounded pl-8 text-sm"
              placeholder="Search spaces..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="h-8 rounded border bg-background px-2.5 text-sm" value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="">All visibility</option>
            {VISIBILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select className="h-8 rounded border bg-background px-2.5 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <Button className="h-8 rounded px-2.5 text-sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Create Space
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2"><input type="checkbox" aria-label="Select all spaces" disabled /></th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Visibility</th>
              <th className="px-3 py-2">Members</th>
              <th className="px-3 py-2">Issues</th>
              <th className="px-3 py-2">Progress</th>
              <th className="px-3 py-2">Status</th>
              <th className="w-12 px-3 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {projectsQuery.isLoading ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Loading spaces...</td></tr>
            ) : spaces.length ? spaces.map((space) => {
              const memberCount = space._count?.members || 0;
              const taskCount = space._count?.tasks || 0;
              return (
                <tr
                  key={space.id}
                  className={cn("cursor-pointer border-t transition-colors hover:bg-accent/40", space.id === projectId && "bg-primary/10")}
                  onClick={() => navigate(`/spaces/${space.id}`)}
                  onDoubleClick={() => navigate(`/spaces/${space.id}/settings`)}
                >
                  <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                    <input type="checkbox" aria-label={`Select ${space.name}`} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FolderKanban className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{space.name}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{space.description || "No description yet."}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded border px-1.5 py-0.5 text-xs font-medium">{space.key}</span>
                  </td>
                  <td className="px-3 py-2 text-xs capitalize text-muted-foreground">{space.visibility}</td>
                  <td className="px-3 py-2 text-muted-foreground">{pluralize(memberCount, "member")}</td>
                  <td className="px-3 py-2 text-muted-foreground">{pluralize(taskCount, "task")}</td>
                  <td className="px-3 py-2"><ProgressCell value={space.progress} /></td>
                  <td className="px-3 py-2"><StatusIndicator status={space.status} /></td>
                  <td className="px-3 py-2 text-right" onClick={(event) => event.stopPropagation()}>
                    <SpaceActionsMenu
                      space={space}
                      onOpen={(path) => navigate(path || `/spaces/${space.id}/issues`)}
                      onEdit={() => openEditDialog(space)}
                      onDelete={() => deleteSpace(space)}
                    />
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No spaces match this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls pagination={pagination} onPageChange={setPage} />

      <SpaceDialog
        mode={dialogMode}
        open={Boolean(dialogMode)}
        form={form}
        setForm={setForm}
        pending={createMutation.isPending || updateMutation.isPending || editProjectQuery.isLoading}
        onClose={closeDialog}
        onSubmit={submitSpace}
      />
    </div>
  );
}
