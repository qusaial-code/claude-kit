# Installing the Fluid Token Pipeline

Follow this when a project has no `fluid.config/` + `fluid.generate.mjs` yet.
Everything you need to copy lives in this skill's `assets/` directory.

## Contents

- [Prerequisites](#prerequisites)
- [Decide the four paths](#decide-the-four-paths)
- [Steps](#steps)
- [Verify](#verify)
- [Adapting to non-standard projects](#adapting-to-non-standard-projects)

## Prerequisites

Check these before touching anything, and stop and report if one fails — a
half-installed pipeline generates classes that silently do nothing, which is
worse than no pipeline.

| Requirement | How to check | If missing |
|---|---|---|
| **Tailwind v4** | `tailwindcss` in `package.json` at `^4` | Stop. `@theme` and `@utility` are v4-only; there is no v3 fallback for this generator. |
| **CSS-first Tailwind config** | An entry stylesheet with `@import 'tailwindcss'` | A v4 project using a JS config still works, but the generated CSS must be imported from a stylesheet Tailwind processes. |
| **Node ≥ 16** | `node -v` | The generator uses top-level `await` in an `.mjs` file. |
| **`clsx` + `tailwind-merge`** | `package.json` dependencies | Only needed for the `cn()` helper (step 6). Install them, or skip step 6 and use `cnFluid()` alone. |

## Decide the four paths

The generator has a settings block at the top. Read the project layout first and
fill these in — don't assume the defaults fit.

| Constant | Default | How to choose |
|---|---|---|
| `ROOT` | `<script dir>/..` | Correct if the script sits in `<project>/scripts/`. |
| `CONFIG_ENTRY` | `src/utils/fluid.config/index.js` | Wherever shared utilities live in this project (`src/lib/`, `app/utils/`, `lib/`). |
| `CSS_OUT` | `src/app/styles/fluid.css` | Beside the entry stylesheet that has `@import 'tailwindcss'`. |
| `TOKENS_OUT` | `src/utils/fluid.tokens.js` | Beside `cn.js`, since `cn.js` imports it relatively. |

Also confirm two design constants in the same block:

- `MIN_SCREEN` / `MAX_SCREEN` — default `430` / `1920`. These are the viewport
  widths at which the mobile and desktop values apply *exactly*, so they should
  match the frame widths the designs are drawn at. Ask if the designs use
  different frames (`375`/`1440` is another common pair).
- `BREAKPOINTS` — must match the project's Tailwind breakpoints. The defaults
  include a non-standard `3xl: 1600px`; drop it unless the project defines it.

## Steps

**1. Copy the generator.**

Copy `assets/fluid.generate.mjs` to `<project>/scripts/fluid.generate.mjs`, then
edit its settings block with the paths and constants decided above.

**2. Create the config directory.**

Check `package.json` for `"type": "module"` and pick the matching pair — mixing
them up produces a module-format error on the first run:

| `"type": "module"` present | Copy |
|---|---|
| no (CommonJS — the Next.js default) | `assets/fluid.config/index.cjs.js` → `index.js`, `global.cjs.js` → `global.js` |
| yes (ESM) | `assets/fluid.config/index.esm.js` → `index.js`, `global.esm.js` → `global.js` |

Both land in the directory `CONFIG_ENTRY` points at, renamed to `index.js` and
`global.js`. They ship with a few starter typography and button tokens — keep them
as a worked example, or replace them with the project's real values.

**3. Add the npm script.**

```jsonc
{
  "scripts": {
    "generate-tokens": "node scripts/fluid.generate.mjs",
    "dev":   "npm run generate-tokens && next dev",
    "build": "npm run generate-tokens && next build"
  }
}
```

Chaining it into `dev` and `build` is what keeps the generated CSS from going
stale — without it, a teammate who pulls a new token gets a class that doesn't
exist yet. Use the project's actual package manager and dev/build commands.

**4. Import the generated CSS.**

In the entry stylesheet, *after* the Tailwind import:

```css
@import 'tailwindcss';
@import './styles/fluid.css';
```

Order matters: `@theme` and `@utility` from the generated file need Tailwind's
own definitions to already be in scope.

**5. Ignore or commit the generated files — pick one and be consistent.**

Committing `fluid.css` and `fluid.tokens.js` keeps builds reproducible without a
prebuild step and makes token diffs reviewable in PRs. That's what LPS does, and
it's the better default. If instead you gitignore them, the `dev`/`build` chaining
from step 3 becomes mandatory rather than merely convenient.

**6. Add the `cn()` helper.**

If the project has no `cn()` yet, copy `assets/cn.js` and `assets/cnFluid.js` next
to `TOKENS_OUT`.

If it already has a `cn()` built on plain `twMerge`, change it to
`extendTailwindMerge` and feed it the generated groups:

```js
import { extendTailwindMerge } from 'tailwind-merge';
import { fluidClassGroups } from './fluid.tokens.js';

const twMerge = extendTailwindMerge({ extend: { classGroups: fluidClassGroups } });
```

Skipping this is the subtlest way to get a broken install: everything renders
until the first time someone writes `cn('text-btn', 'text-white')`, and then one
of the two classes vanishes with no error.

**7. Run it.**

```bash
npm run generate-tokens
```

## Verify

Don't declare the install done on the generator's own success message — it will
happily write a CSS file that Tailwind never reads.

1. **Generator ran** — two `✅` lines, no `⚠️` block, and the summary lists the
   starter tokens with their class names.
2. **Files exist** at `CSS_OUT` and `TOKENS_OUT`, and `CSS_OUT` contains a
   `@theme` block.
3. **Tailwind picked it up** — this is the step that actually proves the install.
   Put `text-title` on a real element, run the dev server, and confirm in devtools
   that the computed `font-size` is a `calc()` that changes as you resize the
   window. If the class has no effect, the CSS import in step 4 is wrong or in the
   wrong order.
4. **`cn()` is wired** — `cn('text-title', 'text-white')` returns *both* classes.
   If it returns one, step 6 didn't take.

Report which of these you verified and which you couldn't (for example, if you
can't start a dev server, say step 3 is unverified rather than implying it passed).

## Adapting to non-standard projects

**No `scripts/` directory** — put the generator anywhere and fix `ROOT`. It's
resolved from the script's own location, so `ROOT` must climb to the project root.

**Monorepo** — install per package rather than at the workspace root. Each package
has its own Tailwind entry stylesheet and its own `cn()`, so a shared generator
would need per-package outputs anyway.

**Vite / Astro / SvelteKit rather than Next.js** — nothing here is Next-specific.
Only the paths and the dev/build script names change; the `@import` ordering rule
in step 4 is the same.

**Tailwind v3** — not supported. `@theme` and `@utility` don't exist, so the
generated classes would never be produced. Say so rather than improvising a
`tailwind.config.js` port; the port is a real piece of work and shouldn't happen
as a silent side effect of adding a token.
