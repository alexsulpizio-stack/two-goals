import { decodeQuickenBytes, parseQuickenFile, readAsArrayBuffer } from "./parse";
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

export type CompactImport = {
  ok: boolean;
  error?: string;
  fileName?: string;
  transactionCount?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  monthlyGiving?: number;
  investedNetWorth?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  warnings?: string[];
};

export function compactImport(result: ImportResult): CompactImport {
  if (!result.ok || !result.byWindow) {
    return {
      ok: false,
      error: result.error,
      fileName: result.fileName,
    };
  }
  const summary = result.byWindow[12];
  return {
    ok: true,
    fileName: result.fileName,
    transactionCount: result.transactionCount,
    monthlyIncome: summary.monthlyIncome,
    monthlyExpenses: summary.monthlyExpenses,
    monthlyGiving: summary.monthlyGiving,
    investedNetWorth: summary.investedNetWorth,
    startDate: summary.startDate,
    endDate: summary.endDate,
    warnings: summary.warnings.slice(0, 4),
  };
}

export function parseQuickenText(
  fileName: string,
  text: string
): ImportResult {
  return bundleToResult(parseQuickenFile(fileName, text), text);
}

export async function parseQuickenBytes(
  fileName: string,
  buffer: ArrayBuffer
): Promise<ImportResult> {
  return parseQuickenText(fileName, decodeQuickenBytes(buffer));
}

export async function parseQuickenSources(input: {
  files?: Array<File | Blob | null | undefined>;
  paste?: string;
  fileName?: string;
}): Promise<ImportResult> {
  const bundles: QuickenBundle[] = [];
  let lastText = "";

  for (const file of input.files ?? []) {
    if (!file) continue;
    const name =
      file instanceof File ? file.name : (input.fileName ?? "import.qif");
    const text = decodeQuickenBytes(await readAsArrayBuffer(file));
    lastText = text;
    bundles.push(parseQuickenFile(name, text));
  }

  const pasted = input.paste?.trim() ?? "";
  if (pasted) {
    lastText = pasted;
    bundles.push(parseQuickenFile("pasted.qif", pasted));
  }

  if (bundles.length === 0) {
    return {
      ok: false,
      error:
        "Read file ran, but no file was in memory. Choose the .qif again, wait for “Loaded”, then click Read file.",
    };
  }

  return bundleToResult(mergeBundles(bundles), lastText);
}

export async function parseQuickenFormData(
  formData: FormData
): Promise<ImportResult> {
  return parseQuickenSources({
    files: formData
      .getAll("quicken")
      .filter((value): value is File => value instanceof File),
    paste: String(formData.get("paste") ?? ""),
  });
}

function bundleToResult(merged: QuickenBundle, text: string): ImportResult {
  if (merged.transactions.length === 0 && merged.accounts.length === 0) {
    const hint = firstLines(text);
    const base =
      merged.warnings[0] ?? "The file opened, but no transactions were found.";
    return {
      ok: false,
      error: hint ? `${base} Header: ${hint}` : base,
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

function firstLines(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((line) => (line.length > 48 ? `${line.slice(0, 45)}…` : line))
    .join(" · ");
}
