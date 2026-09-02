import { parseCsvFile } from "./csv";
import { parseQifFile } from "./qif";
import type { QuickenBundle } from "./types";

export function decodeQuickenBytes(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return stripBom(new TextDecoder("utf-16le").decode(bytes));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return stripBom(new TextDecoder("utf-16be").decode(bytes));
  }
  if (bytes.length >= 4 && bytes[0] !== 0 && bytes[1] === 0 && bytes[3] === 0) {
    return stripBom(new TextDecoder("utf-16le").decode(bytes));
  }
  let text = new TextDecoder("utf-8").decode(bytes);
  const sample = text.slice(0, 120);
  const nuls = [...sample].filter((char) => char === "\u0000").length;
  if (nuls > 8) {
    text = new TextDecoder("utf-16le").decode(bytes);
  }
  return stripBom(text);
}

export function parseQuickenFile(fileName: string, text: string): QuickenBundle {
  const lower = fileName.toLowerCase();
  const sample = text.slice(0, 200);
  if (
    sample.startsWith("PK") ||
    lower.endsWith(".qxf") ||
    lower.endsWith(".zip")
  ) {
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
    /!Type:/i.test(text) ||
    /!Account/i.test(text)
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
  const buffer = await file.arrayBuffer();
  const text = decodeQuickenBytes(buffer);
  if (!text.trim()) {
    return {
      fileName: name,
      transactions: [],
      accounts: [],
      categoryFlags: {},
      warnings: ["The file was empty after reading."],
    };
  }
  return parseQuickenFile(name, text);
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}
