"use client";

import { addMonths, formatMonthYear } from "@/lib/dates";
import {
  formatDuration,
  formatMoney,
  formatPercent,
  type IndependencePlan,
  type SprintPlan,
  SPRINT_WINDOWS,
} from "@/lib/finance";
import type { SprintMonths } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SprintBoard({
  plan,
  sprint,
  targetMonths,
  hasInputs,
  hydrated,
  onTargetMonths,
}: {
  plan: IndependencePlan;
  sprint: SprintPlan;
  targetMonths: SprintMonths;
  hasInputs: boolean;
  hydrated: boolean;
  onTargetMonths: (months: SprintMonths) => void;
}) {
  const deadline = formatMonthYear(addMonths(new Date(), targetMonths));
  const sisterWindow: SprintMonths = targetMonths === 6 ? 12 : 6;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="text-sm tracking-[0.18em] text-steward uppercase">
            The window
          </p>
          <h2 className="font-heading text-3xl leading-tight sm:text-4xl">
            Independent by {deadline}.
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Classic independence is about 25 years of spending invested. Hitting
            that in 6 to 12 months is a sprint: earn more, spend less, or bring
            a lump sum. Giving stays.
          </p>
        </div>
        <div className="flex rounded-full border border-border bg-card p-1">
          {SPRINT_WINDOWS.map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => onTargetMonths(months)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                targetMonths === months
                  ? "bg-steward text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {months === 6 ? "6 months" : "12 months"}
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "rounded-2xl p-6 text-white sm:p-8",
          !hydrated || !hasInputs
            ? "bg-steward"
            : sprint.reached || sprint.onTrack
              ? "bg-steward"
              : "bg-faith"
        )}
      >
        <p className="text-xs tracking-[0.22em] text-white/70 uppercase">
          {targetMonths === 6 ? "Stretch" : "Deadline"} · {deadline}
        </p>
        <p className="font-heading mt-3 text-3xl leading-tight sm:text-4xl">
          {!hydrated
            ? "…"
            : !hasInputs
              ? "Enter net worth, income, living, and giving. Those four numbers decide if the deadline is possible."
              : sprint.reached
                ? "You can stop working for money"
                : sprint.onTrack
                  ? `On pace. Current path arrives in ${formatDuration(plan.monthsRemaining)}.`
                  : `Off pace. This path takes ${formatDuration(plan.monthsRemaining)}.`}
        </p>
        {hydrated && hasInputs && !sprint.reached ? (
          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <SprintStat
              label="Needed by then"
              value={formatMoney(plan.fiNumber)}
            />
            <SprintStat
              label="If you keep this pace"
              value={formatMoney(sprint.projectedNetWorth)}
            />
            <SprintStat
              label="Gap at the deadline"
              value={formatMoney(
                Math.max(0, plan.fiNumber - sprint.projectedNetWorth)
              )}
            />
          </dl>
        ) : null}
      </div>

      {hydrated && hasInputs && !sprint.reached ? (
        sprint.onTrack ? (
          <p className="rounded-2xl border border-steward/20 bg-steward/5 px-5 py-4 text-sm leading-relaxed">
            This surplus arrives inside the window
            {sprint.monthlyMargin > 1
              ? ` with about ${formatMoney(sprint.monthlyMargin)} of room each month`
              : ""}
            . Keep seeking the kingdom while you run. Switch to{" "}
            {sisterWindow} months if you want the tighter date.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <Lever
              kicker="Path 1"
              title="Raise the surplus"
              body={
                sprint.incomeLift > 0
                  ? `Save or earn ${formatMoney(sprint.extraMonthlySavings)} more each month. That is take-home of ${formatMoney(sprint.requiredMonthlyIncome)}, with living and giving unchanged.`
                  : `Put ${formatMoney(sprint.requiredMonthlySavings)} to investments each month.`
              }
              figure={formatMoney(sprint.extraMonthlySavings)}
              figureNote="more / month"
            />
            <Lever
              kicker="Path 2"
              title="Bring a lump sum"
              body="A bonus, a sale, extra work cashed in once. Added to invested net worth today, this closes the window without changing your monthly life."
              figure={formatMoney(sprint.lumpSumNeeded)}
              figureNote="once, now"
            />
            <Lever
              kicker="Path 3"
              title="Shrink the life you fund"
              body={
                sprint.cutsAloneInsufficient
                  ? "Even living costs of $0 would not get there with current income, giving, and nest egg. Raise income or bring a lump sum."
                  : sprint.expenseCutNeeded > 0
                    ? `Live on ${formatMoney(sprint.maxMonthlyExpenses ?? 0)} a month. Cut ${formatMoney(sprint.expenseCutNeeded)} from living costs. Giving stays. A smaller barn still counts if you can live there in peace.`
                    : `Living costs can stay. The bottleneck is surplus or a lump sum, not the size of the life you fund.`
              }
              figure={
                sprint.cutsAloneInsufficient
                  ? "Not enough"
                  : formatMoney(sprint.maxMonthlyExpenses ?? 0)
              }
              figureNote="max living / month"
            />
          </div>
        )
      ) : null}

      {hydrated && hasInputs && plan.fiNumber > 0 ? (
        <p className="text-sm text-muted-foreground">
          Savings rate {formatPercent(plan.savingsRate)}. Required surplus to
          hit {deadline}: {formatMoney(sprint.requiredMonthlySavings)} / month.
        </p>
      ) : null}
    </section>
  );
}

function SprintStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-white/70">{label}</dt>
      <dd className="font-heading text-2xl">{value}</dd>
    </div>
  );
}

function Lever({
  kicker,
  title,
  body,
  figure,
  figureNote,
}: {
  kicker: string;
  title: string;
  body: string;
  figure: string;
  figureNote: string;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
        {kicker}
      </p>
      <p className="font-heading text-2xl leading-tight">{title}</p>
      <p className="font-heading text-3xl text-steward">{figure}</p>
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        {figureNote}
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}
