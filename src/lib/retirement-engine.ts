import type {
  ClaimAge,
  MarketCase,
  RetirementEngineInputs,
  RetirementStrategy,
} from "./types";

export type EngineStatus = "GREEN" | "YELLOW" | "RED" | "NOT TESTED" | "INVALID INPUT";

export type ProjectionYear = {
  year: number;
  alexAge: number;
  darleneAge: number;
  marketReturn: number;
  inflation: number;
  coreOpening: number;
  coreReturn: number;
  preWithdrawalCore: number;
  livingExpenses: number;
  mortgage: number;
  healthcare: number;
  alexSocialSecurity: number;
  darleneSocialSecurity: number;
  earnedIncome: number;
  netCashNeed: number;
  grossWithdrawal: number;
  taxes: number;
  contingencyOpening: number;
  contingencyUsed: number;
  coreEnding: number;
  contingencyEnding: number;
  totalEnding: number;
  unfundedGap: number;
  /** Partial income diagnostic, not ACA MAGI. */
  magiProxy: number;
  surplusNotReinvested: number;
};

export type ScenarioSummary = {
  strategy: RetirementStrategy;
  retirementAge: number;
  retirementYear: number;
  startingAssets: number;
  firstYearLivingPlusMortgage: number;
  firstYearHealthcare: number;
  firstYearEarnedIncome: number;
  firstYearGrossWithdrawal: number;
  minimumTotalBalance: number;
  endingBalanceAtTarget: number | null;
  targetPlanningAge: number;
  maximumPlanningAge: number;
  endingBalanceAt95: number | null;
  endingBalanceAt100: number | null;
  firstUnfundedAge: number | null;
  firstUnfundedAgeAfterTarget: number | null;
  firstUnfundedYearAfterTarget: number | null;
  fullHorizonMaximumUnfundedGap: number;
  warnings: string[];
  endingBalanceAtMaximum: number;
  maximumUnfundedGap: number;
  status: EngineStatus;
  interpretation: string;
  projection: ProjectionYear[];
};

export type StressTestSummary = {
  name: string;
  healthcareMultiplier: number;
  inflation: number;
  summary: ScenarioSummary;
};

export type RetirementEngineResult = {
  selected: ScenarioSummary;
  ageComparison: ScenarioSummary[];
  strategyComparison: ScenarioSummary[];
  stressTests: StressTestSummary[];
  bridgeGrossWages: number;
  bridgeNetWages: number;
  bridgeHealthcareCost: number;
  bridgeEffectiveAnnualValue: number;
  acaFamilyTotal: number;
  alexPreMedicareCost: number;
  combinedMedicareCost: number;
  healthcareTolerance: number | null;
};

type ScenarioOverrides = {
  healthcareMultiplier?: number;
  inflationPct?: number;
  taxPct?: number;
  oneTimeExpense?: number;
  childSupport?: number;
  childSupportEndYear?: number | null;
  forceSequenceReturns?: boolean;
};

type ScenarioCase = {
  returnPct: number;
  inflationPct: number;
  taxPct: number;
  healthcareMultiplier: number;
  sequence: boolean;
};

const RETIREMENT_AGES = [55, 56, 57, 58, 59, 60];

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function nonNegative(value: number) {
  return Math.max(0, finite(value));
}

function asRate(percent: number) {
  return finite(percent) / 100;
}

function strategyMath(strategy: RetirementStrategy): Exclude<RetirementStrategy, "age60"> {
  return strategy === "age60" ? "full" : strategy;
}

export function strategyLabel(strategy: RetirementStrategy) {
  switch (strategy) {
    case "bridge":
      return "Bridge job";
    case "contract":
      return "Contract work";
    case "stress":
      return "Combined D stress";
    case "age60":
      return "Age 60 fallback";
    default:
      return "Full retirement";
  }
}

export function marketCaseLabel(marketCase: MarketCase) {
  switch (marketCase) {
    case "conservative":
      return "Conservative";
    case "sequence":
      return "Sequence stress";
    default:
      return "Base";
  }
}

export function claimAgeLabel(age: ClaimAge) {
  return `Age ${age}`;
}

export function acaFamilyTotal(input: RetirementEngineInputs) {
  return Math.max(0, nonNegative(input.acaFamilyGrossPremium) - nonNegative(input.acaFamilySubsidyEstimate)) + nonNegative(input.acaFamilyOutOfPocket);
}

