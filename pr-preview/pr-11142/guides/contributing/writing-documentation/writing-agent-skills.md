---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11142/guides/contributing/writing-documentation/writing-agent-skills.md
description: >-
  How to add or change a skill in @warp-drive/memory-alpha so coding agents find
  and follow it, including the routing tables, file rules, and checks.
---

# Writing Agent Skills

How to add or change a skill in [`@warp-drive/memory-alpha`](https://github.com/warp-drive-data/warp-drive/blob/main/warp-drive-packages/memory-alpha/README.md),
the package of plain-markdown instructions that AI coding agents read when they work in this repo
or in an app that depends on ***Warp*Drive**. The same files are published for humans at
[/skills](/skills/).

## Audience

Of the [audiences](./index.md#know-your-audience) our documentation serves, a skill has two: the
coding agent that will follow it, and the human who opens the published copy to see what agents
are being told. Write for the agent. It has the repo in front of it and no conversation history,
so give it the rule, the reason, and the exact place to look, and nothing it can read for itself.
If the skill is in `skills/contributors/`, assume the agent is working inside this repo and knows
its layout. If it is in a consumer directory such as `skills/schemas/` or `skills/requests/`,
assume the agent is in an app that depends on ***Warp*Drive** and knows only the public API.

## How agents reach a skill

Agents do not browse the package. Each agent surface in the repo (`AGENTS.md`, which `CLAUDE.md`
and `GEMINI.md` import, plus the Copilot and Cursor pointer files) tells the agent to open one
routing table and read only the row that matches its task:

* `skills/contributors/index.md` routes agents contributing to ***Warp*Drive** itself.
* `skills/index.md` routes agents consuming `@warp-drive/*` packages in an app.

A skill that is not in the right table does not exist as far as agents are concerned. Adding a
skill therefore always means touching four files in its directory: the skill itself, `index.md`
(the agent-facing table), `overview.md` (the same table with links, published in place of
`index.md` on the website), and `_meta.json` (sidebar title and order for the website). Miss the
`overview.md` row and the website's table lacks the skill; miss the `_meta.json` entry and it
sorts last with a title generated from its filename. Nothing checks that `index.md` and
`overview.md` agree, so compare them by eye. If the content outgrows the skill, a fifth file, a
human guide under `guides/`, holds the detail and the skill links it.

## Writing the skill file

* **No YAML frontmatter.** The package README explains why: downstream tooling adapts these files
  into tool-specific formats (Claude skills, Cursor rules, Copilot instructions) and adds its own
  frontmatter, so ours would collide. Title and ordering live in `_meta.json` instead.
* **Open with an H1 and the trigger.** The file starts with an H1 matching the title you give it
  in `_meta.json`. The first sentence under it is "Use this skill whenever..." followed by the
  situation, so an agent that landed here from the table can confirm it is in the right place.
  Because a skill has no frontmatter, its entry in the docs site's `llms.txt` is the H1 alone,
  with no description, so the H1 must say what the skill does.
* **Then `## Steps`**, numbered, each one an action the agent can take. Put the reason for a rule
  in the step that states it. Existing skills such as
  [Start in a Fresh Worktree](/skills/contributors/start-in-a-fresh-worktree.md) and
  [Keep Commits Human-Authored](/skills/contributors/keep-commits-human-authored.md) are the
  house style.
* **Link, don't restate.** If a human guide owns a rule, link the guide and its heading rather
  than copying the rule. A copied rule goes stale silently; a link fails the link checker.
* **Stay tool-agnostic.** Say "ask the user" and "a fresh agent instance", not the name of one
  product's tool or command. The skill is read by several agents.
* **Put angle brackets in code spans.** VitePress compiles markdown to Vue, so a bare `<thing>`
  in prose is parsed as an element and fails the docs build.
* **Cross-reference other skills at the moment their case arises.** The index routes one row per
  task, so a link from inside a skill is the only way an agent discovers a second skill mid-task:
  a bug-fix skill that ends "if this changed documented behavior, follow Write Documentation"
  reaches agents the documentation row never will. Link at the step where the other skill becomes
  relevant, don't summarize it, and add the reciprocal link when the dependency runs both ways.
* **Link paths.** Other skills are linked relatively (`./other-skill.md`, or
  `../schemas/other-skill.md` across directories); guides are linked by site path
  (`/guides/contributing/...md`); anchors must match a real heading.
* **Keep it short.** If a skill needs more than about 100 lines, some of it belongs in a human
  guide that the skill links.

## Wiring it in

In the skill's directory:

1. Add a row to `index.md`: the situation in the first column, the filename with its `.md`
   extension in the second. Rows that apply to every session are listed first and called out
   below the table; put a task-specific skill after them.
2. Add the matching row to `overview.md`, same first column, with the second column as a link:
   `[Title](/skills/<directory>/your-skill.md)`.
3. In `_meta.json`, add the slug to `items` where it should sit in the sidebar, and add
   `"your-skill": { "title": "Your Title" }` under `files`.

## Publishing and drafts

The skills directory is synced to `/skills` on the website like the other content roots (see
[How the Docs Site Is Built](./index.md#how-the-docs-site-is-built)), with one difference: a page
marked `draft` is removed from the site entirely rather than hidden from the sidebar. That is how
each directory's agent-facing `index.md` stays off the website while `overview.md` is published
in its place: the directory's `_meta.json` carries both `"files": { "index": { "draft": true } }`
and `"webIndex": "overview"`. Agents read from disk, so `draft` has no effect on them.

## Checking your work

* `pnpm lint:docs` from the repo root checks every link and heading anchor in `skills/` along
  with the guides (see [Checking Links](./index.md#checking-links)).
* Build the site as [Previewing Your Changes](./index.md#previewing-your-changes) describes and
  open `/skills/contributors/` to see the sidebar entry and rendered page.
* Hand the skill file alone, not the index or the repo, to a fresh agent instance with a task it
  should cover, and check that it follows the steps to the right place and does not name a tool
  specific to one product.
