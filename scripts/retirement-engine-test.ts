import assert from "node:assert/strict";

import { bridgeEffectiveAnnualValue, runRetirementEngine } from "../src/lib/retirement-engine";
import { asRetirementEngine } from "../src/lib/retirement-inputs";
import { defaultRetirementEngine, type RetirementEngineInputs } from "../src/lib/types";

// Deliberately synthetic: no household balances, benefits or workbook snapshots.
const fixture: RetirementEngineInputs = {
  isExample: false,
  selectedStrategy: "full", selectedMarketCase: "base", retirementAge: 59,
  alexClaimAge: 67, darleneClaimAge: 67, asOfYear: 2020,
  alexBirthYear: 1970, darleneBirthYear: 1968,
  coreAssets: 1_000_000, annualSaving: 10_000, contractIncomeAfterTax: 0,
  projectIncomeAfterTax: 0, projectIncomeEndYear: null,
  livingCostBaseYear: 2020, healthcareCostBaseYear: 2020,
  darleneNetWages: 0, darleneGrossWages: 0, useLifeInsurance: false,
  lifeInsuranceCashValue: 20_000, targetPlanningAge: 90, maximumPlanningAge: 100,
  baseReturnPct: 4, conservativeReturnPct: 2, stressNormalReturnPct: 2,
  stressYear0ReturnPct: -15, stressYear1ReturnPct: -5, stressYear2ReturnPct: 1, stressYear3ReturnPct: 2,
  baseInflationPct: 2, conservativeInflationPct: 3, stressInflationPct: 4,
  baseTaxPct: 20, conservativeTaxPct: 25, stressTaxPct: 30,
  normalizedSpending: 40_000, permanentSpendingAdjustmentPct: 0,
  additionalChildSupport: 0, childSupportThroughAge: 27, childSupportEndYear: null,
  annualMortgagePayment: 10_000, mortgagePayoffYear: 2035,
  stressExtraChildSupport: 8_000, stressChildSupportThroughAge: 30, stressChildSupportEndYear: null,
  oneTimeUnexpectedExpense: 12_000,
  acaFamilyGrossPremium: 7_000, acaFamilySubsidyEstimate: 2_000, acaFamilyOutOfPocket: 1_000,
  alexSingleNetPremium: 3_000, alexSingleOutOfPocket: 1_000,
  darleneMedicareAnnualCost: 2_000, alexMedicareAnnualCost: 2_000,
  darleneMedicareStartYear: 2033, alexMedicareStartYear: 2035, stressHealthcareMultiplier: 1.5,
  alexSocialSecurity: { 62: 800, 67: 1_000, 70: 1_200 },
  darleneSocialSecurity: { 62: 700, 67: 900, 70: 1_100 },
  bridgeHoursPerWeek: 10, bridgeHourlyPay: 20, bridgeWeeksPerYear: 40,
  bridgeTaxPct: 20, bridgeEmployeePlusSpousePremium: 2_000, bridgeOutOfPocket: 500,
  bridgeCommutingCosts: 1_111, bridgeStartingAge: 55, bridgeEndingAge: 60,
};
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);
const run = (patch: Partial<RetirementEngineInputs> = {}) => runRetirementEngine({ ...fixture, ...patch });
const result = run();
const row = result.selected.projection[0];
assert.equal(defaultRetirementEngine.isExample, true);
assert.equal(asRetirementEngine(undefined).isExample, true);
assert.equal(asRetirementEngine({ coreAssets: 123 }).isExample, true);
assert.equal(asRetirementEngine({}).isExample, true);
assert.equal(asRetirementEngine({ coreAssets: 123 }).coreAssets, 123);
assert.equal(asRetirementEngine({ ...fixture, isExample: undefined }).isExample, false);
assert.equal(asRetirementEngine({ ...defaultRetirementEngine, coreAssets: 123 }).isExample, true);
assert.equal(asRetirementEngine(JSON.parse(JSON.stringify(fixture))).isExample, false);
assert.equal(asRetirementEngine({ ...fixture, alexSocialSecurity: { 67: 777 } as typeof fixture.alexSocialSecurity }).isExample, true);
assert.equal(defaultRetirementEngine.retirementAge, 59);
assert.equal(defaultRetirementEngine.targetPlanningAge, 90);
assert.equal(defaultRetirementEngine.maximumPlanningAge, 100);
assert.equal(result.selected.projection.length, 42);
near(row.livingExpenses, 30_000 * 1.02 ** 9);
near(row.healthcare, 6_000 * 1.02 ** 9);
assert.equal(row.mortgage, 10_000); // Nominal fixed payment, not inflated.
assert.equal(result.selected.projection.find((r) => r.year === 2035)!.mortgage, 0);
near(result.selected.startingAssets, 1_000_000 * 1.04 ** 9 + 10_000 * 9);
near(run({ selectedMarketCase: "conservative" }).selected.startingAssets, result.selected.startingAssets);
near(run({ selectedStrategy: "stress" }).selected.startingAssets, result.selected.startingAssets);
for (const age of [55, 56, 57, 58, 59, 60]) {
  const r = run({ retirementAge: age });
  for (const scenario of [r.selected, ...r.ageComparison, ...r.strategyComparison, ...r.stressTests.map((t) => t.summary)]) {
    assert.equal(scenario.projection.at(-1)!.alexAge, 100);
    for (const point of scenario.projection) for (const value of Object.values(point)) assert.ok(Number.isFinite(value));
  }
}
for (const targetPlanningAge of [90, 91, 95, 100]) {
  const r = run({ targetPlanningAge }).selected;
  assert.deepEqual(r.projection, result.selected.projection, "Summary horizon must not change annual cash flows");
  assert.equal(r.endingBalanceAtTarget, r.projection.find((y) => y.alexAge === targetPlanningAge)!.totalEnding);
  assert.equal(r.maximumUnfundedGap, Math.max(...r.projection.filter((y) => y.alexAge <= targetPlanningAge).map((y) => y.unfundedGap)));
  assert.equal(r.minimumTotalBalance, Math.min(...r.projection.filter((y) => y.alexAge <= targetPlanningAge).map((y) => y.totalEnding)));
}
assert.equal(result.selected.endingBalanceAt95, result.selected.projection.find((y) => y.alexAge === 95)!.totalEnding);
assert.equal(result.selected.endingBalanceAt100, result.selected.projection.at(-1)!.totalEnding);
assert.equal(run({ targetPlanningAge: 100 }).selected.firstUnfundedAgeAfterTarget, null);
assert.equal(run({ maximumPlanningAge: 90 }).selected.endingBalanceAt95, null);
assert.equal(run({ maximumPlanningAge: 90 }).selected.endingBalanceAt100, null);
assert.equal(run({ maximumPlanningAge: 89 }).selected.status, "NOT TESTED");
assert.equal(run({ selectedStrategy: "age60", retirementAge: 55 }).selected.retirementAge, 60);
assert.ok(result.strategyComparison.some((r) => r.strategy === "age60" && r.retirementAge === 60));
assert.deepEqual(run({ selectedMarketCase: "conservative" }).strategyComparison, result.strategyComparison);

