import { parseAmount, parseDate } from "./money";
import type {
  ParsedAccount,
  ParsedTransaction,
  QuickenBundle,
} from "./types";

const SKIP_INVESTMENT_ACTIONS = new Set([
  "buy",
  "sell",
  "reinvdiv",
  "reinvint",
  "reinvlg",
  "reinvsh",
  "shrsin",
  "shrsout",
  "xin",
  "xout",
  "cvrshrt",
  "shtsell",
  "stksplit",
  "stocksplit",
  "contribx",
  "withdawx",
  "withdwx",
]);

export function parseQifFile(fileName: string, text: string): QuickenBundle {
  const warnings: string[] = [];
  const transactions: ParsedTransaction[] = [];
  const accounts: ParsedAccount[] = [];
  const categoryFlags: Record<string, "income" | "expense"> = {};

  let mode: "none" | "account" | "cat" | "txn" = "none";
  let accountName = "";
  let accountType = "";
  let record: Record<string, string> = {};
  const splits: Array<{ category: string; amount: string; memo: string }> = [];

  const flush = () => {
    if (mode === "account") {
      const name = record.N?.trim();
      if (name) {
        accountName = name;
        accountType = record.T?.trim() ?? "";
        accounts.push({
          name,
          type: accountType,
          balance: null,
        });
      }
    } else if (mode === "cat") {
      const name = record.N?.trim();
      if (name) {
        if ("I" in record) categoryFlags[name] = "income";
        if ("E" in record) categoryFlags[name] = "expense";
      }
    } else if (mode === "txn") {
      pushTransactions(
        transactions,
        record,
        splits,
        accountName,
        accountType
      );
    }
    record = {};
    splits.length = 0;
  };

  const lines = stripBom(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.replace(/^\u0000+/, "").trimEnd();
    if (!line) continue;
    if (line.startsWith("!")) {
      flush();
      const header = line.slice(1).trim();
      if (/^Account$/i.test(header)) {
        mode = "account";
      } else if (/^Type:Cat/i.test(header)) {
        mode = "cat";
      } else if (/^Type:(Memorized|Prices|Security|Class|Budget|Tags?)/i.test(header)) {
        mode = "none";
      } else if (/^Type:/i.test(header)) {
        mode = "txn";
        const type = header.slice(5).trim();
        if (type) accountType = type;
      } else if (/^(Option:|Clear:)/i.test(header)) {
        continue;
      } else {
        mode = "none";
      }
      continue;
    }
    if (line.startsWith("^")) {
      flush();
      continue;
    }
    const code = line[0];
    const value = line.slice(1);
    if (mode === "txn" && code === "S") {
      splits.push({ category: value, amount: "", memo: "" });
    } else if (mode === "txn" && code === "$" && splits.length) {
      splits[splits.length - 1].amount = value;
    } else if (mode === "txn" && code === "E" && splits.length) {
      splits[splits.length - 1].memo = value;
    } else if (mode === "cat" && (code === "I" || code === "E")) {
      record[code] = value;
    } else {
      record[code] = value;
    }
  }
  flush();

  if (transactions.length === 0 && accounts.length === 0) {
    warnings.push("No Quicken accounts or transactions were found in this QIF file.");
  }

  return { fileName, transactions, accounts, categoryFlags, warnings };
}

function pushTransactions(
  transactions: ParsedTransaction[],
  record: Record<string, string>,
  splits: Array<{ category: string; amount: string; memo: string }>,
  accountName: string,
  accountType: string
) {
  const date = parseDate(record.D);
  if (!date) return;
  const action = (record.N ?? "").trim();
  const payee = (record.P ?? record.Y ?? "").trim();
  const memo = (record.M ?? "").trim();
  const parentAmount = parseAmount(record.T) ?? parseAmount(record.U) ?? 0;

  if (SKIP_INVESTMENT_ACTIONS.has(action.toLowerCase())) return;

  if (splits.length > 0) {
    for (const split of splits) {
      const amount = parseAmount(split.amount);
      if (amount === null || amount === 0) continue;
      transactions.push({
        date,
        amount,
        payee,
        category: split.category.trim(),
        account: accountName,
        memo: split.memo || memo,
        accountType,
        action,
      });
    }
    return;
  }

  if (parentAmount === 0 && !record.T && !record.U) return;
  transactions.push({
    date,
    amount: parentAmount,
    payee,
    category: (record.L ?? "").trim(),
    account: accountName,
    memo,
    accountType,
    action,
  });
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
