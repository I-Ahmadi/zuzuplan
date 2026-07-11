export function taskKey(project, task) {
  return `${project?.key || "SPC"}-${task.id.slice(-4).toUpperCase()}`;
}
