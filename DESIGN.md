# Rescue Pet: Design System

Extracted from codebase on 2026-06-08. This documents the current state, not the aspirational one.

Register: **product**. The design serves the workflows (catalog, adoption pipeline, clinical records, admin); it is not the product itself.

## Color System

### Architecture
OKLCH CSS custom properties defined in `frontend/src/index.css`, consumed via the Tailwind config (`frontend/tailwind.config.js`) as `var(--token)`. Two named scales also live in the Tailwind config, both OKLCH: `rescue-*` (the brand teal-green, hue 175) and `warm-*` (the amber accent, hue 70). A third group, `status-*`, holds the six semantic status roles (see below). Every system color is now OKLCH; no hex or HSL remains in the token layer.

### Semantic Tokens (CSS Variables)
Hue 175 (teal-green) tints nearly every neutral. Dark values exist for all tokens.

| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | `oklch(0.98 0.005 175)` | `oklch(0.15 0.01 175)` | Page background (green-tinted off-white) |
| `--foreground` | `oklch(0.25 0.015 175)` | `oklch(0.93 0.008 175)` | Primary text |
| `--card` | `oklch(0.995 0.002 175)` | `oklch(0.18 0.01 175)` | Card / sidebar / topbar surfaces |
| `--popover` | `oklch(0.995 0.002 175)` | `oklch(0.18 0.01 175)` | Dropdowns, popovers |
| `--primary` | `oklch(0.51 0.14 175)` | `oklch(0.60 0.14 175)` | Primary actions, links, brand mark (light tuned for AA on white text) |
| `--secondary` | `oklch(0.94 0.01 175)` | `oklch(0.25 0.01 175)` | Secondary surfaces, image placeholders |
| `--muted` | `oklch(0.94 0.008 175)` | `oklch(0.25 0.008 175)` | Subdued backgrounds |
| `--muted-foreground` | `oklch(0.50 0.01 175)` | `oklch(0.65 0.01 175)` | Secondary text (light tuned for AA on `muted` surfaces) |
| `--accent` | `oklch(0.75 0.16 70)` | `oklch(0.70 0.14 70)` | Warm amber accent (hue 70) |
| `--destructive` | `oklch(0.55 0.20 25)` | `oklch(0.45 0.15 25)` | Error / danger actions (light tuned for AA) |
| `--border` / `--input` | `oklch(0.90 0.006 175)` | `oklch(0.25 0.008 175)` | Borders, input outlines |
| `--ring` | `oklch(0.51 0.14 175)` | `oklch(0.60 0.14 175)` | Focus rings |
| `--radius` | `0.75rem` | same | Base border radius |

### Brand Scale (`rescue-*`, hue 175)
| Token | Value | Where used |
|---|---|---|
| `rescue-50` | `oklch(0.96 0.02 175)` | Active sidebar item bg, avatar bg, empty-state and loader icon bg |
| `rescue-100` | `oklch(0.92 0.04 175)` | Loader pulse ring, mobile login badge bg |
| `rescue-500` | `oklch(0.60 0.14 175)` | PetCard hover border tint |
| `rescue-600` | `oklch(0.51 0.14 175)` | Brand text, active nav text, links, inline accents (kept in sync with `--primary`, AA on white) |
| `rescue-700` | `oklch(0.48 0.12 175)` | Link hover states |
| `rescue-900` | `oklch(0.25 0.06 175)` | Reserved for headings on tinted backgrounds |

### Accent Scale (`warm-*`, hue 70)
The amber accent is no longer dormant. It now appears in two surfaces.

| Token | Value | Where used |
|---|---|---|
| `warm-50` / `warm-100` / `warm-700` | amber tints | CompatibilityScoreBadge high tier (score >= 80) |
| `warm-600` | `oklch(0.68 0.16 70)` | NotificationBell unread-count badge |

### Status Roles (Tokens)
Status and feedback colors are tokenized as six semantic roles, defined in OKLCH in `index.css` (light + dark), registered in `tailwind.config.js` under the `status` group, and mapped from domain statuses in the single source of truth `src/design/status.ts`. Each role has a soft surface (`bg` / `fg` / `bd`); `success`, `info`, and `danger` also carry a saturated `solid` for filled markers.

