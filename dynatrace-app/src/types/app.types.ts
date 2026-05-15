// ─────────────────────────────────────────────────────────────────────────────
// Navigation
// ─────────────────────────────────────────────────────────────────────────────

export type Phase =
  | 'landing'
  | 'codex'
  | 'sandbox'
  | 'visualize'
  | 'cases'
  | 'arcade';

export type GameMode =
  | 'timer'
  | 'pipeline'
  | 'mcq'
  | 'dpl-matcher'
  | 'dpl-builder';

// ─────────────────────────────────────────────────────────────────────────────
// DQL Core Types (mirror of original lib/types/dql.ts)
// ─────────────────────────────────────────────────────────────────────────────

export type DQLFieldType =
  | 'string'
  | 'long'
  | 'double'
  | 'timestamp'
  | 'boolean'
  | 'array'
  | 'record'
  | 'null'
  | 'duration'
  | 'ip';

export interface DQLRecord {
  [key: string]: unknown;
}

export interface DQLColumn {
  name: string;
  type: DQLFieldType;
}

export type DQLCommandName =
  | 'fetch'
  | 'filter'
  | 'filterOut'
  | 'search'
  | 'fields'
  | 'fieldsAdd'
  | 'fieldsRemove'
  | 'fieldsRename'
  | 'sort'
  | 'limit'
  | 'summarize'
  | 'makeTimeseries'
  | 'timeseries'
  | 'dedup'
  | 'parse'
  | 'expand'
  | 'append'
  | 'join'
  | 'lookup'
  | 'data';

export interface PipelineStage {
  id: string;
  command: DQLCommandName;
  args: Record<string, unknown>;
  raw: string;
}

export interface PipelineResult {
  stageIndex: number;
  command: DQLCommandName;
  raw: string;
  records: DQLRecord[];
  columns: DQLColumn[];
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenarios / Cases
// ─────────────────────────────────────────────────────────────────────────────

export type CaseDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type CaseTier = 'free' | 'premium';
export type CaseTrack = 'onboarding' | 'dql' | 'dpl' | 'combined';

export interface ScenarioStep {
  id: string;
  title: string;
  narration: string;
  lesson: string;
  goal: string;
  hint: string;
  sampleData: DQLRecord[];
  expectedPipeline: PipelineStage[];
  dpl?: {
    inputs: string[];
    expectedPattern: string;
    expectedFields: string[];
  };
}

export interface Scenario {
  id: string;
  title: string;
  company: string;
  briefing: string;
  difficulty: CaseDifficulty;
  steps: ScenarioStep[];
  track?: CaseTrack;
  tier?: CaseTier;
  tags?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress & Persistence
// ─────────────────────────────────────────────────────────────────────────────

export interface CaseProgress {
  completed: boolean;
  stepsCompleted: number;
  totalSteps: number;
  lastAttempt?: string; // ISO timestamp
}

export interface GameScores {
  timerGame: number;
  pipelineGame: number;
  mcqGame: number;
  dplMatcherGame: number;
  dplBuilderGame: number;
}

export interface PersistedProgress {
  caseProgress: Record<string, CaseProgress>;
  gameScores: GameScores;
  sandboxHistory: string[];
  totalCasesCompleted: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Global App State
// ─────────────────────────────────────────────────────────────────────────────

export interface AppState {
  // ── Navigation ──────────────────────────────────────────────────────────────
  currentPhase: Phase;
  currentGameMode: GameMode | null;

  // ── Cases ───────────────────────────────────────────────────────────────────
  currentCaseId: string | null;
  currentStepIndex: number;

  // ── Sandbox ─────────────────────────────────────────────────────────────────
  sandboxQuery: string;
  sandboxResults: PipelineResult[];

  // ── Visualize ───────────────────────────────────────────────────────────────
  visualizeCommand: DQLCommandName | null;
  visualizeStage: number;

  // ── Persisted ───────────────────────────────────────────────────────────────
  caseProgress: Record<string, CaseProgress>;
  gameScores: GameScores;
  sandboxHistory: string[];

  // ── UI Toggles ──────────────────────────────────────────────────────────────
  narrativeVisible: boolean;
  showHints: boolean;
  codexSection: string;
}

export type AppAction =
  | { type: 'NAVIGATE'; payload: Phase }
  | { type: 'SET_GAME_MODE'; payload: GameMode | null }
  | { type: 'SET_CASE'; payload: string }
  | { type: 'CLEAR_CASE' }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'ADVANCE_STEP' }
  | { type: 'COMPLETE_STEP'; payload: { caseId: string; stepIndex: number; totalSteps: number } }
  | { type: 'COMPLETE_CASE'; payload: string }
  | { type: 'SET_SANDBOX_QUERY'; payload: string }
  | { type: 'SET_SANDBOX_RESULTS'; payload: PipelineResult[] }
  | { type: 'ADD_SANDBOX_HISTORY'; payload: string }
  | { type: 'SET_VISUALIZE_COMMAND'; payload: DQLCommandName | null }
  | { type: 'SET_VISUALIZE_STAGE'; payload: number }
  | { type: 'UPDATE_GAME_SCORE'; payload: { game: keyof GameScores; score: number } }
  | { type: 'TOGGLE_NARRATIVE' }
  | { type: 'TOGGLE_HINTS' }
  | { type: 'SET_CODEX_SECTION'; payload: string }
  | { type: 'LOAD_PERSISTED'; payload: PersistedProgress };
