export type QuickenFileKind = "qif" | "csv";

export type QuickenAccount = {
  name: string;
  type: string;
  balance: number | null;
};

export type QuickenTransaction = {
  date: string | null;
  amount: number;
  payee: string;
  category: string;
  memo: string;
  account: string;
};

export type QuickenImportPreview = {
  kind: QuickenFileKind;
  transactions: number;
  accounts: number;
  monthsUsed: string[];
  monthlyIncome: number | null;
  monthlyExpenses: number | null;
  monthlyGiving: number | null;
  investedAssets: number | null;
  cash: number | null;
  debt: number | null;
  warnings: string[];
};

function money(raw: unknown): number {
  const cleaned = String(raw ?? "")
    .trim()
    .replace(/[$,]/g, "")
    .replace(/^\((.*)\)$/, "-$1");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
}

function normalizeDate(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const parts = value.replace(/[.'-]/g, "/").split("/").map((part) => part.trim());
  if (parts.length < 3) return null;
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  let year = Number(parts[2]);
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
  return [
    "giving",
    "tithe",
    "tithes",
    "charity",
    "charitable",
    "donation",
    "donations",
    "offering",
    "church offering",
    "ministry",
  ].some((term) => value.includes(term));
}

function recentMonthAverages(transactions: QuickenTransaction[]) {
  const usable = transactions.filter(
    (item) => item.date && !isTransfer(item.category) && item.amount !== 0
  );
  const months = Array.from(
    new Set(usable.map((item) => item.date!.slice(0, 7)))
  )
    .sort()
    .slice(-3);

  if (months.length === 0) {
    return {
      monthsUsed: [] as string[],
      monthlyIncome: null,
      monthlyExpenses: null,
      monthlyGiving: null,
    };
  }

  let income = 0;
  let expenses = 0;
  let giving = 0;
  for (const item of usable) {
    const month = item.date!.slice(0, 7);
    if (!months.includes(month)) continue;
    if (item.amount > 0) income += item.amount;
    if (item.amount < 0) {
      const spent = Math.abs(item.amount);
      if (isGiving(item.category)) giving += spent;
      else expenses += spent;
    }
  }

  return {
    monthsUsed: months,
    monthlyIncome: income / months.length,
    monthlyExpenses: expenses / months.length,
    monthlyGiving: giving / months.length,
  };
}

function classifyAccount(account: QuickenAccount): "invested" | "cash" | "debt" | null {
  const type = account.type.toLowerCase();
  const name = account.name.toLowerCase();

  if (
    type.includes("invst") ||
    type.includes("investment") ||
    /\b(401k|403b|ira|roth|brokerage|investment|securities)\b/.test(name)
  ) {
    return "invested";
  }
  if (
    type.includes("bank") ||
    type.includes("cash") ||
    /\b(checking|savings|cash|money market)\b/.test(name)
  ) {
    return "cash";
  }
  if (
    type.includes("ccard") ||
    type.includes("credit") ||
    type.includes("oth l") ||
    type.includes("liability") ||
    /\b(mortgage|loan|credit card|line of credit|heloc|debt)\b/.test(name)
  ) {
    return "debt";
  }
  return null;
}

function accountTotals(accounts: QuickenAccount[]) {
  let invested = 0;
  let cash = 0;
  let debt = 0;
  let investedSeen = false;
  let cashSeen = false;
  let debtSeen = false;

  for (const account of accounts) {
    if (account.balance === null) continue;
    const kind = classifyAccount(account);
    if (kind === "invested") {
      invested += Math.max(0, account.balance);
      investedSeen = true;
    } else if (kind === "cash") {
      cash += Math.max(0, account.balance);
      cashSeen = true;
    } else if (kind === "debt") {
      debt += Math.abs(account.balance);
      debtSeen = true;
    }
  }

  return {
    investedAssets: investedSeen ? invested : null,
    cash: cashSeen ? cash : null,
    debt: debtSeen ? debt : null,
  };
}

export function parseQif(text: string): {
  accounts: QuickenAccount[];
  transactions: QuickenTransaction[];
} {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const accounts: QuickenAccount[] = [];
  const transactions: QuickenTransaction[] = [];
  let section = "";
  let currentAccount = "";
  let record: Record<string, string> = {};

  const flush = () => {
    if (Object.keys(record).length === 0) return;
    if (section === "account") {
      const account: QuickenAccount = {
        name: record.N ?? "Unnamed account",
        type: record.T ?? "",
        balance: record.$ !== undefined ? money(record.$) : null,
      };
      accounts.push(account);
      currentAccount = account.name;
    } else if (section === "transaction") {
      transactions.push({
        date: normalizeDate(record.D ?? ""),
        amount: money(record.T ?? "0"),
        payee: record.P ?? "",
        category: record.L ?? "",
        memo: record.M ?? "",
        account: currentAccount,
      });
    }
    record = {};
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    if (line === "^") {
      flush();
      continue;
    }
    if (line.startsWith("!")) {
      flush();
      if (line.toLowerCase() === "!account") section = "account";
      else if (line.toLowerCase().startsWith("!type:")) section = "transaction";
      else section = "";
      continue;
    }
    if (!section) continue;
    const key = line[0];
    if (!key) continue;
    if (record[key] === undefined) record[key] = line.slice(1).trim();
  }
  flush();
  return { accounts, transactions };
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function headerIndex(headers: string[], names: string[]) {
  const lowered = headers.map((header) => header.trim().toLowerCase());
  for (const name of names) {
    const exact = lowered.indexOf(name);
    if (exact >= 0) return exact;
  }
  for (const name of names) {
    const partial = lowered.findIndex((header) => header.includes(name));
    if (partial >= 0) return partial;
  }
  return -1;
}

export function parseCsv(text: string): {
  accounts: QuickenAccount[];
  transactions: QuickenTransaction[];
} {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return { accounts: [], transactions: [] };
  const headers = rows[0]!.map((cell) => cell.trim());

  const accountIndex = headerIndex(headers, ["account", "account name"]);
  const accountTypeIndex = headerIndex(headers, ["account type", "type"]);
  const balanceIndex = headerIndex(headers, ["balance", "market value", "ending balance"]);
  const dateIndex = headerIndex(headers, ["date", "transaction date"]);
  const amountIndex = headerIndex(headers, ["amount", "net amount"]);
  const inflowIndex = headerIndex(headers, ["inflow", "deposit", "credit"]);
  const outflowIndex = headerIndex(headers, ["outflow", "payment", "debit"]);
  const categoryIndex = headerIndex(headers, ["category"]);
  const payeeIndex = headerIndex(headers, ["payee", "description"]);
  const memoIndex = headerIndex(headers, ["memo", "notes"]);

  const accountsByName = new Map<string, QuickenAccount>();
  const transactions: QuickenTransaction[] = [];

  for (const row of rows.slice(1)) {
    const accountName = accountIndex >= 0 ? (row[accountIndex] ?? "").trim() : "";
    if (accountName && balanceIndex >= 0) {
      accountsByName.set(accountName, {
        name: accountName,
        type: accountTypeIndex >= 0 ? (row[accountTypeIndex] ?? "").trim() : "",
        balance: money(row[balanceIndex]),
      });
    }

    if (dateIndex < 0) continue;
    let amount = 0;
    if (amountIndex >= 0) amount = money(row[amountIndex]);
    else {
      const inflow = inflowIndex >= 0 ? money(row[inflowIndex]) : 0;
      const outflow = outflowIndex >= 0 ? money(row[outflowIndex]) : 0;
      amount = inflow - Math.abs(outflow);
    }
    if (amount === 0 && amountIndex < 0 && inflowIndex < 0 && outflowIndex < 0) continue;

    transactions.push({
      date: normalizeDate(row[dateIndex] ?? ""),
      amount,
      payee: payeeIndex >= 0 ? (row[payeeIndex] ?? "").trim() : "",
      category: categoryIndex >= 0 ? (row[categoryIndex] ?? "").trim() : "",
      memo: memoIndex >= 0 ? (row[memoIndex] ?? "").trim() : "",
      account: accountName,
    });
  }

  return { accounts: Array.from(accountsByName.values()), transactions };
}

export function previewQuickenImport(fileName: string, text: string): QuickenImportPreview {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".qxf")) {
    throw new Error("QXF is not supported yet. In Quicken Classic, export QIF or CSV instead.");
  }
  const kind: QuickenFileKind = lower.endsWith(".qif") ? "qif" : "csv";
  const parsed = kind === "qif" ? parseQif(text) : parseCsv(text);
  if (parsed.accounts.length === 0 && parsed.transactions.length === 0) {
    throw new Error("No Quicken accounts or transactions could be read from this file.");
  }

  const averages = recentMonthAverages(parsed.transactions);
  const balances = accountTotals(parsed.accounts);
  const warnings: string[] = [];
  if (parsed.transactions.length === 0) {
    warnings.push("No transaction rows were found, so monthly income and spending were not estimated.");
  }
  if (
    balances.investedAssets === null &&
    balances.cash === null &&
    balances.debt === null
  ) {
    warnings.push("No usable account balances were found. Balance-sheet fields will be left unchanged.");
  }
  if (averages.monthsUsed.length > 0 && averages.monthsUsed.length < 3) {
    warnings.push(`Only ${averages.monthsUsed.length} month of transaction history was available for averages.`);
  }

  return {
    kind,
    transactions: parsed.transactions.length,
    accounts: parsed.accounts.length,
    ...averages,
    ...balances,
    warnings,
  };
}
