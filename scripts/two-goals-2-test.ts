import assert from "node:assert/strict";

import { independencePlan, sprintPlan } from "../src/lib/finance";
import { defaultFinance } from "../src/lib/types";

const withBalanceSheet = {
  ...defaultFinance,
  netWorth: 100_000,
  cash: 30_000,
  emergencyReserve: 10_000,
  debt: 5_000,
  monthlyIncome: 8_000,
  incomeSources: [{ id: "income", name: "Income", monthly: 8_000 }],
  monthlyExpenses: 3_000,
  monthlyGiving: 500,
};

const plan = independencePlan(withBalanceSheet);
assert.equal(plan.fiCapital, 115_000);
assert.equal(plan.fiNumber, 1_050_000);
assert.equal(plan.monthlySavings, 4_500);

const moreCash = independencePlan({ ...withBalanceSheet, cash: 40_000 });
assert.equal(moreCash.fiCapital, 125_000);
assert.ok(moreCash.progress > plan.progress);

const moreDebt = independencePlan({ ...withBalanceSheet, debt: 25_000 });
assert.equal(moreDebt.fiCapital, 95_000);
assert.ok(moreDebt.progress < plan.progress);

const protectedCash = independencePlan({
  ...withBalanceSheet,
  cash: 30_000,
  emergencyReserve: 30_000,
  debt: 0,
});
assert.equal(protectedCash.fiCapital, 100_000);

const sprint = sprintPlan(withBalanceSheet, 12);
assert.ok(sprint.incomeLift >= 0);
assert.ok(sprint.requiredMonthlyIncome >= withBalanceSheet.monthlyExpenses + withBalanceSheet.monthlyGiving);

console.log("Two Goals 2.0 tests passed");
