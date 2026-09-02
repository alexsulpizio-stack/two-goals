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

/** Relative Location so the browser stays on localhost / the preview host, not 0.0.0.0. */
function redirectTo(path: string, result?: ImportResult) {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: path },
  });
  if (result) {
    response.cookies.set(COOKIE, JSON.stringify(compactImport(result)), {
      path: "/",
      maxAge: 60 * 30,
      sameSite: "lax",
    });
  }
  return response;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("sample") !== "1") {
    return redirectTo("/steward");
  }
  const text = await readFile(
    join(process.cwd(), "public/samples/sample.qif"),
    "utf8"
  );
  return redirectTo("/steward/read", parseQuickenText("sample.qif", text));
}

export async function POST(request: Request) {
  const form = await request.formData();
  if (form.get("sample")) {
    const text = await readFile(
      join(process.cwd(), "public/samples/sample.qif"),
      "utf8"
    );
    return redirectTo("/steward/read", parseQuickenText("sample.qif", text));
  }
  return redirectTo("/steward/read", await parseQuickenFormData(form));
}
