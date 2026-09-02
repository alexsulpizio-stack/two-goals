"use client";

import { addMonths, formatMonthYear } from "@/lib/dates";
import {
  formatMoney,
  formatPercent,
  type IndependencePlan,
  type SprintPlan,
  SPRINT_WINDOWS,
} from "@/lib/finance";
import { nextMove } from "@/lib/next-move";
import type { FinanceInputs, SprintMonths } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SprintBoard({
  plan,
  sprint,
  finance,
  targetMonths,
  hasInputs,
  onTargetMonths,
}: {
  plan: IndependencePlan;
  sprint: SprintPlan;
  finance: FinanceInputs;
  targetMonths: SprintMonths;
  hasInputs: boolean;
  onTargetMonths: (months: SprintMonths) => void;
}) {
  const deadline = formatMonthYear(addMonths(new Date(), targetMonths));
  const sisterWindow: SprintMonths = targetMonths === 6 ? 12 : 6;
  const move = nextMove(plan, sprint, finance);

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
          !hasInputs
            ? "bg-steward"
            : sprint.reached || sprint.onTrack
              ? "bg-steward"
              : "bg-faith"
        )}
      >
        <p className="text-xs tracking-[0.22em] text-white/70 uppercase">
          {move.kicker}
        </p>
        <p className="font-heading mt-3 text-3xl leading-tight sm:text-4xl">
          {move.headline}
        </p>
        {move.lines.length > 0 ? (
          <ul className="mt-6 flex flex-col gap-2 text-base leading-relaxed text-white/90 sm:text-lg">
            {move.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        {move.footer ? (
          <p className="mt-6 text-sm leading-relaxed text-white/75">
            {move.footer}
          </p>
        ) : null}
        {hasInputs && !sprint.reached && plan.fiNumber > 0 ? (
          <dl className="mt-8 grid gap-4 border-t border-white/20 pt-6 sm:grid-cols-3">
            <SprintStat
              label="Nest egg to hit"
              value={formatMoney(plan.fiNumber)}
            />
            <SprintStat
              label="You have"
              value={formatMoney(finance.netWorth)}
            />
            <SprintStat
              label="Still to close"
              value={formatMoney(Math.max(0, plan.fiNumber - finance.netWorth))}
            />
          </dl>
        ) : null}
      </div>

      {hasInputs && !sprint.reached && !sprint.onTrack ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Lever
            kicker="Or this"
            title="Raise the surplus"
            body={
              sprint.incomeLift > 0
                ? `Save or earn ${formatMoney(sprint.extraMonthlySavings)} more each month.`
                : `Put ${formatMoney(sprint.requiredMonthlySavings)} to investments each month.`
            }
            figure={formatMoney(sprint.extraMonthlySavings)}
            figureNote="more / month"
          />
          <Lever
            kicker="Or this"
            title="Bring a lump sum"
            body="A bonus, a sale, extra work cashed in once."
            figure={formatMoney(sprint.lumpSumNeeded)}
            figureNote="once, now"
          />
          <Lever
            kicker="Or this"
            title="Shrink living"
            body={
              sprint.cutsAloneInsufficient
                ? "Living cuts alone cannot get there."
                : sprint.expenseCutNeeded > 0
                  ? `Live on ${formatMoney(sprint.maxMonthlyExpenses ?? 0)}. Giving stays.`
                  : "Living can stay. Surplus or a lump sum is the bottleneck."
            }
            figure={
              sprint.cutsAloneInsufficient
                ? "Not enough"
                : formatMoney(sprint.maxMonthlyExpenses ?? 0)
            }
            figureNote="max living / month"
          />
        </div>
      ) : null}

      {hasInputs && sprint.onTrack && !sprint.reached ? (
        <p className="text-sm text-muted-foreground">
          Switch to {sisterWindow} months if you want the tighter date. Savings
          rate {formatPercent(plan.savingsRate)}.
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