| Role | Hue | Pet status | Adoption status | Feedback level |
|---|---|---|---|---|
| `success` | 150 (green) | AVAILABLE | APPROVED | SUCCESS |
| `caution` | 95 (amber) | QUARANTINE | INTERVIEW | WARNING |
| `info` | 245 (blue) | TREATMENT | RECEIVED | INFO |
| `adopted` | 300 (purple) | ADOPTED | VISIT | (none) |
| `neutral` | 175 (brand-tinted) | DECEASED | (none) | (none) |
| `danger` | 25 (red) | (none) | REJECTED | ERROR |

Utility classes: `bg-status-{role}`, `text-status-{role}-fg`, `border-status-{role}-bd`, plus `bg-status-{role}-solid` and `text-status-on-solid` for filled markers. Components consume them through `roleClasses`, `roleSolid`, `feedbackTagClasses`, and `affinityClasses` from `design/status.ts` rather than hardcoding palette colors. Affinity score keeps the `warm-*` amber accent for the high tier as a deliberate brand choice.

Consumers refactored to the token system: StatusBadge, AdoptionRequestTable, AdoptionStatusTimeline, StatusTransitionActions (labels), NotificationBell (type tags), CompatibilityScoreBadge.

### Raw Palette Still in Use
Neutrals are now tokenized: ~375 raw `gray-*` utilities and 9 `bg-white` surfaces were swept onto `foreground` / `muted-foreground` / `muted` / `border` / `card`. What deliberately remains on the raw palette is non-neutral and not duplicated: the urgency-tinted Card in ImmunizationAlerts (red/yellow by overdue state), the `NotificationCenter` type-style map (the four feedback levels), the compact `amber-*` hints in GalleryManager and LocationPicker, the warm onboarding banner in Catalog (intentional brand accent), and white-on-color text plus black scrim overlays. The NotificationCenter map is a candidate to route through the status roles next.

### Color Strategy
**Restrained.** Teal-green tinted neutrals (hue 175) carry the surface, `rescue-600` is the single brand accent, and the `warm-*` amber appears in roughly 10% of cases (afinidad scores, unread count). This fits the product register and the brand voice ("warm but professional"). It also threads the anti-references: not the cold gray SaaS dashboard, not the pastel pet-shop.

### Issues
- **Neutrals and one-off accents still bypass tokens.** `gray-50/100/400/500/600/900` stand in for `muted` / `border` / `foreground` across Sidebar, Topbar, NotificationBell chrome, EmptyState, tables, and most pages; auth banners use raw green/red. These are the remaining raw-palette usages now that status semantics are tokenized. Heaviest in PetDetail, AdminReports, AdoptionRequestDetail, AuditLog, TaskManagement, AdminUsers.
- **Dark mode is fully wired but has no toggle.** Every semantic and status token has a complete `.dark` value, `darkMode: ["class"]` is configured, and now that neutrals, status, and feedback all run through tokens, forcing the `.dark` class flips the whole UI coherently (verified on the auth pages). The only thing missing is the trigger: a toggle or system-preference listener that adds the `.dark` class. The handful of remaining raw colors (urgency Card, amber hints, white-on-color) would not respond, but they are minor.
- **Resolved since the prior extraction:** the token layer is fully OKLCH (previously HSL plus a parallel hardcoded-hex scale); the amber accent is in use; status and feedback colors are extracted into one OKLCH role system with a single source of truth (`design/status.ts`), ending the per-component duplication and the duplicate `AdoptionRequestStatusType` type and triplicated status labels.

## Typography

### Font Stack
**Inter** is loaded from Google Fonts in `frontend/index.html` (weights 400/500/600/700, `display=swap`, with `preconnect`). Tailwind's `fontFamily.sans` is set to `Inter, system-ui, -apple-system, sans-serif`. The body enables OpenType features `cv11` and `ss01` and `-webkit-font-smoothing: antialiased`.

### Base Treatment
- `h1`-`h4` carry `letter-spacing: -0.01em` (set globally in `index.css`).
- `p` is capped at `max-width: 72ch` globally, so prose line length is bounded without per-component effort.

