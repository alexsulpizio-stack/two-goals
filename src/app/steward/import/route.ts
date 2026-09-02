import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

import {
  compactImport,
  parseQuickenFormData,
  parseQuickenText,
  type ImportResult,
} from "@/lib/quicken/from-form";

export const runtime = "nodejs";

const COOKIE = "two-goals-import";

function redirectWithImport(request: Request, result: ImportResult) {
  const response = NextResponse.redirect(
    new URL("/steward/read", request.url),
    303
  );
  response.cookies.set(COOKIE, JSON.stringify(compactImport(result)), {
    path: "/",
    maxAge: 60 * 30,
    sameSite: "lax",
  });
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("sample") !== "1") {
    return NextResponse.redirect(new URL("/steward", request.url), 303);
  }
  const text = await readFile(
    join(process.cwd(), "public/samples/sample.qif"),
    "utf8"
  );
  return redirectWithImport(request, parseQuickenText("sample.qif", text));
}

export async function POST(request: Request) {
  const form = await request.formData();
  if (form.get("sample")) {
    const text = await readFile(
      join(process.cwd(), "public/samples/sample.qif"),
      "utf8"
    );
    return redirectWithImport(request, parseQuickenText("sample.qif", text));
  }
  return redirectWithImport(request, await parseQuickenFormData(form));
}
