# Sparkery Standalone App (In-Repo)

This folder contains the first extraction stage of Sparkery as an independent frontend app.

## Run

From repo root:

```bash
npm run dev:sparkery
```

Build:

```bash
npm run build:sparkery
```

Typecheck:

```bash
npm run typecheck:sparkery
```

From this folder directly:

```bash
npm install
npm run dev
```

## Base Path Deployment

Set `VITE_SPARKERY_BASE_PATH` for path-based deploy.

Examples:

- root deploy: `/`
- path deploy: `/sparkery`

When using path deploy, the web server must rewrite all requests under that path to `apps/sparkery/dist/index.html`.

## Required Runtime Env

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Optional Runtime Env

- `VITE_GOOGLE_MAPS_API_KEY`
- `VITE_GOOGLE_CALENDAR_CLIENT_ID`
- `VITE_GOOGLE_CALENDAR_ID`
- `VITE_GEMINI_API_KEYS`
- `VITE_DOUBAO_API_KEY`
- `VITE_APP_VERSION`
- `VITE_APP_COMMIT`
- `VITE_APP_BUILD_TIME`

## Included Scope

- Sparkery pages/routes (`src/pages/Sparkery/**`)
- Cleaning inspection public flow used by Sparkery links (`src/pages/CleaningInspection/**`)
- Sparkery dispatch/bond/procurement/inspection services
- Sparkery dispatch redux slice + minimal auth state compatibility
- Sparkery locales and report template utilities

## Next Stage (Optional)

1. Move `apps/sparkery` into separate repository.
2. Replace copied modules with internal package boundaries (`domain`, `infra`, `ui`).
3. Add Sparkery-only CI workflow and deployment pipeline.