export function alexPreMedicareCost(input: RetirementEngineInputs) {
  return nonNegative(input.alexSingleNetPremium) + nonNegative(input.alexSingleOutOfPocket);
}

export function combinedMedicareCost(input: RetirementEngineInputs) {
  return nonNegative(input.darleneMedicareAnnualCost) + nonNegative(input.alexMedicareAnnualCost);
}

export function bridgeGrossWages(input: RetirementEngineInputs) {
  return nonNegative(input.bridgeHoursPerWeek) * nonNegative(input.bridgeHourlyPay) * nonNegative(input.bridgeWeeksPerYear);
}

export function bridgeNetWages(input: RetirementEngineInputs) {
  return bridgeGrossWages(input) * (1 - Math.min(99.9999, Math.max(0, finite(input.bridgeTaxPct))) / 100);
}

export function bridgeHealthcareCost(input: RetirementEngineInputs) {
  return nonNegative(input.bridgeEmployeePlusSpousePremium) + nonNegative(input.bridgeOutOfPocket);
}

export function bridgeEffectiveAnnualValue(input: RetirementEngineInputs) {
  return bridgeNetWages(input) + acaFamilyTotal(input) - bridgeHealthcareCost(input) - nonNegative(input.bridgeCommutingCosts);
}

function scenarioCase(input: RetirementEngineInputs, strategy: RetirementStrategy, marketCase: MarketCase, overrides: ScenarioOverrides = {}): ScenarioCase {
  const mathStrategy = strategyMath(strategy);
  const sequence = overrides.forceSequenceReturns || mathStrategy === "stress" || marketCase === "sequence";
  const returnPct = sequence
    ? finite(input.stressNormalReturnPct)
    : marketCase === "conservative"
      ? finite(input.conservativeReturnPct)
      : finite(input.baseReturnPct);
  const inflationPct = overrides.inflationPct ?? (sequence
    ? finite(input.stressInflationPct)
    : marketCase === "conservative"
      ? finite(input.conservativeInflationPct)
      : finite(input.baseInflationPct));
  const taxPct = overrides.taxPct ?? (sequence
    ? nonNegative(input.stressTaxPct)
    : marketCase === "conservative"
      ? nonNegative(input.conservativeTaxPct)
      : nonNegative(input.baseTaxPct));
  return {
    returnPct,
    inflationPct,
    taxPct,
    healthcareMultiplier: overrides.healthcareMultiplier ?? (sequence ? Math.max(0, finite(input.stressHealthcareMultiplier, 1)) : 1),
    sequence,
  };
}

function marketReturn(input: RetirementEngineInputs, scenario: ScenarioCase, yearIndex: number) {
  if (!scenario.sequence || yearIndex >= 4) return asRate(scenario.returnPct);
  const returns = [input.stressYear0ReturnPct, input.stressYear1ReturnPct, input.stressYear2ReturnPct, input.stressYear3ReturnPct];
  return asRate(finite(returns[yearIndex] ?? scenario.returnPct, scenario.returnPct));
}

function coreAssetsAtRetirement(input: RetirementEngineInputs, retirementAge: number) {
  const retirementYear = input.alexBirthYear + retirementAge;
  const years = Math.max(0, retirementYear - input.asOfYear);
  return nonNegative(input.coreAssets) * Math.pow(1 + asRate(input.baseReturnPct), years) + nonNegative(input.annualSaving) * years;
}

function selectedBenefit(benefits: Record<ClaimAge, number>, claimAge: ClaimAge) {
  return nonNegative(benefits[claimAge]);
}

function socialSecurityAnnual(input: RetirementEngineInputs, person: "alex" | "darlene", claimAge: ClaimAge, age: number, year: number) {
  if (![62, 67, 70].includes(claimAge) || age < claimAge) return 0;
  const monthly = selectedBenefit(person === "alex" ? input.alexSocialSecurity : input.darleneSocialSecurity, claimAge);
  return monthly * 12 * Math.pow(1 + asRate(input.baseInflationPct), Math.max(0, year - input.asOfYear));
}

function healthcareAnnual(input: RetirementEngineInputs, strategy: RetirementStrategy, alexAge: number, year: number, inflationPct: number, multiplier: number) {
  const bridgeActive = strategyMath(strategy) === "bridge" && alexAge >= input.bridgeStartingAge && alexAge <= input.bridgeEndingAge;
  const baseCost = bridgeActive
    ? bridgeHealthcareCost(input)
    : year >= input.alexMedicareStartYear
      ? combinedMedicareCost(input)
      : year >= input.darleneMedicareStartYear
        ? alexPreMedicareCost(input) + nonNegative(input.darleneMedicareAnnualCost)
        : acaFamilyTotal(input);
  return baseCost * Math.pow(1 + asRate(inflationPct), year - input.healthcareCostBaseYear) * (bridgeActive ? 1 : Math.max(0, multiplier));
}

