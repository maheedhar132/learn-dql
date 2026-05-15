# DQL Investigator — Dynatrace AppEngine Steering Document

> Living reference for development, extension, and maintenance of the app.  
> Update this document whenever a significant architectural decision is made.

---

## 1. Purpose & Scope

**DQL Investigator** is a self-contained learning platform for Dynatrace Query
Language (DQL) and Dynatrace Pattern Language (DPL), running as a Dynatrace
AppEngine application.

### In scope
| Feature | Phase |
|---------|-------|
| Codex — interactive DQL/DPL reference guide | D |
| Sandbox — free-form query editor | E |
| Visualize — animated command demonstrations | F |
| Cases — 60+ guided investigation scenarios | G |
| Arcade — five skill-reinforcement mini-games | H |

### Out of scope (excluded from AppEngine version)
- User authentication (Dynatrace SSO handles it)
- User profiles, XP tracking, leaderboards
- Payment / premium-tier gating
- 3D landing-page scene

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ Dynatrace AppEngine Runtime                                         │
│                                                                     │
│  ┌──────────────┐   React Context    ┌──────────────────────────┐  │
│  │  AppContext   │◄──────────────────►│  Page Components         │  │
│  │  (AppState)  │                    │  LandingPage             │  │
│  │  useReducer  │   Strato UI only   │  CodexPage               │  │
│  └──────────────┘                    │  SandboxPage             │  │
│         │                            │  VisualizePage           │  │
│         │                            │  CasesPage               │  │
│         ▼                            │  ArcadePage              │  │
│  ┌──────────────┐                    └──────────────────────────┘  │
│  │ localStorage │  ◄── PersistedProgress (case completion,         │  │
│  │  (progress)  │       game scores, sandbox history)              │  │
│  └──────────────┘                                                   │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Core Logic (pure TypeScript — no React dependencies)         │  │
│  │                                                               │  │
│  │  lib/dql/engine.ts       Pipeline executor                   │  │
│  │  lib/dql/commands.ts     20+ DQL command implementations     │  │
│  │  lib/dql/parser.ts       DQL syntax parser                   │  │
│  │  lib/dql/log-generator   Deterministic sample data           │  │
│  │  lib/dql/scenarios*.ts   60+ learning cases                  │  │
│  │  lib/dql/query-library   Codex reference data                │  │
│  │  lib/dpl/parser.ts       DPL pattern → RegExp compiler       │  │
│  │  lib/dpl/matchers.ts     DPL matcher type registry           │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data flow for a query execution
```
User types query
      │
      ▼
SandboxPage (TSX)
      │  setSandboxQuery()
      ▼
AppContext (dispatch SET_SANDBOX_QUERY)
      │
      ▼
User clicks Run
      │
      ▼
lib/dql/engine.ts  ←  lib/dql/commands.ts
  runPipeline(query, sampleData)
      │
      ▼
PipelineResult[]
      │  setSandboxResults()
      ▼
AppContext (dispatch SET_SANDBOX_RESULTS)
      │
      ▼
DataViewer component (Strato Table)
```

---

## 3. File & Directory Reference

```
dynatrace-app/
├── app.config.json          Dynatrace app identity & API scopes
├── package.json             Dependencies (strato-* only, no tailwind/framer)
├── tsconfig.json            Strict TypeScript 5
├── vite.config.ts           @dynatrace/app-toolkit defineConfig
├── index.html               HTML shell
│
└── src/
    ├── main.tsx             ReactDOM.createRoot entry
    ├── App.tsx              <AppRoot> + <AppProvider> + <AppRouter>
    ├── AppRouter.tsx        Phase-based page switcher (lazy loaded)
    │
    ├── types/
    │   └── app.types.ts     All shared TypeScript interfaces & unions
    │
    ├── context/
    │   └── AppContext.tsx   useReducer state + all action creators
    │
    ├── hooks/
    │   ├── useAppState.ts   Re-export shim for consumer imports
    │   └── useLocalStorage.ts  Generic hook + usePersistedProgress()
    │
    ├── styles/
    │   └── globals.css      Animations, layout helpers, DQL syntax colors
    │
    ├── pages/               One file per phase (lazy-loaded chunks)
    │   ├── LandingPage.tsx
    │   ├── CodexPage.tsx
    │   ├── SandboxPage.tsx
    │   ├── VisualizePage.tsx
    │   ├── CasesPage.tsx
    │   └── ArcadePage.tsx
    │
    ├── components/          Reusable UI — always use Strato imports
    │   ├── Navigation.tsx
    │   ├── PipelineBuilder.tsx
    │   ├── DataViewer.tsx
    │   ├── CaseNarrative.tsx
    │   └── games/
    │       ├── TimerGame.tsx
    │       ├── PipelineGame.tsx
    │       ├── McqGame.tsx
    │       ├── DplMatcherGame.tsx
    │       └── DplBuilderGame.tsx
    │
    └── lib/                 Copied verbatim from dql-investigator repo
        ├── dql/             Pure TS — no framework imports
        └── dpl/             Pure TS — no framework imports
```

