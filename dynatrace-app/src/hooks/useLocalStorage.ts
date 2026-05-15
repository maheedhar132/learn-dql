import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'dql-investigator-progress';

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch {
        // Silently ignore storage errors (quota exceeded, etc.)
      }
    },
    [key, storedValue],
  );

  return [storedValue, setValue] as const;
}

// ─────────────────────────────────────────────────────────────────────────────
// Typed progress hook — loads and saves the full progress blob atomically
// ─────────────────────────────────────────────────────────────────────────────

import type { PersistedProgress, GameScores, CaseProgress } from '../types/app.types';

const DEFAULT_GAME_SCORES: GameScores = {
  timerGame: 0,
  pipelineGame: 0,
  mcqGame: 0,
  dplMatcherGame: 0,
  dplBuilderGame: 0,
};

const DEFAULT_PROGRESS: PersistedProgress = {
  caseProgress: {},
  gameScores: DEFAULT_GAME_SCORES,
  sandboxHistory: [],
  totalCasesCompleted: 0,
};

export function usePersistedProgress() {
  const [progress, setProgress] = useLocalStorage<PersistedProgress>(
    STORAGE_KEY,
    DEFAULT_PROGRESS,
  );

  const updateCaseProgress = useCallback(
    (caseId: string, update: Partial<CaseProgress>) => {
      setProgress((prev) => ({
        ...prev,
        caseProgress: {
          ...prev.caseProgress,
          [caseId]: {
            ...DEFAULT_PROGRESS.caseProgress[caseId],
            ...prev.caseProgress[caseId],
            ...update,
          },
        },
      }));
    },
    [setProgress],
  );

  const completeCase = useCallback(
    (caseId: string, totalSteps: number) => {
      setProgress((prev) => ({
        ...prev,
        totalCasesCompleted: prev.totalCasesCompleted + 1,
        caseProgress: {
          ...prev.caseProgress,
          [caseId]: {
            completed: true,
            stepsCompleted: totalSteps,
            totalSteps,
            lastAttempt: new Date().toISOString(),
          },
        },
      }));
    },
    [setProgress],
  );

  const updateGameScore = useCallback(
    (game: keyof GameScores, score: number) => {
      setProgress((prev) => ({
        ...prev,
        gameScores: {
          ...prev.gameScores,
          [game]: Math.max(prev.gameScores[game], score),
        },
      }));
    },
    [setProgress],
  );

  const addSandboxHistory = useCallback(
    (query: string) => {
      setProgress((prev) => ({
        ...prev,
        sandboxHistory: [query, ...prev.sandboxHistory.filter((q) => q !== query)].slice(0, 50),
      }));
    },
    [setProgress],
  );

  useEffect(() => {
    // Validate and repair any corrupted persisted state on mount
    if (!progress.gameScores) {
      setProgress((prev) => ({ ...prev, gameScores: DEFAULT_GAME_SCORES }));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    progress,
    updateCaseProgress,
    completeCase,
    updateGameScore,
    addSandboxHistory,
  };
}
