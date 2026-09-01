import { accountRole, classifyCategory } from "./classify";
import { addMonthsIso, monthsBetween } from "./money";
import type {
  CategoryTotal,
  LedgerKind,
  QuickenBundle,
  QuickenSummary,
  WindowMonths,
} from "./types";

export function mergeBundles(bundles: QuickenBundle[]): QuickenBundle {
  const categoryFlags = Object.assign(
    {},
    ...bundles.map((bundle) => bundle.categoryFlags)
  );
  const accounts = new Map(
    bundles.flatMap((bundle) =>
      bundle.accounts.map((account) => [account.name.toLowerCase(), account])
    )
  );
  return {
    fileName: bundles.map((bundle) => bundle.fileName).join(", "),
    transactions: bundles.flatMap((bundle) => bundle.transactions),
    accounts: [...accounts.values()],
    categoryFlags,
    warnings: bundles.flatMap((bundle) => bundle.warnings),
  };
}

export function summarizeQuicken(
  bundle: QuickenBundle,
  windowMonths: WindowMonths,
  overrides: Record<string, LedgerKind> = {}
): QuickenSummary {
  const warnings = [...bundle.warnings];
  const dated = bundle.transactions.filter((item) => item.date);
  const endDate =
    dated.reduce<string | null>(
      (latest, item) => (latest && latest > item.date ? latest : item.date),
      null
    );
  const cutoff = endDate ? addMonthsIso(endDate, -(windowMonths - 1)) : null;
  const windowed = cutoff
    ? dated.filter((item) => item.date >= cutoff)
    : dated;

  const startDate = windowed.reduce<string | null>(
    (earliest, item) =>
      earliest && earliest < item.date ? earliest : item.date,
    null
  );

  const monthsCovered =
    startDate && endDate ? monthsBetween(startDate, endDate) : 1;

  const buckets = new Map<
    string,
    { kind: LedgerKind; total: number; count: number }
  >();

  for (const item of windowed) {
    const kind = classifyCategory(
      item.category,
      item.amount,
      bundle.categoryFlags,
      overrides[item.category] ?? overrides[item.category.split(":")[0] ?? ""],
      item.accountType
    );
    if (kind === "transfer" || kind === "ignore") continue;
    const key = item.category || item.payee || "(uncategorized)";
    const current = buckets.get(key) ?? { kind, total: 0, count: 0 };
    current.kind = kind;
    current.total += item.amount;
    current.count += 1;
    buckets.set(key, current);
  }

  const categories: CategoryTotal[] = [...buckets.entries()]
    .map(([name, value]) => ({
      name,
      kind: value.kind,
      total: value.total,
      count: value.count,
    }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  const sumAbs = (kind: LedgerKind) =>
    categories
      .filter((item) => item.kind === kind)
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

  const divisor = monthsCovered;
  const monthlyIncome = roundMoney(sumAbs("income") / divisor);
  const monthlyGiving = roundMoney(sumAbs("giving") / divisor);
  const monthlyExpenses = roundMoney(sumAbs("expense") / divisor);

  const accounts = bundle.accounts.map((account) => ({
    ...account,
    role: accountRole(account),
  }));
  const withBalances = accounts.filter((account) => account.balance !== null);
  const sumRole = (role: (typeof accounts)[number]["role"]) =>
    withBalances
      .filter((account) => account.role === role)
      .reduce((sum, account) => sum + (account.balance ?? 0), 0);

  const investedHoldings = sumRole("invested");
  const cashBalance = sumRole("cash");
  const liabilities = Math.abs(sumRole("liability"));
  const homeEquityExcluded = sumRole("home") + sumRole("vehicle");
  const hasBalances = withBalances.length > 0;
  const investedNetWorth = hasBalances
    ? roundMoney(investedHoldings + cashBalance - liabilities)
    : null;

  if (dated.length && monthsCovered < windowMonths) {
    warnings.push(
      `Only ${monthsCovered} month${monthsCovered === 1 ? "" : "s"} of transactions were in this file, so averages use that span rather than ${windowMonths}.`
    );
  }
  if (!hasBalances) {
    warnings.push(
      "No account balances were in the file. Export a Net Worth report to CSV to fill invested net worth, or enter it by hand."
    );
  }
  if (monthlyGiving === 0 && dated.length > 0) {
    warnings.push(
      "No giving categories were recognized. Click a charity or tithe row below to mark it as Giving."
    );
  }

  return {
    fileName: bundle.fileName,
    transactionCount: windowed.length,
    startDate,
    endDate,
    monthsCovered,
    windowMonths,
    monthlyIncome,
    monthlyExpenses,
    monthlyGiving,
    investedNetWorth,
    cashBalance: hasBalances ? roundMoney(cashBalance) : null,
    homeEquityExcluded: roundMoney(homeEquityExcluded),
    categories,
    accounts,
    warnings,
  };
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
