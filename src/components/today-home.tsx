"use client";

import { ArrowRight, CheckCircle2, Circle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppState } from "@/hooks/use-app-state";
import { addMonths, formatLongDate, formatMonthYear, todayKey } from "@/lib/dates";
import { formatMoney, independencePlan, sprintPlan } from "@/lib/finance";
import { nextMove } from "@/lib/next-move";
import { verseOfTheDay } from "@/lib/scripture";
import { emptyPractice } from "@/lib/types";

const practiceLabels = [
  ["word", "Word"],
  ["prayer", "Prayer"],
  ["gathered", "Church"],
  ["neighbor", "Neighbor"],
] as const;

export function TodayHome() {
  const { state, hydrated } = useAppState();
  const verse = verseOfTheDay();
  const today = todayKey();
  const practice = state.practices[today] ?? emptyPractice();
  const completed = practiceLabels.filter(([key]) => practice[key]).length;
  const plan = independencePlan(state.finance);
  const sprint = sprintPlan(state.finance, state.finance.targetMonths);
  const move = nextMove(plan, sprint, state.finance);
  const deadline = formatMonthYear(addMonths(new Date(), state.finance.targetMonths));

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <section className="flex max-w-3xl flex-col gap-3">
        <p className="text-sm tracking-[0.18em] text-muted-foreground uppercase">
          {hydrated ? formatLongDate() : "Today"}
        </p>
        <h1 className="font-heading text-4xl leading-[1.05] text-balance sm:text-6xl">
          One life. Two goals. In that order.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Walk with Christ first. Build financial independence second. Today shows only what matters now.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="border-faith/30 bg-faith/5">
          <CardHeader className="border-b border-faith/20">
            <CardDescription>Goal 01 · Walk</CardDescription>
            <CardTitle className="font-heading text-2xl sm:text-3xl">Remain in Him today.</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-5">
            <blockquote className="font-heading text-xl leading-relaxed sm:text-2xl">
              “{verse.text}”
            </blockquote>
            <p className="text-sm text-muted-foreground">{verse.reference}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {practiceLabels.map(([key, label]) => (
                <div key={key} className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm">
                  {practice[key] ? <CheckCircle2 className="size-4 text-faith" /> : <Circle className="size-4 text-muted-foreground" />}
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{completed} of 4 marked today. No score—just attention.</p>
              <a href="/walk" className="inline-flex items-center gap-2 text-sm font-medium text-faith underline-offset-4 hover:underline">
                Continue the walk <ArrowRight className="size-4" />
              </a>
            </div>
          </CardContent>
        </Card>

        <Card className="border-steward/30 bg-steward/5">
          <CardHeader className="border-b border-steward/20">
            <CardDescription>Goal 02 · Independence</CardDescription>
            <CardTitle className="font-heading text-2xl sm:text-3xl">
              {plan.hasInputs ? (sprint.onTrack ? `On pace for ${deadline}` : "The gap is clear.") : "Set the financial baseline."}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-5">
            {plan.hasInputs ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Target" value={formatMoney(plan.fiNumber)} />
                  <Metric label="Have" value={formatMoney(plan.fiCapital)} />
                  <Metric label="Progress" value={`${Math.round(plan.progress * 100)}%`} />
                  <Metric label="Monthly gap" value={formatMoney(sprint.incomeLift)} />
                </div>
                <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">Next action</p>
                  <p className="mt-1 font-heading text-xl leading-tight">{move.headline}</p>
                  {move.lines[0] ? <p className="mt-2 text-sm text-muted-foreground">{move.lines[0]}</p> : null}
                </div>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Add your assets, income, living costs, and giving. Two Goals will calculate the independence target and the income gap.
              </p>
            )}
            <a href="/independence" className="inline-flex items-center gap-2 text-sm font-medium text-steward underline-offset-4 hover:underline">
              Open Independence <ArrowRight className="size-4" />
            </a>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/70 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl tabular-nums">{value}</p>
    </div>
  );
}
