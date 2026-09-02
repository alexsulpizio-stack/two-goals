import { formatMoney, type SprintPlan } from "./finance";
import {
  emptyInterview,
  type InterviewAnswers,
  type InterviewState,
} from "./types";

export type { InterviewAnswers, InterviewState };
export { emptyInterview };

export type InterviewField = "text" | "number" | "choice";

export type InterviewChoice = {
  value: string;
  label: string;
};

export type InterviewQuestion = {
  id: string;
  section: string;
  prompt: string;
  hint: string;
  field: InterviewField;
  placeholder?: string;
  choices?: InterviewChoice[];
};

export type ConfidenceLevel = "none" | "low" | "medium" | "high";

export type CounselAction = {
  kicker: string;
  title: string;
  body: string;
};

export type CounselReport = {
  answered: number;
  total: number;
  completeness: number;
  interviewConfidence: "high";
  nextWeekConfidence: ConfidenceLevel;
  dateConfidence: ConfidenceLevel;
  dateHonest: boolean;
  honesty: string;
  weeklyAsk: number;
  monthlyCapacity: number | null;
  extraNeeded: number;
  stream: { name: string; monthly: number; ask: string };
  thisWeek: CounselAction[];
  walkActions: CounselAction[];
  moneyActions: CounselAction[];
  fences: string[];
};

export const INTERVIEW_INTRO = {
  kicker: "Counsel",
  title: "Sit still long enough to be asked the real questions.",
  body: "I will interview you about the walk, the life you mean to fund, what already pays, who can say yes this month, the hours you actually have, and the smallest offer you can make in fourteen days. Answers stay on this device. The output is this week’s actions, not a personality type.",
};

