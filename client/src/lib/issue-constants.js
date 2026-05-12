export const ISSUE_STATUSES = [
  { value: "BACKLOG", label: "Backlog", color: "#6b7280" },
  { value: "READY", label: "Ready", color: "#0ea5e9" },
  { value: "IN_PROGRESS", label: "In Progress", color: "#82b832" },
  { value: "IN_REVIEW", label: "In Review", color: "#bf5af2" },
  { value: "READY_TO_MERGE", label: "Ready to Merge", color: "#14b8a6" },
  { value: "MERGED", label: "Merged", color: "#2563eb" },
  { value: "DEPLOYED", label: "Deployed", color: "#22c55e" },
  { value: "DONE", label: "Done", color: "#3478f6" },
  { value: "BLOCKED", label: "Blocked", color: "#ef4444" },
  { value: "CANCELED", label: "Canceled", color: "#71717a" },
];

export const BOARD_STATUSES = ISSUE_STATUSES.filter((status) =>
  ["BACKLOG", "IN_PROGRESS", "IN_REVIEW", "DONE"].includes(status.value)
);

export const ISSUE_STATUS_LABELS = Object.fromEntries(ISSUE_STATUSES.map((status) => [status.value, status.label]));

export const ISSUE_TYPES = ["BUG", "FEATURE", "CHORE", "TECH_DEBT", "SPIKE", "INCIDENT"];

export function isClosedIssue(status) {
  return ["DONE", "CANCELED"].includes(status);
}
