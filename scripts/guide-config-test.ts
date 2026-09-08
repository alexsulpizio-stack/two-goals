import assert from "node:assert/strict";

import { resolveGuideTransport } from "../src/lib/guide-config";

const oidc = resolveGuideTransport({
  VERCEL_OIDC_TOKEN: "oidc-token",
});
assert.deepEqual(oidc, {
  kind: "vercel-ai-gateway",
  endpoint: "https://ai-gateway.vercel.sh/v1/responses",
  apiKey: "oidc-token",
  model: "openai/gpt-5-mini",
});

const gatewayKey = resolveGuideTransport({
  AI_GATEWAY_API_KEY: "gateway-key",
  VERCEL_OIDC_TOKEN: "oidc-token",
  AI_GATEWAY_MODEL: "openai/gpt-5",
});
assert.equal(gatewayKey?.apiKey, "gateway-key");
assert.equal(gatewayKey?.model, "openai/gpt-5");

const normalizedGatewayModel = resolveGuideTransport({
  VERCEL_OIDC_TOKEN: "oidc-token",
  OPENAI_MODEL: "gpt-5",
});
assert.equal(normalizedGatewayModel?.model, "openai/gpt-5");

const directOpenAI = resolveGuideTransport({
  OPENAI_API_KEY: "openai-key",
  OPENAI_MODEL: "openai/gpt-5-mini",
});
assert.deepEqual(directOpenAI, {
  kind: "openai",
  endpoint: "https://api.openai.com/v1/responses",
  apiKey: "openai-key",
  model: "gpt-5-mini",
});

const gatewayPreferred = resolveGuideTransport({
  VERCEL_OIDC_TOKEN: "oidc-token",
  OPENAI_API_KEY: "openai-key",
});
assert.equal(gatewayPreferred?.kind, "vercel-ai-gateway");

assert.equal(resolveGuideTransport({}), null);
assert.equal(
  resolveGuideTransport({
    AI_GATEWAY_API_KEY: "   ",
    VERCEL_OIDC_TOKEN: "",
    OPENAI_API_KEY: " ",
  }),
  null
);

console.log("Guide configuration tests passed");
