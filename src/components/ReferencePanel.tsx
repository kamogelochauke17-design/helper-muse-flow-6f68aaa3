import { ExternalLink, Loader2, Paperclip, Search } from "lucide-react";
import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { findReferences } from "@/lib/ai.functions";
import type { Reference } from "@/lib/store";

export function ReferencePanel({
  references,
  onChange,
  attachments,
  onAttach,
}: {
  references: Reference[];
  onChange: (r: Reference[]) => void;
  attachments: { name: string; excerpt: string }[];
  onAttach: (a: { name: string; excerpt: string }[]) => void;
}) {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const search = useServerFn(findReferences);

  const run = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const res = await search({ data: { topic } });
      onChange([...references, ...res.references]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reference search failed");
    } finally {
      setLoading(false);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: { name: string; excerpt: string }[] = [];
    for (const f of Array.from(files)) {
      const text = await f.text().catch(() => "");
      next.push({ name: f.name, excerpt: text.slice(0, 4000) });
    }
    onAttach([...attachments, ...next]);
    toast.success("Document attached as reference");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">References & research</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Search the web for reference material..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <Button onClick={run} disabled={loading} variant="secondary">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
          </Button>
        </div>

        <div className="space-y-2">
          {references.map((r, i) => (
            <a
              key={`${r.url}-${i}`}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-md border border-border p-2 hover:bg-accent"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                {r.title} <ExternalLink className="size-3" />
              </span>
              {r.summary && (
                <span className="text-xs text-muted-foreground">{r.summary}</span>
              )}
            </a>
          ))}
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Paperclip className="size-4" /> Attach document from device
          </Button>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {attachments.map((a) => (
              <li key={a.name}>{a.name}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
