# Design System: Bullia

## 1. Visual Theme & Atmosphere

Bullia is a professional stock analysis dashboard for investors — part fintech platform, part analytical tool. The design operates in two modes with equal weight: a clean white-surfaced light theme and a deep gray-black dark theme. Neither is an afterthought. The interface is information-dense by necessity — ranking tables, price charts, signal badges, and fundamentals panels all coexist — but disciplined whitespace and a restrained color vocabulary prevent it from feeling chaotic.

The brand accent is **Emerald** (`#10b981`), chosen as a direct semantic tie to growth, positive returns, and conviction signals. It appears on the highest-conviction tier badge ("Alta Convicción"), primary action buttons, and interactive highlights. All other chromatic color is reserved for semantic signal communication (red for sell/risk, yellow for caution, blue for chart lines).

Typography is built on **Geist Sans** (Google Fonts, via `next/font`) — the same typeface used by Vercel — giving the UI a clean, modern developer aesthetic at all weights. **Geist Mono** handles all tabular numbers, price values, and scores.

**Key Characteristics:**
- Dual-mode first: light (`#f8fafc` base) and dark (`#111827` base) receive equal design attention
- Brand emerald (`#10b981`) used exclusively for positive signals and primary CTAs
- Geist Sans for UI; Geist Mono for all numeric/financial data
- Rounded cards (`rounded-2xl` = 16px) as the dominant surface pattern
- Sticky frosted-glass header with backdrop blur
- Tab navigation with a sliding active-pill indicator
- Signal badges use a 3-tier system: Emerald (Alta Convicción) / Yellow (Vigilancia) / Red (Reducir)
- Chart line: `#2563eb` (blue-600) — data, not brand

---

## 2. Color Palette & Roles

### Brand
| Name | Value | Role |
|---|---|---|
| Brand Emerald | `#10b981` | Primary brand, CTA, Alta Convicción badge, active states |
| Brand Emerald Dark | `#059669` | Hover on brand elements |
| Brand Emerald Subtle | `rgba(16,185,129,0.12)` | Soft badge backgrounds, hover surfaces |
| Brand Emerald Text Dark | `#065f46` | Text on light emerald bg (light mode) |
| Brand Emerald Text Light | `#6ee7b7` | Text on dark emerald bg (dark mode) |

### Background Surfaces
| Name | Value (Light) | Value (Dark) | Role |
|---|---|---|---|
| Page | `#f8fafc` | `#111827` | Outermost canvas |
| Card / Surface | `#ffffff` | `#1f2937` | Cards, panels, modals |
| Elevated | `#f3f4f6` | `#374151` | Hover states, striped rows, elevated containers |
| Header | `rgba(255,255,255,0.8)` | `rgba(17,24,39,0.85)` | Sticky header (+ backdrop-blur) |

### Text
| Name | Value (Light) | Value (Dark) | Role |
|---|---|---|---|
| Primary | `#0a0a0a` | `#f9fafb` | Headings, primary labels |
| Secondary | `#4b5563` | `#d1d5db` | Body text, descriptions |
| Muted | `#6b7280` | `#9ca3af` | Metadata, timestamps, captions |
| Disabled | `#9ca3af` | `#6b7280` | Disabled inputs, de-emphasized |

### Border
| Name | Value (Light) | Value (Dark) | Role |
|---|---|---|---|
| Standard | `#e5e7eb` | `#374151` | Card borders, dividers |
| Subtle | `#f3f4f6` | `#1f2937` | Hairline, inner separators |

### Semantic / Signal
| Name | Value | Role |
|---|---|---|
| Positive / Alta Convicción | `#10b981` (bg), `#065f46` (text light), `#6ee7b7` (text dark) | Growth, buy, highest conviction tier |
| Caution / Vigilancia | `#fde047` (bg), `#a16207` (text light), `#fde047` (text dark) | Watch, accumulate with care |
| Risk / Reducir | `#fca5a5` (bg), `#b91c1c` (text light), `#f87171` (text dark) | Sell, reduce, high risk |
| Chart Line | `#2563eb` | Price chart (always blue, not brand) |
| Error | `#fee2e2` (bg), `#b91c1c` (text) | Validation errors, API failures |

