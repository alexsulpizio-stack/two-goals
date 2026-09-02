import { decodeQuickenBytes, parseQuickenFile } from "./parse";
import { mergeBundles, summarizeQuicken } from "./summarize";
import type { QuickenBundle, QuickenSummary } from "./types";

export type ImportResult = {
  ok: boolean;
  error?: string;
  fileName?: string;
  transactionCount?: number;
  byWindow?: {
    3: QuickenSummary;
    12: QuickenSummary;
  };
};

export async function parseQuickenFormData(
  formData: FormData
): Promise<ImportResult> {
  const bundles: QuickenBundle[] = [];

  for (const value of formData.getAll("quicken")) {
    if (!(value instanceof File) || value.size === 0) continue;
    const text = decodeQuickenBytes(await value.arrayBuffer());
    bundles.push(parseQuickenFile(value.name, text));
  }

  const pasted = String(formData.get("paste") ?? "").trim();
  if (pasted) {
    bundles.push(parseQuickenFile("pasted.qif", pasted));
  }

  if (bundles.length === 0) {
    return {
      ok: false,
      error:
        "No file arrived. Choose the .qif, then click Read file. You should stay on Steward and see totals, not the file text.",
    };
  }

  const merged = mergeBundles(bundles);
  if (merged.transactions.length === 0 && merged.accounts.length === 0) {
    return {
      ok: false,
      error:
        merged.warnings[0] ??
        "The file opened, but no transactions were found.",
      fileName: merged.fileName,
    };
  }

  return {
    ok: true,
    fileName: merged.fileName,
    transactionCount: merged.transactions.length,
    byWindow: {
      3: summarizeQuicken(merged, 3),
      12: summarizeQuicken(merged, 12),
    },
  };
}