function earnedIncomeAnnual(input: RetirementEngineInputs, strategy: RetirementStrategy, alexAge: number, inflationPct: number, yearIndex: number, year: number) {
  const mathStrategy = strategyMath(strategy);
  const darleneIncome = nonNegative(input.darleneNetWages);
  const inflationFactor = Math.pow(1 + asRate(inflationPct), yearIndex);
  const bridgeIncome = mathStrategy === "bridge" && alexAge >= input.bridgeStartingAge && alexAge <= input.bridgeEndingAge
    ? bridgeNetWages(input) * inflationFactor
    : 0;
  const contractIncome = mathStrategy === "contract" ? nonNegative(input.contractIncomeAfterTax) * inflationFactor : 0;
  const projectIncome = input.projectIncomeEndYear === null || year <= input.projectIncomeEndYear
    ? nonNegative(input.projectIncomeAfterTax) : 0;
  return darleneIncome + bridgeIncome + contractIncome + projectIncome;
}

function interpretation(summary: Omit<ScenarioSummary, "interpretation">) {
  if (summary.status === "INVALID INPUT" || summary.status === "NOT TESTED") {
    return `${summary.status}: ${summary.warnings.join(" ")} Displayed cash flows are incomplete, not a retirement-readiness result.`;
  }
  const main = `through main planning age ${summary.targetPlanningAge}`;
  const tail = summary.firstUnfundedAgeAfterTarget === null
    ? ` Separate long-life checks continue through age ${summary.maximumPlanningAge}.`
    : ` A separate later-life shortfall first appears at age ${summary.firstUnfundedAgeAfterTarget} (${summary.firstUnfundedYearAfterTarget}).`;
  if (summary.status === "RED") {
    return `The model reaches annual unfunded need of ${formatModelMoney(summary.maximumUnfundedGap)} ${main}.${tail}`;
  }
  return `No modeled shortfall ${main}; ending aggregate assets ${summary.status === "YELLOW" ? "fall below" : "retain at least"} 25% of starting core assets. This retained heuristic is not a validated or segregated liquid reserve.${tail}`;
}

export function formatModelMoney(amount: number | null) {
  if (amount === null) return "n.a.";
  const absolute = Math.abs(finite(amount));
  const value = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(absolute);
  return amount < 0 ? `−${value}` : value;
}

