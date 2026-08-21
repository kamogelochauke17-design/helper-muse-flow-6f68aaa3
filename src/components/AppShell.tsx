import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Files,
  ListTodo,
  LogOut,
  Mail,
  Moon,
  NotebookPen,
  Plus,
  Search,
  Sun,
  Trash2,
  UserRound,
  LayoutDashboard,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useAppState, setState, setNotificationsEnabled } from "@/lib/store";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/email", label: "Email", icon: Mail },
  { to: "/notes", label: "Meeting Notes", icon: NotebookPen },
  { to: "/tasks", label: "Task Planner", icon: ListTodo },
  { to: "/library", label: "Library", icon: Files },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { state } = useAppState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", state.theme === "dark");
  }, [state.theme]);

  const unread = state.notifications.filter((n) => !n.read).length;
  const drafts = state.projects.filter((p) => p.status === "draft").length;
  const binned = state.projects.filter((p) => p.status === "deleted").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link to="/" className="mr-2 flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">
              AI
            </span>
            <span className="text-sm font-semibold tracking-tight sm:text-base">
              AI Productivity Assistant
            </span>
          </Link>

          <nav className="order-3 flex w-full flex-wrap gap-1 sm:order-none sm:w-auto">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  pathname === to
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Link
              to="/library"
              search={{ tab: "all" }}
              className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Search library"
            >
              <Search className="size-4" />
            </Link>
            <Link
              to="/library"
              search={{ tab: "drafts" }}
              className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Drafts"
            >
              <Files className="size-4" />
              {drafts > 0 && <Dot>{drafts}</Dot>}
            </Link>
            <Link
              to="/library"
              search={{ tab: "bin" }}
              className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              aria-label="Bin"
            >
              <Trash2 className="size-4" />
              {binned > 0 && <Dot>{binned}</Dot>}
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="size-4" />
                  {unread > 0 && <Dot>{unread}</Dot>}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  Notifications
                  <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                    On
                    <Switch
                      checked={state.notificationsEnabled}
                      onCheckedChange={(v) =>
                        setState((s) => ({ ...s, notificationsEnabled: v }))
                      }
                    />
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {state.notifications.length === 0 && (
                  <DropdownMenuItem disabled>No notifications yet</DropdownMenuItem>
                )}
                {state.notifications.slice(0, 8).map((n) => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-0.5">
                    <span className="text-sm">{n.text}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(n.at).toLocaleString()}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              onClick={() =>
                setState((s) => ({ ...s, theme: s.theme === "dark" ? "light" : "dark" }))
              }
            >
              {state.theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
            </Button>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    aria-label="Account"
                  >
                    <UserRound className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOut className="mr-2 size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}

            <Button asChild size="sm" className="gap-1.5">
              <Link to="/email">
                <Plus className="size-4" /> New
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

function Dot({ children }: { children: ReactNode }) {
  return (
    <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]">
      {children}
    </Badge>
  );
}
