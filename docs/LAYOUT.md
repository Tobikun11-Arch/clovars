# Clovars Layout System

This document describes the shared UI layout used across the desktop renderer. Every page must
follow these rules so the app feels consistent and stays responsive down to a 360 px window.

## Principles

1. **One shell.** Pages never render their own sidebar, top bar, or page title. `AppShell` owns
   navigation, the workspace menu, the top bar title, the timer chip, and the offline banner.
2. **One layout wrapper.** App pages are wrapped in `<Page>` by `AppShell`. Auth pages use
   `<AuthLayout>`. Page components only return content.
3. **Only the content area scrolls.** `.app-content` is the scroll container. The sidebar and top
   bar stay fixed.
4. **One title per page.** The title in the top bar comes from `routes.ts`. Page content may use
   section headings (`Section`, `Card`) but must not repeat the page title as an `<h1>`.
5. **No raw controls.** Use the shared primitives from `components/ui.tsx`. Never style an
   `<input>`, `<select>`, `<button>` or `<table>` directly in a page.
6. **Light theme, token-driven.** Colors, spacing, radii, shadows, and motion come from
   `assets/tokens.css`. Avoid hard-coded colors except for user-selected project/tag colors.

## File map

| Concern | File |
| --- | --- |
| Design tokens | `src/renderer/src/assets/tokens.css` |
| Global styles + component classes | `src/renderer/src/assets/main.css` |
| Shared primitives | `src/renderer/src/components/ui.tsx` |
| Icons | `src/renderer/src/components/icons.tsx` |
| Shell, sidebar, top bar | `src/renderer/src/components/layout/AppShell.tsx` |
| Page width wrapper | `src/renderer/src/components/layout/Page.tsx` |
| Auth layout | `src/renderer/src/components/layout/AuthLayout.tsx` |
| Route metadata / nav | `src/renderer/src/routes.ts` |
| Hash routing | `src/renderer/src/hooks/useHashRoute.ts` |

`assets/base.css` is legacy and is not imported. `main.css` imports `tokens.css`.

## Routes and widths

Routes are hash-based (`#/time`) so the production build works from `file://`.

| Route | Title | Width |
| --- | --- | --- |
| `/`, `/login`, `/register`, `/verify`, `/forgot`, `/reset` | auth titles | narrow |
| `/dashboard` | Dashboard | wide |
| `/time` | Time | default |
| `/reports` | Reports | wide |
| `/work/projects` | Projects | default |
| `/work/clients` | Clients | default |
| `/work/tasks` | Tasks | default |
| `/work/tags` | Tags | default |
| `/team` | Team | default |
| `/profile` | Profile | narrow |
| anything else | Page not found | narrow |

Widths map to tokens:

- `--content-narrow`: forms, profile, auth.
- `--content-default`: most workspace pages.
- `--content-wide`: dashboard and reports.

`/work` redirects to `/work/projects`. Routes with `requiresWorkspace` are gated by `AppShell`;
when the user has no workspace, the onboarding empty state is shown instead of the page.

## Page recipes

Start a page with a `Section` (title + description + actions) or a stack of `Card`s.

```tsx
<Section
  title="Projects"
  description="Group tasks and time entries under a project."
  actions={
    <Toolbar>
      <SearchInput value={search} onChange={...} />
      <Button variant="primary" icon={<Icon d={icons.plus} />} onClick={openCreate}>
        New project
      </Button>
    </Toolbar>
  }
>
  {/* table, empty state, etc. */}
</Section>
```

Rules of thumb:

- **List pages are list-first.** Show the table immediately. Create/edit happens in a `Drawer`,
  not in an inline form above the list.
- Use `Toolbar` for search/filter/primary action. On small screens the toolbar wraps and search
  fields go full width.
- Use `TableContainer` around tables so they scroll horizontally inside the card instead of
  causing page-level horizontal scroll.
- Use `StatCard`/`stat-grid` for KPI rows and `Grid` for responsive card grids.
- Use `Badge` for status/role, `Chip` for labels, `Avatar` for people.
- Use `tabular`/`.num` for numbers so columns align.

