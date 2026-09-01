import { looksLikeDate, parseAmount, parseDate } from "./money";
import type { ParsedAccount, ParsedTransaction, QuickenBundle } from "./types";

const DATE_HEADERS = [
  "date",
  "trans date",
  "transaction date",
  "posted",
  "posting date",
  "transdate",
];
const AMOUNT_HEADERS = ["amount", "sum", "value", "total", "net amount"];
const DEBIT_HEADERS = ["debit", "withdrawal", "outflow", "spent", "payment"];
const CREDIT_HEADERS = ["credit", "deposit", "inflow"];
const BALANCE_HEADERS = ["balance", "market value", "marketvalue", "value"];
const CATEGORY_HEADERS = [
  "category",
  "category/class",
  "full category",
  "cat",
];
const PAYEE_HEADERS = [
  "payee",
  "description",
  "payee/description",
  "name",
  "payee name",
];
const ACCOUNT_HEADERS = ["account", "account name", "accountname", "acct"];
const MEMO_HEADERS = ["memo", "notes", "note", "tag"];
const TYPE_HEADERS = ["type", "account type", "accounttype", "action"];

export function parseCsvFile(fileName: string, text: string): QuickenBundle {
  const rows = parseCsv(stripBom(text));
  const warnings: string[] = [];
  if (rows.length === 0) {
    return emptyBundle(fileName, ["The CSV file was empty."]);
  }

  const headerIndex = findHeaderRow(rows);
  if (headerIndex === null) {
    const positional = parsePositionalQuickenCsv(fileName, rows, warnings);
    if (positional.transactions.length || positional.accounts.length) {
      return positional;
    }
    return emptyBundle(fileName, [
      "Could not find a header row. Export a Transaction or Net Worth report to CSV.",
    ]);
  }

  const header = rows[headerIndex].map(normalizeHeader);
  const map = mapColumns(header);
  const body = rows.slice(headerIndex + 1).filter((row) => row.some((cell) => cell.trim()));

  if (map.balance !== undefined && map.date === undefined && map.account !== undefined) {
    return {
      fileName,
      transactions: [],
      accounts: parseBalanceRows(body, map, header),
      categoryFlags: {},
      warnings,
    };
  }

  if (map.date === undefined && map.amount === undefined && map.debit === undefined) {
    warnings.push("No date or amount columns were recognized.");
    return emptyBundle(fileName, warnings);
  }

  const transactions: ParsedTransaction[] = [];
  const accounts = new Map<string, ParsedAccount>();

  for (const row of body) {
    const date = map.date !== undefined ? parseDate(row[map.date]) : null;
    const category = cell(row, map.category);
    const payee = cell(row, map.payee);
    const account = cell(row, map.account);
    const memo = cell(row, map.memo);
    const accountType = cell(row, map.type);
    const amount = readAmount(row, map);

    if (date && amount !== null) {
      transactions.push({
        date,
        amount,
        payee,
        category,
        account,
        memo,
        accountType,
        action: accountType,
      });
    } else if (account && map.balance !== undefined) {
      const balance = parseAmount(row[map.balance]);
      if (balance !== null) {
        accounts.set(account, {
          name: account,
          type: accountType,
          balance,
        });
      }
    }
  }

  if (transactions.length === 0 && accounts.size === 0) {
    warnings.push("No transactions or account balances could be read from this CSV.");
  }

  return {
    fileName,
    transactions,
    accounts: [...accounts.values()],
    categoryFlags: {},
    warnings,
  };
}

function emptyBundle(fileName: string, warnings: string[]): QuickenBundle {
  return {
    fileName,
    transactions: [],
    accounts: [],
    categoryFlags: {},
    warnings,
  };
}

