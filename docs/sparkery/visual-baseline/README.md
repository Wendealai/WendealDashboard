# Sparkery Visual Baseline

Generated desktop/mobile baseline screenshots for regression checks.

## Capture Command

```powershell
npm run baseline:sparkery
```

## Covered Routes

- `/bond-clean-quote`
- `/bond-clean-quote-cn`
- `/cleaning-inspection`
- `/dispatch-location-report`
- `/dispatch-week-plan`
- `/dispatch-employee-tasks`

## Notes

- Screenshots are captured with headless Microsoft Edge via `scripts/sparkery-capture-baselines.ps1`.
- Current Sparkery authenticated routes (`/sparkery/*`) require login and are not included in this baseline set.
