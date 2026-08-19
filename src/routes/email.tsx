import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Forward,
  Languages,
  Loader2,
  Mail,
  Save,
  ShieldAlert,
  SpellCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { ReferencePanel } from "@/components/ReferencePanel";
import { ToneSelect } from "@/components/ToneSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { correctGrammar, generateEmail, translateText } from "@/lib/ai.functions";
import {
  CLASSIFICATIONS,
  COUNTRIES,
  LANGUAGES,
  deleteProject,
  notify,
  saveProject,
  uid,
  type Classification,
  type EmailEvent,
  type Reference,
} from "@/lib/store";

export const Route = createFileRoute("/email")({
  head: () => ({
    meta: [
      { title: "Email Generator — AI Productivity Assistant" },
      {
        name: "description",
        content:
          "Generate emails with subject suggestions, country English variants, up to three tones, classification levels and translation.",
      },
      { property: "og:title", content: "Email Generator — AI Productivity Assistant" },
      {
        property: "og:description",
        content: "AI email drafting with tone, locale, grammar correction and translation.",
      },
    ],
  }),
  component: EmailPage,
});

function EmailPage() {
  const [id] = useState(uid);
  const [about, setAbout] = useState("");
  const [recipient, setRecipient] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]!.country);
  const [tones, setTones] = useState<string[]>(["professional"]);
  const [classification, setClassification] = useState<Classification>("Internal");
  const [noForward, setNoForward] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [references, setReferences] = useState<Reference[]>([]);
  const [attachments, setAttachments] = useState<{ name: string; excerpt: string }[]>([]);
  const [events, setEvents] = useState<EmailEvent[]>([]);
  const [incoming, setIncoming] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [translated, setTranslated] = useState("");
  const [forwardTo, setForwardTo] = useState("");

  const variant =
    COUNTRIES.find((c) => c.country === country)?.variant ?? "British English";

  const gen = useServerFn(generateEmail);
  const fix = useServerFn(correctGrammar);
  const translate = useServerFn(translateText);

  const logEvent = (type: EmailEvent["type"], detail?: string) => {
    const ev: EmailEvent = detail
      ? { type, at: new Date().toISOString(), detail }
      : { type, at: new Date().toISOString() };
    setEvents((e) => [ev, ...e]);
  };

  const build = (status: "complete" | "draft") => ({
    id,
    title: subject || about.slice(0, 60) || "Untitled email",
    kind: "email" as const,
    status,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    references,
    attachments,
    data: {
      kind: "email" as const,
      subject,
      body,
      recipient,
      country,
      englishVariant: variant,
      tones,
      classification,
      noForward,
      events,
    },
  });

  const generate = async () => {
    if (!about.trim()) { toast.error("Describe what the email is about first"); return; }
    setLoading(true);
    try {
      const res = await gen({
        data: { about, tones, country, englishVariant: variant, classification, recipient },
      });
      setSubject(res.subject);
      setBody(res.body);
      saveProject(build("draft"));
      toast.success("Email drafted — subject and body are editable");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const proof = async () => {
    if (!body.trim()) return;
    setLoading(true);
    try {
      const res = await fix({ data: { text: body, englishVariant: variant, targetLanguage: "English" } });
      setBody(res.corrected);
      toast.success(res.notes || `Corrected using ${variant}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Correction failed");
    } finally {
      setLoading(false);
    }
  };

  const doTranslate = async () => {
    if (!incoming.trim()) return;
    setLoading(true);
    try {
      const res = await translate({
        data: { text: incoming, targetLanguage, englishVariant: variant },
      });
      setTranslated(`(${res.detectedLanguage} → ${targetLanguage})\n\n${res.translation}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <h1 className="text-2xl font-bold tracking-tight">Email Generator</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe your email — the assistant suggests a subject and body you can edit.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Brief</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>What is the email about?</Label>
                <Textarea
                  rows={4}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="e.g. Ask the supplier to reschedule Friday's delivery to Monday"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Recipient</Label>
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="name@company.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Country / English variant</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.country} value={c.country}>
                          {c.country} — {c.variant}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Tone</Label>
                <ToneSelect value={tones} onChange={setTones} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Classification</Label>
                  <Select
                    value={classification}
                    onValueChange={(v) => setClassification(v as Classification)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSIFICATIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-3">
                  <Switch checked={noForward} onCheckedChange={setNoForward} id="nf" />
                  <Label htmlFor="nf" className="mb-2">
                    Do not allow forwarding
                  </Label>
                </div>
              </div>
              <Button onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                Generate email & subject
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                Draft
                <span className="flex items-center gap-1.5 text-xs font-normal">
                  <ShieldAlert className="size-3.5" />
                  <Badge variant={classification === "Public" ? "secondary" : "default"}>
                    {classification}
                  </Badge>
                  {noForward && <Badge variant="destructive">No forwarding</Badge>}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label>Subject (editable)</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Body (editable)</Label>
                <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={proof} disabled={loading}>
                  <SpellCheck className="size-4" /> Correct grammar ({variant})
                </Button>
                <Button
                  onClick={() => {
                    saveProject(build("complete"));
                    logEvent("received", recipient);
                    notify(`Email "${subject || "Untitled"}" saved to library.`);
                    toast.success("Saved to library");
                  }}
                >
                  <Save className="size-4" /> Save to library
                </Button>
                <Button variant="outline" onClick={() => saveProject(build("draft"))}>
                  Save as draft
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    saveProject(build("draft"));
                    deleteProject(id);
                    logEvent("deleted");
                  }}
                >
                  <Trash2 className="size-4" /> Move to bin
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Delivery tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => logEvent("received", recipient)}>
                  Mark received
                </Button>
                <Button size="sm" variant="outline" onClick={() => logEvent("read", recipient)}>
                  <CheckCircle2 className="size-4" /> Mark read
                </Button>
                <Button size="sm" variant="outline" onClick={() => logEvent("deleted", recipient)}>
                  Mark deleted
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Forwarded to (email)"
                  value={forwardTo}
                  onChange={(e) => setForwardTo(e.target.value)}
                  disabled={noForward}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={noForward || !forwardTo}
                  onClick={() => {
                    logEvent("forwarded", forwardTo);
                    notify(`Email forwarded to ${forwardTo}`);
                    setForwardTo("");
                  }}
                >
                  <Forward className="size-4" /> Log forward
                </Button>
              </div>
              {noForward && (
                <p className="text-xs text-destructive">
                  Forwarding is blocked for this email.
                </p>
              )}
              <ul className="space-y-1 text-sm">
                {events.length === 0 && (
                  <li className="text-muted-foreground">No activity recorded yet.</li>
                )}
                {events.map((e, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {e.type}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(e.at).toLocaleString()}
                      {e.detail ? ` · ${e.detail}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Translate a received email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={6}
                placeholder="Paste the received email..."
                value={incoming}
                onChange={(e) => setIncoming(e.target.value)}
              />
              <div className="flex gap-2">
                <Select value={targetLanguage} onValueChange={setTargetLanguage}>
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
                <Button onClick={doTranslate} disabled={loading} variant="secondary">
                  <Languages className="size-4" /> Translate
                </Button>
              </div>
              {translated && (
                <Textarea rows={8} value={translated} onChange={(e) => setTranslated(e.target.value)} />
              )}
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
