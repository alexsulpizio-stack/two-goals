import type { FinanceInputs, SprintMonths } from "./types";
import { namedIncomeSources, totalMonthlyIncome } from "./income";

export const SPRINT_WINDOWS: SprintMonths[] = [6, 12];

export type IndependencePlan = {
  annualSpend: number;
  annualGiving: number;
  fiNumber: number;
  fiCapital: number;
  monthlySavings: number;
  savingsRate: number;
  givingRate: number;
  progress: number;
  monthsRemaining: number | null;
  reached: boolean;
  hasInputs: boolean;
};

export type SprintPlan = {
  months: SprintMonths;
  onTrack: boolean;
  reached: boolean;
  requiredMonthlySavings: number;
  extraMonthlySavings: number;
  monthlyMargin: number;
  lumpSumNeeded: number;
  projectedNetWorth: number;
  maxMonthlyExpenses: number | null;
  expenseCutNeeded: number;
  requiredMonthlyIncome: number;
  incomeLift: number;
  grossIncomeLift: number;
  cutsAloneInsufficient: boolean;
};

function resolvedMonthlyIncome(finance: FinanceInputs): number {
  const sources = namedIncomeSources(finance.incomeSources ?? []);
  return sources.length > 0 ? totalMonthlyIncome(finance.incomeSources) : finance.monthlyIncome;
}

export function balanceSheetPosition(finance: FinanceInputs): number {
  const invested = Math.max(0, finance.netWorth);
  const spendableCash = Math.max(0, Math.max(0, finance.cash) - Math.max(0, finance.emergencyReserve));
  return invested + spendableCash - Math.max(0, finance.debt);
}

export function fiCapital(finance: FinanceInputs): number {
  return Math.max(0, balanceSheetPosition(finance));
}

export function grossIncomeForTakeHome(takeHome: number, estimatedTaxRate: number): number {
  const net = Math.max(0, takeHome);
  const rate = Math.min(95, Math.max(0, estimatedTaxRate)) / 100;
  return rate >= 0.95 ? Number.POSITIVE_INFINITY : net / (1 - rate);
}

export function independencePlan(finance: FinanceInputs): IndependencePlan {
  const monthlyIncome = resolvedMonthlyIncome(finance);
  const annualLiving = Math.max(0, finance.monthlyExpenses) * 12;
  const annualGiving = Math.max(0, finance.monthlyGiving) * 12;
  const annualSpend = annualLiving + annualGiving;
  const swr = finance.swr > 0 ? finance.swr / 100 : 0.04;
  const fiNumber = annualSpend > 0 ? annualSpend / swr : 0;
  const capital = fiCapital(finance);
  const monthlySavings = monthlyIncome - finance.monthlyExpenses - finance.monthlyGiving;
  const savingsRate = monthlyIncome > 0 ? monthlySavings / monthlyIncome : 0;
  const givingRate = monthlyIncome > 0 ? finance.monthlyGiving / monthlyIncome : 0;
  const hasInputs =
    finance.netWorth > 0 ||
    finance.cash > 0 ||
    finance.debt > 0 ||
    monthlyIncome > 0 ||
    finance.monthlyExpenses > 0 ||
    finance.monthlyGiving > 0;

  const reached = fiNumber > 0 && capital >= fiNumber;
  const progress = fiNumber <= 0 ? 0 : Math.min(1, Math.max(0, capital / fiNumber));
  const monthsRemaining = reached
    ? 0
    : monthsToTarget({
        present: capital,
        target: fiNumber,
        monthlyContribution: monthlySavings,
        annualRate: finance.expectedReturn / 100,
      });

  return {
    annualSpend,
    annualGiving,
    fiNumber,
    fiCapital: capital,
    monthlySavings,
    savingsRate,
    givingRate,
    progress,
    monthsRemaining,
    reached,
    hasInputs,
  };
}

