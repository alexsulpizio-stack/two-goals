import assert from "node:assert/strict";

import { independencePlan, sprintPlan } from "../src/lib/finance";
import { extraIncomeNeeded, incomePlays, streamSplits } from "../src/lib/income-plays";
import { defaultFinance } from "../src/lib/types";

const extra = 10_000;
const splits = streamSplits(extra);
assert.equal(splits.one, 10_000);
assert.equal(splits.two, 5_000);
assert.equal(splits.three, 3_333);

const short = {
  ...defaultFinance,
  netWorth: 100_000,
  monthlyIncome: 8_000,
  monthlyExpenses: 6_000,
  monthlyGiving: 400,
};
const plan = independencePlan(short);
const sprint = sprintPlan(short, 12);
assert.ok(extraIncomeNeeded(sprint) > 0);
const plays = incomePlays({ plan, sprint, ready: true });
assert.match(plays[0].title, /one new stream/i);
assert.match(plays[1].title, /two smaller/i);
assert.match(plays[2].title, /work you have/i);
assert.doesNotMatch(plays[0].body, /smaller life is the plan/i);

console.log("income-plays tests passed");
