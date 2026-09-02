export type LedgerKind = "income" | "expense" | "giving" | "transfer" | "ignore";

export type AccountRole =
  | "invested"
  | "cash"
  | "home"
  | "vehicle"
  | "liability"
  | "other";

export type ParsedTransaction = {
  date: string;
  amount: number;
  payee: string;
  category: string;
  account: string;
  memo: string;
  accountType: string;
  action: string;
};

export type ParsedAccount = {
  name: string;
  type: string;
  balance: number | null;
};

export type QuickenBundle = {
  fileName: string;
  transactions: ParsedTransaction[];
  accounts: ParsedAccount[];
  categoryFlags: Record<string, "income" | "expense">;
  warnings: string[];
};

export type CategoryTotal = {
  name: string;
  kind: LedgerKind;
  total: number;
  count: number;
};

export type WindowMonths = 3 | 12;

export type QuickenSummary = {
  fileName: string;
  transactionCount: number;
  startDate: string | null;
  endDate: string | null;
  monthsCovered: number;
  windowMonths: WindowMonths;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyGiving: number;
  periodIncome: number;
  periodExpenses: number;
  periodGiving: number;
  investedNetWorth: number | null;
  cashBalance: number | null;
  homeEquityExcluded: number;
  categories: CategoryTotal[];
  accounts: Array<ParsedAccount & { role: AccountRole }>;
  warnings: string[];
};
