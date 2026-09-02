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

export async function parseQuickenSources(input: {
  files?: Array<File | null | undefined>;
  paste?: string;
}): Promise<ImportResult> {
  const bundles: QuickenBundle[] = [];

  for (const file of input.files ?? []) {
    if (!file || file.size === 0) continue;
    const text = decodeQuickenBytes(await file.arrayBuffer());
    bundles.push(parseQuickenFile(file.name, text));
  }

  const pasted = input.paste?.trim() ?? "";
  if (pasted) {
    bundles.push(parseQuickenFile("pasted.qif", pasted));
  }

  if (bundles.length === 0) {
    return {
      ok: false,
      error:
        "No file is chosen. Pick the .qif first — the name should stay visible — then click Read file.",
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

export async function parseQuickenFormData(
  formData: FormData
): Promise<ImportResult> {
  return parseQuickenSources({
    files: formData.getAll("quicken").filter((value): value is File => value instanceof File),
    paste: String(formData.get("paste") ?? ""),
  });
}
