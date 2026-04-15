import { useParams } from "react-router-dom";

export default function Projects() {
  const { projectId } = useParams();

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 md:py-10">
      <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">
        {projectId ? `Project ${projectId}` : "Projects"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">
        {projectId
          ? "Project details are not connected yet, but the route is now handled in React Router."
          : "Your project workspace will appear here."}
      </p>
    </div>
  );
}
