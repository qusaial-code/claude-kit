# claude-kit

A [Claude Code](https://claude.com/claude-code) plugin marketplace with reusable skills and agents for my development workflow.

## What's in here

A marketplace named `qsc` that serves one plugin:

### `qsc-kit`

Reusable Claude Code skills and agents.

| Component | Type | What it does |
|---|---|---|
| `plan-and-ship` | Skill | Three human-gated phases on three models — plan on Opus, implement on Sonnet, ship via `commit-push` on Haiku. Triggers whenever you ask for a plan or an approach to a change. |
| `web-performance-optimization` | Skill | Code splitting, lazy loading, caching, compression, and Core Web Vitals monitoring. Use for slow loads, large bundles, or layout shift. |
| `commit-push` | Agent | Commits and pushes **only** the files it is explicitly given, using a conventional commit message. Runs on Haiku. Refuses to run without a file list (or the literal word `ALL`). |
| `figma-implement-design` | Agent | Translates a Figma design (URL or desktop selection) into production-ready code with 1:1 visual fidelity, using the Figma MCP server. Runs on Sonnet. Requires the `figma` plugin. |

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

## Usage

- **Skills** load automatically when their `description` matches what you're doing. `plan-and-ship` fires on "write a plan", "how should we approach X", "scope this out"; `web-performance-optimization` on bundle size and Core Web Vitals work. You can also invoke either by name.
- **Agents** are invoked explicitly — `@commit-push` with a list of paths:

  ```
  @commit-push Commit and push:
  src/components/Hero.jsx
  src/data/hero.js
  ```

  It never expands that list. Pass `ALL` only when you really want the whole working tree.

  `@figma-implement-design` works the same way — give it a Figma URL and it implements the matching code:

  ```
  @figma-implement-design https://figma.com/design/kL9xQn2VwM8pYrTb4ZcHjF/DesignSystem?node-id=42-15
  ```

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
```

## Adding to the kit

**A skill** — create `plugins/qsc-kit/skills/<name>/SKILL.md` with YAML frontmatter carrying `name` and a `description` that spells out when to trigger (and when not to). Keep `SKILL.md` tight and push long reference material into a `references/` folder beside it so it's only read when needed.

**An agent** — create `plugins/qsc-kit/agents/<name>.md` with frontmatter for `name`, `description`, `tools` (scope these narrowly), and optionally `model` to pin which model it runs on.

Both are picked up by directory convention — nothing to register in `plugin.json`. Bump `version` there when you publish a change, then reinstall or update from the marketplace to pick it up.
