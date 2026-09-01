import assert from "node:assert/strict";

import {
  futureValue,
  independencePlan,
  maxExpensesForDeadline,
  monthsToTarget,
  requiredMonthlyContribution,
  sprintPlan,
} from "../src/lib/finance";
import { defaultFinance } from "../src/lib/types";

const alreadyThere = monthsToTarget({
  present: 1_000_000,
  target: 800_000,
  monthlyContribution: 0,
  annualRate: 0.05,
});
assert.equal(alreadyThere, 0);

const unreachable = monthsToTarget({
  present: 10_000,
  target: 1_000_000,
  monthlyContribution: 0,
  annualRate: 0,
});
assert.equal(unreachable, null);

const noReturn = monthsToTarget({
  present: 0,
  target: 12_000,
  monthlyContribution: 1_000,
  annualRate: 0,
});
assert.equal(noReturn, 12);

const withGrowth = monthsToTarget({
  present: 100_000,
  target: 1_000_000,
  monthlyContribution: 2_000,
  annualRate: 0.05,
});
assert.ok(withGrowth !== null && withGrowth > 12 * 15 && withGrowth < 12 * 30);

const plan = independencePlan({
  ...defaultFinance,
  netWorth: 250_000,
  monthlyIncome: 8_000,
  monthlyExpenses: 4_000,
  monthlyGiving: 800,
  expectedReturn: 5,
  swr: 4,
});
assert.equal(plan.annualSpend, 57_600);
assert.equal(plan.fiNumber, 1_440_000);
assert.equal(plan.monthlySavings, 3_200);
assert.ok(plan.monthsRemaining !== null && plan.monthsRemaining > 0);

assert.equal(
  requiredMonthlyContribution({
    present: 0,
    target: 12_000,
    months: 12,
    annualRate: 0,
  }),
  1_000
);

assert.equal(
  futureValue({
    present: 10_000,
    monthlyContribution: 1_000,
    months: 12,
    annualRate: 0,
  }),
  22_000
);

const maxLiving = maxExpensesForDeadline({
  netWorth: 0,
  monthlyIncome: 10_000,
  monthlyGiving: 0,
  months: 12,
  annualRate: 0,
  swr: 0.04,
});
assert.ok(maxLiving !== null && maxLiving >= 380 && maxLiving <= 385);

const offPace = sprintPlan({
  ...defaultFinance,
  netWorth: 250_000,
  monthlyIncome: 8_000,
  monthlyExpenses: 4_000,
  monthlyGiving: 800,
  expectedReturn: 5,
  swr: 4,
  targetMonths: 12,
});
assert.equal(offPace.onTrack, false);
assert.ok(offPace.extraMonthlySavings > 10_000);
assert.ok(offPace.lumpSumNeeded > 1_000_000);

const close = sprintPlan({
  ...defaultFinance,
  netWorth: 1_410_000,
  monthlyIncome: 8_000,
  monthlyExpenses: 4_000,
  monthlyGiving: 800,
  expectedReturn: 0,
  swr: 4,
  targetMonths: 12,
});
assert.equal(close.onTrack, true);
assert.equal(close.extraMonthlySavings, 0);

const arrived = sprintPlan({
  ...defaultFinance,
  netWorth: 1_500_000,
  monthlyIncome: 8_000,
  monthlyExpenses: 4_000,
  monthlyGiving: 800,
  expectedReturn: 5,
  swr: 4,
  targetMonths: 6,
});
assert.equal(arrived.reached, true);
assert.equal(arrived.onTrack, true);
assert.equal(arrived.lumpSumNeeded, 0);

console.log("finance tests passed");