const bridge = run({ selectedStrategy: "bridge" }).selected;
const noWorkCost = run({ selectedStrategy: "bridge", bridgeCommutingCosts: 0 }).selected;
near(bridge.projection[0].livingExpenses - noWorkCost.projection[0].livingExpenses, 1_111);
near(bridge.firstYearGrossWithdrawal - noWorkCost.firstYearGrossWithdrawal, 1_111 / 0.8);
near(bridgeEffectiveAnnualValue(fixture), 6_400 + 6_000 - 2_500 - 1_111);
near(run({ selectedStrategy: "bridge", selectedMarketCase: "sequence" }).selected.projection[0].healthcare, 2_500 * 1.04 ** 9);
assert.equal(bridge.projection[2].earnedIncome, 0);

const project = run({ projectIncomeAfterTax: 5_000 }).selected;
assert.ok(project.projection.every((y) => y.earnedIncome === 5_000));
assert.deepEqual(run({ projectIncomeAfterTax: 5_000, targetPlanningAge: 95 }).selected.projection, project.projection);
const ended = run({ projectIncomeAfterTax: 5_000, projectIncomeEndYear: 2030 }).selected.projection;
assert.equal(ended[1].earnedIncome, 5_000); assert.equal(ended[2].earnedIncome, 0);
const contract = run({ selectedStrategy: "contract", contractIncomeAfterTax: 9_000 }).selected.projection;
near(contract[0].earnedIncome, 9_000); near(contract[1].earnedIncome, 9_000 * 1.02);
const surplus = run({ projectIncomeAfterTax: 1_000_000 }).selected.projection[0];
assert.ok(surplus.surplusNotReinvested > 0); assert.equal(surplus.coreEnding, surplus.preWithdrawalCore);

