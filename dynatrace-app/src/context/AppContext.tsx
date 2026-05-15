import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';
import type {
  AppState,
  AppAction,
  Phase,
  GameMode,
  DQLCommandName,
  PipelineResult,
  GameScores,
  PersistedProgress,
} from '../types/app.types';
import { usePersistedProgress } from '../hooks/useLocalStorage';

// ─────────────────────────────────────────────────────────────────────────────
// Initial state
// ─────────────────────────────────────────────────────────────────────────────

const initialState: AppState = {
  currentPhase: 'landing',
  currentGameMode: null,

  currentCaseId: null,
  currentStepIndex: 0,

  sandboxQuery: 'fetch logs, from:-2h\n| filter loglevel == "ERROR"\n| limit 20',
  sandboxResults: [],

  visualizeCommand: null,
  visualizeStage: 0,

  caseProgress: {},
  gameScores: {
    timerGame: 0,
    pipelineGame: 0,
    mcqGame: 0,
    dplMatcherGame: 0,
    dplBuilderGame: 0,
  },
  sandboxHistory: [],

  narrativeVisible: true,
  showHints: false,
  codexSection: 'overview',
};

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'NAVIGATE':
      return {
        ...state,
        currentPhase: action.payload,
        currentGameMode: null,
      };

    case 'SET_GAME_MODE':
      return { ...state, currentGameMode: action.payload };

    case 'SET_CASE':
      return {
        ...state,
        currentPhase: 'cases',
        currentCaseId: action.payload,
        currentStepIndex: 0,
      };

    case 'CLEAR_CASE':
      return {
        ...state,
        currentCaseId: null,
        currentStepIndex: 0,
      };

    case 'SET_STEP':
      return { ...state, currentStepIndex: action.payload };

    case 'ADVANCE_STEP':
      return { ...state, currentStepIndex: state.currentStepIndex + 1 };

    case 'COMPLETE_STEP': {
      const { caseId, stepIndex, totalSteps } = action.payload;
      const existing = state.caseProgress[caseId];
      return {
        ...state,
        caseProgress: {
          ...state.caseProgress,
          [caseId]: {
            completed: existing?.completed ?? false,
            stepsCompleted: Math.max(existing?.stepsCompleted ?? 0, stepIndex + 1),
            totalSteps,
            lastAttempt: new Date().toISOString(),
          },
        },
      };
    }

    case 'COMPLETE_CASE': {
      const existing = state.caseProgress[action.payload];
      const totalSteps = existing?.totalSteps ?? 0;
      return {
        ...state,
        caseProgress: {
          ...state.caseProgress,
          [action.payload]: {
            completed: true,
            stepsCompleted: totalSteps,
            totalSteps,
            lastAttempt: new Date().toISOString(),
          },
        },
      };
    }

    case 'SET_SANDBOX_QUERY':
      return { ...state, sandboxQuery: action.payload };

    case 'SET_SANDBOX_RESULTS':
      return { ...state, sandboxResults: action.payload };

    case 'ADD_SANDBOX_HISTORY':
      return {
        ...state,
        sandboxHistory: [
          action.payload,
          ...state.sandboxHistory.filter((q) => q !== action.payload),
        ].slice(0, 50),
      };

    case 'SET_VISUALIZE_COMMAND':
      return { ...state, visualizeCommand: action.payload, visualizeStage: 0 };

    case 'SET_VISUALIZE_STAGE':
      return { ...state, visualizeStage: action.payload };

    case 'UPDATE_GAME_SCORE':
      return {
        ...state,
        gameScores: {
          ...state.gameScores,
          [action.payload.game]: Math.max(
            state.gameScores[action.payload.game],
            action.payload.score,
          ),
        },
      };

    case 'TOGGLE_NARRATIVE':
      return { ...state, narrativeVisible: !state.narrativeVisible };

    case 'TOGGLE_HINTS':
      return { ...state, showHints: !state.showHints };

    case 'SET_CODEX_SECTION':
      return { ...state, codexSection: action.payload };

    case 'LOAD_PERSISTED':
      return {
        ...state,
        caseProgress: action.payload.caseProgress,
        gameScores: action.payload.gameScores,
        sandboxHistory: action.payload.sandboxHistory,
      };

    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Convenience action creators
  navigate: (phase: Phase) => void;
  openCase: (caseId: string) => void;
  closeCase: () => void;
  setGame: (mode: GameMode | null) => void;
  setSandboxQuery: (query: string) => void;
  setSandboxResults: (results: PipelineResult[]) => void;
  recordSandboxQuery: (query: string) => void;
  setVisualizeCommand: (cmd: DQLCommandName | null) => void;
  advanceVisualizeStage: () => void;
  completeStep: (caseId: string, stepIndex: number, totalSteps: number) => void;
  completeCase: (caseId: string) => void;
  updateGameScore: (game: keyof GameScores, score: number) => void;
  toggleNarrative: () => void;
  toggleHints: () => void;
  setCodexSection: (section: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const routerNavigate = useRouterNavigate();
  const { progress, updateCaseProgress, completeCase: persistCompleteCase, updateGameScore: persistScore, addSandboxHistory } =
    usePersistedProgress();

  // Hydrate from localStorage on mount
  useEffect(() => {
    dispatch({
      type: 'LOAD_PERSISTED',
      payload: progress as PersistedProgress,
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Action creators ─────────────────────────────────────────────────────────

  const navigate = useCallback((phase: Phase) => {
    dispatch({ type: 'NAVIGATE', payload: phase });
    routerNavigate(`/${phase}`);
  }, [routerNavigate]);

  const openCase = useCallback((caseId: string) => {
    dispatch({ type: 'SET_CASE', payload: caseId });
  }, []);

  const closeCase = useCallback(() => {
    dispatch({ type: 'CLEAR_CASE' });
    dispatch({ type: 'NAVIGATE', payload: 'cases' });
  }, []);

  const setGame = useCallback((mode: GameMode | null) => {
    dispatch({ type: 'SET_GAME_MODE', payload: mode });
  }, []);

  const setSandboxQuery = useCallback((query: string) => {
    dispatch({ type: 'SET_SANDBOX_QUERY', payload: query });
  }, []);

  const setSandboxResults = useCallback((results: PipelineResult[]) => {
    dispatch({ type: 'SET_SANDBOX_RESULTS', payload: results });
  }, []);

  const recordSandboxQuery = useCallback(
    (query: string) => {
      dispatch({ type: 'ADD_SANDBOX_HISTORY', payload: query });
      addSandboxHistory(query);
    },
    [addSandboxHistory],
  );

  const setVisualizeCommand = useCallback((cmd: DQLCommandName | null) => {
    dispatch({ type: 'SET_VISUALIZE_COMMAND', payload: cmd });
  }, []);

  const advanceVisualizeStage = useCallback(() => {
    dispatch({ type: 'SET_VISUALIZE_STAGE', payload: state.visualizeStage + 1 });
  }, [state.visualizeStage]);

  const completeStep = useCallback(
    (caseId: string, stepIndex: number, totalSteps: number) => {
      dispatch({ type: 'COMPLETE_STEP', payload: { caseId, stepIndex, totalSteps } });
      updateCaseProgress(caseId, {
        stepsCompleted: stepIndex + 1,
        totalSteps,
        lastAttempt: new Date().toISOString(),
      });
    },
    [updateCaseProgress],
  );

  const completeCase = useCallback(
    (caseId: string) => {
      const totalSteps = state.caseProgress[caseId]?.totalSteps ?? 0;
      dispatch({ type: 'COMPLETE_CASE', payload: caseId });
      persistCompleteCase(caseId, totalSteps);
    },
    [state.caseProgress, persistCompleteCase],
  );

  const updateGameScore = useCallback(
    (game: keyof GameScores, score: number) => {
      dispatch({ type: 'UPDATE_GAME_SCORE', payload: { game, score } });
      persistScore(game, score);
    },
    [persistScore],
  );

  const toggleNarrative = useCallback(() => dispatch({ type: 'TOGGLE_NARRATIVE' }), []);
  const toggleHints = useCallback(() => dispatch({ type: 'TOGGLE_HINTS' }), []);
  const setCodexSection = useCallback(
    (section: string) => dispatch({ type: 'SET_CODEX_SECTION', payload: section }),
    [],
  );

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        navigate,
        openCase,
        closeCase,
        setGame,
        setSandboxQuery,
        setSandboxResults,
        recordSandboxQuery,
        setVisualizeCommand,
        advanceVisualizeStage,
        completeStep,
        completeCase,
        updateGameScore,
        toggleNarrative,
        toggleHints,
        setCodexSection,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Consumer hook
// ─────────────────────────────────────────────────────────────────────────────

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used inside <AppProvider>');
  }
  return ctx;
}

export function useAppState(): AppState {
  return useAppContext().state;
}
