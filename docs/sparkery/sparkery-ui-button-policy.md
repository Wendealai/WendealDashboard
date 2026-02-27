# Sparkery UI Button Policy

## Purpose

This policy standardizes button hierarchy for Sparkery SaaS pages.

## Variants

- `Primary`: page-level main outcome only (1 per header section).
- `Default`: neutral actions inside cards/forms.
- `Text`: low-priority inline actions.
- `Link`: navigational links in dense tables/lists.
- `Danger`: destructive actions only with confirmation.

## Placement Rules

- Header: keep one `Primary` action and optional `Text` support actions.
- Card body: use `Default` for local actions and avoid multiple `Primary`.
- Table toolbar: use `Default` for bulk actions; only use `Primary` for the most common workflow.

## Anti-patterns

- Multiple `Primary` actions in one row.
- `Danger` without confirmation.
- Mixed button sizes in the same action cluster.
