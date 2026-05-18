# learn-dql — Project Deck (Structure & Dynatrace SDK Correlation)

> Single source of truth for "what's what". Read this + `CLAUDE.md` before work.

---

## 0. TL;DR — there are TWO app folders, this is the key decision

| Folder | What it is | Strato | Tooling | State |
|---|---|---|---|---|
| `dynatrace-app/` | **Hand-rolled** earlier attempt. Rich pure-TS DQL/DPL engine, 60+ scenarios, custom AppContext. Pages are stubs. | v1/v2 (old) | manual Vite + `@dynatrace/app-scripts` | custom |
| `learn-dql/` | **Official `npx dt-app create` scaffold** (dt-app 1.9.0). Only a Home + Data sample page. Real Grail via `useDql`. | **v3 (current)** | official `dt-app` CLI | none yet |

**Go-forward base = `learn-dql/`** (official, current Strato, real Grail).
The valuable asset in `dynatrace-app/` is the **DQL engine + 60+ scenarios +
DPL parser** (pure TS, framework-agnostic) — candidate to port in. UI there is
NOT reusable (old Strato, custom shell). **Decision needed — see Questions.**

---

## 1. `learn-dql/` structure (the official scaffold)

```
learn-dql/
├── app.config.json        App identity, environmentUrl, Grail scopes
├── package.json           Scripts via dt-app CLI; deps = SDK + Strato only
├── eslint.config.mjs      Security-hardened ESLint (sdl, no-secrets, etc.)
├── tsconfig.eslint.json
├── .dt-app/               CLI internals: app.config.schema.json, logs
├── .vscode/               launch/tasks for dt-app dev
└── ui/
    ├── main.tsx           Entry: <AppRoot><BrowserRouter basename="ui">
    ├── tsconfig.json      TS5, strictNullChecks, react jsx
    └── app/
        ├── App.tsx        <Page> + <Page.Header> + <Page.Main> + Routes
        ├── components/
        │   ├── Header.tsx AppHeader + NavItems (react-router Links)
        │   └── Card.tsx   Flex + design-token styling demo
        └── pages/
            ├── Home.tsx   Landing (Cards, theme-aware assets)
            └── Data.tsx   DQLEditor + RunQueryButton + useDql + TimeseriesChart
```

### Build/run (run inside `learn-dql/`)
- `npm run start` → `dt-app dev` (hot reload, opens browser)
- `npm run build` → `dt-app build` → `dist/`
- `npm run deploy` → build + deploy to `environmentUrl` in app.config.json
- `npm run lint` → eslint (security plugins enforced)
- `create:function` / `create:action` → serverless backend (JS runtime)

### Runtime model
- Entry `ui/main.tsx`: `AppRoot` (Strato theme/context) → `BrowserRouter`
  basename `ui` → `App`.
- `App.tsx`: Strato `Page` shell. Add features = new `<Route>` + nav item in
  `Header.tsx` (the documented "Add Route" task).
- Data flow (the canonical pattern, see `Data.tsx`):
  `DQLEditor` (string state) → `RunQueryButton` → `useDql({query})` →
  `{data, error, isLoading, refetch, cancel}` → render with Strato charts/tables.

---

## 2. Hard constraints (confirmed from scaffold + AGENTS.md)

- **UI = Strato only.** No raw HTML interactive elements, no Tailwind/Framer/
  Recharts/styled-components, no other React UI libs. Even a text box =
  Strato `TextInput` (`@dynatrace/strato-components-preview/forms`), code
  entry = `DQLEditor`/`CodeEditor` (`/editors`).
- **Import rule:** never from package root. Always the category subpath:
  `import { Flex } from "@dynatrace/strato-components/layouts"`. Wrong:
  `from "@dynatrace/strato-components"`.
- **Styling = design tokens**, not ad-hoc CSS:
  `@dynatrace/strato-design-tokens/{colors,borders,box-shadows}`.
