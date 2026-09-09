export type QuickenFileKind = "qif" | "csv";
export type AccountClass = "invested" | "cash" | "debt" | "review";
export type TransactionClass = "income" | "living" | "giving" | "transfer" | "review" | "ignored";
export type Confidence = "high" | "medium" | "low";

export type QuickenAccount = { name: string; type: string; balance: number | null };
export type QuickenTransaction = { date: string | null; amount: number; payee: string; category: string; memo: string; account: string };
export type AccountAudit = QuickenAccount & { classification: AccountClass; confidence: Confidence; included: boolean; reason: string };
export type TransactionAudit = QuickenTransaction & { classification: TransactionClass; confidence: Confidence; includedInAverage: boolean; reason: string };
export type MonthAudit = { month: string; income: number; living: number; giving: number; transfers: number; includedTransactions: number };
export type QuickenCoverage = { classifiedTransactions: number; reviewTransactions: number; classifiedAccounts: number; reviewAccounts: number; transactionCoverage: number; accountCoverage: number };
export type QuickenImportPreview = {
  kind: QuickenFileKind;
  transactions: number;
  baselineTransactions: number;
  accounts: number;
  repeatedAccountRecords: number;
  monthsUsed: string[];
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  monthlyGiving: number | null;
  investedAssets: number | null;
  cash: number | null;
  debt: number | null;
  warnings: string[];
  accountAudit: AccountAudit[];
  transactionAudit: TransactionAudit[];
  monthlyAudit: MonthAudit[];
  coverage: QuickenCoverage;
};

type ParsedQuicken = { accounts: QuickenAccount[]; transactions: QuickenTransaction[]; repeatedAccountRecords: number };

