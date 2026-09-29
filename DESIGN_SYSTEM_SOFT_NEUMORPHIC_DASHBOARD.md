# Dashboard UI Design System — Soft Neumorphic Finance Style

> Purpose: implementation spec for recreating the attached dashboard aesthetic across a modern web app.
>
> Visual target: bright soft-neumorphism, large rounded surfaces, pale cool-gray canvas, white cards, charcoal primary controls, subtle depth, compact typography, spacious composition, restrained accent colors.

---

## 1. Core visual direction

Build interface as **soft, premium, low-noise neumorphic dashboard**.

Design characteristics:

- Cool light-gray page background.
- Large white / off-white app shell.
- Very rounded outer frame.
- Cards sit slightly above background using soft dual shadows.
- Primary interactive blocks use deep charcoal / near-black.
- Text mostly charcoal, muted gray for metadata.
- Borders almost invisible.
- Large empty space between functional groups.
- Icons are simple outline icons, mostly monochrome.
- Charts use dark ink strokes on pale backgrounds.
- Bright accent colors appear only for status, alerts, payments, tags, progress, or key actions.
- No harsh gradients, heavy borders, glassmorphism, saturated full-page colors, or dense tables.
- Overall feeling: **clean fintech + soft hardware UI + premium banking app**.

Target balance:

- 80–85% neutral surfaces.
- 10–15% dark charcoal content.
- 5–10% accent color.

---

# 2. Color system

Colors below are tuned to attached reference.

## 2.1 Base neutrals

```css
:root {
  --bg-page: #DFE2EB;
  --bg-shell: #F2F5FA;
  --bg-surface: #FFFFFF;
  --bg-surface-soft: #F6F8FC;
  --bg-surface-muted: #ECEFF5;

  --ink-950: #100E1A;
  --ink-900: #17171C;
  --ink-800: #24242B;
  --ink-700: #3A3A42;
  --ink-600: #57575F;
  --ink-500: #747479;
  --ink-400: #97979E;
  --ink-300: #BFC0C5;

  --line-soft: #E4E7EE;
  --line-subtle: #EEF0F5;
}
```

### Usage

- `--bg-page`: browser / scene background outside dashboard shell.
- `--bg-shell`: main application background.
- `--bg-surface`: primary cards and panels.
- `--bg-surface-soft`: inputs, secondary cards, recessed controls.
- `--ink-950`: headings, totals, key labels.
- `--ink-500`: helper text, dates, metadata.
- `--line-soft`: separators only when shadow alone is insufficient.

---

## 2.2 Strong dark UI

```css
:root {
  --dark-card: #1B1B1E;
  --dark-card-2: #111116;
  --dark-elevated: #232329;
  --dark-text: #FFFFFF;
  --dark-muted: #B7B7BE;
}
```

Use for:

- payment card
- black CTA
- selected nav state
- floating menus
- high-priority stat tile
- dark progress card

---

## 2.3 Accent colors

Base layout should stay monochrome. Use accents only to improve visibility.

```css
:root {
  --accent-blue: #4F6EF7;
  --accent-cyan: #42C8E8;
  --accent-mint: #43D6A2;
  --accent-green: #31B978;
  --accent-yellow: #F4C64E;
  --accent-orange: #F39A4A;
  --accent-red: #EB5A5A;
  --accent-pink: #EB6FAE;
  --accent-purple: #8B6DF6;

  --accent-gold: #D9B868;
}
```

Rules:

- One primary accent per workflow.
- Max 2 accent colors visible in one card.
- Never use bright accents as large page backgrounds.
- Keep primary chart line charcoal unless chart semantics require color.
- Use mint/green for positive movement.
- Red only for destructive/error states.
- Yellow/orange for warning or pending.
- Blue/purple for informational or selected states.

---

# 3. Typography

Use clean geometric sans-serif.

Recommended font stack:

```css
font-family:
  Inter,
  "SF Pro Display",
  "SF Pro Text",
  "Manrope",
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Preferred: **Inter**.

## 3.1 Type scale

```css
--text-xs: 11px;
--text-sm: 12px;
--text-md: 14px;
--text-lg: 16px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;
```

## 3.2 Weights

```css
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

