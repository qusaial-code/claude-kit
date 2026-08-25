# claude-kit

A [Claude Code](https://claude.com/claude-code) plugin marketplace with reusable skills and agents for my development workflow.

## What's in here

A marketplace named `qsc` that serves one plugin:

### `qsc-kit`

Reusable Claude Code skills and agents. Click a name for how to use it in a project.

| Component | Type | What it does |
|---|---|---|
| [`plan-and-ship`](#plan-and-ship) | Skill | Three human-gated phases on three models — plan on Opus, implement on Sonnet, ship via `commit-push` on Haiku. Triggers whenever you ask for a plan or an approach to a change. |
| [`web-performance-optimization`](#web-performance-optimization) | Skill | Code splitting, lazy loading, caching, compression, and Core Web Vitals monitoring. Use for slow loads, large bundles, or layout shift. |
| [`fluid-tokens`](#fluid-tokens) | Skill | Fluid responsive design tokens — turns a `[mobile, desktop]` px pair into a Tailwind class that scales smoothly between 430px and 1920px, with breakpoint and RTL overrides. Installs the generator pipeline itself if the project doesn't have one. |
| [`commit-push`](#commit-push) | Agent | Commits and pushes **only** the files it is explicitly given, using a conventional commit message. Runs on Haiku. Refuses to run without a file list (or the literal word `ALL`). |
| [`figma-implement-design`](#figma-implement-design) | Agent | Translates a Figma design (URL or desktop selection) into production-ready code with 1:1 visual fidelity, using the Figma MCP server. Runs on Sonnet. Requires the `figma` plugin. |

## Install

Add the marketplace, then install the plugin:

```
/plugin marketplace add qusaial-code/claude-kit
/plugin install qsc-kit@qsc
```

To install from a local clone instead:

```
/plugin marketplace add /path/to/claude-kit
/plugin install qsc-kit@qsc
```

Then `/plugin` to browse, enable, disable, or update what's installed.

## How skills and agents differ

**Skills** load themselves. Each one's `description` says when it applies, and Claude pulls it in when your request matches — you don't have to remember it exists. You can also invoke one by name (`/fluid-tokens`) to force it.

**Agents** are invoked explicitly with `@name`. They run in their own context on their own pinned model, and report back. Nothing happens unless you call them.

---

# Skills

## `plan-and-ship`

Splits a change into three phases on three models, with a human gate between each: **plan on Opus** (research and a written plan, zero file edits), **implement on Sonnet** (a subagent applies the approved plan), **ship on Haiku** (via the `commit-push` agent). Phases never collapse into one another, and you can stop after any of them.

**Triggers on** "write a plan", "plan out X", "how should we approach", "what's the best way to add/refactor/restructure", "scope this out" — with or without the word "plan".

**Does not trigger** for questions answerable by reading code ("where is X", "why does Y happen"), for a single obvious edit you already described precisely, or when a more specific skill owns the task.

### Using it

Just describe the change:

```
How should we approach moving the footer legal copy into data files?
```

You'll get a plan with **Goal**, **Files** (as clickable `path:line`), **Steps**, **Conventions in play**, and **Risks** — then a gate. Approve it and Sonnet implements; review the diff; say ship and `commit-push` commits the exact file list Sonnet reported.

If your session isn't already on Opus, the skill spawns an Opus planner rather than planning on a smaller model, then pastes the plan back verbatim.

### Project fit

The skill is written for a repo where conventions are already settled — it tells each phase to find the existing precedent and match it rather than invent one. Its **Operating standard** section (name things exactly, verify don't assume, match surrounding code) is restated into every subagent prompt, since subagents start cold and can't see the skill.

It also carries a repo-specific warning that the installed Next.js version differs from training data and that `node_modules/next/dist/docs/` is the source of truth. Adjust or drop that section for projects where it doesn't apply.

---

## `web-performance-optimization`

Performance strategies with worked code: React code splitting via `lazy`/`Suspense`, webpack `splitChunks`, image optimization, service worker caching, Core Web Vitals monitoring, and compression. Includes a performance-target table and an optimization checklist.

**Triggers on** slow page loads, high LCP, large bundles, frequent CLS, and mobile performance work.

### Using it

```
The dashboard bundle is 800kb and LCP is over 4s — what should we do?
```

The skill supplies the patterns; you still decide which apply. Two reference files load only when needed:

- `references/compression-monitoring.md` — webpack compression plugin, monitoring setup
- `references/typescript-advanced.md` — typed lazy-load utilities and perf helpers

### Project fit

Framework-agnostic in principle, but the examples are React + webpack. On Next.js or Vite, treat the webpack config blocks as illustrative rather than copy-paste.

---

## `fluid-tokens`

A fluid token turns one `[mobile, desktop]` px pair into a CSS `calc()` that scales continuously with viewport width — no breakpoint jumps. `[18, 45]` means 18px at a 430px viewport, 45px at 1920px, and linear interpolation between; outside that range it scales proportionally in `vw`. You write the pair in a config file, a generator turns it into a CSS variable plus a Tailwind v4 utility, and you use it as an ordinary class.

**Triggers whenever you give a mobile and a desktop value for any size** — "make this 16 on mobile and 32 on desktop", "18px → 45px", "the title should be 36/64" — or say "fluid token", "regenerate tokens", or ask to override a size at a breakpoint or for RTL. Also triggers when you're about to hardcode `text-[18px] lg:text-[45px]`, which is the thing this replaces.

### Using it in a project that already has the pipeline

Say the values:

```
Make the hero title 36 on mobile and 64 on desktop
```

The skill adds the token to the right config file, regenerates, and applies the class:

```js
// src/utils/fluid.config/champion-summer.js
'CS-hero-title': {
  fontSize:   [36, 64],   // → text-CS-hero-title
  lineHeight: [46.8, 68], // → leading-CS-hero-title
},
```

```jsx
<h1 className="text-CS-hero-title leading-CS-hero-title">
```

One token can carry as many properties as the element needs — a token describes an element, not a single value. Breakpoint overrides (`lg: { width: [490, 909] }`) bend the curve above a breakpoint, and RTL differences are handled either by a separate `-ar` token used with Tailwind's `rtl:` variant, or by an `rtl` block inside the token.

### Setting it up in a project that doesn't

```
/fluid-tokens setup
```

The skill checks prerequisites (**Tailwind v4 is required** — `@theme` and `@utility` are v4-only, and there's no v3 fallback), then copies the generator and starter configs from `assets/`, wires the npm script and the CSS import, and adds a `cn()` helper. It won't add a token to a project without the pipeline, since that produces a valid config and a class that silently does nothing.

### The pipeline

```
1. you edit    src/utils/fluid.config/global.js      ← write [mobile, desktop] pairs
2. you run     node scripts/fluid.generate.mjs       ← or: pnpm run generate-tokens
3. it writes   src/app/styles/fluid.css              ← :root vars, @theme, @utility, RTL + breakpoints
               src/utils/fluid.tokens.js             ← tailwind-merge groups, imported by cn.js
4. Tailwind    reads fluid.css via the @import in globals.css
5. you use     className="text-CS-hero-title"
```

Step 2 is usually automatic — chaining it into `dev` and `build` is what stops the generated CSS going stale. `fluid.css` and `fluid.tokens.js` are regenerated wholesale, so never hand-edit them; the config directory is the only thing you write.

### What's bundled

- `references/property-reference.md` — all ~30 property keys and the class each generates, the interpolation math, the breakpoint table, CSS cascade order, and a failure-mode table
- `references/setup.md` — prerequisites, the four paths to decide, seven install steps, and how to verify the install actually took
- `assets/` — `fluid.generate.mjs` (editable settings block at the top), starter configs in both CommonJS and ESM flavors, and `cn.js` / `cnFluid.js`

### Two things that bite

**A property declared only inside a breakpoint or `rtl` block generates no class.** `@theme` entries and `@utility` rules come from base properties only, so `lg: { height: [100, 200] }` without a base `height` gives you a CSS variable nothing reads.

**An `rtl` block beats a breakpoint override unless you mirror it.** `[dir="rtl"]` and `:root` have equal specificity and the `[dir="rtl"]` block is emitted later, so above the breakpoint the RTL base value wins. Write `rtl: { pe: [100, 200], lg: { pe: [150, 200] } }`.

The generator names both cases (and malformed pairs, and unknown property keys) in a `⚠️` block after it runs — read that, not just the two `✅` lines.

---

# Agents

## `commit-push`

Commits and pushes **only** the paths it is handed, with a conventional commit message derived from that scoped diff. Pinned to Haiku regardless of the calling session's model.

### Using it

```
@commit-push Commit and push:
src/components/Hero.jsx
src/data/hero.js
```

It never expands the list — not to sibling files, not to files with the same extension, not to something it noticed in `git status`. Before committing it re-checks `git diff --cached --name-only` against what you asked for and unstages anything extra. Pass the literal `ALL` only when you really want the whole working tree.

With neither a file list nor `ALL`, it refuses and tells you to re-invoke.

### Project fit

Built for repos where several sessions or agents share one working tree, so an unscoped `git add -A` would sweep unrelated edits into your commit. It also deliberately omits the `Co-Authored-By: Claude` trailer, so commits show only the human author.

---

## `figma-implement-design`

Translates a Figma design into code in your repository, aiming for 1:1 visual parity. Pinned to Sonnet. **Requires the `figma` plugin** for the MCP server.

### Using it

With a URL:

```
@figma-implement-design https://figma.com/design/kL9xQn2VwM8pYrTb4ZcHjF/DesignSystem?node-id=42-15
```

Or, with the `figma-desktop` MCP, select a node in the desktop app and invoke it without a URL.

It fetches `get_design_context` for structure and tokens, `get_screenshot` as the visual source of truth, downloads assets from the Figma payload, then translates into your project's conventions — reusing existing components and design tokens rather than pasting Figma's raw Tailwind output. It validates against the screenshot before reporting done. For designs too large to fetch at once, it walks `get_metadata` and pulls child nodes individually.

### Project fit

Works best when the project already has a design system to map onto — the agent prefers your tokens over literal Figma values and extends existing components instead of creating near-duplicates. In a project using `fluid-tokens`, sizes from Figma are exactly the `[mobile, desktop]` pairs that belong in a fluid token rather than in arbitrary Tailwind values.

**Boundary:** this agent writes code. For writing *into* Figma (creating or editing nodes) use `figma-use`; for building a full screen in Figma from code use `figma-generate-design`.

---

## Repository layout

```
.claude-plugin/
  marketplace.json          # marketplace manifest — name, owner, plugin list
plugins/
  qsc-kit/
    .claude-plugin/
      plugin.json           # plugin manifest — name, description, version
    agents/
      commit-push.md
      figma-implement-design.md
    skills/
      plan-and-ship/
        SKILL.md
      web-performance-optimization/
        SKILL.md
        references/         # loaded on demand, not up front
          compression-monitoring.md
          typescript-advanced.md
      fluid-tokens/
        SKILL.md
        references/
          property-reference.md
          setup.md
        assets/             # copied into the target project during setup
          fluid.generate.mjs
          fluid.config/
          cn.js
          cnFluid.js
```

## Adding to the kit

**A skill** — create `plugins/qsc-kit/skills/<name>/SKILL.md` with YAML frontmatter carrying `name` and a `description` that spells out when to trigger (and when not to). Keep `SKILL.md` tight and push long reference material into a `references/` folder beside it so it's only read when needed. Files the skill copies into a target project go in `assets/`.

**An agent** — create `plugins/qsc-kit/agents/<name>.md` with frontmatter for `name`, `description`, `tools` (scope these narrowly), and optionally `model` to pin which model it runs on.

Both are picked up by directory convention — nothing to register in `plugin.json`. Bump `version` there when you publish a change, then reinstall or update from the marketplace to pick it up.

When you add either one, add a row to the [table above](#qsc-kit) and a matching section under **Skills** or **Agents**, so the link in the row resolves.