export const CONFIDENCE_COPY = {
  interview: {
    level: "High" as const,
    body: "I can ask the categories that actually change the plan. If you answer them, the next page will not be a guess at your character. It will be a short list of work.",
  },
  nextWeek: {
    level: "Medium" as const,
    body: "After you answer, I can be reasonably sure about what to do this week: who to ask, what to offer, and how large the ask must be. That still depends on you telling the truth about hours, names, and what you refuse.",
  },
  date: {
    level: "Low" as const,
    body: "I cannot know that you will be independent on this date until a buyer says yes. I will not invent a product for a market I cannot see. If your honest hours × a rate you could get this month cannot cover the gap, I will say the date is not honest rather than dress it up.",
  },
};

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "weekWithJesus",
    section: "The walk",
    prompt:
      "In one sentence, what does remaining in Christ look like for you this week?",
    hint: "Not a theology exam. A Tuesday. Word, prayer, the saints, a neighbor — what would actually happen.",
    field: "text",
    placeholder: "Open Matthew before the phone. Pray for James by name. Sit in the gathered church on Sunday.",
  },
  {
    id: "competing",
    section: "The walk",
    prompt: "What is currently competing with that walk?",
    hint: "Name the thing that wins the first hour of the day when you are tired. Money panic counts. So does numbness.",
    field: "text",
    placeholder: "Scrolling. Overtime that never ends. A secret. Worry about the date.",
  },
  {
    id: "prayFor",
    section: "The walk",
    prompt: "Who do you already pray for by name?",
    hint: "Household, church, the person you will ask for work. Names, not categories.",
    field: "text",
    placeholder: "Maria. Dad. The small group. The client I have not called.",
  },
  {
    id: "gift",
    section: "The walk",
    prompt:
      "What gift has God given you that other people already pay for, or would?",
    hint: "A skill that has already been trusted. Not a fantasy business. What would a neighbor actually hand you money for.",
    field: "text",
    placeholder: "Finish their books. Teach the instrument. Fix the house. Write the letter. Run the kitchen.",
  },
  {
    id: "refuse",
    section: "The walk",
    prompt:
      "What would you refuse to do for money, even if it would hit the date?",
    hint: "This is a fence, not a mood. Work that would shame Christ, harm the people who depend on you, or swallow the Sabbath.",
    field: "text",
    placeholder: "I will not lie to close. I will not skip the gathering. I will not touch giving to manufacture a surplus.",
  },
  {
    id: "tuesday",
    section: "The life to fund",
    prompt:
      "Describe a normal Tuesday in the independent life you want the nest egg to fund.",
    hint: "The FI number is only as honest as this picture. If the Tuesday is a mansion you do not need, the sprint is sized wrong.",
    field: "text",
    placeholder: "Work a craft in the morning. Table with the family. Give. Walk. No landlord, no boss who owns the hours.",
  },
  {
    id: "dependents",
    section: "The life to fund",
    prompt: "Who depends on you financially, and what must not break?",
    hint: "Rent, medicine, a parent, a child’s school. The sprint cannot eat these to look on track.",
    field: "text",
    placeholder: "Spouse and two children. Mother’s medicine. The tithe. The lease until June.",
  },
  {
    id: "floor",
    section: "The life to fund",
    prompt:
      "What monthly number must the household cover — rent, food, insurance — not the FI nest egg?",
    hint: "The floor. If Steward’s living number is a wish, put the real floor here so the counsel can catch it.",
    field: "number",
    placeholder: "4200",
  },
  {
    id: "givingStay",
    section: "The life to fund",
    prompt: "Does monthly giving stay in the target while you sprint?",
    hint: "Giving is part of the life you fund. Cutting it to hit a date makes a poorer independence.",
    field: "choice",
    choices: [
      { value: "yes", label: "Yes. Giving stays." },
      { value: "unsure", label: "I need to name an amount I can keep." },
      { value: "no", label: "No. I was going to pause it." },
    ],
  },
  {
    id: "alreadyPays",
    section: "What already pays",
    prompt: "What is already paying you?",
    hint: "Job, shifts, clients, rent, pension, a shop. Name them. Empty means the sprint is starting from zero, which is allowed, and harder.",
    field: "text",
    placeholder: "Day job on payroll. Two Saturday clients. A room that is not rented yet.",
  },
  {
    id: "paidSkills",
    section: "What already pays",
    prompt: "What have people paid you for in the last five years?",
    hint: "Receipts, not a LinkedIn summary. If they paid once, they might pay again if you ask.",
    field: "text",
    placeholder: "Bookkeeping. Framing a house. A course. Selling a used truck. Watching children.",
  },
  {
    id: "failedTries",
    section: "What already pays",
    prompt: "What have you already tried that failed, and what did you learn?",
    hint: "So the plan does not send you back into a hole you already know.",
    field: "text",
    placeholder: "A dropshipping store with no audience. Overtime that wrecked Sundays. A partner who did not pay.",
  },
  {
    id: "namesThisMonth",
    section: "Who can say yes",
    prompt:
      "Who already knows your work and could say yes this month? Names, not “my network.”",
    hint: "If you cannot name three people, do not design a product yet. The first work is names.",
    field: "text",
    placeholder: "Andre at the shop. Pastor’s assistant. The family I remodeled for. My sister’s landlord.",
  },
  {
    id: "reachWithoutAds",
    section: "Who can say yes",
    prompt:
      "What congregation, list, trade, shop floor, or street can you reach without buying ads?",
    hint: "Ads are a later tool. This month you need a room of people who already trust you.",
    field: "text",
    placeholder: "The church bulletin. The union hall. A 40-person email list. The Saturday market.",
  },
  {
    id: "sellWhere",
    section: "Who can say yes",
    prompt: "Can you sell in person this month, only online, or both?",
    hint: "In-person is usually faster for a first yes. Online is slower unless you already have a list.",
    field: "choice",
    choices: [
      { value: "in-person", label: "In person this month" },
      { value: "online", label: "Only online" },
      { value: "both", label: "Both" },
    ],
  },
  {
    id: "hoursWeek",
    section: "Time and limits",
    prompt:
      "How many hours per week can you honestly put toward creating income without wrecking the walk or the people who depend on you?",
    hint: "Not the hours you wish you had. After sleep, gathered worship, and the household.",
    field: "number",
    placeholder: "8",
  },
  {
    id: "honestRate",
    section: "Time and limits",
    prompt:
      "If you billed those hours at a rate you could actually get this month, what is that hourly rate?",
    hint: "A rate a named person would pay, not a rate from a thread. If you sell a product, estimate the hours behind the first month of revenue.",
    field: "number",
    placeholder: "75",
  },
  {
    id: "cashRisk",
    section: "Time and limits",
    prompt:
      "How much cash can you put at risk this month without touching giving or the household floor?",
    hint: "Zero is an honest answer. Then the offer must be time and skill, not a store you have to stock.",
    field: "number",
    placeholder: "0",
  },
  {
    id: "energy",
    section: "Time and limits",
    prompt: "What health, family, or schedule limits are real this month?",
    hint: "A newborn, a night shift, a diagnosis, a court date. The plan has to fit inside these, or it is theater.",
    field: "text",
    placeholder: "Nights are gone after 9. Thursday is clinic. I cannot travel.",
  },
  {
    id: "smallestOffer",
    section: "The smallest offer",
    prompt:
      "What is the smallest offer you could make in fourteen days — a named thing a named person would pay for?",
    hint: "Small enough to finish. Specific enough to invoice. Not a brand.",
    field: "text",
    placeholder: "A Saturday deep-clean. Two coaching calls. A framed wall. A month of bookkeeping.",
  },
  {
    id: "price",
    section: "The smallest offer",
    prompt: "What would you charge for that first offer?",
    hint: "Say a number you can say out loud this week. Too low is a problem you can raise after the first yes.",
    field: "number",
    placeholder: "400",
  },
  {
    id: "quit",
    section: "The smallest offer",
    prompt: "What would make you quit this sprint?",
    hint: "Name it now so a hard week is not a surprise. Then decide whether that reason is allowed to win.",
    field: "text",
    placeholder: "If the first three people say no. If Sundays disappear. If I start lying to close.",
  },
];

