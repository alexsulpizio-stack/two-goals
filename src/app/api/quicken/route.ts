import { NextResponse } from "next/server";

import { decodeQuickenBytes, mergeBundles, parseQuickenFile, summarizeQuicken } from "@/lib/quicken";
import type { QuickenBundle } from "@/lib/quicken";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const bundles: QuickenBundle[] = [];

    for (const value of form.getAll("quicken")) {
      if (!(value instanceof File) || value.size === 0) continue;
      const text = decodeQuickenBytes(await value.arrayBuffer());
      bundles.push(parseQuickenFile(value.name, text));
    }

    const pasted = String(form.get("paste") ?? "").trim();
    if (pasted) {
      bundles.push(parseQuickenFile("pasted.qif", pasted));
    }

    if (bundles.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No file arrived with the request. Choose the .qif again, then click Read file.",
        },
        { status: 400 }
      );
    }

    const merged = mergeBundles(bundles);
    if (merged.transactions.length === 0 && merged.accounts.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            merged.warnings[0] ??
            "The file opened, but no transactions were found.",
          fileName: merged.fileName,
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      fileName: merged.fileName,
      transactionCount: merged.transactions.length,
      byWindow: {
        3: summarizeQuicken(merged, 3),
        12: summarizeQuicken(merged, 12),
      },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Parse failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
