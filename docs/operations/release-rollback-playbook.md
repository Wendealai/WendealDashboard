# Release Rollback Playbook

Updated: 2026-02-24

## Quick Path (GitHub UI)

1. Open workflow `Release Rollback`.
2. Input `target_ref` (example: `HEAD~1` or a known stable tag).
3. Run workflow.
4. Review the auto-created rollback PR and merge.

## Local One-Command Path

```bash
npm run rollback:prepare
```

Default target is `HEAD~1`. To restore another ref:

```bash
node scripts/release-rollback.mjs --target <stable_ref>
```

## Safety Guardrails

- Rollback flow runs `npm run check:migrations` before creating rollback commit.
- Migration safety check validates required SQL files and critical finance consistency trigger coverage.
- Rollback branch is isolated and applied via PR (no direct force push).

## Post-Rollback Verification

1. `npm run typecheck`
2. `npm run test:pyramid`
3. `npm run build`
4. `npm run verify:artifact`
5. Verify dispatch flows:
   - job status update
   - finance confirm/payment
   - offline queue enqueue/flush

## Related Operations Docs

1. `docs/operations/deploy-hardening-checklist.md`
