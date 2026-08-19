import { createFileRoute } from "@tanstack/react-router";
import { BellRing, CalendarClock, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  deleteProject,
  notify,
  priorityOf,
  saveProject,
  uid,
  useAppState,
  type Priority,
  type Project,
  type TaskItem,
} from "@/lib/store";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Task Planner — AI Productivity Assistant" },
      {
        name: "description",
        content:
          "Prioritise tasks by deadline with red, yellow and green urgency levels, shared members and email reminders.",
      },
      { property: "og:title", content: "Task Planner — AI Productivity Assistant" },
      {
        property: "og:description",
        content: "Deadline-driven prioritisation with reminders for dependent team members.",
      },
    ],
  }),
  component: TasksPage,
});

const priorityStyles: Record<Priority, string> = {
  high: "bg-destructive text-destructive-foreground",
  medium: "bg-warning text-foreground",
  low: "bg-success text-foreground",
};

const priorityLabel: Record<Priority, string> = {
  high: "Top priority",
  medium: "Medium",
  low: "Low",
};

function TasksPage() {
  const { state } = useAppState();
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [members, setMembers] = useState("");
  const [dependent, setDependent] = useState(false);

  const tasks = state.projects
    .filter((p): p is Project & { data: TaskItem } => p.kind === "task" && p.status !== "deleted")
    .sort(
      (a, b) =>
        new Date(a.data.deadline || "2999-01-01").getTime() -
        new Date(b.data.deadline || "2999-01-01").getTime(),
    );

  const add = () => {
    if (!description.trim() || !deadline) {
      toast.error("Add a description and a deadline");
      return;
    }
    const memberList = members
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    saveProject({
      id: uid(),
      title: description.slice(0, 60),
      kind: "task",
      status: "complete",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      references: [],
      attachments: [],
      data: {
        kind: "task",
        description,
        deadline,
        members: memberList,
        dependent,
        done: false,
        reminderSent: false,
      },
    });
    if (priorityOf(deadline) === "high") {
      notify(`Task "${description.slice(0, 40)}" is due soon — reminder email sent.`);
    }
    setDescription("");
    setDeadline("");
    setMembers("");
    setDependent(false);
    toast.success("Task added");
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Task Planner</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tasks are ranked by deadline: red is top priority, yellow medium, green low.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">New task</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 sm:col-span-2">
            <Label>Task</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Members (comma separated emails)</Label>
            <Input value={members} onChange={(e) => setMembers(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="dep" checked={dependent} onCheckedChange={setDependent} />
            <Label htmlFor="dep">Completion depends on other members</Label>
          </div>
          <div className="flex sm:justify-end">
            <Button onClick={add}>
              <Plus className="size-4" /> Add task
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks yet.</p>
        )}
        {tasks.map((t) => {
          const p = priorityOf(t.data.deadline);
          return (
            <Card key={t.id}>
              <CardContent className="flex flex-wrap items-center gap-3 py-4">
                <Checkbox
                  checked={t.data.done}
                  onCheckedChange={(v) =>
                    saveProject({
                      ...t,
                      updatedAt: new Date().toISOString(),
                      data: { ...t.data, done: Boolean(v) },
                    })
                  }
                />
                <div className="min-w-40 flex-1">
                  <p className={`font-medium ${t.data.done ? "line-through text-muted-foreground" : ""}`}>
                    {t.data.description}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" />
                    Due {new Date(t.data.deadline).toLocaleDateString()}
                    {t.data.members.length > 0 && ` · ${t.data.members.join(", ")}`}
                    {t.data.dependent && " · shared completion"}
                  </p>
                </div>
                <Badge className={priorityStyles[p]}>{priorityLabel[p]}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const to = t.data.dependent
                      ? t.data.members.join(", ") || "all members"
                      : t.data.members[0] || "owner";
                    notify(
                      `Reminder sent to ${to}: "${t.data.description}" is due ${new Date(t.data.deadline).toLocaleDateString()}.`,
                    );
                    toast.success("Reminder sent");
                  }}
                >
                  <BellRing className="size-4" /> Remind
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteProject(t.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
