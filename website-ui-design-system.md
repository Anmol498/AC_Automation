# Website & App UI Design System

Design tokens + patterns you can hand straight to a coding agent for implementation or an audit pass. This is a **system**, not one-off styling — it's meant to sit on top of what you've already got (blue accent token, Phosphor icons, the P-01→P-17 phase timeline) rather than replace it.

Two contexts get different defaults below: **App/Dashboard** (Satguru AC portal, TravelWindo CRM — dense, data-heavy, used daily) and **Marketing** (the AC-install landing site — persuasive, first-impression, used once). Don't apply marketing-scale type or generous motion to dashboard screens; it slows down daily use.

---

## 1. Typography

### Type scale
Base 16px, modular scale. Dashboards want a tighter ratio (1.125–1.2) so more fits on screen without feeling cramped; marketing pages can go bigger (1.25–1.333) since impact matters more than density.

**App/Dashboard scale (default for Satguru & TravelWindo):**
```css
--font-size-xs: 0.75rem;    /* 12px – timestamps, badges, helper text */
--font-size-sm: 0.8125rem;  /* 13px – table cells, secondary labels */
--font-size-base: 0.875rem; /* 14px – default body/UI text */
--font-size-md: 1rem;       /* 16px – emphasized body, modal text */
--font-size-lg: 1.125rem;   /* 18px – card titles, H4 */
--font-size-xl: 1.375rem;   /* 22px – H3, section headers */
--font-size-2xl: 1.75rem;   /* 28px – H2, page headers */
--font-size-3xl: 2.25rem;   /* 36px – H1, rare in dashboards */
```

**Marketing scale (AC-install landing site):**
```css
--font-size-base: 1rem;      /* 16px */
--font-size-lg: 1.25rem;     /* 20px */
--font-size-xl: 1.75rem;     /* 28px */
--font-size-2xl: 2.5rem;     /* 40px */
--font-size-3xl: 3.5rem;     /* 56px – hero */
```

### Weights
```css
--font-regular: 400;   /* body */
--font-medium: 500;    /* labels, table headers, nav items */
--font-semibold: 600;  /* card titles, H3/H4 */
--font-bold: 700;      /* H1/H2 only — don't reach for bold to emphasize body text */
```

### Line height
```css
--leading-tight: 1.15;    /* headings */
--leading-snug: 1.35;     /* UI labels, buttons, table cells */
--leading-normal: 1.5;    /* body copy, form helper text */
--leading-relaxed: 1.65;  /* long-form paragraphs */
```

### Letter spacing
```css
--tracking-tight: -0.02em;  /* headings 28px+ */
--tracking-normal: 0;
--tracking-wide: 0.05em;    /* all-caps labels, status badges */
```

### Hierarchy rule
Two adjacent text elements need at least one of: ≥1.15x size difference, a weight step, or a color/opacity step. Size alone below 1.15x reads as an inconsistency, not intentional hierarchy.

### Typeface pairing
If both headings and body are currently the same system font, that's the single biggest thing making the UI feel generic. Pick a display/body pair deliberately for the marketing site specifically — not whatever's fastest to import. Dashboards can stay single-family (a good UI grotesk like Inter, Geist, or IBM Plex Sans) since consistency matters more than personality when someone's staring at a table for 8 hours.

---

## 2. Color system

Token by **role**, not by raw hue. This is what lets a dark sidebar or future dark mode work without rewriting every component.

```css
/* Surfaces (light mode base) */
--surface-base: #ffffff;      /* page background */
--surface-raised: #f8f9fb;    /* cards, panels */
--surface-overlay: #ffffff;   /* modals, popovers — pair with shadow-lg to separate */
--surface-sunken: #f1f2f5;    /* input backgrounds, code blocks */

/* Text */
--text-primary: #0f1115;      /* headings, primary content */
--text-secondary: #5b616e;    /* body copy, descriptions */
--text-tertiary: #8b909c;     /* placeholders, disabled, timestamps — decorative only, never load-bearing */
--text-inverse: #ffffff;      /* text on filled accent/dark backgrounds */

/* Borders */
--border-subtle: #e8e9ec;     /* card outlines, dividers */
--border-default: #d5d7dc;    /* input borders */
--border-strong: #b0b4bd;     /* hover states, adjacent to focus */

/* Accent — slot your existing blue in here */
--accent-base: [your blue token];
--accent-hover: [darken ~8%];
--accent-active: [darken ~14%];
--accent-subtle: [your blue at 8–10% opacity]; /* selected row, active nav background */

/* Semantic status */
--success: #16a34a;   --success-bg: #ecfdf3;
--warning: #d97706;   --warning-bg: #fffbeb;
--danger:  #dc2626;   --danger-bg:  #fef2f2;
--info:    #2563eb;   --info-bg:    #eff6ff;
```

