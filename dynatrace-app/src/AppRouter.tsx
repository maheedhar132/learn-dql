import React from 'react';
import { useAppState } from './hooks/useAppState';

// Page-level lazy imports – each chunk is only loaded when the user
// navigates to that phase, keeping the initial bundle small.
const LandingPage    = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const CodexPage      = React.lazy(() => import('./pages/CodexPage').then(m => ({ default: m.CodexPage })));
const SandboxPage    = React.lazy(() => import('./pages/SandboxPage').then(m => ({ default: m.SandboxPage })));
const VisualizePage  = React.lazy(() => import('./pages/VisualizePage').then(m => ({ default: m.VisualizePage })));
const CasesPage      = React.lazy(() => import('./pages/CasesPage').then(m => ({ default: m.CasesPage })));
const ArcadePage     = React.lazy(() => import('./pages/ArcadePage').then(m => ({ default: m.ArcadePage })));

import { Flex, ProgressCircle } from '@dynatrace/strato-components-full';

function PageLoader() {
  return (
    <Flex alignItems="center" justifyContent="center" style={{ height: '100%' }}>
      <ProgressCircle />
    </Flex>
  );
}

/**
 * Routes between the 6 top-level phases based on AppState.currentPhase.
 * No URL-based routing needed — the app lives at a single Dynatrace URL.
 */
export function AppRouter() {
  const { currentPhase } = useAppState();

  return (
    <React.Suspense fallback={<PageLoader />}>
      {currentPhase === 'landing'   && <LandingPage />}
      {currentPhase === 'codex'     && <CodexPage />}
      {currentPhase === 'sandbox'   && <SandboxPage />}
      {currentPhase === 'visualize' && <VisualizePage />}
      {currentPhase === 'cases'     && <CasesPage />}
      {currentPhase === 'arcade'    && <ArcadePage />}
    </React.Suspense>
  );
}
