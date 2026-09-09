import assert from "node:assert/strict";

import {
  createGuideSessionValue,
  GUIDE_ACCESS_COOKIE,
  isGuideAccessConfigured,
  isGuideRequestAuthorized,
  shouldRequireGuideAccess,
  verifyGuidePassword,
} from "../src/lib/guide-access";

const productionEnv = {
  NODE_ENV: "production",
  GUIDE_ACCESS_PASSWORD: "correct-horse-battery-staple",
};

assert.equal(isGuideAccessConfigured(productionEnv), true);
assert.equal(shouldRequireGuideAccess(productionEnv), true);
assert.equal(verifyGuidePassword("correct-horse-battery-staple", productionEnv), true);
assert.equal(verifyGuidePassword("wrong-password", productionEnv), false);

const token = createGuideSessionValue(productionEnv);
assert.ok(token);

const authorizedRequest = new Request("https://two-goals.example/api/guide", {
  headers: { cookie: `${GUIDE_ACCESS_COOKIE}=${token}` },
});
assert.equal(isGuideRequestAuthorized(authorizedRequest, productionEnv), true);

const unauthorizedRequest = new Request("https://two-goals.example/api/guide");
assert.equal(isGuideRequestAuthorized(unauthorizedRequest, productionEnv), false);

assert.equal(
  shouldRequireGuideAccess({ NODE_ENV: "production" }),
  true,
  "Production must fail closed when no Guide password is configured"
);
assert.equal(
  isGuideRequestAuthorized(unauthorizedRequest, { NODE_ENV: "production" }),
  false,
  "Production without a configured password must not authorize Guide"
);

assert.equal(
  shouldRequireGuideAccess({ NODE_ENV: "development" }),
  false,
  "Local development remains unlocked unless a password is explicitly configured"
);
assert.equal(
  isGuideRequestAuthorized(unauthorizedRequest, { NODE_ENV: "development" }),
  true
);

assert.equal(
  isGuideAccessConfigured({ GUIDE_ACCESS_PASSWORD: "too-short" }),
  false
);

console.log("Guide access tests passed");