- **Data = Grail via DQL**, preferably the `useDql` hook (not the low-level
  client) in UI.
- "No React Native" — N/A here; this is React-DOM web. Constraint = use
  Strato components instead of rolling our own DOM widgets.
- ESLint security rules are enforced (no-secrets, no-unsanitized, sdl) —
  code must pass `npm run lint`.

---

## 3. Installed Dynatrace SDK & Strato packages (verified in node_modules)

### Strato (UI) — current major versions
| Package | Ver | Use |
|---|---|---|
| `@dynatrace/strato-components` | 3.5.0 | Stable primitives. Subdirs: `core` (AppRoot, useCurrentTheme), `layouts` (Flex, Grid, Container), `typography` (Heading, Text, Paragraph, Link), `buttons`, `tables`, `content`, `forms`, `overlays`, `navigation`, `charts`, `editors`, `filters`, `notifications` |
| `@dynatrace/strato-components-preview` | 3.4.0 | Richer set. `editors` (**DQLEditor**, CodeEditor), `charts` (TimeseriesChart, convertToTimeseries, PieChart, HoneycombChart, SingleValue), `tables` (DataTable, SimpleTable), `buttons` (**RunQueryButton**), `layouts` (**Page**, **AppHeader**, TitleBar), `forms` (TextInput, Select, Checkbox, Radio, Switch), `filters` (FilterBar, TimeframeSelector), `overlays` (Modal, Sheet, Tooltip), `content` (Accordion, Chip, MessageContainer) |
| `@dynatrace/strato-design-tokens` | 1.5.0 | colors / borders / box-shadows / spacing / typography tokens |
| `@dynatrace/strato-icons` | 2.3.0 | Icon set (e.g. `CriticalIcon`) |

> Note: AGENTS.md mentions `@dynatrace/strato-geo` (maps) — **not installed**.
> Per AGENTS.md, inspect component APIs via the `.d.ts` files under
> `node_modules/@dynatrace/strato-components[-preview]/<category>/<Component>/`.

### Dynatrace SDK (data/platform) — installed
| Package | Purpose |
|---|---|
| `@dynatrace-sdk/react-hooks` | **Preferred in UI.** `useDql`, `useDocument`, `useListDocuments`, `useAppState`/`useUserAppState`, `useSetAppState`/`useSetUserAppState`, `useAppFunction` |
| `@dynatrace-sdk/client-query` | Low-level Grail query (`queryClient.queryExecute`) — fallback to the hook |
| `@dynatrace-sdk/client-document` | Document service (store/share JSON, e.g. saved queries/progress) |
| `@dynatrace-sdk/client-state` | App/User State k-v store (progress, prefs — replaces localStorage) |
| `@dynatrace-sdk/app-environment` | App/env context (ids, urls, current user) |
| `@dynatrace-sdk/user-preferences` | Read user theme/lang/timezone (read-only) |
| `@dynatrace-sdk/units` | Human-readable value/unit formatting |
| `@dynatrace-sdk/navigation` | Cross-app navigation / Intents |
| `@dynatrace-sdk/error-handlers` | Standardized SDK error handling |
| also present | `client-app-settings(-v2)`, `client-document`, `client-iam`, `client-notification-v2`, `client-davis-analyzers`, `client-filter-segment-management`, `http-client`, `app-utils` |

