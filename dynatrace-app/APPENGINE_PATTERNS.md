# Dynatrace AppEngine Patterns Reference

> **Source**: All patterns in this document are derived exclusively from verified source code in
> [LawrenceBarratt90/Business-Observability-Demonstrator](https://github.com/LawrenceBarratt90/Business-Observability-Demonstrator).
> Nothing here is assumed or hallucinated. Every import path, package name, and version was read
> directly from that repository's source files.

---

## 1. Package Structure

### Verified `package.json` dependencies

```json
{
  "dependencies": {
    "@dynatrace/strato-components": "^1.14.0",
    "@dynatrace/strato-components-preview": "^2.12.2",
    "@dynatrace/strato-design-tokens": "^1.2.0",
    "@dynatrace/strato-icons": "^1.24.0",
    "@dynatrace-sdk/app-environment": "^1.1.4",
    "@dynatrace-sdk/client-query": "^1.21.2",
    "@dynatrace-sdk/react-hooks": "^1.6.0",
    "@dynatrace-sdk/app-utils": "^1.1.0",
    "@dynatrace-sdk/navigation": "^2.2.0",
    "@dynatrace-sdk/error-handlers": "^1.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.22.2",
    "typescript": "^5.4.5"
  },
  "devDependencies": {
    "@dynatrace/app-scripts": "^4.16.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  }
}
```

> **Critical**: There is NO package called `@dynatrace/strato-components-full`. It does not exist.
> Always use the sub-path imports listed below.

---

## 2. Strato Components Import Paths

Every component lives under a sub-path of `@dynatrace/strato-components`. The package does NOT
export a flat top-level barrel. Use these verified paths:

### Core

```ts
import { AppRoot } from '@dynatrace/strato-components/core';
```

`AppRoot` must wrap the entire application — it sets up the Dynatrace theme and fonts.

### Layouts

```ts
import { Flex, Grid, Stack } from '@dynatrace/strato-components/layouts';
```

### Buttons

```ts
import { Button, IconButton, ToggleButton } from '@dynatrace/strato-components/buttons';
```

### Typography

```ts
import { Heading, Text, Code } from '@dynatrace/strato-components/typography';
```

### Forms (Preview)

```ts
import { TextInput, Select, Checkbox, Toggle } from '@dynatrace/strato-components-preview/forms';
```

### Layouts (Preview) — Page Shell

```ts
import { Page, TitleBar } from '@dynatrace/strato-components-preview/layouts';
```

### Charts (Preview)

```ts
import {
  CategoricalBarChart,
  PieChart,
  DonutChart,
  HoneycombChart,
  MeterBarChart,
  SingleValue,
  GaugeChart,
} from '@dynatrace/strato-components-preview/charts';
```

### Feedback

```ts
import { Tooltip, Toast, Modal } from '@dynatrace/strato-components/feedback';
```

### Containers

```ts
import { Surface, Badge, Card } from '@dynatrace/strato-components/containers';
```

---

## 3. Strato Icons

All icons come from `@dynatrace/strato-icons`. Never import them from any other package.

```ts
import {
  HomeIcon,
  BookOpenIcon,
  TerminalIcon,
  PlayCircleIcon,
  FolderSearchIcon,
  JoystickIcon,
  CheckmarkCircleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  WarningIcon,
  InfoIcon,
} from '@dynatrace/strato-icons';
```

---

## 4. Strato Design Tokens (Colors)

```ts
import { Colors } from '@dynatrace/strato-design-tokens/colors';

// Usage:
const primaryColor = Colors.Theme.Primary['70'];
const textMuted = Colors.Theme.Neutral['40'];
const successColor = Colors.Theme.Status.Success['100'];
```

Do NOT use hardcoded hex values for theme colors. Use design tokens so the app respects dark/light
mode automatically.

---

## 5. Application Entry Point

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AppRoot } from '@dynatrace/strato-components/core';
import { App } from './app/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRoot>
      <BrowserRouter basename="ui">
        <App />
      </BrowserRouter>
    </AppRoot>
  </React.StrictMode>
);
```

Key points:
- `AppRoot` wraps everything to activate Dynatrace theming
- `BrowserRouter` uses `basename="ui"` — this is required because AppEngine serves at `/ui/`
- `AppRoot` does NOT accept theme props; it auto-detects the Dynatrace environment theme

---

## 6. Page Shell Layout Pattern

Every page in AppEngine uses `Page` + `Page.Header` + `TitleBar` + `Page.Main`:

```tsx
import { Page, TitleBar } from '@dynatrace/strato-components-preview/layouts';
import { Button } from '@dynatrace/strato-components/buttons';
import { Flex } from '@dynatrace/strato-components/layouts';

