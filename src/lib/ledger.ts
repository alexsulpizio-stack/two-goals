import type { FinanceInputs } from "./types";

export const LEDGER_FIELDS = [
  "netWorth",
  "monthlyIncome",
  "monthlyExpenses",
  "monthlyGiving",
] as const;

export type LedgerField = (typeof LEDGER_FIELDS)[number];

export type LedgerSnapshot = {
  date: string;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyGiving: number;
};

export function asLedgerSnapshot(item: unknown): LedgerSnapshot | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Partial<LedgerSnapshot>;
  if (typeof row.date !== "string" || row.date.length < 8) return null;
  return {
    date: row.date,
    netWorth: asMoney(row.netWorth),
    monthlyIncome: asMoney(row.monthlyIncome),
    monthlyExpenses: asMoney(row.monthlyExpenses),
    monthlyGiving: asMoney(row.monthlyGiving),
  };
}

export function asLedgerSnapshots(items: unknown): LedgerSnapshot[] {
  if (!Array.isArray(items)) return [];
  return items
    .map(asLedgerSnapshot)
    .filter((item): item is LedgerSnapshot => item !== null);
}

export function ledgerFromFinance(finance: FinanceInputs, date: string): LedgerSnapshot {
  return {
    date,
    netWorth: finance.netWorth,
    monthlyIncome: finance.monthlyIncome,
    monthlyExpenses: finance.monthlyExpenses,
    monthlyGiving: finance.monthlyGiving,
  };
}

export function monthlySurplus(ledger: Pick<
  LedgerSnapshot,
  "monthlyIncome" | "monthlyExpenses" | "monthlyGiving"
>) {
  return ledger.monthlyIncome - ledger.monthlyExpenses - ledger.monthlyGiving;
}

function asMoney(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