### Analyst Consensus (Donut Chart)
| Slice | Hex |
|---|---|
| Strong Buy | `#10b981` |
| Buy | `#4ade80` |
| Hold | `#fde047` |
| Sell | `#f87171` |
| Strong Sell | `#ef4444` |

---

## 3. Typography Rules

### Font Families
- **Primary UI**: `Geist Sans` (via `--font-geist-sans`), fallbacks: `system-ui, -apple-system, sans-serif`
- **Monospace / Numbers**: `Geist Mono` (via `--font-geist-mono`), fallbacks: `ui-monospace, SF Mono, Menlo`
- **Monospace use**: All price values, scores, percentages, table numbers, ticker symbols

### Hierarchy
| Role | Size | Weight | Line Height | Notes |
|---|---|---|---|---|
| Page Title (BULLIA) | 24px / 1.5rem | 600 | 1.25 | Header brand name, `hidden sm:block` |
| Section Heading | 18px / 1.125rem | 600 | 1.33 | Tab section titles |
| Card Title / Stock Name | 18px / 1.125rem | 600 | 1.33 | Detail panel stock header |
| Feature Title | 16px / 1rem | 600 | 1.5 | Column headers, card subheadings |
| Body | 14px / 0.875rem | 400 | 1.5 | Table rows, descriptions |
| Label | 13px / 0.8125rem | 500 | 1.4 | Badge text, nav links, form labels |
| Caption / Metadata | 12px / 0.75rem | 400 | 1.5 | Timestamps, sector info, captions |
| Micro | 11px / 0.6875rem | 500 | 1.4 | Tiny uppercase labels |
| Price Display | 20px / 1.25rem | 700 | 1.25 | Geist Mono, live price |
| Score | 14px / 0.875rem | 700 | 1.4 | Geist Mono, `tabular-nums` |
| Percentage | 14px / 0.875rem | 500 | 1.4 | Geist Mono, colored by direction |

### Principles
- **Geist Mono for all financial data**: prices, scores, percentages, returns — never Geist Sans
- **`tabular-nums`** on all numeric columns to prevent layout shift
- **No weight above 700** — Bullia doesn't shout
- **Section sublabels**: `text-xs font-semibold text-gray-500 uppercase tracking-wide` — this is the standard card-section header pattern used throughout

---

## 4. Component Stylings

### Buttons

**Primary Brand (CTA)**
- Background: `#10b981`
- Text: `#ffffff`
- Padding: `8px 16px`
- Radius: `8px` (rounded-lg)
- Hover: `#059669`

**Ghost / Secondary**
- Background: `transparent`
- Text: `#374151` / `#d1d5db` dark
- Border: `1px solid #e5e7eb` / `#374151` dark
- Radius: `8px`
- Hover: `#f9fafb` / `#1f2937` dark

**Icon Button (Header)**
- Size: `32px × 32px` (w-8 h-8)
- Radius: `8px` (rounded-lg)
- Border: `1px solid #e5e7eb` / `#525252` dark
- Hover bg: `#f3f4f6` / `#262626` dark

**Range Selection (Chart)**
- Active: `bg-black text-white` (light) / `bg-white text-black` (dark)
- Inactive: bordered ghost, hover gray
- Radius: `8px`
- Size: `px-2 py-1 text-xs`

**User Avatar Button**
- Size: `32px × 32px`, `border-radius: 50%`
- Background: `#000000` (light) / `#ffffff` (dark)
- Text: `#ffffff` (light) / `#000000` (dark)
- Content: first letter of display name or email

### Cards & Containers

**Standard Card**
- Background: `#ffffff` / `#1f2937` dark
- Border: `1px solid #e5e7eb` / `#374151` dark
- Radius: `16px` (rounded-2xl)
- Padding: `16px` (p-4)
- Shadow: none (border is the container)

**Dark Card Override** (signals panel, fundamentals)
- Background: `#ffffff` / `#111827` dark
- Border: `1px solid current` / `#404040` dark
- Radius: `16px`

### Badges / Pills