### Scale (Observed in Components)
| Class | Usage |
|---|---|
| `text-2xl font-bold` | Page titles (Login, Catalog headings) |
| `text-lg font-semibold` | Card titles, dialog titles, error-boundary heading |
| `text-base font-bold` / `font-semibold` | Sidebar brand, empty-state title |
| `text-sm font-medium` | Nav items, labels, topbar name, links |
| `text-sm` | Body text, descriptions, notification messages |
| `text-xs` | Badges, metadata, timestamps, helper text, sublabels |
| `text-[11px]` | Sidebar section labels (uppercase) |

### Issues
- No formal type scale token set; sizes are still chosen per component, though the range is tighter than before and `text-base` now appears.
- Arbitrary `text-[11px]` survives in the Sidebar section headers.

## Spacing

### Observed Patterns
| Context | Values |
|---|---|
| Page content (AppLayout main) | `px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8` |
| Section gaps | `space-y-6` (common), `space-y-4` (forms) |
| Card padding | `p-6` (Card header/content default), `px-3.5 pt-3 pb-3.5` (PetCard, tighter) |
| Grid gaps | `gap-3` (Dashboard), `gap-4 lg:gap-5` (Catalog), `gap-6` (Pets) |
| Sidebar | `px-4` nav container, `space-y-0.5` within a group, `mt-5 pt-4` between groups |
| Form field gaps | `space-y-2` (FormField) |
| Inline element gaps | `gap-2`, `gap-2.5`, `gap-3` |

### Notes
- Spacing has more rhythm than the prior extraction: the app shell uses asymmetric `py`/`px` that grows by breakpoint, and grid gaps vary by page density (Dashboard tight, Pets loose).
- Still no documented spacing scale; values are picked per component.

## Elevation

| Level | Class | Where |
|---|---|---|
| None | (default) | Most surfaces; flat is the norm |
| Subtle | `shadow-sm` | Inputs, outline / secondary / destructive buttons |
| Medium | `shadow` | Card base, primary button, default badge |
| Lifted | `shadow-md` | PetCard hover |
| Prominent | `shadow-lg` | Dialogs, notification dropdown |

Depth is used sparingly; most layout is separated by borders (`border-border`) rather than shadow.

## Border Radius

| Class | Rem | Where |
|---|---|---|
| `rounded-md` | calc(0.75rem - 2px) | Buttons, inputs, badges, nav items, native selects |
| `rounded-lg` | 0.75rem | Dialogs, notification dropdown, image/timeline blocks, brand-mark tiles |
| `rounded-xl` | via Card | Cards, login brand tiles |
| `rounded-full` | 50% | Avatars, unread count, icon circles, pill elements |

`rounded-md` and `rounded-lg` remain close in value (0.5625rem vs 0.75rem) because of the CSS-variable math, so their visual distinction is subtle.

## Components

### Primitives (`src/components/ui/`)
shadcn/ui pattern: CVA variants in `*-variants.ts`, Radix primitives where needed, `cn()` from `lib/utils`.

| Component | Variants | Notes |
|---|---|---|
| Button | default, destructive, outline, secondary, ghost, link / sizes default, sm, lg, icon | `hover:brightness-110/95` instead of color swaps; `active:scale-[0.97]`; `transition-[...] duration-150 ease-out-strong` |
| Badge | default, secondary, destructive, outline | `hover:brightness` on filled variants |
| Card | (none) | `rounded-xl border bg-card shadow`; header/content/footer at `p-6` |
| Input | (none) | `h-9 rounded-md`, `text-base md:text-sm`, `focus-visible:border-ring`, `ease-out-strong` |
| Label | (none) | `text-sm font-medium` |
| Dialog | (none) | Radix; overlay `bg-black/60 backdrop-blur-[2px]`; enter/exit fade + zoom + slide via `tailwindcss-animate` |
| Alert | success, danger, info, caution | Inline feedback banner. Colors from the status roles (`design/status.ts`), leading variant icon, auto `role` (`alert` for danger, `status` otherwise). Replaced ~27 hardcoded `bg-*-50` banners across 18 files. |

> Hygiene note: a stray `frontend/@/components/ui/` directory duplicates button, badge, card, input, label, and dialog. It is an artifact of the `@/` path alias being written to a literal `@` folder. The app imports from `src/components/ui/`; the `@/` copy is dead and should be deleted.

