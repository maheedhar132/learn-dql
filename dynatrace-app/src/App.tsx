import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppShell } from './components/AppShell';

const LandingPage   = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const CodexPage     = React.lazy(() => import('./pages/CodexPage').then(m => ({ default: m.CodexPage })));
const SandboxPage   = React.lazy(() => import('./pages/SandboxPage').then(m => ({ default: m.SandboxPage })));
const VisualizePage = React.lazy(() => import('./pages/VisualizePage').then(m => ({ default: m.VisualizePage })));
const CasesPage     = React.lazy(() => import('./pages/CasesPage').then(m => ({ default: m.CasesPage })));
const ArcadePage    = React.lazy(() => import('./pages/ArcadePage').then(m => ({ default: m.ArcadePage })));

export function App() {
  return (
    <AppProvider>
      <AppShell>
        <React.Suspense fallback={<div style={{ padding: '2rem' }}>Loading…</div>}>
          <Routes>
            <Route path="/" element={<Navigate to="/landing" replace />} />
            <Route path="/landing"   element={<LandingPage />} />
            <Route path="/codex"     element={<CodexPage />} />
            <Route path="/sandbox"   element={<SandboxPage />} />
            <Route path="/visualize" element={<VisualizePage />} />
            <Route path="/cases"     element={<CasesPage />} />
            <Route path="/arcade"    element={<ArcadePage />} />
          </Routes>
        </React.Suspense>
      </AppShell>
    </AppProvider>
  );
}
