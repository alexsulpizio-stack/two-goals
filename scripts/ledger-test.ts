import assert from "node:assert/strict";

import { snapshotDelta, snapshotTarget } from "../src/lib/ledger";

const mark = snapshotTarget(
  {
    date: "2026-09-01",
    netWorth: 250_000,
    monthlyIncome: 8_000,
    monthlyExpenses: 4_000,
    monthlyGiving: 800,
  },
  4
);
assert.equal(mark.fiNumber, 1_440_000);
assert.equal(mark.surplus, 3_200);
assert.equal(mark.gap, 1_190_000);

const later = snapshotDelta(
  [
    {
      date: "2026-09-15",
      netWorth: 260_000,
      monthlyIncome: 8_000,
      monthlyExpenses: 4_000,
      monthlyGiving: 800,
    },
    {
      date: "2026-09-01",
      netWorth: 250_000,
      monthlyIncome: 8_000,
      monthlyExpenses: 4_000,
      monthlyGiving: 800,
    },
  ],
  4
);
assert.ok(later);
assert.equal(later.netWorthChange, 10_000);
assert.equal(later.gapChange, -10_000);

console.log("ledger tests passed");
