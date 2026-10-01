import assert from "node:assert/strict";

import {
  bridgeEffectiveAnnualValue,
  runRetirementEngine,
} from "../src/lib/retirement-engine";
import { defaultRetirementEngine } from "../src/lib/types";

const result = runRetirementEngine(defaultRetirementEngine);
const age55 = result.ageComparison.find((row) => row.retirementAge === 55);
const age58 = result.ageComparison.find((row) => row.retirementAge === 58);
const age60 = result.ageComparison.find((row) => row.retirementAge === 60);

assert.ok(age55);
assert.ok(age58);
assert.ok(age60);
assert.equal(result.bridgeGrossWages, 25_000);
assert.equal(result.bridgeNetWages, 20_000);
assert.equal(bridgeEffectiveAnnualValue(defaultRetirementEngine), 25_600);
assert.equal(result.selected.strategy, "full");
assert.equal(result.selected.retirementAge, 55);
assert.equal(result.selected.status, "RED");
assert.ok(result.selected.maximumUnfundedGap > 100_000);
assert.equal(age58.status, "GREEN");
assert.equal(age60.status, "GREEN");
assert.ok(age60.endingBalanceAtTarget > age58.endingBalanceAtTarget);
assert.ok(result.strategyComparison.some((row) => row.strategy === "bridge"));
assert.equal(result.stressTests.length, 9);
assert.ok(result.stressTests.some((test) => test.name === "Sequence stress" && test.summary.status === "RED"));

console.log("retirement engine tests passed");
