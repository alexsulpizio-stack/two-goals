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
  finance: FinanceInputs
): NextMove {
  const deadline = formatMonthYear(addMonths(new Date(), finance.targetMonths));

  if (!plan.hasInputs || plan.fiNumber <= 0) {
    return {
      kicker: "Your move",
      headline: "Enter living costs and giving. The three sizes fill in as you type.",
      lines: [
        "More invested each month: —",
        "Or a lump sum now: —",
        "Or a living ceiling: — (giving stays).",
      ],
      footer:
        "Living plus giving set the nest egg. Income and net worth then name the only three sizes that hit the deadline. Pick one and do it.",
    };
  }

  if (plan.reached) {
    return {
      kicker: "Your move",
      headline: "The money goal is met. Do not let it become the master.",
      lines: [
        "Keep giving. Do not inflate living just because the nest egg is big enough.",
        "Surplus this month is no longer the bottleneck.",
        "Protect the life you already funded.",
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
        sprint.lumpSumNeeded > 0
          ? `A lump sum of ${formatMoney(sprint.lumpSumNeeded)} would still close the nest-egg gap.`
          : "A lump sum cannot substitute for stopping the bleed.",
        sprint.cutsAloneInsufficient
          ? "Living cuts alone cannot hit this deadline. Stop the bleed first, then raise surplus."
          : `Live on ${formatMoney(sprint.maxMonthlyExpenses ?? 0)} if you want the date to stay possible.`,
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
        "Extra surplus needed this month: $0.",
        "Living can stay. Do not inflate it.",
      ],
      footer: "The help is protection: a bigger lifestyle is how this sprint dies.",
    };
  }

  const lines = [
    `Put ${formatMoney(sprint.extraMonthlySavings)} more into investments each month (take-home ${formatMoney(sprint.requiredMonthlyIncome)} if living and giving stay the same).`,
    sprint.lumpSumNeeded > 0
      ? `Or add ${formatMoney(sprint.lumpSumNeeded)} in cash once, now.`
      : "Or a lump sum is not required if surplus rises enough.",
    sprint.cutsAloneInsufficient
      ? "Cutting living costs alone cannot hit this deadline. It has to be more surplus or a lump sum."
      : sprint.expenseCutNeeded > 0
        ? `Or live on ${formatMoney(sprint.maxMonthlyExpenses ?? 0)} a month — cut ${formatMoney(sprint.expenseCutNeeded)} of living. Giving stays.`
        : "Living costs can stay. The bottleneck is surplus or a lump sum.",
  ];

  return {
    kicker: "Your move this month — pick one",
    headline: `Current path misses ${deadline}. It takes ${formatDuration(plan.monthsRemaining)}.`,
    lines,
    footer:
      "This page does not close the gap. Those three numbers are the only sizes that do. Pick one this week and run it.",
  };
}