## Forms

Use `Field` for every labelled control. `Field` renders the label above the input, optional
required marker, hint, and error message. Place the error on the specific field when possible.

```tsx
<Field label="Name" hint="Shown in reports." error={error} required>
  <Input value={name} onChange={(event) => setName(event.target.value)} />
</Field>
```

Available controls: `Input`, `PasswordInput` (show/hide), `Textarea`, `Select`, `Checkbox`,
`SearchInput`.

- Validate before submitting and keep the submit button in a loading state.
- Use `form-actions` for submit/cancel groups.
- Use `PasswordInput` on every password field.
- Auth forms show a form-level alert via the `error` prop and never use `alert()`.

## Dialogs, drawers, and feedback

- `Modal` for short confirmations and small forms.
- `Drawer` for create/edit forms on list pages.
- `confirmDialog({ title, message, confirmLabel, danger })` for destructive actions. It is
  promise-based; render `<ConfirmHost />` once (already in `App.tsx`).
- `showToast(message, type)` for save/delete/export results. Render `<ToastContainer />` once.
- Do not use `window.alert`, `window.confirm`, or inline toast-like banners for transient results.
  Persistent page errors use `ErrorState`.

Both `Modal` and `Drawer` trap focus, close on `Esc`, and restore focus to the trigger.

## States

Every data page must handle:

1. **Loading** — skeletons (`Skeleton`) with the same shape as the loaded content. Avoid a
   bare "Loading…" line.
2. **Empty** — `EmptyState` with a useful title, explanation, and action when the user can fix
   it.
3. **Error** — `ErrorState` with the message and a `Retry` callback.
4. **Offline** — the shell shows an offline banner; mutations surface toast errors.

## Responsive behavior

Breakpoints:

| Width | Behavior |
| --- | --- |
| `≤ 1100px` | Sidebar collapses to a 64 px icon rail; the Work group opens a flyout menu. |
| `≤ 768px` | Sidebar becomes an overlay drawer; a backdrop and menu button appear in the top bar. |
| `≤ 560px` | Toolbars stack, search/filter fields go full width, timer chip compresses. |
| `≤ 380px` | Secondary table columns hide; compact paddings. |

The app must have **no horizontal page scroll** at 360, 768, 1024, 1280, or 1920 px. Wide tables
scroll inside `TableContainer`.

Helper classes: `.col-hide-md`, `.col-hide-sm` hide secondary columns at smaller sizes.

## Accessibility

- All interactive controls are real `<button>`, `<a>`, `input`, or `select` elements.
- Focus is always visible (`--ring`); do not remove outlines.
- `Modal`/`Drawer` trap focus and restore it on close; `Esc` closes them.
- Icon-only controls use `IconButton` with a `label`.
- Status messages use `role="status"` (toasts, offline banner); errors use `role="alert"`.
- Respect reduced motion. The media query in `main.css` disables animations/transitions, and the
  Profile preference sets `data-reduce-motion` for manual control.
- Shortcuts: `?` opens help, `Alt+1…5` navigate, `Esc` closes dialogs.

## Adding a page checklist

1. Add the route to `ROUTES` in `routes.ts` with a title, group, width, and `requiresWorkspace`
   if needed.
2. Add it to `NAV_GROUPS` if it belongs in the sidebar.
3. Add the case in `App.renderAppPage()`.
4. Build the page from `Section`/`Card`/`TableContainer`; do not add a page heading or page
   wrapper.
5. Cover loading, empty, and error states.
6. Put forms in `Field` + shared controls; use `Drawer` for list-page create/edit.
7. Verify at 360, 768, 1024, 1280, and 1920 px.
8. Run `npm run typecheck`, `npm run lint`, and `npm run build`.

## Known limitation

The Dashboard "Team activity" card shows membership only. Per-member weekly hours need a
team-wide time-entries endpoint; the card is marked with a TODO until that exists.
