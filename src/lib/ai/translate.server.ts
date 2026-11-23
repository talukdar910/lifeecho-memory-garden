// Server-only: translates one memory with Lovable AI.
import { APICallError, NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";
import { createGatewayOpenAI, TRANSLATION_MODEL } from "./gateway.server";

const schema = z.object({ title: z.string(), body: z.string().nullable() });

export class TranslationError extends Error {}

function friendly(err: unknown): string {
  const status = APICallError.isInstance(err) ? err.statusCode : undefined;
  if (status === 402) return "AI translation is paused: the workspace has run out of AI credits.";
  if (status === 429) return "Too many translations right now. Please try again in a minute.";
  if (status === 403) return "AI translation isn't available for this workspace right now.";
  return "The translation couldn't be completed. Please try again later.";
}

export async function translateMemoryText(
  apiKey: string,
  input: { title: string; body: string | null; languageName: string },
): Promise<{ title: string; body: string | null }> {
  const openai = createGatewayOpenAI(apiKey);
  try {
    const result = streamText({
      model: openai.responses(TRANSLATION_MODEL),
      instructions:
        `You translate personal memories for LifeEcho, a digital legacy platform. Translate the title and the text into ${input.languageName}. ` +
        "Keep the meaning, emotion, tone, names and line breaks. Do not add, explain or summarise anything. " +
        "If the text is already in that language, return it unchanged. Return body as null when there is no text.",
      messages: [
        {
          role: "user",
          content: `Title:\n${input.title}\n\nText:\n${input.body?.trim() ? input.body : "(none)"}`,
        },
      ],
      output: Output.object({ schema }),
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });
    const out = await result.output;
    const title = out.title.trim();
    if (!title) throw new TranslationError("The translation came back empty. Please try again later.");
    return { title, body: input.body ? (out.body?.trim() || null) : null };
  } catch (err) {
    if (err instanceof TranslationError) throw err;
    if (NoObjectGeneratedError.isInstance(err)) throw new TranslationError("The translation came back incomplete.");
    console.error("translateMemoryText failed", err);
    throw new TranslationError(friendly(err));
  }
}
