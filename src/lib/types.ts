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
  childSupportThroughAge: number;
  annualMortgagePayment: number;
  mortgagePayoffYear: number;
  stressExtraChildSupport: number;
  stressChildSupportThroughAge: number;
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

export const defaultRetirementEngine: RetirementEngineInputs = {
  selectedStrategy: "full",
  selectedMarketCase: "base",
  retirementAge: 55,
  alexClaimAge: 67,
  darleneClaimAge: 67,
  asOfYear: 2026,
  alexBirthYear: 1973,
  darleneBirthYear: 1969,
  coreAssets: 1_437_958.5,
  annualSaving: 38_631,
  contractIncomeAfterTax: 0,
  darleneNetWages: 0,
  darleneGrossWages: 0,
  useLifeInsurance: false,
  lifeInsuranceCashValue: 135_589.05,
  targetPlanningAge: 95,
  maximumPlanningAge: 100,
  baseReturnPct: 5,
  conservativeReturnPct: 3.5,
  stressNormalReturnPct: 3.5,
  stressYear0ReturnPct: -20,
  stressYear1ReturnPct: -10,
  stressYear2ReturnPct: 2,
  stressYear3ReturnPct: 3,
  baseInflationPct: 2.5,
  conservativeInflationPct: 3,
  stressInflationPct: 4.5,
  baseTaxPct: 22,
  conservativeTaxPct: 25,
  stressTaxPct: 27,
  normalizedSpending: 118_200,
  permanentSpendingAdjustmentPct: 0,
  additionalChildSupport: 0,
  childSupportThroughAge: 27,
  annualMortgagePayment: 16_803.12,
  mortgagePayoffYear: 2036,
  stressExtraChildSupport: 20_000,
  stressChildSupportThroughAge: 30,
  oneTimeUnexpectedExpense: 50_000,
  acaFamilyGrossPremium: 24_000,
  acaFamilySubsidyEstimate: 10_000,
  acaFamilyOutOfPocket: 4_000,
  alexSingleNetPremium: 9_000,
  alexSingleOutOfPocket: 2_500,
  darleneMedicareAnnualCost: 5_500,
  alexMedicareAnnualCost: 5_500,
  darleneMedicareStartYear: 2034,
  alexMedicareStartYear: 2038,
  stressHealthcareMultiplier: 1.5,
  alexSocialSecurity: { 62: 2_540, 67: 3_608, 70: 4_474 },
  darleneSocialSecurity: { 62: 1_411, 67: 2_004, 70: 2_485 },
  bridgeHoursPerWeek: 20,
  bridgeHourlyPay: 25,
  bridgeWeeksPerYear: 50,
  bridgeTaxPct: 20,
  bridgeEmployeePlusSpousePremium: 8_400,
  bridgeOutOfPocket: 2_500,
  bridgeCommutingCosts: 1_500,
  bridgeStartingAge: 55,
  bridgeEndingAge: 60,
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
