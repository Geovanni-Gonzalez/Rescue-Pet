# Rescue Pet: Design System

Extracted from codebase on 2026-06-04. This documents the current state, not the aspirational one.

## Color System

### Architecture
HSL CSS custom properties defined in `frontend/src/index.css`, consumed via Tailwind config as `hsl(var(--token))`. A parallel `rescue-*` scale in the Tailwind config provides hardcoded hex values used directly in components.

### Semantic Tokens (CSS Variables)
| Token | Light | Dark | Usage |
|---|---|---|---|
| `--background` | `120 20% 98%` | `120 10% 10%` | Page background (green-tinted off-white) |
| `--foreground` | `120 10% 20%` | `120 10% 95%` | Primary text |
| `--card` | `0 0% 100%` | `120 10% 12%` | Card surfaces |
| `--primary` | `142 71% 45%` | same | Primary actions, links (green) |
| `--secondary` | `120 20% 92%` | `120 10% 20%` | Secondary surfaces |
| `--muted` | `120 20% 92%` | `120 10% 20%` | Subdued backgrounds |
| `--muted-foreground` | `120 5% 45%` | `120 10% 65%` | Secondary text |
| `--accent` | `24 95% 53%` | same | Warm orange accent (declared, rarely used) |
| `--destructive` | `0 84% 60%` | `0 62% 30%` | Error/danger actions |
| `--border` | `120 15% 85%` | `120 10% 20%` | Borders |
| `--ring` | `142 71% 45%` | same | Focus rings |
| `--radius` | `0.75rem` | same | Base border radius |

### Rescue Scale (Hardcoded Hex)
| Token | Value | Notes |
|---|---|---|
| `rescue-50` | `#f0fdf4` | Tinted backgrounds, active sidebar items, empty states |
| `rescue-100` | `#dcfce7` | Icon containers, avatar backgrounds, catalog headers |
| `rescue-500` | `#22c55e` | Loading spinners, sort indicators |
| `rescue-600` | `#16a34a` | Brand text, sidebar active, link color, CTA buttons |
| `rescue-900` | `#14532d` | Headings on rescue-tinted backgrounds |
| `rescue-accent` | `#f97316` | Declared but unused in components |

### Status Colors (Inline Tailwind, No Tokens)
| Context | Color Pattern |
|---|---|
| AVAILABLE | `green-100/800/200` |
| QUARANTINE | `yellow-100/800/200` |
| TREATMENT | `blue-100/800/200` |
| ADOPTED | `purple-100/800/200` |
| DECEASED | `gray-100/800/200` |
| Notification INFO | `blue-100/700` |
| Notification WARNING | `yellow-100/700` |
| Notification SUCCESS | `green-100/700` |
| Notification ERROR | `red-100/700` |
| Compatibility >= 80 | `green-100/800/200` |
| Compatibility >= 50 | `yellow-100/800/200` |
| Compatibility < 50 | `red-100/800/200` |

### Color Strategy
Currently **Restrained**: green-tinted neutrals with `rescue-600` as the single accent. The declared orange accent (`--accent`, `rescue-accent`) is nearly unused. Status colors use raw Tailwind palette (green, yellow, blue, purple, red) without passing through the design token layer.

### Issues
- Two parallel color systems (CSS variables vs `rescue-*` hex) with no single source of truth.
- Dark mode variables are defined but dark mode is not implemented (no toggle, no class application).
- Status colors are hardcoded per-component (StatusBadge, CompatibilityScoreBadge, NotificationBell, AdoptionStatusTimeline) with duplicated mappings.
- The orange accent exists in three places (`--accent`, `rescue-accent`, inline `#f97316`) and is used in zero visible surfaces.

## Typography

### Font Stack
No custom font loaded. The app uses Tailwind's default `font-sans` (system font stack via `body` class in `index.css`).

### Scale (Observed in Components)
| Class | Usage |
|---|---|
| `text-2xl font-bold` | Page titles (Login, Catalog, Sidebar brand) |
| `text-lg font-semibold` | Card titles, empty state headings, dialog titles |
| `text-sm font-medium` | Nav items, labels, form labels, topbar name |
| `text-sm` | Body text, descriptions, notification messages |
| `text-xs` | Badges, metadata, timestamps, helper text |
| `text-[10px]` / `text-[11px]` | Notification type labels, timestamps (arbitrary values) |

### Issues
- No defined type scale. Sizes are chosen ad-hoc per component.
- The jump from `text-sm` (14px) to `text-2xl` (24px) skips `text-base` (16px), `text-lg` (18px), and `text-xl` (20px) in most pages.
- Arbitrary pixel sizes (`text-[10px]`, `text-[11px]`) in NotificationBell bypass the scale entirely.
- No `max-w-prose` or `ch`-based line length caps anywhere.

## Spacing

### Observed Patterns
| Context | Values |
|---|---|
| Page content | `p-4 sm:p-6 lg:p-8` (AppLayout main) |
| Section gaps | `space-y-6` (nearly universal) |
| Card padding | `p-6` (Card default), overridden to `p-4` in PetCard |
| Grid gaps | `gap-6` |
| Form field gaps | `space-y-2` (FormField), `space-y-4` (Login form) |
| Sidebar nav | `space-y-1` between items, `px-4` container |
| Inline element gaps | `gap-2`, `gap-3`, `gap-4` |

### Issues
- Uniform `space-y-6` on nearly every page creates monotonous rhythm.
- No spacing scale documented; values are picked per component.

## Elevation

