"use client";

import { useState } from "react";
import { BookOpen, Church, HeartHandshake, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppState } from "@/hooks/use-app-state";
import { formatLongDate, formatShortDate, lastNDates, todayKey } from "@/lib/dates";
import { verseOfTheDay } from "@/lib/scripture";
import { emptyPractice, type PracticeKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const practices: {
  kind: PracticeKind;
  label: string;
  body: string;
  icon: typeof BookOpen;
}[] = [
  {
    kind: "word",
    label: "Open the Word",
    body: "Read until a verse reads you. The aim is not pages. The aim is to hear the Shepherd.",
    icon: BookOpen,
  },
  {
    kind: "prayer",
    label: "Speak with the Lord",
    body: "Thanksgiving first. Then ask. Then wait. Eternal life is knowing Him, not informing Him.",
    icon: MessageCircle,
  },
  {
    kind: "gathered",
    label: "Gather with the church",
    body: "Word, table, song, and the saints. You were not saved into a private religion.",
    icon: Church,
  },
  {
    kind: "neighbor",
    label: "Love a neighbor",
    body: "A name, a meal, a visit, a gift, a hard conversation. Faith that does not love is not faith.",
    icon: HeartHandshake,
  },
];

export function WalkView() {
  const { state, setState, hydrated, togglePractice } = useAppState();
  const today = todayKey();
  const verse = verseOfTheDay();
  const day = state.practices[today] ?? emptyPractice();
  const week = lastNDates(7);
  const [thanksgiving, setThanksgiving] = useState("");
  const [petition, setPetition] = useState("");
  const [listening, setListening] = useState("");
  const [error, setError] = useState("");

  function savePrayer() {
    if (!thanksgiving.trim() && !petition.trim() && !listening.trim()) {
      setError("Write at least one line before you keep it.");
      return;
    }
    setError("");
    const entry = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      thanksgiving: thanksgiving.trim(),
      petition: petition.trim(),
      listening: listening.trim(),
    };
    setState((previous) => ({
      ...previous,
      prayers: [entry, ...previous.prayers],
    }));
    setThanksgiving("");
    setPetition("");
    setListening("");
  }

  function removePrayer(id: string) {
    setState((previous) => ({
      ...previous,
      prayers: previous.prayers.filter((entry) => entry.id !== id),
    }));
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex max-w-3xl flex-col gap-4">
        <p className="text-sm tracking-[0.18em] text-faith uppercase">Goal 01</p>
        <h1 className="font-heading text-4xl leading-[1.1] text-balance sm:text-5xl">
          Live eternally with your Savior.
        </h1>
        <p className="text-lg leading-relaxed text-muted-foreground text-pretty">
          This is not a ladder into heaven. Eternal life is knowing the Father
          and the Son He sent. You receive it. These practices are how a saved
          person remains in Him.
        </p>
      </section>

      <Card className="overflow-hidden bg-faith text-white ring-0">
        <CardHeader>
          <CardDescription className="text-white/70">
            {hydrated ? formatLongDate() : "Today"} · {verse.reference}
          </CardDescription>
          <CardTitle className="font-heading text-3xl leading-snug text-balance">
            {verse.text}
          </CardTitle>
        </CardHeader>
      </Card>

      <section className="grid gap-4 md:grid-cols-2">
        {practices.map((item) => {
          const Icon = item.icon;
          const checked = hydrated ? day[item.kind] : false;
          return (
            <label
              key={item.kind}
              className={cn(
                "flex cursor-pointer flex-col gap-3 rounded-2xl border bg-card p-5 text-left transition-colors",
                checked
                  ? "border-faith/40 bg-faith/5"
                  : "border-border hover:border-faith/30"
              )}
              onClick={(event) => {
                event.preventDefault();
                togglePractice(today, item.kind);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-faith/10 text-faith">
                  <Icon className="size-5" />
                </span>
                <Checkbox checked={checked} className="pointer-events-none" />
              </div>
              <h2 className="font-heading text-2xl">{item.label}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </label>
          );
        })}
      </section>

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>This week</CardDescription>
          <CardTitle className="font-heading text-2xl">
            Remaining, one ordinary day at a time
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          {practices.map((item) => {
            const count = week.filter(
              (date) => state.practices[date]?.[item.kind]
            ).length;
            return (
              <div key={item.kind} className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{count} of 7</span>
                </div>
                <div className="flex gap-1.5">
                  {week.map((date) => (
                    <span
                      key={date}
                      className={cn(
                        "h-2 flex-1 rounded-full",
                        state.practices[date]?.[item.kind]
                          ? "bg-faith"
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>Prayer journal</CardDescription>
            <CardTitle className="font-heading text-2xl">
              Keep the conversation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="thanksgiving">Thanksgiving</Label>
              <Textarea
                id="thanksgiving"
                value={thanksgiving}
                onChange={(event) => setThanksgiving(event.target.value)}
                placeholder="What has the Lord already done?"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="petition">Petition</Label>
              <Textarea
                id="petition"
                value={petition}
                onChange={(event) => setPetition(event.target.value)}
                placeholder="What are you asking for — for you, for others, for the church?"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="listening">What you heard</Label>
              <Textarea
                id="listening"
                value={listening}
                onChange={(event) => setListening(event.target.value)}
                placeholder="A verse, a conviction, a quiet next step."
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button onClick={savePrayer} size="lg" className="self-start">
              Keep this prayer
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>Recent pages</CardDescription>
            <CardTitle className="font-heading text-2xl">
              {state.prayers.length === 0
                ? "Nothing written yet"
                : `${state.prayers.length} kept`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">
            {!hydrated ? (
              <p className="text-sm text-muted-foreground">Opening the journal…</p>
            ) : state.prayers.length === 0 ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                When you keep a prayer here, it stays on this device. Start with
                one mercy you can name out loud.
              </p>
            ) : (
              <ul className="flex max-h-[34rem] flex-col gap-4 overflow-y-auto pr-1">
                {state.prayers.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-2 rounded-xl border border-border/80 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs tracking-wide text-muted-foreground uppercase">
                        {formatShortDate(entry.createdAt.slice(0, 10))}
                      </p>
                      <button
                        type="button"
                        onClick={() => removePrayer(entry.id)}
                        className="text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    {entry.thanksgiving ? (
                      <PrayerBlock label="Thanksgiving" body={entry.thanksgiving} />
                    ) : null}
                    {entry.petition ? (
                      <PrayerBlock label="Petition" body={entry.petition} />
                    ) : null}
                    {entry.listening ? (
                      <PrayerBlock label="Heard" body={entry.listening} />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function PrayerBlock({ label, body }: { label: string; body: string }) {
  return (
    <p className="text-sm leading-relaxed">
      <span className="font-medium">{label}. </span>
      <span className="text-muted-foreground">{body}</span>
    </p>
  );
}