### Domain Components
| Component | Purpose | Notes |
|---|---|---|
| StatusBadge | Pet status pill | 5 statuses mapped to status roles via `design/status.ts` over Badge `outline` |
| RoleBadge | User role pill | 4 roles mapped to Badge variants (ADMIN destructive, VET default, VOLUNTEER secondary, ADOPTER outline) |
| CompatibilityScoreBadge | Afinidad percentage | Tricolor thresholds 80/50; high tier uses `warm-*` |
| AdoptionStatusTimeline | Adoption pipeline stepper | RECEIVED to APPROVED with REJECTED special-cased; Check vs Circle icons plus color |
| StatusTransitionActions | Allowed adoption-status buttons | State machine (TRANSITIONS map); outline + destructive buttons |
| PetStatusSelector | Clinical/lifecycle status change | Native select + reason field; double-confirm for DECEASED via ConfirmDialog |
| RejectionReasonDialog | Capture rejection reason | Dialog around a reason input |
| CompatibilityExplanation | Explain a score | Breakdown of afinidad factors |
| CompatibilityTestForm | Adopter affinity questionnaire | Multi-field form |
| AdoptionRequestTable | Requests list (staff) | Tabular list with status |
| AdoptionRequestDetail | Single request workspace | Interview scheduling, document/contract handling, canvas signature pad |
| PetForm | Create/edit pet | Shared form for PetNew and PetEdit |
| PetCard | Animal card in grids | `<button>` with group-hover image zoom, hover border tint, `active:scale-[0.98]`, lazy image |
| PetFilters | Search + filter bar | Text input + selects |
| FormField | Labeled input wrapper | Label + Input + error; errors use raw `red-500` |
| EmptyState | Zero-data placeholder | `rescue-50` icon circle + title + description + optional action |
| LoadingState | Full-area loader | Custom pulsing PawPrint (slow spin), not a generic spinner; stagger-fade-in entrance |
| ConfirmDialog | Confirmation modal | Dialog with confirm/cancel, destructive variant |
| NotificationBell | Header notification dropdown | Custom dropdown (not Radix); 30s polling, browser push, `dropdown-enter` animation, `warm-600` count |
| LocationPicker | Map selector | Leaflet |
| GalleryManager | Photo upload/manage | Image grid: upload, reorder, delete |
| QRDisplay | QR code | Canvas-rendered with download |
| ErrorBoundary | App-level error catch | Class component; clean token usage; "Recargar página" CTA |

### Layout Components
| Component | Notes |
|---|---|
| AppLayout | Sidebar + Topbar + scrollable main. Mobile sidebar is an animated overlay drawer (`sidebar-overlay` + `sidebar-drawer`). Content wrapped `max-w-7xl mx-auto`. |
| Sidebar | Fixed `w-64`, `bg-card`, border-right. **Now grouped** into labeled sections (Adopción, Mascotas, Operaciones, Sistema, plus an unlabeled general group), role-filtered. Brand mark is a `bg-primary` tile + wordmark. Active item `bg-rescue-50 text-rescue-600`; inactive items use raw `gray-*`. |
| Topbar | `h-16`, `bg-card`, border-bottom. First-name greeting, NotificationBell, name + RoleBadge, `rescue-50` avatar. |
| ProtectedRoute | Route guard with role filtering. |
| SmartRedirect | Role-based redirect from `/`. |

## Layout Patterns

### App Shell
- `w-64` sidebar + content; sidebar hidden under `md`, replaced by an animated overlay drawer.
- `h-16` topbar with hamburger under `md`.
- Main content scrolls independently; inner column `max-w-7xl mx-auto` with breakpoint-scaling padding.

### Page Patterns
- **List pages** (Catalog, Pets, AdminUsers, etc.): header + filters + responsive grid or table.
- **Detail pages** (PetDetail, AdminAdoptionRequestDetail): section blocks, status actions, related panels.
- **Auth pages** (Login redesigned, Register, ForgotPassword, ResetPassword, ActivateAccount, ResendActivation): see split layout below.
- **Form pages** (PetNew, PetEdit, Profile): stacked fields, shared PetForm where applicable.

### Auth Split Layout (Login)
`min-h-screen flex`. Left panel `lg:w-[45%] bg-primary` with brand mark, headline in `primary-foreground`, and two soft decorative circles (`primary-foreground/5`); hidden under `lg`. Right panel centers a `max-w-sm` form with a mobile-only brand badge and a `stagger-fade-in` entrance. This is a committed brand moment inside an otherwise restrained product, and a deliberate departure from the prior "centered card on gray" auth screen.

