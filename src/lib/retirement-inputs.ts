import { defaultRetirementEngine, type RetirementEngineInputs } from "./types";

// New controls have explicit neutral/migration semantics, not new household estimates.
const NEW_CONTROLS = new Set([
  "isExample", "projectIncomeAfterTax", "projectIncomeEndYear", "livingCostBaseYear",
  "healthcareCostBaseYear", "childSupportEndYear", "stressChildSupportEndYear",
]);

/** Add missing controls only. Never reset persisted financial values or infer support dates. */
export function asRetirementEngine(value: Partial<RetirementEngineInputs> | undefined): RetirementEngineInputs {
  const raw = value ?? {};
  const legacyPriceBase = Number.isInteger(raw.asOfYear) ? raw.asOfYear! : defaultRetirementEngine.asOfYear;
  const exampleBackfill = (Object.keys(defaultRetirementEngine) as Array<keyof RetirementEngineInputs>)
    .some((key) => !NEW_CONTROLS.has(key) && raw[key] === undefined)
    || [62, 67, 70].some((age) => raw.alexSocialSecurity?.[age as 62 | 67 | 70] === undefined || raw.darleneSocialSecurity?.[age as 62 | 67 | 70] === undefined);
  return {
    ...defaultRetirementEngine,
    ...raw,
    // A partial legacy object must not present synthetic backfills as personal figures.
    isExample: raw.isExample === true || exampleBackfill,
    livingCostBaseYear: raw.livingCostBaseYear ?? legacyPriceBase,
    healthcareCostBaseYear: raw.healthcareCostBaseYear ?? legacyPriceBase,
    alexSocialSecurity: { ...defaultRetirementEngine.alexSocialSecurity, ...(raw.alexSocialSecurity ?? {}) },
    darleneSocialSecurity: { ...defaultRetirementEngine.darleneSocialSecurity, ...(raw.darleneSocialSecurity ?? {}) },
    childSupportEndYear: raw.childSupportEndYear ?? null,
    stressChildSupportEndYear: raw.stressChildSupportEndYear ?? null,
    projectIncomeEndYear: raw.projectIncomeEndYear ?? null,
  };
}