---

## 4. Component Library Rules

### Rule 1 — ONLY Strato for UI
Every interactive element and layout primitive must come from
`@dynatrace/strato-components-full` or `@dynatrace/strato-icons`.

```tsx
// ✅ Correct
import { Button }       from '@dynatrace/strato-components-full';
import { ChevronRightIcon } from '@dynatrace/strato-icons';

// ❌ Wrong — never use HTML elements for interactive UI
<button onClick={…}>Click</button>
<input type="text" />
<select>…</select>
```

### Rule 2 — No external styling libs
```tsx
// ✅ Correct — inline styles or globals.css classes
<Flex style={{ padding: '1rem' }}>…</Flex>

// ❌ Wrong — tailwind, emotion, styled-components, etc.
<div className="p-4 flex">…</div>
```

### Rule 3 — Strato import path
```tsx
// ✅ Use the full bundle import for simplicity
import { Button, Flex, Heading, Text, Table } from '@dynatrace/strato-components-full';

// Alternative — per-package imports (smaller bundles if tree-shaking works)
import { Button } from '@dynatrace/strato-components/buttons';
import { Flex }   from '@dynatrace/strato-components/layouts';
```

### Strato Component Catalog (commonly used)

| Category | Components |
|----------|-----------|
| **Buttons** | `Button`, `IconButton`, `ToggleButton`, `ButtonGroup` |
| **Inputs** | `TextInput`, `TextArea`, `Select`, `SelectOption`, `Checkbox`, `RadioGroup`, `Toggle` |
| **Layout** | `Flex`, `Grid`, `Container`, `Divider` |
| **Panels** | `Surface`, `Modal`, `Drawer`, `Popover`, `Tooltip` |
| **Navigation** | `Tabs`, `Tab`, `Breadcrumbs`, `NavigationItem` |
| **Data** | `Table`, `TableColumn`, `List`, `DataTable` |
| **Feedback** | `Toast`, `ProgressCircle`, `ProgressBar`, `Badge` |
| **Typography** | `Heading`, `Text`, `Code`, `Label` |
| **App** | `AppRoot`, `AppHeader`, `AppFooter` |

### Icon usage
```tsx
import { SearchIcon, FilterIcon, TrashIcon } from '@dynatrace/strato-icons';

// Pass as child to Button for icon+label
<Button><FilterIcon /> Filter</Button>

// Or use IconButton for icon-only
<IconButton aria-label="Delete"><TrashIcon /></IconButton>
```

---

## 5. State Management

### Shape (`AppState` in `src/types/app.types.ts`)
```typescript
{
  currentPhase:      Phase;           // 'landing' | 'codex' | 'sandbox' | ...
  currentGameMode:   GameMode | null;
  currentCaseId:     string | null;
  currentStepIndex:  number;
  sandboxQuery:      string;
  sandboxResults:    PipelineResult[];
  visualizeCommand:  DQLCommandName | null;
  visualizeStage:    number;
  caseProgress:      Record<string, CaseProgress>;
  gameScores:        GameScores;
  sandboxHistory:    string[];
  narrativeVisible:  boolean;
  showHints:         boolean;
  codexSection:      string;
}
```

