import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  CalendarPlus,
  CalendarRange,
  Clock3,
  TimerReset,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  ExternalLink,
  Filter,
  Globe2,
  GripVertical,
  LayoutGrid,
  List,
  ListTodo,
  MessageSquare,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_SIZE, PaginationControls } from "@/components/ui/pagination";
import { Textarea } from "@/components/ui/textarea";
import { createComment, getTaskComments } from "@/lib/comment-api";
import { useApiAction, useApiResource } from "@/lib/api-hooks";
import { getProject, getProjects } from "@/lib/project-api";
import { LEGACY_STORAGE_KEYS, migrateStorageKey, STORAGE_KEYS } from "@/lib/storage-keys";
import {
  addTasksToSprint,
  completeSprint,
  createSprint,
  deleteSprint,
  getProjectSprintTasks,
  getProjectSprints,
  removeTaskFromSprint,
  reorderSprintTasks,
  startSprint,
  updateSprint,
} from "@/lib/sprint-api";
import { createTask, deleteTask, getProjectBacklogTasks, getProjectBoardTasks, getProjectListTasks, getProjectTaskSummary, getProjectTaskWorkload, getProjectTimeline, getTask, updateTask } from "@/lib/task-api";
import { useAuth } from "@/contexts/auth-context";
import { useProjectMembers } from "@/contexts/project-members-context";
import { ISSUE_STATUSES, ISSUE_TYPES, issueStatusLabel, makeIssueStatus, mergeIssueStatuses } from "@/lib/issue-constants";
import { cn } from "@/lib/utils";

const IssueStatusesContext = createContext({
  statuses: ISSUE_STATUSES,
  addStatus: () => null,
});

const CUSTOM_STATUS_STORAGE_PREFIX = "zuzuplan.issue-statuses.";

function statusStorageKey(projectId) {
  return `${CUSTOM_STATUS_STORAGE_PREFIX}${projectId || "global"}`;
}

function readCustomStatuses(projectId) {
  if (typeof window === "undefined" || !projectId) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(statusStorageKey(projectId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter((status) => status?.value && status?.label) : [];
  } catch {
    return [];
  }
}

function writeCustomStatuses(projectId, statuses) {
  if (typeof window === "undefined" || !projectId) return;
  window.localStorage.setItem(statusStorageKey(projectId), JSON.stringify(statuses));
}

function useProjectIssueStatuses(projectId) {
  const [customStatuses, setCustomStatuses] = useState(() => readCustomStatuses(projectId));

  useEffect(() => {
    setCustomStatuses(readCustomStatuses(projectId));
  }, [projectId]);

  const statuses = useMemo(() => mergeIssueStatuses(customStatuses), [customStatuses]);

  function addStatus(label) {
    const nextStatus = makeIssueStatus(label, statuses);
    if (!nextStatus || !projectId) return null;
    const nextCustomStatuses = [...customStatuses, nextStatus];
    setCustomStatuses(nextCustomStatuses);
    writeCustomStatuses(projectId, nextCustomStatuses);
    return nextStatus;
  }

  return { statuses, addStatus };
}

function useIssueStatuses() {
  return useContext(IssueStatusesContext);
}

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const BACKLOG_LIMIT = 100;
const STATUS_BUCKETS = {
  todo: ["TODO"],
  progress: ["IN_PROGRESS", "IN_REVIEW"],
  done: ["DONE"],
  attention: [],
};
const PRIORITY_TONES = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-orange-500",
  HIGH: "text-red-500",
  URGENT: "text-red-600",
};
const PRIORITY_OPTION_COLORS = {
  LOW: "#94a3b8",
  MEDIUM: "#f97316",
  HIGH: "#ef4444",
  URGENT: "#dc2626",
};

const PROJECT_TABS = [
  { value: "summary", label: "Summary", icon: Globe2 },
  { value: "backlog", label: "Backlog", icon: ListTodo },
  { value: "list", label: "List", icon: List },
  { value: "board", label: "Board", icon: LayoutGrid },
  { value: "timeline", label: "Timeline", icon: CalendarRange },
];
const TASK_DETAIL_PANEL_WIDTH = "clamp(560px, 42vw, 720px)";
const ISSUE_CONTENT_CLASS = "w-full px-3 sm:px-4 lg:px-5";
const CURRENT_PROJECT_KEY = STORAGE_KEYS.currentProjectId;
const CURRENT_PROJECT_CHANGE_EVENT = "current-project-change";

const emptyTask = {
  title: "",
  description: "",
  status: "TODO",
  type: "FEATURE",
  estimate: "",
  branchName: "",
  blockedReason: "",
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
  return `${project?.key || "SPC"}-${task.id.slice(-4).toUpperCase()}`;
}

function relativeDate(date) {
  if (!date) return "None";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function openTaskFromKeyboard(event, onOpen) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onOpen();
  }
}

function isRowControlTarget(target) {
  return Boolean(target?.closest?.("button,input,select,textarea,a,[role='button'],[data-row-control='true']"));
}

function getPlannedOrActiveSprints(sprints) {
  return sprints
    .filter((sprint) => sprint.status !== "COMPLETED")
    .slice()
    .sort((a, b) => {
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
      return new Date(a.startDate || a.createdAt || 0).getTime() - new Date(b.startDate || b.createdAt || 0).getTime();
    });
}

function getMoveScopeOptions(sprints) {
  return [
    { value: "backlog", label: "Backlog" },
    ...getPlannedOrActiveSprints(sprints).map((sprint) => ({ value: sprint.id, label: sprint.name })),
  ];
}

export default function Tasks() {
  const { user } = useAuth();
  const { projectId: routeProjectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(() => routeProjectId || migrateStorageKey(LEGACY_STORAGE_KEYS.currentProjectId, CURRENT_PROJECT_KEY) || "");
  const requestedView = searchParams.get("view");
  const initialView = PROJECT_TABS.some((tab) => tab.value === requestedView) ? requestedView : "summary";
  const [activeView, setActiveView] = useState(initialView);
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", assigneeId: "", sprintId: "" });
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [taskForm, setTaskForm] = useState(emptyTask);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [taskPage, setTaskPage] = useState(1);
  const [timelineSprintDialog, setTimelineSprintDialog] = useState(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const [commentsVersion, setCommentsVersion] = useState(0);
  const issueStatusState = useProjectIssueStatuses(projectId);

  function setSelectedTask(taskOrId) {
    if (!taskOrId) {
      setSelectedTaskId("");
      return;
    }
    setSelectedTaskId(typeof taskOrId === "string" ? taskOrId : taskOrId.id);
  }

  const projectsQuery = useApiResource(() => getProjects({ fields: "switcher", limit: PAGE_SIZE }), [projectId], {
    enabled: !projectId,
    refreshEvents: ["projects"],
  });
  const projects = projectsQuery.data?.data || [];
  const needsSprints = ["board", "list", "backlog"].includes(activeView) || createOpen || Boolean(selectedTaskId);

  useEffect(() => {
    if (!projectId && projects[0]?.id) {
      localStorage.setItem(CURRENT_PROJECT_KEY, projects[0].id);
      setProjectId(projects[0].id);
      window.dispatchEvent(new CustomEvent(CURRENT_PROJECT_CHANGE_EVENT, { detail: projects[0].id }));
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
    const resolvedView = PROJECT_TABS.some((tab) => tab.value === nextView) ? nextView : "summary";
    if (resolvedView !== activeView) {
      setActiveView(resolvedView);
    }
  }, [activeView, searchParams]);

  const projectQuery = useApiResource(() => getProject(projectId, { fields: "planning" }), [projectId], { enabled: Boolean(projectId) });

  const tasksQuery = useApiResource(() => getProjectListTasks(projectId, { ...filters, page: taskPage, limit: PAGE_SIZE }), [
    projectId,
    filters,
    taskPage,
    activeView,
  ], { enabled: Boolean(projectId && activeView === "list") });

  const taskSummaryQuery = useApiResource(() => getProjectTaskSummary(projectId), [projectId, activeView], {
    enabled: Boolean(projectId && activeView === "summary"),
  });
  const taskWorkloadQuery = useApiResource(() => getProjectTaskWorkload(projectId), [projectId, activeView], {
    enabled: Boolean(projectId && activeView === "summary"),
  });

  const backlogTasksQuery = useApiResource(() => getProjectBacklogTasks(projectId, filters), [
    projectId,
    filters,
    activeView,
  ], { enabled: Boolean(projectId && activeView === "backlog") });

  const sprintsQuery = useApiResource(() => getProjectSprints(projectId), [projectId, needsSprints], {
    enabled: Boolean(projectId && needsSprints),
  });

  const { members } = useProjectMembers(projectId);
  const tasks = tasksQuery.data?.data || [];
  const tasksPagination = tasksQuery.data?.pagination;
  const backlogTasks = backlogTasksQuery.data?.data || [];
  const sprints = sprintsQuery.data?.data || [];
  const boardTasksQuery = useApiResource(() => getProjectBoardTasks(projectId, { ...filters, page: 1, limit: BACKLOG_LIMIT }), [
    projectId,
    filters,
    activeView,
  ], { enabled: Boolean(projectId && activeView === "board") });
  const boardTasks = boardTasksQuery.data?.data || [];
  const taskSummary = taskSummaryQuery.data?.data;
  const taskWorkload = taskWorkloadQuery.data?.data;
  const activeProject = projectQuery.data?.data;
  const currentPermissions = activeProject?.currentUserPermissions || [];

  const canCreate = currentPermissions.includes("task.create");
  const canAssign = currentPermissions.includes("task.assign");
  const canDelete = currentPermissions.includes("task.delete");
  const canComment = currentPermissions.includes("comment.create");
  const canManageSprints = currentPermissions.includes("task.update.any");

  useEffect(() => {
    setTaskPage(1);
  }, [activeView, filters, projectId]);

  const createMutation = useApiAction((payload) => createTask(projectId, payload), {
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

  const updateMutation = useApiAction(({ taskId, payload }) => updateTask(projectId, taskId, payload), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not update issue."));
        return;
      }
      setError("");
      if (result.data?.id) {
        setDetailVersion((current) => current + 1);
      }
      refreshPlanningData();
    },
  });

  const deleteMutation = useApiAction((taskId) => deleteTask(projectId, taskId), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not delete issue."));
        return;
      }
      setSelectedTaskId("");
      setError("");
      refreshPlanningData();
    },
  });

  const commentMutation = useApiAction(() => createComment(selectedTaskId, comment), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not add comment."));
        return;
      }
      setComment("");
      setError("");
      setCommentsVersion((current) => current + 1);
    },
  });

  function refreshPlanningData() {
    projectQuery.reload();
    if (activeView === "list") tasksQuery.reload();
    if (activeView === "board") boardTasksQuery.reload();
    if (activeView === "backlog") backlogTasksQuery.reload();
    if (activeView === "summary") {
      taskSummaryQuery.reload();
      taskWorkloadQuery.reload();
    }
    if (needsSprints) sprintsQuery.reload();
  }

  const createSprintMutation = useApiAction((payload) => createSprint(projectId, payload), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not create sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const updateSprintMutation = useApiAction(({ sprintId, payload }) => updateSprint(projectId, sprintId, payload), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not update sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const startSprintMutation = useApiAction(({ sprintId, payload }) => startSprint(projectId, sprintId, payload), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not start sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const completeSprintMutation = useApiAction(({ sprintId, payload }) => completeSprint(projectId, sprintId, payload), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not complete sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const deleteSprintMutation = useApiAction(({ sprintId }) => deleteSprint(projectId, sprintId), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not delete sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const reorderSprintTasksMutation = useApiAction(({ sprintId, orderedTaskIds }) => reorderSprintTasks(projectId, sprintId, orderedTaskIds), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not reorder issues."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const addTasksToSprintMutation = useApiAction(({ sprintId, taskIds }) => addTasksToSprint(projectId, sprintId, taskIds), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not move issues to sprint."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  const removeTaskFromSprintMutation = useApiAction(({ sprintId, taskId }) => removeTaskFromSprint(projectId, sprintId, taskId), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not move issue to backlog."));
        return;
      }
      setError("");
      refreshPlanningData();
    },
  });

  function changeView(nextView) {
    setActiveView(nextView);
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      if (nextView === "summary") {
        params.delete("view");
      } else {
        params.set("view", nextView);
      }
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
    if (!selectedTaskId) return Promise.resolve({ success: false });
    return updateMutation
      .mutateAsync({ taskId: selectedTaskId, payload: { [field]: value === "" ? null : value } })
      .catch((error) => {
        setError(error?.message || "Could not update issue.");
        return { success: false };
      });
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

  const detailPresentation = activeView === "backlog" ? "panel" : "modal";
  const taskDetailPanelOpen = detailPresentation === "panel" && Boolean(selectedTaskId);

  return (
    <IssueStatusesContext.Provider value={issueStatusState}>
    <div className="min-h-[calc(100vh-3rem)] bg-background">
      <div
        className={cn("min-w-0 transition-[margin-right] duration-200 ease-out", taskDetailPanelOpen && "lg:mr-[var(--task-detail-width)]")}
        style={{ "--task-detail-width": TASK_DETAIL_PANEL_WIDTH }}
      >
        <ProjectHeader
          activeView={activeView}
          setActiveView={changeView}
        />

        <div className={cn(ISSUE_CONTENT_CLASS, "space-y-3 pb-3 pt-2")}>
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {activeView === "summary" ? (
            <SummaryView
              summary={taskSummary}
              workload={taskWorkload}
              loading={taskSummaryQuery.isLoading}
              workloadLoading={taskWorkloadQuery.isLoading}
            />
          ) : null}

          {activeView === "board" ? (
          <BoardView
            tasks={boardTasks}
            activeProject={activeProject}
            members={members}
            sprints={sprints}
            filters={filters}
            setFilters={setFilters}
            setSelectedTask={setSelectedTask}
            moveTask={moveTask}
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
              addTasksToSprintMutation={addTasksToSprintMutation}
              removeTaskFromSprintMutation={removeTaskFromSprintMutation}
            />
          ) : null}

          {activeView === "backlog" ? (
            <BacklogView
              tasks={backlogTasks}
              loading={backlogTasksQuery.isLoading}
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
              deleteTaskMutation={deleteMutation}
              reorderSprintTasksMutation={reorderSprintTasksMutation}
              addTasksToSprintMutation={addTasksToSprintMutation}
              removeTaskFromSprintMutation={removeTaskFromSprintMutation}
            />
          ) : null}

          {activeView === "timeline" ? (
            <TimelineView
              projectId={projectId}
              active={activeView === "timeline"}
              activeProject={activeProject}
              members={members}
              currentUser={user}
              setSelectedTask={setSelectedTask}
              onEditSprint={(sprint) => setTimelineSprintDialog({ type: "edit", sprint })}
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
        selectedTaskId={selectedTaskId}
        setSelectedTask={setSelectedTask}
        activeProject={activeProject}
        projectId={projectId}
        members={members}
        canAssign={canAssign}
              canDelete={canDelete}
              canComment={canComment}
              sprints={sprints}
              comment={comment}
              setComment={setComment}
        updateSelected={updateSelected}
        deleteMutation={deleteMutation}
        commentMutation={commentMutation}
        detailVersion={detailVersion}
        commentsVersion={commentsVersion}
        presentation={detailPresentation}
      />

      <SprintDialog
        state={timelineSprintDialog}
        onClose={() => setTimelineSprintDialog(null)}
        onSubmit={(payload) => {
          if (!timelineSprintDialog?.sprint) return;
          updateSprintMutation.mutate(
            { sprintId: timelineSprintDialog.sprint.id, payload },
            { onSuccess: (result) => result?.success && setTimelineSprintDialog(null) }
          );
        }}
        pending={updateSprintMutation.isPending}
      />
    </div>
    </IssueStatusesContext.Provider>
  );
}

export function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [commentsVersion, setCommentsVersion] = useState(0);
  const issueStatusState = useProjectIssueStatuses(projectId);

  const projectQuery = useApiResource(() => getProject(projectId, { fields: "planning" }), [projectId], { enabled: Boolean(projectId) });
  const sprintsQuery = useApiResource(() => getProjectSprints(projectId), [projectId], { enabled: Boolean(projectId) });
  const taskQuery = useApiResource(() => getTask(projectId, taskId), [projectId, taskId], {
    enabled: Boolean(projectId && taskId),
  });
  const activeProject = projectQuery.data?.data;
  const task = taskQuery.data?.data;
  const taskErrorMessage = taskQuery.data?.error?.message || taskQuery.error?.message || "";
  const { members } = useProjectMembers(projectId);
  const sprints = sprintsQuery.data?.data || [];
  const permissions = activeProject?.currentUserPermissions || [];
  const canAssign = permissions.includes("task.assign");
  const canDelete = permissions.includes("task.delete");
  const canComment = permissions.includes("comment.create");

  const updateMutation = useApiAction(({ payload }) => updateTask(projectId, taskId, payload), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not update issue."));
        return;
      }
      setError("");
      taskQuery.reload();
      projectQuery.reload();
    },
  });

  const deleteMutation = useApiAction(() => deleteTask(projectId, taskId), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not delete issue."));
        return;
      }
      navigate(`/spaces/${projectId}/issues?view=list`);
    },
  });

  const commentMutation = useApiAction(() => createComment(taskId, comment), {
    onSuccess: (result) => {
      if (!result?.success) {
        setError(resultMessage(result, "Could not add comment."));
        return;
      }
      setComment("");
      setError("");
      setCommentsVersion((current) => current + 1);
    },
  });

  function updateSelected(field, value) {
    return updateMutation
      .mutateAsync({ payload: { [field]: value === "" ? null : value } })
      .catch((error) => {
        setError(error?.message || "Could not update issue.");
        return { success: false };
      });
  }

  if (taskQuery.isLoading) {
    return (
      <IssueStatusesContext.Provider value={issueStatusState}>
      <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Work Item</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review details, links, activity, and ownership for this task.</p>
        </div>
        <p className="rounded-md border p-6 text-sm text-muted-foreground">Loading issue...</p>
      </div>
      </IssueStatusesContext.Provider>
    );
  }

  if (!task) {
    return (
      <IssueStatusesContext.Provider value={issueStatusState}>
      <div className="space-y-3 px-3 py-3 sm:px-4 lg:px-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Work Item</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review details, links, activity, and ownership for this task.</p>
        </div>
        <div className="rounded-md border p-6 text-sm text-muted-foreground">
          <p>{taskErrorMessage || "Work item not found."}</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate(`/spaces/${projectId}/issues?view=list`)}>
            Back to issues
          </Button>
        </div>
      </div>
      </IssueStatusesContext.Provider>
    );
  }

  return (
    <IssueStatusesContext.Provider value={issueStatusState}>
    <div className="min-h-[calc(100vh-3rem)] bg-background px-3 py-3 sm:px-4 lg:px-5">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Work Item</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review details, links, activity, and ownership for this task.</p>
      </div>
      {error ? (
        <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      ) : null}
      <WorkItemView
        task={task}
        activeProject={activeProject}
        members={members}
        canAssign={canAssign}
        canDelete={canDelete}
        canComment={canComment}
        sprints={sprints}
        comment={comment}
        commentsVersion={commentsVersion}
        setComment={setComment}
        updateSelected={updateSelected}
        deleteMutation={deleteMutation}
        commentMutation={commentMutation}
        setSelectedTask={(nextTask) => {
          if (nextTask?.id) navigate(`/spaces/${projectId}/issues/${nextTask.id}`);
        }}
        standalone
      />
    </div>
    </IssueStatusesContext.Provider>
  );
}

