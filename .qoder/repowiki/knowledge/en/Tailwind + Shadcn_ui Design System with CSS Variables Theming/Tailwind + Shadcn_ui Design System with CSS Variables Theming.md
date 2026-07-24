---
kind: frontend_style
name: Tailwind + Shadcn/ui Design System with CSS Variables Theming
category: frontend_style
scope:
    - '**'
source_files:
    - tailwind.config.js
    - src/index.css
    - components.json
    - postcss.config.js
    - src/lib/utils.ts
    - src/components/ui/button.tsx
---

The frontend styling system is built on Tailwind CSS v3, shadcn/ui (New York style), and Radix UI primitives, unified through a CSS-variable-driven design token layer.

Core stack
- Tailwind CSS (tailwind.config.js) with darkMode: class, custom screens (mobile ≤639px, 2xl ≥1440px), and the tailwindcss-animate plugin for accordion/caret animations.
- PostCSS pipeline (postcss.config.js) running only tailwindcss and autoprefixer.
- shadcn/ui CLI configured via components.json: New York style, TSX mode, CSS variables enabled, base color neutral, icon library lucide, path aliases @/components/ui, @/lib/utils, etc.

Design tokens & theming
All visual tokens live as HSL CSS custom properties in src/index.css under :root (light) and .dark (dark). Tokens cover:
- Semantic palette: background, foreground, card, popover, primary, secondary, muted, accent, destructive, plus domain-specific success, warning, info, link / link-hover.
- Chart colors: chart-1 … chart-5.
- Sidebar surface tokens: sidebar* family.
- Spacing/radius: --radius-sm … --radius-2xl, --radius-full.
- Shadows: --shadow-2xs … --shadow-2xl.
- Fonts: --font-sans (Noto Sans SC + CJK fallbacks), --font-serif, --font-mono (JetBrains Mono).

Tailwind's theme.extend.* maps every token to its CSS variable, so components consume semantic names like bg-primary text-primary-foreground rather than raw colors. Dark mode toggles by adding/removing the dark class on the root element.

Component styling methodology
- shadcn/ui primitives in src/components/ui/* are generated with Class Variance Authority (cva). Each component declares variant and size variant sets and composes classes via cn() from @/lib/utils (a thin clsx + tailwind-merge wrapper).
- Example pattern: buttonVariants = cva(base, { variants: { variant: {...}, size: {...} }, defaultVariants }), then className={cn(buttonVariants({ variant, size, className }))}.
- No inline styles or per-component CSS files; all styling is utility-first.

Global base styles
src/index.css also defines:
- Global border reset (* { @apply border-border }), body background gradients using primary/accent HSL, focus-visible ring defaults, and app-wide font/antialiasing.
- Two application-specific animation utilities: .radiograph-panel, .scanner-line, .pulse-line with @keyframes scan / pulse, respecting prefers-reduced-motion.

Responsive strategy
- Mobile-first breakpoints defined in tailwind.config.js: mobile (max-width 639px) and 2xl (1440px). Components should use these named breakpoints rather than hard-coded pixel values.

Conventions developers should follow
1. Use semantic token names (text-primary, bg-card, border-destructive) — never hard-code HSL/hex values in components.
2. For new primitive-like components, follow the shadcn/ui cva + cn() pattern exported from src/components/ui/*; do not write ad-hoc CSS modules.
3. Extend the theme via tailwind.config.js theme.extend (colors, radius, shadows, fonts) and keep matching CSS variables in src/index.css under both :root and .dark.
4. Toggle dark mode by applying/removing the dark class at the document root; rely on dark: Tailwind variants.
5. Use the mobile and 2xl breakpoint names instead of arbitrary values.
6. Compose conditional classes through cn(...) to avoid duplicate/conflicting Tailwind rules.