import type {
  ClaimAge,
  MarketCase,
  RetirementEngineInputs,
  RetirementStrategy,
} from "./types";

export type EngineStatus = "GREEN" | "YELLOW" | "RED";

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
  magiProxy: number;
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
  endingBalanceAtTarget: number;
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
};

type ScenarioOverrides = {
  healthcareMultiplier?: number;
  inflationPct?: number;
  taxPct?: number;
  oneTimeExpense?: number;
  childSupport?: number;
  childSupportThroughAge?: number;
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
      return "Sequence stress";
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
  return bridgeGrossWages(input) * (1 - Math.min(95, Math.max(0, finite(input.bridgeTaxPct))) / 100);
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
    ? nonNegative(input.stressNormalReturnPct)
    : marketCase === "conservative"
      ? nonNegative(input.conservativeReturnPct)
      : nonNegative(input.baseReturnPct);
  const inflationPct = overrides.inflationPct ?? (sequence
    ? nonNegative(input.stressInflationPct)
    : marketCase === "conservative"
      ? nonNegative(input.conservativeInflationPct)
      : nonNegative(input.baseInflationPct));
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

function coreAssetsAtRetirement(input: RetirementEngineInputs, retirementAge: number, scenario: ScenarioCase) {
  const retirementYear = input.alexBirthYear + retirementAge;
  const years = Math.max(0, retirementYear - input.asOfYear);
  return nonNegative(input.coreAssets) * Math.pow(1 + asRate(scenario.returnPct), years) + nonNegative(input.annualSaving) * years;
}

function selectedBenefit(benefits: Record<ClaimAge, number>, claimAge: ClaimAge) {
  return nonNegative(benefits[claimAge]);
}

function socialSecurityAnnual(input: RetirementEngineInputs, person: "alex" | "darlene", claimAge: ClaimAge, age: number, year: number) {
  if (age < claimAge) return 0;
  const monthly = selectedBenefit(person === "alex" ? input.alexSocialSecurity : input.darleneSocialSecurity, claimAge);
  return monthly * 12 * Math.pow(1 + asRate(input.baseInflationPct), Math.max(0, year - input.asOfYear));
}

function healthcareAnnual(input: RetirementEngineInputs, strategy: RetirementStrategy, alexAge: number, year: number, inflationPct: number, yearIndex: number, multiplier: number) {
  const bridgeActive = strategyMath(strategy) === "bridge" && alexAge >= input.bridgeStartingAge && alexAge <= input.bridgeEndingAge;
  const baseCost = bridgeActive
    ? bridgeHealthcareCost(input)
    : year >= input.alexMedicareStartYear
      ? combinedMedicareCost(input)
      : year >= input.darleneMedicareStartYear
        ? alexPreMedicareCost(input) + nonNegative(input.darleneMedicareAnnualCost)
        : acaFamilyTotal(input);
  return baseCost * Math.pow(1 + asRate(inflationPct), yearIndex) * Math.max(0, multiplier);
}

function earnedIncomeAnnual(input: RetirementEngineInputs, strategy: RetirementStrategy, alexAge: number, inflationPct: number, yearIndex: number) {
  const mathStrategy = strategyMath(strategy);
  const darleneIncome = nonNegative(input.darleneNetWages);
  const inflationFactor = Math.pow(1 + asRate(inflationPct), yearIndex);
  const bridgeIncome = mathStrategy === "bridge" && alexAge >= input.bridgeStartingAge && alexAge <= input.bridgeEndingAge
    ? bridgeNetWages(input) * inflationFactor
    : 0;
  const contractIncome = mathStrategy === "contract" ? nonNegative(input.contractIncomeAfterTax) * inflationFactor : 0;
  return darleneIncome + bridgeIncome + contractIncome;
}

function interpretation(summary: Omit<ScenarioSummary, "interpretation">) {
  if (summary.status === "RED") {
    return `The model reaches an unfunded gap of ${formatModelMoney(summary.maximumUnfundedGap)} during the tested horizon. This path is not self-supporting under its tested assumptions.`;
  }
  if (summary.status === "YELLOW") {
    return `No modeled shortfall appears through age ${summary.projection.at(-1)?.alexAge ?? 100}, but the age 95 balance falls below the 25% margin used for a green result.`;
  }
  return `No modeled shortfall appears through age ${summary.projection.at(-1)?.alexAge ?? 100}, and the age 95 balance retains at least 25% of starting assets.`;
}

export function formatModelMoney(amount: number) {
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
  const startingAssets = coreAssetsAtRetirement(input, retirementAge, activeCase);
  const maximumAge = Math.max(retirementAge, Math.round(nonNegative(input.maximumPlanningAge)));
  const targetAge = Math.min(maximumAge, Math.max(retirementAge, Math.round(nonNegative(input.targetPlanningAge))));
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
    const inflationFactor = Math.pow(1 + inflationRate, yearIndex);
    const childSupportAmount = overrides.childSupport ?? (strategy === "stress" ? input.stressExtraChildSupport : input.additionalChildSupport);
    const childSupportEndAge = overrides.childSupportThroughAge ?? (strategy === "stress" ? input.stressChildSupportThroughAge : input.childSupportThroughAge);
    const childSupport = age <= finite(childSupportEndAge, childSupportEndAge) ? nonNegative(childSupportAmount) : 0;
    const oneTimeExpense = overrides.oneTimeExpense ?? (strategy === "stress" && age === retirementAge ? input.oneTimeUnexpectedExpense : 0);
    const livingExpenses = adjustedNonMortgageSpending * inflationFactor + childSupport * inflationFactor + (age === retirementAge ? nonNegative(oneTimeExpense) : 0);
    const mortgage = year < Math.round(nonNegative(input.mortgagePayoffYear)) ? nonNegative(input.annualMortgagePayment) * inflationFactor : 0;
    const healthcare = healthcareAnnual(input, strategy, age, year, activeCase.inflationPct, yearIndex, activeCase.healthcareMultiplier);
    const alexSocialSecurity = socialSecurityAnnual(input, "alex", input.alexClaimAge, age, year);
    const darleneSocialSecurity = socialSecurityAnnual(input, "darlene", input.darleneClaimAge, darleneAge, year);
    const earnedIncome = earnedIncomeAnnual(input, strategy, age, activeCase.inflationPct, yearIndex);
    const coreOpening = core;
    const coreReturn = coreOpening * returnRate;
    const preWithdrawalCore = coreOpening + coreReturn;
    const netCashNeed = Math.max(0, livingExpenses + mortgage + healthcare - alexSocialSecurity - darleneSocialSecurity - earnedIncome);
    const taxRate = Math.min(95, Math.max(0, activeCase.taxPct)) / 100;
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
      magiProxy: grossWithdrawal + alexSocialSecurity + darleneSocialSecurity + earnedIncome + nonNegative(input.darleneGrossWages),
    });

    core = coreEnding;
    contingency = contingencyEnding;
  }

  const targetProjection = projections.find((row) => row.alexAge === targetAge) ?? projections.at(-1)!;
  const maximumProjection = projections.at(-1)!;
  const minimumTotalBalance = Math.min(...projections.map((row) => row.totalEnding));
  const maximumUnfundedGap = Math.max(...projections.map((row) => row.unfundedGap));
  const status: EngineStatus = maximumUnfundedGap > 1
    ? "RED"
    : targetProjection.totalEnding < startingAssets * 0.25
      ? "YELLOW"
      : "GREEN";
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
    endingBalanceAtTarget: targetProjection.totalEnding,
    endingBalanceAtMaximum: maximumProjection.totalEnding,
    maximumUnfundedGap,
    status,
    projection: projections,
  };
  return { ...summaryWithoutInterpretation, interpretation: interpretation(summaryWithoutInterpretation) };
}

