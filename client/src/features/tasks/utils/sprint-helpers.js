export function getPlannedOrActiveSprints(sprints) {
  return sprints
    .filter((sprint) => sprint.status !== "COMPLETED")
    .slice()
    .sort((a, b) => {
      if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
      if (b.status === "ACTIVE" && a.status !== "ACTIVE") return 1;
      return new Date(a.startDate || a.createdAt || 0).getTime() - new Date(b.startDate || b.createdAt || 0).getTime();
    });
}

export function getMoveScopeOptions(sprints) {
  return [
    { value: "backlog", label: "Backlog" },
    ...getPlannedOrActiveSprints(sprints).map((sprint) => ({ value: sprint.id, label: sprint.name })),
  ];
}
