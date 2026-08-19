import { createFileRoute, Link } from "@tanstack/react-router";
import { ListTodo, Mail, NotebookPen, ArrowRight } from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysLeftInBin, notify, priorityOf, useAppState } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Productivity Assistant — Emails, Minutes & Task Planning" },
      {
        name: "description",
        content:
          "Draft emails with tone and locale control, summarise meeting notes with attendance and actions, and plan tasks by deadline priority.",
      },
      { property: "og:title", content: "AI Productivity Assistant" },
      {
        property: "og:description",
        content: "One workspace for AI email drafting, meeting minutes and deadline-driven task planning.",
      },
    ],
  }),
  component: Index,
});

const MODULES = [
  {
    to: "/email",
    icon: Mail,
    title: "Email Generator",
    text: "Subject suggestions, country English variants, up to 3 tones, classification and translation.",
  },
  {
    to: "/notes",
    icon: NotebookPen,
    title: "Meeting Notes Summariser",
    text: "Attendance, absentees, decisions, actions, matters arising and a to-do checklist.",
  },
  {
    to: "/tasks",
    icon: ListTodo,
    title: "Task Planner",
    text: "Deadline-ranked priorities in red, yellow and green with reminders for shared tasks.",
  },
] as const;

function Index() {
  const { state, ready } = useAppState();

  const drafts = state.projects.filter((p) => p.status === "draft");
  const binned = state.projects.filter((p) => p.status === "deleted");
  const urgent = state.projects.filter(
    (p) => p.data.kind === "task" && !p.data.done && priorityOf(p.data.deadline) === "high",
  );

  useEffect(() => {
    if (!ready) return;
    if (drafts.length > 0) notify(`You have ${drafts.length} unfinished project(s) in Drafts.`);
    binned.forEach((p) =>
      notify(`"${p.title}" will be emptied from the Bin in ${daysLeftInBin(p)} days.`),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <AppShell>
      <section className="rounded-2xl border border-border bg-card p-8">
        <Badge variant="secondary">Your AI workspace</Badge>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Write, summarise and plan — in one place
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Generate polished emails, turn raw meeting notes into structured minutes, and keep
          every deadline ranked by urgency.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/email">
              Start a new project <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/library" search={{ tab: "all" }}>
              Open library
            </Link>
          </Button>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {MODULES.map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="group">
            <Card className="h-full transition-colors group-hover:border-primary">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="size-5 text-primary" /> {title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Saved projects" value={state.projects.filter((p) => p.status === "complete").length} />
        <Stat label="Drafts" value={drafts.length} />
        <Stat label="Urgent tasks" value={urgent.length} />
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-3xl font-bold text-primary">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
