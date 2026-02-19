# Sparkery Dispatch MVP Verification Checklist

## Build and Type Checks

- [x] `npm run build` passes without TypeScript errors
- [x] Dispatch module compiles with existing Sparkery pages

## Functional QA

- [ ] Create at least 3 jobs on different dates in the same week
- [ ] Assign job to employee and verify assignee tag updates on card
- [ ] Update status flow: `pending` -> `assigned` -> `in_progress` -> `completed`
- [ ] Cancel a job and verify cancelled status is visible
- [ ] Change week start and verify board refreshes for selected range

## Persistence

- [ ] Refresh page and verify previously created jobs remain
- [ ] Verify employee list seeds when storage is empty

## Non-regression

- [ ] Sparkery quote calculator tab still opens normally
- [ ] Sparkery cleaning inspection tab still opens normally
- [ ] Sparkery procurement tab still opens normally

## Known Constraints

- Jest currently reports zero discovered tests in this repository setup (`--listTests` returns empty),
  so this MVP uses build verification + manual checklist as release gate.
