---
url: https://canary.warp-drive.io/pr-preview/pr-11286/llm-docs.md
description: >-
  Where to find llms.txt, llms-full.txt, and the plain-Markdown twin of every
  page, and how the Copy page button uses them.
---

## LLM Optimized Documentation

Every page on this site is also published as plain Markdown, for coding agents and for anyone who
wants to paste a page into a chat.

* [llms.txt](/llms.txt) is the table of contents: one absolute link per page, grouped by section,
  following the [llms.txt](https://llmstxt.org/) convention.
* [llms-full.txt](/llms-full.txt) is every page concatenated into one file. It is a few megabytes;
  prefer `llms.txt` plus the one page you need.
* Any page's Markdown is at its URL plus `.md`: `/guides/the-manual/requests/builders` becomes
  `/guides/the-manual/requests/builders.md`. For a URL that ends in `/`,
  drop the slash first (`/guides/installation/` becomes `/guides/installation.md`) or append
  `index.md`; both exist.
* The **Copy page** button above every page title does the same without the URL juggling: copy the
  Markdown, open it in a new tab, or hand the page to Claude.

Agents working in an app that depends on ***Warp*Drive** get these rules from the
[Read the Docs as Markdown](/skills/docs/read-the-docs-as-markdown.md) skill in
[`@warp-drive/memory-alpha`](https://www.npmjs.com/package/@warp-drive/memory-alpha), including
how to read the site's `:::tip` callouts and `:::tabs` blocks in their raw form.
