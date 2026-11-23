// Server-only: Lovable AI Gateway provider. Never import from browser code.
import { createOpenAI } from "@ai-sdk/openai";

export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
export const TRANSLATION_MODEL = "openai/gpt-6.1-sol";
const RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

/** One provider per request; resends the gateway-issued run id on follow-up calls. */
export function createGatewayOpenAI(apiKey: string) {
  let runId: string | undefined;
  const runIdFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (runId && !headers.has(RUN_ID_HEADER)) headers.set(RUN_ID_HEADER, runId);
    const response = await fetch(input, { ...init, headers });
    runId ??= response.headers.get(RUN_ID_HEADER)?.trim() || undefined;
    return response;
  };
  return createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch as typeof fetch,
  });
}
