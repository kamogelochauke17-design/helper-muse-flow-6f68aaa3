import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Languages, Loader2, Mail, Save, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ReferencePanel } from "@/components/ReferencePanel";
import { ToneSelect } from "@/components/ToneSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { summariseMeeting, translateText } from "@/lib/ai.functions";
import { LANGUAGES, notify, saveProject, uid, type Reference } from "@/lib/store";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Meeting Notes Summariser — AI Productivity Assistant" },
      {
        name: "description",
        content:
          "Summarise meeting notes, take attendance, mark absentees, capture decisions, actions and matters arising.",
      },
      { property: "og:title", content: "Meeting Notes Summariser" },
      {
        property: "og:description",
        content: "Attendance, decisions, actions, matters arising and a to-do checklist from raw notes.",
      },
    ],
  }),
  component: NotesPage,
});

type Attendee = { name: string; email: string; present: boolean };

function NotesPage() {
  const [id] = useState(uid);
  const [notes, setNotes] = useState("");
  const [tones, setTones] = useState<string[]>(["professional"]);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    decisions: string[];
    actions: { task: string; owner: string; deadline: string }[];
    mattersArising: string[];
    checklist: { text: string; done: boolean }[];
  } | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [attachments, setAttachments] = useState<{ name: string; excerpt: string }[]>([]);
  const [incoming, setIncoming] = useState("");
  const [language, setLanguage] = useState("English");
  const [translated, setTranslated] = useState("");

  const run = useServerFn(summariseMeeting);
  const translate = useServerFn(translateText);

  const absentees = attendees.filter((a) => !a.present);

  const summarise = async () => {
    if (!notes.trim()) return toast.error("Paste your meeting notes first");
    setLoading(true);
    try {
      const res = await run({
        data: {
          notes,
          tones,
          attendees: attendees.filter((a) => a.present).map((a) => a.name),
          absentees: absentees.map((a) => a.name),
        },
      });
      setResult({ ...res, checklist: res.checklist.map((t) => ({ text: t, done: false })) });
      toast.success("Minutes summarised");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Summary failed");
    } finally {
      setLoading(false);
    }
  };

  const save = (status: "complete" | "draft") => {
    saveProject({
      id,
      title: `Meeting minutes — ${new Date().toLocaleDateString()}`,
      kind: "notes",
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      references,
      attachments,
      data: {
        kind: "notes",
        notes,
        summary: result?.summary ?? "",
        attendees,
        decisions: result?.decisions ?? [],
        actions: result?.actions ?? [],
        mattersArising: result?.mattersArising ?? [],
        checklist: result?.checklist ?? [],
        tones,
      },
    });
    toast.success(status === "complete" ? "Saved to library" : "Saved to drafts");
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Meeting Notes Summariser</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Attendance, decisions, actions, matters arising and a checklist — from raw notes.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attendance register</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input
                  className="w-40"
                  placeholder="Member name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  className="w-56"
                  placeholder="member@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (!name.trim()) return;
                    setAttendees((a) => [...a, { name, email, present: true }]);
                    setName("");
                    setEmail("");
                  }}
                >
                  <UserPlus className="size-4" /> Add
                </Button>
              </div>
              <ul className="space-y-2">
                {attendees.map((a, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-md border border-border p-2">
                    <Checkbox
                      checked={a.present}
                      onCheckedChange={(v) =>
                        setAttendees((list) =>
                          list.map((x, j) => (j === i ? { ...x, present: Boolean(v) } : x)),
                        )
                      }
                    />
                    <span className="text-sm">{a.name}</span>
                    <span className="text-xs text-muted-foreground">{a.email}</span>
                    <Badge variant={a.present ? "default" : "destructive"} className="ml-auto">
                      {a.present ? "Present" : "Absent"}
                    </Badge>
                  </li>
                ))}
                {attendees.length === 0 && (
                  <li className="text-sm text-muted-foreground">No members added yet.</li>
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={10}
                placeholder="Paste raw meeting notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Label>Summary tone</Label>
              <ToneSelect value={tones} onChange={setTones} />
              <Button onClick={summarise} disabled={loading}>
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                Summarise minutes
              </Button>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Minutes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  rows={6}
                  value={result.summary}
                  onChange={(e) => setResult({ ...result, summary: e.target.value })}
                />
                <Section title="Decisions made" items={result.decisions} />
                <Section title="Matters arising for next meeting" items={result.mattersArising} />
                <div>
                  <h3 className="mb-2 text-sm font-semibold">Actions taken</h3>
                  <ul className="space-y-1 text-sm">
                    {result.actions.map((a, i) => (
                      <li key={i} className="rounded-md border border-border p-2">
                        <span className="font-medium">{a.task}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {a.owner || "unassigned"} · due {a.deadline || "TBC"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold">To-do checklist</h3>
                  <ul className="space-y-1">
                    {result.checklist.map((c, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={c.done}
                          onCheckedChange={(v) =>
                            setResult({
                              ...result,
                              checklist: result.checklist.map((x, j) =>
                                j === i ? { ...x, done: Boolean(v) } : x,
                              ),
                            })
                          }
                        />
                        <span className={c.done ? "line-through text-muted-foreground" : ""}>
                          {c.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (absentees.length === 0) return toast.info("No absentees to email");
                      notify(
                        `Minutes emailed to absentees: ${absentees.map((a) => a.email || a.name).join(", ")}`,
                      );
                      toast.success("Minutes queued for absentees");
                    }}
                  >
                    <Mail className="size-4" /> Email minutes to absentees
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (result.actions.length === 0) return toast.info("No assignments found");
                      result.actions.forEach((a) =>
                        notify(
                          `Assignment reminder sent to ${a.owner || "team"}: "${a.task}" due ${a.deadline || "TBC"}`,
                        ),
                      );
                      toast.success("Assignment reminders queued");
                    }}
                  >
                    <Mail className="size-4" /> Send assignment reminders
                  </Button>
                  <Button onClick={() => save("complete")}>
                    <Save className="size-4" /> Save to library
                  </Button>
                  <Button variant="outline" onClick={() => save("draft")}>
                    Save as draft
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Translate received notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={6}
                value={incoming}
                onChange={(e) => setIncoming(e.target.value)}
                placeholder="Paste notes in any language..."
              />
              <div className="flex gap-2">
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (!incoming.trim()) return;
                    const res = await translate({
                      data: {
                        text: incoming,
                        targetLanguage: language,
                        englishVariant: "British English",
                      },
                    });
                    setTranslated(res.translation);
                  }}
                >
                  <Languages className="size-4" /> Translate
                </Button>
              </div>
              {translated && <Textarea rows={8} readOnly value={translated} />}
            </CardContent>
          </Card>

          <ReferencePanel
            references={references}
            onChange={setReferences}
            attachments={attachments}
            onAttach={setAttachments}
          />
        </div>
      </div>
    </AppShell>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
        {items.length === 0 && <li>None recorded.</li>}
      </ul>
    </div>
  );
}
