export const ISSUE_STATUSES = [
  { value: "TODO", label: "Todo", color: "#6b7280" },
  { value: "IN_PROGRESS", label: "In Progress", color: "#82b832" },
  { value: "IN_REVIEW", label: "In Review", color: "#bf5af2" },
  { value: "DONE", label: "Done", color: "#3478f6" },
];

export const BOARD_STATUSES = ISSUE_STATUSES;

export const ISSUE_STATUS_LABELS = Object.fromEntries(ISSUE_STATUSES.map((status) => [status.value, status.label]));

const CUSTOM_STATUS_COLORS = ["#f97316", "#14b8a6", "#eab308", "#ec4899", "#8b5cf6", "#22c55e", "#06b6d4", "#f43f5e"];

export function toIssueStatusValue(label) {
  return String(label || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export function makeIssueStatus(label, existing = []) {
  const cleanLabel = String(label || "").trim().replace(/\s+/g, " ");
  const value = toIssueStatusValue(cleanLabel);
  if (!cleanLabel || !value) return null;
  const duplicate = existing.some((status) => status.value === value || status.label.toLowerCase() === cleanLabel.toLowerCase());
  if (duplicate) return null;
  return {
    value,
    label: cleanLabel,
    color: CUSTOM_STATUS_COLORS[existing.length % CUSTOM_STATUS_COLORS.length],
    custom: true,
  };
}

export function mergeIssueStatuses(customStatuses = []) {
  const seen = new Set();
  return [...ISSUE_STATUSES, ...customStatuses]
    .filter((status) => status?.value && status?.label)
    .filter((status) => {
      if (seen.has(status.value)) return false;
      seen.add(status.value);
      return true;
    });
}

export function issueStatusLabel(value, statuses = ISSUE_STATUSES) {
  return statuses.find((status) => status.value === value)?.label || value;
}

export const LEGACY_ISSUE_STATUS_GROUPS = {
  TODO: ["TODO", "BACKLOG", "READY"],
  IN_PROGRESS: ["IN_PROGRESS", "READY_TO_MERGE", "BLOCKED"],
  IN_REVIEW: ["IN_REVIEW"],
  DONE: ["DONE", "MERGED", "DEPLOYED", "CANCELED", "CANCELLED"],
};

export function normalizeIssueStatus(status) {
  if (!status) return "TODO";
  const normalized = String(status).toUpperCase();
  const match = Object.entries(LEGACY_ISSUE_STATUS_GROUPS).find(([, values]) => values.includes(normalized));
  return match ? match[0] : normalized;
}

export function normalizeTaskStatusPayload(task) {
  if (!task) return task;
  return { ...task, status: normalizeIssueStatus(task.status) };
}

export const ISSUE_TYPES = ["BUG", "FEATURE", "CHORE", "TECH_DEBT", "SPIKE", "INCIDENT"];

export function isClosedIssue(status) {
  return status === "DONE";
}