function runScenario(
  input: RetirementEngineInputs,
  displayStrategy: RetirementStrategy,
  retirementAge: number,
  marketCase: MarketCase,
  overrides: ScenarioOverrides = {},
): ScenarioSummary {
  const strategy = strategyMath(displayStrategy);
  const activeCase = scenarioCase(input, strategy, marketCase, overrides);
  const retirementYear = input.alexBirthYear + retirementAge;
  const startingAssets = coreAssetsAtRetirement(input, retirementAge);
  const maximumAge = Math.min(100, Math.max(retirementAge, Math.round(finite(input.maximumPlanningAge, 100))));
  const targetAge = finite(input.targetPlanningAge, 90);
  const adjustedNonMortgageSpending = Math.max(0, nonNegative(input.normalizedSpending) - nonNegative(input.annualMortgagePayment)) * (1 - Math.min(100, Math.max(0, finite(input.permanentSpendingAdjustmentPct))) / 100);
  const projections: ProjectionYear[] = [];
  let core = startingAssets;
  let contingency = input.useLifeInsurance ? nonNegative(input.lifeInsuranceCashValue) : 0;

  for (let age = retirementAge; age <= maximumAge; age += 1) {
    const yearIndex = age - retirementAge;
    const year = input.alexBirthYear + age;
    const darleneAge = year - input.darleneBirthYear;
    const returnRate = marketReturn(input, activeCase, yearIndex);
    const inflationRate = asRate(activeCase.inflationPct);
    const inflationFactor = Math.pow(1 + inflationRate, year - input.livingCostBaseYear);
    const childSupportAmount = overrides.childSupport ?? (strategy === "stress" ? input.stressExtraChildSupport : input.additionalChildSupport);
    const childSupportEndYear = "childSupportEndYear" in overrides ? overrides.childSupportEndYear : (strategy === "stress" ? input.stressChildSupportEndYear : input.childSupportEndYear);
    const childSupport = childSupportEndYear != null && year <= childSupportEndYear ? nonNegative(childSupportAmount) : 0;
    const oneTimeExpense = overrides.oneTimeExpense ?? (strategy === "stress" && age === retirementAge ? input.oneTimeUnexpectedExpense : 0);
    const workCosts = strategy === "bridge" && age >= input.bridgeStartingAge && age <= input.bridgeEndingAge ? nonNegative(input.bridgeCommutingCosts) : 0;
    const livingExpenses = adjustedNonMortgageSpending * inflationFactor + childSupport * inflationFactor + workCosts + (age === retirementAge ? nonNegative(oneTimeExpense) : 0);
    const mortgage = year < Math.round(nonNegative(input.mortgagePayoffYear)) ? nonNegative(input.annualMortgagePayment) : 0;
    const healthcare = healthcareAnnual(input, strategy, age, year, activeCase.inflationPct, activeCase.healthcareMultiplier);
    const alexSocialSecurity = socialSecurityAnnual(input, "alex", input.alexClaimAge, age, year);
    const darleneSocialSecurity = socialSecurityAnnual(input, "darlene", input.darleneClaimAge, darleneAge, year);
    const earnedIncome = earnedIncomeAnnual(input, strategy, age, activeCase.inflationPct, yearIndex, year);
    const coreOpening = core;
    const coreReturn = coreOpening * returnRate;
    const preWithdrawalCore = coreOpening + coreReturn;
    const netCashNeed = Math.max(0, livingExpenses + mortgage + healthcare - alexSocialSecurity - darleneSocialSecurity - earnedIncome);
    const taxRate = Math.min(99.9999, Math.max(0, activeCase.taxPct)) / 100;
    const grossWithdrawal = netCashNeed > 0 ? netCashNeed / (1 - taxRate) : 0;
    const taxes = grossWithdrawal * taxRate;
    const netFundedByCore = Math.min(preWithdrawalCore, grossWithdrawal) * (1 - taxRate);
    const contingencyOpening = contingency;
    const contingencyUsed = Math.min(contingencyOpening, Math.max(0, netCashNeed - netFundedByCore));
    const coreEnding = Math.max(0, preWithdrawalCore - Math.min(preWithdrawalCore, grossWithdrawal));
    const contingencyEnding = Math.max(0, contingencyOpening - contingencyUsed);
    const totalEnding = coreEnding + contingencyEnding;
    const unfundedGap = Math.max(0, netCashNeed - netFundedByCore - contingencyUsed);

    projections.push({
      year,
      alexAge: age,
      darleneAge,
      marketReturn: returnRate,
      inflation: inflationRate,
      coreOpening,
      coreReturn,
      preWithdrawalCore,
      livingExpenses,
      mortgage,
      healthcare,
      alexSocialSecurity,
      darleneSocialSecurity,
      earnedIncome,
      netCashNeed,
      grossWithdrawal,
      taxes,
      contingencyOpening,
      contingencyUsed,
      coreEnding,
      contingencyEnding,
      totalEnding,
      unfundedGap,
      magiProxy: Math.min(preWithdrawalCore, grossWithdrawal) + alexSocialSecurity + darleneSocialSecurity + earnedIncome - nonNegative(input.darleneNetWages) + nonNegative(input.darleneGrossWages),
      surplusNotReinvested: Math.max(0, alexSocialSecurity + darleneSocialSecurity + earnedIncome - livingExpenses - mortgage - healthcare),
    });

    core = coreEnding;
    contingency = contingencyEnding;
  }

  const targetProjection = projections.find((row) => row.alexAge === targetAge);
  const maximumProjection = projections.at(-1)!;
  const mainProjection = projections.filter((row) => row.alexAge <= targetAge);
  const minimumTotalBalance = mainProjection.length ? Math.min(...mainProjection.map((row) => row.totalEnding)) : 0;
  const maximumUnfundedGap = Math.max(0, ...mainProjection.map((row) => row.unfundedGap));
  const firstTailGap = projections.find((row) => row.alexAge > targetAge && row.unfundedGap > 1);
  const warnings = validateRetirementInputs(input);
  const invalid = warnings.length > 0;
  const supportAmount = overrides.childSupport ?? (strategy === "stress" ? input.stressExtraChildSupport : input.additionalChildSupport);
  const supportEndYear = "childSupportEndYear" in overrides ? overrides.childSupportEndYear : (strategy === "stress" ? input.stressChildSupportEndYear : input.childSupportEndYear);
  if (supportAmount > 0 && supportEndYear == null) warnings.push("Child-support end calendar year is unset; support is excluded until confirmed.");
  if (!targetProjection) warnings.push("Main planning age is outside the modeled retirement years.");
  const status: EngineStatus = invalid ? "INVALID INPUT" : warnings.length ? "NOT TESTED" : maximumUnfundedGap > 1
    ? "RED"
    : targetProjection!.totalEnding < startingAssets * 0.25 ? "YELLOW" : "GREEN";
  const summaryWithoutInterpretation = {
    strategy: displayStrategy,
    retirementAge,
    retirementYear,
    startingAssets,
    firstYearLivingPlusMortgage: projections[0].livingExpenses + projections[0].mortgage,
    firstYearHealthcare: projections[0].healthcare,
    firstYearEarnedIncome: projections[0].earnedIncome,
    firstYearGrossWithdrawal: projections[0].grossWithdrawal,
    minimumTotalBalance,
    endingBalanceAtTarget: targetProjection?.totalEnding ?? null,
    targetPlanningAge: targetAge,
    maximumPlanningAge: maximumAge,
    endingBalanceAt95: projections.find((row) => row.alexAge === 95)?.totalEnding ?? null,
    endingBalanceAt100: projections.find((row) => row.alexAge === 100)?.totalEnding ?? null,
    firstUnfundedAge: mainProjection.find((row) => row.unfundedGap > 1)?.alexAge ?? null,
    firstUnfundedAgeAfterTarget: firstTailGap?.alexAge ?? null,
    firstUnfundedYearAfterTarget: firstTailGap?.year ?? null,
    fullHorizonMaximumUnfundedGap: Math.max(0, ...projections.map((row) => row.unfundedGap)),
    warnings,
    endingBalanceAtMaximum: maximumProjection.totalEnding,
    maximumUnfundedGap,
    status,
    projection: projections,
  };
  return { ...summaryWithoutInterpretation, interpretation: interpretation(summaryWithoutInterpretation) };
}

