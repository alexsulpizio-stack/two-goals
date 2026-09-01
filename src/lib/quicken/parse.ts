import { parseCsvFile } from "./csv";
import { parseQifFile } from "./qif";
import type { QuickenBundle } from "./types";

export function parseQuickenFile(fileName: string, text: string): QuickenBundle {
  const lower = fileName.toLowerCase();
  if (text.startsWith("PK") || lower.endsWith(".qxf") || lower.endsWith(".zip")) {
    return {
      fileName,
      transactions: [],
      accounts: [],
      categoryFlags: {},
      warnings: [
        "Quicken QXF is a closed format. In Quicken go to File → File Export → QIF file, or export a Transaction / Net Worth report to Excel and save as CSV.",
      ],
    };
  }
  if (
    lower.endsWith(".qif") ||
    text.includes("!Type:") ||
    text.includes("!Account")
  ) {
    return parseQifFile(fileName, text);
  }
  return parseCsvFile(fileName, text);
}

export async function readDroppedFile(file: File): Promise<QuickenBundle> {
  const name = file.name;
  const lower = name.toLowerCase();
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    return {
      fileName: name,
      transactions: [],
      accounts: [],
      categoryFlags: {},
      warnings: [
        "Excel workbooks need to be saved as CSV first. In Quicken, Export to Excel, then in Excel choose File → Save As → CSV.",
      ],
    };
  }
  const text = await file.text();
  return parseQuickenFile(name, text);
}
