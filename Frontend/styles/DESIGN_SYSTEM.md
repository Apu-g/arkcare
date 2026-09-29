# ArkCare — Celadon & Copper (glass)

Implementation spec. Successor to `DESIGN_SYSTEM_SOFT_NEUMORPHIC_DASHBOARD.md`
(kept in the repo as history; neumorphic dual-shadow surfaces are retired).

## Identity

Two brands doing two jobs, which is what makes this product not look generic:

- **Celadon (cool green-grey)** = **CARE**. CTAs, active nav, clinical progress.
- **Copper (warm amber-bronze)** = **PROOF**. Anchors, verification, audit,
  immutable records, on-chain status.

No blue/purple gradients. No neon. No glowing blobs. Accents stay sparse.

## Tokens (all in `styles/theme.css` — never hardcode these)

Surfaces, light clinical base (default):
`--background #e7e8e3` · `--surface-shell #f1f2ec` · `--surface #fff`
`--glass-1 rgba(255,255,255,.55)` · `--glass-2 .38` · `--glass-3 .22`
`--glass-edge rgba(255,255,255,.62)` · `--glass-hairline rgba(26,29,26,.09)`

Ink (trust/verification): set `data-scope="ink"` on a container and every token
re-maps to the dark palette automatically. Use it for audit/verification
surfaces so they feel weightier. Do NOT re-declare colours inside it.

Brand: `--celadon #2f6f63` · `--celadon-soft` · `--celadon-line` · `--copper #a9723c` · `--copper-soft` · `--copper-line`
Ink: `--text --text-strong --text-muted --text-subtle --border --border-subtle`
Semantics: `--success --warning --destructive --info` (+ `-soft`)

## Glass hierarchy — NOT everything is glass

1. Canvas — opaque
2. `.ambient-layer` — mounted once in `AppChrome`
3. **Primary glass** — `.cq-card` / `.glass` (blur 20px)
4. **Secondary** — `.nm-rail` / `.cq-card-soft` / `.glass-2` (blur 12px)
5. **Priority control** — solid: `.nm-btn-primary` (celadon), `.nm-dark-card` (ink)
6. **Data surface** — `.glass-data` / `<Card tone="data">`. **Near-opaque (88%).
   Required for: doses, vitals, hashes, charts, tables, amounts.** Medical data
   is never behind a heavy blur.

## Classes to use (defined in `app/globals.css`)

Layout: `.nm-dash` (main + 310px rail) · `.nm-dash-col` · `.nm-rail` · `.nm-primary-row` · `.nm-grid-2` · `.nm-grid-3` · `.nm-stack` (24px) · `.nm-stack-sm` (12px)
Cards: `.cq-card` · `.cq-card-hover` · `.cq-card-soft` · `.glass` · `.glass-2` · `.glass-3` · `.glass-data` · `.glass-interactive`
Anchor/tiles: `.nm-dark-card` (ink) · `.nm-dark-elevated` · `.nm-stat` + `.nm-stat-icon` (`data-tone="copper"` for proof figures) + `.nm-stat-value` + `.nm-stat-label`
Content: `.nm-row` (divider list row) · `.nm-pill` (`data-active="true"`) · `.nm-input` · `.nm-select` · `.cq-progress` · `.status-chip` · `.cq-kicker` · `.nm-card-title` · `.nm-metric-xl` · `.cq-section-title` · `.cq-pixel-label` (+ `.cq-real-label` `.cq-sim-label` `.cq-info-label` `.cq-danger-label`)
Buttons: `.nm-btn-primary` · `.nm-btn-secondary` · `.nm-btn-copper` · `.nm-btn-accent`

`components/ui` is already glass-styled — prefer importing:
`<Button variant="default|outline|secondary|copper|destructive|accent|ghost|link">`,
`<Card tone="glass|data|ink">`, `<Badge variant="default|secondary|solid|copper|success|info|warning|destructive|outline">`,
`<Input>`, `<Textarea>`.

## Motion — ONE system (`hooks/useMotion.js`)

Tokens: `--ease-expo` (reveals) · `--ease-quint` (micro) · `--ease-soft` (controls) · `--ease-inout`
Durations: `--dur-1 120ms` · `--dur-2 240ms` · `--dur-3 420ms` · `--dur-4 680ms` · `--dur-5 1100ms`
Distance: `--reveal-y 14px`

Components (`components/motion/`):
- `<Reveal>` — scroll reveal. Wraps IntersectionObserver, sets `data-revealed` once. **Never hand-roll an IO.**
- `<MaskedText>` — per-line masked heading reveal.
- `<PathMorph>` — scroll-scrubbed SVG path. `variant="chain"` (copper) / `variant="vitals"` (celadon), `mode="draw"` / `mode="morph"`.
- `<BlindsReveal>` — tiled curtain.
- `<LerpSlider>` — ambient depth strip.
- `<AppChrome>` — ambient layer + scroll rail. Already in root layout; do not re-add.

Rules:
- Reveal **section-level containers and major headings only.** Never individual list rows, table cells, or values inside a card that is itself revealed.
- No new `IntersectionObserver`, `requestAnimationFrame`, `setInterval` or scroll listener. If you need one, use `hooks/useMotion.js` (`usePrefersReducedMotion`, `useRevealOnScroll`, `useScrollProgress`, `useLerpLoop`).
- Animate only `transform` / `opacity`. Never `width`/`height`/`top`/`left`.
- Every observer/loop/timeout must be torn down in the effect cleanup.
- `usePrefersReducedMotion()` gates all motion. It is already handled inside the primitives — do not re-implement.
- No `gsap`, no `framer-motion`, no new npm packages.

## Icons & type

lucide-react only, 18px, `strokeWidth={1.75}`, monochrome (`currentColor` or a token). Never colour an icon to "match" a card.

Compact scale: page title 18–20px/700 · section 13–15px/600 · card title 12–14px/600 · big figure 22–30px/700 · body 12–13px · metadata 10–12px. No 3xl+ hero headings.

## Rules that are not negotiable

1. No logic, state, handlers, server actions, props or data flow changes. Presentation only.
2. Keep every functional control. Never leave a button without a handler — report dead ones instead of inventing behaviour.
3. Components inside `CareQuestShell` root at `.nm-stack` / `.nm-dash` — never `ark-page min-h-screen p-8` (that double-pads and breaks the floating shell).
4. Body text ≥ 4.5:1. Focus ring always visible. Status never by colour alone (pair with text or an icon). Touch targets ≥ 40px.
5. Blockchain reads as **verification / provenance / immutable record / audit trail** — chain head, anchor state, record metadata. Never chain icons, coins, neon nodes.
6. AI-safety copy stays: AI never diagnoses, prescribes, changes doses, or approves.
