# AGENTS.md

## Quick reference

```bash
pnpm install                  # install deps (pnpm 10, frozen lockfile)
pnpm dev                      # dev server on port 4949
pnpm run build                # production build (Next.js standalone)
pnpm run start                # production server on port 4949
pnpm run lint                 # ESLint (next/core-web-vitals)
pnpm run format:check         # Prettier check
pnpm exec tsc --noEmit        # typecheck
pnpm test                     # vitest (watch mode)
pnpm run test:run             # vitest (single run)
```

## CI order

`pnpm run lint` → `pnpm run format:check` → `pnpm exec tsc --noEmit`

All three must pass. CI runs on push to main/develop and PRs to main.

## Node & runtime

- **Node 22** required. Dev server needs `--experimental-sqlite` flag (handled by `pnpm dev` script).
- `next.config.mjs` ignores TypeScript and ESLint errors during `next build` — do not rely on build to catch type errors; run `tsc --noEmit` explicitly.
- Database uses `better-sqlite3` with Node's built-in `node:sqlite` (behind `--experimental-sqlite`).

## Project structure

```
src/
  app/            # Next.js App Router pages + API routes
  features/       # Feature modules (12 feature domains)
  lib/            # Shared libraries (auth, database, i18n, scheduler, tmdb, etc.)
  stores/         # Zustand stores
  shared/         # Shared components, hooks, types
  styles/         # Global CSS (Tailwind)
  types/          # TypeScript type definitions
electron/         # Electron main process (main.js, preload.js)
scripts/          # Build helpers, Docker startup, utilities
TMDB-Import-master/  # Bundled external tool (Python-based TMDB import)
data/             # Runtime data: tmdb-helper.db, logs/
```

## Database

- SQLite via `better-sqlite3`, file at `data/tmdb-helper.db`
- Schema version tracked in `src/lib/database/schema.ts` (SCHEMA_VERSION=17)
- Migrations in `src/lib/database/migrations/`
- App startup: `src/instrumentation.node.ts` initializes DB → schema → migrations → scheduler
- Docker: `scripts/docker-startup.js` creates dirs + empty DB file; schema init happens at app start

## i18n

- **24 namespaces**, **6 locales**: zh-CN, en-US, zh-TW, zh-HK, ja-JP, ko-KR
- Locale files: `src/lib/i18n/locales/<locale>/<namespace>.json`
- All namespaces registered in `src/lib/i18n/index.ts` via static imports
- Default namespace is "common" — `useTranslation()` without args resolves to `common.json`
- Namespace prefixes required in `t()` calls for non-common namespaces: `t('key', { ns: 'settings' })`
- **After editing any locale JSON, delete `.next/` directory** — Next.js bundles JSON at build time; HMR won't pick up changes
- Class components can't use hooks — use `i18n.t('key', { ns: 'xxx' })` directly (import i18n from `@/lib/i18n`)
- TMDB Guide uses inline `UI_LABELS` dict, not i18n — add keys to the dict, not locale JSON

## Testing

- Vitest for unit tests; test files in `src/**/*.test.ts` using `__tests__/` co-located directories
- Playwright configured for e2e in `./e2e` dir (mobile + tablet viewports)
- Coverage via `@vitest/coverage-v8`, scoped to `src/lib/**/*.ts`

## Path aliases

`@/*` maps to `src/*` (configured in tsconfig.json and vitest.config.ts).

## UI stack

- **shadcn/ui** + Radix UI primitives + Tailwind CSS
- `components.json` defines shadcn config (neutral base, CSS variables, lucide icons)
- `class-variance-authority` + `tailwind-merge` + `clsx` for component styling
- Emotion enabled in `next.config.mjs`

## Deployment

- **Docker**: `docker-compose up -d` (image: `ceru007/tmdb-helper`), port 4949, data in `/app/data`
- **Electron**: `pnpm run electron:build` (Windows), `electron:build:mac`, `electron:build:linux`
- **Production web**: `start-production.bat` (Windows) or `pnpm run build && pnpm run start`
- Docker uses custom `server.js` (not Next.js default); supports streaming responses
- Electron main process: `electron/main.js`

## Gotchas

- `pnpm` is required (not npm/yarn). CI uses `pnpm install --frozen-lockfile`.
- The `start-production.bat` script opens browser to port 3000 but the server runs on 4949 — this is a known inconsistency.
- Electron build sets `ELECTRON_BUILD=true` env var, which affects image optimization and output mode.
- `sonner` for toasts (not react-hot-toast).
- Zustand for state management (not Redux).
- Radix ScrollArea uses absolute positioning — breaks `flex-1` height chains for children. Use plain div + `overflow-y-auto` as alternative.
- `lint-staged` runs ESLint + Prettier on staged `src/**/*.{ts,tsx,js,jsx}` files.