Check `--text-secondary` and `--text-tertiary` against a real contrast checker once you drop in final hex — aim for 4.5:1 minimum on body text, 3:1 on large text.

**Dark mode / dark sidebar:** don't just invert. Darken surfaces toward near-black (`#0b0d10` base, `#16181d` raised) rather than pure black, desaturate borders, and pull the accent's saturation down ~10% — a fully-saturated accent vibrates against a dark background.

**One thing to actively avoid on the marketing site:** AI-generated design right now clusters hard around three looks — warm cream + serif + terracotta, near-black + neon accent, or a hairline-heavy newspaper layout. They're not wrong, but they're defaults, not choices. If the AC-install site ends up in one of these by default rather than by deliberate decision, that's worth a second look.

---

## 3. Spacing

8px base grid (4px for icon-tight contexts). No hand-picked values outside the scale — no 13px, no 22px margins.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-8: 48px;
--space-10: 64px;
--space-12: 96px;
```

| Use case | Value |
|---|---|
| Icon-to-label gap | `space-2` (8px) |
| Form label-to-input gap | `space-2` |
| Input internal padding | `space-3` vertical, `space-4` horizontal |
| Card padding | `space-4`–`space-5` (16–24px) |
| Gap between cards in a grid | `space-4` |
| Gap between unrelated sections | `space-8` |
| Dashboard page margin | `space-6`–`space-8` |

Heading-to-content spacing: the gap **above** a heading (separating it from the previous section) should be roughly 2x the gap **below** it. A heading should feel attached to what it introduces, not centered between two blocks.

---

## 4. Layout & breakpoints

```css
--bp-sm: 640px;    /* large phones */
--bp-md: 768px;    /* tablets */
--bp-lg: 1024px;   /* small laptops — sidebar typically collapses here */
--bp-xl: 1280px;   /* standard desktop */
--bp-2xl: 1536px;  /* wide monitors — cap content width, don't stretch every panel full-bleed */
```

Readable line length: 65–75 characters (~600–700px) for paragraphs and form content, even on a wide monitor. Tables and data grids can go wider since density is the point — just don't let a settings form or a modal's body text stretch edge-to-edge on a 27" screen.

---

## 5. Elevation (shadows + z-index)

Pair shadow depth with a z-index scale so stacking stays predictable instead of ad-hoc `z-index: 9999` fights.

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.05);            /* resting cards */
--shadow-md: 0 4px 12px rgba(0,0,0,0.08);           /* dropdowns, popovers */
--shadow-lg: 0 12px 32px rgba(0,0,0,0.12);          /* modals */
--shadow-focus: 0 0 0 3px [accent at 25% opacity];  /* focus rings */

--z-dropdown: 1000;
--z-sticky-header: 1100;
--z-modal-backdrop: 1200;
--z-modal: 1300;
--z-toast: 1400;
```

---

## 6. Radius

```css
--radius-sm: 6px;    /* badges, small buttons, inputs */
--radius-md: 10px;   /* cards, dropdowns */
--radius-lg: 16px;   /* modals, large panels */
--radius-full: 999px; /* pills, avatars */
```

Mixing radii across visually-similar components (some cards at 8px, others at 12px) is one of the most common "this looks slightly off but I can't say why" bugs. Pick once, apply everywhere.

---

## 7. Interactive states

Every interactive element needs all five states defined — missing one is where "polish" usually leaks out:

- **Default**
- **Hover** — subtle bg/border shift, no layout shift
- **Active/pressed** — slightly darker, optional `scale(0.98)`
- **Focus-visible** — `--shadow-focus` ring, must be visible on keyboard nav. Never `outline: none` without a replacement.
- **Disabled** — 40–50% opacity + `cursor: not-allowed`. Opacity alone isn't enough signal on its own if the element is small; pair with the cursor change.

