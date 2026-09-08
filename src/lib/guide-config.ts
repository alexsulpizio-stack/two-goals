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

export function resolveGuideTransport(
  env: Record<string, string | undefined>,
  requestOidcToken?: string | null
): GuideTransport | null {
  const gatewayKey = clean(env.AI_GATEWAY_API_KEY);
  const requestToken = clean(requestOidcToken);
  const environmentToken = clean(env.VERCEL_OIDC_TOKEN);
  const gatewayToken = gatewayKey || requestToken || environmentToken;

  if (gatewayToken) {
    const credentialSource: GuideCredentialSource = gatewayKey
      ? "ai-gateway-key"
      : requestToken
        ? "vercel-oidc-request"
        : "vercel-oidc-env";

    return {
      kind: "vercel-ai-gateway",
      endpoint: "https://ai-gateway.vercel.sh/v1/responses",
      apiKey: gatewayToken,
      model: normalizeGatewayModel(env.AI_GATEWAY_MODEL || env.OPENAI_MODEL),
      credentialSource,
    };
  }

  const openaiKey = clean(env.OPENAI_API_KEY);
  if (!openaiKey) return null;

  return {
    kind: "openai",
    endpoint: "https://api.openai.com/v1/responses",
    apiKey: openaiKey,
    model: normalizeOpenAIModel(env.OPENAI_MODEL),
    credentialSource: "openai-key",
  };
}
