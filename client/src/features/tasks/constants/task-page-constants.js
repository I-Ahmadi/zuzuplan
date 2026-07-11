import { CalendarRange, Globe2, LayoutGrid, List, ListTodo } from "lucide-react";

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const BACKLOG_LIMIT = 100;

export const STATUS_BUCKETS = {
  todo: ["TODO"],
  progress: ["IN_PROGRESS", "IN_REVIEW"],
  done: ["DONE"],
  attention: [],
};

export const PRIORITY_TONES = {
  LOW: "text-muted-foreground",
  MEDIUM: "text-orange-500",
  HIGH: "text-red-500",
  URGENT: "text-red-600",
};

export const PRIORITY_OPTION_COLORS = {
  LOW: "#94a3b8",
  MEDIUM: "#f97316",
  HIGH: "#ef4444",
  URGENT: "#dc2626",
};

export const PROJECT_TABS = [
  { value: "summary", label: "Summary", icon: Globe2 },
  { value: "backlog", label: "Backlog", icon: ListTodo },
  { value: "list", label: "List", icon: List },
  { value: "board", label: "Board", icon: LayoutGrid },
  { value: "timeline", label: "Timeline", icon: CalendarRange },
];

export const TASK_DETAIL_PANEL_WIDTH = "clamp(560px, 42vw, 720px)";
export const TASK_CONTENT_CLASS = "w-full px-3 sm:px-4 lg:px-5";

export const emptyTask = {
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
