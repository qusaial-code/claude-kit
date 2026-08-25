---
name: fluid-tokens
description: >-
  Add, change, or apply fluid responsive design tokens — the `src/utils/fluid.config/`
  → `scripts/fluid.generate.mjs` → `fluid.css` pipeline that turns a
  `[mobile, desktop]` px pair into a Tailwind class scaling smoothly between
  430px and 1920px. Trigger whenever the user gives a mobile value and a desktop
  value for any size (font size, width, height, padding, margin, gap, radius,
  line height, letter spacing) — "make this 16 on mobile and 32 on desktop",
  "18px → 45px", "the title should be 36/64" — or says "fluid token", "add a
  token", "regenerate tokens", "text-CS-*", "w-PCS-*", or asks to override a
  size at a breakpoint (`lg`, `xl`, `2xl`) or for RTL/Arabic. Also trigger when
  someone is about to hardcode a responsive size with `text-[18px] lg:text-[45px]`
  or `max-lg:w-[363px] w-[660px]` — that is the thing this system replaces.
  Also handles installing the pipeline itself in a project that doesn't have it
  yet — trigger on "set up fluid tokens", "add the fluid system to this project",
  or `/fluid-tokens setup`. Do NOT trigger for colors, font-families, z-index, or
  one-off sizes that genuinely don't scale.
---

# Fluid Tokens

A fluid token turns one `[mobile, desktop]` pair into a CSS `calc()` that scales
continuously with viewport width — no breakpoint jumps. `[18, 45]` means 18px at
430px wide, 45px at 1920px wide, and every value in between interpolated linearly.
Below 430px and above 1920px the value scales proportionally in `vw` so it never
freezes or overflows.

You write the pair in a config file. A generator turns it into a CSS variable, a
Tailwind v4 utility, and a tailwind-merge conflict group. You then use it as an
ordinary Tailwind class: `text-CS-BS-title`, `w-CS-main-img`, `pe-CS-form`.

## Which path are you on?

Check whether the pipeline exists before anything else:

```
src/utils/fluid.config/index.js      # merges per-area config files
scripts/fluid.generate.mjs           # the generator
src/app/styles/fluid.css             # generated output, imported by the entry stylesheet
src/utils/fluid.tokens.js            # generated tailwind-merge groups
```

Paths vary between projects, so search for `fluid.generate` and `fluid.config`
rather than testing those exact paths.

