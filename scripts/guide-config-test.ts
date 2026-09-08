import assert from "node:assert/strict";

import {
  readVercelOidcTokenFromRequestContext,
  resolveGuideTransport,
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
    VERCEL_OIDC_TOKEN: "environment-token",
    AI_GATEWAY_MODEL: "openai/gpt-5",
  },
  "request-token"
);
assert.equal(gatewayKey?.apiKey, "gateway-key");
assert.equal(gatewayKey?.model, "openai/gpt-5");
assert.equal(gatewayKey?.credentialSource, "ai-gateway-key");

const requestTokenPreferredOverEnvironment = resolveGuideTransport(
  { VERCEL_OIDC_TOKEN: "environment-token" },
  "request-token"
);
assert.equal(requestTokenPreferredOverEnvironment?.apiKey, "request-token");
assert.equal(
  requestTokenPreferredOverEnvironment?.credentialSource,
  "vercel-oidc-request"
);

const normalizedGatewayModel = resolveGuideTransport({}, "request-token");
assert.equal(normalizedGatewayModel?.model, "openai/gpt-5-mini");

const directOpenAI = resolveGuideTransport({
  OPENAI_API_KEY: "openai-key",
  OPENAI_MODEL: "openai/gpt-5-mini",
});
assert.deepEqual(directOpenAI, {
  kind: "openai",
  endpoint: "https://api.openai.com/v1/responses",
  apiKey: "openai-key",
  model: "gpt-5-mini",
  credentialSource: "openai-key",
});

const gatewayPreferred = resolveGuideTransport(
  { OPENAI_API_KEY: "openai-key" },
  "request-token"
);
assert.equal(gatewayPreferred?.kind, "vercel-ai-gateway");

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

console.log("Guide configuration tests passed");
