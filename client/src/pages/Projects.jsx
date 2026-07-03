import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { FolderKanban, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineLoader } from "@/components/ui/loading";
import { PAGE_SIZE, PaginationControls } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { emitApiResourceRefresh, useApiAction, useApiResource } from "@/lib/api-hooks";
import { createProject, deleteProject, getProject, getProjects, updateProject } from "@/lib/project-api";
import { cn } from "@/lib/utils";

const emptyProjectForm = {
  name: "",
  key: "",
  description: "",
  visibility: "private",
  status: "active",
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

function normalizeProjectForm(form) {
  return {
    name: form.name.trim(),
    key: form.key.trim().toUpperCase(),
    description: form.description.trim(),
    visibility: form.visibility,
    status: form.status,
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

function ProjectDialog({ mode, open, form, setForm, pending, onClose, onSubmit }) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-xl" onClick={(event) => event.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Project" : "Create Project"}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "edit" ? "Update the core details for this project." : "Create a project boundary for related work."}
          </p>
        </DialogHeader>
        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              id="project-name"
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Website redesign"
              autoFocus
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor="project-key">Key</Label>
              <Input
                id="project-key"
                maxLength={10}
                value={form.key}
                onChange={(event) => setForm((current) => ({ ...current, key: event.target.value.toUpperCase() }))}
                placeholder="SPC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-visibility">Visibility</Label>
              <select
                id="project-visibility"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                value={form.visibility}
                onChange={(event) => setForm((current) => ({ ...current, visibility: event.target.value }))}
              >
                {VISIBILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-status">Status</Label>
            <select
              id="project-status"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
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
              {pending ? "Saving..." : mode === "edit" ? "Save Project" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProjectActionsMenu({ project, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 176;
    const menuHeight = 92;
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
        aria-label={`Actions for ${project.name}`}
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
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("");
  const [status, setStatus] = useState("");
  const [dialogMode, setDialogMode] = useState(null);
  const [editingProjectId, setEditingProjectId] = useState("");
  const [form, setForm] = useState(emptyProjectForm);
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);

  const projectsQuery = useApiResource(() => getProjects({ search, visibility, status, page, limit: PAGE_SIZE }), [
    search,
    visibility,
    status,
    page,
  ]);

  const editProjectQuery = useApiResource(() => getProject(editingProjectId, { fields: "edit" }), [editingProjectId, dialogMode], {
    enabled: Boolean(editingProjectId && dialogMode === "edit"),
  });

  const projects = projectsQuery.data?.data || [];
  const pagination = projectsQuery.data?.pagination;
  const editingProject = editProjectQuery.data?.data;

  useEffect(() => {
    setPage(1);
  }, [search, status, visibility]);

  useEffect(() => {
    if (!editingProject || dialogMode !== "edit") return;
    setForm({
      name: editingProject.name || "",
      key: editingProject.key || "",
      description: editingProject.description || "",
      visibility: editingProject.visibility || "private",
      status: editingProject.status || "active",
    });
  }, [dialogMode, editingProject]);

  function refreshProjects() {
    projectsQuery.reload();
    if (editingProjectId) editProjectQuery.reload();
    emitApiResourceRefresh("projects");
  }

  const createAction = useApiAction(createProject, {
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(getErrorMessage(result, "Could not create project."));
        return;
      }
      setMessage("Project created.");
      setDialogMode(null);
      setForm(emptyProjectForm);
      setSearch("");
      setVisibility("");
      setStatus("");
      setPage(1);
      refreshProjects();
      if (result.data?.id) navigate(`/projects/${result.data.id}`);
    },
    onError: (error) => setMessage(error.message),
  });

  const updateAction = useApiAction(({ id, payload }) => updateProject(id, payload), {
    onSuccess: (result) => {
      if (!result?.success) {
        setMessage(getErrorMessage(result, "Could not update project."));
        return;
      }
      setMessage("Project updated.");
      setDialogMode(null);
      setEditingProjectId("");
      setForm(emptyProjectForm);
      refreshProjects();
    },
    onError: (error) => setMessage(error.message),
  });

  const deleteAction = useApiAction((id) => deleteProject(id), {
    onSuccess: (result, id) => {
      if (!result?.success) {
        setMessage(getErrorMessage(result, "Could not delete project."));
        return;
      }
      setMessage("Project deleted.");
      refreshProjects();
      if (projectId === id) navigate("/projects");
    },
    onError: (error) => setMessage(error.message),
  });

  function openCreateDialog() {
    setMessage("");
    setForm(emptyProjectForm);
    setEditingProjectId("");
    setDialogMode("create");
  }

  function openEditDialog(project) {
    setMessage("");
    setEditingProjectId(project.id);
    setForm({
      name: project.name || "",
      key: project.key || "",
      description: project.description || "",
      visibility: project.visibility || "private",
      status: project.status || "active",
    });
    setDialogMode("edit");
  }

  function closeDialog() {
    setDialogMode(null);
    setEditingProjectId("");
    setForm(emptyProjectForm);
  }

  function submitProject(event) {
    event.preventDefault();
    setMessage("");
    const payload = normalizeProjectForm(form);
    if (!payload.name || !payload.key) {
      setMessage("Project name and key are required.");
      return;
    }

    if (dialogMode === "edit") {
      updateAction.run({ id: editingProjectId, payload });
      return;
    }

    createAction.run(payload);
  }

  function deleteProjectRecord(project) {
    if (!window.confirm(`Delete ${project.name}? This permanently removes its tasks, sprints, and comments.`)) return;
    deleteAction.run(project.id);
  }

  return (
    <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage projects, access, lifecycle, and work boundaries.</p>
        </div>
      </div>

      {message ? <p className="rounded-md border bg-card p-3 text-sm">{message}</p> : null}

      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full min-w-[220px] flex-1 md:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-8 rounded pl-8 text-sm"
              placeholder="Search projects..."
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
          Create Project
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Key</th>
              <th className="px-3 py-2">Visibility</th>
              <th className="px-3 py-2">Members</th>
              <th className="px-3 py-2">Tasks</th>
              <th className="px-3 py-2">Progress</th>
              <th className="px-3 py-2">Status</th>
              <th className="w-12 px-3 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {projectsQuery.isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-4">
                  <InlineLoader message="Loading projects..." />
                </td>
              </tr>
            ) : projects.length ? projects.map((project) => {
              const memberCount = project._count?.members || 0;
              const taskCount = project._count?.tasks || 0;
              return (
                <tr
                  key={project.id}
                  className={cn("cursor-pointer border-t transition-colors hover:bg-accent/40", project.id === projectId && "bg-primary/10")}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  onDoubleClick={() => navigate(`/projects/${project.id}`)}
                >
                  <td className="px-3 py-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FolderKanban className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{project.name}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{project.description || "No description yet."}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded border px-1.5 py-0.5 text-xs font-medium">{project.key}</span>
                  </td>
                  <td className="px-3 py-2 text-xs capitalize text-muted-foreground">{project.visibility}</td>
                  <td className="px-3 py-2 text-muted-foreground">{pluralize(memberCount, "member")}</td>
                  <td className="px-3 py-2 text-muted-foreground">{pluralize(taskCount, "task")}</td>
                  <td className="px-3 py-2"><ProgressCell value={project.progress} /></td>
                  <td className="px-3 py-2"><StatusIndicator status={project.status} /></td>
                  <td className="px-3 py-2 text-right" onClick={(event) => event.stopPropagation()}>
                    <ProjectActionsMenu
                      project={project}
                      onEdit={() => openEditDialog(project)}
                      onDelete={() => deleteProjectRecord(project)}
                    />
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No projects match this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls pagination={pagination} onPageChange={setPage} />

      <ProjectDialog
        mode={dialogMode}
        open={Boolean(dialogMode)}
        form={form}
        setForm={setForm}
        pending={createAction.isPending || updateAction.isPending || editProjectQuery.isLoading}
        onClose={closeDialog}
        onSubmit={submitProject}
      />
    </div>
  );
}
