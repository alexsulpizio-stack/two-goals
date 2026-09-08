import { NextResponse } from "next/server";

import {
  isGatewayBillingError,
  readVercelOidcTokenFromRequestContext,
  resolveGuideTransport,
  VERCEL_AI_BILLING_URL,
} from "@/lib/guide-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

type GuideRequest = {
  question?: string;
  context?: unknown;
  includeTransactionDetails?: boolean;
};

type ErrorPayload = {
  error?: {
    message?: unknown;
  };
};

type RateBucket = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const RATE_LIMIT_SYMBOL = Symbol.for("two-goals.guide-rate-limit");

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const data = payload as { output_text?: unknown; output?: unknown };
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) return "";

  const chunks: string[] = [];
  for (const item of data.output) {
    if (!item || typeof item !== "object") continue;

    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    for (const part of content) {
      if (!part || typeof part !== "object") continue;

      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }

  return chunks.join("\n").trim();
}

function extractErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const message = (payload as ErrorPayload).error?.message;
  return typeof message === "string" ? message.trim() : "";
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: { message: text.slice(0, 500) } };
  }
}

function guideTransport() {
  return resolveGuideTransport(
    process.env,
    readVercelOidcTokenFromRequestContext()
  );
}

function isAllowedOrigin(request: Request): boolean {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  const expectedHost =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!expectedHost) return true;

  try {
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}

function rateLimitStore(): Map<string, RateBucket> {
  const contextGlobal = globalThis as typeof globalThis &
    Record<symbol, Map<string, RateBucket> | undefined>;

  let store = contextGlobal[RATE_LIMIT_SYMBOL];
  if (!store) {
    store = new Map<string, RateBucket>();
    contextGlobal[RATE_LIMIT_SYMBOL] = store;
  }

  return store;
}

function rateLimit(request: Request): { allowed: boolean; retryAfter: number } {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientKey =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const now = Date.now();
  const store = rateLimitStore();
  const current = store.get(clientKey);

  if (!current || current.resetAt <= now) {
    store.set(clientKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, retryAfter: 0 };
  }

  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export async function GET() {
  const transport = guideTransport();

  return NextResponse.json(
    transport
      ? {
          status: "ready",
          provider: transport.kind,
          model: transport.model,
          credentialSource: transport.credentialSource,
          note:
            transport.kind === "vercel-ai-gateway"
              ? "Credential available. AI Gateway billing is verified only when a request is submitted."
              : "Direct OpenAI credential available.",
        }
      : {
          status: "not_configured",
          provider: null,
          model: null,
          credentialSource: null,
        },
    {
      status: transport ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: "Guide only accepts requests from Two Goals.", code: "forbidden_origin" },
      { status: 403 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 100_000) {
    return NextResponse.json(
      { error: "Guide context is too large.", code: "request_too_large" },
      { status: 413 }
    );
  }

  const limit = rateLimit(request);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: "Guide has received several requests. Try again in a few minutes.",
        code: "rate_limited",
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter) },
      }
    );
  }

  const transport = guideTransport();
  if (!transport) {
    return NextResponse.json(
      {
        error:
          "Guide has no usable server-side AI provider. Configure OPENAI_API_KEY, AI_GATEWAY_API_KEY, or Vercel AI Gateway.",
        code: "not_configured",
      },
      { status: 503 }
    );
  }

  let body: GuideRequest;
  try {
    body = (await request.json()) as GuideRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const question = String(body.question ?? "").trim().slice(0, 4000);
  if (!question) {
    return NextResponse.json({ error: "Ask Guide a question first." }, { status: 400 });
  }

  const contextText = JSON.stringify(body.context ?? {}, null, 2).slice(0, 40000);
  const instructions = [
    "You are Guide inside a private app called Two Goals.",
    "The app has two priorities in this order: (1) live eternally with Jesus Christ; (2) live financially independent.",
    "Be concrete, concise, and action-oriented. Explain calculations when asked. Challenge assumptions when the numbers do not support the target.",
    "Do not imply that spiritual practices earn salvation. Do not turn spiritual activity into a score.",
    "For finance, distinguish planning guidance from professional financial, tax, legal, or investment advice.",
    "Use only the structured context supplied by the app. Never claim access to the user's raw Quicken file, bank account, or data not included in the request.",
    "When reviewing Quicken classifications, call out uncertainty, suspicious categories, transfers, missing account types, and anything that could materially distort averages.",
    "End with one clear next action when a next action is appropriate.",
  ].join(" ");

  const requestBody = {
    model: transport.model,
    instructions,
    input: `TWO GOALS CONTEXT\n${contextText}\n\nUSER QUESTION\n${question}`,
    max_output_tokens: 1200,
    ...(transport.kind === "vercel-ai-gateway"
      ? {
          providerOptions: {
            gateway: {
              disallowPromptTraining: true,
            },
          },
        }
      : {}),
  };

  try {
    const response = await fetch(transport.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${transport.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });

    const payload = await parseResponse(response);
    if (!response.ok) {
      const message = extractErrorMessage(payload) || "Guide could not complete this request.";

      if (
        transport.kind === "vercel-ai-gateway" &&
        isGatewayBillingError(message)
      ) {
        return NextResponse.json(
          {
            error:
              "Guide reached Vercel AI Gateway, but AI Gateway billing is not enabled for this workspace.",
            code: "gateway_billing_required",
            setupUrl: VERCEL_AI_BILLING_URL,
            alternative:
              "Alternatively, add a funded OPENAI_API_KEY to the Vercel project. Two Goals will then use OpenAI directly instead of the Gateway.",
          },
          { status: 402 }
        );
      }

      return NextResponse.json(
        { error: message, code: "provider_error" },
        { status: response.status }
      );
    }

    const answer = extractText(payload);
    if (!answer) {
      return NextResponse.json(
        { error: "Guide returned no text.", code: "empty_response" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      answer,
      provider: transport.kind,
      model: transport.model,
      credentialSource: transport.credentialSource,
    });
  } catch {
    return NextResponse.json(
      { error: "Guide could not reach the AI service.", code: "service_unavailable" },
      { status: 502 }
    );
  }
}
