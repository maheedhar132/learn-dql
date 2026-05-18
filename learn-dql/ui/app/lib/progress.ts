// Learner progress. Decision (PROJECT_DECK §6): dev-only app, no deploy,
// so progress lives in localStorage rather than the App State service.

const KEY = "learn-dql.progress.v1";

interface ProgressShape {
  completedCases: string[];
  completedSteps: Record<string, number[]>; // caseId -> step indexes
}

function read(): ProgressShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { completedCases: [], completedSteps: {} };
    const parsed = JSON.parse(raw) as Partial<ProgressShape>;
    return {
      completedCases: parsed.completedCases ?? [],
      completedSteps: parsed.completedSteps ?? {},
    };
  } catch {
    return { completedCases: [], completedSteps: {} };
  }
}

function write(p: ProgressShape): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — progress is best-effort in dev */
  }
}

export function getProgress(): ProgressShape {
  return read();
}

export function isCaseComplete(caseId: string): boolean {
  return read().completedCases.includes(caseId);
}

export function completedStepCount(caseId: string): number {
  return read().completedSteps[caseId]?.length ?? 0;
}

export function markStepComplete(
  caseId: string,
  stepIndex: number,
  totalSteps: number,
): void {
  const p = read();
  const steps = new Set(p.completedSteps[caseId] ?? []);
  steps.add(stepIndex);
  p.completedSteps[caseId] = Array.from(steps).sort((a, b) => a - b);
  if (
    p.completedSteps[caseId].length >= totalSteps &&
    !p.completedCases.includes(caseId)
  ) {
    p.completedCases.push(caseId);
  }
  write(p);
}
