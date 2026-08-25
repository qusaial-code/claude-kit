# Fluid Token Property Reference

Complete reference for `src/utils/fluid.config/*` → `scripts/fluid.generate.mjs`.

## Contents

- [Scale constants](#scale-constants)
- [How a value is computed](#how-a-value-is-computed)
- [Property table](#property-table)
- [Breakpoints](#breakpoints)
- [Generated output shape](#generated-output-shape)
- [CSS cascade order](#css-cascade-order)
- [tailwind-merge groups](#tailwind-merge-groups)
- [Failure modes](#failure-modes)

## Scale constants

| Constant | Value | Meaning |
|---|---|---|
| `MIN_SCREEN` | `430` | Viewport width at which the mobile value applies exactly |
| `MAX_SCREEN` | `1920` | Viewport width at which the desktop value applies exactly |

Between them the value interpolates linearly. Outside them it scales
proportionally in `vw`, so a token never freezes at a hard floor or ceiling.

## How a value is computed

For a pair `[min, max]` across `[minScreen, maxScreen]`:

```
slope     = (max - min) / (maxScreen - minScreen)
intercept = min - slope * minScreen
css       = calc(<intercept>px + <slope * 100>vw)
```

Below `MIN_SCREEN`: `calc((min / 430 * 100)vw)`
Above `MAX_SCREEN`: `calc((max / 1920 * 100)vw)`

A breakpoint override recomputes the same formula with `minScreen` set to the
breakpoint width — which is why the first number in a breakpoint pair is the value
*at that breakpoint*, not a mobile value.

Worked example — `lg: { width: [450, 600] }`:

```
slope     = (600 - 450) / (1920 - 1024) = 0.16741
intercept = 450 - 0.16741 * 1024        = 278.5714
          → calc(278.5714px + 16.7411vw)
```

At 1024px: `278.57 + 171.43 = 450`. At 1920px: `278.57 + 321.43 = 600`.

## Property table

All values are `[mobilePx, desktopPx]`. Plain numbers, no units, decimals allowed.

### Typography and dimensions (emitted into the `@theme` block)

| Config key | Tailwind class | CSS variable |
|---|---|---|
| `fontSize` | `text-{name}` | `--fluid-fontSize-{name}` |
| `lineHeight` | `leading-{name}` | `--fluid-lineHeight-{name}` |
| `letterSpacing` | `tracking-{name}` | `--fluid-letterSpacing-{name}` |
| `borderRadius` | `rounded-{name}` | `--fluid-borderRadius-{name}` |
| `borderWidth` | `border-{name}` | `--fluid-borderWidth-{name}` |
| `width` | `w-{name}` | `--fluid-width-{name}` |
| `height` | `h-{name}` | `--fluid-height-{name}` |
| `minWidth` | `min-w-{name}` | `--fluid-minWidth-{name}` |
| `maxWidth` | `max-w-{name}` | `--fluid-maxWidth-{name}` |
| `minHeight` | `min-h-{name}` | `--fluid-minHeight-{name}` |
| `maxHeight` | `max-h-{name}` | `--fluid-maxHeight-{name}` |
| `spacing` | feeds the whole spacing scale — `p-{name}`, `px-{name}`, `gap-{name}`, `space-y-{name}`, `w-{name}`, … | `--fluid-spacing-{name}` |

`spacing` is the odd one out: it defines `--spacing-{name}` in Tailwind v4's
spacing namespace, so *any* spacing utility accepts the token. Use it when one
value drives several different spacing utilities (the `footer-space-y` token
exists for `space-y-footer-space-y`). Prefer a specific key when you only need one.

### Padding, margin, gap (emitted as individual `@utility` blocks)

| Config key | Tailwind class | CSS property |
|---|---|---|
| `padding` | `p-{name}` | `padding` |
| `px` | `px-{name}` | `padding-inline` |
| `py` | `py-{name}` | `padding-block` |
| `pt` | `pt-{name}` | `padding-top` |
| `pb` | `pb-{name}` | `padding-bottom` |
| `ps` | `ps-{name}` | `padding-inline-start` |
| `pe` | `pe-{name}` | `padding-inline-end` |
| `margin` | `m-{name}` | `margin` |
| `mx` | `mx-{name}` | `margin-inline` |
| `my` | `my-{name}` | `margin-block` |
| `mt` | `mt-{name}` | `margin-top` |
| `mb` | `mb-{name}` | `margin-bottom` |
| `ms` | `ms-{name}` | `margin-inline-start` |
| `me` | `me-{name}` | `margin-inline-end` |
| `gap` | `gap-{name}` | `gap` |
| `gapX` | `gap-x-{name}` | `column-gap` |
| `gapY` | `gap-y-{name}` | `row-gap` |

`ps`/`pe`/`ms`/`me` are logical: they resolve to left/right based on document
direction and flip automatically in RTL. Use them by default and reserve
`pt`/`pb`/`mt`/`mb` for the block axis, which doesn't flip.

Any key not in either table is ignored by the generator.

## Breakpoints

| Key | Min width |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |
| `3xl` | 1600px |

`2xl` and `3xl` need quoting as object keys (`'2xl': { … }`); the rest are bare
identifiers. Breakpoint blocks may nest inside an `rtl` block, but not the reverse.

## Generated output shape

For `'card': { fontSize: [16, 32], pe: [12, 48], lg: { fontSize: [24, 32] }, rtl: { pe: [20, 80] } }`:

```css
:root {
  --fluid-fontSize-card: calc(11.3826px + 1.0738vw);   /* 16 -> 32 */
  --fluid-pe-card:       calc(1.6107px + 2.4161vw);    /* 12 -> 48 */
}

@media (min-width: 1024px) { :root { --fluid-fontSize-card: /* 24 @1024 -> 32 @1920 */ } }

[dir="rtl"] { --fluid-pe-card: calc(2.6846px + 4.0268vw); }

@media (max-width: 429px)  { :root { /* proportional vw */ } }
@media (max-width: 429px)  { [dir="rtl"] { /* proportional vw */ } }
@media (min-width: 1920px) { :root { /* proportional vw */ } }
@media (min-width: 1920px) { [dir="rtl"] { /* proportional vw */ } }

@theme {
  --text-card: var(--fluid-fontSize-card);
}

@utility pe-card {
  padding-inline-end: var(--fluid-pe-card);
}
```

Plus, in `src/utils/fluid.tokens.js`:

```js
export const fluidClassGroups = {
  "font-size": ["text-card"],
  "pe":        ["pe-card"],
}
```

## CSS cascade order

The generator emits blocks in this fixed order:

1. `:root` — base values for every token
2. `@media (min-width: <bp>) :root` — one block per breakpoint used
3. `[dir="rtl"]` — direction base overrides
4. `@media (min-width: <bp>) [dir="rtl"]` — direction breakpoint overrides
5. `@media (max-width: 429px) :root` then `… [dir="rtl"]` — small-screen proportional
6. `@media (min-width: 1920px) :root` then `… [dir="rtl"]` — large-screen proportional
7. `@theme { … }`
8. `@utility … { … }` blocks

`:root` and `[dir="rtl"]` both have specificity `(0,1,0)`, so **source order decides
every conflict between them**. Blocks 5 and 6 correctly put the RTL variant after
the `:root` variant within the same media range, so proportional scaling is safe.

The hazard is between blocks 2 and 3. Block 3 is unmediated and comes later, so at
any width ≥ a breakpoint, an `rtl` base override beats that breakpoint's `:root`
override for the same property. Whenever a property has both an `rtl` override and a
breakpoint override, repeat the breakpoint inside `rtl`:

```js
'hz': {
  pe: [10, 20],
  lg:  { pe: [15, 20] },
  rtl: { pe: [100, 200], lg: { pe: [150, 200] } },
},
```

## tailwind-merge groups

`src/utils/cn.js` builds `extendTailwindMerge({ extend: { classGroups: fluidClassGroups } })`
from the generated manifest. This matters because tailwind-merge classifies unknown
classes by prefix heuristics: without the manifest, `text-btn` looks like a *color*
utility, so `cn('text-btn', 'text-white')` would drop `text-btn` — or worse, keep it
and drop the color. Registering it under the `font-size` group makes the two
non-conflicting, and both survive.

Group ids are tailwind-merge's own names and don't always match the class prefix —
`borderWidth` registers `border-{name}` under the group id `border-w`.

Consequences:

- Always regenerate after adding a token, or `cn()` will misclassify the new class.
- `cnFluid()` does no merging at all, so it's immune to this — and equally unable to
  resolve a genuine conflict. Reach for `cn()` unless you need the raw join.
- A `spacing` token registers under ~20 groups at once (`p`, `px`, `py`, `pt`, `pb`,
  `ps`, `pe`, `m`, `mx`, `my`, `mt`, `mb`, `ms`, `me`, `gap`, `gap-x`, `gap-y`,
  `space-x`, `space-y`, `w`, `h`), matching the fact that Tailwind lets the spacing
  scale feed all of them.

## Failure modes

The generator detects the first three of these and prints a `⚠️` block naming the
token and property. If a project's generator predates those diagnostics (no
`warnings` array in the script), work down this table by hand.


| Symptom | Cause | Fix |
|---|---|---|
| Class has no effect at all | Property declared only inside a breakpoint or `rtl` block — no `@theme`/`@utility` was emitted | Declare the property at the base level too |
| Class has no effect; token absent from generator summary | Malformed pair — not exactly two numbers (`[16, '32']`, `[16]`, `16`) | Fix the pair; the generator skips invalid ones silently |
| Breakpoint override ignored in Arabic only | `rtl` base block overrides it (equal specificity, later source) | Mirror the breakpoint inside `rtl` |
| A sibling class gets dropped by `cn()` | Stale `fluid.tokens.js` | Re-run `pnpm run generate-tokens` |
| Edits to `fluid.css` disappear | It's generated | Edit `fluid.config/`, regenerate |
| Value looks right at 430 and 1920, wrong in between | Expected only if the design isn't linear; add a breakpoint override to bend the curve | `lg: { prop: [valueAt1024, valueAt1920] }` |
| Token huge on a 4K monitor | Working as designed — above 1920px it scales in `vw` | Cap with a non-fluid `max-w-*` if the design wants a ceiling |
