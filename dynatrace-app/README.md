# DQL Investigator — Dynatrace AppEngine App

Interactive learning platform for Dynatrace Query Language (DQL) and
Dynatrace Pattern Language (DPL), built exclusively with Dynatrace Strato
components.

## Quick Start

```bash
npm install
npm start      # local dev server
npm run build  # production build
npm run deploy # deploy to Dynatrace
```

## Features

| Phase | Feature | Status |
|-------|---------|--------|
| 0 | Codex — DQL/DPL reference guide | Phase D |
| 1 | Sandbox — free-form query editor | Phase E |
| 2 | Visualize — animated data transformations | Phase F |
| 3 | Cases — 60+ guided investigations | Phase G |
| 4 | Arcade — 5 skill-reinforcement games | Phase H |

## Architecture

See [STEERING.md](./STEERING.md) for full architectural guidance, component
rules, and extension documentation.

## Key Constraints

- **UI**: ONLY `@dynatrace/strato-components` and `@dynatrace/strato-icons`
- **No**: Tailwind, Framer Motion, Recharts, or any external UI library
- **State**: React Context + localStorage (no backend database)
- **Auth**: Handled by Dynatrace platform
