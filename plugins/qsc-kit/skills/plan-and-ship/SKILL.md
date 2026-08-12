---
name: plan-and-ship
description: >-
  Plan a change to this repo, then implement it, then ship it — as three
  human-gated phases on three models: plan on Opus, implement on Sonnet
  (subagent), commit+push via the `commit-push` agent (Haiku). Trigger
  automatically whenever the user asks for a plan or an approach to work in
  this project — "write a plan", "plan out X", "how should we approach",
  "what's the best way to add/refactor/restructure", "scope this out",
  "design the change" — with or without the word "plan". Do NOT trigger for
  questions answerable by reading code (explanations, "where is X", "why does
  Y happen"), for a single obvious edit the user already described precisely,
  or when a more specific skill owns the task (see Do not trigger below).
---

# Plan and ship

Three phases, three models, a human gate between each. Never collapse them.
Never start a phase before the user approves the one before it.

## Operating standard

Every phase works to the standard of someone who has maintained *this* repo
for a year — not a generalist reasoning from first principles. Concretely:

- **Name things exactly.** The real token, prop, data key, file path, and
  line. Never "the hero component" when you mean
  `src/campaigns/afa/components/AfaHero.jsx:42`.
- **Follow the existing pattern before inventing one.** This repo has settled
  answers for most things — shared templates over duplicated section JSX,
  `data/` folders over text in JSX, generated fluid tokens over arbitrary
  Tailwind values. Find the precedent and match it.
- **Match the surrounding code** in naming, comment density, and idiom.
- **Verify, don't assume.** If a file, export, or prop is load-bearing to the
  plan, read it. A confident wrong path costs more than the read.
- **Say when you don't know.** Flag the uncertainty at the gate instead of
  guessing and letting Sonnet build on it.

### This is not the Next.js you know

This repo runs a Next.js version with breaking changes — APIs, conventions,
and file structure differ from training data (`middleware.js` is `proxy.js`
here, for one). Before planning or writing code that touches Next.js APIs —
routing, metadata, server components, proxy/middleware, caching — read the
relevant guide in `node_modules/next/dist/docs/`. Heed deprecation notices.
Memory of Next.js is not a source here; the installed docs are.

| Phase | Model | Does | Gate |
|---|---|---|---|
| 1. Plan | **Opus** — this session | Research + written plan. **Zero file edits.** | User approves |
| 2. Implement | **Sonnet** — subagent | Applies the plan | User reviews diff |
| 3. Ship | **Haiku** — `commit-push` agent | Scoped commit + push | User says ship |

The user may stop after any phase. That is a normal outcome, not a failure.

## Do not trigger

Yield to the skill that owns the task — do not run this one alongside it:

- **`page-migrate`** — porting a page/route/campaign from the old project.
- **`fix-responsive-overflow`** — overflow / breakpoint audits on an LP.
- **`code-review`**, **`simplify`**, **`security-review`** — review work.

Those already have their own phases. Running both duplicates the gates.

---

## Phase 1 — Plan (Opus)

**Check the model first.** This phase must run on Opus — never plan on a
smaller model. Two paths, depending on where the session already is:

**Session is on Opus** — plan directly here. Best case: full conversation
context, and the plan lands natively in the chat where the user can edit it.

**Session is not on Opus** — do not ask the user to switch, and do not plan
anyway. Spawn an Opus planner instead:

```
Agent(
  subagent_type: "Plan",
  model: "opus",
  run_in_background: false,
  description: "plan <short name>",
  prompt: <the user's request + the context notes below>
)
```

Use `subagent_type: "Plan"`. It has no Edit/Write/NotebookEdit tools at all,
so the zero-edit rule is enforced structurally rather than by instruction.

The planner starts **cold**. Its prompt must carry:

- the user's request, in their own words;
- anything from this conversation that shapes the change — constraints
  already agreed, files already discussed, approaches already ruled out.
  Without this it will re-derive what you both settled minutes ago;
- the **plan format** below, verbatim, with the instruction to return the
  finished plan as its final message and nothing else.

When it returns, **paste the plan into the conversation as written.** Do not
summarize it, shorten it, or describe it — the user is about to approve it and
Sonnet will build from it, so they must see the real text. Add your own note
after it only if you spot something the planner missed.

**Zero file edits in this phase, either path.** No Write, no Edit, no
scaffolding, no "just this one small fix". Research only.

Research the minimum needed to be specific — `CLAUDE.md` is already in
context, so do not re-read it or restate what it says. Read only the files the
change actually touches. Prefer `Grep`/`Glob` over reading whole files; read a
range, not a 900-line file, when you know the range.

### Plan format

Whoever writes the plan — this session or the Opus planner — produces exactly
these sections:

- **Goal** — one or two sentences.
- **Files** — every path to be created or modified, each with a one-line note
  on what changes there. Use `path:line` so the user can click it.
- **Steps** — ordered, each one concrete enough that Sonnet needs no
  judgment call to carry it out. Name the exact component, token, prop, or
  data key involved.
- **Conventions in play** — only the repo rules that constrain *this* change
  (e.g. fluid tokens are generated, never hand-edit `fluid.css`; text belongs
  in `data/`, not JSX). Two or three lines, not a summary of `CLAUDE.md`.
- **Next.js docs** — if the change touches Next.js APIs, the exact path(s)
  under `node_modules/next/dist/docs/` you consulted, so Phase 2 reads the
  same guide instead of trusting its training data. Omit if untouched.
- **Risks / open questions** — anything genuinely ambiguous. Omit if none.

No tests section. The user handles verification during Phase 2.

Keep it tight — a plan someone can hold in their head beats an exhaustive one.

**Gate.** Ask whether to implement it with Sonnet (`AskUserQuestion`, or a
plain question). Stop and wait. If the user edits the plan, fold in their
changes and re-confirm before spawning.

---

## Phase 2 — Implement (Sonnet)

Only after approval. Spawn **one** subagent:

```
Agent(
  subagent_type: "general-purpose",
  model: "sonnet",
  run_in_background: false,
  description: "implement <short name>",
  prompt: <the approved plan, verbatim, + the notes below>
)
```

The subagent starts **cold** — it has none of this conversation. Its prompt
must be self-sufficient. Include, in the prompt itself:

- the approved plan verbatim, including the file list;
- any decision made during the gate discussion that changed the plan;
- exact file paths and the relevant findings from Phase 1 research, so it does
  not re-derive them;
- the **Operating standard** above, restated — the subagent cannot see this
  file. Paste the bullets; they are what keep it working like a maintainer of
  this repo rather than a generalist;
- if the change touches Next.js APIs: the doc path(s) from the plan, with
  **read this before writing code — this Next.js version differs from your
  training data**. This is the single most common way a cold subagent gets it
  wrong here;
- this instruction: **end your report with a plain list of every file you
  created or modified, one path per line.** Phase 3 needs it.

Tell it to implement the plan as written and to stop and report back rather
than improvise if the plan turns out to be wrong. Do not ask it to write or
run tests unless the user asked for them.

When it returns, relay what changed — the agent's report is not shown to the
user. Show the file list and anything it flagged. If it deviated from the
plan, say so explicitly.

**Gate.** Ask whether to commit and push. Stop and wait. The user will often
check the result themselves first; if they come back with fixes, apply them
here (or re-spawn) before moving on.

---

## Phase 3 — Ship (`commit-push`, Haiku)

Only after the user says to ship.

`commit-push` **refuses to run without an explicit file list** and never
expands the list it is given. So pass the exact paths from Phase 2:

```
Agent(subagent_type: "commit-push", prompt: "Commit and push:\n<path>\n<path>")
```

Do not pass `ALL`. This repo's working tree routinely holds unrelated edits
from other sessions, and `ALL` would sweep them into the commit.

If the user hand-edited files between Phase 2 and Phase 3, keep their edits as
written — never revert or re-plan over them. Add any new paths to the list,
and mention what you spotted before committing.

Do not set the model here — `commit-push` pins Haiku in its own frontmatter.

---

## Efficiency

The point of the phase split is that each model does only its own work.

- Never re-read in Phase 3 what Phase 2 reported, or in Phase 2 what Phase 1
  already established — pass findings forward in the prompt instead.
- One subagent per phase. Do not fan out parallel agents.
- Do not re-summarize the plan back to the user after they have approved it.
- Batch independent reads in a single message.