**Alta Convicción**
- Background: `#d1fae5` / `rgba(5,150,105,0.25)` dark
- Text: `#065f46` / `#6ee7b7` dark
- Radius: `9999px`
- Font: `12px weight-500`

**Vigilancia**
- Background: `#fef9c3` / `rgba(180,130,0,0.25)` dark
- Text: `#a16207` / `#fde047` dark
- Radius: `9999px`

**Reducir**
- Background: `#fee2e2` / `rgba(185,28,28,0.25)` dark
- Text: `#b91c1c` / `#f87171` dark
- Radius: `9999px`

**Asset Type Tag**
- Background: `rgba(107,114,128,0.1)`
- Text: `#6b7280`
- Radius: `6px`

### Tables

- Header row: `bg-gray-100 text-gray-700` / `bg-neutral-700 text-neutral-100` dark
- Row hover: `bg-gray-50` / `bg-neutral-800` dark
- Selected row: `bg-emerald-50 border-l-2 border-emerald-500`
- All numeric cells: Geist Mono, `tabular-nums`
- Positive values: `text-emerald-600`
- Negative values: `text-red-500`

### Navigation (Tab Bar)
- Container: `flex`, inline with header
- Active tab: sliding pill indicator (`bg-gray-900 text-white` / `bg-white text-gray-900` dark)
- Inactive tabs: `text-gray-500` hover `text-gray-900`
- Animation: `transform transition-all duration-200 ease-out`

### Inputs & Selects
- Background: `#ffffff` / `#1f2937` dark
- Border: `1px solid #e5e7eb` / `#374151` dark
- Radius: `8px`
- Text: `#111827` / `#f9fafb` dark
- Placeholder: `#9ca3af`
- Focus: `ring-2 ring-emerald-500`

### Modals
- Backdrop: `rgba(0,0,0,0.5)` fixed overlay
- Panel: white / `#1f2937` dark, `rounded-2xl`, `shadow-xl`
- Max width: `448px` (max-w-md)
- Padding: `24px`

---

## 5. Layout Principles

### Spacing Scale
- Base unit: 4px
- Primary rhythm: `4px, 8px, 12px, 16px, 24px, 32px, 40px, 48px`
- Card padding: `16px` (p-4)
- Section gap: `24px` (gap-6)
- Main content padding: `16px horizontal, 24px vertical` (px-4 py-6)

### Grid & Container
- Max content width: `1152px` (max-w-6xl)
- Detail panel: `3-column grid` — left 2/3 (chart + fundamentals), right 1/3 (signals)
- Tab sections: single-column content below the detail panel
- Fundamentals inner grid: `2-column` (left: stats, right: consensus + description)

### Whitespace Philosophy
- Cards are the atomic layout unit — everything lives inside a `rounded-2xl` card
- Section headers (`text-xs uppercase tracking-wide`) divide content within cards
- Tables use compact rows (`py-2`) to maximize data density without sacrificing readability

### Border Radius Scale
| Token | Value | Use |
|---|---|---|
| sm | `4px` | Badges, tight tags |
| md | `8px` | Buttons, inputs, selects |
| lg | `12px` | Smaller cards, dropdowns |
| xl | `16px` | Standard cards (rounded-2xl) |
| full | `9999px` | Tier badges, pills, avatar |

---

## 6. Depth & Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat (0) | No shadow, page bg | Canvas |
| Card (1) | `1px solid border` | Standard surface, no shadow |
| Hover (2) | Bg color shift | Row hover, button hover |
| Header (3) | `backdrop-blur + bg/80 opacity` | Sticky header |
| Dropdown (4) | `shadow-xl` + border | User menu, symbol dropdown |
| Modal (5) | `shadow-xl` + backdrop overlay | Modals |

**Philosophy**: Elevation is communicated through borders + background lightness steps, not shadow depth. Shadows appear only at dropdown and modal level.

---

## 7. Do's and Don'ts

### Do
- Use `#10b981` (emerald-500) exclusively for brand CTAs, active states, and Alta Convicción badges
- Use Geist Mono with `tabular-nums` for ALL financial data — prices, scores, percentages, returns
- Apply `rounded-2xl` (16px) for all primary card surfaces
- Use the 3-tier badge system (emerald / yellow / red) consistently across all tabs
- Keep the `text-xs font-semibold text-gray-500 uppercase tracking-wide` pattern for all card section labels
- Apply `backdrop-blur` on the sticky header — it's a signature visual element
- Use `dark:` variants rather than CSS overrides for new components

