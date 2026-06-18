# learn-dql — v0.2.0

**The go-to platform for learning, practising, and retaining Dynatrace Query Language (DQL) — without worrying about costs.**

Built on Dynatrace AppEngine (Strato v3). Runs entirely in the browser with an offline DQL simulation engine.  No Grail DDU consumed during practice. Optional live-environment integration for real log schema discovery.

---

## Repo structure

| Path | Contents |
|---|---|
| `learn-dql/` | **The app** — Dynatrace AppEngine project (v0.2.0) |
| `dql-research/` | 9 reference docs: DQL overview, types, operators, commands, functions, best practices, examples, visual signatures, Grail architecture |
| `DQL_DPL_COMPREHENSIVE_GUIDE.md` | 1,294-line authored DQL/DPL reference guide |
| `CLAUDE.md` | Binding rules for AI-assisted development on this repo |

---

## App overview (`learn-dql/`)

| Page | What it does |
|---|---|
| **Home** (`/`) | Progress overview, resume widget, Log Hunt teaser |
| **Learn** (`/learn`) | 50+ guided lessons across 18 modules — Beginner → Advanced |
| **Sandbox** (`/sandbox`) | Free-form DQL editor against 8 seeded data sources |
| **Notebook** (`/notebook`) | Multi-cell DT-style notebook — query + text cells, Run All, localStorage persistence |
| **Log Hunt** (`/log-hunt`) | 10 mystery investigation scenarios — write your own queries to crack the case |
| **Reference** (`/codex`) | 35+ searchable production-ready DQL patterns, including free dt.system.* and entity queries |
| **Settings** (`/settings`) | Live-Seed toggle: fetch real log field schema from your connected DT environment |

All query execution runs in the browser against deterministic seeded data — no live Dynatrace environment needed.  
Free `dt.system.*` and `dt.entity.*` queries can run against your real environment with zero DDU cost.

---

## Prerequisites

- Node.js ≥ 16.13.0
- A Dynatrace environment (for deployment; development runs locally)
- `dt-app` CLI — installed automatically as a dev dependency via `npm install`

---

## Getting started

```bash
cd learn-dql
npm install
npm run start        # starts local dev server (dt-app dev)
```

The dev server opens a browser window pointing at your Dynatrace environment's app host. You can work on components and the page reloads on save.

---

## Available scripts

All scripts delegate to the `dt-app` CLI from `@dynatrace/app-scripts`.

| Script | CLI command | What it does |
|---|---|---|
| `npm run start` | `dt-app dev` | Start local development server with hot reload |
| `npm run build` | `dt-app build` | Production build → `dist/` |
| `npm run deploy` | `dt-app deploy` | Build and deploy to the environment in `app.config.json` |
| `npm run uninstall` | `dt-app uninstall` | Remove the app from the target environment |
| `npm run lint` | `eslint .` | Run ESLint across the project |
| `npm run update` | `dt-app update` | Update `@dynatrace-scoped` packages and apply migrations |
| `npm run info` | `dt-app info` | Print CLI and environment version info |
| `npm run help` | `dt-app help` | Print all available dt-app commands |

> **Note:** `deploy` and `uninstall` are disabled for this dev-only repository. The environment in `app.config.json` (`wkf10640`) is used for development only — do not deploy to production.

---

## Project layout

```
learn-dql/
├── app.config.json          # App manifest — name, version, id, scopes, environment URL
├── package.json
├── tsconfig.eslint.json
├── ui/
│   └── app/
│       ├── App.tsx          # Route definitions (React Router v6)
│       ├── index.tsx        # Entry point
│       ├── components/      # Shared UI components (AppShell, ResultTable, …)
│       ├── pages/           # One file per route (Home, Learn, CasePlayer, Sandbox, …)
│       └── lib/
│           ├── dql/         # Offline engine: parser, commands, log-generator, scenarios
│           ├── dpl/         # DPL pattern parser and matcher registry
│           ├── types/       # TypeScript types (Scenario, Step, …)
│           ├── validate.ts  # Result-based query validation
│           └── progress.ts  # localStorage progress persistence
```

---

## App manifest (`app.config.json`)

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

Update `environmentUrl` and `app.id` before deploying to a new environment.

---

## Tech stack

- React 18 + TypeScript 5 (strict)
- Vite via `@dynatrace/app-scripts` (`dt-app`)
- UI components: `@dynatrace/strato-components` v3 only — no Tailwind, no third-party UI libs
- Routing: `react-router-dom` v6
- State: React hooks + `localStorage` (no backend)

---

## Learn more

- [Dynatrace Developer — App Toolkit quickstart](https://developer.dynatrace.com/quickstart/app-toolkit/)
- [Dynatrace Developer Portal](https://developer.dynatrace.com/)
- [Strato component library](https://developer.dynatrace.com/develop/ui-components/)

---

*Built with ❤️ by Mahee and Claude*