const REQUIRED_FOR_WEEK = [
  "namesThisMonth",
  "smallestOffer",
  "hoursWeek",
  "honestRate",
  "gift",
] as const;

export function asInterview(value: unknown): InterviewState {
  const empty = emptyInterview();
  if (!value || typeof value !== "object") return empty;
  const row = value as Partial<InterviewState>;
  const step = Number(row.step);
  const answers: InterviewAnswers = {};
  if (row.answers && typeof row.answers === "object") {
    for (const question of INTERVIEW_QUESTIONS) {
      const raw = (row.answers as InterviewAnswers)[question.id];
      if (typeof raw === "string") {
        answers[question.id] = raw.slice(0, 2000);
      }
    }
  }
  return {
    step: Number.isFinite(step) ? Math.trunc(step) : empty.step,
    answers,
    completedAt:
      typeof row.completedAt === "string" && row.completedAt
        ? row.completedAt
        : null,
  };
}

export function clampInterviewStep(step: number): number {
  if (step < -1) return -1;
  if (step > INTERVIEW_QUESTIONS.length) return INTERVIEW_QUESTIONS.length;
  return Math.trunc(step);
}

export function interviewComplete(interview: InterviewState): boolean {
  return Boolean(interview.completedAt) || interview.step >= INTERVIEW_QUESTIONS.length;
}

export function parseAnswerNumber(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function firstLine(raw: string | undefined, max = 80): string {
  const line = (raw ?? "").split(/\n/)[0]?.trim() ?? "";
  return line.slice(0, max);
}

export function namedPeople(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\n;,]+|\s+and\s+|\s+&\s+/i)
    .map((part) => part.replace(/^[\s•\-]+/, "").trim())
    .filter((part) => part.length > 1 && !/^my network$/i.test(part))
    .slice(0, 8);
}

export function monthlyCapacityFromAnswers(
  answers: InterviewAnswers
): number | null {
  const hours = parseAnswerNumber(answers.hoursWeek);
  const rate = parseAnswerNumber(answers.honestRate);
  if (hours <= 0 || rate <= 0) return null;
  return hours * rate * (52 / 12);
}

export function answeredCount(answers: InterviewAnswers): number {
  return INTERVIEW_QUESTIONS.filter((question) => {
    const value = answers[question.id]?.trim() ?? "";
    return value.length > 0;
  }).length;
}

