import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "backlog", label: "Backlog" },
  { id: "list", label: "List" },
  { id: "board", label: "Board" },
];

export default function TaskTabs({ activeTab, onTabChange }) {
  return (
    <div className="border-b border-border">
      <div className="-mb-px flex items-center gap-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id ? "rounded-t-md bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.id && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-foreground" />}
          </button>
        ))}
      </div>
    </div>
  );
}
