export { runPipeline, inferColumns } from "./engine";
export type { StageResult } from "./engine";
export { executeCommand, evaluateCondition } from "./commands";
export { parsePipeline } from "./parser";
export {
  QUERY_LIBRARY,
  getQueriesByCategory,
  getQueriesByDifficulty,
  getAllCategories,
} from "./query-library";
export type { QueryEntry, QueryDifficulty, QueryCategory } from "./query-library";

export { scenarios } from "./scenarios";
export { dplScenarios } from "./scenarios-dpl";
export { combinedScenarios } from "./scenarios-combined";
export { onboardingScenarios } from "./scenarios-onboarding";

// All scenarios merged in logical learning order
import { onboardingScenarios } from "./scenarios-onboarding";
import { scenarios } from "./scenarios";
import { dplScenarios } from "./scenarios-dpl";
import { combinedScenarios } from "./scenarios-combined";
import type { Scenario } from "@/lib/types/dql";

export const ALL_SCENARIOS: Scenario[] = [
  ...onboardingScenarios,
  ...scenarios,
  ...dplScenarios,
  ...combinedScenarios,
];