- **Found them** → the project is set up. Continue at [Step 1](#step-1--get-both-values-in-px).
- **Didn't find them** → read `references/setup.md` and install the pipeline first.
  Everything to copy is in this skill's `assets/` directory. Come back to Step 1
  afterwards and add the token the user actually asked for.
- **User asked for setup explicitly** (`/fluid-tokens setup`, "set up fluid tokens
  here") → go straight to `references/setup.md`, even with no token to add yet.

Don't add a token to a project without the pipeline. The config entry would be
valid and the class would render as nothing — a failure with no error message,
which is much harder to debug than an install that never happened.

Setup is a change to build scripts and the entry stylesheet, so say what you're
about to do and get a yes before editing, unless the user already asked for setup
outright. If a prerequisite fails (Tailwind v3, no Tailwind at all), stop and
report it — `references/setup.md` lists what's checkable and what each failure means.

## Step 1 — Get both values, in px

Every token needs a mobile number and a desktop number. Both are **pixels**, plain
numbers, no units and no `rem` — including `fontSize`. Decimals are fine and common
(`[7.184, 14]`), since values are usually measured straight off a Figma frame.

The mobile number is the value at a **430px** viewport; the desktop number is the
value at **1920px**. If a design gives you a 375px mobile frame, the value still
goes in as-is — the sub-430px range scales proportionally, so a 375px-frame
measurement lands close enough in practice.

If the user gives only one value, ask for the other. A token with a single value
isn't fluid, and hardcoding is the more honest choice there.

## Step 2 — Name the token and pick its file

Config files live in `src/utils/fluid.config/` and are merged by `index.js`:

- `global.js` — shared across campaigns (form, footer, buttons, base typography)
- `<campaign>.js` — campaign-scoped tokens (e.g. `champion-summer.js`)

Put a token in the campaign file unless it's genuinely reused across campaigns.
A new campaign gets a new file, exported and spread into `index.js`.

Naming follows a `PREFIX-Section-element` shape, kebab-cased, grouped under a
section comment:

```js
'CS-BS-title'      // ChampionSummer › BraceletWithTexts › title
'CS-form-btn'      // ChampionSummer › form › button
'PCS-main-img'     // Prelander ChampionSummer › main image
'footer-legal'     // global › footer › legal text
```

The token name becomes the class suffix verbatim, so keep it readable at the call
site: `text-CS-BS-title` should tell a reader what it styles.

## Step 3 — Write the config entry

Each property key takes a `[mobile, desktop]` pair. One token can carry as many
properties as the element needs — that is the point, a token describes an element,
not a single value.

```js
'CS-TC-img': {
  width:  [364, 773],
  height: [332.4, 610],
},

'CS-BS-par': {
  fontSize:      [16, 20],   // → text-CS-BS-par
  lineHeight:    [25.6, 32], // → leading-CS-BS-par
  letterSpacing: [0.16, 0.2],// → tracking-CS-BS-par
},
```

Add a trailing `// → class-name` comment on unfamiliar properties; the existing
config does this and it saves the next reader a trip to the reference.

For the complete property → class table (all 30-odd keys, spacing shorthands,
logical properties), read `references/property-reference.md`.

### Breakpoint overrides

A breakpoint key re-interpolates that property from the breakpoint upward:

```js
'CS-WE-img': {
  width:  [364, 909],
  height: [289.5, 723],
  lg: { width: [490, 909], height: [510, 723] },
},
```

Read `lg: { width: [490, 909] }` as **490px at 1024px wide → 909px at 1920px wide**.
The first number is the value *at the breakpoint*, not a mobile value. This is the
most commonly misread part of the config: it exists to flatten a curve that grows
too fast on tablets, so the breakpoint value is usually *larger* than what the base
interpolation would give there.

Available keys: `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536, `3xl` 1600.

### RTL / direction overrides

Two approaches exist. Both work; they differ in where the branch lives.

**Separate `-ar` token + Tailwind's `rtl:` variant** — the branch is visible in the
component. This is what the codebase uses today:

```js
'PCS-main-img':    { width: [363, 829], height: [367, 789] },
'PCS-main-img-ar': { width: [418, 751], height: [398, 715] },
```

```jsx
className="h-PCS-main-img w-PCS-main-img rtl:h-PCS-main-img-ar rtl:w-PCS-main-img-ar"
```

**An `rtl` block inside the token** — the branch is invisible at the call site; the
same class silently resolves differently under `[dir="rtl"]`:

```js
'CS-form-input': {
  ps: [6.9, 15.38],
  pe: [22.9, 32.38],
  rtl: {
    pe: [30, 40],
    lg: { pe: [35, 40] },   // breakpoint overrides nest inside rtl
  },
},
```

Prefer the `-ar` token form when the two directions differ in *layout* (a mirrored
hero image, a different max-width) — a reader scanning the JSX can see that RTL
diverges. Prefer the `rtl` block when it's a small padding nudge that would just be
noise in the markup. Note that logical properties (`ps`/`pe`/`ms`/`me`) already flip
automatically, so reach for a direction override only when the *magnitude* differs,
not merely the side.

## Step 4 — Regenerate

```bash
pnpm run generate-tokens        # or: node scripts/fluid.generate.mjs
```

`pnpm dev` and `pnpm build` run this first, so tokens are always current in a normal
workflow — but run it explicitly after editing config so you can read the summary it
prints. That summary lists every token with its resolved class names; use it to
confirm the class you're about to write actually exists.

Never hand-edit `src/app/styles/fluid.css` or `src/utils/fluid.tokens.js`. Both are
regenerated wholesale and your edit will vanish on the next `pnpm dev`.

## Step 5 — Use the token in components

The generated classes are plain Tailwind utilities:

```jsx
const S = {
  container: 'pt-CS-hero px-CS-container',
  title:     'text-CS-BS-title leading-CS-BS-title',
  img:       'h-CS-main-img w-CS-main-img',
};
```

Collecting classes into an `S` object at the top of the component is the local
convention — it keeps long fluid class names out of the JSX and gives them a name.

For merging classes, prefer `cn()` from `@/utils/cn`. It's built on
`extendTailwindMerge()` fed by the generated `fluidClassGroups`, so it knows
`text-btn` is a font-size and won't let it evict `text-white`. Use `cnFluid()` from
`@/utils/cnFluid` — a plain filter-and-join with no conflict resolution — only when
you specifically need every class to survive untouched.

Combine fluid classes with ordinary Tailwind variants freely:
`max-lg:hidden`, `rtl:font-bold`, `lg:flex-row`.

## Rules worth knowing before you write config

Each of these describes a config that generates *something* — so the build passes
and the class simply does nothing. The generator names all of them in a `⚠️` block
after it runs, so read that output rather than trusting the two `✅` lines above it.
If a project's generator predates those diagnostics (check whether the script
contains a `warnings` array), work down this list by eye instead.

**A property that appears only inside a breakpoint or `rtl` block produces no class.**
The generator registers `@theme` entries, `@utility` blocks, and tailwind-merge
groups from the *base* properties only. This config:

```js
'orphan': {
  fontSize: [16, 32],
  lg:  { height: [100, 200] },   // ✗ h-orphan does not exist
  rtl: { mt: [4, 8] },           // ✗ mt-orphan does not exist
},
```

emits `--fluid-height-orphan` and `--fluid-mt-orphan` as CSS variables that nothing
reads. Every property you override must also be declared at the base level. When
you want a property to appear only above a breakpoint, still declare a base pair —
give it the value the small screens should get.

**An `rtl` block overrides breakpoint overrides unless you mirror them.**
`[dir="rtl"]` and `:root` have equal CSS specificity, and the generator emits the
unmediated `[dir="rtl"]` block *after* the `@media (min-width: …) :root` blocks.
So if a property has both an `lg` override and an `rtl` override, RTL at 1200px
wide gets the rtl *base* value, and the `lg` override is lost. Fix it by repeating
the breakpoint inside `rtl`:

```js
'hz': {
  pe: [10, 20],
  lg:  { pe: [15, 20] },
  rtl: { pe: [100, 200], lg: { pe: [150, 200] } },  // mirror it
},
```

**Values are px even for `fontSize`.** Some older comments in these projects say
"rem"; the generator emits `calc(<px> + <vw>)` for every property without
exception. Pass `[16, 32]` for 16px→32px, never `[1, 2]`.

**Malformed pairs are skipped.** The generator only accepts an array of exactly
two numbers. `[16, '32']`, `[16]`, and `16` are dropped and the class won't exist.
A quoted number is the easy one to miss — if a class isn't working, re-read the
pair before anything else.

**Reuse before you add.** Scan the existing config for a token with the same values
serving the same role. Typography is usually already covered by the shared file —
in LPS that's `title`, `xlarge`, `large`, `description`, `title2`, `text`, and
`btn` in `global.js`. A second token with identical values is a rename waiting to
drift.

## Reference

`references/property-reference.md` — every supported property key, its generated
class and CSS variable, the breakpoint table, the CSS cascade order the generator
emits, and how tailwind-merge groups are assigned. Read it when you need a property
that isn't in the examples above, or when a generated class isn't behaving.

`references/setup.md` — installing the pipeline in a project that doesn't have it:
prerequisites, the four paths to decide, the seven install steps, and how to verify
the install actually took. Read it whenever Step 0 finds no pipeline.

`assets/` — files to copy during setup: `fluid.generate.mjs` (the generator, with
an editable settings block at the top), `fluid.config/` starter configs in both
CommonJS and ESM flavors, and `cn.js` / `cnFluid.js` helpers.