function stressTestSummaries(input: RetirementEngineInputs) {
  const age = input.selectedStrategy === "age60" ? 60 : Math.min(60, Math.max(55, Math.round(finite(input.retirementAge, 59))));
  const tests: Array<{ name: string; multiplier: number; overrides?: ScenarioOverrides }> = [
    { name: "Base core plan", multiplier: 1 },
    { name: "Healthcare at 125%", multiplier: 1.25, overrides: { healthcareMultiplier: 1.25 } },
    { name: "Healthcare at 150%", multiplier: 1.5, overrides: { healthcareMultiplier: 1.5 } },
    { name: "Healthcare at 175%", multiplier: 1.75, overrides: { healthcareMultiplier: 1.75 } },
    { name: "Healthcare at 200%", multiplier: 2, overrides: { healthcareMultiplier: 2 } },
    { name: "High inflation", multiplier: 1, overrides: { inflationPct: input.stressInflationPct } },
    { name: "One-time unexpected expense", multiplier: 1, overrides: { oneTimeExpense: input.oneTimeUnexpectedExpense, forceSequenceReturns: false } },
    { name: "Extended child support", multiplier: 1, overrides: { childSupport: input.stressExtraChildSupport, childSupportEndYear: input.stressChildSupportEndYear } },
    { name: "Combined D stress", multiplier: Math.max(0, input.stressHealthcareMultiplier), overrides: { forceSequenceReturns: true, healthcareMultiplier: input.stressHealthcareMultiplier } },
  ];

  return tests.map((test) => {
    const overrides = { ...(test.overrides ?? {}) };
    const summary = test.name === "One-time unexpected expense"
      ? runScenario(input, "full", age, "base", { ...overrides, oneTimeExpense: input.oneTimeUnexpectedExpense })
      : test.name === "Extended child support"
        ? runScenario(input, "full", age, "base", { ...overrides, childSupport: input.stressExtraChildSupport, childSupportEndYear: input.stressChildSupportEndYear })
        : test.name === "Combined D stress"
          ? runScenario(input, "stress", age, "sequence", overrides)
          : runScenario(input, "full", age, "base", overrides);
    return {
      name: test.name,
      healthcareMultiplier: test.multiplier,
      inflation: summary.projection[0]?.inflation ?? 0,
      summary,
    };
  });
}

