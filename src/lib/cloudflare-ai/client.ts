/**
 * Cloudflare Workers AI REST API Client
 * Memanggil model LLM Llama 3.1 yang di-host di Cloudflare AI
 *
 * API endpoint: POST https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}
 * Docs: https://developers.cloudflare.com/workers-ai/models/llama-3.1-8b-instruct/
 */

import { ChatMessage } from "@/types/agent";

interface CloudflareAIResponse {
  result: {
    response?: string;
    // Chat completions format (newer API)
    choices?: Array<{
      message: { role: string; content: string };
      finish_reason: string;
    }>;
  };
  success: boolean;
  errors: Array<{ code: number; message: string }>;
}

interface CFAIRunOptions {
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

/**
 * Memanggil Cloudflare Workers AI dengan array messages (chat format)
 * dan mengembalikan teks respons dari LLM.
 */
export async function runCloudflareAI(options: CFAIRunOptions): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const model =
    process.env.CLOUDFLARE_AI_MODEL || "@cf/meta/llama-3.1-8b-instruct";

  if (!accountId || !apiToken) {
    throw new Error(
      "[CF AI] CLOUDFLARE_ACCOUNT_ID atau CLOUDFLARE_API_TOKEN tidak ditemukan di environment variables."
    );
  }

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const payload = {
    messages: options.messages,
    max_tokens: options.max_tokens ?? 800,
    temperature: options.temperature ?? 0.3, // Low temperature untuk respons terkontrol
    stream: false,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `[CF AI] API error HTTP ${response.status}: ${errorBody.substring(0, 300)}`
    );
  }

  const data = (await response.json()) as CloudflareAIResponse;

  if (!data.success && data.errors?.length > 0) {
    throw new Error(
      `[CF AI] API returned errors: ${JSON.stringify(data.errors)}`
    );
  }

  // Extract text dari berbagai format respons CF AI
  const text =
    data.result?.choices?.[0]?.message?.content || // OpenAI-compat format
    data.result?.response || // Legacy format
    "";

  if (!text) {
    throw new Error("[CF AI] LLM returned empty response");
  }

  return text.trim();
}