function confidenceAfterAnswers(
  answers: InterviewAnswers,
  extraNeeded: number,
  dateHonest: boolean,
  capacity: number | null,
  hasFinishLine: boolean
): { nextWeek: ConfidenceLevel; date: ConfidenceLevel } {
  const filled = answeredCount(answers);
  const completeness = filled / INTERVIEW_QUESTIONS.length;
  const hasNames = namedPeople(answers.namesThisMonth).length > 0;
  const hasOffer = Boolean(answers.smallestOffer?.trim());
  const hasHours = parseAnswerNumber(answers.hoursWeek) > 0;
  const hasRate = parseAnswerNumber(answers.honestRate) > 0;

  let nextWeek: ConfidenceLevel = "low";
  if (
    completeness >= 0.8 &&
    hasNames &&
    hasOffer &&
    hasHours &&
    hasRate
  ) {
    nextWeek = "high";
  } else if (completeness >= 0.45 && (hasNames || hasOffer)) {
    nextWeek = "medium";
  }

  if (extraNeeded <= 0) {
    return {
      nextWeek,
      date: hasFinishLine && dateHonest ? "medium" : "none",
    };
  }

  if (!dateHonest) {
    return { nextWeek, date: "none" };
  }

  if (
    capacity != null &&
    capacity >= extraNeeded * 0.8 &&
    hasNames &&
    hasOffer
  ) {
    return { nextWeek, date: "medium" };
  }

  return { nextWeek, date: "low" };
}

function honestyCopy({
  extraNeeded,
  capacity,
  hours,
  rate,
  dateHonest,
  hasFinishLine,
}: {
  extraNeeded: number;
  capacity: number | null;
  hours: number;
  rate: number;
  dateHonest: boolean;
  hasFinishLine: boolean;
}): string {
  if (!hasFinishLine) {
    return "Enter living and giving on Steward so a nest egg exists. Then hours × a rate you could get this month can be tested against a real gap. I will not invent a finish line.";
  }
  if (extraNeeded <= 0) {
    return "The ledger already reaches the date if you do not inflate living. Counsel here is protection and overflow, not a rescue stream.";
  }
  if (hours <= 0 || rate <= 0) {
    return "I cannot tell whether the date is honest until you name hours you actually have and a rate a named person would pay this month.";
  }
  if (!dateHonest && capacity != null) {
    return `At ${hours} hours a week × ${formatMoney(rate)} an hour you can create about ${formatMoney(capacity)} a month. The sprint still needs ${formatMoney(extraNeeded)} in new take-home. That date is not honest unless you raise the rate, add hours without wrecking the walk, or move the window.`;
  }
  if (capacity != null) {
    return `Hours × rate can cover about ${formatMoney(capacity)} a month against a gap of ${formatMoney(extraNeeded)}. That is mathematically possible. It is not a yes from a buyer. The date stays unproven until the first invoice clears.`;
  }
  return "Name hours and a rate so the date can be tested against capacity.";
}

export function streamFromAnswers(
  answers: InterviewAnswers,
  extraNeeded: number
): { name: string; monthly: number; ask: string } {
  const offer = firstLine(answers.smallestOffer, 80);
  const gift = firstLine(answers.gift, 80);
  const skill = firstLine(answers.paidSkills, 80);
  const name = offer || gift || skill || "";
  const price = parseAnswerNumber(answers.price);
  const monthly =
    extraNeeded > 0 ? Math.round(extraNeeded) : price > 0 ? price : 0;
  const people = namedPeople(answers.namesThisMonth);
  const who =
    people.length > 0
      ? people.slice(0, 3).join(", ")
      : "three people who already know this work";
  const priceBit =
    price > 0 ? ` at ${formatMoney(price)}` : extraNeeded > 0 ? ` sized to ${formatMoney(monthly)} a month` : "";
  const offerBit = offer || name || "the smallest finished offer";
  const ask = name
    ? `This week ask ${who} to buy ${offerBit}${priceBit}.`
    : `Write three names, then ask them to buy the smallest finished offer${priceBit}.`;
  return { name, monthly, ask };
}