### Shadow Usage
| Level | Class | Where |
|---|---|---|
| None | (default) | Most elements |
| Subtle | `shadow-sm` | Buttons, inputs, tables, form containers |
| Medium | `shadow` | Cards (base component) |
| Lifted | `shadow-md` | PetCard hover state |
| Prominent | `shadow-lg` | Login/Register cards, notification dropdown, dialogs |

### Issues
- Card base has `shadow` but most pages wrap content in additional cards or containers that also have shadows, creating inconsistent depth.

## Border Radius

### Observed Scale
| Class | Rem | Where |
|---|---|---|
| `rounded-sm` | calc(0.75rem - 4px) = 0.5rem | Dialog close button |
| `rounded-md` | calc(0.75rem - 2px) = 0.5625rem | Buttons, inputs, badges, most interactive elements |
| `rounded-lg` | 0.75rem | Dialogs, image containers, timeline elements |
| `rounded-xl` | via Card component | Cards, section headers, form containers |
| `rounded-full` | 50% | Avatars, notification count, icon containers, pill badges |

### Issues
- `rounded-md` and `rounded-lg` are nearly identical (0.5625rem vs 0.75rem) due to the CSS variable math, reducing their visual distinction.

## Components

### Primitives (ui/)
Built on shadcn/ui pattern with CVA variants and Radix UI primitives.

| Component | Variants | Notes |
|---|---|---|
| Button | default, destructive, outline, secondary, ghost, link / default, sm, lg, icon | Standard shadcn setup |
| Badge | default, secondary, destructive, outline | Standard shadcn setup |
| Card | (no variants) | rounded-xl + shadow |
| Input | (no variants) | h-9, rounded-md, shadow-sm |
| Label | (no variants) | text-sm font-medium |
| Dialog | (no variants) | Radix-based with animations |

### Domain Components
| Component | Purpose | Notes |
|---|---|---|
| StatusBadge | Pet status display | Maps 5 statuses to inline color classes |
| RoleBadge | User role display | Maps 4 roles to Badge variants |
| CompatibilityScoreBadge | Score percentage | Tricolor thresholds (80/50) |
| AdoptionStatusTimeline | Process step indicator | Custom stepper with circles + connecting lines |
| PetCard | Animal card in grids | Card + image + status + action button |
| FormField | Labeled input wrapper | Label + Input + error message |
| LoadingState | Full-page spinner | Centered Loader2 icon with message |
| EmptyState | Zero-data placeholder | Icon circle + title + description |
| ConfirmDialog | Confirmation modal | Dialog with confirm/cancel buttons |
| NotificationBell | Header notification dropdown | Custom dropdown (not Radix popover) |
| PetFilters | Search + filter bar | Text input + select dropdowns |
| LocationPicker | Map selector | Leaflet integration |
| GalleryManager | Photo upload/manage | Image grid with upload, reorder, delete |
| QRDisplay | QR code display | Canvas-rendered QR with download |

### Layout Components
| Component | Notes |
|---|---|
| AppLayout | Sidebar + Topbar + main content area. Sidebar hidden on mobile with overlay toggle. |
| Sidebar | Fixed 264px, white bg, border-right. 14+ nav items without grouping. |
| Topbar | 64px height, white bg, border-bottom. Greeting + notification bell + user info. |
| ProtectedRoute | Route guard with role filtering. |
| SmartRedirect | Role-based redirect from `/`. |

## Layout Patterns

### App Shell
- Sidebar (w-64) + content area, hidden sidebar on mobile with overlay.
- Topbar (h-16) with hamburger on mobile.
- Content area: `max-w-7xl mx-auto` with responsive padding.

### Page Patterns
- **List pages** (Pets, Catalog, AdminUsers, etc.): Header section + filters + grid/table + pagination.
- **Detail pages** (PetDetail, AdoptionRequestDetail): Section blocks with gray dividers.
- **Auth pages** (Login, Register, ForgotPassword): Centered card on gray background.
- **Form pages** (PetNew, PetEdit, Profile): Card container with stacked form fields.

### Grid
- Catalog: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`
- Pets management: same pattern.
- No other grid layouts observed.

## Icons
Lucide React throughout. 60+ icons imported across components. Sizes: `w-4 h-4` (inline), `w-5 h-5` (nav/actions), `w-6 h-6` (topbar), `w-7 h-7` (brand logo), `w-8 h-8` (empty states), `w-10 h-10` (loading).

## Motion
- `transition-colors` on buttons, nav items, notifications (Tailwind default 150ms).
- `animate-spin` on loading spinners and recalculate button.
- Dialog open/close animations via `tailwindcss-animate` (fade + zoom + slide).
- `hover:shadow-md` transition on PetCard (no explicit duration).
- No custom easing curves defined.

## Responsive Behavior
- Breakpoints: default Tailwind (`sm:640`, `md:768`, `lg:1024`, `xl:1280`).
- Sidebar collapses to overlay at `md` breakpoint.
- Content padding scales: `p-4 sm:p-6 lg:p-8`.
- Grids collapse: 4-col -> 3 -> 2 -> 1.
- Topbar elements hide on mobile (`hidden sm:block`, `hidden sm:flex`).
- Tables do not adapt to mobile (horizontal scroll assumed but not implemented).

## Accessibility
- `aria-label="Abrir menu"` on hamburger button.
- `sr-only` text on Dialog close button.
- Focus rings via `focus-visible:ring-1 focus-visible:ring-ring` on inputs and buttons.
- No skip-to-content link.
- No ARIA roles on custom widgets (notification dropdown, status timeline).
- Color-only status indicators (StatusBadge, CompatibilityScoreBadge) without secondary encoding.

## Language
All UI copy is in Spanish. No i18n framework. Strings are hardcoded in components. Some strings have missing accents ("sesion" instead of "sesion", "electronico" instead of "electronico").