### Grids
- Catalog: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-5`
- Pets: same column ramp, `gap-6`
- Dashboard: `grid-cols-1 sm:grid-cols-2 gap-3`
- All three carry the `stagger-grid` class for staggered entrance.

## Motion

### Tokens and Curves
Three easing curves are defined as CSS variables and mirrored in the Tailwind `transitionTimingFunction`:
- `--ease-out` / `ease-out-strong`: `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out-quint feel), the default for interactions.
- `--ease-in-out` / `in-out-strong`: `cubic-bezier(0.77, 0, 0.175, 1)`.
- `--ease-drawer` / `drawer`: `cubic-bezier(0.32, 0.72, 0, 1)` for the mobile drawer.

No bounce, no elastic. Exponential ease-out throughout, consistent with the shared motion law.

### Keyframes (in `index.css`)
- `dropdown-in` (scale + fade) via `.dropdown-enter`, used by NotificationBell.
- `fade-in` via `.sidebar-overlay`.
- `slide-in-left` via `.sidebar-drawer`.
- `stagger-fade-in` via `.stagger-grid > *` with `nth-child` delays (0 to 300ms), used by Catalog/Dashboard/Pets and inline by LoadingState and the Login form.

### Interaction Patterns
- Tactile press: `active:scale-[0.97]` on buttons and nav items, `active:scale-[0.93]` on icon buttons, `active:scale-[0.98]` on PetCard.
- Hover brightness shifts on filled buttons/badges instead of color swaps.
- PetCard image zoom on hover, gated by `[@media(hover:hover)]` so touch devices skip it.
- `prefers-reduced-motion: reduce` collapses all animation and transition durations to ~0. This is honored globally.

## Responsive Behavior
- Breakpoints: default Tailwind (`sm:640`, `md:768`, `lg:1024`, `xl:1280`).
- Sidebar collapses to an animated drawer at `md`.
- Content padding scales `px-4 py-5` to `lg:px-10 lg:py-8`.
- Grids collapse 4 to 3 to 2 to 1.
- Topbar greeting and user name hide under `sm`.
- Login left panel hides under `lg`, with a mobile brand badge as fallback.
- Tables scroll horizontally (`overflow-x-auto`) rather than reflowing on mobile. Acceptable since tables are staff/desktop-facing; the mobile-first adopter sees card grids.

## Accessibility
- `lang="es"` on the document; semantic landmarks (`header`, `nav`, `main`, `aside`); one `<h1>` per page.
- Skip-to-content link in AppLayout (`sr-only` until focused) targeting `#main-content` (focusable `<main>`).
- Icon-only buttons carry `aria-label`: NotificationBell (bell, mark-read, delete, close), the table view action, Sidebar/Topbar/Gallery controls. The hamburger and Dialog close were already labelled.
- NotificationBell is an accessible disclosure: `aria-haspopup`/`aria-expanded` on the trigger, `role="dialog"` + label on the panel, Escape closes and returns focus, and a `sr-only aria-live="polite"` region announces the unread count.
- Focus rings: `focus-visible:ring` on all primitives, PetCard, Dashboard cards, and now Sidebar nav/logout, Topbar, NotificationBell, and Gallery controls.
- `prefers-reduced-motion` fully honored.
- Contrast verified (OKLCH to WCAG): all status soft badges pass AA (5.1 to 9.8); `--primary`, `rescue-600`, `--destructive`, and `--muted-foreground` were tuned so white-on-color, link text, and secondary text on `muted` surfaces clear 4.5:1. Solid status fills (timeline) meet the 3:1 graphical threshold and carry icons only.
- Status indicators pair color with text labels (badges) or icons (timeline Check/Circle), so they are not color-only.
- Remaining gaps: native `<select>` controls (PetStatusSelector, PetFilters) are styled manually outside the Input primitive; touch targets in the dense notification list are improved (`p-1.5`) but still below 44px.

## Language
All UI copy is in Spanish, hardcoded in components, no i18n framework. Accents are mostly correct in the current components (Adopción, Auditoría, Cerrar sesión, Notificaciones).
