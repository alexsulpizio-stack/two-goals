import assert from "node:assert/strict";

import { independencePlan, monthsToTarget } from "../src/lib/finance.ts";

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

console.log("finance tests passed");
