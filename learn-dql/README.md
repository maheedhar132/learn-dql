# Learn DQL

**The go-to platform for learning, practising, and retaining Dynatrace Query Language — without worrying about costs.**

Built as a native Dynatrace AppEngine app (Strato v3). Runs entirely in the browser using an offline DQL simulation engine. Zero Grail DDU consumed during practice. Optional live-environment integration for real log schema discovery.

---

## Getting started

**Step 1 — navigate into the app folder**

```bash
cd learn-dql
```

**Step 2 — install dependencies**

```bash
npm install
```

**Step 3 — start the development server**

```bash
npx dt-app dev
```

The dev server starts on `http://localhost:3000`. Open the URL printed in your terminal inside your Dynatrace environment to run the app with full AppEngine context.

> **Note:** `npm run start` is an alias for `npx dt-app dev` and works equally well once dependencies are installed.

---

## What's inside

| Page | What it does |
|---|---|
| **Home** (`/`) | Overview, progress tracker, quick links |
| **Learn** (`/learn`) | 42 guided lessons — Beginner → Advanced, result-based validation |
| **Log Hunt** (`/log-hunt`) | 30 story-driven investigations — write queries to crack the case |
| **Sandbox** (`/sandbox`) | Free-form DQL editor, 10 datasets, 2,200+ sample records |
| **Reference** (`/codex`) | 40+ production-ready DQL patterns, searchable, exportable to Notebook |
| **Notebook** (`/notebook`) | Multi-cell DT-style notebook with 8 data sources and localStorage save |
| **Settings** (`/settings`) | Live-Seed toggle — pull real field schema from your DT environment |

---

## How learning works

Write any query that produces the correct result and it passes. The validator checks your **result**, not your syntax — because that is how real DQL works and multiple correct solutions are always accepted.

The Log Hunt cases are story-driven investigations. You receive a dataset and a crime to solve. Coffee shop fraud. Hospital drug diversion. An insider threat in the Finance department. Each one uses a different set of DQL commands — `parse`, `dedup`, `makeTimeseries`, `iAny`, `expand`, `fieldsFlatten`, and more.

---

## Export to Dynatrace Notebook

Any query in the Reference library or the Sandbox can be exported directly to a Dynatrace Notebook in one click. A Markdown tile explaining what the query does is added above the DQL tile, ready to run. Select an existing notebook or create a new one — the app navigates you there automatically.

---

## Curriculum coverage

- **Data sources**: `fetch logs`, `fetch spans`, `fetch bizevents`, `fetch events`, `fetch dt.entity.*`, `fetch dt.system.*`
- **Filtering**: `filter`, `filterOut`, `search`, `in`, `contains`, `startsWith`, `isNull`, `isNotNull`
- **Shaping**: `fields`, `fieldsAdd`, `fieldsRemove`, `fieldsRename`, `fieldsFlatten`
- **Sorting & limiting**: `sort`, `limit`
- **Aggregation**: `summarize` with `count`, `sum`, `avg`, `min`, `max`, `median`, `percentile`, `countIf`, `countDistinct`
- **Grouping & timeseries**: `by:{}`, `makeTimeseries` with `interval`, `bins`, `default`, `time:`
- **Deduplication**: `dedup` with optional `sort:`
- **Parsing**: `parse` with JSON, KVP, and typed-capture patterns
- **Joining**: `join` (inner + leftOuter), `append` (union all), `lookup`, `joinNested`
- **Array operations**: `expand`, `iAny`, `arraySize`, `arraySort`, `arrayMovingAvg`, `arrayCumulativeSum`, `arrayDelta`

---

## Free vs charged data

| Query type | Cost | How this app handles it |
|---|---|---|
| `fetch logs / spans / bizevents / metrics` | DDU charged | Seeded sample data — fully offline |
| `fetch dt.system.*` | **Free** | Live query available via Settings |
| `fetch dt.entity.*` | **Free** | Live query available via Settings |
| All lesson and hunt scenarios | Zero | Offline simulation engine — no DDU |

---

## Project layout

```
learn-dql/
├── app.config.json               # App name, scopes, environment URL
├── package.json
└── ui/
    └── app/
        ├── App.tsx               # Route definitions
        ├── components/
        │   ├── Header.tsx
        │   ├── ResultTable.tsx
        │   └── AddToNotebookModal.tsx
        ├── lib/
        │   ├── notebook.ts       # Notebook JSON builder utilities
        │   ├── validate.ts       # Result-based query validation
        │   ├── settings.ts       # App settings + LiveSeed types
        │   └── dql/
        │       ├── commands.ts           # Offline DQL command executor
        │       ├── engine.ts             # Pipeline runner
        │       ├── parser.ts             # DQL text → pipeline steps
        │       ├── log-generator.ts      # 15+ deterministic sample data generators
        │       ├── scenarios.ts          # 42 interactive lesson scenarios
        │       ├── log-hunt-scenarios.ts # 30 Log Hunt investigation cases
        │       └── query-library.ts      # 40+ reference queries
        └── pages/
            ├── Home.tsx
            ├── Learn.tsx
            ├── CasePlayer.tsx
            ├── Sandbox.tsx
            ├── Notebook.tsx
            ├── LogHunt.tsx
            ├── LogHuntPlayer.tsx
            ├── Codex.tsx
            └── Settings.tsx
```

---

## Tech stack

- React 18 + TypeScript 5 strict
- Vite via `dt-app` (`@dynatrace/app-scripts`)
- UI: `@dynatrace/strato-components` v3 — no Tailwind, no third-party UI libraries
- SDKs: `@dynatrace-sdk/client-document`, `@dynatrace-sdk/navigation`, `@dynatrace-sdk/client-query`
- State: React hooks + `localStorage` — no backend, no database
- Routing: `react-router-dom` v6

---

## Required scopes

Declared in `app.config.json` — no manual setup needed:

| Scope | Purpose |
|---|---|
| `storage:logs:read` | Live-Seed feature |
| `storage:spans:read` | Live-Seed feature |
| `storage:events:read` | Reference queries |
| `storage:bizevents:read` | Reference queries |
| `storage:metrics:read` | Reference queries |
| `storage:system:read` | Free system queries |
| `storage:entities:read` | Free entity queries |
| `document:documents:read` | List notebooks for Add to Notebook |
| `document:documents:write` | Create / update notebooks |

---

---

*Built with ❤️ by Mahee and Claude*
