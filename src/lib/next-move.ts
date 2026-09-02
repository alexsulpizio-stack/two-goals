import { addMonths, formatMonthYear } from "./dates";
import {
  formatDuration,
  formatMoney,
  type IndependencePlan,
  type SprintPlan,
} from "./finance";
import type { FinanceInputs } from "./types";

export type NextMove = {
  kicker: string;
  headline: string;
  lines: string[];
  footer: string;
};

export function nextMove(
  plan: IndependencePlan,
  sprint: SprintPlan,
  finance: FinanceInputs,
  hydrated: boolean
): NextMove {
  const deadline = formatMonthYear(addMonths(new Date(), finance.targetMonths));

  if (!hydrated) {
    return {
      kicker: "Your move",
      headline: "Loading the ledger…",
      lines: [],
      footer: "",
    };
  }

  if (!plan.hasInputs) {
    return {
      kicker: "Your move",
      headline: "Enter living costs and giving first.",
      lines: [
        "Those two numbers set the nest egg. Income and net worth only matter after there is a life to fund.",
      ],
      footer:
        "This page will not earn the money. It will name the one-month shortfall, the lump sum, or the living ceiling that hits the deadline. Then you pick one and do it.",
    };
  }

  if (plan.fiNumber <= 0) {
    return {
      kicker: "Your move",
      headline: "Name the life you intend to fund.",
      lines: [
        "Add monthly living and monthly giving. Without them there is no finish line, only a date.",
      ],
      footer: "Independence means that life runs without a paycheck. Say what that life costs.",
    };
  }

  if (plan.reached) {
    return {
      kicker: "Your move",
      headline: "The money goal is met. Do not let it become the master.",
      lines: [
        "Keep giving. Do not inflate living just because the nest egg is big enough.",
      ],
      footer: "Seek first the kingdom. The ledger’s job here is to keep the barn from owning you.",
    };
  }

  if (plan.monthlySavings < 0) {
    return {
      kicker: "Your move this month",
      headline: `Stop the bleed. This month the barn empties by ${formatMoney(Math.abs(plan.monthlySavings))}.`,
      lines: [
        "Cut living until take-home covers living plus giving. The 6–12 month sprint cannot start while net worth is falling.",
      ],
      footer: "Giving can stay. The rest of the life has to fit.",
    };
  }

  if (sprint.onTrack) {
    return {
      kicker: "Your move this month",
      headline: `Keep investing ${formatMoney(plan.monthlySavings)} a month. Do not raise living costs.`,
      lines: [
        `That pace reaches the nest egg of ${formatMoney(plan.fiNumber)} in ${formatDuration(plan.monthsRemaining)} — inside the ${deadline} window.`,
      ],
      footer: "The help is protection: a bigger lifestyle is how this sprint dies.",
    };
  }

  const lines = [
    `Put ${formatMoney(sprint.extraMonthlySavings)} more into investments each month (take-home ${formatMoney(sprint.requiredMonthlyIncome)} if living and giving stay the same).`,
    sprint.lumpSumNeeded > 0
      ? `Or add ${formatMoney(sprint.lumpSumNeeded)} in cash once, now.`
      : null,
    sprint.cutsAloneInsufficient
      ? "Cutting living costs alone cannot hit this deadline. It has to be more surplus or a lump sum."
      : sprint.expenseCutNeeded > 0
        ? `Or live on ${formatMoney(sprint.maxMonthlyExpenses ?? 0)} a month — cut ${formatMoney(sprint.expenseCutNeeded)} of living. Giving stays.`
        : "Living costs can stay. The bottleneck is surplus or a lump sum.",
  ].filter((line): line is string => Boolean(line));

  return {
    kicker: "Your move this month — pick one",
    headline: `Current path misses ${deadline}. It takes ${formatDuration(plan.monthsRemaining)}.`,
    lines,
    footer:
      "This page does not close the gap. Those three numbers are the only sizes that do. Pick one this week and run it.",
  };
}
