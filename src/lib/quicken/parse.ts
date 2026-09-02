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

  const utf8 = stripBom(new TextDecoder("utf-8").decode(bytes));
  if (looksLikeQuicken(utf8)) return utf8;

  const utf16 = stripBom(new TextDecoder("utf-16le").decode(bytes));
  if (looksLikeQuicken(utf16)) return utf16;

  const latin1 = stripBom(new TextDecoder("latin1").decode(bytes));
  if (looksLikeQuicken(latin1)) return latin1;

  return utf8;
}

export function readAsArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === "function") {
    return file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error("Could not read the file into memory."));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("The browser could not read that file."));
    reader.readAsArrayBuffer(file);
  });
}

function looksLikeQuicken(text: string): boolean {
  const compact = text.replace(/\u0000/g, "");
  return /!Type:|!Account|!Option:/i.test(compact) || /Date,.+,Amount/i.test(compact);
}

export function parseQuickenFile(fileName: string, text: string): QuickenBundle {
  const lower = fileName.toLowerCase();
  text = text.replace(/\u0000/g, "");
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
