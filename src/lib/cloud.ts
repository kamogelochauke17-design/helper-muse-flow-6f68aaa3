import { supabase } from "@/integrations/supabase/client";
import type { Project, ProjectData, Reference } from "@/lib/store";

type Row = {
  id: string;
  title: string;
  kind: string;
  status: string;
  deleted_at: string | null;
  references_json: unknown;
  attachments: unknown;
  data: unknown;
  created_at: string;
  updated_at: string;
};

export function rowToProject(r: Row): Project {
  return {
    id: r.id,
    title: r.title,
    kind: r.kind as Project["kind"],
    status: r.status as Project["status"],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at ?? undefined,
    references: (r.references_json as Reference[]) ?? [],
    attachments: (r.attachments as Project["attachments"]) ?? [],
    data: r.data as ProjectData,
  };
}

export async function cloudFetchAll(userId: string) {
  const [projects, notifications, profile] = await Promise.all([
    supabase.from("projects").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
    supabase.from("profiles").select("notifications_enabled").eq("id", userId).maybeSingle(),
  ]);

  return {
    projects: (projects.data ?? []).map((r) => rowToProject(r as unknown as Row)),
    notifications: (notifications.data ?? []).map((n) => ({
      id: n.id as string,
      text: n.text as string,
      at: n.created_at as string,
      read: n.read as boolean,
    })),
    notificationsEnabled: profile.data?.notifications_enabled ?? true,
  };
}

export async function cloudSaveProject(userId: string, p: Project) {
  await supabase.from("projects").upsert({
    id: p.id,
    user_id: userId,
    title: p.title,
    kind: p.kind,
    status: p.status,
    deleted_at: p.deletedAt ?? null,
    references_json: p.references as never,
    attachments: p.attachments as never,
    data: p.data as never,
  });
}

export async function cloudDeleteProject(id: string) {
  await supabase.from("projects").delete().eq("id", id);
}

export async function cloudAddNotification(
  userId: string,
  n: { id: string; text: string; at: string },
) {
  await supabase.from("notifications").insert({
    id: n.id,
    user_id: userId,
    text: n.text,
    created_at: n.at,
  });
}

export async function cloudSetNotificationsEnabled(userId: string, enabled: boolean) {
  await supabase
    .from("profiles")
    .upsert({ id: userId, notifications_enabled: enabled });
}