### Don't
- Don't use the emerald brand color for chart lines — chart lines are always `#2563eb` (blue)
- Don't introduce new accent colors without a semantic reason — the palette is intentionally minimal
- Don't use weight 800 or 900 — maximum weight is 700
- Don't use box shadows on cards — border-only is the Bullia card style
- Don't use pill buttons for primary actions — radius is `8px`, not `9999px`, for buttons
- Don't add color to the header chrome — it must stay neutral (white/dark-gray + blur)
- Don't use `!important` overrides for new components — use Tailwind `dark:` classes

---

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 640px | Single column, compact tab labels (icons only or short), stacked header |
| SM | 640px | Header switches from stacked to row layout |
| MD | 768px | Detail panel inner grid: 2-column fundamentals |
| LG | 1024px | Detail panel: 3-column (chart 2/3 + signals 1/3) |
| XL | 1280px | Max width reached (max-w-6xl = 1152px) |

### Touch Targets
- All icon buttons: `32px × 32px` minimum (w-8 h-8)
- Tab bar items: adequate horizontal padding for tap
- Table rows: `py-2` minimum for touch scroll

### Collapsing Strategy
- Header: flex-col (mobile) → flex-row (md+), tab bar scrolls horizontally on mobile
- Detail panel: single column (mobile) → lg:grid-cols-3
- Fundamentals inner: single column → md:grid-cols-2
- Tables: horizontal scroll on mobile (overflow-x-auto)
- Logo text "BULLIA": hidden on xs, visible from sm

---

## 9. Agent Prompt Guide

### Quick Color Reference
| Token | Hex | Use |
|---|---|---|
| Brand | `#10b981` | CTA, Alta Convicción, active states |
| Brand Hover | `#059669` | Hover on brand elements |
| Page bg (light) | `#f8fafc` | |
| Page bg (dark) | `#111827` | |
| Card bg (light) | `#ffffff` | |
| Card bg (dark) | `#1f2937` | |
| Primary text (light) | `#0a0a0a` | |
| Primary text (dark) | `#f9fafb` | |
| Muted text | `#6b7280` | |
| Chart line | `#2563eb` | Always blue |
| Positive | `#10b981` | Returns, momentum up |
| Negative | `#ef4444` | Returns, momentum down |
| Border (light) | `#e5e7eb` | |
| Border (dark) | `#374151` | |

### Fonts
- UI: `Geist Sans` (var `--font-geist-sans`)
- Numbers / code: `Geist Mono` (var `--font-geist-mono`)

### Standard Card Prompt
> "Create a card: `bg-white border border-gray-200 rounded-2xl p-4 dark:bg-gray-800 dark:border-gray-700`. Section label: `text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3`."

### Standard Table Row Prompt
> "Table header: `bg-gray-100 text-xs text-gray-700 dark:bg-neutral-700 dark:text-neutral-100`. Row hover: `hover:bg-gray-50 dark:hover:bg-neutral-800`. Numeric cells: Geist Mono, `tabular-nums`, green if positive (`text-emerald-600`), red if negative (`text-red-500`)."

### Brand CTA Button Prompt
> "Button: `bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors`."

### Badge Prompt
> "Alta Convicción: `bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs px-2 py-0.5 rounded-full font-medium`. Vigilancia: yellow variant. Reducir: red variant."

### Iteration Rules
1. Brand color (`#10b981`) = growth signal only. Do not use it decoratively.
2. Geist Mono + `tabular-nums` on every number without exception.
3. All cards → `rounded-2xl` + `border` (no shadow).
4. Dark mode → always use `dark:` Tailwind classes, not CSS overrides.
5. Section labels inside cards → `text-xs font-semibold text-gray-500 uppercase tracking-wide`.
6. Chart lines → always `#2563eb`, never brand emerald.
7. Tier badges → 3-level only: emerald / yellow / red. No new tiers.
