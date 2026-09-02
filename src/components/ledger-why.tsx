"use client";

import { formatShortDate } from "@/lib/dates";
import {
  formatDuration,
  formatMoney,
  formatPercent,
  type IndependencePlan,
  type SprintPlan,
} from "@/lib/finance";
import { snapshotDelta, type LedgerSnapshot } from "@/lib/ledger";
import type { FinanceInputs } from "@/lib/types";

export function LedgerWhy({
  plan,
  sprint,
  finance,
  snapshots,
  hydrated,
}: {
  plan: IndependencePlan;
  sprint: SprintPlan;
  finance: FinanceInputs;
  snapshots: LedgerSnapshot[];
  hydrated: boolean;
}) {
  const delta = snapshotDelta(snapshots, finance.swr);
  const gap = Math.max(0, plan.fiNumber - finance.netWorth);

  return (
    <div className="rounded-2xl border border-steward/20 bg-steward/5 px-5 py-5 text-sm leading-relaxed">
      <p className="text-xs tracking-[0.18em] text-steward uppercase">
        What the ledger is for
      </p>
      {!hydrated || !plan.hasInputs ? (
        <div className="mt-3 flex flex-col gap-3 text-pretty">
          <p>
            These four numbers answer one question: can you stop needing a
            paycheck in 6 to 12 months without starving giving?
          </p>
          <ul className="flex flex-col gap-2 text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Net worth</span> is
              the starting line — how much of the nest egg you already hold.
            </li>
            <li>
              <span className="font-medium text-foreground">Income</span> is
              how fast you can add to it.
            </li>
            <li>
              <span className="font-medium text-foreground">Living</span> cuts
              both ways: a bigger life needs a bigger nest egg, and leaves less
              to invest.
            </li>
            <li>
              <span className="font-medium text-foreground">Giving</span> is
              part of the life you intend to fund, not leftovers. It raises the
              number on purpose.
            </li>
          </ul>
          <p>
            Record today so the next visit is a comparison, not a guess: did the
            gap actually get smaller?
          </p>
        </div>
      ) : plan.reached ? (
        <p className="mt-3 text-pretty">
          The nest egg already covers the life you named, including giving. Keep
          recording so the portfolio stays a servant, not a master.
        </p>
      ) : plan.fiNumber <= 0 ? (
        <p className="mt-3 text-pretty">
          Add living expenses and giving. Those two set the nest egg you must
          hold. Net worth and income only tell you how fast you can get there
          once there is a life to fund.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3 text-pretty">
          <p>
            To fund {formatMoney(plan.annualSpend)} a year — living plus giving —
            you need about {formatMoney(plan.fiNumber)} invested. You have{" "}
            {formatMoney(finance.netWorth)}, so{" "}
            <span className="font-medium text-foreground">
              {formatMoney(gap)} still to close
            </span>{" "}
            ({formatPercent(plan.progress)} of the way).
          </p>
          <p>
            This month you keep {formatMoney(plan.monthlySavings)}. Hitting the
            deadline requires about {formatMoney(sprint.requiredMonthlySavings)}{" "}
            / month.
            {sprint.onTrack
              ? ` This pace arrives in ${formatDuration(plan.monthsRemaining)}.`
              : ` You are short ${formatMoney(sprint.extraMonthlySavings)} each month. The three paths above — more surplus, a lump sum, or a smaller life — are the only moves that close it in time.`}
          </p>
          {delta ? (
            <p>
              Since {formatShortDate(delta.from.date)}, net worth moved{" "}
              {signedMoney(delta.netWorthChange)} and the gap moved{" "}
              {signedMoney(delta.gapChange)}.{" "}
              {delta.gapChange < 0
                ? "That is the value of the record: the deadline got closer."
                : delta.gapChange > 0
                  ? "The barn grew or the life you fund got more expensive. The record is the warning."
                  : "The gap did not move. Recording makes that impossible to miss."}
            </p>
          ) : (
            <p>
              Record today. The next snapshot is how you know whether you moved
              toward the deadline or only meant to.
            </p>
          )}
          {plan.givingRate === 0 ? (
            <p>
              Giving is still at zero. A Christian sprint funds generosity on
              purpose, not as an afterthought — and it is part of the nest egg
              you are aiming at.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

function signedMoney(amount: number) {
  if (amount === 0) return formatMoney(0);
  return amount > 0 ? `+${formatMoney(amount)}` : formatMoney(amount);
}