export function monthsToTarget({ present, target, monthlyContribution, annualRate }: {
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
  if (denominator <= 0 || numerator / denominator <= 1) return null;
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
  if (years === 0) return remainingMonths === 1 ? "1 month" : `${remainingMonths} months`;
  if (remainingMonths === 0) return years === 1 ? "1 year" : `${years} years`;
  return `${years === 1 ? "1 year" : `${years} years`}, ${remainingMonths === 1 ? "1 month" : `${remainingMonths} months`}`;
}

export function futureValue({ present, monthlyContribution, months, annualRate }: {
  present: number;
  monthlyContribution: number;
  months: number;
  annualRate: number;
}): number {
  if (months <= 0) return present;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  if (Math.abs(monthlyRate) < 1e-12) return present + monthlyContribution * months;
  const growth = Math.pow(1 + monthlyRate, months);
  return present * growth + monthlyContribution * ((growth - 1) / monthlyRate);
}

export function requiredMonthlyContribution({ present, target, months, annualRate }: {
  present: number;
  target: number;
  months: number;
  annualRate: number;
}): number {
  if (present >= target) return 0;
  if (months <= 0) return Number.POSITIVE_INFINITY;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  if (Math.abs(monthlyRate) < 1e-12) return (target - present) / months;
  const growth = Math.pow(1 + monthlyRate, months);
  return ((target - present * growth) * monthlyRate) / (growth - 1);
}

export function requiredPresentValue({ target, monthlyContribution, months, annualRate }: {
  target: number;
  monthlyContribution: number;
  months: number;
  annualRate: number;
}): number {
  if (months <= 0) return target;
  const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
  if (Math.abs(monthlyRate) < 1e-12) return target - monthlyContribution * months;
  const growth = Math.pow(1 + monthlyRate, months);
  const annuity = monthlyContribution * ((growth - 1) / monthlyRate);
  return (target - annuity) / growth;
}

export function maxExpensesForDeadline({ netWorth, monthlyIncome, monthlyGiving, months, annualRate, swr }: {
  netWorth: number;
  monthlyIncome: number;
  monthlyGiving: number;
  months: number;
  annualRate: number;
  swr: number;
}): number | null {
  const withdrawal = swr > 0 ? swr : 0.04;
  const giving = Math.max(0, monthlyGiving);
  const hits = (expenses: number) => {
    const living = Math.max(0, expenses);
    const target = (12 * (living + giving)) / withdrawal;
    const contribution = monthlyIncome - living - giving;
    return futureValue({
      present: Math.max(0, netWorth),
      monthlyContribution: contribution,
      months,
      annualRate,
    }) >= target - 0.5;
  };
  if (!hits(0)) return null;
  let low = 0;
  let high = Math.max(monthlyIncome, 1) * 4;
  if (hits(high)) return high;
  for (let index = 0; index < 48; index += 1) {
    const mid = (low + high) / 2;
    if (hits(mid)) low = mid;
    else high = mid;
  }
  return Math.max(0, Math.floor(low));
}

export function sprintPlan(finance: FinanceInputs, months: SprintMonths = finance.targetMonths): SprintPlan {
  const plan = independencePlan(finance);
  const monthlyIncome = resolvedMonthlyIncome(finance);
  const annualRate = finance.expectedReturn / 100;
  const present = plan.fiCapital;
  const projectedNetWorth = futureValue({
    present,
    monthlyContribution: plan.monthlySavings,
    months,
    annualRate,
  });
  const reached = plan.reached;
  const requiredMonthlySavings = reached
    ? 0
    : Math.max(0, requiredMonthlyContribution({ present, target: plan.fiNumber, months, annualRate }));
  const extraMonthlySavings = Math.max(0, requiredMonthlySavings - plan.monthlySavings);
  const monthlyMargin = plan.monthlySavings - requiredMonthlySavings;
  const lumpSumNeeded = reached
    ? 0
    : Math.max(0, requiredPresentValue({
        target: plan.fiNumber,
        monthlyContribution: plan.monthlySavings,
        months,
        annualRate,
      }) - present);
  const onTrack = reached || (plan.fiNumber > 0 && projectedNetWorth >= plan.fiNumber - 1);
  const maxMonthlyExpenses = maxExpensesForDeadline({
    netWorth: present,
    monthlyIncome,
    monthlyGiving: finance.monthlyGiving,
    months,
    annualRate,
    swr: finance.swr / 100,
  });
  const expenseCutNeeded = maxMonthlyExpenses === null ? 0 : Math.max(0, finance.monthlyExpenses - maxMonthlyExpenses);
  const requiredMonthlyIncome = requiredMonthlySavings + finance.monthlyExpenses + finance.monthlyGiving;
  const incomeLift = Math.max(0, requiredMonthlyIncome - monthlyIncome);
  const grossIncomeLift = grossIncomeForTakeHome(incomeLift, finance.estimatedTaxRate);

  return {
    months,
    onTrack,
    reached,
    requiredMonthlySavings,
    extraMonthlySavings,
    monthlyMargin,
    lumpSumNeeded,
    projectedNetWorth,
    maxMonthlyExpenses,
    expenseCutNeeded,
    requiredMonthlyIncome,
    incomeLift,
    grossIncomeLift,
    cutsAloneInsufficient: maxMonthlyExpenses === null && !reached,
  };
}
