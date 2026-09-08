import assert from "node:assert/strict";

import {
  isGatewayBillingError,
  readVercelOidcTokenFromRequestContext,
  resolveGuideTransport,
  VERCEL_AI_BILLING_URL,
} from "../src/lib/guide-config";

const requestToken = readVercelOidcTokenFromRequestContext({
  get: () => ({
    headers: { "x-vercel-oidc-token": "request-token" },
  }),
});
assert.equal(requestToken, "request-token");

const requestTokenArray = readVercelOidcTokenFromRequestContext({
  get: () => ({
    headers: { "x-vercel-oidc-token": ["first-token", "second-token"] },
  }),
});
assert.equal(requestTokenArray, "first-token");

assert.equal(
  readVercelOidcTokenFromRequestContext({
    get: () => {
      throw new Error("No request context");
    },
  }),
  ""
);

const requestOidc = resolveGuideTransport({}, "request-token");
assert.deepEqual(requestOidc, {
  kind: "vercel-ai-gateway",
  endpoint: "https://ai-gateway.vercel.sh/v1/responses",
  apiKey: "request-token",
  model: "openai/gpt-5-mini",
  credentialSource: "vercel-oidc-request",
});

const environmentOidc = resolveGuideTransport({
  VERCEL_OIDC_TOKEN: "environment-token",
});
assert.deepEqual(environmentOidc, {
  kind: "vercel-ai-gateway",
  endpoint: "https://ai-gateway.vercel.sh/v1/responses",
  apiKey: "environment-token",
  model: "openai/gpt-5-mini",
  credentialSource: "vercel-oidc-env",
});

const gatewayKey = resolveGuideTransport(
  {
    AI_GATEWAY_API_KEY: "gateway-key",
    OPENAI_API_KEY: "openai-key",
    VERCEL_OIDC_TOKEN: "environment-token",
    AI_GATEWAY_MODEL: "openai/gpt-5",
  },
  "request-token"
);
assert.equal(gatewayKey?.apiKey, "gateway-key");
assert.equal(gatewayKey?.model, "openai/gpt-5");
assert.equal(gatewayKey?.credentialSource, "ai-gateway-key");

const directOpenAI = resolveGuideTransport(
  {
    OPENAI_API_KEY: "openai-key",
    OPENAI_MODEL: "openai/gpt-5-mini",
    VERCEL_OIDC_TOKEN: "environment-token",
  },
  "request-token"
);
assert.deepEqual(directOpenAI, {
  kind: "openai",
  endpoint: "https://api.openai.com/v1/responses",
  apiKey: "openai-key",
  model: "gpt-5-mini",
  credentialSource: "openai-key",
});

const requestTokenPreferredOverEnvironment = resolveGuideTransport(
  { VERCEL_OIDC_TOKEN: "environment-token" },
  "request-token"
);
assert.equal(requestTokenPreferredOverEnvironment?.apiKey, "request-token");
assert.equal(
  requestTokenPreferredOverEnvironment?.credentialSource,
  "vercel-oidc-request"
);

const normalizedGatewayModel = resolveGuideTransport(
  { OPENAI_MODEL: "gpt-5" },
  "request-token"
);
assert.equal(normalizedGatewayModel?.model, "openai/gpt-5");

assert.equal(resolveGuideTransport({}), null);
assert.equal(
  resolveGuideTransport(
    {
      AI_GATEWAY_API_KEY: "   ",
      VERCEL_OIDC_TOKEN: "",
      OPENAI_API_KEY: " ",
    },
    " "
  ),
  null
);

assert.equal(
  isGatewayBillingError(
    "AI Gateway requires a valid credit card on file to service requests."
  ),
  true
);
assert.equal(
  isGatewayBillingError("Please add a card and unlock your free credits."),
  true
);
assert.equal(isGatewayBillingError("Insufficient credits."), true);
assert.equal(isGatewayBillingError("The model is temporarily unavailable."), false);
assert.ok(VERCEL_AI_BILLING_URL.startsWith("https://vercel.com/"));

console.log("Guide configuration tests passed");
