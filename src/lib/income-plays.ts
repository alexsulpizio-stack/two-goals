import { formatMoney, type IndependencePlan, type SprintPlan } from "./finance";
import type { NextStream, StreamStatus } from "./types";

export type IncomePlay = {
  kicker: string;
  title: string;
  figure: string;
  figureNote: string;
  body: string;
};

export const emptyNextStream = (): NextStream => ({
  name: "",
  monthly: 0,
  ask: "",
  status: "blank",
});

export function extraIncomeNeeded(sprint: SprintPlan): number {
  return Math.max(0, sprint.extraMonthlySavings);
}

export function streamSplits(extra: number) {
  const one = Math.max(0, extra);
  return {
    one,
    two: one > 0 ? Math.round(one / 2) : 0,
    three: one > 0 ? Math.round(one / 3) : 0,
  };
}

export function asNextStream(value: unknown): NextStream {
  if (!value || typeof value !== "object") return emptyNextStream();
  const row = value as Partial<NextStream>;
  const status: StreamStatus =
    row.status === "earning" ||
    row.status === "asked" ||
    row.status === "named" ||
    row.status === "blank"
      ? row.status
      : "blank";
  const monthly = Number(row.monthly);
  return {
    name: typeof row.name === "string" ? row.name.trim().slice(0, 80) : "",
    monthly: Number.isFinite(monthly) ? Math.max(0, monthly) : 0,
    ask: typeof row.ask === "string" ? row.ask.trim().slice(0, 280) : "",
    status,
  };
}

export function deriveStreamStatus(stream: NextStream): StreamStatus {
  if (stream.status === "earning") return "earning";
  if (stream.name && stream.ask) return "asked";
  if (stream.name) return "named";
  return "blank";
}

export function streamStatusCopy(status: StreamStatus): string {
  if (status === "earning") {
    return "This stream is on the ledger. If the gap remains, name the next one.";
  }
  if (status === "asked") {
    return "The ask is written. The next mark is the first dollar.";
  }
  if (status === "named") {
    return "Named. Write this week’s ask — a person, a price, a date.";
  }
  return "Name the stream you will create. The size is the monthly gap above.";
}

export function incomePlays({
  plan,
  sprint,
  ready,
}: {
  plan: IndependencePlan;
  sprint: SprintPlan;
  ready: boolean;
}): [IncomePlay, IncomePlay, IncomePlay] {
  const extra = extraIncomeNeeded(sprint);
  const splits = streamSplits(extra);
  const dash = "—";

  if (!ready || plan.fiNumber <= 0) {
    return [
      {
        kicker: "Create this",
        title: "One new stream",
        figure: dash,
        figureNote: "new / month",
        body: "A client, a shift, a product, a room. Living plus giving set the size.",
      },
      {
        kicker: "Or split it",
        title: "Two smaller streams",
        figure: dash,
        figureNote: "each / month",
        body: "If one offer cannot carry the whole gap, start two.",
      },
      {
        kicker: "Or raise these",
        title: "More from work you have",
        figure: dash,
        figureNote: "more / month",
        body: "Raise a rate, add hours, or bill a project now. Do not start with a smaller life.",
      },
    ];
  }

  if (plan.reached || (sprint.onTrack && extra <= 0)) {
    return [
      {
        kicker: "Protect this",
        title: "Do not add lifestyle",
        figure: formatMoney(0),
        figureNote: "new / month required",
        body: "The date is in reach. New income is optional. Inflating living is how the sprint dies.",
      },
      {
        kicker: "Keep this",
        title: "Existing streams",
        figure: formatMoney(plan.monthlySavings),
        figureNote: "invested / month",
        body: "Keep giving. Keep the surplus working. Do not let a new want eat it.",
      },
      {
        kicker: "Skip this",
        title: "A smaller life",
        figure: "Not the plan",
        figureNote: "living cuts",
        body: "You do not need to shrink living to hit the date. Do not treat cuts as the work.",
      },
    ];
  }

  return [
    {
      kicker: "Create this",
      title: "One new stream",
      figure: formatMoney(splits.one),
      figureNote: "new / month",
      body: `Name a client, a shift, a product, or a room that pays ${formatMoney(splits.one)} every month. First dollar this month. Giving stays.`,
    },
    {
      kicker: "Or split it",
      title: "Two smaller streams",
      figure: formatMoney(splits.two),
      figureNote: "each / month",
      body:
        splits.three > 0
          ? `Two offers of ${formatMoney(splits.two)}, or three of ${formatMoney(splits.three)}. Same total. Easier to start.`
          : "Two smaller offers that add up to the monthly gap.",
    },
    {
      kicker: "Or raise these",
      title: "More from work you have",
      figure: formatMoney(splits.one),
      figureNote: "more / month",
      body:
        sprint.lumpSumNeeded > 0
          ? `Raise rates or hours on the streams already on the ledger. Or cash a project / sale once: ${formatMoney(sprint.lumpSumNeeded)}.`
          : "Raise rates or hours on the streams already on the ledger until the monthly gap is gone.",
    },
  ];
}

export function livingFootnote(sprint: SprintPlan, ready: boolean): string {
  if (!ready) {
    return "A smaller life is not the plan. Create income. Giving stays in the target.";
  }
  if (sprint.cutsAloneInsufficient) {
    return "Living cuts alone cannot hit this deadline. The work is new income.";
  }
  if (sprint.expenseCutNeeded > 0) {
    return `Living cuts are a last resort, not the move: a ceiling of ${formatMoney(sprint.maxMonthlyExpenses ?? 0)} would also mathematically work. Create the income instead.`;
  }
  return "Living can stay. The bottleneck is income you have not created yet.";
}
