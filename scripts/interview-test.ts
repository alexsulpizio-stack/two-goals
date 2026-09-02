import assert from "node:assert/strict";

import { sprintPlan } from "../src/lib/finance";
import {
  INTERVIEW_QUESTIONS,
  answeredCount,
  deriveCounsel,
  monthlyCapacityFromAnswers,
  namedPeople,
  streamFromAnswers,
} from "../src/lib/interview";
import { defaultFinance } from "../src/lib/types";

assert.equal(INTERVIEW_QUESTIONS.length, 22);
assert.ok(INTERVIEW_QUESTIONS.every((question) => question.prompt.length > 20));

const emptySprint = sprintPlan(defaultFinance);
const empty = deriveCounsel({}, emptySprint);
assert.equal(empty.answered, 0);
assert.equal(empty.nextWeekConfidence, "low");
assert.match(empty.honesty, /steward/i);
assert.match(empty.thisWeek[1]?.title ?? "", /three names/i);
assert.equal(empty.stream.name, "");

assert.deepEqual(namedPeople("Andre at the shop, Maria, and Pastor’s assistant"), [
  "Andre at the shop",
  "Maria",
  "Pastor’s assistant",
]);
assert.equal(namedPeople("my network").length, 0);

const shortFinance = {
  ...defaultFinance,
  netWorth: 100_000,
  monthlyIncome: 8_000,
  monthlyExpenses: 6_000,
  monthlyGiving: 400,
};
const shortSprint = sprintPlan(shortFinance, 12);
assert.ok(shortSprint.extraMonthlySavings > 1000);

const thin = deriveCounsel(
  {
    hoursWeek: "4",
    honestRate: "25",
    namesThisMonth: "Andre",
    smallestOffer: "Saturday clean",
    gift: "cleaning",
  },
  shortSprint
);
assert.equal(thin.dateHonest, false);
assert.equal(thin.dateConfidence, "none");
assert.match(thin.honesty, /not honest/i);
assert.ok((thin.monthlyCapacity ?? 0) < shortSprint.extraMonthlySavings);

const capacity = monthlyCapacityFromAnswers({ hoursWeek: "10", honestRate: "100" });
assert.ok(capacity != null);
assert.equal(Math.round(capacity), Math.round(10 * 100 * (52 / 12)));

const readyAnswers = {
  weekWithJesus: "Word before the phone. Pray for Maria.",
  competing: "Scrolling",
  prayFor: "Maria. Andre.",
  gift: "Bookkeeping for small shops",
  refuse: "I will not skip the gathering or touch giving.",
  tuesday: "Craft in the morning. Table with the family.",
  dependents: "Spouse and two children. Mother’s medicine.",
  floor: "4200",
  givingStay: "yes",
  alreadyPays: "Day job",
  paidSkills: "Books, a remodel, watching children",
  failedTries: "A store with no audience",
  namesThisMonth: "Andre, Maria, the landlord",
  reachWithoutAds: "The church bulletin",
  sellWhere: "in-person",
  hoursWeek: "12",
  honestRate: "150",
  cashRisk: "0",
  energy: "Nights are gone after 9.",
  smallestOffer: "A month of bookkeeping",
  price: "800",
  quit: "If Sundays disappear",
};
assert.equal(answeredCount(readyAnswers), 22);

const far = deriveCounsel(readyAnswers, shortSprint);
assert.equal(far.nextWeekConfidence, "high");
assert.equal(far.dateHonest, false);
assert.equal(far.dateConfidence, "none");
assert.match(far.thisWeek.map((item) => item.title).join(" "), /Andre/);
assert.match(far.stream.ask, /bookkeeping/i);
assert.ok(far.fences.some((line) => /skip the gathering/i.test(line)));

const nearFinance = {
  ...defaultFinance,
  netWorth: 520_000,
  monthlyIncome: 5_000,
  monthlyExpenses: 1_800,
  monthlyGiving: 200,
};
const nearSprint = sprintPlan(nearFinance, 12);
assert.ok(nearSprint.extraMonthlySavings > 0);
assert.ok(nearSprint.extraMonthlySavings < 8_000);
const near = deriveCounsel(readyAnswers, nearSprint);
assert.equal(near.dateHonest, true);
assert.equal(near.dateConfidence, "medium");
assert.match(near.honesty, /invoice|buyer|unproven/i);

const pausedGiving = deriveCounsel({ ...readyAnswers, givingStay: "no" }, shortSprint);
assert.ok(pausedGiving.fences.some((line) => /giving/i.test(line)));

const stream = streamFromAnswers(
  { smallestOffer: "Saturday clients", namesThisMonth: "James", price: "400" },
  2000
);
assert.equal(stream.name, "Saturday clients");
assert.equal(stream.monthly, 2000);
assert.match(stream.ask, /James/);

const onTrackFinance = {
  ...defaultFinance,
  netWorth: 1_000_000,
  monthlyIncome: 10_000,
  monthlyExpenses: 2_000,
  monthlyGiving: 500,
};
const onTrack = deriveCounsel(readyAnswers, sprintPlan(onTrackFinance, 12));
assert.equal(onTrack.extraNeeded, 0);
assert.match(onTrack.honesty, /protection/i);

console.log("interview tests passed");
