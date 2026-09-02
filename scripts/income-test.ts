import assert from "node:assert/strict";

import { independencePlan } from "../src/lib/finance";
import {
  namedIncomeSources,
  normalizeIncomeSources,
  totalMonthlyIncome,
} from "../src/lib/income";
import { asLedgerSnapshot, ledgerFromFinance } from "../src/lib/ledger";
import { defaultFinance } from "../src/lib/types";

const migrated = normalizeIncomeSources({ monthlyIncome: 8_000 });
assert.equal(migrated.length, 1);
assert.equal(migrated[0]?.name, "Take-home");
assert.equal(migrated[0]?.monthly, 8_000);
assert.equal(totalMonthlyIncome(migrated), 8_000);

const two = normalizeIncomeSources({
  monthlyIncome: 1,
  incomeSources: [
    { id: "job", name: "Parish stipend", monthly: 5_000 },
    { id: "side", name: "Evenings", monthly: 1_200 },
  ],
});
assert.equal(totalMonthlyIncome(two), 6_200);

const empty = normalizeIncomeSources({});
assert.equal(empty.length, 1);
assert.equal(empty[0]?.monthly, 0);
assert.equal(namedIncomeSources(empty).length, 0);

const snap = asLedgerSnapshot({
  date: "2026-09-02",
  netWorth: 10,
  monthlyIncome: 99,
  monthlyExpenses: 0,
  monthlyGiving: 0,
  incomeSources: [
    { id: "a", name: "Job", monthly: 4_000 },
    { id: "b", name: "Rent", monthly: 900 },
  ],
});
assert.ok(snap);
assert.equal(snap.monthlyIncome, 4_900);
assert.equal(snap.incomeSources?.length, 2);

const fromFinance = ledgerFromFinance(
  {
    ...defaultFinance,
    incomeSources: two,
    monthlyIncome: 6_200,
  },
  "2026-09-02"
);
assert.equal(fromFinance.monthlyIncome, 6_200);
assert.equal(fromFinance.incomeSources?.length, 2);

const split = independencePlan({
  ...defaultFinance,
  monthlyIncome: 0,
  monthlyExpenses: 3_000,
  monthlyGiving: 200,
  incomeSources: [
    { id: "a", name: "Job", monthly: 4_000 },
    { id: "b", name: "Side", monthly: 1_000 },
  ],
});
assert.equal(split.monthlySavings, 1_800);
assert.equal(split.hasInputs, true);

console.log("income tests passed");
