"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import TaskForm from "@/components/tasks/task-form";
import TaskList from "@/components/tasks/task-list";
import TaskTabs from "@/components/tasks/task-tabs";
import TaskOverview from "@/components/tasks/task-overview";
import TaskBoard from "@/components/tasks/task-board";
import TaskTimeline from "@/components/tasks/task-timeline";
import TaskCalendar from "@/components/tasks/task-calendar";
import TaskNote from "@/components/tasks/task-note";
import { useTasks } from "@/hooks/use-tasks";

export default function Tasks() {
  const { addTask, tasks, updateTask, deleteTask } = useTasks();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <TaskOverview tasks={tasks} />;
      case "list":
        return <TaskList tasks={tasks} onEdit={updateTask} onDelete={deleteTask} />;
      case "board":
        return <TaskBoard tasks={tasks} onEdit={updateTask} onDelete={deleteTask} />;
      case "timeline":
        return <TaskTimeline tasks={tasks} />;
      case "calendar":
        return <TaskCalendar tasks={tasks} />;
      case "note":
        return <TaskNote tasks={tasks} />;
      default:
        return <TaskList tasks={tasks} onEdit={updateTask} onDelete={deleteTask} />;
    }
  };

  return (
    <div className="container mx-auto py-6 md:py-10 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Task Management
          </h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Create and manage your tasks
          </p>
        </div>
        <Button onClick={() => setIsOpen(!isOpen)} className="w-full sm:w-auto shrink-0">
          + New Task
        </Button>
      </div>

      <div className="mt-6">
        <TaskTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        <div className="mt-4">
          <TaskForm open={isOpen} onOpenChange={setIsOpen} onCreate={addTask} />
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}


        