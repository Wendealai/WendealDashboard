# Sparkery UI Z-Index Policy

## Tokens

- `--sparkery-saas-z-base`: base content layers.
- `--sparkery-saas-z-dropdown`: dropdown/select/popover layers.
- `--sparkery-saas-z-modal`: modal/dialog layers.

## Rules

- Do not use hard-coded large z-index values in module CSS.
- Reuse tokenized levels to avoid overlay conflicts.
- New overlay components must declare which token they consume.

## Escalation

If an overlay conflict appears:

1. Verify component container stacking context.
2. Move to next tokenized layer only if necessary.
3. Document reason in PR.
