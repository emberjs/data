---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/guides/contributing/writing-documentation/writing-guides.md
description: >-
  How to write a tutorial, concept, or reference guide for the docs site, where
  the files live, and what frontmatter and tags shape the Markdown that coding
  agents read.
---

# Writing Guides

How to write and maintain the [Guides](/guides/), the markdown pages under `guides/`, and the two
sections that share their tooling but not their rules: [Upgrading](/upgrading/) and
[Blog](/blog/).

## Audience

Of the [audiences](./index.md#know-your-audience) ***Warp*Drive**'s documentation serves, guides
are written for the ones still learning: technical evaluators deciding whether it fits, hobbyists
trying it out, and new engineers picking up a codebase that already uses it. Assume no knowledge
of the project's history and none of its concepts until the page introduces them. Existing users
arrive too, usually from a search or an API docs link, so cross-link the concepts a page depends
on rather than re-explaining them.

## Guide Types

Upgrade and migration walkthroughs are not guides; they live in the repo-root `upgrading/`
directory and follow [Upgrading and Blog Pages](#upgrading-and-blog-pages) below.

Guides fall into three types. Keep a single page to a single type; a page that seems to need two
is usually two pages.

### Tutorial

A tutorial walks the reader through building something specific or completing a task. It must
state its prerequisites up front, show complete code at each step, and end with the result the
reader should see. Use it when the reader needs to do something, such as setting up a project or
wiring up their first request. Of the guide audiences, tutorials narrow to hobbyists and new
engineers, who know their own stack but little about ***Warp*Drive**, so every step has to be
runnable as written. Concept and reference guides keep the full guide audience. Tutorials live in
their own top-level [Tutorials](/guides/tutorials/) section (`guides/tutorials/`), above The
Manual, the section holding the concept and reference guides, so a reader can find them without
knowing which concept they cover.

### Concept

A concept guide explains what something is, why it exists, and how it fits with the rest of
***Warp*Drive**. It must define the concept clearly, explain the problem it solves, and cross-link
the related concepts and APIs it mentions. Use it when the reader needs to understand something
before they can make good decisions about using it, such as how the cache or reactivity works.

### Reference

A reference guide organizes the facts about one area so a reader can look something up. It owns
the prose-level facts: which options exist, what values they accept, which rules apply and when.
It leaves signatures and per-member details to the generated [API Docs](/api/) and links to them
rather than restating them. Use it when the reader already knows what they want and needs the
details.

## Where Files Live

Guides are markdown files under `guides/`. Add a new page's slug to the `items` list in its
directory's `_meta.json` so it sorts where you intend; the keys, `draft` behavior, sidebar, and
preview are covered in [How the Docs Site Is Built](./index.md#how-the-docs-site-is-built).

## Frontmatter and Agent-Only Content

Every page is also published as plain Markdown for coding agents and indexed in `llms.txt` (see
[LLM Optimized Documentation](https://warp-drive.io/llm-docs)). Two things in the source affect
what those agents get:

* **`description` in the frontmatter.** The `llms.txt` entry for a page is its title alone unless
  the frontmatter sets `description`, in which case the entry reads
  `- [Title](url): description`. An agent choosing which of 900 pages to fetch has only that line
  to go on, so give every new page a one-sentence `description` that says what a reader can do
  after reading it, and add one to any page you touch that lacks it.
* **`<llm-only>` and `<llm-exclude>` tags.** Content wrapped in `<llm-only>` appears only in the
  Markdown outputs, never on the website; `<llm-exclude>` is the reverse. Use `<llm-only>` for an
  instruction that only makes sense to an agent ("always pair this with the schema from the
  previous section") and `<llm-exclude>` for a screenshot walkthrough or a "click here" aside. Both
  are rare; a page that reads well to a human usually reads well to an agent.

Callouts (`:::tip`) and `:::tabs` reach agents in their raw form, so write the tab labels and
callout titles as if they will be read as plain text.

## Upgrading and Blog Pages

[Upgrading](/upgrading/) and [Blog](/blog/) are different from the rest of the guides: they hold
point-in-time content whose URLs are a permanent contract with readers, not just the current
best explanation of a concept. Follow these rules when adding to either section.

These pages are for existing users. An upgrade guide may presume knowledge of the concepts being
replaced but never of the ones replacing them. A blog post should say near the top who it is for.
LLMs and coding agents also land on these pages, years later and out of order, and will present
whatever they find as current unless the page's version and date say otherwise; that is the
reason for the dating rule below.

### URLs are never renamed or unpublished

Once a page under `upgrading/` or `blog/` is published, its path doesn't change and the page is
never deleted, even after its content is out of date.

If a page's content is fully superseded (a newer major-version guide replaces it, a post is
factually wrong, etc.), don't delete or move it. Instead:

1. Replace its body with a short pointer to the replacement, wrapped in a `:::danger` callout.
   Keep the frontmatter `title` and the `<SinceBadge>` line so the page still says what it was:

   ```md
   :::danger **We've moved!**
   This guide has [moved](/upgrading/v6/index.md)
   :::
   ```

2. Add `draft: true` to its frontmatter. This hides the page from the sidebar and nav while
   leaving it published at its original URL (see
   [Sidebar and `_meta.json`](./index.md#sidebar-and-meta-json)).

### Every page is dated and versioned

Record the ***Warp*Drive**\* version and the date a page was written for near the top of the page,
as a `<SinceBadge>` followed by the date (`YYYY-MM-DD`) it was authored or last meaningfully
revised:

```md
<SinceBadge version="5.0.0" /> &nbsp; authored 2023-06-10
```

This lets a reader who lands on an old search result or bookmark know immediately whether the
page still applies to the version they're using.

### Organize by major version

Each section is sub-divided by major version (`upgrading/v5/`, `blog/v5/`, `upgrading/v6/`, ...).
Within a major version's directory:

* `upgrading/<major>/` holds that version's upgrade guide plus any deprecation or
  feature-specific migration guides written against it.
* `blog/<major>/` holds posts published while that major version was current.

Add new major-version directories to the section's root `_meta.json` `items` list so they sort
in release order rather than alphabetically.
