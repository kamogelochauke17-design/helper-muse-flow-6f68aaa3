import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MODEL = "google/gemini-3.7-flash";

const EmailInput = z.object({
  about: z.string().min(1),
  tones: z.array(z.string()).max(3).default([]),
  country: z.string().default("United Kingdom"),
  englishVariant: z.string().default("British English"),
  classification: z.string().default("Internal"),
  recipient: z.string().default(""),
});

const SummaryInput = z.object({
  notes: z.string().min(1),
  tones: z.array(z.string()).max(3).default([]),
  attendees: z.array(z.string()).default([]),
  absentees: z.array(z.string()).default([]),
});

const TextInput = z.object({
  text: z.string().min(1),
  targetLanguage: z.string().default("English"),
  englishVariant: z.string().default("British English"),
});

async function callGateway(system: string, prompt: string, schema: z.ZodTypeAny) {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const { generateText, Output } = await import("ai");
  const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
  const gateway = createLovableAiGatewayProvider(key);
  const result = await generateText({
    model: gateway(MODEL),
    system,
    prompt,
    output: Output.object({ schema }),
  });
  return await result.output;
}

const emailSchema = z.object({ subject: z.string(), body: z.string() });

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => EmailInput.parse(i))
  .handler(async ({ data }) => {
    return (await callGateway(
      `You are an expert business email writer. Always write in ${data.englishVariant} spelling and conventions, appropriate for business norms in ${data.country}. Produce a concise, well-structured email plus a strong subject line.`,
      `Write an email about: ${data.about}\nRecipient: ${data.recipient || "unspecified"}\nTone(s): ${data.tones.join(", ") || "professional"}\nSensitivity classification: ${data.classification}`,
      emailSchema,
    )) as z.infer<typeof emailSchema>;
  });

const correctedSchema = z.object({ corrected: z.string(), notes: z.string() });

export const correctGrammar = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => TextInput.parse(i))
  .handler(async ({ data }) => {
    return (await callGateway(
      `You are a proofreader. Correct grammar, spelling and punctuation using ${data.englishVariant} conventions. Keep the author's meaning and tone.`,
      data.text,
      correctedSchema,
    )) as z.infer<typeof correctedSchema>;
  });

const translationSchema = z.object({ translation: z.string(), detectedLanguage: z.string() });

export const translateText = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => TextInput.parse(i))
  .handler(async ({ data }) => {
    return (await callGateway(
      `You are a professional translator. Translate the text into ${data.targetLanguage}. Also report the detected source language.`,
      data.text,
      translationSchema,
    )) as z.infer<typeof translationSchema>;
  });

const summarySchema = z.object({
  summary: z.string(),
  decisions: z.array(z.string()),
  actions: z.array(
    z.object({ task: z.string(), owner: z.string(), deadline: z.string() }),
  ),
  mattersArising: z.array(z.string()),
  checklist: z.array(z.string()),
});

export const summariseMeeting = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => SummaryInput.parse(i))
  .handler(async ({ data }) => {
    return (await callGateway(
      `You summarise meeting minutes. Write in a ${data.tones.join(", ") || "professional"} tone. Extract decisions, action items with owners and deadlines, matters arising for the next meeting, and a to-do checklist.`,
      `Attendees: ${data.attendees.join(", ") || "unknown"}\nAbsentees: ${data.absentees.join(", ") || "none"}\n\nNotes:\n${data.notes}`,
      summarySchema,
    )) as z.infer<typeof summarySchema>;
  });

const researchSchema = z.object({
  references: z.array(
    z.object({ title: z.string(), url: z.string(), summary: z.string() }),
  ),
});

export const findReferences = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ topic: z.string().min(1) }).parse(i))
  .handler(async ({ data }) => {
    return (await callGateway(
      "You suggest credible, well-known reference sources with real, stable URLs (official docs, major publications, standards bodies). Never invent deep links; prefer canonical homepages or well-known article URLs.",
      `Give 5 useful references for: ${data.topic}`,
      researchSchema,
    )) as z.infer<typeof researchSchema>;
  });