function stressTestSummaries(input: RetirementEngineInputs) {
  const age = input.selectedStrategy === "age60" ? 60 : Math.min(60, Math.max(55, Math.round(input.retirementAge)));
  const tests: Array<{ name: string; multiplier: number; overrides?: ScenarioOverrides }> = [
    { name: "Base core plan", multiplier: 1 },
    { name: "Healthcare at 125%", multiplier: 1.25, overrides: { healthcareMultiplier: 1.25 } },
    { name: "Healthcare at 150%", multiplier: 1.5, overrides: { healthcareMultiplier: 1.5 } },
    { name: "Healthcare at 175%", multiplier: 1.75, overrides: { healthcareMultiplier: 1.75 } },
    { name: "Healthcare at 200%", multiplier: 2, overrides: { healthcareMultiplier: 2 } },
    { name: "High inflation", multiplier: 1, overrides: { inflationPct: input.stressInflationPct, taxPct: input.stressTaxPct } },
    { name: "One-time unexpected expense", multiplier: 1, overrides: { oneTimeExpense: input.oneTimeUnexpectedExpense, forceSequenceReturns: false } },
    { name: "Extended child support", multiplier: 1, overrides: { childSupport: input.stressExtraChildSupport, childSupportThroughAge: input.stressChildSupportThroughAge } },
    { name: "Sequence stress", multiplier: Math.max(0, input.stressHealthcareMultiplier), overrides: { forceSequenceReturns: true, healthcareMultiplier: input.stressHealthcareMultiplier } },
  ];

  return tests.map((test) => {
    const overrides = { ...(test.overrides ?? {}) };
    const summary = test.name === "One-time unexpected expense"
      ? runScenario(input, "full", age, "base", { ...overrides, oneTimeExpense: input.oneTimeUnexpectedExpense })
      : test.name === "Extended child support"
        ? runScenario(input, "full", age, "base", { ...overrides, childSupport: input.stressExtraChildSupport, childSupportThroughAge: input.stressChildSupportThroughAge })
        : test.name === "Sequence stress"
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

export function runRetirementEngine(input: RetirementEngineInputs): RetirementEngineResult {
  const selectedAge = input.selectedStrategy === "age60" ? 60 : Math.min(60, Math.max(55, Math.round(input.retirementAge)));
  const selectedStrategy = input.selectedStrategy;
  const selected = runScenario(input, selectedStrategy, selectedAge, input.selectedMarketCase);
  const comparisonStrategy = selectedStrategy === "age60" ? "full" : selectedStrategy;
  const ageComparison = RETIREMENT_AGES.map((age) => runScenario(input, comparisonStrategy, age, input.selectedMarketCase));
  const strategyComparison: ScenarioSummary[] = [
    runScenario(input, "full", selectedAge, input.selectedMarketCase),
    runScenario(input, "bridge", selectedAge, input.selectedMarketCase),
    runScenario(input, "contract", selectedAge, input.selectedMarketCase),
    runScenario(input, "stress", selectedAge, "sequence"),
  ];
  return {
    selected,
    ageComparison,
    strategyComparison,
    stressTests: stressTestSummaries(input),
    bridgeGrossWages: bridgeGrossWages(input),
    bridgeNetWages: bridgeNetWages(input),
    bridgeHealthcareCost: bridgeHealthcareCost(input),
    bridgeEffectiveAnnualValue: bridgeEffectiveAnnualValue(input),
    acaFamilyTotal: acaFamilyTotal(input),
    alexPreMedicareCost: alexPreMedicareCost(input),
    combinedMedicareCost: combinedMedicareCost(input),
  };
}
