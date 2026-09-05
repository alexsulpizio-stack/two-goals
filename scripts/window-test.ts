import assert from "node:assert/strict";

import { balanceSheetPosition, independencePlan, sprintPlan } from "../src/lib/finance";
import { defaultFinance } from "../src/lib/types";

const finance = {
  ...defaultFinance,
  netWorth: 200_000,
  cash: 40_000,
  emergencyReserve: 15_000,
  debt: 10_000,
  monthlyIncome: 9_000,
  monthlyExpenses: 4_000,
  monthlyGiving: 500,
  expectedReturn: 5,
  swr: 4,
  targetMonths: 12 as const,
};

const effectiveCapital = Math.max(0, balanceSheetPosition(finance));
assert.equal(effectiveCapital, 215_000);

const windowFinance = {
  ...finance,
  netWorth: effectiveCapital,
  cash: 0,
  emergencyReserve: 0,
  debt: 0,
};

const plan = independencePlan(windowFinance);
const sprint = sprintPlan(windowFinance, 12);
assert.equal(plan.fiCapital, 215_000);
assert.equal(plan.fiNumber, 1_350_000);
assert.ok(sprint.incomeLift > 0);

console.log("window tests passed");