### Mapping our needs → SDK
- DQL execution & validation → `useDql` (UI) / `client-query` (logic)
- Persist learner progress / scores → `client-state` + `useUserAppState`
  (NOT localStorage — there's no backend DB, App State is the store)
- Save/share solutions or "cases" → `client-document`
- Theme/locale-aware UI → `user-preferences` + `useCurrentTheme`
- Code entry box → `DQLEditor` (preview/editors)
- Run button with query lifecycle → `RunQueryButton` (preview/buttons)
- Results → `DataTable`/`SimpleTable` + charts (preview)

---

## 4. Target product recap ("Learn DQL" on Dynatrace hub)

Exercise-based, step-by-step DQL teaching. Each lesson = one command/function
+ short video/docs. **Result-based validation** (compare user query result to
a reference query result; any valid query passes). Difficulty ladder:
beginner module + intermediate JSON/audit-log module. Support ladder: instant
feedback → hints after repeated fails → full solution last resort. Visual
syntax-error + success states. Landing overview.

Maps cleanly onto the scaffold: routes per module, `DQLEditor` for input,
`useDql` for execution, `client-state` for progress, the `dynatrace-app`
engine/scenarios as the content + (offline) validation source if we don't
validate against live Grail.

---

## 5. Known issues / gaps found
- ✅ FIXED: `learn-dql/app.config.json` malformed `"name"` (was blocking
  `dt-app build`). Now `"name": "learn-dql"`.
- Scopes in scaffold are minimal: `storage:logs:read`, `storage:buckets:read`.
  Real product likely needs events/bizevents/spans/metrics + `state:*` +
  `document:*`. To be defined once data model is chosen.
- `environmentUrl` = `https://wkf10640.apps.dynatrace.com/` — confirm this is
  the user's real tenant for `dt-app dev`/deploy (dev needs a live env).
- `dynatrace-app/` engine uses old Strato types in its `lib/types` — the pure
  `lib/dql` + `lib/dpl` are framework-agnostic and portable; UI is not.

---

## 6. DECISIONS (locked 2026-05-18) — these are binding

1. **Go-forward base = `learn-dql/`** (official scaffold). Port the
   framework-agnostic `lib/dql` + `lib/dpl` + scenarios from
   `dynatrace-app/`. Old `dynatrace-app/` UI is discarded (do not build
   there). The old folder stays only as the engine/scenario donor.
2. **Validation = offline simulated engine.** Use the ported pure-TS DQL
   engine + deterministic sample data for query execution and result-based
   validation. Fully self-contained — no tenant/Grail data dependency.
   `useDql`/live Grail is NOT used for lesson validation.
3. **🚫 NEVER DEPLOY.** Tenant `wkf10640` is for local DEV ONLY. Allowed:
   `npm run start` (`dt-app dev`) and `npm run build` (`dt-app build`).
   **`npm run deploy` / `dt-app deploy` / `dt-app publish` / `uninstall`
   are STRICTLY FORBIDDEN — never run them under any circumstance.**

### Built so far (in `learn-dql/ui/app/`)
- `lib/dql/*`, `lib/dpl/*`, `lib/types/dql.ts` — ported engine (alias
  imports rewritten to relative `../types/dql`).
- `lib/validate.ts` — offline result-based validation (multiset compare,
  any correct query passes) + `pipelineToQuery` for "show solution".
- `lib/progress.ts` — localStorage progress (dev-only).
- Layout: `App.tsx` routes `/ /learn /learn/:caseId /sandbox`;
  `components/Header.tsx` AppHeader nav; `components/ResultTable.tsx`
  (Strato DataTable).
- Pages: `Home` (landing+stats), `Learn` (scenario browser by track),
  `CasePlayer` (step-by-step DQLEditor + Run + hint + solution; DPL steps
  shown read-only pending interactive DPL), `Sandbox` (free DQL on offline
  data). Sample `Data.tsx`/`Card.tsx` removed.
- `npx tsc -p ui/tsconfig.json` clean; `npm run build` (dt-app) green.
- Pending next: interactive DPL validation in CasePlayer; per-step
  progress UI; richer result diff.

### Resulting architecture
- Persistence: still need a store for progress/scores. App State
  (`client-state`/`useUserAppState`) requires a deployed app context;
  since we never deploy and run dev-only, **use `localStorage`** for
  progress in dev (revisit only if deploy ever happens).
- Scopes: offline engine needs **no Grail scopes** for validation. Keep
  scaffold scopes minimal; a future live "Sandbox" page (if added) would
  need `storage:*:read`.
- Fix `app.config.json` malformed `"name": "learn-dql\",` when first touched.
