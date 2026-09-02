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

export type FinanceInputs = {
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyGiving: number;
  expectedReturn: number;
  swr: number;
  targetMonths: SprintMonths;
};

export type NetWorthSnapshot = {
  date: string;
  netWorth: number;
};

export type AppState = {
  practices: Record<string, PracticeDay>;
  prayers: PrayerEntry[];
  finance: FinanceInputs;
  snapshots: NetWorthSnapshot[];
};

export const emptyPractice = (): PracticeDay => ({
  word: false,
  prayer: false,
  gathered: false,
  neighbor: false,
});

export const defaultFinance: FinanceInputs = {
  netWorth: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  monthlyGiving: 0,
  expectedReturn: 5,
  swr: 4,
  targetMonths: 12,
};

export const defaultState: AppState = {
  practices: {},
  prayers: [],
  finance: defaultFinance,
  snapshots: [],
};
