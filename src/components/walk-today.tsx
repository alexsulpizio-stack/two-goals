"use client";

import { useState } from "react";
import { BookOpen, Church, HeartHandshake, MessageCircle, CheckCircle2, Circle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/hooks/use-app-state";
import { formatLongDate, formatShortDate, lastNDates, todayKey } from "@/lib/dates";
import { verseOfTheDay } from "@/lib/scripture";
import { emptyPractice, type PracticeKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const practices: Array<{ kind: PracticeKind; label: string; body: string; icon: typeof BookOpen }> = [
  { kind: "word", label: "Open the Word", body: "Read to hear the Shepherd, not to clear a quota.", icon: BookOpen },
  { kind: "prayer", label: "Pray", body: "Thank Him. Ask. Wait. Name the people in front of you.", icon: MessageCircle },
  { kind: "gathered", label: "Gather", body: "Stay connected to the church rather than turning faith into a private project.", icon: Church },
  { kind: "neighbor", label: "Love a neighbor", body: "Make love concrete: a name, a meal, a visit, a mercy, a hard conversation.", icon: HeartHandshake },
];

export function WalkToday() {
  const { state, setState, togglePractice, hydrated } = useAppState();
  const today = todayKey();
  const day = state.practices[today] ?? emptyPractice();
  const week = lastNDates(7);
  const verse = verseOfTheDay();
  const [thanksgiving, setThanksgiving] = useState("");
  const [petition, setPetition] = useState("");
  const [listening, setListening] = useState("");
  const [error, setError] = useState("");

  function keepPrayer() {
    if (![thanksgiving, petition, listening].some((value) => value.trim())) {
      setError("Write at least one line before keeping this prayer.");
      return;
    }
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      thanksgiving: thanksgiving.trim(),
      petition: petition.trim(),
      listening: listening.trim(),
    };
    setState((previous) => ({ ...previous, prayers: [entry, ...previous.prayers] }));
    setThanksgiving("");
    setPetition("");
    setListening("");
    setError("");
  }

  function removePrayer(id: string) {
    setState((previous) => ({ ...previous, prayers: previous.prayers.filter((entry) => entry.id !== id) }));
  }

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <section className="flex max-w-3xl flex-col gap-3">
        <p className="text-sm tracking-[0.18em] text-faith uppercase">Goal 01 · Walk</p>
        <h1 className="font-heading text-4xl leading-[1.05] text-balance sm:text-5xl">Remain in Christ today.</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          These are not points toward salvation. They are simple ways to notice whether your ordinary day is turned toward the One who already saved you.
        </p>
      </section>

      <Card className="overflow-hidden bg-faith text-white ring-0">
        <CardHeader>
          <CardDescription className="text-white/70">{hydrated ? formatLongDate() : "Today"} · {verse.reference}</CardDescription>
          <CardTitle className="font-heading text-3xl leading-snug text-balance">{verse.text}</CardTitle>
        </CardHeader>
      </Card>

      <section>
        <div className="mb-4">
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Today</p>
          <h2 className="font-heading mt-1 text-2xl">Four ordinary ways to remain</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {practices.map((item) => {
            const checked = hydrated ? day[item.kind] : false;
            const Icon = item.icon;
            return (
              <button
                key={item.kind}
                type="button"
                onClick={() => togglePractice(today, item.kind)}
                aria-pressed={checked}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border p-5 text-left transition-colors",
                  checked ? "border-faith/40 bg-faith/5" : "border-border bg-card hover:border-faith/30"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-faith/10 text-faith"><Icon className="size-5" /></span>
                  {checked ? <CheckCircle2 className="size-5 text-faith" /> : <Circle className="size-5 text-muted-foreground" />}
                </div>
                <div>
                  <h3 className="font-heading text-2xl">{item.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>Prayer</CardDescription>
          <CardTitle className="font-heading text-2xl">Keep the conversation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="flex flex-col gap-4">
            <PrayerField id="thanksgiving" label="Thanksgiving" value={thanksgiving} onChange={setThanksgiving} placeholder="What has the Lord already done?" />
            <PrayerField id="petition" label="Petition" value={petition} onChange={setPetition} placeholder="What are you asking for—for you, for others, for the church?" />
            <PrayerField id="listening" label="What you heard" value={listening} onChange={setListening} placeholder="A verse, a conviction, a quiet next step." />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <button type="button" onClick={keepPrayer} className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-faith px-4 text-sm font-medium text-white hover:bg-faith/90">Keep this prayer</button>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium">Recent prayers</p>
            {state.prayers.length === 0 ? (
              <p className="text-sm leading-relaxed text-muted-foreground">Nothing written yet. Start with one mercy you can name out loud.</p>
            ) : (
              <ul className="flex max-h-[34rem] flex-col gap-3 overflow-y-auto pr-1">
                {state.prayers.slice(0, 12).map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-border/80 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-xs tracking-wide text-muted-foreground uppercase">{formatShortDate(entry.createdAt.slice(0, 10))}</p>
                      <button type="button" onClick={() => removePrayer(entry.id)} className="text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline">Remove</button>
                    </div>
                    {entry.thanksgiving ? <PrayerLine label="Thanksgiving" body={entry.thanksgiving} /> : null}
                    {entry.petition ? <PrayerLine label="Petition" body={entry.petition} /> : null}
                    {entry.listening ? <PrayerLine label="Heard" body={entry.listening} /> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>Last seven days</CardDescription>
          <CardTitle className="font-heading text-2xl">Notice the pattern, not a score</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          {practices.map((item) => {
            const count = week.filter((date) => state.practices[date]?.[item.kind]).length;
            return (
              <div key={item.kind} className="rounded-xl border border-border/70 p-4">
                <div className="flex items-baseline justify-between gap-3"><p className="font-medium">{item.label}</p><p className="text-sm text-muted-foreground">{count} of 7</p></div>
                <div className="mt-3 flex gap-1.5">
                  {week.map((date) => <span key={date} title={date} className={cn("h-2 flex-1 rounded-full", state.practices[date]?.[item.kind] ? "bg-faith" : "bg-muted")} />)}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function PrayerField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="flex flex-col gap-2"><Label htmlFor={id}>{label}</Label><Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}

function PrayerLine({ label, body }: { label: string; body: string }) {
  return <p className="mt-1 text-sm leading-relaxed"><span className="font-medium">{label}. </span><span className="text-muted-foreground">{body}</span></p>;
}