assert.equal(run({ additionalChildSupport: 100 }).selected.status, "NOT TESTED");
assert.equal(run({ selectedStrategy: "stress" }).selected.status, "NOT TESTED");
const stressPatch = { selectedStrategy: "stress" as const, stressChildSupportEndYear: 2030 };
const stress = run(stressPatch);
assert.notEqual(stress.selected.status, "NOT TESTED");
assert.deepEqual(stress.selected.projection, stress.strategyComparison.find((r) => r.strategy === "stress")!.projection);
assert.deepEqual(stress.selected.projection, stress.stressTests.find((r) => r.name === "Combined D stress")!.summary.projection);
assert.deepEqual(run({ ...stressPatch, additionalChildSupport: 3_333, childSupportEndYear: null }).selected, stress.selected);
const support = run({ additionalChildSupport: 1_000, childSupportEndYear: 2030 }).selected;
near(support.projection[1].livingExpenses - result.selected.projection[1].livingExpenses, 1_000 * 1.02 ** 10);
near(support.projection[2].livingExpenses, result.selected.projection[2].livingExpenses);
const inflation = result.stressTests.find((t) => t.name === "High inflation")!.summary.projection[0];
near(inflation.taxes / inflation.grossWithdrawal, 0.2); // Inflation test does not silently raise taxes.
const rich = run({ coreAssets: 10_000_000 });
assert.equal(rich.healthcareTolerance, 12_000);
assert.equal(rich.selected.status, "GREEN");
const unfunded = run({ coreAssets: 0, annualSaving: 0 });
assert.equal(unfunded.selected.status, "RED");
assert.equal(unfunded.selected.firstUnfundedAge, 59);
assert.equal(unfunded.selected.firstUnfundedAgeAfterTarget, 91);
assert.equal(unfunded.selected.firstUnfundedYearAfterTarget, 2061);
assert.equal(unfunded.healthcareTolerance, null);
const proxy = run({ darleneNetWages: 10_000, darleneGrossWages: 12_000 }).selected.projection[0];
near(proxy.magiProxy, Math.min(proxy.preWithdrawalCore, proxy.grossWithdrawal) + proxy.alexSocialSecurity + proxy.darleneSocialSecurity + 12_000);

const legacy = { ...fixture, retirementAge: 57, targetPlanningAge: 95, coreAssets: 654_321, alexSocialSecurity: { 62: 555, 67: 777, 70: 999 } };
const migrated = asRetirementEngine(legacy);
assert.deepEqual(migrated, legacy, "Normalization must preserve every saved value");
const old = { ...legacy } as Partial<RetirementEngineInputs>;
delete old.projectIncomeEndYear; delete old.childSupportEndYear; delete old.stressChildSupportEndYear;
const added = asRetirementEngine(old);
assert.equal(added.childSupportThroughAge, 27); assert.equal(added.childSupportEndYear, null);
assert.equal(added.stressChildSupportThroughAge, 30); assert.equal(added.stressChildSupportEndYear, null);
const laterLegacy = { ...old, asOfYear: 2028 };
delete laterLegacy.livingCostBaseYear; delete laterLegacy.healthcareCostBaseYear;
const laterMigrated = asRetirementEngine(laterLegacy);
assert.equal(laterMigrated.livingCostBaseYear, 2028);
assert.equal(laterMigrated.healthcareCostBaseYear, 2028);
assert.equal(laterMigrated.coreAssets, old.coreAssets);
assert.equal(laterMigrated.normalizedSpending, old.normalizedSpending);
assert.equal(asRetirementEngine({ ...laterLegacy, livingCostBaseYear: 2022 }).livingCostBaseYear, 2022);
assert.equal(added.coreAssets, old.coreAssets); assert.equal(added.retirementAge, 57); assert.equal(added.targetPlanningAge, 95);
assert.equal(run({ alexClaimAge: 63 as 67 }).selected.status, "INVALID INPUT");
assert.equal(asRetirementEngine({ ...fixture, alexClaimAge: 63 as 67 }).alexClaimAge, 63);
assert.equal(run({ darleneMedicareStartYear: 2050 }).selected.status, "INVALID INPUT");
assert.equal(run({ maximumPlanningAge: 101 }).selected.status, "INVALID INPUT");
assert.equal(run({ retirementAge: NaN }).selected.status, "INVALID INPUT");
assert.equal(run({ baseTaxPct: 100 }).selected.status, "INVALID INPUT");
console.log("retirement engine: synthetic formula, horizon, strategy, income, support, and saved-input regressions passed");
