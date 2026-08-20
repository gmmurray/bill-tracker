# bill chill — Style Guide

## Color Palette

All colors are defined as CSS custom properties in `src/styles.css` and available as Tailwind utilities via the `chill-*` namespace.

### Neutrals

Derived from the cream ground (hue ~35°), **not** from a cool gray ramp. Blue-leaning grays read dingy on a warm background, and borders and muted labels appear on every surface — so a mismatched neutral family is the most visible mistake available.

| Token | Hex | Usage |
|---|---|---|
| `chill-bg` | `#fcf6ec` | Page background |
| `chill-surface` | `#fffdf9` | Cards and panels — a touch lighter than the page |
| `chill-text` | `#2b2622` | Primary text (14.7:1 on `chill-bg`) |
| `chill-text-muted` | `#736858` | Secondary text, dates, labels (4.95:1 — AA) |
| `chill-border` | `#ece4d8` | Card borders, dividers |

Keep `chill-text-muted` at or darker than this value. It's used at `text-xs`, where AA requires 4.5:1 and there's no headroom left.

### Accents — one hue family per job

| Role | Tokens | Usage |
|---|---|---|
| **Attention** (overdue) | `chill-coral` `#d97757`, `chill-peach` `#fbe5d4`, `chill-peach-border` `#f3d2bb` | Row accent, badges, banner, section header |
| **Warn** (due now) | `chill-amber` `#c17d1e`, `chill-amber-light` `#fbeacc` | Row accent, badges, banner, section header |
| **Settled** | `chill-teal` `#71c9c1`, `chill-teal-light` `#bfebe6` | Paid badges, Pay buttons, progress, success toast |
| **Selection** | `chill-purple` `#d7d0f6`, `chill-purple-light` `#efeaff` | Active nav, selected tab, hover — **never an action** |
| **Brand** | `chill-ice` `#7ec8e8` | "Chill." in the logotype only |

Anything not signalling one of those four states uses a neutral. If a new element seems to need a fifth accent, it probably needs a neutral or an existing role.

**Purple is not an action colour.** `Mark Paid` was lavender for a while and read as inert — the same weight as a disabled control. Affirmative actions belong to the settled family, so the colour carries the same meaning everywhere it appears.

**Destructive actions** (archive, delete) and **form validation** use Tailwind `red-*` directly. They're a self-contained family that appears only in those contexts, and are deliberately not part of the brand palette.

---

## Component Patterns

### Primitive Components (`src/components/ui/`)

Radix UI primitives wrapped with Tailwind. Keep these unstyled at the Radix level and apply all visual styling via Tailwind classes in the wrapper. Export a single named component per file.

```tsx
// Example: src/components/ui/button.tsx
import * as React from 'react'

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'pay' | 'default' | 'ghost'
}

export function Button({ variant = 'default', className, ...props }: Props) {
  // ...
}
```

### Hit areas

Small controls expand their clickable region with a transparent pseudo-element rather than growing visually — see `checkbox.tsx`, where `after:-inset-3` turns a 16px box into a ~40px target. A 16px control is well under the ~44px touch guidance, and the app is used on a phone.

When placing one, leave at least 12px of clearance from adjacent interactive elements so the invisible overhang doesn't swallow neighbouring taps.

### Feature Components

Live alongside their feature module or in `src/components/` if shared across features. No deeply nested component folders — flat is fine within a feature directory.

---

## Tailwind Conventions

- Use `chill-*` tokens for all brand colors — never hardcode hex values inline
- Spacing and sizing use standard Tailwind scale
- `min-h-screen` on the root layout; `px-20` (`paddingInline: 5rem`) for page-level horizontal padding
- Responsive design: mobile-first, but the app is primarily a desktop/tablet experience

---

## Dashboard-Specific Patterns

- **Attention banner:** `bg-chill-peach` + `border-l-chill-coral` when anything is overdue, `bg-amber-50` + `border-l-amber-500` when only due-now. Hides entirely when nothing is owed
- **Section headers:** `Overdue` → `bg-chill-peach`; `Pay now` → `bg-amber-50`; `This month` / `Next month` → plain `bg-chill-surface`
- **Row status accent:** a 4px left border — `border-l-chill-coral` for `OVERDUE`, `border-l-amber-500` for `DUE_NOW`, transparent otherwise. Settled rows get `bg-chill-bg/60` and struck-through names
- **Progress bar:** `chill-teal` fill on `chill-teal-light` track, showing the share of this month's cycles settled
- **Pay buttons:** `bg-chill-mint hover:bg-chill-mint-hover`
- **Selected schedule tab:** `bg-chill-purple`; unselected hover `bg-chill-purple-light`
