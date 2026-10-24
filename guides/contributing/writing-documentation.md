---
url: https://canary.warp-drive.io/guides/contributing/writing-documentation.md
description: >-
  Which type of doc to write for a change, who each type is for, how the docs
  site is built from the repo, and the checks to run before opening the PR.
---

# Writing Documentation

## Know Your Audience

***Warp*Drive**'s documentation has to balance appealing to many different audiences:

* **Decision makers**: VPs and Directors who hear about ***Warp*Drive** at a conference and feel
  their team should evaluate whether it solves their business problems.
* **Technical evaluators**: Tech Leads, Senior ICs, and Architects who want to decide if it
  solves their tech needs.
* **Hobbyists** who heard about it and want to try it for a weekend project.
* **New engineers** who just started at a company and want to learn about this thing the company
  uses.
* **Existing users** who want to find the documentation for something, learn the project deeper,
  or need to know how to upgrade from one version to the next.
* **LLMs and coding agents** answering questions about ***Warp*Drive** or writing code against
  it, whether from the published site, the TSDoc in the source, or the agent skills. They read
  one page at a time with no memory of the rest. The heading, naming, and self-contained-page
  guidelines below exist for them as much as for anyone.

Default to assuming the reader either does not use ***Warp*Drive** yet or is just getting started.
The guide for each type of doc narrows that default to its own readers, but a few guidelines apply
everywhere:

* Landing pages and introductions should entice decision makers and technical evaluators, and
  give hobbyists a fast path in.
* Anything that teaches should start from the assumption that the reader has no context on the
  project's history.
* Cross-link concepts whenever possible, especially when first introducing one.
* Title pages and sections in the words a reader would search for or scan past. A plain noun
  phrase or a question beats a clever heading: it is what search engines index, what a model
  routes by, and what a skimming human stops on.
* Use one name per concept and use it everywhere. Mark recommended, legacy, and deprecated
  approaches explicitly where they appear, with the `@recommended`, `@discouraged`, and
  `@deprecated` tags in API docs and "Legacy" in page titles, so a reader or model landing on an
  older pattern cannot mistake it for the current one. Make each page answer its own question
  without depending on the reader having seen a neighbor.
* Content for existing users, such as upgrade guides and legacy setup, can presume some knowledge
  of older concepts but should never presume knowledge of newer ones, and should be kept separate
  from everything else so it does not muddy the path for new readers. [Upgrading](/upgrading/) is
  its own top-level section and legacy pages are explicitly named, such as
  [Setup - Legacy (Ember)](/guides/configuration/ember), for exactly this reason.

## Iterate, A Lot

Write the documentation someone needs, ask them to use it, and fix the places where they stumble
before the next person reads it. Every round of that makes the docs work for a wider audience.

## Which Type of Doc Should I Write?

* **Proposing a new public API, a behavior change, or a deprecation?** Write an **RFC** under
  `rfcs/`, published at [/rfcs](/rfcs/). It comes before any of the docs below. See
  [The RFC Process](../rfc-process.md).
