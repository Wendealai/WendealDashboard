# Sparkery UI Accessibility Basics Checklist

Date: 2026-02-27

Scope:

- Quote Calculator custom report controls.
- Dispatch job form upload workflow.
- Dispatch recurring templates review workflow.

## Baseline Checks

1. Keyboard focus visibility

- Verified visible `:focus-visible`/`:focus-within` ring on custom report controls, export/share actions, upload zone, and recurring review actions.
- No `outline: none` left on active keyboard interactions without replacement focus indicator.

2. ARIA labels and grouping

- Added explicit group labels for report type, theme preset, report blocks, share permissions, and share expiry controls.
- Added list/listitem semantics for recurring review audit rows.
- Added live status region for share-link and upload parse status updates.

3. Contrast baseline

- Use automated contrast check in CI script.

## Commands

```bash
npm run typecheck:sparkery
npm run check:contrast:sparkery
npm run ui:quality:sparkery
```

## Notes

- This checklist targets WCAG AA basics for the currently shipped Sparkery UI layer.
- Full screen-reader flow audit (NVDA/VoiceOver) remains a separate deep audit task.
