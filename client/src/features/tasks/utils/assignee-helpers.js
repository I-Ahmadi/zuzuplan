export function assigneeLabel(user) {
  return user?.name || user?.email || "Unknown member";
}

export function getAssigneeOptions(members, task) {
  const options = [
    { value: "", label: "Unassigned" },
    ...members.map((member) => ({ value: member.userId, label: assigneeLabel(member.user) })),
  ];

  if (task?.assigneeId && !options.some((option) => option.value === task.assigneeId)) {
    options.push({ value: task.assigneeId, label: assigneeLabel(task.assignee) });
  }

  return options;
}
