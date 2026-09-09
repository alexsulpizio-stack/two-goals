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
