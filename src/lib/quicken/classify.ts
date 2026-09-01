import type { AccountRole, LedgerKind, ParsedAccount } from "./types";

const GIVING = /\b(tithe|tithing|offering|offerings|charity|charitable|donation|donations|giving|church|churches|mission|missions|benevolence|alms|first.?fruits)\b/i;
const INCOME = /\b(salary|paycheck|paycheque|wages|bonus|payroll|interest inc|div(idend)?( income)?|tax refund|social security|pension|stipend)\b/i;
const HOME = /\b(house|home|mortgage|real estate|residence|property tax|dwelling)\b/i;
const VEHICLE = /\b(auto loan|car loan|vehicle|truck loan)\b/i;
const INVESTED =
  /\b(401k|401\(k\)|403b|403\(b\)|457|ira|roth|brokerage|vanguard|fidelity|schwab|investment|broker|mutual|etf|stock|portfolio|retirement|529|hsa|sep-ira|simple ira)/i;
const CASH = /\b(checking|chequeing|savings|money market|cash|bank|emergency)\b/i;
const LIABILITY = /\b(visa|mastercard|amex|discover|credit card|loan|liability|heloc)\b/i;

export function classifyCategory(
  category: string,
  amount: number,
  flags: Record<string, "income" | "expense">,
  override?: LedgerKind,
  accountType = ""
): LedgerKind {
  if (override) return override;
  const name = category.split("/")[0]?.trim() ?? "";
  if (/^\[.+]$/.test(name)) return "transfer";
  if (GIVING.test(name) || GIVING.test(category)) return "giving";
  const flag = flags[name] ?? flags[rootCategory(name)];
  if (flag === "income") return "income";
  if (INCOME.test(name) || INCOME.test(category)) return "income";
  if (flag === "expense") return "expense";
  const type = accountType.toLowerCase();
  if (type === "ccard" || type === "oth l") {
    return amount === 0 ? "ignore" : "expense";
  }
  if (amount > 0) return "income";
  if (amount < 0) return "expense";
  return "ignore";
}

export function accountRole(account: ParsedAccount): AccountRole {
  const haystack = `${account.name} ${account.type}`;
  const type = account.type.toLowerCase();
  if (type === "invst" || type === "port" || INVESTED.test(haystack)) {
    return "invested";
  }
  if (type === "house" || HOME.test(haystack)) return "home";
  if (VEHICLE.test(haystack)) return "vehicle";
  if (type === "ccard" || type === "oth l" || LIABILITY.test(haystack)) {
    return "liability";
  }
  if (type === "bank" || type === "cash" || CASH.test(haystack)) return "cash";
  return "other";
}

export function rootCategory(category: string): string {
  return category.split(":")[0]?.trim() ?? category;
}

export function displayKind(kind: LedgerKind): string {
  if (kind === "income") return "Income";
  if (kind === "expense") return "Living";
  if (kind === "giving") return "Giving";
  if (kind === "transfer") return "Transfer";
  return "Ignored";
}

export function nextKind(kind: LedgerKind): LedgerKind {
  const options: LedgerKind[] = ["income", "expense", "giving", "ignore"];
  const index = options.indexOf(kind);
  return options[(index + 1) % options.length] ?? "expense";
}
