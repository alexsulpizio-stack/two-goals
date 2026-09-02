import {
  asIncomeSources,
  namedIncomeSources,
  normalizeIncomeSources,
  totalMonthlyIncome,
} from "./income";
import type { FinanceInputs, LedgerSnapshot } from "./types";

export type { LedgerSnapshot };

export const LEDGER_FIELDS = [
  "netWorth",
  "monthlyIncome",
  "monthlyExpenses",
  "monthlyGiving",
] as const;

export type LedgerField = (typeof LEDGER_FIELDS)[number];

export function asLedgerSnapshot(item: unknown): LedgerSnapshot | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Partial<LedgerSnapshot> & { incomeSources?: unknown };
  if (typeof row.date !== "string" || row.date.length < 8) return null;
  const incomeSources = namedIncomeSources(asIncomeSources(row.incomeSources));
  const monthlyIncome =
    incomeSources.length > 0
      ? totalMonthlyIncome(incomeSources)
      : asMoney(row.monthlyIncome);
  return {
    date: row.date,
    netWorth: asMoney(row.netWorth),
    monthlyIncome,
    monthlyExpenses: asMoney(row.monthlyExpenses),
    monthlyGiving: asMoney(row.monthlyGiving),
    ...(incomeSources.length > 0 ? { incomeSources } : {}),
  };
}

export function asLedgerSnapshots(items: unknown): LedgerSnapshot[] {
  if (!Array.isArray(items)) return [];
  return items
    .map(asLedgerSnapshot)
    .filter((item): item is LedgerSnapshot => item !== null);
}

export function ledgerFromFinance(finance: FinanceInputs, date: string): LedgerSnapshot {
  const incomeSources = namedIncomeSources(normalizeIncomeSources(finance));
  return {
    date,
    netWorth: finance.netWorth,
    monthlyIncome: totalMonthlyIncome(normalizeIncomeSources(finance)),
    monthlyExpenses: finance.monthlyExpenses,
    monthlyGiving: finance.monthlyGiving,
    ...(incomeSources.length > 0 ? { incomeSources } : {}),
  };
}

export function monthlySurplus(ledger: Pick<
  LedgerSnapshot,
  "monthlyIncome" | "monthlyExpenses" | "monthlyGiving"
>) {
  return ledger.monthlyIncome - ledger.monthlyExpenses - ledger.monthlyGiving;
}

export function isEmptyLedger(
  ledger: Pick<
    LedgerSnapshot,
    "netWorth" | "monthlyIncome" | "monthlyExpenses" | "monthlyGiving"
  >
) {
  return LEDGER_FIELDS.every((key) => ledger[key] === 0);
}

export function upsertTodaySnapshot(
  snapshots: LedgerSnapshot[],
  snapshot: LedgerSnapshot
) {
  if (isEmptyLedger(snapshot)) return snapshots;
  return [snapshot, ...snapshots.filter((item) => item.date !== snapshot.date)];
}

export function snapshotTarget(
  snapshot: LedgerSnapshot,
  swrPercent: number
) {
  const annual =
    (Math.max(0, snapshot.monthlyExpenses) + Math.max(0, snapshot.monthlyGiving)) *
    12;
  const swr = swrPercent > 0 ? swrPercent / 100 : 0.04;
  const fiNumber = annual > 0 ? annual / swr : 0;
  const surplus = monthlySurplus(snapshot);
  const gap = Math.max(0, fiNumber - Math.max(0, snapshot.netWorth));
  const progress =
    fiNumber > 0 ? Math.min(1, Math.max(0, snapshot.netWorth / fiNumber)) : 0;
  return { fiNumber, surplus, gap, progress };
}

export function snapshotDelta(
  snapshots: LedgerSnapshot[],
  swrPercent: number
) {
  if (snapshots.length < 2) return null;
  const newestRow = snapshots[0];
  const oldestRow = snapshots[snapshots.length - 1];
  if (!newestRow || !oldestRow || newestRow.date === oldestRow.date) return null;
  const newest = snapshotTarget(newestRow, swrPercent);
  const oldest = snapshotTarget(oldestRow, swrPercent);
  return {
    from: oldestRow,
    to: newestRow,
    newest,
    oldest,
    gapChange: newest.gap - oldest.gap,
    netWorthChange: newestRow.netWorth - oldestRow.netWorth,
    surplusChange: newest.surplus - oldest.surplus,
  };
}

export function incomeBreakdown(snapshot: LedgerSnapshot): string {
  const sources = snapshot.incomeSources?.filter((source) => source.monthly > 0) ?? [];
  if (sources.length <= 1) return "";
  return sources
    .map((source) => `${source.name || "Income"} ${formatMoneyPlain(source.monthly)}`)
    .join(" · ");
}

function formatMoneyPlain(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(amount) >= 1000 ? 0 : 2,
  }).format(amount);
}

function asMoney(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
