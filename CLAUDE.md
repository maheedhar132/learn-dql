# learn-dql — Project Context (condensed)

## ⚠️ BINDING RULES (see PROJECT_DECK.md §6)
1. **Go-forward codebase = `learn-dql/`** (official dt-app scaffold, Strato
   v3). Build there. `dynatrace-app/` is a DONOR only — port its pure-TS
   `lib/dql` + `lib/dpl` + scenarios; never build in/deploy it.
2. **Offline simulated engine** for all query execution + result-based
   validation (deterministic sample data). No live Grail / `useDql` for
   lessons. Progress persistence = `localStorage` (dev-only app).
3. **🚫 NEVER DEPLOY.** Allowed: `npm run start` (`dt-app dev`),
   `npm run build`. FORBIDDEN: `deploy`, `publish`, `uninstall`. Tenant
   `wkf10640` is dev-only.

## Goal
Build an interactive DQL/DPL learning app modeled on Dynatrace's "Learn DQL"
hub product (https://www.dynatrace.com/hub/detail/learn-dql/). Ships as a
**Dynatrace AppEngine** app. Branch: work on `dev`, PRs to `master`.

### What "Learn DQL" (the model product) does
- Exercise-based, step-by-step challenges; each lesson teaches one DQL
  command/function with a short video or docs link.
- **Result-based validation**: compares the user's query *result* to a
  reference query's result — not exact syntax (multiple solutions accepted).
- Progressive difficulty: beginner module (core commands/functions) +
  intermediate module (JSON parsing / audit-log analysis).
- Support ladder: instant feedback → hints after repeated failures →
  full solution as last resort. Visual syntax-error + success states.
- Landing page overview; scaffolded learning paths.

## Repo layout
- `dql-research/` — 9 reference docs (DQL overview, types, operators,
  commands, functions, best practices, examples, visual signatures, Grail).
- `DQL_DPL_COMPREHENSIVE_GUIDE.md` — 1294-line authored DQL/DPL guide.
- `dynatrace-app/` — the app. See its `STEERING.md` (architecture, rules,
  how-to-extend) and `APPENGINE_PATTERNS.md`. Read STEERING.md before
  non-trivial app work.

## Stack & hard rules
- React 18 + TS 5 strict + Vite via `@dynatrace/app-scripts` (`dt-app`).
- **UI: ONLY `@dynatrace/strato-components*` + `@dynatrace/strato-icons`.**
  No Tailwind / Framer / Recharts / styled-components / raw HTML interactive
  els. Styling = inline styles or `src/styles/globals.css` classes.
- State: React Context + `useReducer` + localStorage. No backend DB.
  Auth handled by Dynatrace platform.
- Routing: `react-router-dom` v6, pages lazy-loaded.
- Scripts (run in `dynatrace-app/`): `npm start` (dev), `npm run build`,
  `npm run deploy`, `npm run typecheck`, `npm run lint`.

## Build status (key fact — what's real vs stub)
**DONE (pure TS, no React) — `dynatrace-app/src/lib/`:**
- `dql/engine.ts` runPipeline executor; `dql/commands.ts` 20+ commands;
  `dql/parser.ts`; `dql/log-generator.ts` deterministic sample data;
  `dql/scenarios*.ts` (~3900 lines, 60+ cases: scenarios.ts,
  -combined, -dpl, -onboarding); `dql/query-library.ts` (Codex data).
- `dpl/parser.ts` (DPL→RegExp), `dpl/matchers.ts` (matcher registry).

**DONE (app shell):** `App.tsx` (lazy routes), `components/AppShell.tsx`,
`components/TopNav.tsx`, `pages/LandingPage.tsx` (real, 221 lines),
`context/AppContext.tsx` (reducer + all action creators),
`hooks/useLocalStorage.ts`, `types/app.types.ts`.

**STUB (16-line placeholders — the work to build):**
`pages/CodexPage.tsx`, `SandboxPage.tsx`, `VisualizePage.tsx`,
`CasesPage.tsx`, `ArcadePage.tsx`. `components/games/*` not created yet.

## The 5 phases/pages to build (phases D–H)
- **Codex** (D): interactive DQL/DPL reference (data: `query-library.ts`).
- **Sandbox** (E): free-form query editor → engine → result table.
- **Visualize** (F): animated, staged command demonstrations.
- **Cases** (G): 60+ guided investigations w/ steps, hints, result-based
  validation — this is the core "Learn DQL"-style experience.
- **Arcade** (H): 5 mini-games (timer, pipeline, mcq, dpl-matcher,
  dpl-builder).

## When extending
- New case → add `Scenario` to `lib/dql/scenarios.ts` (CasesPage reads
  dynamically). New command → register in `commands.ts` COMMAND_MAP +
  add to `DQLCommandName` union. New game → `components/games/X.tsx` +
  `GameMode` union + register in ArcadePage + `updateGameScore`.
- Validation pattern = run expected pipeline vs user pipeline on same
  sampleData, compare result records (not syntax).
- Consume state via `useAppContext()` (see STEERING.md §5 for action list).
