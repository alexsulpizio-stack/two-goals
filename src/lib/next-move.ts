import { addMonths, formatMonthYear } from "./dates";
import {
  formatDuration,
  formatMoney,
  type IndependencePlan,
  type SprintPlan,
} from "./finance";
import { extraIncomeNeeded, streamSplits } from "./income-plays";
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
  const extra = extraIncomeNeeded(sprint);
  const splits = streamSplits(extra);

  if (!plan.hasInputs || plan.fiNumber <= 0) {
    return {
      kicker: "Create income",
      headline: "Name the life to fund. Then this page sizes the income you still have to create.",
      lines: [
        "One new stream: — / month",
        "Or two smaller streams: — each",
        "Or raise what you already earn: — / month",
      ],
      footer:
        "Living plus giving set the nest egg. The gap is not a smaller life. It is work you have not named yet.",
    };
  }

  if (plan.reached) {
    return {
      kicker: "Your move",
      headline: "The money goal is met. Do not let it become the master.",
      lines: [
        "Keep giving. Do not inflate living just because the nest egg is big enough.",
        "You do not need another stream for the date. You may create one as overflow.",
        "Protect the life you already funded.",
      ],
      footer: "Seek first the kingdom. The ledger’s job here is to keep the barn from owning you.",
    };
  }

  if (plan.monthlySavings < 0) {
    return {
      kicker: "Create income this month",
      headline: `Create ${formatMoney(Math.max(extra, Math.abs(plan.monthlySavings)))} more take-home a month. Until it arrives the barn empties by ${formatMoney(Math.abs(plan.monthlySavings))}.`,
      lines: [
        `One new stream of ${formatMoney(splits.one)} covers the hole and starts the sprint.`,
        splits.two > 0
          ? `Or two streams of ${formatMoney(splits.two)} each.`
          : "Name the offer and make one ask this week.",
        "A smaller life can stop the bleed. It is not the first move. Create the income.",
      ],
      footer: "Giving can stay. Name the stream below and make the ask before you cut the life.",
    };
  }

  if (sprint.onTrack) {
    return {
      kicker: "Your move this month",
      headline: `Keep investing ${formatMoney(plan.monthlySavings)} a month. Do not raise living costs.`,
      lines: [
        `That pace reaches the nest egg of ${formatMoney(plan.fiNumber)} in ${formatDuration(plan.monthsRemaining)} — inside the ${deadline} window.`,
        "No new stream is required for this date.",
        "Creating extra income is overflow, not rescue. Do not spend it on a bigger life.",
      ],
      footer: "The help is protection: a bigger lifestyle is how this sprint dies.",
    };
  }

  return {
    kicker: "Create income this month",
    headline: `Current path misses ${deadline}. Create ${formatMoney(splits.one)} a month in new take-home.`,
    lines: [
      `One new stream of ${formatMoney(splits.one)} — a client, a shift, a product, a room.`,
      splits.two > 0
        ? `Or two streams of ${formatMoney(splits.two)} each (or three of ${formatMoney(splits.three)}).`
        : "Name the offer. Make one ask this week.",
      sprint.lumpSumNeeded > 0
        ? `Or raise the streams you already run by ${formatMoney(splits.one)} a month — or cash a project once: ${formatMoney(sprint.lumpSumNeeded)}.`
        : `Or raise the streams you already run by ${formatMoney(splits.one)} a month.`,
    ],
    footer:
      "Do not start with a smaller life. Name the stream, make one ask this week, and put the first dollar on the ledger.",
  };
}
