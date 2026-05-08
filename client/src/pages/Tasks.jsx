import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  CalendarPlus,
  TimerReset,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronsUp,
  FileText,
  ExternalLink,
  Filter,
  Globe2,
  GripVertical,
  LayoutGrid,
  List,
  ListTodo,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_SIZE, PaginationControls } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { createComment, getTaskComments } from "@/lib/comment-api";
import { createDoc, deleteDoc, getProjectDocs, updateDoc } from "@/lib/doc-api";
import { getProject, getProjectMembers, getProjects } from "@/lib/project-api";
import { LEGACY_STORAGE_KEYS, migrateStorageKey, STORAGE_KEYS } from "@/lib/storage-keys";
import {
  addTasksToSprint,
  completeSprint,
  createSprint,
  deleteSprint,
  getProjectSprints,
  removeTaskFromSprint,
  reorderSprintTasks,
  startSprint,
  updateSprint,
} from "@/lib/sprint-api";
import { addTaskLink, createTask, deleteTask, deleteTaskLink, getProjectTasks, getTask, updateTask } from "@/lib/task-api";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "TODO", label: "To Do", color: "#fb8500" },
  { value: "IN_PROGRESS", label: "In Progress", color: "#82b832" },
  { value: "IN_REVIEW", label: "In Review", color: "#bf5af2" },
  { value: "DONE", label: "Done", color: "#3478f6" },
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const PRIORITY_TONES = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-orange-500",
  HIGH: "text-red-500",
  URGENT: "text-red-600",
};

const PROJECT_TABS = [
  { value: "summary", label: "Summary", icon: Globe2 },
  { value: "backlog", label: "Backlog", icon: ListTodo },
  { value: "list", label: "List", icon: List },
  { value: "board", label: "Board", icon: LayoutGrid },
  { value: "docs", label: "Docs", icon: FileText },
];
const TASK_DETAIL_PANEL_WIDTH = "clamp(560px, 42vw, 720px)";
const CURRENT_PROJECT_KEY = STORAGE_KEYS.currentProjectId;
const CURRENT_PROJECT_CHANGE_EVENT = "current-project-change";

const emptyTask = {
  title: "",
  description: "",
  status: "TODO",
  priority: "MEDIUM",
  assigneeId: "",
  dueDate: "",
  sprintId: "",
};

function resultMessage(result, fallback) {
  return result?.error?.message || fallback;
}

function formatDate(date) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(date)
  );
}

function issueKey(project, task) {
  return `${project?.key || "ZP"}-${task.id.slice(-4).toUpperCase()}`;
}

function countByStatus(tasks, status) {
  return tasks.filter((task) => task.status === status).length;
}

