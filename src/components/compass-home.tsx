"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProgressRing } from "@/components/mark";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppState } from "@/hooks/use-app-state";
import { addMonths, formatLongDate, formatMonthYear, lastNDates, todayKey } from "@/lib/dates";
import { independencePlan, sprintPlan } from "@/lib/finance";
import { nextMove } from "@/lib/next-move";
import { verseOfTheDay } from "@/lib/scripture";
import { emptyPractice, type PracticeKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const practices: { kind: PracticeKind; label: string; hint: string }[] = [
  { kind: "word", label: "Open the Word", hint: "Read until you meet Him." },
  { kind: "prayer", label: "Speak with the Lord", hint: "Thanksgiving, petition, silence." },
  { kind: "gathered", label: "Gather with the church", hint: "Do not walk this alone." },
  { kind: "neighbor", label: "Love a neighbor", hint: "A name, a meal, a mercy." },
];

export function CompassHome() {
  const { state, hydrated, togglePractice } = useAppState();
  const today = todayKey();
  const verse = verseOfTheDay();
  const day = state.practices[today] ?? emptyPractice();
  const plan = independencePlan(state.finance);
  const sprint = sprintPlan(state.finance, state.finance.targetMonths);
  const move = nextMove(plan, sprint, state.finance, hydrated);
  const deadline = formatMonthYear(addMonths(new Date(), state.finance.targetMonths));
  const week = lastNDates(7);
  const wordDays = week.filter((date) => state.practices[date]?.word).length;
  const prayerDays = week.filter((date) => state.practices[date]?.prayer).length;
  const doneToday = practices.filter((item) => day[item.kind]).length;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-5">
        <p className="text-sm tracking-[0.18em] text-muted-foreground uppercase">
          {hydrated ? formatLongDate() : "Today"}
        </p>
        <h1 className="font-heading max-w-3xl text-4xl leading-[1.1] text-balance sm:text-6xl">
          Two goals. One life, aimed at Christ.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground text-pretty">
          Eternal life is a gift, already finished in Jesus. Financial
          independence is a 6–12 month sprint of stewardship, so a paycheck
          cannot own you. Hold them in that order.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <GoalPanel
          href="/walk"
          kicker="Goal 01"
          title="Live eternally with Jesus Christ"
          body="Not a score. A Person. Abide in the Vine: Word, prayer, the gathered church, and love of neighbor."
          tone="faith"
          cta="Walk with Him"
        />
        <GoalPanel
          href="/steward"
          kicker="Goal 02"
          title="Live financially independent"
          body={`In the next ${state.finance.targetMonths} months — by ${hydrated ? deadline : "this year"}. Spend less than you earn, give first, and close the gap before the deadline.`}
          tone="steward"
          cta="Open the sprint"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>Word for this day</CardDescription>
            <CardTitle className="font-heading text-2xl">
              {verse.reference}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            <blockquote className="font-heading text-xl leading-relaxed text-pretty sm:text-2xl">
              {verse.text}
            </blockquote>
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>Independence</CardDescription>
            <CardTitle className="font-heading text-2xl">
              {hydrated && plan.hasInputs ? move.headline : "No finish line yet"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-5 pt-5">
            <div className="text-steward relative">
              <ProgressRing value={hydrated ? plan.progress : 0} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-heading text-2xl">
                  {hydrated ? Math.round(plan.progress * 100) : 0}%
                </span>
                <span className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  of FI
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-sm">
              {hydrated && plan.hasInputs ? (
                <>
                  {move.lines[0] ? <p>{move.lines[0]}</p> : null}
                  <Link
                    href="/steward"
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    Do this on Steward
                  </Link>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Enter living and giving on Steward. Then it will name the one
                  monthly shortfall, lump sum, or living ceiling that hits{" "}
                  {deadline}.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>Abide today</CardDescription>
            <CardTitle className="font-heading text-2xl">
              {doneToday === 0
                ? "Begin with Him"
                : doneToday === practices.length
                  ? "A full day of remaining"
                  : `${doneToday} of ${practices.length} kept`}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 pt-5">
            {practices.map((item) => (
              <label
                key={item.kind}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-1 py-1.5 hover:border-border/80 hover:bg-muted/40"
                onClick={(event) => {
                  event.preventDefault();
                  togglePractice(today, item.kind);
                }}
              >
                <Checkbox
                  checked={hydrated ? day[item.kind] : false}
                  className="pointer-events-none mt-0.5"
                />
                <span>
                  <span className="block font-medium">{item.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.hint}
                  </span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>This week, not a score</CardDescription>
            <CardTitle className="font-heading text-2xl">
              Days you met with Him
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-5">
            <WeekStrip
              label="Word"
              dates={week}
              active={week.map((date) => Boolean(state.practices[date]?.word))}
              count={wordDays}
              tone="faith"
            />
            <WeekStrip
              label="Prayer"
              dates={week}
              active={week.map((date) => Boolean(state.practices[date]?.prayer))}
              count={prayerDays}
              tone="faith"
            />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Salvation is not unlocked by a streak. These marks are only a
              way to notice whether you are remaining in the Vine.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function GoalPanel({
  href,
  kicker,
  title,
  body,
  tone,
  cta,
}: {
  href: string;
  kicker: string;
  title: string;
  body: string;
  tone: "faith" | "steward";
  cta: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col justify-between gap-8 rounded-2xl p-6 text-white shadow-sm ring-1 ring-black/5 transition-transform sm:p-8",
        tone === "faith" ? "bg-faith" : "bg-steward"
      )}
    >
      <div className="flex flex-col gap-4">
        <p className="text-xs tracking-[0.22em] text-white/70 uppercase">
          {kicker}
        </p>
        <h2 className="font-heading text-3xl leading-tight text-balance sm:text-4xl">
          {title}
        </h2>
        <p className="max-w-md text-base leading-relaxed text-white/80">
          {body}
        </p>
      </div>
      <span className="inline-flex items-center gap-2 text-sm font-medium">
        {cta}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function WeekStrip({
  label,
  dates,
  active,
  count,
  tone,
}: {
  label: string;
  dates: string[];
  active: boolean[];
  count: number;
  tone: "faith" | "steward";
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{count} of 7</p>
      </div>
      <div className="flex gap-2">
        {dates.map((date, index) => (
          <span
            key={date}
            title={date}
            className={cn(
              "h-2.5 flex-1 rounded-full",
              active[index]
                ? tone === "faith"
                  ? "bg-faith"
                  : "bg-steward"
                : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
}