Usage:

- Dashboard page title: 18–20px / 700.
- Section title: 13–15px / 600.
- Card title: 12–14px / 600.
- Large money figure: 22–30px / 700.
- Table row label: 12–13px / 500.
- Metadata: 10–12px / 400.
- Buttons: 12–13px / 600.

Avoid oversized hero typography. Reference UI is compact.

---

# 4. Radius system

Rounded geometry is major part of identity.

```css
--radius-xs: 8px;
--radius-sm: 12px;
--radius-md: 16px;
--radius-lg: 22px;
--radius-xl: 28px;
--radius-2xl: 34px;
--radius-pill: 999px;
```

Usage:

- Search field: `16px`.
- Small icon button: `14–16px`.
- Metric tile: `18–22px`.
- Main card: `24–28px`.
- Dashboard shell: `28–34px`.
- Floating menu: `12–16px`.
- Pills: `999px`.

Avoid sharp corners.

---

# 5. Neumorphic shadow system

Neumorphism must be subtle, not clay-like.

## 5.1 Main soft elevation

```css
--shadow-soft:
  10px 10px 24px rgba(157, 166, 184, 0.18),
  -10px -10px 24px rgba(255, 255, 255, 0.88);
```

## 5.2 Small card elevation

```css
--shadow-card:
  6px 7px 16px rgba(160, 168, 184, 0.16),
  -6px -6px 14px rgba(255, 255, 255, 0.95);
```

## 5.3 Floating dark object

```css
--shadow-dark-float:
  0 16px 30px rgba(16, 14, 26, 0.24),
  0 3px 10px rgba(16, 14, 26, 0.12);
```

## 5.4 Recessed / inset field

```css
--shadow-inset:
  inset 3px 3px 8px rgba(157, 166, 184, 0.14),
  inset -3px -3px 8px rgba(255, 255, 255, 0.92);
```

## 5.5 Hover

```css
--shadow-hover:
  10px 12px 24px rgba(145, 154, 172, 0.21),
  -8px -8px 18px rgba(255, 255, 255, 0.96);
```

Rules:

- Never use black 0.4+ shadows on light cards.
- No hard 1px outline + heavy shadow combination.
- Elevation should appear soft and diffused.
- Use inset shadow only for input/recessed-state affordance.

---

# 6. Spacing system

Base unit: **4px**.

```text
4   micro
8   icon gap
12  compact control gap
16  standard inner gap
20  card compact padding
24  standard card padding
28  large card gap
32  panel spacing
40  major section gap
48  page-level spacing
```

Recommended dashboard density:

- Main shell padding: 24–28px.
- Sidebar width: 64–76px.
- Content column gap: 20–24px.
- Card internal padding: 20–24px.
- Table row height: 44–52px.
- Stat tile width: 96–140px.
- Search height: 34–40px.

---

# 7. Main application frame

Desktop composition should follow reference.

```text
Browser canvas
└─ centered app shell
   ├─ left icon sidebar
   ├─ top header
   └─ dashboard content
      ├─ main content column
      └─ right insight panel
```

## 7.1 Page canvas

```css
body {
  background: var(--bg-page);
  min-height: 100vh;
}
```

## 7.2 App shell

```css
.app-shell {
  width: min(1440px, calc(100vw - 64px));
  min-height: calc(100vh - 64px);
  margin: 32px auto;
  background: var(--bg-shell);
  border-radius: 32px;
  box-shadow: var(--shadow-soft);
  overflow: hidden;
}
```

Reference ratio: shell should visually float inside pale outer field.

---

# 8. Sidebar

Style:

- Narrow.
- Minimal.
- White/pale.
- Icons vertically centered.
- No labels by default.
- Selected state uses dark icon or dark pill.
- Large gap between logo and nav group.

Suggested sizing:

```css
.sidebar {
  width: 72px;
  padding: 24px 14px;
}
```

Nav icon:

```css
.nav-item {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  color: var(--ink-600);
}

.nav-item:hover {
  background: var(--bg-surface);
  box-shadow: var(--shadow-card);
}

.nav-item.active {
  color: var(--ink-950);
}
```

Icon style:

- 18–20px.
- Stroke width 1.6–2.
- rounded linecap.
- no filled emoji-style icons.

---

# 9. Header

Header should remain quiet.

Layout:

```text
[brand] [search........................]                [language] [bell] [avatar]
```

Search:

- pale white field
- 32–38px height
- rounded 14–16px
- 220–340px width desktop
- search icon 14–16px
- placeholder low contrast

Avatar:

- 28–34px
- circular
- subtle white ring

Notification:

- outline bell
- optional tiny red notification dot

---

# 10. Dashboard grid

Recommended desktop grid:

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 24px;
}
```

Within main column:

```css
.primary-grid {
  display: grid;
  grid-template-columns: 1.5fr 0.8fr 0.8fr;
  gap: 16px;
}
```

Breakpoints:

```text
>= 1280px  full layout
1024–1279  narrower right rail
768–1023   right rail moves below
< 768      one-column cards
```

---

# 11. Card primitive

```css
.card {
  background: var(--bg-surface);
  border-radius: 24px;
  padding: 22px;
  box-shadow: var(--shadow-card);
  border: 1px solid rgba(255,255,255,0.72);
}
```

For softer panel:

```css
.card-soft {
  background: var(--bg-surface-soft);
  border-radius: 22px;
}
```

Do not place strong border around every card.

---

# 12. Payment / bank card

Reference has black card as main visual anchor.

```css
.payment-card {
  min-height: 150px;
  border-radius: 22px;
  padding: 20px;
  color: white;
  background:
    radial-gradient(circle at 22% 12%, rgba(255,255,255,0.08), transparent 22%),
    linear-gradient(145deg, #232326, #17171A);
  box-shadow: var(--shadow-dark-float);
}
```

Inside:

- chip top-left
- number centered left
- user name bottom-left
- network logo bottom-right
- optional subtle 2–4% noise texture
- no glossy reflections

Card text:

```text
number: 14px / 500
name: 10–11px / 500
metadata: 9–10px / 400
```

---

# 13. Small stat tiles

Example: salary / PayPal tile.

Visual:

- white or pale gray background
- icon inside small charcoal rounded square
- title below
- amount strong
- width approx 105–130px

```css
.stat-tile {
  padding: 16px 14px;
  border-radius: 20px;
  background: var(--bg-surface-soft);
  box-shadow: var(--shadow-card);
}
```

Icon badge:

```css
.stat-icon {
  width: 38px;
  height: 38px;
  border-radius: 13px;
  background: var(--ink-950);
  color: white;
}
```

---

# 14. Transactions list

Reference uses horizontal dividers, not boxed rows.

Structure:

```text
icon | title               date/time              amount | menu
```

Row:

```css
.transaction-row {
  min-height: 48px;
  display: grid;
  grid-template-columns: 28px minmax(120px,1fr) 120px 72px 20px;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--line-subtle);
}
```

Typography:

- title: 12–13px / 500
- date: 10–11px / 400 / muted
- amount: 12–13px / 600

Hover:

```css
.transaction-row:hover {
  background: rgba(246,248,252,0.8);
  border-radius: 12px;
}
```

---

# 15. Chart panel

Reference chart:

- pale panel
- sparse axes
- black smooth line
- highlighted point
- no dense grid
- month tabs
- selected month in black pill

## 15.1 Panel

```css
.chart-card {
  background: var(--bg-surface-soft);
  border-radius: 24px;
  padding: 22px;
}
```

## 15.2 Chart line

```css
stroke: #17171C;
stroke-width: 3;
stroke-linecap: round;
stroke-linejoin: round;
fill: none;
```

## 15.3 Active data point

```text
outer: white 8–10px
inner: charcoal 4–5px
```

## 15.4 Time filter

```css
.period-pill {
  padding: 6px 9px;
  border-radius: 999px;
  font-size: 10px;
  color: var(--ink-500);
}