function relativeDate(date) {
  if (!date) return "None";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export default function Tasks() {
  const { user } = useAuth();
  const { projectId: routeProjectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState(() => routeProjectId || migrateStorageKey(LEGACY_STORAGE_KEYS.currentProjectId, CURRENT_PROJECT_KEY) || "");
  const requestedView = searchParams.get("view");
  const initialView = PROJECT_TABS.some((tab) => tab.value === requestedView) ? requestedView : "summary";
  const [activeView, setActiveView] = useState(initialView);
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", assigneeId: "", sprintId: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [docSearch, setDocSearch] = useState("");
  const [taskPage, setTaskPage] = useState(1);
  const [docPage, setDocPage] = useState(1);

  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: () => getProjects({ limit: PAGE_SIZE }) });
  const projects = projectsQuery.data?.data || [];

  useEffect(() => {
    if (!projectId && projects[0]?.id) {
      localStorage.setItem(CURRENT_PROJECT_KEY, projects[0].id);
      setProjectId(projects[0].id);
    }
  }, [projectId, projects]);

  useEffect(() => {
    if (routeProjectId && routeProjectId !== projectId) setProjectId(routeProjectId);
  }, [projectId, routeProjectId]);

  useEffect(() => {
    function handleProjectChange(event) {
      if (!routeProjectId && event.detail) setProjectId(event.detail);
    }

    window.addEventListener(CURRENT_PROJECT_CHANGE_EVENT, handleProjectChange);
    return () => window.removeEventListener(CURRENT_PROJECT_CHANGE_EVENT, handleProjectChange);
  }, [routeProjectId]);

  useEffect(() => {
    const nextView = searchParams.get("view");
    if (PROJECT_TABS.some((tab) => tab.value === nextView) && nextView !== activeView) {
      setActiveView(nextView);
    }
  }, [activeView, searchParams]);

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  });

  const membersQuery = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => getProjectMembers(projectId),
    enabled: Boolean(projectId),
  });

  const tasksQuery = useQuery({
    queryKey: ["project-tasks", projectId, filters, taskPage],
    queryFn: () => getProjectTasks(projectId, { ...filters, page: taskPage, limit: PAGE_SIZE }),
    enabled: Boolean(projectId),
  });

  const sprintsQuery = useQuery({
    queryKey: ["project-sprints", projectId],
    queryFn: () => getProjectSprints(projectId),
    enabled: Boolean(projectId),
  });

  const docsQuery = useQuery({
    queryKey: ["project-docs", projectId, docSearch, docPage],
    queryFn: () => getProjectDocs(projectId, { search: docSearch, page: docPage, limit: PAGE_SIZE }),
    enabled: Boolean(projectId),
  });

  const commentsQuery = useQuery({
    queryKey: ["task-comments", selectedTask?.id],
    queryFn: () => getTaskComments(selectedTask.id),
    enabled: Boolean(selectedTask?.id),
  });

  const members = membersQuery.data?.data || [];
  const tasks = tasksQuery.data?.data || [];
  const sprints = sprintsQuery.data?.data || [];
  const docs = docsQuery.data?.data || [];
  const tasksPagination = tasksQuery.data?.pagination;
  const docsPagination = docsQuery.data?.pagination;
  const activeProject = projectQuery.data?.data;
  const currentPermissions = activeProject?.currentUserPermissions || [];

  const canCreate = currentPermissions.includes("task.create");
  const canAssign = currentPermissions.includes("task.assign");
  const canDelete = currentPermissions.includes("task.delete");
  const canComment = currentPermissions.includes("comment.create");
  const canManageSprints = currentPermissions.includes("task.update.any");

  const summary = useMemo(() => {
    const now = new Date();
    const dueSoon = tasks.filter((task) => {
      if (!task.dueDate || task.status === "DONE") return false;
      const due = new Date(task.dueDate);
      const days = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return days >= 0 && days <= 7;
    }).length;

    return {
      completed: countByStatus(tasks, "DONE"),
      updated: tasks.length,
      created: tasks.length,
      dueSoon,
      total: tasks.length,
    };
  }, [tasks]);

  useEffect(() => {
    setTaskPage(1);
  }, [activeView, filters, projectId]);

  useEffect(() => {
    setDocPage(1);
  }, [docSearch, projectId]);

  const createMutation = useMutation({
    mutationFn: (payload) => createTask(projectId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not create issue."));
        return;
      }
      setTaskForm(emptyTask);
      setCreateOpen(false);
      setError("");
      refreshPlanningData();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ taskId, payload }) => updateTask(projectId, taskId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not update issue."));
        return;
      }
      setSelectedTask(result.data);
      setError("");
      refreshPlanningData();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId) => deleteTask(projectId, taskId),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not delete issue."));
        return;
      }
      setSelectedTask(null);
      setError("");
      refreshPlanningData();
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => createComment(selectedTask.id, comment),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not add comment."));
        return;
      }
      setComment("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["task-comments", selectedTask.id] });
    },
  });

  function refreshPlanningData() {
    queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project-sprints", projectId] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  }

  function refreshDocs() {
    queryClient.invalidateQueries({ queryKey: ["project-docs", projectId] });
  }

  const createSprintMutation = useMutation({
    mutationFn: (payload) => createSprint(projectId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not create sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const updateSprintMutation = useMutation({
    mutationFn: ({ sprintId, payload }) => updateSprint(projectId, sprintId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not update sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const startSprintMutation = useMutation({
    mutationFn: ({ sprintId, payload }) => startSprint(projectId, sprintId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not start sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const completeSprintMutation = useMutation({
    mutationFn: ({ sprintId, payload }) => completeSprint(projectId, sprintId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not complete sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const deleteSprintMutation = useMutation({
    mutationFn: ({ sprintId }) => deleteSprint(projectId, sprintId),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not delete sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const reorderSprintTasksMutation = useMutation({
    mutationFn: ({ sprintId, orderedTaskIds }) => reorderSprintTasks(projectId, sprintId, orderedTaskIds),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not reorder tasks."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const addTasksToSprintMutation = useMutation({
    mutationFn: ({ sprintId, taskIds }) => addTasksToSprint(projectId, sprintId, taskIds),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not move tasks to sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const removeTaskFromSprintMutation = useMutation({
    mutationFn: ({ sprintId, taskId }) => removeTaskFromSprint(projectId, sprintId, taskId),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not move task to backlog."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const createDocMutation = useMutation({
    mutationFn: (payload) => createDoc(projectId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not create document."));
        return;
      }
      setError("");
      refreshDocs();
    },
  });

  const updateDocMutation = useMutation({
    mutationFn: ({ docId, payload }) => updateDoc(projectId, docId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not update document."));
        return;
      }
      setError("");
      refreshDocs();
    },
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId) => deleteDoc(projectId, docId),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not delete document."));
        return;
      }
      setError("");
      refreshDocs();
    },
  });

  const addTaskLinkMutation = useMutation({
    mutationFn: ({ taskId, targetTaskId }) => addTaskLink(projectId, taskId, { targetTaskId }),
    onSuccess: (result, variables) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not link work item."));
        return;
      }
      setError("");
      queryClient.invalidateQueries({ queryKey: ["task-detail", projectId, variables.taskId] });
    },
  });

  const deleteTaskLinkMutation = useMutation({
    mutationFn: ({ taskId, linkId }) => deleteTaskLink(projectId, taskId, linkId),
    onSuccess: (result, variables) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not remove linked work item."));
        return;
      }
      setError("");
      queryClient.invalidateQueries({ queryKey: ["task-detail", projectId, variables.taskId] });
    },
  });

  function changeView(nextView) {
    setActiveView(nextView);
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.set("view", nextView);
      return params;
    });
  }

  function submitTask(event) {
    event.preventDefault();
    setError("");
    createMutation.mutate({
      ...taskForm,
      assigneeId: taskForm.assigneeId || undefined,
      dueDate: taskForm.dueDate || undefined,
      sprintId: taskForm.sprintId || undefined,
    });
  }

  function moveTask(task, status) {
    if (task.status === status) return;
    updateMutation.mutate({ taskId: task.id, payload: { status } });
  }

  function updateSelected(field, value) {
    if (!selectedTask) return;
    updateMutation.mutate({ taskId: selectedTask.id, payload: { [field]: value === "" ? null : value } });
  }

  function createInlineTask(payload) {
    setError("");
    createMutation.mutate({
      title: payload.title,
      description: payload.description || undefined,
      status: payload.status || "TODO",
      priority: payload.priority || "MEDIUM",
      assigneeId: payload.assigneeId || undefined,
      dueDate: payload.dueDate || undefined,
      sprintId: payload.sprintId || undefined,
    });
  }

  const taskDetailOpen = Boolean(selectedTask);

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <div
        className={cn("min-w-0 transition-[margin-right] duration-200 ease-out", taskDetailOpen && "lg:mr-[var(--task-detail-width)]")}
        style={{ "--task-detail-width": TASK_DETAIL_PANEL_WIDTH }}
      >
        <ProjectHeader
          activeView={activeView}
          setActiveView={changeView}
        />

        <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {activeView === "summary" ? (
            <SummaryView tasks={tasks} summary={summary} activeProject={activeProject} user={user} />
          ) : null}

          {activeView === "board" ? (
          <BoardView
            tasks={tasks}
            pagination={tasksPagination}
            onPageChange={setTaskPage}
            activeProject={activeProject}
            members={members}
            sprints={sprints}
            filters={filters}
            setFilters={setFilters}
            setSelectedTask={setSelectedTask}
            moveTask={moveTask}
            refetch={() => tasksQuery.refetch()}
          />
          ) : null}

          {activeView === "list" ? (
            <ListView
              tasks={tasks}
              pagination={tasksPagination}
              onPageChange={setTaskPage}
              activeProject={activeProject}
              members={members}
              sprints={sprints}
              filters={filters}
              setFilters={setFilters}
              setSelectedTask={setSelectedTask}
              canCreate={canCreate}
              canAssign={canAssign}
              createInlineTask={createInlineTask}
              updateTaskMutation={updateMutation}
              deleteTaskMutation={deleteMutation}
              refetch={() => tasksQuery.refetch()}
            />
          ) : null}

          {activeView === "backlog" ? (
            <BacklogView
              tasks={tasks}
              pagination={tasksPagination}
              onPageChange={setTaskPage}
              sprints={sprints}
              activeProject={activeProject}
              members={members}
              filters={filters}
              setFilters={setFilters}
              setSelectedTask={setSelectedTask}
              canCreate={canCreate}
              canAssign={canAssign}
              canManageSprints={canManageSprints}
              createInlineTask={createInlineTask}
              updateTaskMutation={updateMutation}
              createSprintMutation={createSprintMutation}
              updateSprintMutation={updateSprintMutation}
              startSprintMutation={startSprintMutation}
              completeSprintMutation={completeSprintMutation}
              deleteSprintMutation={deleteSprintMutation}
              reorderSprintTasksMutation={reorderSprintTasksMutation}
              addTasksToSprintMutation={addTasksToSprintMutation}
              removeTaskFromSprintMutation={removeTaskFromSprintMutation}
              refetch={() => {
                tasksQuery.refetch();
                sprintsQuery.refetch();
              }}
            />
          ) : null}
          {activeView === "docs" ? (
            <DocsView
              docs={docs}
              pagination={docsPagination}
              onPageChange={setDocPage}
              docSearch={docSearch}
              setDocSearch={setDocSearch}
              canManage={canManageSprints}
              createDocMutation={createDocMutation}
              updateDocMutation={updateDocMutation}
              deleteDocMutation={deleteDocMutation}
              refetch={() => docsQuery.refetch()}
            />
          ) : null}
        </div>
      </div>

      <IssueCreateDialog
        open={createOpen}
        setOpen={setCreateOpen}
        taskForm={taskForm}
        setTaskForm={setTaskForm}
        members={members}
        sprints={sprints}
        canAssign={canAssign}
        submitTask={submitTask}
        pending={createMutation.isPending}
      />

      <IssueDetailDialog
        selectedTask={selectedTask}
        setSelectedTask={setSelectedTask}
        activeProject={activeProject}
        projectId={projectId}
        members={members}
        canAssign={canAssign}
        canDelete={canDelete}
        canComment={canComment}
        sprints={sprints}
        comments={commentsQuery.data?.data || []}
        comment={comment}
        setComment={setComment}
        updateSelected={updateSelected}
        deleteMutation={deleteMutation}
        commentMutation={commentMutation}
        addTaskLinkMutation={addTaskLinkMutation}
        deleteTaskLinkMutation={deleteTaskLinkMutation}
        projectTasks={tasks}
        projectDocs={docs}
        createDocMutation={createDocMutation}
      />
    </div>
  );
}

export function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [taskDraft, setTaskDraft] = useState(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProject(projectId),
    enabled: Boolean(projectId),
  });
  const membersQuery = useQuery({
    queryKey: ["project-members", projectId],
    queryFn: () => getProjectMembers(projectId),
    enabled: Boolean(projectId),
  });
  const sprintsQuery = useQuery({
    queryKey: ["project-sprints", projectId],
    queryFn: () => getProjectSprints(projectId),
    enabled: Boolean(projectId),
  });
  const taskQuery = useQuery({
    queryKey: ["task-detail", projectId, taskId],
    queryFn: () => getTask(projectId, taskId),
    enabled: Boolean(projectId && taskId),
  });
  const commentsQuery = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: () => getTaskComments(taskId),
    enabled: Boolean(taskId),
  });
  const tasksQuery = useQuery({
    queryKey: ["project-tasks", projectId, { limit: PAGE_SIZE }],
    queryFn: () => getProjectTasks(projectId, { limit: PAGE_SIZE }),
    enabled: Boolean(projectId),
  });
  const docsQuery = useQuery({
    queryKey: ["project-docs", projectId],
    queryFn: () => getProjectDocs(projectId),
    enabled: Boolean(projectId),
  });
  useEffect(() => {
    if (taskQuery.data?.data) setTaskDraft(taskQuery.data.data);
  }, [taskQuery.data?.data]);

  const activeProject = projectQuery.data?.data;
  const members = membersQuery.data?.data || [];
  const sprints = sprintsQuery.data?.data || [];
  const permissions = activeProject?.currentUserPermissions || [];
  const canAssign = permissions.includes("task.assign");
  const canDelete = permissions.includes("task.delete");
  const canComment = permissions.includes("comment.create");

  const updateMutation = useMutation({
    mutationFn: ({ payload }) => updateTask(projectId, taskId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not update work item."));
        return;
      }
      setTaskDraft(result.data);
      setError("");
      queryClient.invalidateQueries({ queryKey: ["task-detail", projectId, taskId] });
      queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(projectId, taskId),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not delete work item."));
        return;
      }
      navigate(`/spaces/${projectId}/tasks?view=list`);
    },
  });

  const commentMutation = useMutation({
    mutationFn: () => createComment(taskId, comment),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not add comment."));
        return;
      }
      setComment("");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["task-comments", taskId] });
    },
  });

  const createDocMutation = useMutation({
    mutationFn: (payload) => createDoc(projectId, payload),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not create document."));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["project-docs", projectId] });
    },
  });

  const addTaskLinkMutation = useMutation({
    mutationFn: ({ targetTaskId }) => addTaskLink(projectId, taskId, { targetTaskId }),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not link work item."));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["task-detail", projectId, taskId] });
    },
  });

  const deleteTaskLinkMutation = useMutation({
    mutationFn: ({ linkId }) => deleteTaskLink(projectId, taskId, linkId),
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not remove linked work item."));
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["task-detail", projectId, taskId] });
    },
  });

  function updateSelected(field, value) {
    updateMutation.mutate({ payload: { [field]: value === "" ? null : value } });
  }

  if (taskQuery.isLoading) {
    return (
      <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Work Item</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review details, links, documents, activity, and ownership for this task.</p>
        </div>
        <p className="rounded-md border p-6 text-sm text-muted-foreground">Loading work item...</p>
      </div>
    );
  }

  if (!taskDraft) {
    return (
      <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Work Item</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review details, links, documents, activity, and ownership for this task.</p>
        </div>
        <p className="rounded-md border p-6 text-sm text-muted-foreground">Work item not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-background px-3 py-3 sm:px-4 lg:px-5">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Work Item</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review details, links, documents, activity, and ownership for this task.</p>
      </div>
      {error ? (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      ) : null}
      <WorkItemView
        task={taskDraft}
        activeProject={activeProject}
        members={members}
        canAssign={canAssign}
        canDelete={canDelete}
        canComment={canComment}
        sprints={sprints}
        comments={commentsQuery.data?.data || []}
        comment={comment}
        setComment={setComment}
        updateSelected={updateSelected}
        deleteMutation={deleteMutation}
        commentMutation={commentMutation}
        addTaskLinkMutation={addTaskLinkMutation}
        deleteTaskLinkMutation={deleteTaskLinkMutation}
        projectTasks={tasksQuery.data?.data || []}
        projectDocs={docsQuery.data?.data || []}
        createDocMutation={createDocMutation}
        setSelectedTask={setTaskDraft}
        standalone
      />
    </div>
  );
}

