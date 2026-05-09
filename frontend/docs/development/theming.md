# Theming System

ContractGuard supports **dark mode** (default) and **light mode**, toggled from the navbar. The theme is implemented entirely with CSS custom properties — no class toggling on individual elements.

---

## How It Works

`ThemeProvider` (`app/components/ThemeProvider.tsx`) sets a `data-theme` attribute on `<html>`:

```html
<html data-theme="dark">  <!-- or data-theme="light" -->
```

`app/globals.css` defines all color variables for both themes:

```css
:root,
[data-theme="dark"] {
  --accent: #9945FF;
  --surface: #0f0f1a;
  /* ... */
}

[data-theme="light"] {
  --accent: #7B2FE0;
  --surface: #ffffff;
  /* ... */
}
```

---

## CSS Variable Reference

### Brand Colors

| Variable | Dark | Light | Usage |
|----------|------|-------|-------|
| `--accent` | `#9945FF` | `#7B2FE0` | Primary brand purple |
| `--accent-green` | `#14F195` | `#0db87a` | Solana green accent |
| `--accent-blue` | `#38BDF8` | `#0284c7` | Info blue |

### Backgrounds

| Variable | Dark | Light | Usage |
|----------|------|-------|-------|
| `--bg` | `#080810` | `#f5f5f7` | Page background |
| `--surface` | `#0f0f1a` | `#ffffff` | Card/panel background |
| `--surface-2` | `#1a1a2e` | `#f0f0f5` | Elevated surface |

### Borders

| Variable | Dark | Light | Usage |
|----------|------|-------|-------|
| `--border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.09)` | Subtle borders |
| `--border-light` | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.05)` | Very subtle |
| `--accent-border` | `rgba(153,69,255,0.25)` | `rgba(47,123,232,0.22)` | Accent-colored borders |

> **Note:** Use `--accent-border` instead of `--border` when the border needs to be visible in both themes (e.g., SVG orbit rings, highlighted cards).

### Text

| Variable | Dark | Light | Usage |
|----------|------|-------|-------|
| `--text-1` | `#f0f0ff` | `#0a0a14` | Primary text |
| `--text-2` | `#a0a0b8` | `#4a4a6a` | Secondary text |
| `--text-3` | `#606080` | `#8080a0` | Muted text / captions |

### Buttons

| Variable | Usage |
|----------|-------|
| `--btn-primary-bg` | Primary button background |
| `--btn-primary-text` | Primary button text |
| `--btn-ghost-bg` | Ghost/secondary button background |
| `--btn-ghost-border` | Ghost button border |
| `--btn-ghost-text` | Ghost button text |

### Forms

| Variable | Usage |
|----------|-------|
| `--input-bg` | Input/textarea background |
| `--input-border` | Input border |
| `--input-text` | Input text color |
| `--input-placeholder` | Placeholder text color |

### Effects

| Variable | Usage |
|----------|-------|
| `--glass-shadow` | Box shadow for glass-morphism panels |
| `--glow-accent` | Purple glow effect (accent elements) |

---

## Using Theme Variables in Components

Always use CSS variables instead of hardcoded colors:

```tsx
// Good
<div style={{ background: "var(--surface)", color: "var(--text-1)" }}>

// Avoid
<div style={{ background: "#0f0f1a", color: "#f0f0ff" }}>
```

In Tailwind (via `tailwind.config.ts` custom properties or `className` with `style`):

```tsx
// Inline style (always works)
<button style={{ background: "var(--btn-primary-bg)" }}>

// Or via Tailwind if CSS vars are registered in tailwind.config.ts
<button className="bg-[var(--btn-primary-bg)]">
```

---

## Theme Persistence

Selected theme is saved to `localStorage` by `ThemeProvider`. It persists across sessions and respects the initial system preference (`prefers-color-scheme`) if no stored preference exists.
