import { NextResponse } from "next/server";

import {
  createGuideSessionValue,
  GUIDE_ACCESS_COOKIE,
  GUIDE_ACCESS_MAX_AGE_SECONDS,
  isGuideAccessConfigured,
  isGuideRequestAuthorized,
  shouldRequireGuideAccess,
  verifyGuidePassword,
} from "@/lib/guide-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AccessBody = {
  password?: string;
};

type AttemptBucket = {
  count: number;
  resetAt: number;
};

const ATTEMPT_WINDOW_MS = 10 * 60 * 1000;
const ATTEMPT_MAX = 8;
const ATTEMPT_STORE_SYMBOL = Symbol.for("two-goals.guide-access-attempts");

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

function attemptStore(): Map<string, AttemptBucket> {
  const contextGlobal = globalThis as typeof globalThis &
    Record<symbol, Map<string, AttemptBucket> | undefined>;

  let store = contextGlobal[ATTEMPT_STORE_SYMBOL];
  if (!store) {
    store = new Map<string, AttemptBucket>();
    contextGlobal[ATTEMPT_STORE_SYMBOL] = store;
  }

  return store;
}

function clientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return (
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function registerAttempt(request: Request): {
  allowed: boolean;
  retryAfter: number;
  key: string;
} {
  const key = clientKey(request);
  const now = Date.now();
  const store = attemptStore();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + ATTEMPT_WINDOW_MS });
    return { allowed: true, retryAfter: 0, key };
  }

  if (current.count >= ATTEMPT_MAX) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
      key,
    };
  }

  current.count += 1;
  return { allowed: true, retryAfter: 0, key };
}

export async function GET(request: Request) {
  const required = shouldRequireGuideAccess(process.env);
  const configured = isGuideAccessConfigured(process.env);
  const authorized = isGuideRequestAuthorized(request, process.env);

  return NextResponse.json(
    {
      required,
      configured,
      authorized,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: "Guide access can only be unlocked from Two Goals." },
      { status: 403 }
    );
  }

  if (!isGuideAccessConfigured(process.env)) {
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Guide access is locked because GUIDE_ACCESS_PASSWORD is not configured."
            : "Guide access is not configured in this environment.",
        code: "access_not_configured",
      },
      { status: 503 }
    );
  }

  const attempt = registerAttempt(request);
  if (!attempt.allowed) {
    return NextResponse.json(
      {
        error: "Too many Guide unlock attempts. Try again in a few minutes.",
        code: "access_rate_limited",
      },
      {
        status: 429,
        headers: { "Retry-After": String(attempt.retryAfter) },
      }
    );
  }

  let body: AccessBody;
  try {
    body = (await request.json()) as AccessBody;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const password = String(body.password ?? "");
  if (!verifyGuidePassword(password, process.env)) {
    return NextResponse.json(
      { error: "That Guide access password is incorrect.", code: "invalid_password" },
      { status: 401 }
    );
  }

  attemptStore().delete(attempt.key);

  const token = createGuideSessionValue(process.env);
  if (!token) {
    return NextResponse.json(
      { error: "Guide access is not configured.", code: "access_not_configured" },
      { status: 503 }
    );
  }

  const response = NextResponse.json({ authorized: true });
  response.cookies.set({
    name: GUIDE_ACCESS_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: GUIDE_ACCESS_MAX_AGE_SECONDS,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function DELETE(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: "Guide access can only be changed from Two Goals." },
      { status: 403 }
    );
  }

  const response = NextResponse.json({ authorized: false });
  response.cookies.set({
    name: GUIDE_ACCESS_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