export function deriveCounsel(
  answers: InterviewAnswers,
  sprint: Pick<SprintPlan, "extraMonthlySavings" | "onTrack" | "reached">
): CounselReport {
  const extraNeeded = Math.max(0, sprint.extraMonthlySavings ?? 0);
  const hasFinishLine = Boolean(sprint.reached || sprint.onTrack || extraNeeded > 0);
  const hours = parseAnswerNumber(answers.hoursWeek);
  const rate = parseAnswerNumber(answers.honestRate);
  const capacity = monthlyCapacityFromAnswers(answers);
  const dateHonest =
    !hasFinishLine
      ? false
      : extraNeeded <= 0 ||
        (capacity != null && capacity >= extraNeeded * 0.8);
  const filled = answeredCount(answers);
  const { nextWeek, date } = confidenceAfterAnswers(
    answers,
    extraNeeded,
    dateHonest,
    capacity,
    hasFinishLine
  );
  const stream = streamFromAnswers(answers, extraNeeded);
  const weeklyAsk =
    extraNeeded > 0 ? Math.round(extraNeeded / (52 / 12)) : parseAnswerNumber(answers.price);
  const people = namedPeople(answers.namesThisMonth);
  const fences: string[] = [];
  if (answers.refuse?.trim()) {
    fences.push(answers.refuse.trim());
  }
  if (answers.givingStay === "no") {
    fences.push(
      "Do not pause giving to manufacture a surplus. Lower the giving line on Steward if it will not stay, so the nest egg is honest — or keep giving and create the income."
    );
  }
  if (answers.quit?.trim()) {
    fences.push(`You said you would quit if: ${answers.quit.trim()}`);
  }

  const thisWeek: CounselAction[] = [];
  const competing = answers.competing?.trim();
  if (competing) {
    thisWeek.push({
      kicker: "Before the ask",
      title: "Put the walk before the competitor",
      body: `You named what wins the first hour: ${firstLine(competing, 160)}. Open the Word and pray before that thing gets the morning. The sprint is not allowed to eat Goal 01.`,
    });
  } else {
    thisWeek.push({
      kicker: "Before the ask",
      title: "Remain, then work",
      body: answers.weekWithJesus?.trim()
        ? answers.weekWithJesus.trim()
        : "Open the Word. Pray. Gather with the church. Love a neighbor. Then make the income ask. Order is not a slogan here.",
    });
  }

  if (people.length === 0) {
    thisWeek.push({
      kicker: "This week",
      title: "Write three names before you invent a product",
      body: "I will not name a winning offer for a market I cannot see. People who already know your work are the market you can reach this month. No names, no ask.",
    });
  } else {
    thisWeek.push({
      kicker: "This week",
      title: `Ask ${people.slice(0, 3).join(", ")}`,
      body: stream.ask,
    });
  }

  if (answers.smallestOffer?.trim()) {
    const price = parseAnswerNumber(answers.price);
    thisWeek.push({
      kicker: "The offer",
      title: firstLine(answers.smallestOffer, 80),
      body:
        price > 0
          ? `Charge ${formatMoney(price)}. Finish it in fourteen days. Put the first dollar on the Steward ledger when it arrives.`
          : "Name a price you can say out loud, then finish the work in fourteen days. A free sample is not a stream.",
    });
  } else if (answers.gift?.trim() || answers.paidSkills?.trim()) {
    thisWeek.push({
      kicker: "The offer",
      title: "Shrink the gift to a fourteen-day job",
      body: `You already have something people pay for: ${firstLine(answers.gift || answers.paidSkills, 120)}. Turn it into one named job with a date and a price. Do not start a brand.`,
    });
  }

  if (extraNeeded > 0) {
    thisWeek.push({
      kicker: "The size",
      title:
        weeklyAsk > 0
          ? `This week must aim at ${formatMoney(weeklyAsk)}`
          : "Size the week to the gap on Steward",
      body:
        capacity != null
          ? `The month still needs ${formatMoney(extraNeeded)} in new take-home. Your hours × rate cover about ${formatMoney(capacity)} a month. ${dateHonest ? "The arithmetic can work." : "The arithmetic does not work yet."}`
          : `Steward still needs ${formatMoney(extraNeeded)} a month in new take-home. Name hours and a rate so this number can be tested.`,
    });
  }

  const walkActions: CounselAction[] = [
    {
      kicker: "Goal 01",
      title: "Live eternally with Jesus Christ",
      body: answers.weekWithJesus?.trim()
        ? answers.weekWithJesus.trim()
        : "Abide: Word, prayer, the gathered church, love of neighbor. Salvation is a gift. These are how a saved person remains.",
    },
  ];
  if (answers.prayFor?.trim()) {
    walkActions.push({
      kicker: "Pray",
      title: "By name",
      body: answers.prayFor.trim(),
    });
  }
  if (answers.energy?.trim()) {
    walkActions.push({
      kicker: "Limits",
      title: "The week has a body",
      body: answers.energy.trim(),
    });
  }

  const moneyActions: CounselAction[] = [];
  if (stream.name) {
    moneyActions.push({
      kicker: "Goal 02",
      title: stream.name,
      body: stream.ask,
    });
  } else {
    moneyActions.push({
      kicker: "Goal 02",
      title: extraNeeded > 0 ? `Create ${formatMoney(extraNeeded)} a month` : "Name the stream on Steward",
      body: "Counsel cannot pick the product until you name an offer and three people. The gap is on Steward. The work is the ask.",
    });
  }
  if (answers.failedTries?.trim()) {
    moneyActions.push({
      kicker: "Do not repeat",
      title: "You already learned this",
      body: answers.failedTries.trim(),
    });
  }
  if (answers.reachWithoutAds?.trim()) {
    moneyActions.push({
      kicker: "Reach",
      title: "Without ads this month",
      body: answers.reachWithoutAds.trim(),
    });
  }
  const cash = parseAnswerNumber(answers.cashRisk);
  if (answers.cashRisk?.trim()) {
    moneyActions.push({
      kicker: "Cash at risk",
      title: cash > 0 ? formatMoney(cash) : "None",
      body:
        cash > 0
          ? "Spend that on making the fourteen-day offer real. Not on a logo. Not on ads."
          : "Zero cash at risk means the offer is time and skill. Do not stock a store you cannot fill.",
    });
  }

  const floor = parseAnswerNumber(answers.floor);
  if (floor > 0) {
    moneyActions.push({
      kicker: "Household floor",
      title: formatMoney(floor) + " a month must not break",
      body: answers.dependents?.trim()
        ? answers.dependents.trim()
        : "If Steward’s living number is lower than this floor, the ledger is lying. Raise living to the floor, then create income.",
    });
  } else if (answers.dependents?.trim()) {
    moneyActions.push({
      kicker: "Must not break",
      title: "People first",
      body: answers.dependents.trim(),
    });
  }

  if (answers.tuesday?.trim()) {
    moneyActions.push({
      kicker: "The life",
      title: "A Tuesday you are actually funding",
      body: answers.tuesday.trim(),
    });
  }

  if (answers.alreadyPays?.trim()) {
    moneyActions.push({
      kicker: "Already paying",
      title: "Do not ignore what exists",
      body: answers.alreadyPays.trim(),
    });
  }

  if (answers.sellWhere === "online") {
    moneyActions.push({
      kicker: "Channel",
      title: "Online only is slower",
      body: "A first yes this month usually comes from a person you can stand in front of. If you cannot, then the list in “reach without ads” has to do that work. Do not buy traffic yet.",
    });
  }

  return {
    answered: filled,
    total: INTERVIEW_QUESTIONS.length,
    completeness: filled / INTERVIEW_QUESTIONS.length,
    interviewConfidence: "high",
    nextWeekConfidence: nextWeek,
    dateConfidence: date,
    dateHonest,
    honesty: honestyCopy({ extraNeeded, capacity, hours, rate, dateHonest, hasFinishLine }),
    weeklyAsk,
    monthlyCapacity: capacity,
    extraNeeded,
    stream,
    thisWeek,
    walkActions,
    moneyActions,
    fences,
  };
}

export function requiredGaps(answers: InterviewAnswers): string[] {
  return REQUIRED_FOR_WEEK.filter((id) => !answers[id]?.trim()).map((id) => {
    const question = INTERVIEW_QUESTIONS.find((item) => item.id === id);
    return question?.prompt ?? id;
  });
}
