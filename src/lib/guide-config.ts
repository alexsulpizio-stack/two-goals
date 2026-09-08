export type GuideTransport = {
  kind: "vercel-ai-gateway" | "openai";
  endpoint: string;
  apiKey: string;
  model: string;
};

const DEFAULT_OPENAI_MODEL = "gpt-5-mini";
const DEFAULT_GATEWAY_MODEL = `openai/${DEFAULT_OPENAI_MODEL}`;

function clean(value: string | undefined): string {
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

export function resolveGuideTransport(
  env: Record<string, string | undefined>
): GuideTransport | null {
  const gatewayToken = clean(env.AI_GATEWAY_API_KEY) || clean(env.VERCEL_OIDC_TOKEN);

  if (gatewayToken) {
    return {
      kind: "vercel-ai-gateway",
      endpoint: "https://ai-gateway.vercel.sh/v1/responses",
      apiKey: gatewayToken,
      model: normalizeGatewayModel(env.AI_GATEWAY_MODEL || env.OPENAI_MODEL),
    };
  }

  const openaiKey = clean(env.OPENAI_API_KEY);
  if (!openaiKey) return null;

  return {
    kind: "openai",
    endpoint: "https://api.openai.com/v1/responses",
    apiKey: openaiKey,
    model: normalizeOpenAIModel(env.OPENAI_MODEL),
  };
}
