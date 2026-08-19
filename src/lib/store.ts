import { useCallback, useEffect, useState } from "react";

export type Classification = "Public" | "Internal" | "Confidential" | "Restricted";
export type ItemKind = "email" | "notes" | "task";
export type Priority = "high" | "medium" | "low";

export type EmailEvent = {
  type: "received" | "read" | "deleted" | "forwarded";
  at: string;
  detail?: string;
};

export type Reference = { title: string; url: string; summary?: string };

export type EmailItem = {
  kind: "email";
  subject: string;
  body: string;
  recipient: string;
  country: string;
  englishVariant: string;
  tones: string[];
  classification: Classification;
  noForward: boolean;
  events: EmailEvent[];
};

export type NotesItem = {
  kind: "notes";
  notes: string;
  summary: string;
  attendees: { name: string; email: string; present: boolean }[];
  decisions: string[];
  actions: { task: string; owner: string; deadline: string }[];
  mattersArising: string[];
  checklist: { text: string; done: boolean }[];
  tones: string[];
};

export type TaskItem = {
  kind: "task";
  description: string;
  deadline: string;
  members: string[];
  dependent: boolean;
  done: boolean;
  reminderSent: boolean;
};

export type ProjectData = EmailItem | NotesItem | TaskItem;

export type Project = {
  id: string;
  title: string;
  kind: ItemKind;
  status: "complete" | "draft" | "deleted";
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | undefined;
  references: Reference[];
  attachments: { name: string; excerpt: string }[];
  data: ProjectData;
};

export type AppState = {
  projects: Project[];
  notifications: { id: string; text: string; at: string; read: boolean }[];
  notificationsEnabled: boolean;
  theme: "light" | "dark";
};

const KEY = "apa-state-v1";

const initialState: AppState = {
  projects: [],
  notifications: [],
  notificationsEnabled: true,
  theme: "light",
};

let state: AppState = initialState;
let loaded = false;
const listeners = new Set<() => void>();

function load(): AppState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return { ...initialState, ...(JSON.parse(raw) as AppState) };
  } catch {
    /* ignore */
  }
  return initialState;
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function setState(updater: (prev: AppState) => AppState) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

export function useAppState() {
  const [, force] = useState(0);
  const [ready, setReady] = useState(loaded);

  useEffect(() => {
    if (!loaded) {
      state = load();
      loaded = true;
    }
    setReady(true);
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);

  const update = useCallback(setState, []);
  return { state: ready ? state : initialState, ready, update };
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function notify(text: string) {
  setState((s) =>
    s.notificationsEnabled
      ? {
          ...s,
          notifications: [
            { id: uid(), text, at: new Date().toISOString(), read: false },
            ...s.notifications,
          ].slice(0, 50),
        }
      : s,
  );
}

export function saveProject(p: Project) {
  setState((s) => {
    const exists = s.projects.some((x) => x.id === p.id);
    return {
      ...s,
      projects: exists
        ? s.projects.map((x) => (x.id === p.id ? p : x))
        : [p, ...s.projects],
    };
  });
}

export function deleteProject(id: string) {
  setState((s) => ({
    ...s,
    projects: s.projects.map((p) =>
      p.id === id
        ? { ...p, status: "deleted" as const, deletedAt: new Date().toISOString() }
        : p,
    ),
  }));
  notify("Item moved to Bin. It will be permanently deleted in 30 days.");
}

export function restoreProject(id: string) {
  setState((s) => ({
    ...s,
    projects: s.projects.map((p) =>
      p.id === id ? { ...p, status: "draft" as const, deletedAt: undefined } : p,
    ),
  }));
}

export function purgeProject(id: string) {
  setState((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) }));
}

export function daysLeftInBin(p: Project) {
  if (!p.deletedAt) return 30;
  const elapsed = (Date.now() - new Date(p.deletedAt).getTime()) / 86400000;
  return Math.max(0, Math.ceil(30 - elapsed));
}

export function priorityOf(deadline: string): Priority {
  if (!deadline) return "low";
  const days = (new Date(deadline).getTime() - Date.now()) / 86400000;
  if (days <= 2) return "high";
  if (days <= 7) return "medium";
  return "low";
}

export const TONES = [
  "polite",
  "warm",
  "persuasive",
  "professional",
  "formal",
  "friendly",
  "informal",
  "direct/concise",
  "apologetic",
  "assertive",
  "casual",
];

export const COUNTRIES: { country: string; variant: string }[] = [
  { country: "United Kingdom", variant: "British English" },
  { country: "United States", variant: "American English" },
  { country: "South Africa", variant: "South African English" },
  { country: "Australia", variant: "Australian English" },
  { country: "Canada", variant: "Canadian English" },
  { country: "Ireland", variant: "Irish English" },
  { country: "New Zealand", variant: "New Zealand English" },
  { country: "India", variant: "Indian English" },
  { country: "Nigeria", variant: "Nigerian English" },
  { country: "Singapore", variant: "Singapore English" },
];

export const LANGUAGES = [
  "English",
  "Afrikaans",
  "isiZulu",
  "Sesotho",
  "French",
  "Spanish",
  "Portuguese",
  "German",
  "Mandarin Chinese",
  "Arabic",
];

export const CLASSIFICATIONS: Classification[] = [
  "Public",
  "Internal",
  "Confidential",
  "Restricted",
];
