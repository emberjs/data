---
url: https://canary.warp-drive.io/pr-preview/pr-11238/skills.md
---
# WarpDrive Agent Skills

This section packages WarpDrive knowledge for AI coding agents — Claude, Copilot, Cursor, and
similar tools — as small, focused, task-oriented skills.

Each skill is a single markdown file describing one thing to accomplish with WarpDrive: defining
a schema, making a request, handling a mutation, and so on. Skills are grouped into directories
by topic, the same way the [Guides](/guides/index.md) are, and published as the
[`@warp-drive/memory-alpha`](https://www.npmjs.com/package/@warp-drive/memory-alpha) npm
package — named after the Federation's central archive of all recorded knowledge, minus the
away-team incident that torched the original — so it can be installed into any project and
consumed by an MCP server, a Claude Code skill, or adapted into tool-specific instruction files
(Cursor rules, Copilot instructions, etc.).

## Using These Skills in Your App

Install the package as a dev dependency:

```sh
pnpm add -D @warp-drive/memory-alpha
```

Then add this to your app's `AGENTS.md`:

```md
## WarpDrive

Before writing or changing code that uses `@warp-drive/*` packages, read
`node_modules/@warp-drive/memory-alpha/skills/index.md`, then only the one skill file it routes
you to. Skip its "contributing to WarpDrive itself" row.
```

If your app also has a `CLAUDE.md`, add a line reading `@AGENTS.md` to it, which imports it:
Claude Code reads `CLAUDE.md` instead of `AGENTS.md` when both exist. For an agent that doesn't
read `AGENTS.md`, put the same block in the instructions file it does read.

## The Skills

Find the row below that matches what you're doing, or browse the categories in the sidebar.

| If you need to... | Go to |
| --- | --- |
| Define a resource's shape — fields, relationships, identity — for the `Store` | [Define a Resource Schema](/skills/schemas/define-a-resource-schema.md) |
| Fetch or query remote data through the `Store` so it's cached and reactive | [Fetch and Cache Data](/skills/requests/fetch-and-cache-data.md) |
| Write, name, document, or type a request builder, or add a new request to the app's SDK | [Write a Request Builder](/skills/requests/write-a-request-builder.md) |
| Set up HTTP mocking for a test suite with `@warp-drive/holodeck` | [Set Up Holodeck](/skills/holodeck/set-up-holodeck.md) |
| Mock a request in a test, or fix a mock that stopped matching | [Mock HTTP Requests in Tests](/skills/holodeck/mock-http-requests-in-tests.md) |
| Change a schema's `belongsTo`/`hasMany` field to `resource`/`collection` | [Migrate belongsTo and hasMany Fields to resource and collection](/skills/relationships/migrate-relationship-fields.md) |
| Move code that consumes an async `belongsTo`/`hasMany` implicitly (`#each` blocks, `.content`, getters reading through it) toward requests and `resource`/`collection` | [Migrate Async Relationship Usage](/skills/relationships/migrate-async-relationship-usage.md) |
| Re-record one holodeck mock, or review a test that sets `RECORD` | [Use RECORD in Holodeck Mocks](/skills/holodeck/using-record.md) |
| Look up a guide, upgrade note, or API reference page that no row above covers — a concept, an option, a signature | [Read the Docs as Markdown](/skills/docs/read-the-docs-as-markdown.md) |
| You're contributing to WarpDrive itself, not just consuming it as a dependency | [Contributor Skills](/skills/contributors/index.md) |

This is the same routing table an AI agent uses to find a skill — it just links out to readable
pages instead of naming files to read. If you're an AI agent rather than a human reader, don't
start here — read the package's `skills/index.md` (or its
[README](https://www.npmjs.com/package/@warp-drive/memory-alpha)) instead, which routes you
directly to the one file you need without loading this page or any directory listing.