* **Documenting a function, class, type, or its params?** Write **API Docs**:
  [TSDoc](https://tsdoc.org/) comments in the source next to the symbol. Published at
  [/api](/api/). See [Writing API Docs](./writing-api-docs.md).
* **Introducing a package as a whole?** Write its **README**, shown on GitHub and npm, and its
  `src/index.md` (for example `warp-drive-packages/core/src/index.md`), which is the package's
  landing page in the API docs. See
  [READMEs and `src/index.md`](./writing-api-docs.md#readmes-and-src-index-md).
* **Teaching a concept or how to accomplish a task?** Write a **Guide** under `guides/`, compiled
  from markdown and published at [/guides](/guides/). Step-by-step walkthroughs go in the
  [Tutorials](/guides/tutorials/) section (`guides/tutorials/`). See
  [Writing Guides](./writing-guides.md).
* **Walking existing users through an upgrade or a deprecation?** Write an **Upgrading** page
  under `upgrading/`, published at [/upgrading](/upgrading/).
* **Announcing something as of a point in time?** Write a **Blog** post under `blog/`, published
  at [/blog](/blog/). Upgrading and Blog pages both have permanent URLs; see
  [Upgrading and Blog Pages](./writing-guides.md#upgrading-and-blog-pages).
* **Instructions a coding agent should follow?** Write an **Agent skill** under
  `warp-drive-packages/memory-alpha/skills/`: plain markdown routed by an index, published at
  [/skills](/skills/). See [Writing Agent Skills](./writing-agent-skills.md).

## Cross-Documentation Checklist

Most code changes affect more than one type of doc. Use this checklist to find every doc a
change should touch, so a new API does not land with TSDoc but no guide, or a deprecation
without an upgrade path.

New public API:

* An accepted RFC, if the API is new or changes behavior. See [The RFC Process](../rfc-process.md).
* TSDoc with `@since` set to the version it ships in, and a usage example.
* A guide showing usage, if it is a concept users need to learn.
* A mention in the package README and `src/index.md`, only if it changes the package's headline
  story.

Breaking change or deprecation:

* An accepted RFC. See [The RFC Process](../rfc-process.md).
* Update the affected TSDoc, marking `@deprecated` with a link to the replacement.
* Add or update the `upgrading/` guide for the version the change ships in.
* Fix Guides and README examples that use the old API.

Bug fix:

* Update TSDoc only if documented behavior changed.
* Update a guide only if recommended usage changed.

## How the Docs Site Is Built

Everything on the site except the API docs is markdown copied from the repo by
`docs-viewer/src/prepare-website.ts` on each build: `guides/` to `/guides`, `upgrading/` to
`/upgrading`, `blog/` to `/blog`, `rfcs/` to `/rfcs`, and `warp-drive-packages/memory-alpha/skills/`
to `/skills`. The API docs are generated from the source by TypeDoc into `/api`. Package READMEs
are not on the site; GitHub and npm render them. Every page is also emitted as a plain-Markdown
twin at its URL plus `.md`, and indexed in `llms.txt`, for coding agents; see
[Frontmatter and Agent-Only Content](./writing-guides.md#frontmatter-and-agent-only-content) for
what in a page's source shapes that output.

### Sidebar and `_meta.json`

Each content directory's `_meta.json` controls how it appears in the sidebar:

* `title` sets the sidebar label for the directory.
* `items` is the ordered list of child slugs (filenames without `.md`, or subdirectory names).
  Unlisted items sort alphabetically after the listed ones, so when you add a page, add its slug
  to `items` where it belongs.
* `files` holds per-file metadata keyed by filename without `.md`, such as a `title` or `draft`. A
  page's own frontmatter `title` wins over a `files` entry when both are set.
* `draft` on a `files` entry or in a page's own frontmatter hides that page from the sidebar; on
  the directory it hides every page in it. In `guides/`, `upgrading/`, and `blog/` a hidden page
  is still built and reachable at its URL. In the agent skills a `draft` page is removed from the
  site entirely.
* `collapsed` controls whether the directory's sidebar group starts collapsed.

The sidebar is computed once, when VitePress loads its config. A page added while the dev server
is running is served at its URL but does not appear in the sidebar until you restart the server.

### Markdown

All [VitePress markdown features](https://vitepress.dev/guide/markdown) are available, including
custom containers (`::: tip`, `::: warning`) and
[code groups](https://vitepress.dev/guide/markdown#code-groups). One consequence of VitePress
compiling markdown to Vue: a bare `<thing>` in prose is parsed as an element and fails the build,
and the link checker will not warn you first. Wrap angle brackets in single backticks.

### Checking Links

`pnpm lint:docs` from the repo root renders every page in the content roots above and fails on
any link whose target page or `#anchor` does not exist. CI runs it. It does not cover package
READMEs, and it does not catch markdown that fails to compile; only the build does.

### Previewing Your Changes

Run `pnpm start` from `docs-viewer/` for a dev server with hot reload, or `pnpm build` then
`pnpm preview` for the production build; details in the
[Docs Viewer README](https://github.com/warp-drive-data/warp-drive/blob/main/docs-viewer/README.md).
Once the change is in a pull request, add the existing `:label: doc` label (its name literally
contains `:label:`), or ask a maintainer to if you cannot edit labels on the repo, and a preview of
the whole site, API docs included, is deployed to
`https://canary.warp-drive.io/pr-preview/pr-<number>/` and linked from a comment on the PR.
