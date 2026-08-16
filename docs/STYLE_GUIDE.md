# bill chill — Style Guide

## Color Palette

All colors are defined as CSS custom properties in `src/styles.css` and available as Tailwind utilities via the `chill-*` namespace.

| Token | Hex | Usage |
|---|---|---|
| `chill-bg` | `#fcf6ec` | Page background (warm cream) |
| `chill-surface` | `#ffffff` | Card / panel backgrounds |
| `chill-purple` | `#d7d0f6` | Active nav, highlighted table rows |
| `chill-purple-light` | `#efeaff` | Checked checklist row background |
| `chill-peach` | `#fbe5d4` | Critical alert / overdue card background |
| `chill-peach-border` | `#f3d2bb` | Borders on warning elements |
| `chill-teal` | `#71c9c1` | Donut chart fill, positive indicators |
| `chill-teal-light` | `#bfebe6` | Donut chart track background |
| `chill-mint` | `#d1ebe0` | Pay button background |
| `chill-mint-hover` | `#bee3d3` | Pay button hover state |
| `chill-text` | `#111827` | Primary text |
| `chill-text-muted` | `#6b7280` | Secondary text, past dates, labels |
| `chill-border` | `#e5e7eb` | Card borders, dividers |
| `chill-ice` | `#7ec8e8` | "Chill." wordmark accent |

### Semantic Usage

- **Overdue / critical:** `chill-peach` background, `chill-peach-border` border
- **Missed schedule (amber warning):** use Tailwind `amber-*` utilities — not a custom token
- **Paid / positive:** `chill-mint` (buttons), `chill-teal` (charts)
- **Active / selected:** `chill-purple-light` background, `chill-purple` accent

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
