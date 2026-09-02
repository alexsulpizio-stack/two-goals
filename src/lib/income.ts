export type IncomeSource = {
  id: string;
  name: string;
  monthly: number;
};

export const INCOME_NAME_HINTS = [
  "Day job",
  "Side work",
  "Rental",
  "Freelance",
  "Business",
] as const;

export function newIncomeId(): string {
  return `income-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyIncomeSource(id = "income-1"): IncomeSource {
  return { id, name: "", monthly: 0 };
}

export function asIncomeSource(item: unknown): IncomeSource | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Partial<IncomeSource>;
  const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : null;
  if (!id) return null;
  const name = typeof row.name === "string" ? row.name.trim().slice(0, 80) : "";
  return { id, name, monthly: asMoney(row.monthly) };
}

export function asIncomeSources(items: unknown): IncomeSource[] {
  if (!Array.isArray(items)) return [];
  const seen = new Set<string>();
  const sources: IncomeSource[] = [];
  for (const item of items) {
    const source = asIncomeSource(item);
    if (!source || seen.has(source.id)) continue;
    seen.add(source.id);
    sources.push(source);
  }
  return sources;
}

export function totalMonthlyIncome(sources: IncomeSource[]): number {
  return sources.reduce((sum, source) => sum + Math.max(0, source.monthly), 0);
}

export function normalizeIncomeSources(finance: {
  incomeSources?: unknown;
  monthlyIncome?: unknown;
} | null | undefined): IncomeSource[] {
  const parsed = asIncomeSources(finance?.incomeSources);
  if (parsed.length > 0) return parsed;
  const monthly = asMoney(finance?.monthlyIncome);
  if (monthly > 0) {
    return [{ id: "income-legacy", name: "Take-home", monthly }];
  }
  return [emptyIncomeSource()];
}

export function namedIncomeSources(sources: IncomeSource[]): IncomeSource[] {
  return sources.filter((source) => source.monthly > 0 || source.name.length > 0);
}

export function incomeHint(index: number): string {
  return INCOME_NAME_HINTS[index % INCOME_NAME_HINTS.length] ?? "Income";
}

function asMoney(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