function ProjectHeader({ activeView, setActiveView }) {
  return (
    <div className="border-b bg-background px-3 pt-3 sm:px-4 lg:px-5">
      <div className="pb-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Board</h1>
        <p className="mt-1 text-sm text-muted-foreground">Plan backlog work, track sprint progress, manage docs, and review delivery status.</p>
      </div>
      <div className="flex min-h-10 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <nav className="flex min-w-0 gap-1 overflow-x-auto">
          {PROJECT_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = tab.value === activeView;
            return (
              <button
                key={tab.value}
                type="button"
                className={cn(
                  "flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-sm font-medium transition-colors",
                  active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveView(tab.value)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded" aria-label="Add view">
            <Plus className="h-4 w-4" />
          </Button>
        </nav>
        </div>

      </div>
    </div>
  );
}

function SummaryView({ tasks, summary, activeProject, user }) {
  const donut = buildDonut(tasks);
  const recent = tasks.slice(0, 4);

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={CheckCircle2} color="text-green-600" value={`${summary.completed} completed`} caption="in the last 7 days" />
        <Metric icon={ListTodo} color="text-muted-foreground" value={`${summary.updated} updated`} caption="in the last 7 days" />
        <Metric icon={CheckCircle2} color="text-muted-foreground" value={`${summary.created} created`} caption="in the last 7 days" />
        <Metric icon={CalendarDays} color="text-orange-600" value={`${summary.dueSoon} due soon`} caption="in the next 7 days" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Status overview" subtitle="Get a snapshot of the status of your work items. View all work items">
          <div className="flex flex-col items-center gap-5 py-2 md:flex-row md:justify-center">
            <div
              className="flex h-48 w-48 items-center justify-center rounded-full"
              style={{ background: donut }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-card text-center">
                <p className="text-3xl font-bold">{summary.total}</p>
                <p className="mt-1 max-w-24 text-sm font-semibold text-muted-foreground">Total work item...</p>
              </div>
            </div>
            <div className="space-y-3">
              {STATUSES.slice().reverse().map((status) => (
                <div key={status.value} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="h-4 w-4 rounded-sm" style={{ backgroundColor: status.color }} />
                  {status.label}: {countByStatus(tasks, status.value)}
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Recent activity" subtitle="Stay up to date with what's happening across the space." action>
          <div className="max-h-64 space-y-4 overflow-y-auto pr-2">
            <p className="text-sm font-semibold">Today</p>
            {recent.map((task, index) => (
              <div key={task.id} className="flex gap-3">
                <UserAvatar user={user} fallback="IA" className="h-8 w-8" fallbackClassName="bg-primary text-primary-foreground" />
                <div className="min-w-0 text-sm">
                  <p>
                    <span className="font-medium text-primary">{user?.name || user?.email || "A teammate"}</span> updated field "status" on{" "}
                    <span className="rounded border px-1 text-primary">{issueKey(activeProject, task)}: {task.title}</span>
                  </p>
                  <span className="mt-1 inline-block rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold uppercase text-primary">
                    {task.status.replaceAll("_", " ")}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">{23 + index} minutes ago</p>
                </div>
              </div>
            ))}
            {recent.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : null}
          </div>
        </Panel>

        <Panel title="Priority breakdown" subtitle="Get a holistic view of how work is being prioritized. How to manage priorities for spaces">
          <div className="space-y-3 pt-2">
            {PRIORITIES.map((priority) => {
              const value = tasks.filter((task) => task.priority === priority).length;
              const width = summary.total ? Math.max(6, Math.round((value / summary.total) * 100)) : 0;
              return (
                <div key={priority}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{priority}</span>
                    <span className="text-muted-foreground">{value}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded bg-secondary">
                    <div className="h-full bg-muted-foreground/70" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Types of work" subtitle="Get a breakdown of work items by their types. View all items">
          <div className="pt-3">
            <div className="mb-3 grid grid-cols-[1fr_2fr] text-sm font-medium text-muted-foreground">
              <span>Type</span>
              <span>Distribution</span>
            </div>
            <div className="grid grid-cols-[1fr_2fr] items-center gap-4">
              <span className="inline-flex items-center gap-2 text-sm">
                <ListTodo className="h-4 w-4 text-primary" />
                Task
              </span>
              <div className="h-7 overflow-hidden rounded bg-secondary">
                <div className="flex h-full items-center justify-center bg-muted-foreground/70 text-xs font-semibold text-background">
                  100%
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function BoardView({ tasks, pagination, onPageChange, activeProject, members, sprints, filters, setFilters, setSelectedTask, moveTask, refetch }) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-background">
        <div className="p-3">
          <TaskFilters filters={filters} setFilters={setFilters} members={members} sprints={sprints} placeholder="Search board" onRefresh={refetch} refreshLabel="Refresh board" />
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[960px] grid-cols-[repeat(4,minmax(200px,1fr))] gap-7 xl:min-w-0">
        {STATUSES.map((column) => {
          const columnTasks = tasks.filter((task) => task.status === column.value);
          return (
            <section
              key={column.value}
              className="min-h-[520px] rounded-md border bg-board-column"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const taskId = event.dataTransfer.getData("text/task-id");
                const task = tasks.find((item) => item.id === taskId);
                if (task) moveTask(task, column.value);
              }}
            >
              <div className="border-b bg-background/80">
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-semibold uppercase text-muted-foreground">{column.label}</h2>
                      <span className="rounded bg-secondary px-1.5 py-0.5 text-xs font-medium">{columnTasks.length}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{columnTasks.length} work items</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`${column.label} actions`}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 p-2">
                {columnTasks.length ? (
                  columnTasks.map((task) => (
                    <button
                      key={task.id}
                      className={cn(
                        "group block w-full rounded-md border bg-background p-2.5 text-left shadow-sm transition hover:border-primary/60 hover:shadow-md",
                        task.priority === "URGENT" && "border-l-4 border-l-red-600",
                        task.priority === "HIGH" && "border-l-4 border-l-red-500"
                      )}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/task-id", task.id)}
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-3 text-sm font-medium leading-5 text-foreground group-hover:text-primary">{task.title}</p>
                        <ChevronsUp className={cn("h-4 w-4 shrink-0", PRIORITY_TONES[task.priority])} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {issueKey(activeProject, task)}
                        </span>
                        {task.sprint?.name ? (
                          <span className="max-w-full truncate rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">{task.sprint.name}</span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex min-w-0 items-center gap-1 rounded border bg-background px-1.5 py-0.5">
                          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{formatDate(task.dueDate)}</span>
                        </span>
                        <UserAvatar user={task.assignee} className="h-7 w-7" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed bg-background/60 p-4 text-center text-sm text-muted-foreground">
                    No work items
                  </div>
                )}
              </div>
            </section>
          );
        })}
        </div>
      </div>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </div>
  );
}

function BacklogView({
  tasks,
  pagination,
  onPageChange,
  sprints,
  activeProject,
  members,
  filters,
  setFilters,
  setSelectedTask,
  canCreate,
  canAssign,
  canManageSprints,
  createInlineTask,
  updateTaskMutation,
  createSprintMutation,
  updateSprintMutation,
  startSprintMutation,
  completeSprintMutation,
  deleteSprintMutation,
  reorderSprintTasksMutation,
  addTasksToSprintMutation,
  removeTaskFromSprintMutation,
  refetch,
}) {
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [sprintDialog, setSprintDialog] = useState(null);
  const plannedOrActiveSprints = sprints.filter((sprint) => sprint.status !== "COMPLETED");
  const completedSprints = sprints.filter((sprint) => sprint.status === "COMPLETED");
  const activeSprint = plannedOrActiveSprints.find((sprint) => sprint.status === "ACTIVE");
  const primarySprint = activeSprint || plannedOrActiveSprints[0] || null;
  const backlogTasks = tasks
    .filter((task) => !task.sprintId)
    .slice()
    .sort((a, b) => (a.backlogOrder || 0) - (b.backlogOrder || 0));
  const sprintTasks = primarySprint
    ? tasks
        .filter((task) => task.sprintId === primarySprint.id)
        .slice()
        .sort((a, b) => (a.sprintOrder || 0) - (b.sprintOrder || 0))
    : [];
  const visibleTasks = tasks.length;
  const selectedBacklogIds = selectedTaskIds.filter((taskId) => backlogTasks.some((task) => task.id === taskId));

  function toggleTask(taskId) {
    setSelectedTaskIds((current) =>
      current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]
    );
  }

  function toggleSection(items, checked) {
    const ids = items.map((task) => task.id);
    setSelectedTaskIds((current) => {
      const withoutSection = current.filter((id) => !ids.includes(id));
      return checked ? [...withoutSection, ...ids] : withoutSection;
    });
  }

  function createSprintFromBacklog() {
    setSprintDialog({ type: "create", sprint: null });
  }

  function moveSelectedToSprint() {
    if (!primarySprint || !selectedBacklogIds.length) return;
    addTasksToSprintMutation.mutate(
      { sprintId: primarySprint.id, taskIds: selectedBacklogIds },
      { onSuccess: () => setSelectedTaskIds((current) => current.filter((id) => !selectedBacklogIds.includes(id))) }
    );
  }

  function moveTaskInScope(scopeId, items, taskId, direction) {
    const index = items.findIndex((item) => item.id === taskId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return;
    const ordered = items.map((item) => item.id);
    const [moved] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, moved);
    reorderSprintTasksMutation.mutate({ sprintId: scopeId, orderedTaskIds: ordered });
  }

  function submitSprintDialog(payload) {
    if (!sprintDialog) return;
    if (sprintDialog.type === "create") {
      createSprintMutation.mutate(payload, { onSuccess: () => setSprintDialog(null) });
    }
    if (sprintDialog.type === "start") {
      startSprintMutation.mutate({ sprintId: sprintDialog.sprint.id, payload }, { onSuccess: () => setSprintDialog(null) });
    }
    if (sprintDialog.type === "complete") {
      completeSprintMutation.mutate({ sprintId: sprintDialog.sprint.id, payload }, { onSuccess: () => setSprintDialog(null) });
    }
    if (sprintDialog.type === "delete") {
      deleteSprintMutation.mutate({ sprintId: sprintDialog.sprint.id }, { onSuccess: () => setSprintDialog(null) });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex w-full flex-col gap-2 border-b pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <div className="relative w-full min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="h-8 rounded pl-8 text-sm"
              placeholder="Search backlog"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            />
          </div>
          <select
            className="h-8 rounded border bg-background px-2.5 text-sm"
            value={filters.assigneeId}
            onChange={(event) => setFilters((current) => ({ ...current, assigneeId: event.target.value }))}
          >
            <option value="">All assignees</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.user?.name || member.user?.email}
              </option>
            ))}
          </select>
          <select
            className="h-8 rounded border bg-background px-2.5 text-sm"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            <option value="">All statuses</option>
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            className="h-8 rounded border bg-background px-2.5 text-sm"
            value={filters.priority}
            onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
          <Button variant="outline" className="h-8 rounded px-2.5 text-sm" onClick={() => setFilters({ search: "", status: "", priority: "", assigneeId: "", sprintId: "" })}>
            <Filter className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {canManageSprints && primarySprint && selectedBacklogIds.length ? (
            <Button className="h-8 rounded px-2.5 text-sm" onClick={moveSelectedToSprint} disabled={addTasksToSprintMutation.isPending}>
              <TimerReset className="h-3.5 w-3.5" />
              Move to sprint
            </Button>
          ) : null}
          <Button variant="outline" size="icon" className="h-8 w-8 rounded" aria-label="Refresh backlog" onClick={refetch}>
            <RefreshCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {primarySprint ? (
        <BacklogSection
          title={primarySprint.name}
          sprint={primarySprint}
          count={sprintTasks.length}
          items={sprintTasks}
          selectedTaskIds={selectedTaskIds}
          activeProject={activeProject}
          primaryAction={primarySprint.status === "ACTIVE" ? "Complete sprint" : "Start sprint"}
          canCreate={canCreate}
          canAssign={canAssign}
          canManageSprints={canManageSprints}
          onToggleSection={toggleSection}
          onToggleTask={toggleTask}
          onCreate={(title) => createInlineTask({ title, status: "TODO", sprintId: primarySprint.id })}
          onOpenTask={setSelectedTask}
          onPrimaryAction={() =>
            primarySprint.status === "ACTIVE"
              ? setSprintDialog({ type: "complete", sprint: primarySprint })
              : setSprintDialog({ type: "start", sprint: primarySprint })
          }
          onUpdateSprint={(payload) => updateSprintMutation.mutate({ sprintId: primarySprint.id, payload })}
          onUpdateTask={(task, payload) => updateTaskMutation.mutate({ taskId: task.id, payload })}
          onRemoveTask={(task) => removeTaskFromSprintMutation.mutate({ sprintId: primarySprint.id, taskId: task.id })}
          onDeleteSprint={() => setSprintDialog({ type: "delete", sprint: primarySprint })}
          onMoveTask={(task, direction) => moveTaskInScope(primarySprint.id, sprintTasks, task.id, direction)}
          actionPending={startSprintMutation.isPending || completeSprintMutation.isPending}
        />
      ) : (
        <section className="rounded-md border bg-muted/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">No sprint created</h2>
              <p className="mt-1 text-sm text-muted-foreground">Create a sprint to plan work from the backlog.</p>
            </div>
            {canManageSprints ? (
              <Button className="h-8 rounded px-2.5 text-sm" onClick={createSprintFromBacklog} disabled={createSprintMutation.isPending}>
                <Plus className="h-4 w-4" />
                Create sprint
              </Button>
            ) : null}
          </div>
        </section>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1 text-xs text-muted-foreground">
        <div className="flex items-center justify-center">
          <GripVertical className="h-4 w-4" />
        </div>
        <p>
          {visibleTasks} of {tasks.length} work item{tasks.length === 1 ? "" : "s"} visible
        </p>
      </div>

      <BacklogSection
        title="Backlog"
        count={backlogTasks.length}
        items={backlogTasks}
        selectedTaskIds={selectedTaskIds}
        activeProject={activeProject}
        primaryAction={primarySprint ? "Move selected" : "Create sprint"}
        canCreate={canCreate}
        canAssign={canAssign}
        canManageSprints={canManageSprints}
        onToggleSection={toggleSection}
        onToggleTask={toggleTask}
        onCreate={(title) => createInlineTask({ title, status: "TODO" })}
        onOpenTask={setSelectedTask}
        onPrimaryAction={primarySprint ? moveSelectedToSprint : createSprintFromBacklog}
        onUpdateTask={(task, payload) => updateTaskMutation.mutate({ taskId: task.id, payload })}
        onMoveTask={(task, direction) => moveTaskInScope("backlog", backlogTasks, task.id, direction)}
        actionDisabled={!canManageSprints || (primarySprint ? selectedBacklogIds.length === 0 : false)}
        actionPending={createSprintMutation.isPending || addTasksToSprintMutation.isPending}
      />

      <CompletedSprintHistory sprints={completedSprints} />
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
      <SprintDialog
        state={sprintDialog}
        onClose={() => setSprintDialog(null)}
        onSubmit={submitSprintDialog}
        pending={createSprintMutation.isPending || startSprintMutation.isPending || completeSprintMutation.isPending || deleteSprintMutation.isPending}
      />
    </div>
  );
}

function CompletedSprintHistory({ sprints }) {
  if (!sprints.length) return null;

  return (
    <section className="rounded-md border bg-background">
      <div className="border-b px-3 py-2">
        <h2 className="text-sm font-semibold">Completed sprint history</h2>
        <p className="text-xs text-muted-foreground">Review closed sprints and completion snapshots.</p>
      </div>
      <div className="divide-y">
        {sprints.map((sprint) => {
          const tasks = sprint.tasks || [];
          const done = tasks.filter((task) => task.status === "DONE").length;
          const total = sprint._count?.tasks ?? tasks.length;
          const completion = total ? Math.round((done / total) * 100) : 0;
          return (
            <div key={sprint.id} className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{sprint.name}</p>
                <p className="truncate text-xs text-muted-foreground">{sprint.goal || "No sprint goal recorded."}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{done}/{total} done</span>
                  <span>{completion}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${completion}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SprintDialog({ state, onClose, onSubmit, pending }) {
  const [form, setForm] = useState({ name: "", goal: "", startDate: "", endDate: "", moveOpenToBacklog: true, deleteConfirm: "" });
  const type = state?.type;
  const sprint = state?.sprint;

  useEffect(() => {
    if (!state) return;
    const start = sprint?.startDate?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const fallbackEnd = new Date(new Date(start).getTime() + 13 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    setForm({
      name: sprint?.name || "",
      goal: sprint?.goal || "",
      startDate: start,
      endDate: sprint?.endDate?.slice(0, 10) || fallbackEnd,
      moveOpenToBacklog: true,
      deleteConfirm: "",
    });
  }, [sprint, state]);

  if (!state) return null;

  const titles = {
    create: "Create sprint",
    start: "Start sprint",
    complete: "Complete sprint",
    delete: "Delete sprint",
  };

  function submit(event) {
    event.preventDefault();
    if (type === "delete") {
      if (form.deleteConfirm.trim() !== sprint?.name) return;
      onSubmit({});
      return;
    }
    if (type === "complete") {
      onSubmit({ moveOpenToBacklog: form.moveOpenToBacklog });
      return;
    }
    onSubmit({
      name: form.name.trim() || undefined,
      goal: form.goal.trim(),
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    });
  }

  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{titles[type]}</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          {type === "create" ? (
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Sprint 1" />
            </div>
          ) : null}
          {type === "create" || type === "start" ? (
            <>
              <div className="space-y-2">
                <Label>Goal</Label>
                <Textarea value={form.goal} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))} placeholder="What should this sprint achieve?" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
                </div>
              </div>
            </>
          ) : null}
          {type === "complete" ? (
            <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <input type="checkbox" className="mt-1" checked={form.moveOpenToBacklog} onChange={(event) => setForm((current) => ({ ...current, moveOpenToBacklog: event.target.checked }))} />
              <span>
                <span className="block font-medium">Move unfinished work to backlog</span>
                <span className="text-muted-foreground">Completed tasks stay attached to the sprint report.</span>
              </span>
            </label>
          ) : null}
          {type === "delete" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tasks in this sprint will move back to the backlog.</p>
              <Label>Type {sprint?.name} to confirm</Label>
              <Input value={form.deleteConfirm} onChange={(event) => setForm((current) => ({ ...current, deleteConfirm: event.target.value }))} />
            </div>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant={type === "delete" ? "destructive" : "default"} disabled={pending || (type === "delete" && form.deleteConfirm.trim() !== sprint?.name)}>
              {pending ? "Working..." : titles[type]}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function QuickCreateTask({ members, sprints, defaultStatus = "TODO", defaultSprintId = "", compact = false, onCreate }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [sprintId, setSprintId] = useState(defaultSprintId);

  function submit(event) {
    event.preventDefault();
    if (!title.trim()) return;
    onCreate({ title: title.trim(), status: defaultStatus, priority, assigneeId, dueDate, sprintId });
    setTitle("");
  }

  return (
    <form
      className={cn(
        "grid gap-2 rounded-md border border-dashed bg-background/70 p-2",
        compact ? "grid-cols-1" : "md:grid-cols-[minmax(180px,1fr)_120px_150px_140px_90px_110px_auto]"
      )}
      onSubmit={submit}
    >
      <Input className="h-8" placeholder="Create task" value={title} onChange={(event) => setTitle(event.target.value)} />
      {!compact ? (
        <>
          <select className="h-8 rounded border bg-background px-2 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>
            {PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className="h-8 rounded border bg-background px-2 text-sm" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
            <option value="">Unassigned</option>
            {members.map((member) => <option key={member.userId} value={member.userId}>{member.user?.name || member.user?.email}</option>)}
          </select>
          <select className="h-8 rounded border bg-background px-2 text-sm" value={sprintId} onChange={(event) => setSprintId(event.target.value)}>
            <option value="">Backlog</option>
            {sprints.filter((sprint) => sprint.status !== "COMPLETED").map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
          </select>
          <Input className="h-8" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </>
      ) : null}
      <Button type="submit" className="h-8 rounded px-2.5 text-sm" disabled={!title.trim()}>
        <Plus className="h-4 w-4" />
        Create
      </Button>
    </form>
  );
}

function ListView({ tasks, pagination, onPageChange, activeProject, members, sprints, filters, setFilters, setSelectedTask, canCreate, canAssign, createInlineTask, updateTaskMutation, deleteTaskMutation, refetch }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [sort, setSort] = useState({ field: "updatedAt", direction: "desc" });
  const [creating, setCreating] = useState(false);
  const sortedTasks = tasks.slice().sort((a, b) => {
    const aValue = a[sort.field] || "";
    const bValue = b[sort.field] || "";
    const result = String(aValue).localeCompare(String(bValue));
    return sort.direction === "asc" ? result : -result;
  });

  function changeSort(field) {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  function updateMany(payload) {
    selectedIds.forEach((taskId) => updateTaskMutation.mutate({ taskId, payload }));
    setSelectedIds([]);
  }

  return (
    <div className="space-y-3">
      <TaskFilters filters={filters} setFilters={setFilters} members={members} sprints={sprints} placeholder="Search list" onRefresh={refetch} refreshLabel="Refresh list" />
      {canCreate ? (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold">Work</h2>
          <p className="text-xs text-muted-foreground">Track and update space work items.</p>
          </div>
          <Button className="h-8 rounded px-2.5 text-sm" onClick={() => setCreating((current) => !current)}>
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
      ) : null}
      {creating ? <QuickCreateTask members={members} sprints={sprints} onCreate={(payload) => { createInlineTask(payload); setCreating(false); }} /> : null}
      {selectedIds.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm">
          <span className="font-medium">{selectedIds.length} selected</span>
          <Button variant="outline" className="h-8 rounded px-2.5 text-sm" onClick={() => updateMany({ status: "DONE" })}>Mark done</Button>
          {canAssign ? (
            <select className="h-8 rounded border bg-background px-2 text-sm" onChange={(event) => event.target.value && updateMany({ assigneeId: event.target.value })} defaultValue="">
              <option value="">Assign to...</option>
              {members.map((member) => <option key={member.userId} value={member.userId}>{member.user?.name || member.user?.email}</option>)}
            </select>
          ) : null}
          <Button variant="ghost" className="h-8 rounded px-2.5 text-sm" onClick={() => setSelectedIds([])}>Clear</Button>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2"><input type="checkbox" checked={selectedIds.length === sortedTasks.length && sortedTasks.length > 0} onChange={(event) => setSelectedIds(event.target.checked ? sortedTasks.map((task) => task.id) : [])} /></th>
              {[
                ["title", "Work"],
                ["status", "Status"],
                ["priority", "Priority"],
                ["assignee", "Assignee"],
                ["reporter", "Reporter"],
                ["sprint", "Sprint"],
                ["dueDate", "Due date"],
                ["createdAt", "Created"],
                ["updatedAt", "Updated"],
              ].map(([field, label]) => (
                <th key={field} className="px-3 py-2">
                  <button className="font-semibold" onClick={() => changeSort(field === "assignee" || field === "sprint" || field === "reporter" ? "title" : field)}>{label}</button>
                </th>
              ))}
              <th className="w-12 px-3 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <tr key={task.id} className="cursor-pointer border-t hover:bg-accent/40" onClick={() => setSelectedTask(task)}>
                <td className="px-3 py-2"><input type="checkbox" checked={selectedIds.includes(task.id)} onClick={(event) => event.stopPropagation()} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id))} /></td>
                <td className="px-3 py-2">
                  <div className="text-left">
                    <span className="font-medium hover:text-primary">{task.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{issueKey(activeProject, task)}</span>
                  </div>
                </td>
                <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}><InlineStatus task={task} onUpdate={(payload) => updateTaskMutation.mutate({ taskId: task.id, payload })} /></td>
                <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}><InlinePriority task={task} onUpdate={(payload) => updateTaskMutation.mutate({ taskId: task.id, payload })} /></td>
                <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}><InlineAssignee task={task} members={members} disabled={!canAssign} onUpdate={(payload) => updateTaskMutation.mutate({ taskId: task.id, payload })} /></td>
                <td className="px-3 py-2 text-muted-foreground">{task.createdBy?.name || task.createdBy?.email || "Unknown"}</td>
                <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}><InlineSprint task={task} sprints={sprints} onUpdate={(payload) => updateTaskMutation.mutate({ taskId: task.id, payload })} /></td>
                <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}><Input className="h-8 w-36" type="date" value={task.dueDate?.slice(0, 10) || ""} onChange={(event) => updateTaskMutation.mutate({ taskId: task.id, payload: { dueDate: event.target.value || null } })} /></td>
                <td className="px-3 py-2 text-muted-foreground">{formatDate(task.createdAt)}</td>
                <td className="px-3 py-2 text-muted-foreground">{formatDate(task.updatedAt)}</td>
                <td className="px-3 py-2 text-right" onClick={(event) => event.stopPropagation()}>
                  <TaskActionsMenu task={task} onView={() => setSelectedTask(task)} onDelete={() => deleteTaskMutation.mutate(task.id)} />
                </td>
              </tr>
            ))}
            {!sortedTasks.length ? (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">No tasks match this view.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </div>
  );
}

function TaskFilters({ filters, setFilters, members, sprints = [], placeholder, onRefresh, refreshLabel = "Refresh" }) {
  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <div className="relative w-full min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="h-8 rounded pl-8 text-sm"
          placeholder={placeholder}
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
        />
      </div>
      <select className="h-8 rounded border bg-background px-2.5 text-sm" value={filters.assigneeId} onChange={(event) => setFilters((current) => ({ ...current, assigneeId: event.target.value }))}>
        <option value="">All assignees</option>
        {members.map((member) => <option key={member.userId} value={member.userId}>{member.user?.name || member.user?.email}</option>)}
      </select>
      <select className="h-8 rounded border bg-background px-2.5 text-sm" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
        <option value="">All statuses</option>
        {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
      </select>
      <select className="h-8 rounded border bg-background px-2.5 text-sm" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
        <option value="">All priorities</option>
        {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
      </select>
      <select className="h-8 rounded border bg-background px-2.5 text-sm" value={filters.sprintId || ""} onChange={(event) => setFilters((current) => ({ ...current, sprintId: event.target.value }))}>
        <option value="">All planning</option>
        <option value="backlog">Backlog</option>
        {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
      </select>
      <Button variant="outline" className="h-8 rounded px-2.5 text-sm" onClick={() => setFilters({ search: "", status: "", priority: "", assigneeId: "", sprintId: "" })}>
        <Filter className="h-3.5 w-3.5" />
        Clear
      </Button>
      {onRefresh ? (
        <Button variant="outline" size="icon" className="h-8 w-8 rounded" aria-label={refreshLabel} onClick={onRefresh}>
          <RefreshCcw className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );
}

function InlineStatus({ task, onUpdate }) {
  return (
    <select className="h-8 rounded border bg-background px-2 text-sm" value={task.status} onChange={(event) => onUpdate({ status: event.target.value })}>
      {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
    </select>
  );
}

function InlinePriority({ task, onUpdate }) {
  return (
    <select className={cn("h-8 rounded border bg-background px-2 text-sm font-semibold", PRIORITY_TONES[task.priority])} value={task.priority} onChange={(event) => onUpdate({ priority: event.target.value })}>
      {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
    </select>
  );
}

function InlineAssignee({ task, members, disabled, onUpdate }) {
  return (
    <select className="h-8 rounded border bg-background px-2 text-sm" value={task.assigneeId || ""} disabled={disabled} onChange={(event) => onUpdate({ assigneeId: event.target.value || null })}>
      <option value="">Unassigned</option>
      {members.map((member) => <option key={member.userId} value={member.userId}>{member.user?.name || member.user?.email}</option>)}
    </select>
  );
}

function InlineSprint({ task, sprints, onUpdate }) {
  return (
    <select className="h-8 rounded border bg-background px-2 text-sm" value={task.sprintId || ""} onChange={(event) => onUpdate({ sprintId: event.target.value || null })}>
      <option value="">Backlog</option>
      {sprints.filter((sprint) => sprint.status !== "COMPLETED").map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
    </select>
  );
}

function TaskActionsMenu({ task, onView, onDelete, canDelete = true }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 160;
    const menuHeight = canDelete ? 84 : 44;
    const left = Math.min(Math.max(rect.right - menuWidth, 8), window.innerWidth - menuWidth - 8);
    const opensUp = rect.bottom + menuHeight + 8 > window.innerHeight;
    const top = opensUp ? Math.max(rect.top - menuHeight - 4, 8) : rect.bottom + 4;

    setPosition({ top, left });
  }

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();

    function handlePointerDown(event) {
      if (menuRef.current?.contains(event.target) || triggerRef.current?.contains(event.target)) return;
      setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, canDelete]);

  return (
    <div className="inline-flex">
      <Button ref={triggerRef} variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${task.title}`} onClick={() => setOpen((current) => !current)}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] w-40 rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
          style={{ top: position.top, left: position.left }}
        >
          <button type="button" className="flex w-full items-center rounded px-2 py-1.5 text-left hover:bg-accent" onClick={() => { setOpen(false); onView(); }}>
            View
          </button>
          {canDelete ? (
            <button type="button" className="flex w-full items-center rounded px-2 py-1.5 text-left text-destructive hover:bg-accent" onClick={() => { setOpen(false); onDelete(); }}>
              Delete
            </button>
          ) : null}
        </div>,
        document.body
      ) : null}
    </div>
  );
}

function BacklogSection({
  title,
  sprint,
  count,
  items,
  selectedTaskIds,
  activeProject,
  primaryAction,
  canCreate,
  canAssign,
  canManageSprints,
  onToggleSection,
  onToggleTask,
  onCreate,
  onOpenTask,
  onPrimaryAction,
  onUpdateSprint,
  onUpdateTask,
  onRemoveTask,
  onDeleteSprint,
  onMoveTask,
  actionDisabled,
  actionPending,
}) {
  const statusCounts = {
    todo: items.filter((task) => task.status === "TODO").length,
    progress: items.filter((task) => task.status === "IN_PROGRESS").length,
    done: items.filter((task) => task.status === "DONE").length,
  };
  const allSelected = items.length > 0 && items.every((task) => selectedTaskIds.includes(task.id));

  return (
    <section className="overflow-x-auto rounded-md bg-muted/50">
      <div className="grid min-h-11 min-w-[680px] grid-cols-[26px_18px_minmax(0,1fr)_auto] items-center gap-2 border-b px-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          aria-label={`Select ${title}`}
          checked={allSelected}
          onChange={(event) => onToggleSection(items, event.target.checked)}
        />
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          <span className="shrink-0 text-sm text-muted-foreground">({count} work item{count === 1 ? "" : "s"})</span>
          {sprint && canManageSprints ? (
            <div className="hidden items-center gap-1 text-sm text-muted-foreground sm:inline-flex">
              <CalendarPlus className="h-3.5 w-3.5" />
              <Input
                type="date"
                className="h-7 w-32 rounded px-2 text-xs"
                value={sprint.startDate?.slice(0, 10) || ""}
                onChange={(event) => onUpdateSprint({ startDate: event.target.value, endDate: sprint.endDate?.slice(0, 10) || "" })}
                aria-label={`${title} start date`}
              />
              <Input
                type="date"
                className="h-7 w-32 rounded px-2 text-xs"
                value={sprint.endDate?.slice(0, 10) || ""}
                onChange={(event) => onUpdateSprint({ startDate: sprint.startDate?.slice(0, 10) || "", endDate: event.target.value })}
                aria-label={`${title} end date`}
              />
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <CountPill value={statusCounts.todo} tone="neutral" />
          <CountPill value={statusCounts.progress} tone="blue" />
          <CountPill value={statusCounts.done} tone="green" />
          {canManageSprints ? (
            <Button variant="outline" className="ml-1 h-7 rounded px-2 text-xs" onClick={onPrimaryAction} disabled={actionDisabled || actionPending}>
              {primaryAction}
            </Button>
          ) : null}
          {sprint && canManageSprints ? (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded" aria-label={`Delete ${title}`} onClick={onDeleteSprint}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="min-w-[680px] bg-background">
        {items.length ? (
          items.map((task) => (
            <BacklogRow
              key={task.id}
              task={task}
              activeProject={activeProject}
              selected={selectedTaskIds.includes(task.id)}
              canAssign={canAssign}
              onToggle={() => onToggleTask(task.id)}
              onOpen={() => onOpenTask(task)}
              onUpdate={(payload) => onUpdateTask(task, payload)}
              onRemove={onRemoveTask ? () => onRemoveTask(task) : null}
              onMove={onMoveTask ? (direction) => onMoveTask(task, direction) : null}
            />
          ))
        ) : (
          <div className="grid h-10 grid-cols-[26px_18px_minmax(0,1fr)_360px] items-center gap-2 border-b px-2 text-sm text-muted-foreground">
            <span />
            <span />
            <span>No work items yet</span>
            <span />
          </div>
        )}
      </div>

      {canCreate ? (
        <form
          className="flex h-10 min-w-[680px] items-center gap-2 bg-background px-3"
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem("title");
            const titleValue = input.value.trim();
            if (!titleValue) return;
            onCreate(titleValue);
            input.value = "";
          }}
        >
          <Plus className="h-4 w-4 text-muted-foreground" />
          <input name="title" className="h-8 flex-1 bg-transparent text-sm outline-none" placeholder="Create task" />
          <Button type="submit" variant="ghost" className="h-8 rounded px-2.5 text-sm">Create</Button>
        </form>
      ) : null}
    </section>
  );
}

function BacklogRow({ task, activeProject, selected, onToggle, onOpen, onUpdate, onRemove, onMove }) {
  const priorityTone = {
    LOW: "text-muted-foreground",
    MEDIUM: "text-orange-500",
    HIGH: "text-red-500",
    URGENT: "text-red-600",
  }[task.priority] || "text-muted-foreground";

  return (
    <div
      role="button"
      tabIndex={0}
      className="grid h-10 w-full grid-cols-[26px_18px_minmax(160px,1fr)_120px_92px_74px_70px_34px] items-center gap-2 border-b px-2 text-left text-sm transition-colors hover:bg-accent/45"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-input"
        aria-label={`Select ${task.title}`}
        checked={selected}
        onClick={(event) => event.stopPropagation()}
        onChange={onToggle}
      />
      <ListTodo className="h-4 w-4 text-primary" />
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-muted-foreground">{issueKey(activeProject, task)}</span>
        <span className="truncate font-medium text-foreground">{task.title}</span>
      </div>
      <select
        className="h-7 rounded border bg-background px-1.5 text-xs"
        value={task.status}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onUpdate({ status: event.target.value })}
        aria-label={`Set status for ${task.title}`}
      >
        {STATUSES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <select
        className={cn("h-7 rounded border bg-background px-1.5 text-xs font-semibold", priorityTone)}
        value={task.priority}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => onUpdate({ priority: event.target.value })}
        aria-label={`Set priority for ${task.title}`}
      >
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {priority}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="flex h-6 w-6 items-center justify-center rounded hover:bg-secondary" disabled={!onMove} onClick={() => onMove?.(-1)} aria-label={`Move ${task.title} up`}>
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button type="button" className="flex h-6 w-6 items-center justify-center rounded hover:bg-secondary" disabled={!onMove} onClick={() => onMove?.(1)} aria-label={`Move ${task.title} down`}>
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center justify-end text-muted-foreground">
        <ChevronsUp className={cn("h-4 w-4", priorityTone)} />
      </div>
      <div className="flex justify-end">
        {onRemove ? (
          <button
            type="button"
            className="mr-1 flex h-6 w-6 items-center justify-center rounded hover:bg-secondary"
            aria-label={`Move ${task.title} to backlog`}
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <UserAvatar user={task.assignee} className="h-6 w-6" fallbackClassName="bg-secondary text-[11px] text-muted-foreground" />
      </div>
    </div>
  );
}

function CountPill({ value, tone, label }) {
  const tones = {
    neutral: "bg-secondary text-muted-foreground",
    blue: "bg-primary/20 text-primary",
    green: "bg-green-100 text-green-700",
  };

  return (
    <span className={cn("flex h-5 min-w-6 items-center justify-center rounded px-1.5 text-xs font-medium", tones[tone])} title={label}>
      {value}
    </span>
  );
}

function DocsView({ docs, pagination, onPageChange, docSearch, setDocSearch, canManage, createDocMutation, updateDocMutation, deleteDocMutation, refetch }) {
  const [selectedDocId, setSelectedDocId] = useState("");
  const selectedDoc = docs.find((doc) => doc.id === selectedDocId) || docs[0] || null;
  const [draft, setDraft] = useState({ title: "", content: "" });

  useEffect(() => {
    if (selectedDoc) setDraft({ title: selectedDoc.title, content: selectedDoc.content || "" });
    else setDraft({ title: "", content: "" });
  }, [selectedDoc?.id]);

  function createNewDoc() {
    createDocMutation.mutate({ title: "Untitled document", content: "" }, {
      onSuccess: (result) => {
        if (result?.success) setSelectedDocId(result.data.id);
      },
    });
  }

  function saveDoc() {
    if (!selectedDoc || !draft.title.trim()) return;
    updateDocMutation.mutate({ docId: selectedDoc.id, payload: { title: draft.title.trim(), content: draft.content } });
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-md border">
        <div className="border-b p-2">
          <div className="flex w-full items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="h-8 pl-8" placeholder="Search docs" value={docSearch} onChange={(event) => setDocSearch(event.target.value)} />
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded" aria-label="Refresh docs" onClick={refetch}>
              <RefreshCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
          {canManage ? (
            <Button className="mt-2 h-8 w-full rounded text-sm" onClick={createNewDoc} disabled={createDocMutation.isPending}>
              <Plus className="h-4 w-4" />
              New doc
            </Button>
          ) : null}
        </div>
        <div className="max-h-[520px] overflow-y-auto p-1">
          {docs.map((doc) => (
            <button
              key={doc.id}
              className={cn("block w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-accent", selectedDoc?.id === doc.id && "bg-primary/10 text-primary")}
              onClick={() => setSelectedDocId(doc.id)}
            >
              <span className="block truncate font-medium">{doc.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{doc.createdBy?.name || doc.createdBy?.email || "Space doc"}</span>
            </button>
          ))}
          {!docs.length ? <p className="px-3 py-8 text-center text-sm text-muted-foreground">No documents yet.</p> : null}
        </div>
        <PaginationControls pagination={pagination} onPageChange={onPageChange} className="m-2 border-0 px-1" />
      </aside>
      <section className="rounded-md border bg-background">
        {selectedDoc ? (
          <div className="space-y-3 p-3">
            <div className="flex items-center gap-2">
              <Input className="h-10 text-lg font-semibold" value={draft.title} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
              {canManage ? (
                <>
                  <Button className="h-9 rounded px-3 text-sm" onClick={saveDoc} disabled={updateDocMutation.isPending}>Save</Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => updateDocMutation.mutate({ docId: selectedDoc.id, payload: { pinned: !selectedDoc.pinned } })} aria-label="Pin document">
                    <Check className={cn("h-4 w-4", selectedDoc.pinned && "text-primary")} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => deleteDocMutation.mutate(selectedDoc.id)} aria-label="Delete document">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>
          <Textarea className="min-h-[420px] resize-y" value={draft.content} disabled={!canManage} onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))} placeholder="Write space notes, links, decisions, or specs..." />
          </div>
        ) : (
          <div className="flex min-h-[480px] items-center justify-center text-sm text-muted-foreground">Select or create a document.</div>
        )}
      </section>
    </div>
  );
}

function Metric({ icon: Icon, color, value, caption }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
          <Icon className={cn("h-5 w-5", color)} />
        </span>
        <div>
          <p className="text-lg font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{caption}</p>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, action, children }) {
  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {action ? (
          <Button variant="outline" size="icon">
            <ExternalLink className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function buildDonut(tasks) {
  if (!tasks.length) {
    return "conic-gradient(#e5e7eb 0 100%)";
  }
  let cursor = 0;
  const parts = STATUSES.map((status) => {
    const count = countByStatus(tasks, status.value);
    const size = (count / tasks.length) * 100;
    const start = cursor;
    cursor += size;
    return `${status.color} ${start}% ${cursor}%`;
  });
  return `conic-gradient(${parts.join(", ")})`;
}

function IssueCreateDialog({ open, setOpen, taskForm, setTaskForm, members, sprints, canAssign, submitTask, pending }) {
  const planningSprints = sprints.filter((sprint) => sprint.status !== "COMPLETED");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create issue</DialogTitle>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submitTask}>
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input id="task-title" value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-description">Description</Label>
            <Textarea id="task-description" value={taskForm.description} onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <SelectField label="Status" value={taskForm.status} onChange={(value) => setTaskForm((current) => ({ ...current, status: value }))} options={STATUSES.map((item) => [item.value, item.label])} />
            <SelectField label="Priority" value={taskForm.priority} onChange={(value) => setTaskForm((current) => ({ ...current, priority: value }))} options={PRIORITIES.map((item) => [item, item])} />
            <div className="space-y-2">
              <Label>Sprint</Label>
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={taskForm.sprintId} onChange={(event) => setTaskForm((current) => ({ ...current, sprintId: event.target.value }))}>
                <option value="">Backlog</option>
                {planningSprints.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={taskForm.assigneeId} disabled={!canAssign} onChange={(event) => setTaskForm((current) => ({ ...current, assigneeId: event.target.value }))}>
                <option value="">Unassigned</option>
                {members.map((member) => <option key={member.userId} value={member.userId}>{member.user?.name || member.user?.email}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </div>
          </div>
          <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create issue"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function WorkItemView({
  task,
  activeProject,
  members,
  canAssign,
  canDelete,
  canComment,
  sprints,
  comments,
  comment,
  setComment,
  updateSelected,
  deleteMutation,
  commentMutation,
  addTaskLinkMutation,
  deleteTaskLinkMutation,
  projectTasks = [],
  projectDocs = [],
  createDocMutation,
  setSelectedTask,
  standalone = false,
  compact = false,
}) {
  const planningSprints = sprints.filter((sprint) => sprint.status !== "COMPLETED");
  const taskUrl = `/spaces/${task.projectId}/tasks/${task.id}`;
  const reporter = task.createdBy;
  const [linkedTaskId, setLinkedTaskId] = useState("");
  const [quickDocTitle, setQuickDocTitle] = useState("");
  const linkedItems = [
    ...(task.linkedFrom || []).map((link) => ({ ...link, linkedTask: link.targetTask, direction: "relates to" })),
    ...(task.linkedTo || []).map((link) => ({ ...link, linkedTask: link.sourceTask, direction: "is related by" })),
  ];
  const linkOptions = projectTasks.filter((item) => item.id !== task.id && !linkedItems.some((link) => link.linkedTask?.id === item.id));

  const detailCard = (
    <section id="work-item-details" className="rounded-md border bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">Details</h2>
      </div>
      <div className="space-y-4 p-4 text-sm">
        <DetailRow label="Assignee">
          <select className="h-8 w-full rounded border bg-background px-2" value={task.assigneeId || ""} disabled={!canAssign} onChange={(event) => updateSelected("assigneeId", event.target.value)}>
            <option value="">Unassigned</option>
            {members.map((member) => <option key={member.userId} value={member.userId}>{member.user?.name || member.user?.email}</option>)}
          </select>
        </DetailRow>
        <DetailRow label="Priority">
          <SelectField label="" value={task.priority} onChange={(value) => updateSelected("priority", value)} options={PRIORITIES.map((item) => [item, item])} />
        </DetailRow>
        <DetailRow label="Parent">None</DetailRow>
        <DetailRow label="Due date">
          <Input type="date" value={task.dueDate?.slice(0, 10) || ""} onChange={(event) => updateSelected("dueDate", event.target.value)} />
        </DetailRow>
        <DetailRow label="Team">None</DetailRow>
        <DetailRow label="Start date">None</DetailRow>
        <DetailRow label="Sprint">
          <select className="h-8 w-full rounded border bg-background px-2" value={task.sprintId || ""} onChange={(event) => updateSelected("sprintId", event.target.value)}>
            <option value="">None</option>
            {planningSprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
          </select>
        </DetailRow>
        <DetailRow label="Reporter">
          <span className="inline-flex items-center gap-2">
            <UserAvatar user={reporter} className="h-6 w-6" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
            {reporter?.name || reporter?.email || "Unknown"}
          </span>
        </DetailRow>
      </div>
    </section>
  );

  return (
    <div className={cn("grid min-h-[70vh] gap-6", compact ? "md:grid-cols-[220px_minmax(0,1fr)]" : standalone ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "lg:grid-cols-[minmax(0,1fr)_320px]")}>
      {compact ? (
        <aside className="space-y-4 border-b pb-4 md:sticky md:top-0 md:self-start md:border-b-0 md:border-r md:pb-0 md:pr-4">
          <div className="space-y-3 rounded-md border bg-muted/25 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>{issueKey(activeProject || task.project, task)}</span>
            </div>
            <p className="line-clamp-3 text-sm font-semibold">{task.title}</p>
            <SelectField label="" value={task.status} onChange={(value) => updateSelected("status", value)} options={STATUSES.map((item) => [item.value, item.label])} />
          </div>
          <div className="space-y-2 text-sm">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Summary</p>
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Assignee</span>
                <span className="truncate font-medium">{task.assignee?.name || task.assignee?.email || "Unassigned"}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Priority</span>
                <span className={cn("font-medium", PRIORITY_TONES[task.priority])}>{task.priority}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Sprint</span>
                <span className="truncate font-medium">{task.sprint?.name || "None"}</span>
              </div>
            </div>
          </div>
          <nav className="space-y-1 text-sm">
            <p className="px-2 text-xs font-semibold uppercase text-muted-foreground">Navigate</p>
            {[
              ["Description", "#work-item-description"],
              ["Linked work", "#work-item-links"],
              ["Documents", "#work-item-docs"],
              ["Details", "#work-item-details"],
              ["Activity", "#work-item-activity"],
            ].map(([label, href]) => (
              <a key={href} className="block rounded px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" href={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="space-y-1 px-2 text-xs text-muted-foreground">
            <p>Created {relativeDate(task.createdAt)}</p>
            <p>Updated {relativeDate(task.updatedAt)}</p>
          </div>
        </aside>
      ) : null}

      <section className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Spaces</span>
          <span>/</span>
        <span>{activeProject?.name || task.project?.name || "Space"}</span>
          <span>/</span>
          <span className="font-medium text-foreground">{issueKey(activeProject || task.project, task)}</span>
        </div>

        <div className="flex items-start justify-between gap-3">
          <Input
            className="h-auto border-0 px-0 text-2xl font-bold shadow-none focus-visible:ring-0"
            value={task.title}
            onChange={(event) => setSelectedTask((current) => ({ ...current, title: event.target.value }))}
            onBlur={(event) => updateSelected("title", event.target.value)}
          />
          {!standalone ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button asChild variant="outline" size="icon" className="h-8 w-8" aria-label="Open in new tab">
                <a href={taskUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <TaskActionsMenu task={task} canDelete={canDelete} onView={() => window.open(taskUrl, "_blank", "noopener,noreferrer")} onDelete={() => deleteMutation.mutate(task.id)} />
            </div>
          ) : null}
        </div>

        <section id="work-item-description" className="space-y-2">
          <h2 className="text-sm font-semibold">Description</h2>
          <Textarea
            className="min-h-28 resize-y border-0 bg-muted/35 p-3 shadow-none focus-visible:ring-1"
            placeholder="Add a description..."
            value={task.description || ""}
            onChange={(event) => setSelectedTask((current) => ({ ...current, description: event.target.value }))}
            onBlur={(event) => updateSelected("description", event.target.value)}
          />
        </section>

        <section id="work-item-links" className="space-y-2">
          <h2 className="text-sm font-semibold">Linked work items</h2>
          <div className="flex gap-2">
            <select className="h-9 flex-1 rounded border bg-background px-2 text-sm" value={linkedTaskId} onChange={(event) => setLinkedTaskId(event.target.value)}>
              <option value="">Select work item to link...</option>
              {linkOptions.map((item) => (
                <option key={item.id} value={item.id}>{issueKey(activeProject, item)} {item.title}</option>
              ))}
            </select>
            <Button
              className="h-9 rounded px-3 text-sm"
              disabled={!linkedTaskId || addTaskLinkMutation?.isPending}
              onClick={() => {
                addTaskLinkMutation?.mutate({ taskId: task.id, targetTaskId: linkedTaskId });
                setLinkedTaskId("");
              }}
            >
              Link
            </Button>
          </div>
          <div className="overflow-hidden rounded-md border">
            {linkedItems.length ? linkedItems.map((link) => (
              <div key={link.id} className="flex items-center justify-between gap-3 border-b px-3 py-2 text-sm last:border-b-0">
                <button className="min-w-0 text-left hover:text-primary" onClick={() => setSelectedTask(link.linkedTask)}>
                  <span className="mr-2 text-xs text-muted-foreground">{link.direction}</span>
                  <span className="font-medium">{issueKey(activeProject, link.linkedTask)}</span>
                  <span className="ml-2">{link.linkedTask?.title}</span>
                </button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled={deleteTaskLinkMutation?.isPending} onClick={() => deleteTaskLinkMutation?.mutate({ taskId: task.id, linkId: link.id })} aria-label="Remove linked work item">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )) : (
              <p className="px-3 py-3 text-sm text-muted-foreground">No linked work items yet.</p>
            )}
          </div>
        </section>

        <section id="work-item-docs" className="space-y-2">
          <h2 className="text-sm font-semibold">Space documents</h2>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!quickDocTitle.trim()) return;
              createDocMutation?.mutate({ title: quickDocTitle.trim(), content: "" });
              setQuickDocTitle("");
            }}
          >
            <Input className="h-9" placeholder="Create space document" value={quickDocTitle} onChange={(event) => setQuickDocTitle(event.target.value)} />
            <Button className="h-9 rounded px-3 text-sm" disabled={!quickDocTitle.trim() || createDocMutation?.isPending}>Create</Button>
          </form>
          <div className="overflow-hidden rounded-md border">
            {projectDocs.length ? projectDocs.map((doc) => (
              <a key={doc.id} className="block border-b px-3 py-2 text-sm hover:bg-accent last:border-b-0" href={`/spaces/${task.projectId}/tasks?view=docs`}>
                <FileText className="mr-2 inline h-4 w-4 text-primary" />
                {doc.title}
              </a>
            )) : (
              <p className="px-3 py-3 text-sm text-muted-foreground">No space documents yet.</p>
            )}
          </div>
        </section>

        {compact ? detailCard : null}

        <section id="work-item-activity" className="space-y-3">
          <h2 className="text-sm font-semibold">Activity</h2>
          <div className="flex gap-1">
            {["All", "Comments", "History", "Work log"].map((tab) => (
              <Button key={tab} variant={tab === "Comments" ? "outline" : "ghost"} className="h-8 rounded px-3 text-sm">
                {tab}
              </Button>
            ))}
          </div>
          <div className="flex gap-3">
            <UserAvatar user={reporter} className="h-8 w-8" fallbackClassName="bg-primary text-primary-foreground" />
            <div className="flex-1 space-y-2">
              <Input placeholder="Add a comment..." value={comment} onChange={(event) => setComment(event.target.value)} disabled={!canComment} />
              <div className="flex flex-wrap gap-2">
                {["Who is working on this...?", "Can I get more info...?", "Status update..."].map((prompt) => (
                  <Button key={prompt} variant="outline" className="h-7 rounded px-2 text-xs" onClick={() => setComment(prompt)}>
                    {prompt}
                  </Button>
                ))}
                <Button className="h-7 rounded px-2 text-xs" disabled={!comment.trim() || !canComment || commentMutation.isPending} onClick={() => commentMutation.mutate()}>
                  Comment
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {comments.map((item) => (
              <div key={item.id} className="rounded-md border p-3 text-sm">
                <p>{item.content}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <UserAvatar user={item.user} className="h-6 w-6" />
                  <span>{item.user?.name || item.user?.email}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      {!compact ? (
      <aside className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <SelectField label="" value={task.status} onChange={(value) => updateSelected("status", value)} options={STATUSES.map((item) => [item.value, item.label])} />
        </div>
        {detailCard}
        <div className="space-y-1 px-2 text-xs text-muted-foreground">
          <p>Created {relativeDate(task.createdAt)}</p>
          <p>Updated {relativeDate(task.updatedAt)}</p>
        </div>
      </aside>
      ) : null}
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-3">
      <span className="text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function IssueDetailDialog({
  selectedTask,
  setSelectedTask,
  activeProject,
  projectId,
  members,
  canAssign,
  canDelete,
  canComment,
  sprints,
  comments,
  comment,
  setComment,
  updateSelected,
  deleteMutation,
  commentMutation,
  addTaskLinkMutation,
  deleteTaskLinkMutation,
  projectTasks = [],
  projectDocs = [],
  createDocMutation,
}) {
  const detailQuery = useQuery({
    queryKey: ["task-detail", projectId, selectedTask?.id],
    queryFn: () => getTask(projectId, selectedTask.id),
    enabled: Boolean(projectId && selectedTask?.id),
  });
  const task = detailQuery.data?.data || selectedTask;

  useEffect(() => {
    if (!selectedTask) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setSelectedTask(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedTask, setSelectedTask]);

  if (!selectedTask) return null;

  return (
    <aside
      className="fixed bottom-0 right-0 top-14 z-40 flex w-full flex-col border-l bg-background shadow-2xl sm:w-[82vw] lg:w-[var(--task-detail-width)]"
      style={{ "--task-detail-width": TASK_DETAIL_PANEL_WIDTH }}
      aria-label="Jira work item"
    >
        <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" />
            Jira work item
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close work item" onClick={() => setSelectedTask(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {task ? (
            <WorkItemView
              task={task}
              activeProject={activeProject}
              members={members}
              canAssign={canAssign}
              canDelete={canDelete}
              canComment={canComment}
              sprints={sprints}
              comments={comments}
              comment={comment}
              setComment={setComment}
              updateSelected={updateSelected}
              deleteMutation={deleteMutation}
              commentMutation={commentMutation}
              addTaskLinkMutation={addTaskLinkMutation}
              deleteTaskLinkMutation={deleteTaskLinkMutation}
              projectTasks={projectTasks}
              projectDocs={projectDocs}
              createDocMutation={createDocMutation}
              setSelectedTask={setSelectedTask}
              compact
            />
          ) : null}
        </div>
    </aside>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  );
}
