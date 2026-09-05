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

export type SprintMonths = 6 | 12;

export type StreamStatus = "blank" | "named" | "asked" | "earning";

export type NextStream = {
  name: string;
  monthly: number;
  ask: string;
  status: StreamStatus;
};

export type FinanceInputs = {
  netWorth: number;
  cash: number;
  emergencyReserve: number;
  debt: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyGiving: number;
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
  incomeSources: [{ id: "income-1", name: "", monthly: 0 }],
  nextStream: { name: "", monthly: 0, ask: "", status: "blank" },
  expectedReturn: 5,
  swr: 4,
  estimatedTaxRate: 25,
  targetMonths: 12,
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
  snapshots: [],
  interview: emptyInterview(),
};