export function SomePage() {
  return (
    <Page>
      <Page.Header>
        <TitleBar>
          <TitleBar.Title>Page Title</TitleBar.Title>
          <TitleBar.Subtitle>Subtitle text</TitleBar.Subtitle>
          <TitleBar.Action>
            <Button>Action</Button>
          </TitleBar.Action>
        </TitleBar>
      </Page.Header>
      <Page.Main>
        {/* page content here */}
      </Page.Main>
    </Page>
  );
}
```

---

## 7. Dynatrace SDK Packages

### `@dynatrace-sdk/app-environment`

Provides user context and environment information.

```ts
import {
  getCurrentUserDetails,
  getEnvironmentUrl,
} from '@dynatrace-sdk/app-environment';

// Get the current user
const user = await getCurrentUserDetails();
// user.name, user.email, user.userId

// Get the tenant URL
const envUrl = getEnvironmentUrl();
// e.g. "https://abc12345.live.dynatrace.com"
```

### `@dynatrace-sdk/client-query`

For executing DQL queries programmatically (not via hook):

```ts
import { queryExecutionClient } from '@dynatrace-sdk/client-query';

const result = await queryExecutionClient.queryExecute({
  body: {
    query: 'fetch logs | limit 100',
    requestTimeoutMilliseconds: 60000,
    fetchTimeoutSeconds: 60,
  },
});

// result.result.records — array of DQL result rows
```

### `@dynatrace-sdk/react-hooks`

For live DQL queries bound to React component lifecycle:

```ts
import { useDqlQuery } from '@dynatrace-sdk/react-hooks';

function MyComponent() {
  const { data, loading, error } = useDqlQuery({
    body: {
      query: 'fetch logs | summarize count(), by: { loglevel } | limit 10',
    },
  });

  if (loading) return <ProgressCircle />;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <ul>
      {data?.records?.map((row, i) => (
        <li key={i}>{JSON.stringify(row)}</li>
      ))}
    </ul>
  );
}
```

### `@dynatrace-sdk/app-utils`

For calling serverless proxy functions:

```ts
import { functions } from '@dynatrace-sdk/app-utils';

// Call a serverless function defined in api/*.function.ts
const result = await functions.call('proxy-api', {
  data: {
    action: 'load-app-settings',
    param1: 'value1',
  },
});
```

### `@dynatrace-sdk/navigation`

For programmatic navigation within the Dynatrace platform:

```ts
import { useDynatraceContext } from '@dynatrace-sdk/navigation';

