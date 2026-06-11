# Learn DQL — v0.2.0

**The go-to platform for learning, practising, and retaining Dynatrace Query Language (DQL) — without worrying about costs.**

Built on Dynatrace AppEngine (Strato v3). Runs entirely in the browser with an offline DQL simulation engine.  No Grail DDU consumed during practice. Optional live-environment integration for real log schema discovery.

---

## Features at a glance

| Page | What it does |
|---|---|
| **Learn** (`/learn`) | 50+ guided lessons across 18 modules — Beginner → Advanced |
| **Sandbox** (`/sandbox`) | Free-form DQL editor against seeded sample data |
| **Notebook** (`/notebook`) | Multi-cell DT-style notebook with 8 data sources, Run All, localStorage save |
| **Log Hunt** (`/log-hunt`) | 10 mystery investigation scenarios — write your own queries to crack the case |
| **Reference** (`/codex`) | 35+ searchable production-ready DQL patterns with copy-paste examples |
| **Settings** (`/settings`) | Live-Seed toggle: pull real log field schema from your DT environment |

---

## Curriculum coverage

All major DQL commands are taught interactively:

- **Data sources**: `fetch logs`, `fetch spans`, `fetch bizevents`, `fetch events`, `fetch metrics` (concept), `fetch dt.entity.*` (concept), `fetch dt.system.*` (free, concept)
- **Filtering**: `filter`, `filterOut`, `search`, compound `and`/`or`, `in` operator, `contains`, `startsWith`, `isNull`, `isNotNull`
- **Shaping**: `fields`, `fieldsAdd`, `fieldsRemove`, `fieldsRename`
- **Sorting & limiting**: `sort`, `limit`
- **Aggregation**: `summarize` with `count`, `sum`, `avg`, `min`, `max`, `median`, `percentile`, `countIf`, `countDistinct`
- **Grouping**: `by:{}` single and multi-field, `makeTimeseries` time buckets
- **Deduplication**: `dedup`
- **Parsing**: `parse` with JSON, KVP, and typed-capture (IPADDR, INT, LONG, DOUBLE, DATA, STRING, LD) patterns
- **Joining**: `join` (inner + leftOuter), `append` (union all), `lookup` (enrichment)
- **Expansion**: `expand` (array → rows), time functions (`getHour`)
- **Real investigations**: K8s crash analysis, audit trail, MITRE ATT&CK triage, infrastructure health, APM trace analysis

---

## Free vs charged data

| Query type | Cost | Approach in this app |
|---|---|---|
| `fetch logs / spans / bizevents / metrics` | DDU charged | **Seeded sample data** — fully offline |
| `fetch dt.system.query_executions` | **Free** | Live query (Settings → Reference page) |
| `fetch dt.entity.*` (host, service, process) | **Free** | Live query (Settings → Reference page) |
| All lesson scenarios | Zero | Offline simulation engine — no DDU |

---

## Live-Seed feature

Go to **Settings → Live Seed from Environment** and enable it. The app will:

1. Fetch 50 recent log records and 50 span records from your connected DT environment
2. Analyse the field names and types (no content stored — schema only)
3. Cache the schema in `localStorage`
4. Surface your real field names as suggestions in the Notebook and Sandbox

Default is **disabled**. Requires `storage:logs:read` and `storage:spans:read` scopes (already declared in `app.config.json`).

---

## Prerequisites

- Node.js ≥ 18
- A Dynatrace environment with AppEngine enabled (required for deployment; local dev works without it)
- `dt-app` CLI — installed automatically as a dev dependency

---

## Quick start

```bash
npm install
npm run start        # starts dt-app dev server on http://localhost:3000
```

The dev server (`dt-app dev`) opens a browser tab connected to the environment in `app.config.json`. Edit any file under `ui/` and the page hot-reloads.

---

## Scripts

| Command | Underlying call | Purpose |
|---|---|---|
| `npm run start` | `dt-app dev` | Local development server with hot reload |
| `npm run build` | `dt-app build` | Production bundle (output: `dist/`) |
| `npm run typecheck` | `tsc --noEmit` | TypeScript type checking |
| `npm run lint` | `eslint` | Lint source files |

---

## Project layout

```
learn-dql/
├── app.config.json          # App name, version (0.2.0), scopes, env URL
├── ui/
│   └── app/
│       ├── App.tsx           # Route definitions
│       ├── components/
│       │   ├── Header.tsx    # Navigation bar
│       │   └── ResultTable.tsx
│       ├── lib/
│       │   ├── dql/
│       │   │   ├── commands.ts       # Offline DQL command executor (parse, join, lookup, expand…)
│       │   │   ├── engine.ts         # Pipeline runner
│       │   │   ├── parser.ts         # DQL text → pipeline steps
│       │   │   ├── log-generator.ts  # 15+ deterministic sample data generators
│       │   │   ├── scenarios.ts      # 50+ interactive lesson scenarios
│       │   │   ├── scenarios-onboarding.ts
│       │   │   ├── log-hunt-scenarios.ts
│       │   │   └── query-library.ts  # 35+ reference queries (Codex)
│       │   ├── settings.ts   # App settings + LiveSeed schema types
│       │   ├── progress.ts   # localStorage progress tracking
│       │   ├── validate.ts   # Result-based query validation
│       │   └── types/
│       └── pages/
│           ├── Home.tsx        # Landing page with progress
│           ├── Learn.tsx       # Lesson catalog
│           ├── CasePlayer.tsx  # Interactive lesson player
│           ├── Sandbox.tsx     # Free-form DQL sandbox
│           ├── Notebook.tsx    # Multi-cell DT notebook
│           ├── LogHunt.tsx     # Hunt catalog
│           ├── LogHuntPlayer.tsx
│           ├── Codex.tsx       # DQL reference library
│           └── Settings.tsx    # Live-seed and app settings
```

---

## Offline engine

The simulation engine (`lib/dql/engine.ts` + `commands.ts`) implements:

- Full fetch → filter → shape → aggregate → sort → limit pipeline
- `parse` with JSON, KVP, and typed-capture group support
- `join` (inner + leftOuter), `append`, `lookup`, `expand`
- `makeTimeseries` time bucketing
- `summarize` with multi-aggregation, `countIf`, `countDistinct`, `percentile`, `median`
- All string, numeric, conditional, and time functions
- Result-based validation (any query producing the correct result set passes — multiple solutions accepted)

---

## Tech stack

- React 18 + TypeScript 5 strict
- Vite via `@dynatrace/app-scripts` (`dt-app`)
- UI: `@dynatrace/strato-components` v3 only — no Tailwind or third-party UI
- State: React hooks + localStorage (no backend)
- Routing: `react-router-dom` v6
