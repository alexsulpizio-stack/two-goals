"use client";

import { addMonths, formatMonthYear } from "@/lib/dates";
import {
  formatMoney,
  formatPercent,
  type IndependencePlan,
  type SprintPlan,
  SPRINT_WINDOWS,
} from "@/lib/finance";
import { incomePlays, livingFootnote } from "@/lib/income-plays";
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
  const offTrack = hasInputs && plan.fiNumber > 0 && !sprint.reached && !sprint.onTrack;
  const ready = hasInputs && plan.fiNumber > 0;
  const plays = incomePlays({ plan, sprint, ready });
  const lines =
    move.lines.length >= 3
      ? move.lines.slice(0, 3)
      : [
          move.lines[0] ?? "One new stream: — / month",
          move.lines[1] ?? "Or two smaller streams: — each",
          move.lines[2] ?? "Or raise what you already earn: — / month",
        ];

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="text-sm tracking-[0.18em] text-steward uppercase">
            The window
          </p>
          <h2
            id="sprint-deadline"
            className="font-heading text-3xl leading-tight sm:text-4xl"
          >
            Independent by {deadline}.
          </h2>
        </div>
        <div className="flex rounded-full border border-border bg-card p-1">
          {SPRINT_WINDOWS.map((months) => (
            <button
              key={months}
              type="button"
              data-target-months={months}
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
        id="move-box"
        className={cn(
          "rounded-2xl p-6 text-white sm:p-8",
          !hasInputs || sprint.reached || sprint.onTrack
            ? "bg-steward"
            : "bg-faith"
        )}
      >
        <p
          id="move-kicker"
          className="text-xs tracking-[0.22em] text-white/70 uppercase"
        >
          {move.kicker}
        </p>
        <p
          id="move-headline"
          className="font-heading mt-3 text-3xl leading-tight sm:text-4xl"
        >
          {move.headline}
        </p>
        <ul className="mt-6 flex flex-col gap-2 text-base leading-relaxed text-white/90 sm:text-lg">
          <li id="move-line-surplus">{lines[0]}</li>
          <li id="move-line-lump">{lines[1]}</li>
          <li id="move-line-living">{lines[2]}</li>
        </ul>
        <p
          id="move-footer"
          className="mt-6 text-sm leading-relaxed text-white/75"
        >
          {move.footer}
        </p>
        <dl className="mt-8 grid gap-4 border-t border-white/20 pt-6 sm:grid-cols-3">
          <SprintStat
            id="stat-fi"
            label="Nest egg to hit"
            value={plan.fiNumber > 0 ? formatMoney(plan.fiNumber) : "—"}
          />
          <SprintStat
            id="stat-have"
            label="You have"
            value={hasInputs ? formatMoney(finance.netWorth) : "—"}
          />
          <SprintStat
            id="stat-gap"
            label="Still to close"
            value={
              plan.fiNumber > 0
                ? formatMoney(Math.max(0, plan.fiNumber - finance.netWorth))
                : "—"
            }
          />
        </dl>
      </div>

      <div id="sprint-levers" className="grid gap-4 lg:grid-cols-3">
        <Lever
          kickerId="lever-surplus-kicker"
          titleId="lever-surplus-title"
          figureId="lever-surplus-figure"
          noteId="lever-surplus-note"
          bodyId="lever-surplus-body"
          play={plays[0]}
        />
        <Lever
          kickerId="lever-lump-kicker"
          titleId="lever-lump-title"
          figureId="lever-lump-figure"
          noteId="lever-lump-note"
          bodyId="lever-lump-body"
          play={plays[1]}
        />
        <Lever
          kickerId="lever-living-kicker"
          titleId="lever-living-title"
          figureId="lever-living-figure"
          noteId="lever-living-note"
          bodyId="lever-living-body"
          play={plays[2]}
        />
      </div>

      <p id="living-footnote" className="text-sm text-muted-foreground">
        {livingFootnote(sprint, ready)}
      </p>

      <p
        id="sprint-on-track-note"
        className="text-sm text-muted-foreground"
        hidden={!hasInputs || !sprint.onTrack || sprint.reached}
      >
        Switch to {sisterWindow} months if you want the tighter date. Savings
        rate {formatPercent(plan.savingsRate)}.
      </p>
      <p className="sr-only">{offTrack ? "Off track" : "On track or waiting"}</p>
    </section>
  );
}

function SprintStat({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-sm text-white/70">{label}</dt>
      <dd id={id} className="font-heading text-2xl">
        {value}
      </dd>
    </div>
  );
}

function Lever({
  kickerId,
  titleId,
  figureId,
  noteId,
  bodyId,
  play,
}: {
  kickerId: string;
  titleId: string;
  figureId: string;
  noteId: string;
  bodyId: string;
  play: {
    kicker: string;
    title: string;
    figure: string;
    figureNote: string;
    body: string;
  };
}) {
  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5">
      <p
        id={kickerId}
        className="text-xs tracking-[0.18em] text-muted-foreground uppercase"
      >
        {play.kicker}
      </p>
      <p id={titleId} className="font-heading text-2xl leading-tight">
        {play.title}
      </p>
      <p id={figureId} className="font-heading text-3xl text-steward">
        {play.figure}
      </p>
      <p
        id={noteId}
        className="text-xs tracking-wide text-muted-foreground uppercase"
      >
        {play.figureNote}
      </p>
      <p id={bodyId} className="text-sm leading-relaxed text-muted-foreground">
        {play.body}
      </p>
    </article>
  );
}
