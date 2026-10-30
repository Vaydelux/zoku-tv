# Zoku TV — Design System & Visual Direction

## 1. Visual Identity & Cinema Theme System

Zoku TV uses a **dark-first, cinema-grade atmospheric design system** powered by 18 curated theme palettes (`lib/themes.ts`) with full support for both **Dark** and **Light** appearance modes (`appearancePreference`).

- **Brand Lock on Entry Routes**: Public/entry routes (`/`, `/login`, `/signup`, `/profiles`) lock to the signature **Crimson Cinema (`theme-crimson`)** dark palette so the entry portal maintains a consistent theatrical identity.
- **Profile-Scoped Active Theme**: In-app routes (`/home`, `/discover`, `/search`, `/watchlist`, `/title/*`, `/anime/*`, `/watch/*`, `/settings`) dynamically apply the active profile's `themePreference` and `appearancePreference` via `applyTheme()` in `components/ClientInitializer.tsx`.

---

## 2. CSS Custom Property Tokens (`app/globals.css`)

| Token | Purpose |
| :--- | :--- |
| `--background` / `--background-gradient` | Base page background color and multi-radial atmospheric gradient |
| `--surface` / `--surface-gradient` | Card, modal, and glass-panel surface colors and directional gradients |
| `--surface-hover` | Interactive hover surface elevation |
| `--primary` / `--primary-contrast` | Primary brand accent and guaranteed readable foreground contrast |
| `--button-gradient` | Primary CTA fill gradient |
| `--on-surface` / `--on-surface-variant` | Primary and secondary readable typography colors |
| `--border-color` (`border-border-custom`) | Subtle theme-tinted structural border |
| `--shadow-card` / `--shadow-elevated` / `--shadow-glow` | Depth and focus-ring elevation tokens |

---

## 3. Typography Hierarchy

- **Display (`--font-display`)**: `"Space Grotesk"`, bold uppercase or tight tracking for Hero titles, section headers, and modal titles.
- **Body (`--font-sans`)**: `"Inter"`, high-legibility UI controls, descriptions, and card titles.
- **Technical / Metadata (`--font-mono`)**: `"JetBrains Mono"`, uppercase tracking-wider badges for release years, ratings, server status, and classification tags.

---

## 4. Accessibility, Focus Rings, & Reduced Motion

- **Keyboard & 10-Foot TV Focus**: All interactive elements (`a`, `button`, `input`, `select`, `[tabindex]`) display a `2px solid var(--primary)` outline on `:focus-visible`. Elements marked with `data-tv-focusable="true"` receive a 10-foot visible ring and subtle `1.03x` scale lift.
- **Reduced Motion**: `@media (prefers-reduced-motion: reduce)` disables ambient floating orbs, rail glide animations, and non-essential transitions.

---

## 5. Reusable UI Primitives (`components/ui/Primitives.tsx`)

- `PosterGridSkeleton`: Responsive 2-to-6 column aspect-ratio `2/3` loading skeleton grid.
- `EmptyStatePanel`: Glass-panel empty state with icon, title, description, and optional primary CTA.
- `ErrorStatePanel`: Accessible `role="alert"` error container with retry action.
- `ConfirmDialog`: Keyboard-accessible (`Escape` to dismiss, `role="alertdialog"`) confirmation modal for destructive actions (profile deletion, history clearing, cache reset).

