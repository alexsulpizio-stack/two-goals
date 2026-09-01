import type { FinanceInputs } from "./types";

export type IndependencePlan = {
  annualSpend: number;
  annualGiving: number;
  fiNumber: number;
  monthlySavings: number;
  savingsRate: number;
  givingRate: number;
  progress: number;
  monthsRemaining: number | null;
  reached: boolean;
  hasInputs: boolean;
};

export function independencePlan(finance: FinanceInputs): IndependencePlan {
  const annualLiving = Math.max(0, finance.monthlyExpenses) * 12;
  const annualGiving = Math.max(0, finance.monthlyGiving) * 12;
  const annualSpend = annualLiving + annualGiving;
  const swr = finance.swr > 0 ? finance.swr / 100 : 0.04;
  const fiNumber = annualSpend > 0 ? annualSpend / swr : 0;
  const monthlySavings =
    finance.monthlyIncome - finance.monthlyExpenses - finance.monthlyGiving;
  const savingsRate =
    finance.monthlyIncome > 0 ? monthlySavings / finance.monthlyIncome : 0;
  const givingRate =
    finance.monthlyIncome > 0
      ? finance.monthlyGiving / finance.monthlyIncome
      : 0;
  const hasInputs =
    finance.netWorth > 0 ||
    finance.monthlyIncome > 0 ||
    finance.monthlyExpenses > 0;

  const reached = fiNumber > 0 && finance.netWorth >= fiNumber;
  const progress =
    fiNumber <= 0 ? 0 : Math.min(1, Math.max(0, finance.netWorth / fiNumber));

  const monthsRemaining = reached
    ? 0
    : monthsToTarget({
        present: Math.max(0, finance.netWorth),
        target: fiNumber,
        monthlyContribution: monthlySavings,
        annualRate: finance.expectedReturn / 100,
      });

  return {
    annualSpend,
    annualGiving,
    fiNumber,
    monthlySavings,
    savingsRate,
    givingRate,
    progress,
    monthsRemaining,
    reached,
    hasInputs,
  };
}

export function monthsToTarget({
  present,
  target,
  monthlyContribution,
  annualRate,
}: {
  present: number;
  target: number;
  monthlyContribution: number;
  annualRate: number;
}): number | null {
  if (target <= 0) return null;
  if (present >= target) return 0;

  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;

  if (Math.abs(monthlyRate) < 1e-12) {
    if (monthlyContribution <= 0) return null;
    return (target - present) / monthlyContribution;
  }

  const numerator = target * monthlyRate + monthlyContribution;
  const denominator = present * monthlyRate + monthlyContribution;

  if (denominator <= 0 || numerator / denominator <= 1) {
    return null;
  }

  return Math.log(numerator / denominator) / Math.log(1 + monthlyRate);
}

export function formatMoney(amount: number): string {
  const absolute = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: absolute >= 1000 ? 0 : 2,
  }).format(absolute);
  return amount < 0 ? `−${formatted}` : formatted;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export function formatDuration(months: number | null): string {
  if (months === null) return "Not on a path yet";
  if (months <= 0) return "Already there";
  if (months < 1) return "This month";

  const total = Math.ceil(months);
  const years = Math.floor(total / 12);
  const remainingMonths = total % 12;

  if (years === 0) {
    return remainingMonths === 1 ? "1 month" : `${remainingMonths} months`;
  }
  if (remainingMonths === 0) {
    return years === 1 ? "1 year" : `${years} years`;
  }
  const yearLabel = years === 1 ? "1 year" : `${years} years`;
  const monthLabel =
    remainingMonths === 1 ? "1 month" : `${remainingMonths} months`;
  return `${yearLabel}, ${monthLabel}`;
}