function money(raw: unknown): number {
  const cleaned = String(raw ?? "").trim().replace(/[$,]/g, "").replace(/^\((.*)\)$/, "-$1");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function normalizeDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const parts = value.replace(/[.'-]/g, "/").split("/").map((part) => part.trim());
  if (parts.length < 3) return null;
  const month = Number(parts[0]); const day = Number(parts[1]); let year = Number(parts[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day) || !Number.isFinite(year)) return null;
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isTransfer(category: string): boolean {
  const value = category.trim().toLowerCase();
  return /^\[.*\]$/.test(value) || value.includes("transfer");
}

function isGiving(category: string): boolean {
  const value = category.toLowerCase();
  return ["giving", "tithe", "tithes", "charity", "charitable", "donation", "donations", "offering", "church offering", "ministry"].some((term) => value.includes(term));
}

function transactionText(item: QuickenTransaction) {
  return `${item.payee} ${item.category} ${item.memo}`.toLowerCase();
}

function looksLikeInvestmentActivity(item: QuickenTransaction) {
  const text = transactionText(item);
  const account = item.account.toLowerCase();
  return /\b(brokerage|investment|securities|401k|403b|ira|roth|pcr?a|trust|tradeking|optionshouse)\b/.test(account)
    || /\b(buy|sell|sold|sale proceeds|capital gain|reinvest|reinvestment|security purchase|security sale|stock purchase|stock sale|mutual fund|redemption|maturity proceeds)\b/.test(text);
}

function looksLikeLoanOrDebtMovement(item: QuickenTransaction) {
  const text = transactionText(item);
  return /\b(loan proceeds?|loan advance|loan draw|heloc draw|line of credit draw|cash advance|borrowed funds?|principal payment|mortgage principal|loan principal|heloc payment)\b/.test(text);
}

function looksLikeReimbursementOrRefund(item: QuickenTransaction) {
  const text = transactionText(item);
  return /\b(reimburse(?:ment|d)?|expense reimbursement|refund|rebate|returned purchase|purchase return|merchant credit|tax refund)\b/.test(text);
}

function looksLikeCreditCardPayment(item: QuickenTransaction) {
  const text = transactionText(item);
  return /\b(credit card payment|card payment|cc payment|payment to (?:amex|american express|visa|mastercard|discover))\b/.test(text);
}

function classifyAccount(account: QuickenAccount): AccountAudit {
  const type = account.type.trim().toLowerCase();
  const name = account.name.toLowerCase();
  const included = account.balance !== null;
  if (type) {
    if (type.includes("invst") || type.includes("investment")) return { ...account, classification: "invested", confidence: "high", included, reason: "Quicken investment account type matched." };
    if (type.includes("ccard") || type.includes("credit") || type.includes("oth l") || type.includes("liability")) return { ...account, classification: "debt", confidence: "high", included, reason: "Quicken liability account type matched." };
    if (type.includes("bank") || type.includes("cash")) return { ...account, classification: "cash", confidence: "high", included, reason: "Quicken cash/bank account type matched." };
  }
  if (/\b(401k|403b|ira|roth|brokerage|investment|securities)\b/.test(name)) return { ...account, classification: "invested", confidence: "medium", included, reason: "Account name suggests an investment account; Quicken type was not recognized." };
  if (/\b(mortgage|loan|credit card|line of credit|heloc|debt)\b/.test(name)) return { ...account, classification: "debt", confidence: "medium", included, reason: "Account name suggests a liability; Quicken type was not recognized." };
  if (/\b(checking|savings|cash|money market)\b/.test(name)) return { ...account, classification: "cash", confidence: "medium", included, reason: "Account name suggests cash/banking; Quicken type was not recognized." };
  return { ...account, classification: "review", confidence: "low", included: false, reason: "Account type/name was not recognized confidently." };
}

function classifyTransaction(item: QuickenTransaction): TransactionAudit {
  if (!item.date || item.amount === 0) return { ...item, classification: "ignored", confidence: "high", includedInAverage: false, reason: !item.date ? "Missing/invalid date." : "Zero amount." };
  if (isTransfer(item.category)) return { ...item, classification: "transfer", confidence: "high", includedInAverage: false, reason: "Category looks like a transfer, so it is excluded from income/spending averages." };
  if (looksLikeCreditCardPayment(item)) return { ...item, classification: "review", confidence: "low", includedInAverage: false, reason: "Looks like a credit-card payment; excluded until verified so purchases are not counted twice." };
  if (looksLikeInvestmentActivity(item)) return { ...item, classification: "review", confidence: "low", includedInAverage: false, reason: "Looks like investment or asset-sale activity; excluded from ordinary income/living averages until verified." };
  if (looksLikeLoanOrDebtMovement(item)) return { ...item, classification: "review", confidence: "low", includedInAverage: false, reason: "Looks like loan proceeds, a draw, or debt principal movement; excluded from ordinary cash-flow averages until verified." };
  if (looksLikeReimbursementOrRefund(item)) return { ...item, classification: "review", confidence: "low", includedInAverage: false, reason: "Looks like a reimbursement/refund rather than recurring income or ordinary spending; excluded until verified." };
  if (item.amount > 0) return { ...item, classification: "income", confidence: item.category ? "medium" : "low", includedInAverage: true, reason: "Positive non-transfer amount with no non-routine warning signs is treated as income." };
  if (isGiving(item.category)) return { ...item, classification: "giving", confidence: "high", includedInAverage: true, reason: "Negative amount with a giving-related category." };
  return { ...item, classification: "living", confidence: item.category ? "medium" : "low", includedInAverage: true, reason: "Negative non-transfer amount with no non-routine warning signs is treated as living spending." };
}

function buildMonthlyAudit(audit: TransactionAudit[], now: Date) {
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const availableMonths = Array.from(new Set(audit.filter((item) => item.date && item.includedInAverage).map((item) => item.date!.slice(0, 7)))).filter((month) => month < currentMonth).sort();
  const monthsUsed = availableMonths.slice(-12);
  const monthlyAudit: MonthAudit[] = monthsUsed.map((month) => {
    const rows = audit.filter((item) => item.date?.startsWith(month));
    return {
      month,
      income: rows.filter((item) => item.classification === "income").reduce((sum, item) => sum + item.amount, 0),
      living: rows.filter((item) => item.classification === "living").reduce((sum, item) => sum + Math.abs(item.amount), 0),
      giving: rows.filter((item) => item.classification === "giving").reduce((sum, item) => sum + Math.abs(item.amount), 0),
      transfers: rows.filter((item) => item.classification === "transfer").reduce((sum, item) => sum + Math.abs(item.amount), 0),
      includedTransactions: rows.filter((item) => item.includedInAverage).length,
    };
  });
  if (!monthlyAudit.length) return { monthsUsed, monthlyAudit, monthlyIncome: null, monthlyExpenses: null, monthlyGiving: null };
  return {
    monthsUsed,
    monthlyAudit,
    monthlyIncome: monthlyAudit.reduce((sum, row) => sum + row.income, 0) / monthlyAudit.length,
    monthlyExpenses: monthlyAudit.reduce((sum, row) => sum + row.living, 0) / monthlyAudit.length,
    monthlyGiving: monthlyAudit.reduce((sum, row) => sum + row.giving, 0) / monthlyAudit.length,
  };
}

function accountTotals(accountAudit: AccountAudit[]) {
  let invested = 0, cash = 0, debt = 0; let investedSeen = false, cashSeen = false, debtSeen = false;
  for (const account of accountAudit) {
    if (!account.included || account.balance === null) continue;
    if (account.classification === "invested") { invested += Math.max(0, account.balance); investedSeen = true; }
    if (account.classification === "cash") { cash += Math.max(0, account.balance); cashSeen = true; }
    if (account.classification === "debt") { debt += Math.abs(account.balance); debtSeen = true; }
  }
  return { investedAssets: investedSeen ? invested : null, cash: cashSeen ? cash : null, debt: debtSeen ? debt : null };
}

function accountKey(account: QuickenAccount) {
  return `${account.name.trim().toLowerCase()}\u0000${account.type.trim().toLowerCase()}`;
}

export function parseQif(text: string): ParsedQuicken {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const accountsByKey = new Map<string, QuickenAccount>();
  const transactions: QuickenTransaction[] = [];
  let repeatedAccountRecords = 0;
  let section = "";
  let currentAccount = "";
  let record: Record<string, string> = {};
  const flush = () => {
    if (!Object.keys(record).length) return;
    if (section === "account") {
      const account = { name: record.N ?? "Unnamed account", type: record.T ?? "", balance: record.$ !== undefined ? money(record.$) : null };
      const key = accountKey(account);
      const existing = accountsByKey.get(key);
      if (existing) {
        repeatedAccountRecords += 1;
        if (existing.balance === null && account.balance !== null) accountsByKey.set(key, account);
      } else accountsByKey.set(key, account);
      currentAccount = account.name;
    } else if (section === "transaction") {
      transactions.push({ date: normalizeDate(record.D ?? ""), amount: money(record.T ?? "0"), payee: record.P ?? "", category: record.L ?? "", memo: record.M ?? "", account: currentAccount });
    }
    record = {};
  };
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    if (line === "^") { flush(); continue; }
    if (line.startsWith("!")) {
      flush();
      if (line.toLowerCase() === "!account") section = "account";
      else if (line.toLowerCase().startsWith("!type:")) section = "transaction";
      else section = "";
      continue;
    }
    if (!section) continue;
    const key = line[0];
    if (key && record[key] === undefined) record[key] = line.slice(1).trim();
  }
  flush();
  return { accounts: Array.from(accountsByKey.values()), transactions, repeatedAccountRecords };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (char === '"') { if (quoted && text[index + 1] === '"') { value += '"'; index += 1; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && text[index + 1] === "\n") index += 1; row.push(value); if (row.some((cell) => cell.trim())) rows.push(row); row = []; value = ""; }
    else value += char;
  }
  row.push(value); if (row.some((cell) => cell.trim())) rows.push(row); return rows;
}

function headerIndex(headers: string[], names: string[]) {
  const lowered = headers.map((header) => header.trim().toLowerCase());
  for (const name of names) { const exact = lowered.indexOf(name); if (exact >= 0) return exact; }
  for (const name of names) { const partial = lowered.findIndex((header) => header.includes(name)); if (partial >= 0) return partial; }
  return -1;
}

export function parseCsv(text: string): ParsedQuicken {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { accounts: [], transactions: [], repeatedAccountRecords: 0 };
  const headers = rows[0]!.map((cell) => cell.trim());
  const accountIndex = headerIndex(headers, ["account", "account name"]), accountTypeIndex = headerIndex(headers, ["account type", "type"]), balanceIndex = headerIndex(headers, ["balance", "market value", "ending balance"]), dateIndex = headerIndex(headers, ["date", "transaction date"]), amountIndex = headerIndex(headers, ["amount", "net amount"]), inflowIndex = headerIndex(headers, ["inflow", "deposit", "credit"]), outflowIndex = headerIndex(headers, ["outflow", "payment", "debit"]), categoryIndex = headerIndex(headers, ["category"]), payeeIndex = headerIndex(headers, ["payee", "description"]), memoIndex = headerIndex(headers, ["memo", "notes"]);
  const accountsByName = new Map<string, QuickenAccount>(); const transactions: QuickenTransaction[] = [];
  for (const row of rows.slice(1)) {
    const accountName = accountIndex >= 0 ? (row[accountIndex] ?? "").trim() : "";
    if (accountName && balanceIndex >= 0) accountsByName.set(accountName, { name: accountName, type: accountTypeIndex >= 0 ? (row[accountTypeIndex] ?? "").trim() : "", balance: money(row[balanceIndex]) });
    if (dateIndex < 0) continue;
    let amount = 0;
    if (amountIndex >= 0) amount = money(row[amountIndex]); else amount = (inflowIndex >= 0 ? money(row[inflowIndex]) : 0) - Math.abs(outflowIndex >= 0 ? money(row[outflowIndex]) : 0);
    if (amount === 0 && amountIndex < 0 && inflowIndex < 0 && outflowIndex < 0) continue;
    transactions.push({ date: normalizeDate(row[dateIndex] ?? ""), amount, payee: payeeIndex >= 0 ? (row[payeeIndex] ?? "").trim() : "", category: categoryIndex >= 0 ? (row[categoryIndex] ?? "").trim() : "", memo: memoIndex >= 0 ? (row[memoIndex] ?? "").trim() : "", account: accountName });
  }
  return { accounts: Array.from(accountsByName.values()), transactions, repeatedAccountRecords: 0 };
}

export function previewQuickenImport(fileName: string, text: string, now = new Date()): QuickenImportPreview {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".qxf")) throw new Error("QXF is not supported yet. In Quicken Classic, export QIF or CSV instead.");
  const kind: QuickenFileKind = lower.endsWith(".qif") ? "qif" : "csv";
  const parsed = kind === "qif" ? parseQif(text) : parseCsv(text);
  if (!parsed.accounts.length && !parsed.transactions.length) throw new Error("No Quicken accounts or transactions could be read from this file.");
  const accountAudit = parsed.accounts.map(classifyAccount);
  const transactionAudit = parsed.transactions.map(classifyTransaction);
  const averages = buildMonthlyAudit(transactionAudit, now);
  const balances = accountTotals(accountAudit);
  const baselineTransactions = averages.monthlyAudit.reduce((sum, row) => sum + row.includedTransactions, 0);
  const warnings: string[] = [];
  if (!parsed.transactions.length) warnings.push("No transaction rows were found, so monthly income and spending were not estimated.");
  if (balances.investedAssets === null && balances.cash === null && balances.debt === null) warnings.push("No usable account balances were found. Balance-sheet fields will be left unchanged.");
  if (averages.monthsUsed.length > 0 && averages.monthsUsed.length < 12) warnings.push(`Only ${averages.monthsUsed.length} completed month${averages.monthsUsed.length === 1 ? "" : "s"} of transaction history were available for the 12-month baseline.`);
  if (parsed.repeatedAccountRecords > 0) warnings.push(`${parsed.repeatedAccountRecords} repeated QIF account record${parsed.repeatedAccountRecords === 1 ? " was" : "s were"} collapsed so account totals are not inflated by duplicate account declarations.`);
  const heldForReview = transactionAudit.filter((item) => item.classification === "review").length;
  if (heldForReview > 0) warnings.push(`${heldForReview} transaction${heldForReview === 1 ? " was" : "s were"} excluded from the baseline because they look like investment activity, debt movement, reimbursements/refunds, or credit-card payments and need review.`);
  const reviewTransactions = transactionAudit.filter((item) => item.classification === "review" || item.confidence === "low").length;
  const classifiedTransactions = transactionAudit.length - reviewTransactions;
  const reviewAccounts = accountAudit.filter((item) => item.classification === "review").length;
  const classifiedAccounts = accountAudit.length - reviewAccounts;
  const coverage: QuickenCoverage = {
    classifiedTransactions,
    reviewTransactions,
    classifiedAccounts,
    reviewAccounts,
    transactionCoverage: transactionAudit.length ? classifiedTransactions / transactionAudit.length : 0,
    accountCoverage: accountAudit.length ? classifiedAccounts / accountAudit.length : 0,
  };
  return {
    kind,
    transactions: parsed.transactions.length,
    baselineTransactions,
    accounts: parsed.accounts.length,
    repeatedAccountRecords: parsed.repeatedAccountRecords,
    ...averages,
    ...balances,
    warnings,
    accountAudit,
    transactionAudit,
    monthlyAudit: averages.monthlyAudit,
    coverage,
  };
}