If you're using Radix primitives, most of this is already wired into their state attributes (`data-state`, `data-disabled`) — style off those rather than re-deriving state in your own component logic.

---

## 8. Loading, empty & error states

The rule: **every async region has four states, not two.**

1. **Initial loading** — skeleton matching the final layout's shape, or a spinner only for small/unpredictable regions (a "Save" button)
2. **Loaded with data** — real content
3. **Loaded, empty** — a message + a clear next action ("Add your first lead"), never just blank space. Treat empty states as an invitation to act, not a dead end.
4. **Error** — inline message + retry action. State what went wrong and how to fix it, in the interface's own voice — don't apologize, don't be vague ("Something went wrong" with no retry path is a dead end, not a message).

**Spinner vs. skeleton:**
- Spinner: sub-second or unpredictable-duration actions, small regions
- Skeleton: page/section-level loading where you already know the approximate final shape (tables, cards, lists) — it should mirror the real content (same row count, same card size) so nothing jumps when data lands

Pick **one** pattern per region. Spinner → skeleton → content, chained together, is almost always where a blank-screen gap sneaks in — see the companion debug doc for exactly this bug.

---

## 9. Motion

Framer Motion defaults that read as deliberate rather than default-template:

```js
const duration = { fast: 0.12, base: 0.2, slow: 0.32 }; // seconds
const ease = {
  standard: [0.4, 0, 0.2, 1],
  decelerate: [0, 0, 0.2, 1], // entrances
  accelerate: [0.4, 0, 1, 1], // exits
};
```

- Exits should feel snappier than entrances — aim for ~70% of the entrance duration
- Animate `opacity` + `transform` only. Animating `width`/`height` causes layout thrash
- Respect `prefers-reduced-motion` — disable non-essential motion for users who've set it, not just as an afterthought
- Spend your motion budget on one orchestrated moment (the genie dock effect is a good example) rather than scattering micro-animations everywhere. Restraint elsewhere makes the one deliberate moment land harder.

---

## 10. Forms

- Label above the input, not placeholder-as-label — placeholder text disappears on focus and the user loses context mid-fill
- Error text directly below the field, in `--danger`, with an icon — not just a red border (easy to miss, invisible to colorblind users)
- Validate on blur, not every keystroke — exception: live checks like password-match or username-availability
- Be consistent about required vs. optional marking — mark all fields one way or the other, not a mix
- Keep verb naming consistent end-to-end: a button that says "Publish" should produce a confirmation that says "Published," not "Success" or "Done"

---

## 11. Accessibility baseline

- Body text: 4.5:1 contrast minimum. Large text (18px+, or bold 14px+): 3:1 minimum
- Touch targets: 44×44px minimum hit area, even if the visible icon is smaller — pad the clickable area, don't shrink it to match the icon
- Visible focus state on every interactive element for keyboard users — the most common accidental accessibility regression is `outline: none` with nothing put back in its place
- Color is never the only signal — a status dot needs a label or icon alongside it, not just a hue

---

## 12. Icons (Phosphor)

- One weight per context: `regular` for default UI, `bold`/`fill` reserved for active/selected states only
- Standard sizes: 16px (inline with text), 20px (buttons, nav), 24px (headers, empty-state illustrations)
- Icon-only buttons always need `aria-label` — a tooltip alone isn't enough for screen readers

---

## 13. Dashboard data density (Satguru / TravelWindo specific)

- Table row height: 40–48px. Below 36px, dense data stops being scannable
- Card-grid dashboards: cap at 3–4 cards per row at 1280px before it reads as cluttered rather than information-dense
- Your P-01→P-17 phase timeline works as a numbered sequence because it's tracking a *real*, ordered process — that's the right use of numbering. Don't introduce a second, different numbering or status convention elsewhere in the app; reuse that pattern for any other sequential/status data instead of inventing a new one

---

## Quick audit checklist

- [ ] Every heading level is visually distinct from the one above and below it
- [ ] No spacing values outside the 8px scale
- [ ] All five interactive states (default/hover/active/focus/disabled) exist for every clickable element
- [ ] Every async region has loading / empty / error / loaded — not just loading/loaded
- [ ] Shadows and radii are consistent across visually-similar components
- [ ] Color is never the sole status signal
- [ ] Focus rings are visible everywhere, `prefers-reduced-motion` is respected
- [ ] Verb naming matches from trigger → confirmation (button → toast)
