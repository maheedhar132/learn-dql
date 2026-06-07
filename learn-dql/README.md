# learn-dql app

Interactive DQL/DPL learning app built on Dynatrace AppEngine. Teaches Dynatrace Query Language through guided lessons, a sandbox, and Log Hunt investigation scenarios — all running offline in the browser.

---

## Prerequisites

- Node.js ≥ 16.13.0
- A Dynatrace environment with AppEngine enabled (required for deployment; local dev works without it)
- `dt-app` CLI — installed automatically as a dev dependency

---

## Quick start

```bash
npm install
npm run start        # starts dt-app dev server
```

The dev server (`dt-app dev`) opens a browser tab connected to the environment in `app.config.json`. Edit any file under `ui/` and the page hot-reloads.

---

## Scripts

| Command | Underlying call | Purpose |
|---|---|---|
| `npm run start` | `dt-app dev` | Local development server with hot reload |
| `npm run build` | `dt-app build` | Production build → `dist/` |
| `npm run deploy` | `dt-app deploy` | Build + upload to target environment |
| `npm run uninstall` | `dt-app uninstall` | Remove app from target environment |
| `npm run lint` | `eslint .` | Lint the project |
| `npm run update` | `dt-app update` | Upgrade `@dynatrace-scoped` packages |
| `npm run info` | `dt-app info` | Show CLI + environment versions |
| `npm run help` | `dt-app help` | List all dt-app commands |

> This repository is **dev-only**. `deploy` and `uninstall` should not be run against production environments.

---

## App manifest

`app.config.json` controls the app identity and target environment:

```json
{
  "environmentUrl": "https://<your-env>.apps.dynatrace.com/",
  "app": {
    "name": "learn-dql",
    "version": "0.0.0",
    "id": "my.learn.dql",
    "scopes": [
      { "name": "storage:logs:read" },
      { "name": "storage:buckets:read" }
    ]
  }
}
```

Change `environmentUrl` and `app.id` before deploying to a different environment.

---

## Project structure

```
ui/
└── app/
    ├── App.tsx              # Route definitions
    ├── index.tsx            # Entry point
    ├── components/
    │   ├── AppShell.tsx     # Top nav + layout wrapper
    │   └── ResultTable.tsx  # Query result renderer with column actions
    ├── pages/
    │   ├── Home.tsx         # Progress overview + resume/hunt widgets
    │   ├── Learn.tsx        # Lesson catalogue with filters
    │   ├── CasePlayer.tsx   # Step-by-step lesson player
    │   ├── Sandbox.tsx      # Free-form DQL editor (2,200 sample records)
    │   ├── LogHunt.tsx      # Investigation scenario list
    │   └── LogHuntPlayer.tsx# Hunt player with sandbox + MCQ verdict
    └── lib/
        ├── dql/
        │   ├── parser.ts                # DQL text → pipeline stages
        │   ├── commands.ts              # Command executors (fetch, filter, summarize, …)
        │   ├── engine.ts                # runPipeline orchestrator
        │   ├── log-generator.ts         # Deterministic seeded sample data
        │   ├── scenarios.ts             # Core DQL lesson scenarios
        │   ├── scenarios-onboarding.ts  # 6 beginner onboarding lessons
        │   ├── scenarios-combined.ts    # Combined scenario export
        │   └── log-hunt-scenarios.ts    # 10 Log Hunt investigation scenarios
        ├── dpl/
        │   ├── parser.ts    # DPL pattern → RegExp
        │   └── matchers.ts  # Matcher registry
        ├── types/
        │   └── dql.ts       # Scenario, Step, PipelineStage, … types
        ├── validate.ts      # Result-based query validation + error diagnosis
        └── progress.ts      # localStorage progress (completedCases, completedHunts)
```

---

## How the offline engine works

All query execution runs in the browser against deterministic in-memory data — no live Grail queries.

1. `parsePipeline(query)` → `PipelineStage[]`
2. `runPipeline(stages, sampleData)` → `{ records, columns }`
3. `validateStep(userQuery, expectedPipeline, sampleData)` compares the user's result records to the expected result — not exact syntax. Multiple valid queries can pass the same step.

Progress is persisted in `localStorage` under the key `learn-dql.progress.v1`.

---

## References

- [Dynatrace App Toolkit quickstart](https://developer.dynatrace.com/quickstart/app-toolkit/)
- [Strato UI components](https://developer.dynatrace.com/develop/ui-components/)
- [DQL reference](https://docs.dynatrace.com/docs/discover-dynatrace/references/dynatrace-query-language)
- [Dynatrace Developer Portal](https://developer.dynatrace.com/)
