# Deploy Hardening Checklist

Updated: 2026-02-26

## Release Gate (must pass before deploy)

1. Build with metadata:
   - `VITE_APP_VERSION`
   - `VITE_APP_COMMIT`
   - `VITE_APP_BUILD_TIME`
2. Verify artifact integrity:
   - `npm run verify:artifact`
3. Ensure `dist/index.html` does not contain legacy split markers:
   - `vendor-misc`
   - `antv-core-vendor`

## Deployment Rules

1. Use atomic rollout (new release directory + symlink switch).
2. Remove stale files during publish (`rsync --delete` or equivalent).
3. Do not mix old/new assets in `/js` and `/css`.
4. Always restart/recreate runtime after new release (container or process).

## Cache Rules

1. `index.html`, `sw.js`, `runtime-config.js`: `no-store, no-cache`.
2. Hash-based static assets (`/js`, `/css`, `/images`, `/fonts`, `/assets`):
   `max-age=31536000, immutable`.
3. Purge CDN cache after every production release.
4. Service worker must be versioned by release (`/sw.js?v=<version-commit>`).

## Post-Deploy Verification

1. Run remote verification:
   - `npm run verify:deploy -- --url https://oa.wendealai.com.au/ --expect-commit <commit>`
2. Confirm JS assets return JavaScript content type, not HTML fallback.
3. Confirm build meta tags on deployed `index.html`:
   - `wendeal-build-version`
   - `wendeal-build-commit`
   - `wendeal-build-time`
4. Run smoke browser check on homepage with cache disabled.

## GitHub Actions

1. `Deploy Build` workflow now:
   - injects build metadata
   - builds
   - runs `npm run verify:artifact`
   - uploads `dist` artifact
2. `Deploy Verify` workflow (manual):
   - validates live endpoint against expected commit

## Rollback Trigger

Rollback immediately if any of these happen:

1. Homepage white screen in production.
2. JavaScript asset URL returns HTML fallback.
3. Deployed commit does not match expected release commit.
4. Build meta tags are missing or unresolved.