.period-pill.active {
  background: var(--ink-950);
  color: #fff;
}
```

---

# 16. Progress card

Bottom-right dark card in reference.

```css
.progress-card {
  background: linear-gradient(145deg, #25252D, #15151B);
  color: white;
  border-radius: 18px;
  box-shadow: var(--shadow-dark-float);
}
```

Circular progress:

- dark ring track
- white/gray progress arc
- percentage center
- 64–78px diameter
- rounded cap

Alternative accent:
- use `--accent-blue`, `--accent-mint`, or `--accent-purple` for progress arc
- keep dark base

---

# 17. Floating action menu

Reference contains small dark popup.

```css
.context-menu {
  background: #15151C;
  color: #fff;
  border-radius: 12px;
  padding: 6px;
  box-shadow: var(--shadow-dark-float);
  min-width: 150px;
}
```

Menu item:

```css
.context-menu-item {
  min-height: 34px;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 11px;
}

.context-menu-item:hover {
  background: rgba(255,255,255,0.08);
}
```

---

# 18. Buttons

## Primary

```css
.btn-primary {
  background: var(--ink-950);
  color: white;
  border-radius: 14px;
  padding: 10px 16px;
  box-shadow: 0 8px 18px rgba(16,14,26,0.15);
}
```

Hover:

```css
background: #24242B;
transform: translateY(-1px);
```

Active:

```css
transform: translateY(0);
box-shadow: 0 4px 10px rgba(16,14,26,0.14);
```

## Secondary neumorphic

```css
.btn-secondary {
  background: var(--bg-surface);
  color: var(--ink-900);
  border-radius: 14px;
  box-shadow: var(--shadow-card);
}
```

## Accent

Use only for one important CTA:

```css
background: var(--accent-blue);
color: white;
```

---

# 19. Inputs

```css
.input {
  height: 40px;
  background: var(--bg-surface-soft);
  border: 1px solid transparent;
  border-radius: 14px;
  padding: 0 14px;
  color: var(--ink-900);
  box-shadow: var(--shadow-inset);
}
```

Focus:

```css
.input:focus {
  outline: none;
  border-color: rgba(79,110,247,0.45);
  box-shadow:
    0 0 0 3px rgba(79,110,247,0.10),
    var(--shadow-inset);
}
```

---

# 20. Selects and filters

Use compact controls.

```css
.filter {
  height: 32px;
  padding: 0 10px;
  background: var(--bg-surface-soft);
  border-radius: 10px;
  font-size: 11px;
  color: var(--ink-600);
}
```

Sort icons should be subtle, 14–16px.

---

# 21. Icon system

Recommended:

- Lucide
- Phosphor
- Remix Icon outline set

Rules:

- one library only
- default size 18px
- default stroke 1.75
- no colored icon mix unless semantic
- dark tile icons can be white
- icon containers may use `12–14px` radius

---

# 22. States

## Success

```css
background: rgba(49,185,120,0.12);
color: #248A5A;
```

## Info

```css
background: rgba(79,110,247,0.12);
color: #405BD0;
```

## Warning

```css
background: rgba(244,198,78,0.18);
color: #9A7316;
```

## Error

```css
background: rgba(235,90,90,0.12);
color: #BF4343;
```

Status indicators should stay small and pill-shaped.

---

# 23. Motion

Keep motion precise and premium.

```css
--ease-ui: cubic-bezier(.2,.8,.2,1);
--dur-fast: 120ms;
--dur-base: 180ms;
--dur-slow: 260ms;
```

Use:

- hover lift: 1–2px max
- card hover shadow change: 180ms
- side panels: 220–260ms
- menu opacity + translateY(4px)
- chart animation: 400–700ms once

Avoid:
- bouncing
- elastic overshoot
- long 1s transitions
- constant animated gradients

---

# 24. Accessibility

Soft-neumorphism can create weak affordances. Compensate deliberately.

Minimum:

- Body text contrast: 4.5:1.
- Large text: 3:1.
- Focus ring always visible.
- Buttons cannot rely on shadow alone.
- Selected tabs need both color + shape.
- Error states need icon/text, not red only.
- Touch targets: minimum 40×40px.
- Reduced motion support.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# 25. Responsive behavior

## Desktop >= 1280

- sidebar fixed 72px
- right analytics rail 300–340px
- 2-column dashboard
- bank card + 2 stat tiles on top row

## Tablet 768–1279

- sidebar 64px or collapsible
- right analytics rail moves below top cards
- transaction rows remain table-like
- cards use 18–20px radius

## Mobile < 768

- no permanent left sidebar
- use bottom nav or drawer
- cards stack vertically
- transactions convert to 2-line rows
- chart becomes full width
- page shell loses outer margin
- outer radius reduces to 0–20px

---

# 26. Recommended layout dimensions

For 1440px desktop:

```text
body outer margin      32
app shell width        1376
sidebar                72
header height          72
content padding        24
main/right gap         24
right panel            310
main content           remaining
```

Main content top row:

```text
payment card           45–50%
stat tile 1            23–27%
stat tile 2            23–27%
```

---

# 27. Tailwind token mapping

Optional Tailwind config:

```js
theme: {
  extend: {
    colors: {
      page: "#DFE2EB",
      shell: "#F2F5FA",
      surface: "#FFFFFF",
      soft: "#F6F8FC",
      muted: "#ECEFF5",
      ink: {
        950: "#100E1A",
        900: "#17171C",
        700: "#3A3A42",
        500: "#747479",
        300: "#BFC0C5",
      },
      accent: {
        blue: "#4F6EF7",
        mint: "#43D6A2",
        yellow: "#F4C64E",
        red: "#EB5A5A",
        purple: "#8B6DF6",
        gold: "#D9B868",
      }
    },
    borderRadius: {
      card: "24px",
      shell: "32px",
      control: "14px",
    },
    boxShadow: {
      soft: "10px 10px 24px rgba(157,166,184,.18), -10px -10px 24px rgba(255,255,255,.88)",
      card: "6px 7px 16px rgba(160,168,184,.16), -6px -6px 14px rgba(255,255,255,.95)",
      dark: "0 16px 30px rgba(16,14,26,.24), 0 3px 10px rgba(16,14,26,.12)",
    }
  }
}
```

---

# 28. CSS starter tokens

```css
:root {
  --bg-page: #DFE2EB;
  --bg-shell: #F2F5FA;
  --bg-surface: #FFFFFF;
  --bg-surface-soft: #F6F8FC;
  --bg-surface-muted: #ECEFF5;

  --ink-950: #100E1A;
  --ink-900: #17171C;
  --ink-700: #3A3A42;
  --ink-500: #747479;
  --ink-300: #BFC0C5;

  --accent-blue: #4F6EF7;
  --accent-mint: #43D6A2;
  --accent-yellow: #F4C64E;
  --accent-red: #EB5A5A;
  --accent-purple: #8B6DF6;
  --accent-gold: #D9B868;

  --radius-control: 14px;
  --radius-card: 24px;
  --radius-shell: 32px;

  --shadow-soft:
    10px 10px 24px rgba(157,166,184,.18),
    -10px -10px 24px rgba(255,255,255,.88);

  --shadow-card:
    6px 7px 16px rgba(160,168,184,.16),
    -6px -6px 14px rgba(255,255,255,.95);

  --shadow-dark:
    0 16px 30px rgba(16,14,26,.24),
    0 3px 10px rgba(16,14,26,.12);
}
```

---

# 29. Component hierarchy

```text
AppShell
├─ Sidebar
│  ├─ LogoMark
│  ├─ NavItem[]
│  └─ SettingsButton
├─ Header
│  ├─ Search
│  ├─ LocaleSwitch
│  ├─ NotificationButton
│  └─ Avatar
└─ Dashboard
   ├─ MainColumn
   │  ├─ SectionHeader
   │  ├─ AccountSummaryRow
   │  │  ├─ PaymentCard
   │  │  ├─ StatTile
   │  │  └─ StatTile
   │  └─ RecentTransactions
   │     ├─ TableHeader
   │     └─ TransactionRow[]
   └─ InsightRail
      ├─ SavingsHeader
      ├─ PeriodTabs
      ├─ SavingsLineChart
      ├─ MonthSelector
      └─ ProgressCard
```

---

# 30. Visual do / do not

## Do

- use pale cool-gray canvas
- use white cards with soft shadow
- use charcoal anchor components
- use large radii
- use clean line icons
- keep spacing generous
- use low-contrast dividers
- use subtle accents
- keep charts simple
- use one strong visual anchor per screen

## Do not

- no heavy gradients
- no glass blur everywhere
- no thick borders
- no saturated giant background
- no excessive colorful cards
- no sharp corners
- no dark mode styling mixed inside light page except deliberate dark cards
- no huge 48–64px headings
- no noisy chart grid
- no 3D skeuomorphic shadows
- no pure black `#000000` for every dark object

---

# 31. Visible-color upgrade

Reference is intentionally monochrome. For a more attractive production dashboard while keeping same design language:

Use accent distribution:

```text
Primary CTA / active state      blue
Positive metric                 mint / green
Pending                         yellow / orange
Error / destructive            red
Premium / finance highlight    gold
Secondary analytics            purple
```

Example:

```text
Monthly savings line           charcoal
Positive comparison chip       mint
Notification badge             red
Selected filter                charcoal
Primary action                 blue
Premium account icon           gold
Progress ring                  purple or blue
```

Keep card backgrounds neutral.

---

# 32. Reference-matching checklist

Before shipping screen, verify:

- [ ] Outer canvas pale blue-gray.
- [ ] Main shell off-white.
- [ ] Shell radius ~32px.
- [ ] Sidebar narrow and icon-only.
- [ ] Header compact.
- [ ] Search field short and soft.
- [ ] Main top row contains one dark anchor card.
- [ ] Secondary stat cards are pale.
- [ ] Transactions use rows, not boxed cards.
- [ ] Right rail uses soft gray background.
- [ ] Chart is mostly monochrome.
- [ ] Active date/month uses dark pill.
- [ ] Progress card is dark and floating.
- [ ] Shadows use both dark and light directions.
- [ ] No border is visually dominant.
- [ ] Icons use one consistent outline set.
- [ ] Accent colors remain sparse.
- [ ] Mobile conversion preserves large radii and spacing.
- [ ] Keyboard focus remains visible.
- [ ] Text contrast remains accessible.

---

# 33. Agent implementation instruction

Use this exact instruction when giving spec to coding agent:

```text
Build dashboard using attached soft-neumorphic finance UI language.

Treat DESIGN_SYSTEM.md as source of truth.

Requirements:
1. Preserve cool gray outer canvas, off-white app shell, white cards, charcoal anchor components.
2. Use 24px card radii and 32px shell radius.
3. Use soft dual-direction neumorphic shadows, never heavy black drop shadows.
4. Keep page mostly monochrome; accents only for semantic states and primary actions.
5. Use Inter typography, compact finance-dashboard scale.
6. Use Lucide or Phosphor outline icons consistently.
7. Maintain generous spacing and low visual density.
8. Build responsive desktop/tablet/mobile layouts.
9. Keep keyboard focus, contrast, and touch targets accessible.
10. Do not convert design into generic Material, Bootstrap, glassmorphism, or dark-dashboard style.
11. Avoid dense borders; use shadow, spacing, radius, and subtle separators to define hierarchy.
12. Reuse shared primitives for Card, StatTile, NavItem, Button, Input, TransactionRow, ChartPanel, ContextMenu, and ProgressCard.
```

---

# 34. Final design target

Result should feel like:

```text
premium digital banking
+ soft neumorphic hardware controls
+ modern SaaS dashboard
+ restrained monochrome editorial spacing
```

Not:

```text
crypto neon
gaming dashboard
glassmorphism
Material UI default
Bootstrap admin panel
flat enterprise table
```

Core visual formula:

```text
cool gray canvas
+ white elevated surfaces
+ charcoal anchors
+ large rounded geometry
+ soft dual shadows
+ compact typography
+ sparse bright accents
= target UI
```