function ProjectHeader({ activeView, setActiveView }) {
  return (
    <div className="sticky top-14 z-20 border-b bg-background/95 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/90">
      <div className={ISSUE_CONTENT_CLASS}>
        <div className="pb-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Issues</h1>
          <p className="mt-1 text-sm text-muted-foreground">Plan backlog work, track sprint progress, and review delivery status.</p>
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
                    "flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/45 hover:text-foreground"
                  )}
                  onClick={() => setActiveView(tab.value)}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
          </div>

        </div>
      </div>
    </div>
  );
}

function SummaryView({ summary, workload, loading, workloadLoading }) {
  const { statuses } = useIssueStatuses();
  const data = summary || EMPTY_TASK_SUMMARY;
  const workloadData = workload || EMPTY_TASK_WORKLOAD;
  const recent = data.recent || EMPTY_TASK_SUMMARY.recent;
  const statusItems = statuses.map((status) => ({
    value: status.value,
    label: status.label,
    count: data.statusCounts?.[status.value] || 0,
    color: SUMMARY_STATUS_COLORS[status.value] || status.color,
  }));
  const priorityItems = PRIORITIES.map((priority) => ({
    value: priority,
    label: priorityLabel(priority),
    count: data.priorityCounts?.[priority] || 0,
    color: SUMMARY_PRIORITY_COLORS[priority],
  }));
  const typeItems = ISSUE_TYPES.map((type) => ({
    value: type,
    label: formatIssueType(type),
    count: data.typeCounts?.[type] || 0,
    color: SUMMARY_TYPE_COLORS[type],
  }));

  return (
    <div className="space-y-4 pb-6">
      {loading && !summary ? (
        <div className="rounded-md border bg-card p-4 text-sm text-muted-foreground">Loading delivery summary...</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SummaryStatCard icon={CheckCircle2} value={recent.completed} label="completed" detail="in the last 7 days" tone="success" />
        <SummaryStatCard icon={RefreshCcw} value={recent.updated} label="updated" detail="in the last 7 days" />
        <SummaryStatCard icon={Plus} value={recent.created} label="created" detail="in the last 7 days" />
        <SummaryStatCard icon={CalendarDays} value={recent.dueSoon} label="due soon" detail="in the next 7 days" tone="warning" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <StatusOverviewPanel items={statusItems} total={data.total} />
        <PriorityBreakdownPanel items={priorityItems} total={data.total} />
        <TypeBreakdownPanel items={typeItems} total={data.total} />
        <TeamWorkloadPanel workload={workloadData.workload} total={workloadData.total} loading={workloadLoading} />
      </div>
    </div>
  );
}

const EMPTY_TASK_SUMMARY = {
  total: 0,
  recent: { completed: 0, updated: 0, created: 0, dueSoon: 0 },
  statusCounts: { TODO: 0, IN_PROGRESS: 0, IN_REVIEW: 0, DONE: 0 },
  priorityCounts: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
  typeCounts: { BUG: 0, FEATURE: 0, CHORE: 0, TECH_DEBT: 0, SPIKE: 0, INCIDENT: 0 },
};

const EMPTY_TASK_WORKLOAD = {
  total: 0,
  workload: [],
};

const SUMMARY_STATUS_COLORS = {
  TODO: "#0C66E4",
  IN_PROGRESS: "#FFAB00",
  IN_REVIEW: "#579DFF",
  DONE: "#94C748",
};

const SUMMARY_PRIORITY_COLORS = {
  URGENT: "#FF5630",
  HIGH: "#FF7452",
  MEDIUM: "#FFAB00",
  LOW: "#579DFF",
};

const SUMMARY_TYPE_COLORS = {
  BUG: "#FF5630",
  FEATURE: "#36B37E",
  CHORE: "#6554C0",
  TECH_DEBT: "#FFAB00",
  SPIKE: "#00B8D9",
  INCIDENT: "#DE350B",
};

function SummaryStatCard({ icon: Icon, value, label, detail, tone = "default" }) {
  const toneClass = tone === "success" ? "text-green-500" : tone === "warning" ? "text-orange-500" : "text-muted-foreground";

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className={cn("h-5 w-5", toneClass)} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-tight">{value} {label}</p>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function StatusOverviewPanel({ items, total }) {
  const background = total ? buildDonutBackground(items, total) : "conic-gradient(#e5e7eb 0 100%)";

  return (
    <Panel title="Status overview" subtitle={<span>Get a snapshot of the status of your work items. <Link className="text-primary" to="?view=list">View all work items</Link></span>}>
      <div className="grid items-center gap-5 md:grid-cols-[minmax(220px,1fr)_minmax(180px,0.8fr)]">
        <div className="flex justify-center">
          <div className="relative h-56 w-56 rounded-full" style={{ background }}>
            <div className="absolute inset-14 flex flex-col items-center justify-center rounded-full bg-card text-center">
              <p className="text-3xl font-semibold">{total}</p>
              <p className="max-w-28 text-sm font-medium text-muted-foreground">Total work items</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.value} className="flex items-center justify-between gap-3 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="truncate text-muted-foreground">{item.label}</span>
              </div>
              <span className="font-medium">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function PriorityBreakdownPanel({ items, total }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <Panel title="Priority breakdown" subtitle="Get a holistic view of how work is being prioritized.">
      <div className="flex h-44 items-end gap-5 border-b border-l px-2 pb-1">
        {items.map((item) => {
          const height = item.count ? Math.max(10, Math.round((item.count / max) * 100)) : 0;
          return (
            <div key={item.value} className="flex h-full flex-1 flex-col justify-end">
              <div className="mx-auto w-full max-w-16 rounded-t bg-muted-foreground/60" style={{ height: `${height}%`, backgroundColor: item.count ? item.color : undefined }} />
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
        {items.map((item) => (
          <div key={item.value}>
            <p className="font-medium text-foreground">{item.count}</p>
            <p>{item.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{total} total issues represented.</p>
    </Panel>
  );
}

function TypeBreakdownPanel({ items, total }) {
  return (
    <Panel title="Types of work" subtitle={<span>Get a breakdown of work items by their types. <Link className="text-primary" to="?view=list">View all items</Link></span>}>
      <div className="space-y-3">
        <div className="grid grid-cols-[minmax(100px,0.55fr)_minmax(0,1fr)] gap-4 text-xs font-semibold text-muted-foreground">
          <span>Type</span>
          <span>Distribution</span>
        </div>
        {items.map((item) => {
          const percent = countPercent(item.count, total);
          return (
            <div key={item.value} className="grid grid-cols-[minmax(100px,0.55fr)_minmax(0,1fr)] items-center gap-4 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3 w-3 rounded-sm border" style={{ borderColor: item.color, backgroundColor: `${item.color}22` }} />
                <span className="truncate">{item.label}</span>
              </div>
              <div className="h-6 rounded bg-muted">
                <div className="flex h-full min-w-8 items-center rounded px-2 text-xs text-foreground" style={{ width: `${Math.max(percent, item.count ? 8 : 0)}%`, backgroundColor: item.count ? `${item.color}99` : "transparent" }}>
                  {item.count ? `${percent}%` : ""}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function TeamWorkloadPanel({ workload, total, loading }) {
  return (
    <Panel title="Team workload" subtitle="Monitor the capacity of your team.">
      <div className="space-y-3">
        <div className="grid grid-cols-[minmax(130px,0.5fr)_minmax(0,1fr)] gap-4 text-xs font-semibold text-muted-foreground">
          <span>Assignee</span>
          <span>Work distribution</span>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading workload...</p>
        ) : workload.length ? workload.slice(0, 6).map((item) => {
          const percent = countPercent(item.total, total);
          return (
            <div key={item.user?.id || "unassigned"} className="grid grid-cols-[minmax(130px,0.5fr)_minmax(0,1fr)] items-center gap-4 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar user={item.user} fallback="U" className="h-7 w-7" fallbackClassName="bg-secondary text-xs text-muted-foreground" />
                <span className="truncate">{item.user?.name || item.user?.email || "Unassigned"}</span>
              </div>
              <div className="h-6 rounded bg-muted">
                <div className="flex h-full min-w-10 items-center rounded bg-muted-foreground/60 px-2 text-xs text-background" style={{ width: `${Math.max(percent, 8)}%` }}>
                  {percent}%
                </div>
              </div>
            </div>
          );
        }) : (
          <p className="text-sm text-muted-foreground">No assigned workload yet.</p>
        )}
      </div>
    </Panel>
  );
}

function buildDonutBackground(items, total) {
  let cursor = 0;
  const segments = items
    .filter((item) => item.count > 0)
    .map((item) => {
      const start = cursor;
      const end = cursor + (item.count / total) * 100;
      cursor = end;
      return `${item.color} ${start}% ${end}%`;
    });
  return `conic-gradient(${segments.join(", ")})`;
}

function countPercent(count, total) {
  return total ? Math.round((count / total) * 100) : 0;
}

function formatIssueType(type) {
  return type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function priorityLabel(priority) {
  return {
    URGENT: "Highest",
    HIGH: "High",
    MEDIUM: "Medium",
    LOW: "Low",
  }[priority] || priority;
}

function BoardView({ tasks, activeProject, members, sprints, filters, setFilters, setSelectedTask, moveTask }) {
  const { statuses, addStatus } = useIssueStatuses();
  const [draftFilters, setDraftFilters] = useState(filters);
  const [createColumnOpen, setCreateColumnOpen] = useState(false);
  const [columnTitle, setColumnTitle] = useState("");
  const hasActiveSprint = sprints.some((sprint) => sprint.status === "ACTIVE");
  const boardTasks = tasks;
  const hasSearchValue = draftFilters.search.trim().length > 0;
  const boardColumns = statuses;

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  function updateFilters(patch) {
    const nextFilters = { ...draftFilters, ...patch };
    setDraftFilters(nextFilters);
    setFilters({ ...nextFilters, search: nextFilters.search.trim() });
  }

  function clearFilters() {
    const emptyFilters = { search: "", status: "", priority: "", assigneeId: "", sprintId: "" };
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  }

  function dropTaskOnColumn(event, status) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/task-id");
    const task = boardTasks.find((item) => item.id === taskId);
    if (task) moveTask(task, status);
  }

  function createCustomColumn(event) {
    event.preventDefault();
    const label = columnTitle.trim();
    if (!label) return;

    const column = addStatus(label);
    if (!column) return;
    setColumnTitle("");
    setCreateColumnOpen(false);
  }

  return (
    <>
    <div className="space-y-4">
      <div className="w-full border-b pb-3">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <div className="relative w-full min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-9 rounded pl-8 text-sm"
              placeholder="Search board"
              value={draftFilters.search}
              onChange={(event) => updateFilters({ search: event.target.value })}
            />
          </div>
          <select className="h-9 rounded border bg-background px-2.5 text-sm" value={draftFilters.assigneeId} onChange={(event) => updateFilters({ assigneeId: event.target.value })}>
            <option value="">All assignees</option>
            {members.map((member) => <option key={member.userId} value={member.userId}>{member.user?.name || member.user?.email}</option>)}
          </select>
          <select className="h-9 rounded border bg-background px-2.5 text-sm" value={draftFilters.status} onChange={(event) => updateFilters({ status: event.target.value })}>
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <select className="h-9 rounded border bg-background px-2.5 text-sm" value={draftFilters.priority} onChange={(event) => updateFilters({ priority: event.target.value })}>
            <option value="">All priorities</option>
            {PRIORITIES.map((priority) => <PriorityOption key={priority} priority={priority} />)}
          </select>
          {hasSearchValue ? (
            <Button variant="outline" className="h-9 rounded px-3 text-sm" onClick={clearFilters}>
              <Filter className="h-4 w-4" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto pb-3">
        <div className="flex min-h-[380px] min-w-max gap-4">
        {boardColumns.map((column) => {
          const columnTasks = boardTasks.filter((task) => task.status === column.value);
          return (
            <section
              key={column.value}
              className="flex min-h-[380px] w-[300px] shrink-0 flex-col rounded-md border bg-card text-card-foreground shadow-none"
              onDragOver={(event) => {
                if (!column.custom) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(event) => {
                if (!column.custom) dropTaskOnColumn(event, column.value);
              }}
            >
              <div className="flex items-start justify-between gap-3 px-3 pb-3 pt-5">
                <h2 className="min-w-0 truncate text-xs font-semibold uppercase text-muted-foreground">{column.label}</h2>
                <p className="shrink-0 text-right text-[11px] leading-4 text-muted-foreground">
                  {columnTasks.length}
                </p>
              </div>

              <div className="flex-1 space-y-2 px-3 pb-3">
                {columnTasks.length ? (
                  columnTasks.map((task) => (
                    <BoardTaskCard
                      key={task.id}
                      task={task}
                      activeProject={activeProject}
                      onOpen={() => setSelectedTask(task)}
                    />
                  ))
                ) : !hasActiveSprint && column.value === "TODO" ? (
                  <div className="px-2 py-1 text-xs leading-5 text-muted-foreground">
                    <p className="font-semibold text-foreground">No active sprint</p>
                    <p className="mt-1">Start a sprint from the Backlog tab to populate the board.</p>
                    <Button asChild variant="outline" className="mt-3 h-8 rounded px-2.5 text-xs">
                      <Link to="?view=backlog">Go to Backlog</Link>
                    </Button>
                  </div>
                ) : (
                  null
                )}
              </div>
            </section>
          );
        })}
          <div className="flex min-h-[380px] shrink-0 items-start">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-md bg-card text-muted-foreground shadow-none hover:text-foreground"
              aria-label="Create column"
              title="Create column"
              onClick={() => setCreateColumnOpen(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
    <Dialog open={createColumnOpen} onOpenChange={setCreateColumnOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create column</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={createCustomColumn}>
          <div className="space-y-2">
            <Label htmlFor="board-column-title">Column name</Label>
            <Input
              id="board-column-title"
              value={columnTitle}
              onChange={(event) => setColumnTitle(event.target.value)}
              placeholder="Column name"
            />
            <p className="text-xs text-muted-foreground">
              New columns become project issue statuses and appear in filters, forms, and status menus.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateColumnOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!columnTitle.trim()}>Create column</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}

function BoardTaskCard({ task, activeProject, onOpen }) {
  const { statuses } = useIssueStatuses();
  const issueAttention = STATUS_BUCKETS.attention.includes(task.status);

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "group block w-full cursor-grab rounded-md border bg-background p-3 text-left shadow-sm transition hover:border-primary/60 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring active:cursor-grabbing",
        task.priority === "URGENT" && "border-l-4 border-l-red-600",
        task.priority === "HIGH" && "border-l-4 border-l-red-500"
      )}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/task-id", task.id);
      }}
      onClick={onOpen}
      onDoubleClick={onOpen}
      onKeyDown={(event) => openTaskFromKeyboard(event, onOpen)}
      title="Click to open issue details"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-3 text-sm font-medium leading-5 text-foreground group-hover:text-primary">{task.title}</p>
        <ChevronsUp className={cn("h-4 w-4 shrink-0", PRIORITY_TONES[task.priority])} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {issueKey(activeProject, task)}
        </span>
        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold", PRIORITY_TONES[task.priority], "bg-secondary")}>
          {task.priority}
        </span>
        {issueAttention ? <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[11px] font-semibold text-destructive">{issueStatusLabel(task.status, statuses)}</span> : null}
      </div>
      {task.sprint?.name ? (
        <div className="mt-2 max-w-full truncate text-xs text-muted-foreground">{task.sprint.name}</div>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 items-center gap-1 rounded border bg-background px-1.5 py-0.5">
          <CalendarDays className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{formatDate(task.dueDate)}</span>
        </span>
        <UserAvatar user={task.assignee} className="h-7 w-7" />
      </div>
    </div>
  );
}

const TIMELINE_LIMIT = 100;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TIMELINE_ZOOMS = {
  weeks: { label: "Weeks", minUnitWidth: 152 },
  months: { label: "Months", minUnitWidth: 320 },
  quarters: { label: "Quarters", minUnitWidth: 520 },
};
const STATUS_CATEGORIES = [
  { value: "", label: "Status category" },
  { value: "todo", label: "Todo" },
  { value: "progress", label: "In progress" },
  { value: "review", label: "In review" },
  { value: "done", label: "Done" },
];

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date) {
  const next = startOfDay(date);
  const day = next.getDay();
  next.setDate(next.getDate() - day);
  return next;
}

function startOfQuarter(date) {
  return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1);
}

function diffDays(start, end) {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / MS_PER_DAY);
}

function durationDays(start, end) {
  return Math.max(1, diffDays(start, end));
}

function formatTimelineHeader(date, zoom) {
  if (zoom === "weeks") {
    return `Week of ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date)}`;
  }
  if (zoom === "quarters") {
    return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
  }
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "2-digit" }).format(date);
}

function getTimelineUnits(rangeStart, rangeEnd, zoom) {
  const units = [];
  let cursor = zoom === "weeks" ? startOfWeek(rangeStart) : zoom === "quarters" ? startOfQuarter(rangeStart) : startOfMonth(rangeStart);
  while (cursor < rangeEnd) {
    const next = zoom === "weeks" ? addDays(cursor, 7) : zoom === "quarters" ? addMonths(cursor, 3) : addMonths(cursor, 1);
    units.push({ start: cursor, end: next, label: formatTimelineHeader(cursor, zoom) });
    cursor = next;
  }
  return units;
}

function toDateParam(date) {
  const next = startOfDay(date);
  const month = String(next.getMonth() + 1).padStart(2, "0");
  const day = String(next.getDate()).padStart(2, "0");
  return `${next.getFullYear()}-${month}-${day}`;
}

function getTimelineRequestRange(focusDate, zoom) {
  if (zoom === "weeks") {
    const start = startOfWeek(addDays(focusDate, -28));
    return { start, end: addDays(start, 84) };
  }
  if (zoom === "quarters") {
    const start = startOfQuarter(addMonths(focusDate, -6));
    return { start, end: addMonths(start, 18) };
  }
  const start = startOfMonth(addMonths(focusDate, -2));
  return { start, end: addMonths(start, 5) };
}

function shiftTimelineFocus(date, zoom, direction) {
  if (zoom === "weeks") return addDays(date, direction * 28);
  if (zoom === "quarters") return addMonths(date, direction * 9);
  return addMonths(date, direction * 3);
}

function getItemStyle(startDate, endDate, rangeStart, totalDays, maxWidth = 220) {
  const start = startOfDay(new Date(startDate));
  const end = startOfDay(new Date(endDate || startDate));
  const clampedStart = start < rangeStart ? rangeStart : start;
  const clampedEnd = end > addDays(rangeStart, totalDays) ? addDays(rangeStart, totalDays) : end;
  const left = Math.max(0, (diffDays(rangeStart, clampedStart) / totalDays) * 100);
  const width = Math.max((durationDays(clampedStart, addDays(clampedEnd, 1)) / totalDays) * 100, 1.4);
  return { left: `${left}%`, width: `min(${Math.max(1.4, Math.min(width, 100 - left))}%, ${maxWidth}px)` };
}

function memberId(member) {
  return member.userId || member.id;
}

function memberLabel(member) {
  return member.user?.name || member.user?.email || member.name || member.email || "Unknown";
}

function shortTimelineText(value, maxLength = 18) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}...`;
}

function TimelineView({ projectId, active, activeProject, members, currentUser, setSelectedTask, onEditSprint }) {
  const { statuses } = useIssueStatuses();
  const [search, setSearch] = useState("");
  const [statusCategory, setStatusCategory] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [zoom, setZoom] = useState("months");
  const [focusDate, setFocusDate] = useState(() => new Date());
  const [centerDate, setCenterDate] = useState(null);
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const timelineScrollRef = useRef(null);
  const todayMarkerRef = useRef(null);
  const timelineRange = useMemo(() => getTimelineRequestRange(focusDate, zoom), [focusDate, zoom]);
  const timelineFrom = toDateParam(timelineRange.start);
  const timelineTo = toDateParam(timelineRange.end);

  const timelineTasksQuery = useApiResource(() => getProjectTimeline(projectId, {
      search,
      statusCategory,
      assigneeId: assigneeFilter,
      from: timelineFrom,
      to: timelineTo,
      zoom,
      limit: TIMELINE_LIMIT,
    }), [projectId, search, statusCategory, assigneeFilter, timelineFrom, timelineTo, zoom, active], {
    enabled: Boolean(projectId && active),
  });

  const timelineData = timelineTasksQuery.data?.data || {};
  const timelinePagination = timelineTasksQuery.data?.pagination;
  const scheduledTasks = timelineData.scheduledTasks || [];
  const visibleSprints = timelineData.sprints || [];
  const tasksBySprint = timelineData.tasksBySprint || {};
  const selectedSprint = visibleSprints.find((sprint) => sprint.id === selectedSprintId) || null;
  const selectedSprintTasks = selectedSprint ? tasksBySprint[selectedSprint.id] || [] : [];

  const units = getTimelineUnits(timelineRange.start, timelineRange.end, zoom);
  const totalDays = durationDays(timelineRange.start, timelineRange.end);
  const timelineWidth = Math.max(units.length * TIMELINE_ZOOMS[zoom].minUnitWidth, 900);
  const today = startOfDay(new Date());
  const showToday = today >= timelineRange.start && today <= timelineRange.end;
  const todayLeft = showToday ? `${(diffDays(timelineRange.start, today) / totalDays) * 100}%` : null;
  const capped = timelinePagination?.total > TIMELINE_LIMIT;
  const hasActiveTimelineFilters = Boolean(search.trim() || assigneeFilter || statusCategory);

  useEffect(() => {
    if (selectedSprintId && !visibleSprints.some((sprint) => sprint.id === selectedSprintId)) {
      setSelectedSprintId("");
    }
  }, [selectedSprintId, visibleSprints]);

  useEffect(() => {
    if (!centerDate) return;
    window.requestAnimationFrame(() => {
      if (todayMarkerRef.current) {
        todayMarkerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
        setCenterDate(null);
        return;
      }
      const scrollNode = timelineScrollRef.current;
      if (!scrollNode) return;
      const left = (diffDays(timelineRange.start, centerDate) / totalDays) * timelineWidth;
      scrollNode.scrollTo({ left: Math.max(0, left - scrollNode.clientWidth / 2), behavior: "smooth" });
      setCenterDate(null);
    });
  }, [centerDate, timelineRange.start, totalDays, timelineWidth]);

  function centerOnToday() {
    const todayDate = new Date();
    setSelectedSprintId("");
    setFocusDate(todayDate);
    setCenterDate(todayDate);
  }

  function moveTimeline(direction) {
    setSelectedSprintId("");
    setFocusDate((current) => shiftTimelineFocus(current, zoom, direction));
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-background p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="h-9 pl-9" placeholder="Search timeline" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn("flex h-8 w-8 items-center justify-center rounded-full border", assigneeFilter === "me" ? "border-primary bg-primary/10" : "bg-background")}
              onClick={() => setAssigneeFilter((current) => (current === "me" ? "" : "me"))}
              aria-label="Filter to my issues"
              title="My issues"
            >
              <UserAvatar user={currentUser} className="h-7 w-7" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
            </button>
            <button
              type="button"
              className={cn("flex h-8 w-8 items-center justify-center rounded-full border", assigneeFilter === "unassigned" ? "border-primary bg-primary/10 text-primary" : "bg-background text-muted-foreground")}
              onClick={() => setAssigneeFilter((current) => (current === "unassigned" ? "" : "unassigned"))}
              aria-label="Filter to unassigned issues"
              title="Unassigned issues"
            >
              <UserAvatar user={null} className="h-7 w-7" fallback="-" fallbackClassName="bg-secondary text-[11px] text-muted-foreground" />
            </button>
          </div>
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
            <option value="">All assignees</option>
            <option value="me">My issues</option>
            <option value="unassigned">Unassigned</option>
            {members.map((member) => (
              <option key={memberId(member)} value={memberId(member)}>{memberLabel(member)}</option>
            ))}
          </select>
          <select className="h-9 rounded-md border bg-background px-3 text-sm" value={statusCategory} onChange={(event) => setStatusCategory(event.target.value)}>
            {STATUS_CATEGORIES.map((category) => (
              <option key={category.value || "all"} value={category.value}>{category.label}</option>
            ))}
          </select>
          {hasActiveTimelineFilters ? (
            <Button variant="outline" className="h-9 rounded px-3 text-sm" onClick={() => {
              setSearch("");
              setAssigneeFilter("");
              setStatusCategory("");
            }}>
              <Filter className="h-4 w-4" />
              Clear
            </Button>
          ) : null}
          <Button variant="outline" size="icon" className="h-9 w-9 rounded" aria-label="Refresh timeline" title="Refresh timeline" onClick={() => timelineTasksQuery.reload()}>
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {timelineTasksQuery.isLoading ? (
        <p className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">Loading timeline...</p>
      ) : null}

      {timelineTasksQuery.isError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Could not load timeline work. Try refreshing the timeline.
        </p>
      ) : null}

      {capped ? (
        <p className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
          Showing the first {TIMELINE_LIMIT} matching issues on the timeline. Refine search or filters to narrow the plan.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-md border bg-background">
        <div className="flex min-h-[560px]">
          <div className="w-[260px] shrink-0 border-r bg-background">
            <div className="flex h-12 items-center border-b px-4">
              <p className="text-sm font-semibold">Work</p>
            </div>
            <div className="flex h-[52px] items-center border-b px-4">
              <p className="text-sm font-semibold text-muted-foreground">Sprint</p>
            </div>
            {visibleSprints.map((sprint) => (
              <button
                key={sprint.id}
                type="button"
                className={cn(
                  "flex h-[52px] w-full min-w-0 items-center border-b px-4 text-left hover:bg-accent/40",
                  selectedSprintId === sprint.id && "bg-primary/10 text-primary"
                )}
                onClick={() => setSelectedSprintId((current) => (current === sprint.id ? "" : sprint.id))}
                onDoubleClick={() => onEditSprint(sprint)}
                onKeyDown={(event) => openTaskFromKeyboard(event, () => onEditSprint(sprint))}
                title="Click to show sprint issues. Double-click to edit sprint."
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium" title={sprint.name}>{shortTimelineText(sprint.name, 20)}</span>
                  <span className="block truncate text-xs text-muted-foreground">{shortTimelineText(sprint.status, 8)}</span>
                </span>
              </button>
            ))}
            {selectedSprint ? (
              <>
                <div className="flex h-11 items-center justify-between gap-2 border-b px-4">
                  <p className="truncate text-sm font-semibold text-muted-foreground" title={selectedSprint.name}>Issues</p>
                  <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs font-medium text-muted-foreground">{selectedSprintTasks.length}</span>
                </div>
                {selectedSprintTasks.length ? selectedSprintTasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="flex h-11 w-full min-w-0 items-center border-b px-4 text-left hover:bg-accent/40"
                    onDoubleClick={() => setSelectedTask(task)}
                    onKeyDown={(event) => openTaskFromKeyboard(event, () => setSelectedTask(task))}
                    title="Double-click to open issue details"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium" title={task.title}>{shortTimelineText(task.title, 22)}</span>
                      <span className="block truncate text-xs text-muted-foreground">{issueKey(activeProject, task)} - {formatDate(task.dueDate)}</span>
                    </span>
                  </button>
                )) : (
                  <div className="flex h-11 items-center border-b px-4 text-sm text-muted-foreground">No issues in this sprint</div>
                )}
              </>
            ) : (
              <div className="border-b px-4 py-3 text-sm text-muted-foreground">
                Select a sprint.
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 overflow-x-auto" ref={timelineScrollRef}>
            <div className="relative" style={{ width: timelineWidth }}>
              <div className="sticky top-0 z-10 flex h-12 border-b bg-background">
                {units.map((unit) => (
                  <div
                    key={`${zoom}-${unit.start.toISOString()}`}
                    className="flex items-center justify-center border-r text-sm font-semibold text-muted-foreground"
                    style={{ width: `${(durationDays(unit.start, unit.end) / totalDays) * 100}%` }}
                  >
                    {unit.label}
                  </div>
                ))}
              </div>
              <div className="absolute inset-y-0 top-12 pointer-events-none">
                {units.map((unit) => (
                  <div
                    key={`line-${unit.start.toISOString()}`}
                    className="absolute top-0 h-full border-l"
                    style={{ left: `${(diffDays(timelineRange.start, unit.start) / totalDays) * 100}%` }}
                  />
                ))}
                {showToday ? (
                  <div
                    ref={todayMarkerRef}
                    className="absolute top-0 h-full border-l-2 border-primary/70"
                    style={{ left: todayLeft }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>

              <div className="relative h-[52px] border-b bg-secondary/20" />
              {visibleSprints.map((sprint) => {
                const start = sprint.startDate || sprint.endDate;
                const end = sprint.endDate || sprint.startDate;
                return (
                  <div key={sprint.id} className="relative h-[52px] border-b">
                    <button
                      type="button"
                      className="absolute top-2 flex h-8 min-w-16 items-center rounded bg-primary/15 px-3 text-left text-xs font-semibold text-primary ring-1 ring-primary/30 hover:bg-primary/20"
                      style={getItemStyle(start, end, timelineRange.start, totalDays, 220)}
                      onClick={() => setSelectedSprintId((current) => (current === sprint.id ? "" : sprint.id))}
                      onDoubleClick={() => onEditSprint(sprint)}
                      onKeyDown={(event) => openTaskFromKeyboard(event, () => onEditSprint(sprint))}
                      title={`${sprint.name} - ${formatDate(start)} to ${formatDate(end)}. Click to show sprint issues. Double-click to edit sprint.`}
                    >
                      <span className="truncate">{shortTimelineText(sprint.name, 18)}</span>
                    </button>
                  </div>
                );
              })}
              {selectedSprint ? <div className="relative h-11 border-b bg-secondary/20" /> : <div className="relative h-[61px] border-b bg-secondary/20" />}
              {selectedSprintTasks.map((task) => {
                const status = statuses.find((item) => item.value === task.status);
                const barStart = task.dueDate || selectedSprint.startDate || selectedSprint.endDate;
                return (
                  <div key={task.id} className="relative h-11 border-b">
                    {barStart ? (
                      <button
                        type="button"
                        className={cn(
                          "absolute top-2 flex h-7 min-w-20 items-center gap-1.5 rounded bg-background px-2 text-left text-xs font-medium shadow-sm ring-1 hover:ring-primary/70",
                          task.dueDate ? "ring-border" : "border border-dashed text-muted-foreground"
                        )}
                        style={getItemStyle(barStart, barStart, timelineRange.start, totalDays, 120)}
                        onDoubleClick={() => setSelectedTask(task)}
                        onKeyDown={(event) => openTaskFromKeyboard(event, () => setSelectedTask(task))}
                        title={`${issueKey(activeProject, task)} - ${task.title} - ${task.dueDate ? formatDate(task.dueDate) : "No due date"}. Double-click to open issue details.`}
                      >
                        <ChevronsUp className={cn("h-3.5 w-3.5 shrink-0", PRIORITY_TONES[task.priority])} />
                        <span className="truncate">{issueKey(activeProject, task)}</span>
                        <span className="sr-only">{status?.label || task.status}</span>
                      </button>
                    ) : null}
                  </div>
                );
              })}

              {!visibleSprints.length && !scheduledTasks.length ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  No timeline work matches these filters.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-background px-3 py-2">
          <Button variant="outline" size="icon" className="h-8 w-8 rounded" aria-label="Previous timeline range" title="Previous range" onClick={() => moveTimeline(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-8 rounded px-3 text-sm" onClick={centerOnToday}>Today</Button>
          <Button variant="outline" size="icon" className="h-8 w-8 rounded" aria-label="Next timeline range" title="Next range" onClick={() => moveTimeline(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="flex rounded-md border bg-background p-0.5">
            {Object.entries(TIMELINE_ZOOMS).map(([value, config]) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "h-7 rounded px-3 text-sm font-medium transition-colors",
                  zoom === value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setZoom(value)}
              >
                {config.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BacklogView({
  tasks,
  loading,
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
  deleteTaskMutation,
  reorderSprintTasksMutation,
  addTasksToSprintMutation,
  removeTaskFromSprintMutation,
}) {
  const { statuses } = useIssueStatuses();
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [sprintDialog, setSprintDialog] = useState(null);
  const [draftFilters, setDraftFilters] = useState(filters);
  const plannedOrActiveSprints = getPlannedOrActiveSprints(sprints);
  const completedSprints = sprints.filter((sprint) => sprint.status === "COMPLETED");
  const visibleSprints = filters.sprintId && filters.sprintId !== "backlog"
    ? plannedOrActiveSprints.filter((sprint) => sprint.id === filters.sprintId)
    : filters.sprintId === "backlog"
      ? []
      : plannedOrActiveSprints;
  const showBacklogSection = !filters.sprintId || filters.sprintId === "backlog";
  const backlogTasks = tasks
    .filter((task) => !task.sprintId)
    .slice()
    .sort((a, b) => (a.backlogOrder || 0) - (b.backlogOrder || 0));
  const moveScopeOptions = getMoveScopeOptions(sprints);
  const [moveTargetSprintId, setMoveTargetSprintId] = useState("");
  const selectedVisibleIds = selectedTaskIds.filter((taskId) => tasks.some((task) => task.id === taskId));
  const selectedVisibleTasks = selectedVisibleIds.map((taskId) => tasks.find((task) => task.id === taskId)).filter(Boolean);
  const selectedSprintTasks = selectedVisibleTasks.filter((task) => task.sprintId);
  const canMoveSelectedToTarget = Boolean(moveTargetSprintId && selectedVisibleTasks.some((task) => (task.sprintId || "backlog") !== moveTargetSprintId));
  const hasSearchValue = draftFilters.search.trim().length > 0;

  useEffect(() => {
    setSelectedTaskIds((current) => current.filter((taskId) => tasks.some((task) => task.id === taskId)));
  }, [tasks]);

  useEffect(() => {
    if (!moveScopeOptions.length) {
      setMoveTargetSprintId("");
      return;
    }
    setMoveTargetSprintId((current) => moveScopeOptions.some((option) => option.value === current) ? current : "");
  }, [moveScopeOptions]);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

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

  function updateBacklogFilters(patch) {
    const nextFilters = { ...draftFilters, ...patch };
    setDraftFilters(nextFilters);
    setFilters({ ...nextFilters, search: nextFilters.search.trim() });
  }

  function clearBacklogFilters() {
    const emptyFilters = { search: "", status: "", priority: "", assigneeId: "", sprintId: "" };
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  }

  function moveSelectedToSprint() {
    if (!moveTargetSprintId || !selectedVisibleIds.length) return;

    if (moveTargetSprintId === "backlog") {
      selectedSprintTasks.forEach((task) => {
        removeTaskFromSprintMutation.mutate({ sprintId: task.sprintId, taskId: task.id });
      });
      return;
    }

    const movableTaskIds = selectedVisibleTasks
      .filter((task) => task.sprintId !== moveTargetSprintId)
      .map((task) => task.id);
    if (!movableTaskIds.length) return;

    addTasksToSprintMutation.mutate(
      { sprintId: moveTargetSprintId, taskIds: movableTaskIds },
      { onSuccess: (result) => result?.success && setSelectedTaskIds((current) => current.filter((id) => !movableTaskIds.includes(id))) }
    );
  }

  function moveTaskToScope(task, targetScopeId) {
    const currentScopeId = task.sprintId || "backlog";
    if (!targetScopeId || currentScopeId === targetScopeId) return;

    if (targetScopeId === "backlog" && task.sprintId) {
      removeTaskFromSprintMutation.mutate({ sprintId: task.sprintId, taskId: task.id });
      return;
    }

    if (targetScopeId !== "backlog") {
      addTasksToSprintMutation.mutate({ sprintId: targetScopeId, taskIds: [task.id] });
    }
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

  function dropTaskIntoScope(event, targetScopeId, items, targetTaskId = null) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData("text/task-id");
    if (!taskId) return;
    if (targetTaskId === taskId) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const sourceScopeId = task.sprintId || "backlog";

    if (sourceScopeId === targetScopeId) {
      const ordered = items.map((item) => item.id).filter((id) => id !== taskId);
      const targetIndex = targetTaskId ? ordered.indexOf(targetTaskId) : ordered.length;
      ordered.splice(targetIndex < 0 ? ordered.length : targetIndex, 0, taskId);
      reorderSprintTasksMutation.mutate({ sprintId: targetScopeId, orderedTaskIds: ordered });
      return;
    }

    if (targetScopeId === "backlog" && task.sprintId) {
      removeTaskFromSprintMutation.mutate({ sprintId: task.sprintId, taskId });
      return;
    }

    if (targetScopeId !== "backlog") {
      addTasksToSprintMutation.mutate({ sprintId: targetScopeId, taskIds: [taskId] });
    }
  }

  function submitSprintDialog(payload) {
    if (!sprintDialog) return;
    if (sprintDialog.type === "create") {
      createSprintMutation.mutate(payload, { onSuccess: (result) => result?.success && setSprintDialog(null) });
    }
    if (sprintDialog.type === "edit") {
      updateSprintMutation.mutate({ sprintId: sprintDialog.sprint.id, payload }, { onSuccess: (result) => result?.success && setSprintDialog(null) });
    }
    if (sprintDialog.type === "start") {
      startSprintMutation.mutate({ sprintId: sprintDialog.sprint.id, payload }, { onSuccess: (result) => result?.success && setSprintDialog(null) });
    }
    if (sprintDialog.type === "complete") {
      completeSprintMutation.mutate({ sprintId: sprintDialog.sprint.id, payload }, { onSuccess: (result) => result?.success && setSprintDialog(null) });
    }
    if (sprintDialog.type === "delete") {
      deleteSprintMutation.mutate({ sprintId: sprintDialog.sprint.id }, { onSuccess: (result) => result?.success && setSprintDialog(null) });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex w-full flex-col gap-2 border-b pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <div className="relative w-full min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 rounded pl-8 text-sm"
              placeholder="Search backlog"
              value={draftFilters.search}
              onChange={(event) => updateBacklogFilters({ search: event.target.value })}
            />
          </div>
          <select
            className="h-8 rounded border bg-background px-2.5 text-sm"
            value={draftFilters.assigneeId}
            onChange={(event) => updateBacklogFilters({ assigneeId: event.target.value })}
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
            value={draftFilters.status}
            onChange={(event) => updateBacklogFilters({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <select
            className="h-8 rounded border bg-background px-2.5 text-sm"
            value={draftFilters.priority}
            onChange={(event) => updateBacklogFilters({ priority: event.target.value })}
          >
            <option value="">All priorities</option>
            {PRIORITIES.map((priority) => <PriorityOption key={priority} priority={priority} />)}
          </select>
          <select
            className="h-8 rounded border bg-background px-2.5 text-sm"
            value={draftFilters.sprintId || ""}
            onChange={(event) => updateBacklogFilters({ sprintId: event.target.value })}
          >
            <option value="">All planning</option>
            <option value="backlog">Backlog</option>
            {sprints.map((sprint) => (
              <option key={sprint.id} value={sprint.id}>
                {sprint.name}
              </option>
            ))}
          </select>
          {hasSearchValue ? (
            <Button variant="outline" className="h-8 rounded px-2.5 text-sm" onClick={clearBacklogFilters}>
              <Filter className="h-3.5 w-3.5" />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      {selectedVisibleIds.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm">
          <span className="font-medium">{selectedVisibleIds.length} selected</span>
          {canManageSprints && moveScopeOptions.length > 1 ? (
            <>
              <select className="h-8 rounded border bg-background px-2 text-sm" value={moveTargetSprintId} onChange={(event) => setMoveTargetSprintId(event.target.value)} aria-label="Move selected issues to">
                <option value="">Move to...</option>
                {moveScopeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <Button className="h-8 rounded px-2.5 text-sm" onClick={moveSelectedToSprint} disabled={!canMoveSelectedToTarget || addTasksToSprintMutation.isPending || removeTaskFromSprintMutation.isPending}>
                <TimerReset className="h-3.5 w-3.5" />
                Move
              </Button>
            </>
          ) : null}
          <Button variant="ghost" className="h-8 rounded px-2.5 text-sm" onClick={() => setSelectedTaskIds([])}>Clear</Button>
        </div>
      ) : null}

      {loading ? (
        <section className="rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">Loading backlog planning data...</section>
      ) : null}

      {!plannedOrActiveSprints.length && !loading ? (
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
      ) : null}

      {visibleSprints.map((sprint) => {
        const sprintTasks = tasks
          .filter((task) => task.sprintId === sprint.id)
          .slice()
          .sort((a, b) => (a.sprintOrder || 0) - (b.sprintOrder || 0));
        return (
          <BacklogSection
            key={sprint.id}
            title={sprint.name}
            sprint={sprint}
            items={sprintTasks}
            selectedTaskIds={selectedTaskIds}
            activeProject={activeProject}
            members={members}
            emptyLabel={filters.search || filters.status || filters.priority || filters.assigneeId ? "No issues match these filters in this sprint." : "No issues in this sprint yet."}
            primaryAction={sprint.status === "ACTIVE" ? "Complete sprint" : "Start sprint"}
            canCreate={canCreate}
            canAssign={canAssign}
            canManageSprints={canManageSprints}
            moveScopeOptions={moveScopeOptions}
            onToggleSection={toggleSection}
            onToggleTask={toggleTask}
            onCreate={(title) => createInlineTask({ title, status: "TODO", sprintId: sprint.id })}
            onOpenTask={setSelectedTask}
            onPrimaryAction={() => sprint.status === "ACTIVE" ? setSprintDialog({ type: "complete", sprint }) : setSprintDialog({ type: "start", sprint })}
            onEditSprint={() => setSprintDialog({ type: "edit", sprint })}
            onUpdateSprint={(payload) => updateSprintMutation.mutate({ sprintId: sprint.id, payload })}
            onUpdateTask={(task, payload) => updateTaskMutation.mutate({ taskId: task.id, payload })}
            onDeleteTask={(task) => deleteTaskMutation.mutate(task.id)}
            onRemoveTask={(task) => removeTaskFromSprintMutation.mutate({ sprintId: sprint.id, taskId: task.id })}
            onMoveTaskToScope={(task, targetScopeId) => moveTaskToScope(task, targetScopeId)}
            onDeleteSprint={() => setSprintDialog({ type: "delete", sprint })}
            onMoveTask={(task, direction) => moveTaskInScope(sprint.id, sprintTasks, task.id, direction)}
            onDropTask={(event, targetTaskId) => dropTaskIntoScope(event, sprint.id, sprintTasks, targetTaskId)}
            actionPending={startSprintMutation.isPending || completeSprintMutation.isPending || updateSprintMutation.isPending || deleteSprintMutation.isPending}
          />
        );
      })}

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-1 text-xs text-muted-foreground">
        <div className="flex items-center justify-center">
          <GripVertical className="h-4 w-4" />
        </div>
        <p>
          {tasks.length} issue{tasks.length === 1 ? "" : "s"} visible
        </p>
      </div>

      {showBacklogSection ? (
        <BacklogSection
          title="Backlog"
          items={backlogTasks}
          selectedTaskIds={selectedTaskIds}
          activeProject={activeProject}
          members={members}
          emptyLabel={filters.search || filters.status || filters.priority || filters.assigneeId ? "No backlog issues match these filters." : "No backlog issues yet."}
          primaryAction="Create sprint"
          canCreate={canCreate}
            canAssign={canAssign}
            canManageSprints={canManageSprints}
            moveScopeOptions={moveScopeOptions}
            onToggleSection={toggleSection}
          onToggleTask={toggleTask}
          onCreate={(title) => createInlineTask({ title, status: "TODO" })}
          onOpenTask={setSelectedTask}
          onPrimaryAction={createSprintFromBacklog}
          onUpdateTask={(task, payload) => updateTaskMutation.mutate({ taskId: task.id, payload })}
          onDeleteTask={(task) => deleteTaskMutation.mutate(task.id)}
          onMoveTaskToScope={(task, targetScopeId) => moveTaskToScope(task, targetScopeId)}
          onMoveTask={(task, direction) => moveTaskInScope("backlog", backlogTasks, task.id, direction)}
          onDropTask={(event, targetTaskId) => dropTaskIntoScope(event, "backlog", backlogTasks, targetTaskId)}
          actionDisabled={!canManageSprints}
          actionPending={createSprintMutation.isPending}
        />
      ) : null}

      <CompletedSprintHistory
        projectId={activeProject?.id}
        sprints={completedSprints}
        activeProject={activeProject}
        onViewTask={setSelectedTask}
        onDeleteSprint={(sprint) => setSprintDialog({ type: "delete", sprint })}
        onDeleteTask={(task) => deleteTaskMutation.mutate(task.id)}
      />
      <SprintDialog
        state={sprintDialog}
        onClose={() => setSprintDialog(null)}
        onSubmit={submitSprintDialog}
        pending={createSprintMutation.isPending || updateSprintMutation.isPending || startSprintMutation.isPending || completeSprintMutation.isPending || deleteSprintMutation.isPending}
      />
    </div>
  );
}

function CompletedSprintHistory({ projectId, sprints, activeProject, onViewTask, onDeleteSprint, onDeleteTask }) {
  const [expandedSprintIds, setExpandedSprintIds] = useState([]);
  if (!sprints.length) return null;
  const orderedSprints = sprints
    .slice()
    .sort((a, b) => new Date(b.endDate || b.updatedAt || b.createdAt || 0).getTime() - new Date(a.endDate || a.updatedAt || a.createdAt || 0).getTime());

  function toggleSprint(sprintId) {
    setExpandedSprintIds((current) =>
      current.includes(sprintId)
        ? current.filter((id) => id !== sprintId)
        : [...current, sprintId]
    );
  }

  return (
    <section className="rounded-md border bg-background">
      <div className="border-b px-3 py-2">
        <h2 className="text-sm font-semibold">Completed sprint history</h2>
        <p className="text-xs text-muted-foreground">
          Review {orderedSprints.length} completed sprint{orderedSprints.length === 1 ? "" : "s"} and the issues finished in each sprint.
        </p>
      </div>
      <div className="divide-y">
        {orderedSprints.map((sprint) => {
          const total = sprint._count?.tasks ?? 0;
          const expanded = expandedSprintIds.includes(sprint.id);
          return (
            <div key={sprint.id} className="p-3">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="flex h-6 w-6 items-center justify-center rounded hover:bg-secondary"
                      aria-label={`${expanded ? "Collapse" : "Expand"} ${sprint.name}`}
                      aria-expanded={expanded}
                      onClick={() => toggleSprint(sprint.id)}
                    >
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded ? "rotate-0" : "-rotate-90")} />
                    </button>
                    <p className="truncate text-sm font-medium">{sprint.name}</p>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">COMPLETED</span>
                    <span className="text-xs text-muted-foreground">{total} issue{total === 1 ? "" : "s"}</span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{sprint.goal || "No sprint goal recorded."}</p>
                </div>
                <div className="flex items-center justify-end">
                  {onDeleteSprint ? (
                    <SprintActionsMenu sprint={sprint} onDelete={() => onDeleteSprint(sprint)} />
                  ) : null}
                </div>
              </div>

              {expanded ? (
                <CompletedSprintTaskTable
                  projectId={projectId}
                  sprint={sprint}
                  activeProject={activeProject}
                  onViewTask={onViewTask}
                  onDeleteTask={onDeleteTask}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function CompletedSprintTaskTable({ projectId, sprint, activeProject, onViewTask, onDeleteTask }) {
  const { statuses } = useIssueStatuses();
  const tasksQuery = useApiResource(() => getProjectSprintTasks(projectId, sprint.id), [projectId, sprint.id], {
    enabled: Boolean(projectId && sprint?.id),
  });
  const tasks = tasksQuery.data?.data || [];

  if (tasksQuery.isLoading) {
    return <div className="mt-3 rounded border px-3 py-6 text-center text-sm text-muted-foreground">Loading sprint issues...</div>;
  }

  if (tasksQuery.isError) {
    const message = tasksQuery.error?.message || resultMessage(tasksQuery.data, "Could not load sprint issues.");
    return <div className="mt-3 rounded border px-3 py-6 text-center text-sm text-destructive">{message}</div>;
  }

  return (
    <div className="mt-3 overflow-x-auto rounded border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Issue</th>
            <th className="w-32 px-3 py-2">Status</th>
            <th className="w-28 px-3 py-2">Priority</th>
            <th className="w-28 px-3 py-2">Type</th>
            <th className="w-40 px-3 py-2">Assignee</th>
            <th className="w-12 px-3 py-2" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {tasks.length ? tasks.map((task) => (
            <tr key={task.id} className="border-t">
              <td className="min-w-0 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ListTodo className="h-4 w-4 shrink-0 text-primary" />
                  <span className="shrink-0 text-xs text-muted-foreground">{issueKey(activeProject, task)}</span>
                  <span className="truncate font-medium">{task.title}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <span className="inline-flex h-8 min-w-28 items-center rounded border bg-background px-2 text-xs">
                  {issueStatusLabel(task.status, statuses)}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className={cn("inline-flex h-8 min-w-24 items-center rounded border bg-background px-2 text-xs font-semibold", PRIORITY_TONES[task.priority])}>
                  {task.priority}
                </span>
              </td>
              <td className="px-3 py-2">
                <span className="inline-flex h-8 min-w-24 items-center rounded border bg-background px-2 text-xs">
                  {task.type?.replace("_", " ") || "FEATURE"}
                </span>
              </td>
              <td className="px-3 py-2">
                <div className="inline-flex h-8 min-w-36 max-w-full items-center gap-2 rounded border bg-background px-2">
                  <UserAvatar user={task.assignee} className="h-6 w-6" fallbackClassName="bg-secondary text-[11px] text-muted-foreground" />
                  <span className="truncate text-xs">{task.assignee?.name || task.assignee?.email || "Unassigned"}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <TaskActionsMenu
                  task={task}
                  canDelete={Boolean(onDeleteTask)}
                  onView={() => onViewTask?.(task)}
                  onDelete={() => onDeleteTask?.(task)}
                />
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-center text-sm text-muted-foreground">No issues remain attached to this completed sprint.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function SprintDialog({ state, onClose, onSubmit, pending }) {
  const [form, setForm] = useState({ name: "", goal: "", startDate: "", endDate: "", moveOpenToBacklog: true, deleteConfirm: "" });
  const type = state?.type;
  const sprint = state?.sprint;
  const fieldIdPrefix = `sprint-dialog-${type || "idle"}-${sprint?.id || "new"}`;

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
    edit: "Edit sprint",
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
          {type === "create" || type === "edit" ? (
            <div className="space-y-2">
              <Label htmlFor={`${fieldIdPrefix}-name`}>Name</Label>
              <Input id={`${fieldIdPrefix}-name`} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Sprint 1" />
            </div>
          ) : null}
          {type === "create" || type === "edit" || type === "start" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor={`${fieldIdPrefix}-goal`}>Goal</Label>
                <Textarea id={`${fieldIdPrefix}-goal`} value={form.goal} onChange={(event) => setForm((current) => ({ ...current, goal: event.target.value }))} placeholder="What should this sprint achieve?" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${fieldIdPrefix}-start-date`}>Start date</Label>
                  <Input id={`${fieldIdPrefix}-start-date`} type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${fieldIdPrefix}-end-date`}>End date</Label>
                  <Input id={`${fieldIdPrefix}-end-date`} type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
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
              <p className="text-sm text-muted-foreground">Issues in this sprint will move back to the backlog.</p>
              <Label htmlFor={`${fieldIdPrefix}-delete-confirm`}>Type {sprint?.name} to confirm</Label>
              <Input id={`${fieldIdPrefix}-delete-confirm`} value={form.deleteConfirm} onChange={(event) => setForm((current) => ({ ...current, deleteConfirm: event.target.value }))} />
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
      <Input className="h-8" placeholder="Create issue" value={title} onChange={(event) => setTitle(event.target.value)} />
      {!compact ? (
        <>
          <select className="h-8 rounded border bg-background px-2 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>
            {PRIORITIES.map((item) => <PriorityOption key={item} priority={item} />)}
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

function ListView({ tasks, pagination, onPageChange, activeProject, members, sprints, filters, setFilters, setSelectedTask, canCreate, canAssign, createInlineTask, updateTaskMutation, deleteTaskMutation, addTasksToSprintMutation, removeTaskFromSprintMutation }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [sort, setSort] = useState({ field: "updatedAt", direction: "desc" });
  const [creating, setCreating] = useState(false);
  const moveScopeOptions = getMoveScopeOptions(sprints);
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

  function moveTaskToScope(task, targetScopeId) {
    const currentScopeId = task.sprintId || "backlog";
    if (!targetScopeId || currentScopeId === targetScopeId) return;

    if (targetScopeId === "backlog" && task.sprintId) {
      removeTaskFromSprintMutation.mutate({ sprintId: task.sprintId, taskId: task.id });
      return;
    }

    if (targetScopeId !== "backlog") {
      addTasksToSprintMutation.mutate({ sprintId: targetScopeId, taskIds: [task.id] });
    }
  }

  function handleRowOpen(event, task) {
    if (isRowControlTarget(event.target)) return;
    setSelectedTask(task);
  }

  function handleIssueCellDoubleClick(event, task) {
    event.stopPropagation();
    setSelectedTask(task);
  }

  return (
    <div className="space-y-3">
      <TaskFilters filters={filters} setFilters={setFilters} members={members} sprints={sprints} placeholder="Search list" />
      {canCreate ? (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2">
          <div>
            <h2 className="text-sm font-semibold">Work</h2>
          <p className="text-xs text-muted-foreground">Track and update space issues.</p>
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
        <table className="w-full min-w-[1640px] table-fixed text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="w-10 px-3 py-2"><input data-row-control="true" type="checkbox" checked={selectedIds.length === sortedTasks.length && sortedTasks.length > 0} onChange={(event) => setSelectedIds(event.target.checked ? sortedTasks.map((task) => task.id) : [])} /></th>
              {[
                ["title", "Work", "w-[430px]"],
                ["status", "Status", "w-[165px]"],
                ["priority", "Priority", "w-[145px]"],
                ["assignee", "Assignee", "w-[170px]"],
                ["reporter", "Reporter", "w-[150px]"],
                ["sprint", "Sprint", "w-[140px]"],
                ["dueDate", "Due date", "w-[175px]"],
                ["createdAt", "Created", "w-[135px]"],
                ["updatedAt", "Updated", "w-[135px]"],
              ].map(([field, label, widthClass]) => (
                <th key={field} className={cn("whitespace-nowrap px-3 py-2", widthClass)}>
                  <button className="font-semibold" onClick={() => changeSort(field === "assignee" || field === "sprint" || field === "reporter" ? "title" : field)}>{label}</button>
                </th>
              ))}
              <th className="w-12 px-3 py-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task) => (
              <tr
                key={task.id}
                className="cursor-pointer border-t hover:bg-accent/40"
                tabIndex={0}
                title="Click to open issue details"
                onClick={(event) => handleRowOpen(event, task)}
                onDoubleClick={(event) => handleRowOpen(event, task)}
                onKeyDown={(event) => openTaskFromKeyboard(event, () => setSelectedTask(task))}
              >
                <td className="whitespace-nowrap px-3 py-2" onDoubleClick={(event) => event.stopPropagation()}><input data-row-control="true" type="checkbox" checked={selectedIds.includes(task.id)} onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id))} /></td>
                <td className="px-3 py-2" onDoubleClick={(event) => handleIssueCellDoubleClick(event, task)}>
                  <div className="flex min-w-0 items-center gap-2 whitespace-nowrap text-left">
                    <span className="truncate font-medium hover:text-primary">{task.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{issueKey(activeProject, task)}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-2" onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}><InlineStatus task={task} onUpdate={(payload) => updateTaskMutation.mutate({ taskId: task.id, payload })} /></td>
                <td className="whitespace-nowrap px-3 py-2" onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}><InlinePriority task={task} onUpdate={(payload) => updateTaskMutation.mutate({ taskId: task.id, payload })} /></td>
                <td className="whitespace-nowrap px-3 py-2" onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}><InlineAssignee task={task} members={members} disabled={!canAssign} onUpdate={(payload) => updateTaskMutation.mutate({ taskId: task.id, payload })} /></td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{task.createdBy?.name || task.createdBy?.email || "Unknown"}</td>
                <td className="whitespace-nowrap px-3 py-2" onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}><InlineSprint task={task} sprints={sprints} onUpdate={(payload) => updateTaskMutation.mutate({ taskId: task.id, payload })} /></td>
                <td className="whitespace-nowrap px-3 py-2" onClick={(event) => event.stopPropagation()} onDoubleClick={(event) => event.stopPropagation()}><Input data-row-control="true" className="h-8 w-36" type="date" value={task.dueDate?.slice(0, 10) || ""} onChange={(event) => updateTaskMutation.mutate({ taskId: task.id, payload: { dueDate: event.target.value || null } })} /></td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(task.createdAt)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatDate(task.updatedAt)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right" onClick={(event) => event.stopPropagation()}>
                  <TaskActionsMenu task={task} moveOptions={moveScopeOptions} onView={() => setSelectedTask(task)} onDelete={() => deleteTaskMutation.mutate(task.id)} onMoveTo={(targetScopeId) => moveTaskToScope(task, targetScopeId)} />
                </td>
              </tr>
            ))}
            {!sortedTasks.length ? (
              <tr><td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">No issues match this view.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <PaginationControls pagination={pagination} onPageChange={onPageChange} />
    </div>
  );
}

function TaskFilters({ filters, setFilters, members, sprints = [], placeholder }) {
  const { statuses } = useIssueStatuses();
  const [draftFilters, setDraftFilters] = useState(filters);
  const hasSearchValue = draftFilters.search.trim().length > 0;

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  function updateFilters(patch) {
    const nextFilters = { ...draftFilters, ...patch };
    setDraftFilters(nextFilters);
    setFilters({ ...nextFilters, search: nextFilters.search.trim() });
  }

  function clearFilters() {
    const emptyFilters = { search: "", status: "", priority: "", assigneeId: "", sprintId: "" };
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  }

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
      <div className="relative w-full min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-8 rounded pl-8 text-sm"
          placeholder={placeholder}
          value={draftFilters.search}
          onChange={(event) => updateFilters({ search: event.target.value })}
        />
      </div>
      <select className="h-8 rounded border bg-background px-2.5 text-sm" value={draftFilters.assigneeId} onChange={(event) => updateFilters({ assigneeId: event.target.value })}>
        <option value="">All assignees</option>
        {members.map((member) => <option key={member.userId} value={member.userId}>{member.user?.name || member.user?.email}</option>)}
      </select>
      <select className="h-8 rounded border bg-background px-2.5 text-sm" value={draftFilters.status} onChange={(event) => updateFilters({ status: event.target.value })}>
        <option value="">All statuses</option>
        {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
      </select>
      <select className="h-8 rounded border bg-background px-2.5 text-sm" value={draftFilters.priority} onChange={(event) => updateFilters({ priority: event.target.value })}>
        <option value="">All priorities</option>
        {PRIORITIES.map((priority) => <PriorityOption key={priority} priority={priority} />)}
      </select>
      <select className="h-8 rounded border bg-background px-2.5 text-sm" value={draftFilters.sprintId || ""} onChange={(event) => updateFilters({ sprintId: event.target.value })}>
        <option value="">All planning</option>
        <option value="backlog">Backlog</option>
        {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
      </select>
      {hasSearchValue ? (
        <Button variant="outline" className="h-8 rounded px-2.5 text-sm" onClick={clearFilters}>
          <Filter className="h-3.5 w-3.5" />
          Clear
        </Button>
      ) : null}
    </div>
  );
}

function InlineStatus({ task, onUpdate }) {
  const { statuses } = useIssueStatuses();
  const statusOptions = statuses.map((status) => ({ value: status.value, label: status.label }));

  return (
    <InlineDropdown
      value={task.status}
      options={statusOptions}
      onChange={(status) => onUpdate({ status })}
      ariaLabel={`Set status for ${task.title}`}
      size="comfortable"
    />
  );
}

function InlinePriority({ task, onUpdate }) {
  const priorityOptions = PRIORITIES.map((priority) => ({
    value: priority,
    label: priority,
    className: PRIORITY_TONES[priority],
    style: { color: PRIORITY_OPTION_COLORS[priority], font: "inherit", fontWeight: 600 },
  }));
  const priorityTone = PRIORITY_TONES[task.priority] || "text-muted-foreground";

  return (
    <InlineDropdown
      value={task.priority}
      options={priorityOptions}
      onChange={(priority) => onUpdate({ priority })}
      ariaLabel={`Set priority for ${task.title}`}
      className="font-semibold"
      valueClassName={priorityTone}
      size="comfortable"
    />
  );
}

function PriorityOption({ priority }) {
  return (
    <option value={priority} style={{ color: PRIORITY_OPTION_COLORS[priority], font: "inherit", fontWeight: 600 }}>
      {priority}
    </option>
  );
}

function InlineAssignee({ task, members, disabled, onUpdate }) {
  const assigneeOptions = [
    { value: "", label: "Unassigned" },
    ...members.map((member) => ({ value: member.userId, label: member.user?.name || member.user?.email })),
  ];

  return (
    <InlineDropdown
      value={task.assigneeId || ""}
      options={assigneeOptions}
      disabled={disabled}
      onChange={(assigneeId) => onUpdate({ assigneeId: assigneeId || null })}
      ariaLabel={`Assign ${task.title}`}
      size="comfortable"
    />
  );
}

function InlineSprint({ task, sprints, onUpdate }) {
  const sprintOptions = [
    { value: "", label: "Backlog" },
    ...sprints.filter((sprint) => sprint.status !== "COMPLETED").map((sprint) => ({ value: sprint.id, label: sprint.name })),
  ];

  return (
    <InlineDropdown
      value={task.sprintId || ""}
      options={sprintOptions}
      onChange={(sprintId) => onUpdate({ sprintId: sprintId || null })}
      ariaLabel={`Move ${task.title}`}
      size="comfortable"
    />
  );
}

function TaskActionsMenu({ task, onView, onDelete, canDelete = true, moveOptions = [], onMoveTo }) {
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const availableMoveOptions = moveOptions.filter((option) => option.value !== (task.sprintId || "backlog"));

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 160;
    const menuHeight = 44 + (availableMoveOptions.length ? 40 + (availableMoveOptions.length * 32) : 0) + (canDelete ? 40 : 0);
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
  }, [open, canDelete, availableMoveOptions.length]);

  return (
    <div className="inline-flex">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        aria-label={`Actions for ${task.title}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        onDoubleClick={(event) => event.stopPropagation()}
      >
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
          {availableMoveOptions.length && onMoveTo ? (
            <div className="mt-1 border-t pt-1">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase text-muted-foreground">Move to</p>
              {availableMoveOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center rounded px-2 py-1.5 text-left hover:bg-accent"
                  onClick={() => {
                    setOpen(false);
                    onMoveTo(option.value);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className="mt-1 flex w-full items-center rounded border-t px-2 py-1.5 text-left text-destructive hover:bg-accent"
              onClick={() => {
                setOpen(false);
                setConfirmDelete(true);
              }}
            >
              Delete
            </button>
          ) : null}
        </div>,
        document.body
      ) : null}
      <Dialog open={confirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete issue?</DialogTitle>
            <p className="text-sm text-muted-foreground">
              This permanently removes "{task.title}", including comments.
            </p>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SprintActionsMenu({ sprint, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 144;
    const menuHeight = (onEdit ? 36 : 0) + (onDelete ? 36 : 0) + 8;
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
  }, [open, onEdit, onDelete]);

  return (
    <div className="inline-flex">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded"
        aria-label={`Actions for ${sprint.name}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </Button>
      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          className="fixed z-[100] w-36 rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-lg"
          style={{ top: position.top, left: position.left }}
        >
          {onEdit ? (
            <button
              type="button"
              className="flex w-full items-center rounded px-2 py-1.5 text-left hover:bg-accent"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              Edit sprint
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              className="flex w-full items-center rounded px-2 py-1.5 text-left text-destructive hover:bg-accent"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              Delete sprint
            </button>
          ) : null}
        </div>,
        document.body
      ) : null}
    </div>
  );
}

function InlineDropdown({ value, options, onChange, ariaLabel, className, valueClassName, disabled = false, size = "compact" }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const selected = options.find((option) => option.value === value) || options[0];
  const isComfortable = size === "comfortable";

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = rect.width;
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - width - 8);
    setPosition({ top: rect.bottom + 4, left, width });
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
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        data-row-control="true"
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded border bg-background text-left disabled:cursor-not-allowed disabled:opacity-60",
          isComfortable ? "h-8 px-2 text-sm" : "h-7 px-1.5 text-xs",
          className
        )}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          setOpen((current) => !current);
        }}
        onDoubleClick={(event) => event.stopPropagation()}
      >
        <span className={cn("truncate", selected?.className, valueClassName)} style={selected?.style}>{selected?.label}</span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && typeof document !== "undefined" ? createPortal(
        <div
          ref={menuRef}
          className={cn(
            "fixed z-[100] max-h-56 overflow-auto rounded-md border bg-popover py-0.5 text-popover-foreground shadow-lg",
            isComfortable ? "text-sm" : "text-xs"
          )}
          style={{ top: position.top, left: position.left, width: position.width }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn("flex w-full items-center px-2 text-left hover:bg-accent", isComfortable ? "py-2" : "py-1.5", option.value === value ? "bg-accent" : "", option.className)}
              style={option.style}
              onClick={() => {
                setOpen(false);
                if (option.value !== value) onChange(option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>,
        document.body
      ) : null}
    </>
  );
}

function BacklogSection({
  title,
  sprint,
  items,
  selectedTaskIds,
  activeProject,
  members,
  emptyLabel,
  primaryAction,
  canCreate,
  canAssign,
  canManageSprints,
  moveScopeOptions,
  onToggleSection,
  onToggleTask,
  onCreate,
  onOpenTask,
  onPrimaryAction,
  onUpdateSprint,
  onUpdateTask,
  onDeleteTask,
  onRemoveTask,
  onMoveTaskToScope,
  onDeleteSprint,
  onEditSprint,
  onMoveTask,
  onDropTask,
  actionDisabled,
  actionPending,
}) {
  const statusCounts = getStatusBucketCounts(items);
  const allSelected = items.length > 0 && items.every((task) => selectedTaskIds.includes(task.id));
  const doneCount = statusCounts.done;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section
      className="overflow-hidden rounded-md border bg-background"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropTask?.(event, null)}
    >
      <div className="border-b bg-muted/50 px-3 py-2">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                aria-label={`Select ${title}`}
                checked={allSelected}
                onChange={(event) => onToggleSection(items, event.target.checked)}
              />
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded hover:bg-secondary"
                aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
                aria-expanded={!collapsed}
                onClick={() => setCollapsed((current) => !current)}
              >
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", collapsed ? "-rotate-90" : "rotate-0")} />
              </button>
              <h2 className="truncate text-sm font-semibold">{title}</h2>
              {sprint ? <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">{sprint.status}</span> : null}
              <span className="shrink-0 text-sm text-muted-foreground">{items.length} issue{items.length === 1 ? "" : "s"}</span>
            </div>
            {sprint?.goal ? <p className="mt-1 truncate pl-11 text-xs text-muted-foreground">{sprint.goal}</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <CountPill value={statusCounts.todo} tone="neutral" label="To do" />
            <CountPill value={statusCounts.progress} tone="blue" label="In progress" />
            <CountPill value={statusCounts.done} tone="green" label="Done" />
            <CountPill value={statusCounts.attention} tone="red" label="Needs attention" />
            {sprint ? (
              <div className="mx-1 hidden w-24 items-center gap-1 text-xs text-muted-foreground sm:flex">
                <div className="h-1.5 flex-1 overflow-hidden rounded bg-secondary">
                  <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                </div>
                <span>{progress}%</span>
              </div>
            ) : null}
            {sprint && canManageSprints ? (
              <div className="hidden items-center gap-1 text-sm text-muted-foreground md:inline-flex">
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
            {canManageSprints ? (
              <Button variant="outline" className="h-7 rounded px-2 text-xs" onClick={onPrimaryAction} disabled={actionDisabled || actionPending}>
                {primaryAction}
              </Button>
            ) : null}
            {sprint && canManageSprints ? (
              <SprintActionsMenu sprint={sprint} onEdit={onEditSprint} onDelete={onDeleteSprint} />
            ) : null}
          </div>
        </div>
      </div>

      {!collapsed ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] text-sm">
            <thead className="bg-muted/30 text-left text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="w-10 px-2 py-2" />
                <th className="w-8 px-2 py-2" />
                <th className="px-2 py-2">Issue</th>
                <th className="w-36 px-2 py-2">Status</th>
                <th className="w-28 px-2 py-2">Priority</th>
                <th className="w-28 px-2 py-2">Type</th>
                <th className="w-40 px-2 py-2">Assignee</th>
                <th className="w-36 px-2 py-2">Due</th>
                <th className="w-24 px-2 py-2">Estimate</th>
                <th className="w-12 px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDropTask?.(event, null)}>
              {items.length ? (
                items.map((task) => (
                  <BacklogRow
                    key={task.id}
                    task={task}
                    activeProject={activeProject}
                    members={members}
                    selected={selectedTaskIds.includes(task.id)}
                    canAssign={canAssign}
                    moveScopeOptions={moveScopeOptions}
                    onToggle={() => onToggleTask(task.id)}
                    onOpen={() => onOpenTask(task)}
                    onUpdate={(payload) => onUpdateTask(task, payload)}
                    onDelete={() => onDeleteTask?.(task)}
                    onMoveTo={(targetScopeId) => onMoveTaskToScope?.(task, targetScopeId)}
                    onRemove={onRemoveTask ? () => onRemoveTask(task) : null}
                    onMove={onMoveTask ? (direction) => onMoveTask(task, direction) : null}
                    onDropTask={(event) => onDropTask?.(event, task.id)}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyLabel || "No issues yet."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : null}

      {canCreate && !collapsed ? (
        <form
          className="flex h-10 min-w-[680px] items-center gap-2 border-t bg-background px-3"
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
          <input name="title" className="h-8 flex-1 bg-transparent text-sm outline-none" placeholder="Create issue" />
          <Button type="submit" variant="ghost" className="h-8 rounded px-2.5 text-sm">Create</Button>
        </form>
      ) : null}
    </section>
  );
}

function BacklogRow({ task, activeProject, members, selected, canAssign, moveScopeOptions = [], onToggle, onOpen, onUpdate, onDelete, onMoveTo, onDropTask }) {
  const { statuses } = useIssueStatuses();
  const priorityTone = PRIORITY_TONES[task.priority] || "text-muted-foreground";
  const statusOptions = statuses.map((item) => ({ value: item.value, label: item.label }));
  const priorityOptions = PRIORITIES.map((priority) => ({
    value: priority,
    label: priority,
    className: PRIORITY_TONES[priority],
    style: { color: PRIORITY_OPTION_COLORS[priority], fontWeight: 600 },
  }));
  const typeOptions = ISSUE_TYPES.map((type) => ({ value: type, label: type.replace("_", " ") }));
  const assigneeOptions = [
    { value: "", label: "Unassigned" },
    ...members.map((member) => ({ value: member.userId, label: member.user?.name || member.user?.email })),
  ];
  const stopRowOpen = (event) => event.stopPropagation();
  const controlProps = {
    "data-row-control": "true",
    onClick: stopRowOpen,
    onDoubleClick: stopRowOpen,
  };

  function handleRowDoubleClick(event) {
    if (isRowControlTarget(event.target)) return;
    onOpen();
  }

  function handleIssueCellDoubleClick(event) {
    event.stopPropagation();
    onOpen();
  }

  return (
    <tr
      className="border-t transition-colors hover:bg-accent/40"
      title="Double-click to open issue details"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.stopPropagation();
        onDropTask?.(event);
      }}
      onDoubleClick={handleRowDoubleClick}
    >
      <td className="px-2 py-1.5" onDoubleClick={stopRowOpen}>
        <input
          {...controlProps}
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          aria-label={`Select ${task.title}`}
          checked={selected}
          onChange={onToggle}
        />
      </td>
      <td className="px-2 py-1.5 text-muted-foreground" onDoubleClick={stopRowOpen}>
        <button
          type="button"
          draggable
          className="flex h-7 w-7 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-secondary active:cursor-grabbing"
          aria-label={`Drag ${task.title}`}
          {...controlProps}
          onDragStart={(event) => {
            event.stopPropagation();
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/task-id", task.id);
          }}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="min-w-0 px-2 py-1.5" onDoubleClick={handleIssueCellDoubleClick}>
        <div className="flex min-w-0 items-center gap-2">
          <ListTodo className="h-4 w-4 shrink-0 text-primary" />
          <span className="shrink-0 text-xs text-muted-foreground">{issueKey(activeProject, task)}</span>
          <span className="truncate font-medium text-foreground">{task.title}</span>
        </div>
      </td>
      <td className="px-2 py-1.5" onDoubleClick={stopRowOpen}>
        <InlineDropdown value={task.status} options={statusOptions} onChange={(status) => onUpdate({ status })} ariaLabel={`Set status for ${task.title}`} />
      </td>
      <td className="px-2 py-1.5" onDoubleClick={stopRowOpen}>
        <InlineDropdown value={task.priority} options={priorityOptions} onChange={(priority) => onUpdate({ priority })} ariaLabel={`Set priority for ${task.title}`} className="font-semibold" valueClassName={priorityTone} />
      </td>
      <td className="px-2 py-1.5" onDoubleClick={stopRowOpen}>
        <InlineDropdown value={task.type || "FEATURE"} options={typeOptions} onChange={(type) => onUpdate({ type })} ariaLabel={`Set type for ${task.title}`} />
      </td>
      <td className="px-2 py-1.5" onDoubleClick={stopRowOpen}>
        <div className="flex items-center gap-1">
          <UserAvatar user={task.assignee} className="h-6 w-6" fallbackClassName="bg-secondary text-[11px] text-muted-foreground" />
          <InlineDropdown value={task.assigneeId || ""} options={assigneeOptions} disabled={!canAssign} onChange={(assigneeId) => onUpdate({ assigneeId: assigneeId || null })} ariaLabel={`Assign ${task.title}`} className="min-w-0 flex-1" />
        </div>
      </td>
      <td className="px-2 py-1.5" onDoubleClick={stopRowOpen}>
        <Input {...controlProps} className="h-7 rounded px-1.5 text-xs" type="date" value={task.dueDate?.slice(0, 10) || ""} onChange={(event) => onUpdate({ dueDate: event.target.value || null })} aria-label={`Set due date for ${task.title}`} />
      </td>
      <td className="px-2 py-1.5" onDoubleClick={stopRowOpen}>
        <Input {...controlProps} className="h-7 rounded px-1.5 text-xs" type="number" min="0" value={task.estimate ?? ""} onChange={(event) => onUpdate({ estimate: event.target.value === "" ? null : Number(event.target.value) })} aria-label={`Set estimate for ${task.title}`} />
      </td>
      <td className="px-2 py-1.5" onClick={stopRowOpen} onDoubleClick={stopRowOpen}>
        <div className="flex justify-end gap-1">
          <TaskActionsMenu task={task} canDelete={Boolean(onDelete)} moveOptions={moveScopeOptions} onView={onOpen} onDelete={onDelete} onMoveTo={onMoveTo} />
        </div>
      </td>
    </tr>
  );
}

function getStatusBucketCounts(items) {
  return {
    todo: items.filter((task) => STATUS_BUCKETS.todo.includes(task.status)).length,
    progress: items.filter((task) => STATUS_BUCKETS.progress.includes(task.status)).length,
    done: items.filter((task) => STATUS_BUCKETS.done.includes(task.status)).length,
    attention: items.filter((task) => STATUS_BUCKETS.attention.includes(task.status)).length,
  };
}

function CountPill({ value, tone, label }) {
  const tones = {
    neutral: "bg-secondary text-muted-foreground",
    blue: "bg-primary/20 text-primary",
    green: "bg-green-100 text-green-700",
    red: "bg-destructive/10 text-destructive",
  };

  return (
    <span className={cn("flex h-5 min-w-6 items-center justify-center rounded px-1.5 text-xs font-medium", tones[tone])} title={label}>
      {value}
    </span>
  );
}

function Panel({ title, subtitle, action, children }) {
  return (
    <section className="rounded-md border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
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

function IssueCreateDialog({ open, setOpen, taskForm, setTaskForm, members, sprints, canAssign, submitTask, pending }) {
  const { statuses } = useIssueStatuses();
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
            <SelectField label="Type" value={taskForm.type} onChange={(value) => setTaskForm((current) => ({ ...current, type: value }))} options={ISSUE_TYPES.map((item) => [item, item.replaceAll("_", " ")])} />
            <SelectField label="Status" value={taskForm.status} onChange={(value) => setTaskForm((current) => ({ ...current, status: value }))} options={statuses.map((item) => [item.value, item.label])} />
            <SelectField label="Priority" value={taskForm.priority} onChange={(value) => setTaskForm((current) => ({ ...current, priority: value }))} options={PRIORITIES.map((item) => [item, item])} />
            <div className="space-y-2">
              <Label>Estimate</Label>
              <Input type="number" min="0" value={taskForm.estimate} onChange={(event) => setTaskForm((current) => ({ ...current, estimate: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Branch</Label>
              <Input placeholder="feature/issue-key" value={taskForm.branchName} onChange={(event) => setTaskForm((current) => ({ ...current, branchName: event.target.value }))} />
            </div>
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
  comments = [],
  comment,
  setComment,
  updateSelected,
  deleteMutation,
  commentMutation,
  commentsVersion = 0,
  standalone = false,
  compact = false,
}) {
  const { statuses } = useIssueStatuses();
  const planningSprints = sprints.filter((sprint) => sprint.status !== "COMPLETED");
  const taskUrl = `/spaces/${task.projectId}/issues/${task.id}`;
  const reporter = task.createdBy;
  const project = activeProject || task.project;
  const key = issueKey(project, task);
  const status = statuses.find((item) => item.value === task.status);
  const statusOptions = statuses.map((item) => [item.value, item.label]);
  const memberOptions = useMemo(() => {
    if (!task.assigneeId || members.some((member) => member.userId === task.assigneeId)) return members;
    return [...members, { userId: task.assigneeId, user: task.assignee }];
  }, [members, task.assignee, task.assigneeId]);
  const activityRef = useRef(null);
  const [activityVisible, setActivityVisible] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title || "");
  const [descriptionDraft, setDescriptionDraft] = useState(task.description || "");
  const [savingField, setSavingField] = useState("");
  const commentsQuery = useApiResource(() => getTaskComments(task.id), [activityVisible, task.id, commentsVersion], {
    enabled: Boolean(activityVisible && task.id),
  });
  const visibleComments = commentsQuery.data?.data || comments;
  const savingTitle = savingField === "title";
  const savingDescription = savingField === "description";

  useEffect(() => {
    setActivityVisible(false);
  }, [task.id]);

  useEffect(() => {
    setTitleDraft(task.title || "");
    setDescriptionDraft(task.description || "");
  }, [task.id, task.title, task.description]);

  useEffect(() => {
    const node = activityRef.current;
    if (!node || activityVisible) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setActivityVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActivityVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [activityVisible, task.id]);

  async function saveDraftField(field, value) {
    const serverValue = field === "title" ? task.title || "" : task.description || "";
    const nextValue = field === "title" ? value.trim() : value;
    if (field === "title" && !nextValue) {
      setTitleDraft(serverValue);
      return;
    }
    if (nextValue === serverValue) return;

    setSavingField(field);
    try {
      const result = await updateSelected(field, nextValue);
      if (!result?.success) {
        if (field === "title") setTitleDraft(serverValue);
        if (field === "description") setDescriptionDraft(serverValue);
      }
    } catch {
      if (field === "title") setTitleDraft(serverValue);
      if (field === "description") setDescriptionDraft(serverValue);
    } finally {
      setSavingField("");
    }
  }

  const detailCard = (
    <section id="work-item-details" className="rounded-md border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">Details</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Ownership, dates, and sprint placement</p>
      </div>
      <div className="space-y-3 p-4 text-sm">
        <DetailRow label="Assignee">
          <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={task.assigneeId || ""} disabled={!canAssign} onChange={(event) => updateSelected("assigneeId", event.target.value)}>
            <option value="">Unassigned</option>
            {memberOptions.map((member) => <option key={member.userId} value={member.userId}>{member.user?.name || member.user?.email}</option>)}
          </select>
        </DetailRow>
        <DetailRow label="Priority">
          <SelectField label="" value={task.priority} onChange={(value) => updateSelected("priority", value)} options={PRIORITIES.map((item) => [item, item])} />
        </DetailRow>
        <DetailRow label="Due date">
          <Input type="date" value={task.dueDate?.slice(0, 10) || ""} onChange={(event) => updateSelected("dueDate", event.target.value)} />
        </DetailRow>
        <DetailRow label="Sprint">
          <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={task.sprintId || ""} onChange={(event) => updateSelected("sprintId", event.target.value)}>
            <option value="">Backlog</option>
            {planningSprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name}</option>)}
          </select>
        </DetailRow>
        <DetailRow label="Reporter">
          <span className="inline-flex min-w-0 items-center gap-2">
            <UserAvatar user={reporter} className="h-6 w-6" fallbackClassName="bg-primary text-[10px] text-primary-foreground" />
            <span className="truncate">{reporter?.name || reporter?.email || "Unknown"}</span>
          </span>
        </DetailRow>
      </div>
    </section>
  );

  const issueHeader = (
    <section className={cn("rounded-md border bg-card", compact ? "p-4" : "p-5")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Spaces</span>
            <span>/</span>
            <span className="truncate">{project?.name || "Space"}</span>
            <span>/</span>
            <span className="font-medium text-foreground">{key}</span>
          </div>
          <div>
            <Input
              className={cn("h-auto min-h-10 border-0 bg-transparent px-0 py-0 font-semibold leading-tight shadow-none focus-visible:ring-0", compact ? "text-xl" : "text-2xl")}
              value={titleDraft}
              disabled={savingTitle}
              onChange={(event) => setTitleDraft(event.target.value)}
              onBlur={(event) => saveDraftField("title", event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              aria-label="Issue title"
            />
            <p className="mt-1 text-xs text-muted-foreground">{savingTitle ? "Saving title..." : `Updated ${relativeDate(task.updatedAt)}`}</p>
          </div>
        </div>
        {!standalone ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button asChild variant="outline" size="icon" className="h-8 w-8" aria-label="Open issue in full page">
              <a href={taskUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <TaskActionsMenu task={task} canDelete={canDelete} onView={() => window.open(taskUrl, "_blank", "noopener,noreferrer")} onDelete={() => deleteMutation.mutate(task.id)} />
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <IssueMetaPill icon={CheckCircle2} label="Status" value={status?.label || task.status} toneClass="text-primary" />
        <IssueMetaPill icon={ChevronsUp} label="Priority" value={task.priority} toneClass={PRIORITY_TONES[task.priority]} />
        <IssueMetaPill icon={UserRound} label="Assignee" value={task.assignee?.name || task.assignee?.email || "Unassigned"} />
        <IssueMetaPill icon={CalendarDays} label="Due" value={formatDate(task.dueDate)} />
      </div>

      {compact ? (
        <div className="mt-4">
          <SelectField label="Status" value={task.status} onChange={(value) => updateSelected("status", value)} options={statusOptions} />
        </div>
      ) : null}
    </section>
  );

  return (
    <div className={cn("min-h-[70vh] gap-5", compact ? "space-y-5" : standalone ? "grid lg:grid-cols-[minmax(0,1fr)_340px]" : "grid lg:grid-cols-[minmax(0,1fr)_300px]")}>
      <section className="min-w-0 space-y-5">
        {issueHeader}

        <nav className="flex flex-wrap gap-1 border-b pb-2 text-sm" aria-label="Issue sections">
          {[
            ["Description", "#work-item-description"],
            ["Details", "#work-item-details"],
            ["Activity", "#work-item-activity"],
          ].map(([label, href]) => (
            <a key={href} className="rounded-md px-2.5 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" href={href}>
              {label}
            </a>
          ))}
        </nav>

        <section id="work-item-description" className="rounded-md border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Description</h2>
            <span className="text-xs text-muted-foreground">{savingDescription ? "Saving..." : "Autosaves on blur"}</span>
          </div>
          <Textarea
            className="min-h-32 resize-y border bg-background p-3 shadow-none focus-visible:ring-1"
            placeholder="Add a description..."
            value={descriptionDraft}
            disabled={savingDescription}
            onChange={(event) => setDescriptionDraft(event.target.value)}
            onBlur={(event) => saveDraftField("description", event.target.value)}
            aria-label="Issue description"
          />
        </section>

        {compact ? detailCard : null}

        <section id="work-item-activity" ref={activityRef} className="rounded-md border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Activity</h2>
            </div>
            <span className="text-xs text-muted-foreground">{visibleComments.length} comments</span>
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
                  {commentMutation.isPending ? "Posting..." : "Comment"}
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {commentsQuery.isLoading ? (
              <p className="rounded-md border p-3 text-sm text-muted-foreground">Loading comments...</p>
            ) : null}
            {visibleComments.map((item) => (
              <div key={item.id} className="rounded-md border bg-background p-3 text-sm">
                <p>{item.content}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <UserAvatar user={item.user} className="h-6 w-6" />
                  <span>{item.user?.name || item.user?.email}</span>
                </div>
              </div>
            ))}
            {activityVisible && !commentsQuery.isLoading && !visibleComments.length ? (
              <p className="rounded-md border p-3 text-sm text-muted-foreground">No comments yet.</p>
            ) : null}
          </div>
        </section>
      </section>

      {!compact ? (
      <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-md border bg-card p-3">
          <SelectField label="Status" value={task.status} onChange={(value) => updateSelected("status", value)} options={statusOptions} />
        </div>
        {detailCard}
        <div className="rounded-md border bg-card p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock3 className="h-3.5 w-3.5" />
            <span>Created {relativeDate(task.createdAt)}</span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <TimerReset className="h-3.5 w-3.5" />
            <span>Updated {relativeDate(task.updatedAt)}</span>
          </div>
        </div>
      </aside>
      ) : null}
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center sm:gap-3">
      <span className="text-muted-foreground">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function IssueMetaPill({ icon: Icon, label, value, toneClass }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
      <Icon className={cn("h-4 w-4 shrink-0 text-muted-foreground", toneClass)} />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
        <p className="truncate font-medium">{value}</p>
      </div>
    </div>
  );
}

function IssueDetailDialog({
  selectedTaskId,
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
  detailVersion = 0,
  commentsVersion = 0,
  presentation = "modal",
}) {
  const detailQuery = useApiResource(() => getTask(projectId, selectedTaskId), [projectId, selectedTaskId, detailVersion], {
    enabled: Boolean(projectId && selectedTaskId),
  });
  const task = detailQuery.data?.data;
  const detailErrorMessage = detailQuery.data?.error?.message || detailQuery.error?.message || "";

  useEffect(() => {
    if (!selectedTaskId) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setSelectedTask(null);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedTaskId, setSelectedTask]);

  if (!selectedTaskId) return null;

  const detailContent = (
    <>
      <div className="flex h-12 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          Issue details
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close issue" onClick={() => setSelectedTask(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {detailQuery.isLoading ? (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">Loading issue...</p>
        ) : task ? (
          <WorkItemView
            task={task}
            activeProject={activeProject}
            members={members}
            canAssign={canAssign}
            canDelete={canDelete}
            canComment={canComment}
            sprints={sprints}
            comments={comments}
            commentsVersion={commentsVersion}
            comment={comment}
            setComment={setComment}
            updateSelected={updateSelected}
            deleteMutation={deleteMutation}
            commentMutation={commentMutation}
            compact
          />
        ) : (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">{detailErrorMessage || "Issue not found."}</p>
        )}
      </div>
    </>
  );

  if (presentation === "panel") {
    return (
      <aside
        className="fixed bottom-0 right-0 top-14 z-40 flex w-full flex-col border-l bg-background shadow-2xl sm:w-[82vw] lg:w-[var(--task-detail-width)]"
        style={{ "--task-detail-width": TASK_DETAIL_PANEL_WIDTH }}
        aria-label="Issue details"
      >
        {detailContent}
      </aside>
    );
  }

  return (
    <Dialog open={Boolean(selectedTaskId)}>
      <DialogContent
        className="flex h-[min(880px,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] max-w-[min(1120px,calc(100vw-2rem))] flex-col overflow-hidden rounded-md p-0"
        onClick={() => setSelectedTask(null)}
      >
        {detailContent}
      </DialogContent>
    </Dialog>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="space-y-2">
      {label ? <Label>{label}</Label> : null}
      <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </div>
  );
}
