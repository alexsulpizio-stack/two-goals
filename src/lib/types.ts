import type { IncomeSource } from "./income";

export type PracticeKind = "word" | "prayer" | "gathered" | "neighbor";

export type PracticeDay = Record<PracticeKind, boolean>;

export type PrayerEntry = {
  id: string;
  createdAt: string;
  thanksgiving: string;
  petition: string;
  listening: string;
};

export type SprintMonths = number;

export type RetirementStrategy = "full" | "bridge" | "contract" | "stress" | "age60";

export type MarketCase = "base" | "conservative" | "sequence";

export type ClaimAge = 62 | 67 | 70;

export type StreamStatus = "blank" | "named" | "asked" | "earning";

export type NextStream = {
  name: string;
  monthly: number;
  ask: string;
  status: StreamStatus;
};

export type LivingCategory = {
  id: string;
  name: string;
  monthly: number;
};

export type RetirementEngineInputs = {
  /** True only for explicitly synthetic starter data; legacy saved inputs are retained. */
  isExample?: boolean;
  selectedStrategy: RetirementStrategy;
  selectedMarketCase: MarketCase;
  retirementAge: number;
  alexClaimAge: ClaimAge;
  darleneClaimAge: ClaimAge;
  asOfYear: number;
  alexBirthYear: number;
  darleneBirthYear: number;
  coreAssets: number;
  annualSaving: number;
  contractIncomeAfterTax: number;
  projectIncomeAfterTax: number;
  projectIncomeEndYear: number | null;
  livingCostBaseYear: number;
  healthcareCostBaseYear: number;
  darleneNetWages: number;
  darleneGrossWages: number;
  useLifeInsurance: boolean;
  lifeInsuranceCashValue: number;
  targetPlanningAge: number;
  maximumPlanningAge: number;
  baseReturnPct: number;
  conservativeReturnPct: number;
  stressNormalReturnPct: number;
  stressYear0ReturnPct: number;
  stressYear1ReturnPct: number;
  stressYear2ReturnPct: number;
  stressYear3ReturnPct: number;
  baseInflationPct: number;
  conservativeInflationPct: number;
  stressInflationPct: number;
  baseTaxPct: number;
  conservativeTaxPct: number;
  stressTaxPct: number;
  normalizedSpending: number;
  permanentSpendingAdjustmentPct: number;
  additionalChildSupport: number;
  /** Legacy value retained for backup compatibility; never interpreted as an end year. */
  childSupportThroughAge: number;
  childSupportEndYear: number | null;
  annualMortgagePayment: number;
  mortgagePayoffYear: number;
  stressExtraChildSupport: number;
  /** Legacy value retained for backup compatibility; end year must be confirmed. */
  stressChildSupportThroughAge: number;
  stressChildSupportEndYear: number | null;
  oneTimeUnexpectedExpense: number;
  acaFamilyGrossPremium: number;
  acaFamilySubsidyEstimate: number;
  acaFamilyOutOfPocket: number;
  alexSingleNetPremium: number;
  alexSingleOutOfPocket: number;
  darleneMedicareAnnualCost: number;
  alexMedicareAnnualCost: number;
  darleneMedicareStartYear: number;
  alexMedicareStartYear: number;
  stressHealthcareMultiplier: number;
  alexSocialSecurity: Record<ClaimAge, number>;
  darleneSocialSecurity: Record<ClaimAge, number>;
  bridgeHoursPerWeek: number;
  bridgeHourlyPay: number;
  bridgeWeeksPerYear: number;
  bridgeTaxPct: number;
  bridgeEmployeePlusSpousePremium: number;
  bridgeOutOfPocket: number;
  bridgeCommutingCosts: number;
  bridgeStartingAge: number;
  bridgeEndingAge: number;
};

export type FinanceInputs = {
  netWorth: number;
  cash: number;
  emergencyReserve: number;
  debt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyGiving: number;
  livingCategories: LivingCategory[];
  incomeSources: IncomeSource[];
  nextStream: NextStream;
  expectedReturn: number;
  swr: number;
  estimatedTaxRate: number;
  targetMonths: SprintMonths;
};

export type LedgerSnapshot = {
  date: string;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyGiving: number;
  incomeSources?: IncomeSource[];
};

export type NetWorthSnapshot = LedgerSnapshot;

export type InterviewAnswers = Record<string, string>;

export type InterviewState = {
  step: number;
  answers: InterviewAnswers;
  completedAt: string | null;
};

export type AppState = {
  practices: Record<string, PracticeDay>;
  prayers: PrayerEntry[];
  finance: FinanceInputs;
  retirementEngine: RetirementEngineInputs;
  snapshots: LedgerSnapshot[];
  interview: InterviewState;
};

export const emptyPractice = (): PracticeDay => ({
  word: false,
  prayer: false,
  gathered: false,
  neighbor: false,
});

export const defaultFinance: FinanceInputs = {
  netWorth: 0,
  cash: 0,
  emergencyReserve: 0,
  debt: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  monthlyGiving: 0,
  livingCategories: [
    { id: "housing_mortgage_rent", name: "Housing: mortgage / rent", monthly: 0 },
    { id: "housing_tax_maintenance", name: "Housing: tax / maintenance", monthly: 0 },
    { id: "food_groceries", name: "Food: groceries", monthly: 0 },
    { id: "food_dining", name: "Food: dining / coffee", monthly: 0 },
    { id: "utilities", name: "Utilities", monthly: 0 },
    { id: "transportation", name: "Transportation", monthly: 0 },
    { id: "insurance", name: "Insurance", monthly: 0 },
    { id: "health", name: "Health", monthly: 0 },
    { id: "other_living", name: "Other living", monthly: 0 },
  ],
  incomeSources: [{ id: "income-1", name: "", monthly: 0 }],
  nextStream: { name: "", monthly: 0, ask: "", status: "blank" },
  expectedReturn: 5,
  swr: 4,
  estimatedTaxRate: 25,
  targetMonths: 12,
};

// Synthetic starter example only. Never embed household source records here.
export const defaultRetirementEngine: RetirementEngineInputs = {
  isExample: true,
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

export const emptyInterview = (): InterviewState => ({
  step: -1,
  answers: {},
  completedAt: null,
});

export const defaultState: AppState = {
  practices: {},
  prayers: [],
  finance: defaultFinance,
  retirementEngine: defaultRetirementEngine,
  snapshots: [],
  interview: emptyInterview(),
};