### Action creators (from `useAppContext()`)
```typescript
navigate(phase)                                  // Switch top-level phase
openCase(caseId)                                 // Enter a case
closeCase()                                      // Return to case selector
setGame(mode | null)                             // Enter / exit a game
setSandboxQuery(query)                           // Update editor content
setSandboxResults(results)                       // Update result table
recordSandboxQuery(query)                        // Save to history + dispatch
setVisualizeCommand(cmd | null)                  // Pick command to visualize
advanceVisualizeStage()                          // Next animation step
completeStep(caseId, stepIndex, totalSteps)     // Mark step done
completeCase(caseId)                             // Mark case complete
updateGameScore(game, score)                     // Update high score
toggleNarrative()                                // Show/hide case sidebar
toggleHints()                                    // Show/hide hints
setCodexSection(section)                         // Switch codex tab
```

### Consuming state in a component
```tsx
import { useAppContext } from '../context/AppContext';

export function MyComponent() {
  const { state, navigate, openCase } = useAppContext();

  return (
    <Button onClick={() => navigate('sandbox')}>
      Open Sandbox
    </Button>
  );
}
```

---

## 6. Adding a New Case

1. Open `src/lib/dql/scenarios.ts`
2. Add a new `Scenario` object following the existing pattern:

```typescript
{
  id: 'case-XXX',
  title: 'Short title',
  company: 'ACME Corp',
  briefing: 'Multi-line incident description…',
  difficulty: 'Intermediate',
  track: 'dql',
  tier: 'free',
  tags: ['logs', 'filter'],
  steps: [
    {
      id: 'step-1',
      title: 'Step title',
      narration: 'What the investigator does and why.',
      lesson: 'Conceptual explanation of the DQL technique used.',
      goal: 'Human-readable description of what the query must produce.',
      hint: 'Partial query or direction to guide the user.',
      sampleData: generateAuthLogs({ seed: 42, count: 100 }),  // from log-generator
      expectedPipeline: [
        { id: 's1', command: 'fetch', args: { dataObject: 'logs' }, raw: 'fetch logs' },
        { id: 's2', command: 'filter', args: { condition: 'loglevel == "ERROR"' },
          raw: '| filter loglevel == "ERROR"' },
      ],
    },
  ],
}
```

3. Import the new scenario in `CasesPage.tsx` (or the shared scenarios index).
4. No other changes needed — the CasesPage reads all scenarios dynamically.

---

## 7. Adding a New Mini-Game

1. Create `src/components/games/MyGame.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { Flex, Heading, Text, Button } from '@dynatrace/strato-components-full';
import { useAppContext } from '../../context/AppContext';

interface MyGameProps {
  onComplete: (score: number) => void;
}

export function MyGame({ onComplete }: MyGameProps) {
  const [score, setScore] = useState(0);

  // …game logic…

  return (
    <Flex flexDirection="column">
      <Heading level={3}>My Game</Heading>
      {/* All UI uses Strato components */}
      <Button onClick={() => onComplete(score)}>Finish</Button>
    </Flex>
  );
}
```

2. Add a new `GameMode` literal to `src/types/app.types.ts`:
```typescript
export type GameMode =
  | 'timer' | 'pipeline' | 'mcq' | 'dpl-matcher' | 'dpl-builder'
  | 'my-game';   // ← add here
```

3. Register in `ArcadePage.tsx` — add a card in the game menu and render the
   component when `state.currentGameMode === 'my-game'`.

4. When the game ends, call `updateGameScore('myGame', score)` from
   `useAppContext()` to persist the high score.

---

## 8. Extending the DQL Engine

The engine lives in `src/lib/dql/commands.ts`.

### Adding a new command

```typescript
// In commands.ts, register in the COMMAND_MAP object:
export const COMMAND_MAP: Record<DQLCommandName, CommandHandler> = {
  // …existing handlers…
  myNewCommand: handleMyNewCommand,
};

function handleMyNewCommand(
  records: DQLRecord[],
  args: Record<string, unknown>,
): DQLRecord[] {
  // Transform records and return new array
  return records.filter(/* … */);
}
```

Then add `'myNewCommand'` to the `DQLCommandName` union in `src/types/app.types.ts`.

---

## 9. DPL Pattern Syntax Quick Reference

DPL patterns compile to JavaScript RegExp with named capture groups.

