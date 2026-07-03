import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TaskAnalytics({ tasks }) {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "completed").length;
  const inProgress = tasks.filter((task) => task.status === "in-progress").length;

  const stats = [
    { label: "Total Tasks", value: total },
    { label: "In Progress", value: inProgress },
    { label: "Completed", value: completed },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader>
            <CardTitle className="text-base">{stat.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
