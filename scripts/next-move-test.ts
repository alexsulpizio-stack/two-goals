import assert from "node:assert/strict";

import { independencePlan, sprintPlan } from "../src/lib/finance";
import { nextMove } from "../src/lib/next-move";
import { defaultFinance } from "../src/lib/types";

const empty = nextMove(
  independencePlan(defaultFinance),
  sprintPlan(defaultFinance),
  defaultFinance
);
assert.match(empty.headline, /living costs and giving/i);

const bleed = {
  ...defaultFinance,
  monthlyIncome: 4_000,
  monthlyExpenses: 5_000,
  monthlyGiving: 200,
  netWorth: 50_000,
};
const bleedMove = nextMove(
  independencePlan(bleed),
  sprintPlan(bleed),
  bleed
);
assert.match(bleedMove.headline, /empties/i);

const short = {
  ...defaultFinance,
  netWorth: 100_000,
  monthlyIncome: 8_000,
  monthlyExpenses: 6_000,
  monthlyGiving: 400,
};
const shortMove = nextMove(
  independencePlan(short),
  sprintPlan(short, 12),
  { ...short, targetMonths: 12 }
);
assert.match(shortMove.kicker, /pick one/i);
assert.ok(shortMove.lines.length >= 2);

console.log("next-move tests passed");