### Built-in matchers
| Matcher | Matches | Capture type |
|---------|---------|--------------|
| `INT:name` | Signed integer | `number` |
| `LONG:name` | 64-bit integer | `number` |
| `FLOAT:name` | Floating-point | `number` |
| `STRING:name` | Any non-space text | `string` |
| `IPADDRESS:name` | IPv4 or IPv6 | `string` |
| `DATETIME:name` | ISO or common date/time | `string` |
| `BOOL:name` | true/false | `boolean` |
| `UUID:name` | UUID v4 | `string` |
| `EMAIL:name` | Email address | `string` |
| `WORD:name` | Single word (a-z A-Z 0-9 _) | `string` |
| `ANYTHING:name` | Any characters (greedy) | `string` |

### Pattern examples
```
Failed login from IPADDRESS:ip for user STRING:user
Response time INT:ms ms on endpoint STRING:path
DATETIME:ts [STRING:level] STRING:service - STRING:message
```

---

## 10. Testing Strategy

### Unit tests — DQL Engine
```typescript
// src/lib/dql/__tests__/engine.test.ts
import { runPipeline } from '../engine';

test('filter reduces rows', () => {
  const data = [{ level: 'ERROR' }, { level: 'INFO' }];
  const results = runPipeline('fetch logs | filter level == "ERROR"', data);
  expect(results.at(-1)?.records).toHaveLength(1);
});
```

### Component tests (when Strato testing utils are available)
```typescript
// Test that Strato components render without errors
import { render } from '@testing-library/react';
import { AppRoot } from '@dynatrace/strato-components-full';
import { LandingPage } from '../pages/LandingPage';

test('LandingPage renders', () => {
  render(<AppRoot><LandingPage /></AppRoot>);
});
```

### End-to-end flows to verify manually
1. Navigate all 5 phases from LandingPage
2. Execute a query in Sandbox, verify results table
3. Complete a full case (all steps), verify progress persists after reload
4. Play each mini-game, verify high score persists
5. Reload app — verify progress, history, scores are restored from localStorage

---

## 11. Deployment

### Local development
```bash
cd dynatrace-app
npm install
npm start        # starts dev server with hot-reload
```

### Build for production
```bash
npm run build    # outputs to dist/
```

### Deploy to Dynatrace
```bash
npm run deploy   # requires DT_API_TOKEN environment variable
                 # deploys to the configured Dynatrace environment
```

### Environment variables
| Variable | Required | Purpose |
|----------|----------|---------|
| `DT_APP_ID` | Yes | App identifier |
| `DT_API_TOKEN` | Yes | Deployment API token |
| `DT_ENV_URL` | Yes | Target Dynatrace environment URL |

---

## 12. Performance Targets

| Metric | Target |
|--------|--------|
| Initial JS bundle (gzipped) | < 400 KB |
| All scenarios loaded | < 800 KB total |
| Query execution (sandbox) | < 100 ms p95 |
| Page switch animation | < 200 ms |
| Visualize animation FPS | ≥ 60 fps |
| localStorage read/write | < 10 ms |

### Optimisation levers
- Pages are lazy-loaded (`React.lazy`) — only the active phase is in memory
- Scenario data loaded lazily per case (`import()` dynamic)
- `React.memo` on case cards (60+ may re-render on progress updates)
- `useMemo` for filtered/sorted case lists
- CSS keyframes instead of JS animations (off main thread)

---

## 13. Accessibility Checklist

- [ ] All interactive elements reachable by keyboard (Tab / Shift-Tab)
- [ ] Focus ring visible on all Strato interactive components
- [ ] All icons have `aria-label` when used standalone (IconButton)
- [ ] Color not the only indicator of state (red row also shows text "removed")
- [ ] Game timers announced via `aria-live` region
- [ ] Modals / Drawers trap focus and restore on close (Strato handles this)
- [ ] Sufficient contrast ratio ≥ 4.5:1 (Strato design tokens enforce this)

---

## 14. Roadmap

| Priority | Feature | Effort |
|----------|---------|--------|
| High | Real Dynatrace data in Sandbox (query live environment) | L |
| High | Custom case creation UI | XL |
| Medium | Progress sharing (export/import JSON) | S |
| Medium | Multiplayer timer race (WebSocket) | XL |
| Low | Mobile-optimised layout | M |
| Low | Dark/light theme toggle | S |
| Low | Keyboard shortcut overlay (Ctrl-?) | S |

---

*Last updated: 2026-05-15 — Phase A complete*