export function validateRetirementInputs(input: RetirementEngineInputs): string[] {
  const warnings: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "number" && !Number.isFinite(value)) warnings.push(`${key} must be finite.`);
  }
  if (input.darleneMedicareStartYear > input.alexMedicareStartYear) warnings.push("This healthcare phase model requires the spouse Medicare start year to be no later than the primary start year.");
  if (!["full", "bridge", "contract", "stress", "age60"].includes(input.selectedStrategy)) warnings.push("Select a supported retirement strategy.");
  if (!["base", "conservative", "sequence"].includes(input.selectedMarketCase)) warnings.push("Select a supported market case.");
  if (!Number.isInteger(input.retirementAge) || input.retirementAge < 55 || input.retirementAge > 60) warnings.push("Retirement age must be 55–60.");
  if (![62, 67, 70].includes(input.alexClaimAge) || ![62, 67, 70].includes(input.darleneClaimAge)) warnings.push("Social Security claim ages must be 62, 67 or 70; unsupported ages are not assigned another benefit.");
  if (!Number.isInteger(input.maximumPlanningAge) || input.maximumPlanningAge < (input.selectedStrategy === "age60" ? 60 : input.retirementAge) || input.maximumPlanningAge > 100) warnings.push("Maximum modeled age must be from retirement age to 100.");
  if (!Number.isInteger(input.targetPlanningAge) || input.targetPlanningAge < 55 || input.targetPlanningAge > 100) warnings.push("Main planning age must be 55–100.");
  for (const tax of [input.baseTaxPct, input.conservativeTaxPct, input.stressTaxPct, input.bridgeTaxPct]) {
    if (tax < 0 || tax >= 100) warnings.push("Withdrawal tax rates must be at least 0 and below 100%.");
  }
  for (const rate of [input.baseReturnPct, input.conservativeReturnPct, input.stressNormalReturnPct, input.stressYear0ReturnPct, input.stressYear1ReturnPct, input.stressYear2ReturnPct, input.stressYear3ReturnPct, input.baseInflationPct, input.conservativeInflationPct, input.stressInflationPct]) {
    if (rate <= -100) warnings.push("Return and inflation rates must exceed -100%.");
  }
  for (const year of [input.livingCostBaseYear, input.healthcareCostBaseYear, input.projectIncomeEndYear, input.childSupportEndYear, input.stressChildSupportEndYear]) {
    if (year !== null && !Number.isInteger(year)) warnings.push("Price-base and supplied end years must be whole calendar years.");
  }
  return warnings;
}

export function runRetirementEngine(input: RetirementEngineInputs): RetirementEngineResult {
  const selectedAge = input.selectedStrategy === "age60" ? 60 : Math.min(60, Math.max(55, Math.round(finite(input.retirementAge, 59))));
  const selectedStrategy = input.selectedStrategy;
  const selected = runScenario(input, selectedStrategy, selectedAge, input.selectedMarketCase);
  const comparisonStrategy = selectedStrategy === "age60" ? "full" : selectedStrategy;
  const ageComparison = RETIREMENT_AGES.map((age) => runScenario(input, comparisonStrategy, age, input.selectedMarketCase));
  const strategyComparison: ScenarioSummary[] = [
    runScenario(input, "full", selectedAge, "base"),
    runScenario(input, "bridge", selectedAge, "base"),
    runScenario(input, "contract", selectedAge, "base"),
    runScenario(input, "stress", selectedAge, "sequence"),
    runScenario(input, "age60", 60, "base"),
  ];
  const stressTests = stressTestSummaries(input);
  const passingHealthcare = stressTests.slice(0, 5).filter((test) => ["GREEN", "YELLOW"].includes(test.summary.status) && test.summary.maximumUnfundedGap <= 1);
  return {
    selected,
    ageComparison,
    strategyComparison,
    stressTests,
    healthcareTolerance: passingHealthcare.length ? acaFamilyTotal(input) * passingHealthcare.at(-1)!.healthcareMultiplier : null,
    bridgeGrossWages: bridgeGrossWages(input),
    bridgeNetWages: bridgeNetWages(input),
    bridgeHealthcareCost: bridgeHealthcareCost(input),
    bridgeEffectiveAnnualValue: bridgeEffectiveAnnualValue(input),
    acaFamilyTotal: acaFamilyTotal(input),
    alexPreMedicareCost: alexPreMedicareCost(input),
    combinedMedicareCost: combinedMedicareCost(input),
  };
}
