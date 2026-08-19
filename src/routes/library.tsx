import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, RotateCcw, Search, Trash2 } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  daysLeftInBin,
  deleteProject,
  purgeProject,
  restoreProject,
  useAppState,
} from "@/lib/store";

type Tab = "all" | "email" | "notes" | "task" | "drafts" | "bin";

export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): { tab: Tab } => ({
    tab: (["all", "email", "notes", "task", "drafts", "bin"] as const).includes(
      search["tab"] as Tab,
    )
      ? (search["tab"] as Tab)
      : "all",
  }),
  head: () => ({
    meta: [
      { title: "Library — AI Productivity Assistant" },
      {
        name: "description",
        content:
          "Browse every email, meeting summary and task the assistant created, plus drafts, bin and saved references.",
      },
      { property: "og:title", content: "Library — AI Productivity Assistant" },
      {
        property: "og:description",
        content: "Search past projects, restore drafts and manage the 30-day bin.",
      },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { state } = useAppState();
  const [q, setQ] = useState("");

  const items = state.projects
    .filter((p) => {
      if (tab === "bin") return p.status === "deleted";
      if (p.status === "deleted") return false;
      if (tab === "drafts") return p.status === "draft";
      if (tab === "all") return true;
      return p.kind === tab;
    })
    .filter((p) =>
      q.trim()
        ? (p.title + JSON.stringify(p.data) + JSON.stringify(p.references))
            .toLowerCase()
            .includes(q.toLowerCase())
        : true,
    );

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Library</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything the assistant has produced — searchable and reusable as reference.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as Tab } })}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="email">Emails</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="task">Tasks</TabsTrigger>
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
            <TabsTrigger value="bin">Bin</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative ml-auto w-64">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search projects & references"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        )}
        {items.map((p) => (
          <Card key={p.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-start justify-between gap-2 text-base">
                <span>{p.title}</span>
                <Badge variant="outline" className="capitalize">
                  {p.kind}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">
                Updated {new Date(p.updatedAt).toLocaleString()} · {p.status}
                {p.status === "deleted" && ` · ${daysLeftInBin(p)} days before permanent deletion`}
              </p>
              <p className="line-clamp-3 text-muted-foreground">
                {p.data.kind === "email"
                  ? p.data.body
                  : p.data.kind === "notes"
                    ? p.data.summary || p.data.notes
                    : `${p.data.description} · due ${p.data.deadline}`}
              </p>
              {p.references.length > 0 && (
                <ul className="space-y-1">
                  {p.references.map((r, i) => (
                    <li key={i}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {r.title} <ExternalLink className="size-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex gap-2 pt-1">
                {p.status === "deleted" ? (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => restoreProject(p.id)}>
                      <RotateCcw className="size-4" /> Restore
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => purgeProject(p.id)}>
                      Delete now
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => deleteProject(p.id)}>
                    <Trash2 className="size-4" /> Move to bin
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
