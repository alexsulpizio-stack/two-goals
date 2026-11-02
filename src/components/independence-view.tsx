"use client";

import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppState } from "@/hooks/use-app-state";
import {
  claimAgeLabel,
  formatModelMoney,
  marketCaseLabel,
  runRetirementEngine,
  strategyLabel,
  type EngineStatus,
  type ScenarioSummary,
} from "@/lib/retirement-engine";
import type { ClaimAge, MarketCase, RetirementEngineInputs, RetirementStrategy } from "@/lib/types";

const retirementAges = [55, 56, 57, 58, 59, 60];
const claimAges: ClaimAge[] = [62, 67, 70];

function numeric(raw: string) {
  const value = Number(raw.replace(/[$,%]/g, ""));
  return Number.isFinite(value) ? value : 0;
}
function percent(value: number) {
  return `${Math.round(value * 1000) / 10}%`;
}

function statusTone(status: EngineStatus) {
  if (status === "GREEN") return "border-emerald-300 bg-emerald-50 text-emerald-900";
  if (status === "YELLOW") return "border-amber-300 bg-amber-50 text-amber-950";
  if (status === "RED") return "border-red-300 bg-red-50 text-red-950";
  return "border-slate-300 bg-slate-50 text-slate-900";
}

function balanceText(amount: number | null) {
  return amount === null ? "Not modeled" : formatModelMoney(amount);
}

function gapText(amount: number) {
  return amount > 1 ? formatModelMoney(amount) : "None";
}

function strategyOptions(): Array<{ value: RetirementStrategy; label: string }> {
  return [
    { value: "full", label: "A · Full retirement" },
    { value: "bridge", label: "B · Healthcare bridge job" },
    { value: "contract", label: "C · Contract work" },
    { value: "stress", label: "D · Combined stress" },
    { value: "age60", label: "E · Age 60 fallback" },
  ];
}

