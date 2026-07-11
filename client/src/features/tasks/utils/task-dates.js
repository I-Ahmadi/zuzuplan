export function formatDate(date) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(date)
  );
}

export function relativeDate(date) {
  if (!date) return "None";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}