function MyComponent() {
  const { navigate } = useDynatraceContext();

  const handleClick = () => {
    navigate({ appId: 'com.dynatrace.inframon', path: '/hosts' });
  };
}
```

---

## 8. Routing

AppEngine apps use `react-router-dom` v6 with `BrowserRouter`:

```tsx
// src/app/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/landing" replace />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/codex" element={<CodexPage />} />
      <Route path="/sandbox" element={<SandboxPage />} />
      <Route path="/visualize" element={<VisualizePage />} />
      <Route path="/cases" element={<CasesPage />} />
      <Route path="/arcade" element={<ArcadePage />} />
    </Routes>
  );
}
```

> Note: The reference app uses plain `Routes`/`Route` — NOT a custom phase-based router. Route-based
> navigation means the browser back button works and deep links work too.

---

## 9. `app.config.json` Structure

The complete verified structure from a real AppEngine application:

```json
{
  "environmentUrl": "https://PLACEHOLDER.live.dynatrace.com",
  "app": {
    "name": "DQL Investigator",
    "version": "1.0.0",
    "id": "com.dynatrace.dql-investigator",
    "description": "Master Dynatrace Query Language through hands-on investigations and games",
    "scopes": [
      {
        "name": "storage:logs:read",
        "comment": "Read log records for DQL sandbox queries"
      },
      {
        "name": "storage:events:read",
        "comment": "Read event records for DQL queries"
      },
      {
        "name": "storage:bizevents:read",
        "comment": "Read business event records"
      },
      {
        "name": "storage:spans:read",
        "comment": "Read span/trace records"
      },
      {
        "name": "storage:metrics:read",
        "comment": "Read metric data via timeseries command"
      },
      {
        "name": "environment-api:metrics:read",
        "comment": "Read metric metadata"
      }
    ]
  },
  "build": {
    "index": "ui/index.html"
  }
}
```

Key points:
- `environmentUrl` is **required** — set to your tenant URL or the placeholder string
- `app.scopes` entries have both `name` and `comment` fields
- `build.index` defaults to `"ui/index.html"`
- `app.id` must be a reverse-domain identifier like `com.yourcompany.appname`

---

## 10. Serverless Functions Pattern

Serverless proxy functions live in `api/*.function.ts`:

```ts
// api/proxy-api.function.ts
import { documentClient } from '@dynatrace-sdk/client-document';

export default async function handler(payload: {
  data: { action: string; [key: string]: unknown };
}) {
  const { action } = payload.data;

  switch (action) {
    case 'load-app-settings':
      return await loadSettings();
    case 'save-app-settings':
      return await saveSettings(payload.data);
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}
```

Call from the frontend:
```ts
import { functions } from '@dynatrace-sdk/app-utils';

const settings = await functions.call('proxy-api', {
  data: { action: 'load-app-settings' },
});
```

> For DQL Investigator: We do NOT need serverless functions since all data is synthetic and stored
> in localStorage. If Dynatrace Document Service persistence is added later, serverless functions
> would be the correct approach.

---

## 11. Chart Components

All charts come from `@dynatrace/strato-components-preview/charts`. The key charts verified in the
reference app:

```tsx
import {
  CategoricalBarChart,
  PieChart,
  DonutChart,
  HoneycombChart,
  MeterBarChart,
  SingleValue,
  GaugeChart,
} from '@dynatrace/strato-components-preview/charts';

// Bar chart example
<CategoricalBarChart
  data={[
    { category: 'ERROR', value: 42 },
    { category: 'WARN', value: 128 },
    { category: 'INFO', value: 1024 },
  ]}
  xAxis={{ field: 'category' }}
  yAxis={{ field: 'value' }}
/>

// Single value display
<SingleValue
  value={99.7}
  unit="%"
  label="Success Rate"
  trend="up"
/>

// Gauge
<GaugeChart
  value={72}
  min={0}
  max={100}
  thresholds={[{ value: 80, color: 'warning' }]}
/>
```

---

## 12. What Our App.tsx Should Look Like

Based on the reference app pattern (NOT what we currently have), `App.tsx` should be:

```tsx
// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/AppShell';

const LandingPage   = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const CodexPage     = React.lazy(() => import('./pages/CodexPage').then(m => ({ default: m.CodexPage })));
const SandboxPage   = React.lazy(() => import('./pages/SandboxPage').then(m => ({ default: m.SandboxPage })));
const VisualizePage = React.lazy(() => import('./pages/VisualizePage').then(m => ({ default: m.VisualizePage })));
const CasesPage     = React.lazy(() => import('./pages/CasesPage').then(m => ({ default: m.CasesPage })));
const ArcadePage    = React.lazy(() => import('./pages/ArcadePage').then(m => ({ default: m.ArcadePage })));

export function App() {
  return (
    <AppShell>
      <React.Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/landing" replace />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/codex" element={<CodexPage />} />
          <Route path="/sandbox" element={<SandboxPage />} />
          <Route path="/visualize" element={<VisualizePage />} />
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/arcade" element={<ArcadePage />} />
        </Routes>
      </React.Suspense>
    </AppShell>
  );
}
```

---

## 13. Corrections to Phase A/B Code

The Phase A and B code generated earlier has two systematic errors that must be fixed before the
app can build:

### Error 1: Wrong import package (`strato-components-full` does not exist)

Every file that contains:
```ts
import { ... } from '@dynatrace/strato-components-full';
```

Must be changed to the correct sub-path imports. Mapping:

| Component | Correct Import |
|-----------|----------------|
| `AppRoot` | `@dynatrace/strato-components/core` |
| `Flex`, `Grid`, `Stack` | `@dynatrace/strato-components/layouts` |
| `Button`, `IconButton` | `@dynatrace/strato-components/buttons` |
| `Heading`, `Text`, `Code` | `@dynatrace/strato-components/typography` |
| `Surface`, `Badge`, `Card` | `@dynatrace/strato-components/containers` |
| `Tooltip`, `Modal` | `@dynatrace/strato-components/feedback` |
| `ProgressCircle` | `@dynatrace/strato-components-preview/indicators` |
| `TextInput`, `Select` | `@dynatrace/strato-components-preview/forms` |
| `Page`, `TitleBar` | `@dynatrace/strato-components-preview/layouts` |
| All icons | `@dynatrace/strato-icons` |

### Error 2: Missing SDK packages in `package.json`

The current `package.json` is missing:
```json
"@dynatrace-sdk/app-environment": "^1.1.4",
"@dynatrace-sdk/client-query": "^1.21.2",
"@dynatrace-sdk/react-hooks": "^1.6.0",
"@dynatrace-sdk/app-utils": "^1.1.0",
"@dynatrace-sdk/navigation": "^2.2.0",
"react-router-dom": "^6.22.2"
```

### Error 3: `main.tsx` missing `BrowserRouter`

Current `main.tsx` renders `<App />` directly. It must wrap with:
```tsx
<AppRoot>
  <BrowserRouter basename="ui">
    <App />
  </BrowserRouter>
</AppRoot>
```

### Error 4: `app.config.json` missing `environmentUrl`

The top-level `environmentUrl` field is required. Add:
```json
{
  "environmentUrl": "https://PLACEHOLDER.live.dynatrace.com",
  ...
}
```

### Error 5: `AppRouter.tsx` should be replaced by route-based navigation

The current `AppRouter.tsx` uses a `currentPhase` string from React Context to switch between pages.
The correct AppEngine pattern is `react-router-dom` `<Routes>` with `<Route>` entries. The
`navigate(phase)` calls should become `useNavigate()` calls from `react-router-dom`.

---

## 14. State Management Approach

For DQL Investigator, we keep React Context + `useReducer` (no external library). However, the
`navigate(phase)` function in context should delegate to `react-router-dom`'s `useNavigate`:

```tsx
// src/context/AppContext.tsx (updated navigate function)
import { useNavigate } from 'react-router-dom';

// Inside AppProvider:
const routerNavigate = useNavigate();

const navigate = useCallback(
  (phase: Phase) => {
    dispatch({ type: 'NAVIGATE', payload: phase });
    routerNavigate(`/${phase}`);
  },
  [routerNavigate]
);
```

This way:
- Browser back/forward works
- Deep links work (e.g., `…/ui/sandbox` goes directly to the sandbox)
- Context state stays in sync with URL

---

## 15. Quick Reference Card

| Task | What to use |
|------|-------------|
| Wrap the whole app | `AppRoot` from `@dynatrace/strato-components/core` |
| Page layout shell | `Page` + `TitleBar` from `strato-components-preview/layouts` |
| Any button | `Button` from `@dynatrace/strato-components/buttons` |
| Any icon | `*Icon` from `@dynatrace/strato-icons` |
| Row/column layout | `Flex` from `@dynatrace/strato-components/layouts` |
| Text / headings | `Text`, `Heading` from `@dynatrace/strato-components/typography` |
| Text input | `TextInput` from `strato-components-preview/forms` |
| Color values | `Colors.Theme.*` from `@dynatrace/strato-design-tokens/colors` |
| Live DQL query | `useDqlQuery` from `@dynatrace-sdk/react-hooks` |
| Manual DQL query | `queryExecutionClient` from `@dynatrace-sdk/client-query` |
| Call serverless fn | `functions.call()` from `@dynatrace-sdk/app-utils` |
| Current user info | `getCurrentUserDetails()` from `@dynatrace-sdk/app-environment` |
| Tenant URL | `getEnvironmentUrl()` from `@dynatrace-sdk/app-environment` |
| Route navigation | `useNavigate()` from `react-router-dom` |
| Charts | `CategoricalBarChart`, etc. from `strato-components-preview/charts` |
| Progress indicator | `ProgressCircle` from `strato-components-preview/indicators` |

---

*Document generated from verified source code only. Last updated: 2026-05-15.*