export function IndependenceView() {
  const { state, setState } = useAppState();
  const input = state.retirementEngine;
  const result = useMemo(() => runRetirementEngine(input), [input]);
  const selected = result.selected;
  const selectedAge = selected.retirementAge;

  function updateInput(patch: Partial<RetirementEngineInputs>) {
    setState((previous) => ({
      ...previous,
      retirementEngine: { ...previous.retirementEngine, ...patch },
    }));
  }

  function updateSocialSecurity(person: "alex" | "darlene", age: ClaimAge, value: number) {
    updateInput({
      [person === "alex" ? "alexSocialSecurity" : "darleneSocialSecurity"]: {
        ...(person === "alex" ? input.alexSocialSecurity : input.darleneSocialSecurity),
        [age]: value,
      },
    });
  }

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <section className="flex max-w-4xl flex-col gap-3">
        <p className="text-sm tracking-[0.18em] text-steward uppercase">Goal 02 · Retirement decision engine</p>
        <h1 className="font-heading text-4xl leading-[1.05] text-balance sm:text-5xl">Which path holds up?</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Compare leaving full-time work at ages 55 through 60. The core case does not require a bridge job, contract income, or a project that does not exist yet.
        </p>
      </section>

      <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950" aria-label="Planning limitations">
        <p className="font-semibold">{input.isExample ? "INCLUDES EXAMPLE DATA — not a complete personal forecast" : "Saved assumptions · provisional planning, not verified retirement readiness"}</p>
        {input.isExample ? <p className="mt-2 leading-relaxed">Fresh starter values are fictional examples, not household records. Incomplete saved plans may also contain example-filled fields; values that were supplied are preserved. Enter or restore your own verified assumptions before using results for a personal decision.</p> : null}
        <p className="mt-2 leading-relaxed">Balances, spending, benefit estimates, and healthcare placeholders need current evidence. The model pools assets and applies a simplified withdrawal tax rate; it does not establish account access, ACA eligibility, or cash available to spend. Healthcare may overlap spending already included in the historical run rate.</p>
        <p className="mt-2 leading-relaxed">For older saved plans without price-base controls, living and healthcare price years initially use that plan’s as-of year. This is a provisional migration basis: confirm the two price years against the source amounts before relying on results.</p>
        {input.retirementAge !== 59 || input.targetPlanningAge !== 90 ? (
          <div className="mt-4 flex flex-col items-start gap-3 border-t border-amber-300 pt-4">
            <p>Your saved timing has been retained. Results use the timing shown below, not the approved retirement-age-59 / main-age-90 plan. Changing timing here leaves financial amounts and other assumptions untouched. The selected strategy is unchanged; Age 60 fallback still overrides the exit age to 60.</p>
            <Button variant="outline" onClick={() => updateInput({ retirementAge: 59, targetPlanningAge: 90 })}>Use approved timing: retire 59 / plan through 90</Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl bg-steward p-5 text-white sm:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs tracking-[0.2em] text-white/70 uppercase">Active decision</p>
              <h2 className="font-heading mt-2 text-3xl leading-tight sm:text-4xl">
                {strategyLabel(input.selectedStrategy)} at age {selectedAge}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">
                {input.selectedStrategy === "stress" ? "Combined sequence stress" : marketCaseLabel(input.selectedMarketCase)} assumptions · main plan through age {selected.targetPlanningAge} · separate long-life model through age {selected.maximumPlanningAge}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[34rem]">
              <SelectField
                id="engine-strategy"
                label="Strategy"
                value={input.selectedStrategy}
                onChange={(value) => updateInput({ selectedStrategy: value as RetirementStrategy })}
                options={strategyOptions().map((option) => ({ value: option.value, label: option.label }))}
                dark
              />
              <SelectField
                id="engine-market-case"
                label="Market case"
                value={input.selectedMarketCase}
                onChange={(value) => updateInput({ selectedMarketCase: value as MarketCase })}
                options={[
                  { value: "base", label: "Base" },
                  { value: "conservative", label: "Conservative" },
                  { value: "sequence", label: "Sequence stress" },
                ]}
                dark
              />
              <SelectField
                id="engine-retirement-age"
                label="Leave full-time at"
                value={String(input.retirementAge)}
                onChange={(value) => updateInput({ retirementAge: Number(value) })}
                options={retirementAges.map((age) => ({ value: String(age), label: `Age ${age}` }))}
                dark
              />
            </div>
          </div>

          {input.selectedStrategy === "age60" ? <p className="text-sm text-white/80">Age 60 fallback uses age 60 regardless of the saved leave-full-time age. The saved age is retained for the other strategies.</p> : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroMetric label="Status" value={selected.status} />
            <HeroMetric label={`Age ${selected.targetPlanningAge} aggregate assets`} value={formatModelMoney(selected.endingBalanceAtTarget)} />
            <HeroMetric label={`Maximum annual gap through ${selected.targetPlanningAge}`} value={gapText(selected.maximumUnfundedGap)} />
            <HeroMetric label="First-year healthcare" value={formatModelMoney(selected.firstYearHealthcare)} />
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
            <p className="text-xs tracking-[0.18em] text-white/70 uppercase">Decision readout</p>
            <p className="font-heading mt-2 text-2xl leading-tight">{selected.interpretation}</p>
            <p className="mt-2 text-sm leading-relaxed text-white/80">
              The 25% of starting-assets margin is a retained model heuristic, not a validated financial standard or a segregated liquid reserve. Main-plan status does not establish that the later-life years are funded.
            </p>
            {selected.warnings.length ? <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/90">{selected.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
          </div>
        </div>
      </section>

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>Separate long-life checks · not part of the main-plan status</CardDescription>
          <CardTitle className="font-heading text-2xl">What happens beyond age {selected.targetPlanningAge}?</CardTitle>
          <p className="text-sm leading-relaxed text-muted-foreground">Annual cash flows continue through the long-life model extent. These aggregate balances are not a measure of immediately accessible cash.</p>
        </CardHeader>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <MiniMetric label="Age 95 aggregate assets" value={balanceText(selected.endingBalanceAt95)} />
          <MiniMetric label="Age 100 aggregate assets" value={balanceText(selected.endingBalanceAt100)} />
          <MiniMetric label={`First gap after age ${selected.targetPlanningAge}`} value={selected.maximumPlanningAge <= selected.targetPlanningAge ? "No later modeled years" : selected.firstUnfundedAgeAfterTarget === null ? "None in modeled tail" : `Age ${selected.firstUnfundedAgeAfterTarget} / ${selected.firstUnfundedYearAfterTarget}`} />
          <MiniMetric label={`Maximum annual gap through age ${selected.maximumPlanningAge}`} value={gapText(selected.fullHorizonMaximumUnfundedGap)} />
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Starting core assets" value={formatModelMoney(selected.startingAssets)} note={`Projected to the selected retirement year, age ${selectedAge}.`} />
        <SummaryCard label="First-year cash need" value={formatModelMoney(selected.firstYearLivingPlusMortgage + selected.firstYearHealthcare)} note="Living, mortgage, and healthcare before Social Security or earned income." />
        <SummaryCard label="First-year required gross withdrawal" value={formatModelMoney(selected.firstYearGrossWithdrawal)} note="Required funding after income, not necessarily an available distribution. Taxes use the same required amount." />
        <SummaryCard label="Bridge-job value" value={formatModelMoney(result.bridgeEffectiveAnnualValue)} note="Net wages plus ACA cost avoided, less job coverage and work costs." />
      </section>

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>Retirement age comparison</CardDescription>
          <CardTitle className="font-heading text-2xl">How much does one more year buy?</CardTitle>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            This table keeps the active strategy and market case constant while moving the full-time exit age from 55 to 60.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <ComparisonTable rows={result.ageComparison} selectedAge={selectedAge} />
        </CardContent>
      </Card>

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>Strategy comparison · age {selectedAge}</CardDescription>
          <CardTitle className="font-heading text-2xl">What changes if healthcare or income changes?</CardTitle>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">A, B, and C use base market assumptions for comparability. D is a combined sequence, inflation, tax, healthcare, support, and one-time-expense stress—not an isolated market shock.</p>
        </CardHeader>
        <CardContent className="pt-5">
          <ComparisonTable rows={result.strategyComparison} selectedStrategy={input.selectedStrategy} />
        </CardContent>
      </Card>

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>First retirement year</CardDescription>
          <CardTitle className="font-heading text-2xl">What the selected path has to carry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 pt-5 lg:grid-cols-2">
          <div className="divide-y rounded-2xl border">
            <DetailRow label="Living expenses plus mortgage" value={formatModelMoney(selected.firstYearLivingPlusMortgage)} />
            <DetailRow label="Healthcare" value={formatModelMoney(selected.firstYearHealthcare)} />
            <DetailRow label="Alex Social Security" value={formatModelMoney(selected.projection[0]?.alexSocialSecurity ?? 0)} />
            <DetailRow label="Darlene Social Security" value={formatModelMoney(selected.projection[0]?.darleneSocialSecurity ?? 0)} />
            <DetailRow label="Net earned, contract, or project income" value={formatModelMoney(selected.firstYearEarnedIncome)} />
            <DetailRow label="Required gross withdrawal" value={formatModelMoney(selected.firstYearGrossWithdrawal)} emphasis />
          </div>
          <div className="rounded-2xl border border-faith/25 bg-faith/5 p-5">
            <p className="text-xs tracking-[0.18em] text-faith uppercase">The healthcare transition</p>
            <p className="font-heading mt-2 text-2xl leading-tight">Healthcare is modeled as a phase change, not a flat guess.</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The model uses family ACA cost before Darlene reaches Medicare, Alex-only pre-Medicare cost plus Darlene’s Medicare cost during the transition, and combined Medicare cost afterward. A bridge job replaces the ACA family cost while its coverage is active.
            </p>
            <div className="mt-4 grid gap-2 text-sm">
              <DetailRow label="Family ACA estimate" value={formatModelMoney(result.acaFamilyTotal)} />
              <DetailRow label="Alex pre-Medicare estimate" value={formatModelMoney(result.alexPreMedicareCost)} />
              <DetailRow label="Combined Medicare estimate" value={formatModelMoney(result.combinedMedicareCost)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/80">
        <CardHeader className="border-b">
          <CardDescription>Stress tests · age {selectedAge}</CardDescription>
          <CardTitle className="font-heading text-2xl">What could break the base case?</CardTitle>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Healthcare, inflation, expense, and support tests change the stated input. Combined D stress combines sequence returns, inflation, tax, healthcare, expense, and support assumptions. Positive support with an unknown end year is NOT TESTED, not an assumed zero-cost success.
          </p>
        </CardHeader>
        <CardContent className="pt-5">
          <StressTable tests={result.stressTests} />
          <p className="mt-4 text-sm text-muted-foreground">Highest tested family healthcare baseline with no main-horizon gap: {result.healthcareTolerance === null ? "None of the tested cases passes, or inputs are incomplete." : `${formatModelMoney(result.healthcareTolerance)} in healthcare-base-year dollars.`} This is a discrete sensitivity check, not a quote or a spending ceiling.</p>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-5">
        <div className="max-w-3xl">
          <p className="text-sm tracking-[0.18em] text-steward uppercase">Editable assumptions</p>
          <h2 className="font-heading mt-2 text-3xl leading-tight">Make the decision engine yours.</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            These are the saved planning inputs, not automatically refreshed financial evidence. Change them as account values, healthcare quotes, Social Security statements, or a real bridge-job offer become available. Changes save automatically in Two Goals.
          </p>
        </div>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>1 · Household and timing</CardDescription>
            <CardTitle className="font-heading text-2xl">When and with what starting resources?</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField id="engine-core-assets" label="Current core investment assets" hint="Retirement, taxable, HSA, and other assets counted in the core model." value={input.coreAssets} onChange={(value) => updateInput({ coreAssets: value })} />
            <NumberField id="engine-annual-saving" label="Annual retirement and HSA saving" hint="Saving expected before the selected retirement year." value={input.annualSaving} onChange={(value) => updateInput({ annualSaving: value })} />
            <NumberField id="engine-contract-income" label="Annual after-tax contract income" hint="Used only when Contract work is selected; default is zero." value={input.contractIncomeAfterTax} onChange={(value) => updateInput({ contractIncomeAfterTax: value })} />
            <NumberField id="engine-project-income" label="Annual net project income" hint="Optional, fixed nominal income in every strategy. Default is zero; no speculative business income is assumed." value={input.projectIncomeAfterTax} onChange={(value) => updateInput({ projectIncomeAfterTax: value })} />
            <NullableYearField id="engine-project-income-end-year" label="Project income end calendar year" hint="Inclusive. Blank means the full modeled horizon, not just the main planning age. Surplus income is not reinvested." value={input.projectIncomeEndYear} onChange={(value) => updateInput({ projectIncomeEndYear: value })} />
            <NumberField id="engine-darlene-net-wages" label="Darlene net wages available" hint="Set to zero when the core case should not depend on spouse wages." value={input.darleneNetWages} onChange={(value) => updateInput({ darleneNetWages: value })} />
            <NumberField id="engine-darlene-gross-wages" label="Darlene gross wages for income diagnostic" hint="Partial income proxy only—not ACA MAGI. No income-dependent subsidy calculation." value={input.darleneGrossWages} onChange={(value) => updateInput({ darleneGrossWages: value })} />
            <NumberField id="engine-as-of-year" label="As-of year" value={input.asOfYear} onChange={(value) => updateInput({ asOfYear: value })} />
            <NumberField id="engine-alex-birth-year" label="Alex birth year" value={input.alexBirthYear} onChange={(value) => updateInput({ alexBirthYear: value })} />
            <NumberField id="engine-darlene-birth-year" label="Darlene birth year" value={input.darleneBirthYear} onChange={(value) => updateInput({ darleneBirthYear: value })} />
            <NumberField id="engine-target-age" label="Main expense-planning age" hint="Inclusive boundary for headline status, minimum assets, and maximum annual gap. Approved plan: age 90." value={input.targetPlanningAge} onChange={(value) => updateInput({ targetPlanningAge: value })} min={55} max={100} />
            <NumberField id="engine-max-age" label="Long-life model extent" hint="Annual calculations continue independently through this age; default 100. A shorter extent leaves later checks unmodeled." value={input.maximumPlanningAge} onChange={(value) => updateInput({ maximumPlanningAge: value })} min={55} max={100} />
            <div className="flex flex-col justify-end gap-2 rounded-2xl border border-border/70 bg-muted/30 p-4 sm:col-span-2 lg:col-span-3">
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" checked={input.useLifeInsurance} onChange={(event) => updateInput({ useLifeInsurance: event.target.checked })} className="mt-1 size-4 accent-steward" />
                <span><span className="font-medium">Use life insurance cash value as a contingency layer</span><span className="mt-1 block text-muted-foreground">It remains outside the core assets unless you explicitly include it here.</span></span>
              </label>
              {input.useLifeInsurance ? <NumberField id="engine-life-insurance" label="Life insurance cash value" value={input.lifeInsuranceCashValue} onChange={(value) => updateInput({ lifeInsuranceCashValue: value })} /> : null}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>2 · Spending and mortgage</CardDescription>
            <CardTitle className="font-heading text-2xl">What does retirement have to fund?</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField id="engine-spending" label="Normalized annual spending" hint="Current run rate including the mortgage and current medical spending." value={input.normalizedSpending} onChange={(value) => updateInput({ normalizedSpending: value })} />
            <NumberField id="engine-living-base-year" label="Living-cost price base year" hint="Non-mortgage living costs inflate from this explicit price year, including years before retirement." value={input.livingCostBaseYear} onChange={(value) => updateInput({ livingCostBaseYear: value })} />
            <NumberField id="engine-spending-adjustment" label="Permanent spending adjustment" suffix="%" hint="A reduction from current non-mortgage spending." value={input.permanentSpendingAdjustmentPct} onChange={(value) => updateInput({ permanentSpendingAdjustmentPct: value })} min={0} max={100} step={0.1} />
            <NumberField id="engine-mortgage" label="Annual mortgage payment" value={input.annualMortgagePayment} onChange={(value) => updateInput({ annualMortgagePayment: value })} />
            <NumberField id="engine-mortgage-payoff" label="Mortgage payoff year" value={input.mortgagePayoffYear} onChange={(value) => updateInput({ mortgagePayoffYear: value })} />
            <NumberField id="engine-child-support" label="Additional annual child support" value={input.additionalChildSupport} onChange={(value) => updateInput({ additionalChildSupport: value })} />
            <NullableYearField id="engine-child-support-end-year" label="Child support end calendar year" hint={`Inclusive. Blank is unknown, not an assumed end date. Legacy Alex-age value ${input.childSupportThroughAge} is preserved in saved data but is not used to invent an end year.`} value={input.childSupportEndYear} onChange={(value) => updateInput({ childSupportEndYear: value })} />
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>3 · Healthcare</CardDescription>
            <CardTitle className="font-heading text-2xl">Price the obstacle that matters most.</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField id="engine-healthcare-base-year" label="Healthcare price base year" hint="Provisional historical cost basis. Healthcare costs grow from this year, not from retirement; replace placeholders with evidence-based quotes." value={input.healthcareCostBaseYear} onChange={(value) => updateInput({ healthcareCostBaseYear: value })} />
            <NumberField id="engine-aca-gross" label="ACA family gross premium" value={input.acaFamilyGrossPremium} onChange={(value) => updateInput({ acaFamilyGrossPremium: value })} />
            <NumberField id="engine-aca-subsidy" label="ACA family subsidy estimate" value={input.acaFamilySubsidyEstimate} onChange={(value) => updateInput({ acaFamilySubsidyEstimate: value })} />
            <NumberField id="engine-aca-oop" label="ACA family out-of-pocket budget" value={input.acaFamilyOutOfPocket} onChange={(value) => updateInput({ acaFamilyOutOfPocket: value })} />
            <NumberField id="engine-alex-single-premium" label="Alex single net premium" value={input.alexSingleNetPremium} onChange={(value) => updateInput({ alexSingleNetPremium: value })} />
            <NumberField id="engine-alex-single-oop" label="Alex single out-of-pocket budget" value={input.alexSingleOutOfPocket} onChange={(value) => updateInput({ alexSingleOutOfPocket: value })} />
            <NumberField id="engine-darlene-medicare" label="Darlene Medicare annual cost" value={input.darleneMedicareAnnualCost} onChange={(value) => updateInput({ darleneMedicareAnnualCost: value })} />
            <NumberField id="engine-alex-medicare" label="Alex Medicare annual cost" value={input.alexMedicareAnnualCost} onChange={(value) => updateInput({ alexMedicareAnnualCost: value })} />
            <NumberField id="engine-darlene-medicare-year" label="Darlene Medicare start year" value={input.darleneMedicareStartYear} onChange={(value) => updateInput({ darleneMedicareStartYear: value })} />
            <NumberField id="engine-alex-medicare-year" label="Alex Medicare start year" value={input.alexMedicareStartYear} onChange={(value) => updateInput({ alexMedicareStartYear: value })} />
            <NumberField id="engine-healthcare-stress" label="Combined-stress healthcare multiplier" suffix="x" value={input.stressHealthcareMultiplier} onChange={(value) => updateInput({ stressHealthcareMultiplier: value })} min={0} step={0.05} />
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>4 · Social Security</CardDescription>
            <CardTitle className="font-heading text-2xl">Keep claim timing independent for each spouse.</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 pt-5 lg:grid-cols-2">
            <SocialSecurityCard person="Alex" selectedAge={input.alexClaimAge} benefits={input.alexSocialSecurity} onAgeChange={(age) => updateInput({ alexClaimAge: age })} onBenefitChange={(age, value) => updateSocialSecurity("alex", age, value)} />
            <SocialSecurityCard person="Darlene" selectedAge={input.darleneClaimAge} benefits={input.darleneSocialSecurity} onAgeChange={(age) => updateInput({ darleneClaimAge: age })} onBenefitChange={(age, value) => updateSocialSecurity("darlene", age, value)} />
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>5 · Healthcare bridge job</CardDescription>
            <CardTitle className="font-heading text-2xl">Measure the job by total economic value.</CardTitle>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">The model counts after-tax wages plus the family healthcare cost avoided, then subtracts employee coverage, expected out-of-pocket costs, and work costs.</p>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField id="engine-bridge-hours" label="Hours per week" value={input.bridgeHoursPerWeek} onChange={(value) => updateInput({ bridgeHoursPerWeek: value })} min={0} step={0.5} />
            <NumberField id="engine-bridge-pay" label="Hourly pay" value={input.bridgeHourlyPay} onChange={(value) => updateInput({ bridgeHourlyPay: value })} min={0} step={0.5} />
            <NumberField id="engine-bridge-weeks" label="Weeks per year" value={input.bridgeWeeksPerYear} onChange={(value) => updateInput({ bridgeWeeksPerYear: value })} min={0} step={1} />
            <NumberField id="engine-bridge-tax" label="Estimated wage tax" suffix="%" value={input.bridgeTaxPct} onChange={(value) => updateInput({ bridgeTaxPct: value })} min={0} max={95} step={0.1} />
            <NumberField id="engine-bridge-premium" label="Employee plus spouse premium" value={input.bridgeEmployeePlusSpousePremium} onChange={(value) => updateInput({ bridgeEmployeePlusSpousePremium: value })} />
            <NumberField id="engine-bridge-oop" label="Job out-of-pocket budget" value={input.bridgeOutOfPocket} onChange={(value) => updateInput({ bridgeOutOfPocket: value })} />
            <NumberField id="engine-bridge-work-costs" label="Commuting and work costs" value={input.bridgeCommutingCosts} onChange={(value) => updateInput({ bridgeCommutingCosts: value })} />
            <NumberField id="engine-bridge-start" label="Bridge job starting age" value={input.bridgeStartingAge} onChange={(value) => updateInput({ bridgeStartingAge: value })} />
            <NumberField id="engine-bridge-end" label="Bridge job ending age" value={input.bridgeEndingAge} onChange={(value) => updateInput({ bridgeEndingAge: value })} />
            <div className="rounded-2xl border border-steward/25 bg-steward/5 p-4 sm:col-span-2 lg:col-span-3">
              <p className="text-xs tracking-[0.16em] text-steward uppercase">Current bridge-job estimate</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Gross wages" value={formatModelMoney(result.bridgeGrossWages)} />
                <MiniMetric label="Net wages" value={formatModelMoney(result.bridgeNetWages)} />
                <MiniMetric label="Effective annual value" value={formatModelMoney(result.bridgeEffectiveAnnualValue)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80">
          <CardHeader className="border-b">
            <CardDescription>6 · Returns, inflation, and tax</CardDescription>
            <CardTitle className="font-heading text-2xl">Make the uncertainty visible.</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField id="engine-base-return" label="Base nominal return" suffix="%" value={input.baseReturnPct} onChange={(value) => updateInput({ baseReturnPct: value })} step={0.1} />
            <NumberField id="engine-conservative-return" label="Conservative nominal return" suffix="%" value={input.conservativeReturnPct} onChange={(value) => updateInput({ conservativeReturnPct: value })} step={0.1} />
            <NumberField id="engine-base-inflation" label="Base inflation" suffix="%" value={input.baseInflationPct} onChange={(value) => updateInput({ baseInflationPct: value })} step={0.1} />
            <NumberField id="engine-conservative-inflation" label="Conservative inflation" suffix="%" value={input.conservativeInflationPct} onChange={(value) => updateInput({ conservativeInflationPct: value })} step={0.1} />
            <NumberField id="engine-base-tax" label="Base effective tax rate" suffix="%" value={input.baseTaxPct} onChange={(value) => updateInput({ baseTaxPct: value })} min={0} max={95} step={0.1} />
            <NumberField id="engine-conservative-tax" label="Conservative tax rate" suffix="%" value={input.conservativeTaxPct} onChange={(value) => updateInput({ conservativeTaxPct: value })} min={0} max={95} step={0.1} />
            <NumberField id="engine-stress-inflation" label="Stress inflation" suffix="%" value={input.stressInflationPct} onChange={(value) => updateInput({ stressInflationPct: value })} step={0.1} />
            <NumberField id="engine-stress-tax" label="Stress tax rate" suffix="%" value={input.stressTaxPct} onChange={(value) => updateInput({ stressTaxPct: value })} min={0} max={95} step={0.1} />
            <NumberField id="engine-stress-year-0" label="Stress year 0 return" suffix="%" value={input.stressYear0ReturnPct} onChange={(value) => updateInput({ stressYear0ReturnPct: value })} step={0.1} />
            <NumberField id="engine-stress-year-1" label="Stress year 1 return" suffix="%" value={input.stressYear1ReturnPct} onChange={(value) => updateInput({ stressYear1ReturnPct: value })} step={0.1} />
            <NumberField id="engine-stress-year-2" label="Stress year 2 return" suffix="%" value={input.stressYear2ReturnPct} onChange={(value) => updateInput({ stressYear2ReturnPct: value })} step={0.1} />
            <NumberField id="engine-stress-year-3" label="Stress year 3 return" suffix="%" value={input.stressYear3ReturnPct} onChange={(value) => updateInput({ stressYear3ReturnPct: value })} step={0.1} />
            <NumberField id="engine-stress-child-support" label="Stress total child support" hint="Replaces base support in D and the extended-support test; it is not added on top." value={input.stressExtraChildSupport} onChange={(value) => updateInput({ stressExtraChildSupport: value })} />
            <NullableYearField id="engine-stress-child-end-year" label="Stress support end calendar year" hint={`Inclusive. If support is positive and this is blank, D and support tests are NOT TESTED. Legacy Alex-age value ${input.stressChildSupportThroughAge} remains saved but inactive.`} value={input.stressChildSupportEndYear} onChange={(value) => updateInput({ stressChildSupportEndYear: value })} />
            <NumberField id="engine-stress-expense" label="One-time unexpected expense" value={input.oneTimeUnexpectedExpense} onChange={(value) => updateInput({ oneTimeUnexpectedExpense: value })} />
          </CardContent>
        </Card>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-border/80 bg-muted/30 p-4 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-steward" />
        <p>Two Goals keeps these values in the same local/cloud state as the rest of the app. This is planning software, not financial, tax, legal, or investment advice.</p>
      </div>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 p-4"><p className="text-xs text-white/65">{label}</p><p className="font-heading mt-1 text-2xl tabular-nums">{value}</p></div>;
}

function SummaryCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-border/80 bg-card/80 p-5"><p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p><p className="font-heading mt-2 text-2xl tabular-nums">{value}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{note}</p></div>;
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border/70 bg-background/70 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="font-heading mt-1 text-xl tabular-nums">{value}</p></div>;
}

function DetailRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={`flex items-center justify-between gap-4 px-4 py-3 text-sm ${emphasis ? "bg-muted/50 font-medium" : ""}`}><span>{label}</span><span className="tabular-nums">{value}</span></div>;
}

function StatusBadge({ status }: { status: EngineStatus }) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(status)}`}>{status}</span>;
}

function ComparisonTable({ rows, selectedAge, selectedStrategy }: { rows: ScenarioSummary[]; selectedAge?: number; selectedStrategy?: RetirementStrategy }) {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[52rem] text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">{selectedAge === undefined ? "Strategy" : "Retirement age"}</th>
            {selectedAge === undefined ? null : <th className="px-4 py-3 font-medium">Strategy</th>}
            <th className="px-4 py-3 font-medium">Starting core</th>
            <th className="px-4 py-3 font-medium">Main-age {rows[0]?.targetPlanningAge} assets</th>
            <th className="px-4 py-3 font-medium">Age 95 assets</th>
            <th className="px-4 py-3 font-medium">Age 100 assets</th>
            <th className="px-4 py-3 font-medium">Main-horizon max annual gap</th>
            <th className="px-4 py-3 font-medium">Main status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelected = selectedAge !== undefined ? row.retirementAge === selectedAge : row.strategy === selectedStrategy || (selectedStrategy === "age60" && row.strategy === "full");
            return (
              <tr key={`${row.strategy}-${row.retirementAge}`} className={`border-t border-border/70 ${isSelected ? "bg-steward/5" : ""}`}>
                <td className="px-4 py-3 font-medium">{selectedAge === undefined ? strategyLabel(row.strategy) : `Age ${row.retirementAge}`}</td>
                {selectedAge === undefined ? null : <td className="px-4 py-3 text-muted-foreground">{strategyLabel(row.strategy)}</td>}
                <td className="px-4 py-3 tabular-nums">{formatModelMoney(row.startingAssets)}</td>
                <td className="px-4 py-3 tabular-nums">{formatModelMoney(row.endingBalanceAtTarget)}</td>
                <td className="px-4 py-3 tabular-nums">{balanceText(row.endingBalanceAt95)}</td>
                <td className="px-4 py-3 tabular-nums">{balanceText(row.endingBalanceAt100)}</td>
                <td className="px-4 py-3 tabular-nums">{gapText(row.maximumUnfundedGap)}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} />{row.warnings.length ? <p className="mt-2 max-w-xs text-xs text-muted-foreground">{row.warnings.join(" ")}</p> : null}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StressTable({ tests }: { tests: ReturnType<typeof runRetirementEngine>["stressTests"] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[48rem] text-sm">
        <thead className="bg-muted/50 text-left text-muted-foreground">
          <tr><th className="px-4 py-3 font-medium">Test</th><th className="px-4 py-3 font-medium">Healthcare</th><th className="px-4 py-3 font-medium">Inflation</th><th className="px-4 py-3 font-medium">Main-age {tests[0]?.summary.targetPlanningAge} assets</th><th className="px-4 py-3 font-medium">Main-horizon max annual gap</th><th className="px-4 py-3 font-medium">Main status</th></tr>
        </thead>
        <tbody>
          {tests.map((test) => (
            <tr key={test.name} className="border-t border-border/70">
              <td className="px-4 py-3 font-medium">{test.name}</td>
              <td className="px-4 py-3 tabular-nums">{test.healthcareMultiplier.toFixed(2)}x</td>
              <td className="px-4 py-3 tabular-nums">{percent(test.inflation)}</td>
              <td className="px-4 py-3 tabular-nums">{formatModelMoney(test.summary.endingBalanceAtTarget)}</td>
              <td className="px-4 py-3 tabular-nums">{gapText(test.summary.maximumUnfundedGap)}</td>
              <td className="px-4 py-3"><StatusBadge status={test.summary.status} />{test.summary.warnings.length ? <p className="mt-2 max-w-xs text-xs text-muted-foreground">{test.summary.warnings.join(" ")}</p> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SelectField({ id, label, value, options, onChange, dark = false }: { id: string; label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void; dark?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className={dark ? "text-xs text-white/70" : "text-sm"}>{label}</Label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={dark ? "h-10 rounded-lg border border-white/20 bg-white px-3 text-sm text-steward outline-none" : "h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none"}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function NumberField({ id, label, hint, value, onChange, suffix, min, max, step = 1 }: { id: string; label: string; hint?: string; value: number; onChange: (value: number) => void; suffix?: string; min?: number; max?: number; step?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative"><Input id={id} type="number" inputMode="decimal" value={Number.isFinite(value) ? value : ""} min={min} max={max} step={step} onChange={(event) => onChange(numeric(event.target.value))} className={suffix ? "pr-9" : ""} /><span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">{suffix ?? ""}</span></div>
      {hint ? <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function NullableYearField({ id, label, hint, value, onChange }: { id: string; label: string; hint: string; value: number | null; onChange: (value: number | null) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="numeric" step={1} value={value ?? ""} placeholder="Unset" onChange={(event) => onChange(event.target.value.trim() === "" ? null : numeric(event.target.value))} />
      <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

function SocialSecurityCard({ person, selectedAge, benefits, onAgeChange, onBenefitChange }: { person: string; selectedAge: ClaimAge; benefits: Record<ClaimAge, number>; onAgeChange: (age: ClaimAge) => void; onBenefitChange: (age: ClaimAge, value: number) => void }) {
  return (
    <div className="rounded-2xl border p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between"><h3 className="font-heading text-xl">{person}</h3><p className="text-sm text-muted-foreground">Claiming at {claimAgeLabel(selectedAge)}</p></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <SelectField id={`engine-${person.toLowerCase()}-claim-age`} label="Claim age" value={String(selectedAge)} onChange={(value) => onAgeChange(Number(value) as ClaimAge)} options={claimAges.map((age) => ({ value: String(age), label: claimAgeLabel(age) }))} />
        <div className="flex flex-col gap-2"><Label>Selected monthly estimate</Label><div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm tabular-nums">{formatModelMoney(benefits[selectedAge])}</div></div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {claimAges.map((age) => <NumberField key={age} id={`engine-${person.toLowerCase()}-ss-${age}`} label={`Age ${age}`} value={benefits[age]} onChange={(value) => onBenefitChange(age, value)} />)}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Monthly benefit entered in current dollars; the model inflates it from the as-of year.</p>
    </div>
  );
}
