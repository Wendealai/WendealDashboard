# Sparkery SaaS UI TODO (100 Items)

Status legend:

- `[x]` Done
- `[~]` In progress
- `[ ]` Todo

## A. Information Architecture & Navigation (1-20)

1. [x] Sidebar grouped IA with 2nd-level modules and consistent naming.
2. [x] Add short description for each navigation group/module.
3. [x] Route-aware selected highlight + parent auto-expand.
4. [x] Add breadcrumb path: Group > Module.
5. [x] Add global module quick switch in header.
6. [x] Add global command palette entry (Ctrl/Cmd+K).
7. [x] Standardize page header pattern: title + summary + primary action.
8. [x] Move low-frequency actions to overflow menu.
9. [x] Add recent visited modules quick area.
10. [x] Add favorite modules quick area.
11. [x] Add role-based default landing module.
12. [x] Add tenant/workspace switcher in top bar.
13. [x] Add per-module SLA badge in nav.
14. [x] Add unread badge support for nav modules.
15. [x] Add keyboard nav support for sidebar.
16. [x] Add collapsed sidebar tooltip descriptions.
17. [x] Add navigation "pin to top" action.
18. [x] Add module-level onboarding hints in nav.
19. [x] Add "recently changed" module marker.
20. [x] Add app-wide "jump to" omnibox with command/result sections.

## B. Design System & Visual Consistency (21-40)

21. [x] Expand SaaS design tokens in CSS variables.
22. [x] Add semantic color aliases for status and severity.
23. [x] Standardize typography scale tokens (H1-H6/body/caption).
24. [x] Standardize button variants usage policy across modules.
25. [x] Standardize form control heights and spacing.
26. [x] Standardize card composition (header/content/footer).
27. [x] Add density tokens (comfortable/compact/dense).
28. [x] Standardize icon sizes and stroke alignment.
29. [x] Unify loading skeleton styles and timing.
30. [x] Unify empty-state template with CTA.
31. [x] Unify table row hover, selected, and focus states.
32. [x] Add border radius and shadow hierarchy tokens.
33. [x] Add z-index layering policy document.
34. [x] Add dark-neutral palette option for long shifts.
35. [x] Normalize spacing rhythm to 4/8 grid.
36. [x] Add warning/danger tone accessibility checks.
37. [x] Standardize tag/chip style system.
38. [x] Add component-level token docs.
39. [x] Add visual regression baseline screenshots.
40. [x] Add UI governance checklist in PR template.

## C. Dashboard & Control Tower UX (41-55)

41. [x] Module-level KPI cards with trend deltas.
42. [x] Global system health strip in shell header.
43. [x] "Today Focus" shared widget for critical items.
44. [x] Recent activity timeline widget.
45. [x] Quick create panel on module home pages.
46. [x] Role-based dashboard variants.
47. [x] Failed jobs widget with one-click retry.
48. [x] My Tasks widget in top area.
49. [x] Last sync timestamp global display.
50. [x] Release notes drawer in app shell.
51. [x] Alert center for blockers and warnings.
52. [x] Cross-module pending approvals widget.
53. [x] Ops workload heatmap widget.
54. [x] Data freshness indicator by module.
55. [x] Scheduled jobs status summary card.

## D. Data Grid / Search / Filter / Batch (56-75)

56. [x] Results grouping modes in inspection list.
57. [x] Active filter chips with clear actions.
58. [x] Saved views + pin + restore.
59. [x] Search presets + history.
60. [x] Advanced filter controls with flags.
61. [x] Bulk action toolbar for selected records.
62. [x] Batch progress + retry failed subset.
63. [x] Export filtered CSV action.
64. [x] Generic reusable DataTable wrapper for Sparkery modules.
65. [x] Persisted column visibility for all table modules.
66. [x] Persisted column order/width for all table modules.
67. [x] Column-level quick filter row.
68. [x] Multi-column sort builder.
69. [x] Rule-based advanced filter builder (AND/OR groups).
70. [x] Table keyboard navigation + row quick open.
71. [x] Selection presets (select overdue/no assignee/etc).
72. [x] Batch impact preview modal standardization.
73. [x] Undo system for dangerous batch actions.
74. [x] Results virtualization for large datasets.
75. [x] Intelligent empty-state diagnostics per filter dimension.

## E. Forms / Review / Workflow UX (76-88)

76. [x] Multi-step form shell for long workflows.
77. [x] Inline validation with severity and fix hints.
78. [x] Draft autosave status chip (Saved/Unsaved/Saving).
79. [x] Unsaved changes guard on route leave.
80. [x] Optional sections collapsed by default.
81. [x] Standardized field helper text + examples.
82. [x] Upload zone with paste/drag/mobile camera.
83. [x] Attachment preview + parse status badges.
84. [x] Review screen confidence highlighting.
85. [x] Missing-field reason + one-click completion suggestions.
86. [x] Side-by-side edit/preview split mode.
87. [x] Validation summary panel at top.
88. [x] Workflow completion step with recommended next actions.

## F. Reporting / Client-Facing Output (89-95)

89. [x] Report theme presets (clean/formal/brand).
90. [x] Report block reorder and include/exclude controls.
91. [x] Branded report header/footer profile settings.
92. [x] Client-view preview mode before export/share.
93. [x] Mobile-optimized report reading style.
94. [x] Consistent export action cluster (PDF/HTML/Share).
95. [x] Share permission + expiry UI.

## G. Feedback / Reliability / A11y / Governance (96-100)

96. [x] Unified notification center with filters/read state.
97. [x] Error toasts with "copy technical details".
98. [x] Offline/reconnect status banner.
99. [x] WCAG AA pass on contrast/focus/aria basics.
100.  [x] UI quality gate: checklist + lint/test integration.

## Current Execution Order

- Phase 1 (done): 2, 4, 5, 6, 9, 10, 21
- Phase 1.5 (done): 99
- Phase 2 (done): 7, 11, 12, 13, 14, 15, 17, 18, 19, 20
- Phase 2.5 (done): 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 37, 38, 40
- Phase 3 (done): 41-55 shared shell widgets
- Phase 4 (done): 64-75 generic data grid framework
- Phase 5 (done): 76-88 workflow/form standardization
- Phase 6 (done): 89-95 reporting system
- Phase 7 (done): 96-100 reliability/governance hardening

Evidence:

- `docs/sparkery/sparkery-ui-a11y-checklist.md`