function parsePositionalQuickenCsv(
  fileName: string,
  rows: string[][],
  warnings: string[]
): QuickenBundle {
  const start = looksLikeDate(rows[0]?.[0] ?? "") ? 0 : 1;
  const transactions: ParsedTransaction[] = [];
  for (const row of rows.slice(start)) {
    if (!looksLikeDate(row[0] ?? "") || row.length < 5) continue;
    const date = parseDate(row[0]);
    const amount = parseAmount(row[6] ?? row[row.length - 1]);
    if (!date || amount === null) continue;
    transactions.push({
      date,
      amount,
      account: row[1] ?? "",
      category: row[3] ?? "",
      payee: row[4] ?? "",
      memo: row[5] ?? "",
      accountType: "",
      action: "",
    });
  }
  if (transactions.length === 0) {
    warnings.push("Rows were not in Quicken’s Date, Account, Tag, Category, Payee, Memo, Amount order.");
  }
  return {
    fileName,
    transactions,
    accounts: [],
    categoryFlags: {},
    warnings,
  };
}

function parseBalanceRows(
  body: string[][],
  map: ColumnMap,
  header: string[]
): ParsedAccount[] {
  const accounts: ParsedAccount[] = [];
  const nameIndex = map.account ?? 0;
  const balanceIndex = map.balance ?? 1;
  const typeIndex = header.findIndex((name) => name.includes("type"));
  for (const row of body) {
    const name = cell(row, nameIndex);
    const balance = parseAmount(row[balanceIndex]);
    if (!name || balance === null) continue;
    if (/^(total|net worth|grand total)$/i.test(name)) continue;
    accounts.push({
      name,
      type: typeIndex >= 0 ? cell(row, typeIndex) : "",
      balance,
    });
  }
  return accounts;
}

type ColumnMap = {
  date?: number;
  amount?: number;
  debit?: number;
  credit?: number;
  balance?: number;
  category?: number;
  payee?: number;
  account?: number;
  memo?: number;
  type?: number;
};

function mapColumns(header: string[]): ColumnMap {
  const find = (names: string[]) => {
    const index = header.findIndex((column) => names.includes(column));
    return index >= 0 ? index : undefined;
  };
  return {
    date: find(DATE_HEADERS),
    amount: find(AMOUNT_HEADERS),
    debit: find(DEBIT_HEADERS),
    credit: find(CREDIT_HEADERS),
    balance: find(BALANCE_HEADERS),
    category: find(CATEGORY_HEADERS),
    payee: find(PAYEE_HEADERS),
    account: find(ACCOUNT_HEADERS),
    memo: find(MEMO_HEADERS),
    type: find(TYPE_HEADERS),
  };
}

function findHeaderRow(rows: string[][]): number | null {
  const limit = Math.min(rows.length, 25);
  for (let index = 0; index < limit; index += 1) {
    const header = rows[index].map(normalizeHeader);
    const map = mapColumns(header);
    const hits = [map.date, map.amount, map.account, map.category, map.balance].filter(
      (value) => value !== undefined
    ).length;
    if (hits >= 2) return index;
    if (map.date !== undefined && (map.amount !== undefined || map.debit !== undefined)) {
      return index;
    }
  }
  return null;
}

function readAmount(row: string[], map: ColumnMap): number | null {
  if (map.debit !== undefined || map.credit !== undefined) {
    const debit = map.debit !== undefined ? parseAmount(row[map.debit]) : null;
    const credit = map.credit !== undefined ? parseAmount(row[map.credit]) : null;
    const out = debit ? -Math.abs(debit) : 0;
    const inn = credit ? Math.abs(credit) : 0;
    if (debit !== null || credit !== null) return inn + out;
  }
  if (map.amount !== undefined) return parseAmount(row[map.amount]);
  return null;
}

function cell(row: string[], index: number | undefined): string {
  if (index === undefined) return "";
  return (row[index] ?? "").trim();
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_*]+/g, " ").replace(/\s+/g, " ");
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.some((cell) => cell.trim())) rows.push(row);
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === "," || char === "\t") {
      pushField();
    } else if (char === "\n") {
      pushField();
      pushRow();
    } else if (char === "\r") {
      continue;
    } else {
      field += char;
    }
  }
  pushField();
  pushRow();
  return rows;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
