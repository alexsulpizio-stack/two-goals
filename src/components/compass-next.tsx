"use client";

import { ArrowRight } from "lucide-react";

import { useAppState } from "@/hooks/use-app-state";
import { independencePlan, sprintPlan, formatMoney } from "@/lib/finance";
import { todayKey } from "@/lib/dates";
import { emptyPractice } from "@/lib/types";

export function CompassNext() {
  const { state } = useAppState();
  const today = todayKey();
  const day = state.practices[today] ?? emptyPractice();
  const plan = independencePlan(state.finance);
  const sprint = sprintPlan(state.finance, state.finance.targetMonths);

  let href = "/walk";
  let kicker = "Do this next";
  let title = "Open the Word before the sprint.";
  let body = "Goal 01 stays first. Read, pray, then let the financial work take its proper place.";

  if (day.word && !day.prayer) {
    title = "Pray before you optimize.";
    body = "You opened the Word. Speak with the Lord before the money goal gets the next block of attention.";
  } else if (day.word && day.prayer && plan.hasInputs && !sprint.onTrack) {
    href = "/steward";
    title = `Create ${formatMoney(sprint.incomeLift)} more take-home each month.`;
    body = "The spiritual first things are marked today. The financial bottleneck is now specific: name the stream and make the ask.";
  } else if (day.word && day.prayer && !day.neighbor) {
    title = "Love one neighbor by name.";
    body = "Do something concrete for a person near you before treating productivity as the whole day.";
  } else if (day.word && day.prayer && day.neighbor && !day.gathered) {
    title = "Keep the gathered church in the week.";
    body = "This is not a streak. It is a reminder that the walk is not meant to be solitary.";
  } else if (day.word && day.prayer && day.neighbor && day.gathered) {
    href = plan.hasInputs ? "/steward" : "/counsel";
    kicker = "The order is intact";
    title = plan.hasInputs ? "Work the money goal without letting it become the master." : "Now make the financial goal concrete.";
    body = plan.hasInputs
      ? "Protect the walk, then execute the next financial move already sized by Steward."
      : "Sit for Counsel or enter the Steward numbers so the second goal has a real finish line.";
  }

  return (
    <a
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-faith/30 bg-faith/5 p-5 transition-colors hover:bg-faith/10 sm:p-6"
    >
      <p className="text-sm tracking-[0.18em] text-faith uppercase">{kicker}</p>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl leading-tight sm:text-3xl">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>
        <ArrowRight className="mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-1" />
      </div>
    </a>
  );
}
