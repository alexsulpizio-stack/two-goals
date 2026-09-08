export type GuideCredentialSource =
  | "ai-gateway-key"
  | "vercel-oidc-request"
  | "vercel-oidc-env"
  | "openai-key";

export type GuideTransport = {
  kind: "vercel-ai-gateway" | "openai";
  endpoint: string;
  apiKey: string;
  model: string;
  credentialSource: GuideCredentialSource;
};

type RequestHeaderValue = string | string[] | undefined;

type VercelRequestContextProvider = {
  get?: () => {
    headers?: Record<string, RequestHeaderValue>;
  };
};

export const VERCEL_AI_BILLING_URL =
  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card";

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_GATEWAY_MODEL = `openai/${DEFAULT_OPENAI_MODEL}`;
const REQUEST_CONTEXT_SYMBOL = Symbol.for("@vercel/request-context");

function clean(value: string | undefined | null): string {
  return value?.trim() ?? "";
}

function normalizeGatewayModel(value: string | undefined): string {
  const model = clean(value) || DEFAULT_GATEWAY_MODEL;
  return model.includes("/") ? model : `openai/${model}`;
}

function normalizeOpenAIModel(value: string | undefined): string {
  const model = clean(value) || DEFAULT_OPENAI_MODEL;
  return model.startsWith("openai/") ? model.slice("openai/".length) : model;
}

function runtimeRequestContextProvider(): VercelRequestContextProvider | undefined {
  const contextGlobal = globalThis as typeof globalThis &
    Record<symbol, VercelRequestContextProvider | undefined>;
  return contextGlobal[REQUEST_CONTEXT_SYMBOL];
}

/**
 * Vercel injects its short-lived OIDC token into the current function request
 * context rather than exposing it as a conventional build-time environment
 * variable. Keep this lookup server-side and resolve it for every request.
 */
export function readVercelOidcTokenFromRequestContext(
  provider: VercelRequestContextProvider | undefined = runtimeRequestContextProvider()
): string {
  try {
    const value = provider?.get?.().headers?.["x-vercel-oidc-token"];
    return clean(Array.isArray(value) ? value[0] : value);
  } catch {
    return "";
  }
}

export function isGatewayBillingError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("valid credit card") ||
    normalized.includes("add a card") ||
    normalized.includes("add-credit-card") ||
    normalized.includes("unlock your free credits") ||
    normalized.includes("insufficient credits") ||
    normalized.includes("credit balance") ||
    normalized.includes("billing method")
  );
}

export function resolveGuideTransport(
  env: Record<string, string | undefined>,
  requestOidcToken?: string | null
): GuideTransport | null {
  const gatewayKey = clean(env.AI_GATEWAY_API_KEY);
  if (gatewayKey) {
    return {
      kind: "vercel-ai-gateway",
      endpoint: "https://ai-gateway.vercel.sh/v1/responses",
      apiKey: gatewayKey,
      model: normalizeGatewayModel(env.AI_GATEWAY_MODEL || env.OPENAI_MODEL),
      credentialSource: "ai-gateway-key",
    };
  }

  // An explicitly configured OpenAI key should override Vercel's automatic
  // OIDC route. This gives the project owner a deliberate escape hatch when
  // AI Gateway billing is unavailable or undesirable.
  const openaiKey = clean(env.OPENAI_API_KEY);
  if (openaiKey) {
    return {
      kind: "openai",
      endpoint: "https://api.openai.com/v1/responses",
      apiKey: openaiKey,
      model: normalizeOpenAIModel(env.OPENAI_MODEL),
      credentialSource: "openai-key",
    };
  }

  const requestToken = clean(requestOidcToken);
  if (requestToken) {
    return {
      kind: "vercel-ai-gateway",
      endpoint: "https://ai-gateway.vercel.sh/v1/responses",
      apiKey: requestToken,
      model: normalizeGatewayModel(env.AI_GATEWAY_MODEL || env.OPENAI_MODEL),
      credentialSource: "vercel-oidc-request",
    };
  }

  const environmentToken = clean(env.VERCEL_OIDC_TOKEN);
  if (environmentToken) {
    return {
      kind: "vercel-ai-gateway",
      endpoint: "https://ai-gateway.vercel.sh/v1/responses",
      apiKey: environmentToken,
      model: normalizeGatewayModel(env.AI_GATEWAY_MODEL || env.OPENAI_MODEL),
      credentialSource: "vercel-oidc-env",
    };
  }

  return null;
}
