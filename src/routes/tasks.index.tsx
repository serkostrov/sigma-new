import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/app-layout";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { useTasks } from "@/lib/tasks-api";
import { TaskListView } from "@/components/task-list-view";
import { usePermissions } from "@/lib/permissions";

export const Route = createFileRoute("/tasks/")({ component: TasksPage });

function TasksPage() {
  const { data: tasks = [] } = useTasks();
  const { canCreateTasks, filterTasks } = usePermissions();
  const visibleTasks = useMemo(() => filterTasks(tasks), [tasks, filterTasks]);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Задачи"
        description="Все задачи по проектам и этапам"
        actions={
          canCreateTasks ? (
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Добавить задачу
            </button>
          ) : null
        }
      />

      <TaskListView tasks={visibleTasks} backContext={{ from: "tasks" }} />

      <TaskFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}