# Dark Mode Guardrails

## Definition Of Done
- No light-only surfaces leak while `theme-dark` is active.
- No hardcoded chart palette values in page components.
- All interactive states are valid in dark mode: default, hover, focus-visible, active, disabled.
- Dialogs/drawers/toasts use semantic surfaces (`surface-*`, `card-modal`, `dark-glass-panel`).

## Approved Styling Sources
- Semantic Tailwind tokens: `surface.*`, `ink.*`, `primary|secondary|success|warn|danger`.
- Shared primitives from `src/index.css`: `.card*`, `.btn*`, `.input`, `.s-pill*`, `.lux-table`.
- Chart colors from `useChartTheme` only.

## Disallowed Patterns
- `focus:bg-white`
- `to-white` gradient endpoints
- raw white utility backgrounds (`bg-white*`) unless the component is explicitly a glass/modal primitive
- arbitrary hex color classes (`bg-[#...]`, `text-[#...]`, `border-[#...]`) in route components

## Verification Workflow
1. Run `npm run dark:audit`
2. Run `npm run lint`
3. Run `npm run build`
4. Manually verify these routes in both themes:
   - `/dashboard`
   - `/appointments`
   - `/reports`
   - `/patients`
   - `/billing`
   - `/patients/:id`

## Manual Contrast Checklist
- Body and metadata text stays readable on all surface levels.
- Buttons preserve clear hierarchy in dark mode (primary > secondary > ghost).
- Table row hover is visible but subtle (no over-bright flash).
- Chart axes/tooltips remain readable against dark cards.
