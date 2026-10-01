"use client";

import { ArrowRight, CheckCircle2, Circle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppState } from "@/hooks/use-app-state";
import { formatLongDate, todayKey } from "@/lib/dates";
import { formatModelMoney, runRetirementEngine, strategyLabel } from "@/lib/retirement-engine";
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
  const decision = runRetirementEngine(state.retirementEngine);
  const selected = decision.selected;

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
            <CardDescription>Goal 02 · Decision Engine</CardDescription>
            <CardTitle className="font-heading text-2xl sm:text-3xl">
              {selected.status === "GREEN" ? `Age ${selected.retirementAge} path holds.` : selected.status === "YELLOW" ? `Age ${selected.retirementAge} path is thin.` : `Age ${selected.retirementAge} path has a gap.`}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Strategy" value={strategyLabel(state.retirementEngine.selectedStrategy)} />
              <Metric label="Age 95 balance" value={formatModelMoney(selected.endingBalanceAtTarget)} />
              <Metric label="Maximum gap" value={selected.maximumUnfundedGap > 0 ? formatModelMoney(selected.maximumUnfundedGap) : "None"} />
              <Metric label="Healthcare" value={formatModelMoney(selected.firstYearHealthcare)} />
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">Decision readout</p>
              <p className="mt-1 font-heading text-xl leading-tight">{selected.interpretation}</p>
            </div>
            <a href="/independence" className="inline-flex items-center gap-2 text-sm font-medium text-steward underline-offset-4 hover:underline">
              Open Decision Engine <ArrowRight className="size-4" />
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
