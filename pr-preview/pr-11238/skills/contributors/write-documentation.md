---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11238/skills/contributors/write-documentation.md
---
# Write Documentation

Use this skill whenever you're writing or changing documentation in this repo: a doc comment
(TSDoc), a guide, an `upgrading/` or `blog/` page, a package README or `src/index.md`, or one of
these agent skills. The human contributor guides under
[Writing Documentation](/guides/contributing/writing-documentation/index.md) are the source of
truth for *what* good documentation looks like here; this skill is only about *how* to produce it
with the person you're working with. It links to those guides rather than restating them, because
a copied rule goes stale silently and gets followed confidently, while a link that goes stale
fails the link checker and gets fixed.

## Steps

For a one-line fix (a typo, a dead link, a wrong version number), skip to step 6 and run only its
last two bullets: the checks and the label.

1. Pick the type of doc first. A request like "document X" rarely means one file. Use
   [Which Type of Doc Should I Write?](/guides/contributing/writing-documentation/index.md#which-type-of-doc-should-i-write)
   to decide whether X needs TSDoc, a guide, a permanent-URL page, a README, or several of those,
   and confirm that split with the user before drafting anything. If the answer is an RFC, this
   isn't the skill for it: switch to [Writing and Implementing RFCs](./writing-and-implementing-rfcs.md).
2. Read the guide for that type of doc before you write a word, and treat it as binding:

   | Type of doc | Read |
   | --- | --- |
   | TSDoc comments | [Writing API Docs](/guides/contributing/writing-documentation/writing-api-docs.md) |
   | A package `README.md` or its `src/index.md` landing page | [READMEs and `src/index.md`](/guides/contributing/writing-documentation/writing-api-docs.md#readmes-and-src-index-md) |
   | Pages under `guides/`, including tutorials in `guides/tutorials/` | [Writing Guides](/guides/contributing/writing-documentation/writing-guides.md) |
   | Pages under `upgrading/` or `blog/` | [Upgrading and Blog Pages](/guides/contributing/writing-documentation/writing-guides.md#upgrading-and-blog-pages) |
   | Files under `warp-drive-packages/memory-alpha/skills/` | [Writing Agent Skills](/guides/contributing/writing-documentation/writing-agent-skills.md) |

   Those pages own the rules on tags, links and examples, audiences, nav metadata, and permanent
   URLs. Don't paraphrase them from memory; if a rule matters to your task, go read the sentence.
3. Gather context before drafting. The person asking knows things the source can't tell you.
   Ask, in a few short rounds rather than one wall of questions, and skip anything the type of
   doc makes moot. Steps 1 and 3, and agreeing the headings in step 4, can be a single round.
   * Who is this for? Use
     [Know Your Audience](/guides/contributing/writing-documentation/index.md#know-your-audience)
     as the menu; the guide for this type of doc narrows it further.
   * What should the reader be able to do after reading it that they couldn't before?
   * Which version does it apply to? The guide section for this type of doc says where that goes.
   * Is this the recommended way, a legacy way, or a deprecated way? The guide for this type of
     doc says how to mark each.
   * What already exists? Search `guides/`, `upgrading/`, and the relevant `src/` for the concept
     before writing a competing explanation; extend or link the existing one instead.
4. Draft one section at a time, not the whole thing at once. Agree on the headings first (for
   TSDoc, on which symbols get a summary, an example, and links), scaffold them with placeholders,
   then fill each section and stop for feedback before moving to the next. Make edits surgically
   in place rather than reprinting the document. Ask the user to describe what to change instead
   of editing the draft themselves, so their preferences carry into the sections you haven't
   written yet. Link the guide or symbol that owns a concept instead of re-explaining it.
5. Reader-test before you call it done. Hand the finished text, and only the text (for TSDoc, the
   comment together with the signature it documents), to one fresh agent instance per audience
   the guide for this type of doc names, each with none of your conversation, run in parallel.
   The guide's first-named audience is the primary one: fix whatever that reader gets wrong or
   has to guess at, and fix a secondary reader's gap only when the fix is cheap, usually a link,
   so the page does not drift toward nobody. If you can't spawn agents, ask the user to paste each
   whole prompt, text included, into a fresh session and relay the answers. Each prompt has three
   parts, and the first is the one that is easy to skip:
   * Tell the agent who it is. Name its audience using one of the bold labels in
     [Know Your Audience](/guides/contributing/writing-documentation/index.md#know-your-audience),
     and say what that reader already knows and does not: an existing user reading API docs knows
     the project's vocabulary but not the concept behind the thing this page documents; a hobbyist
     reading a tutorial knows their own stack and nothing about ***Warp*Drive**. Without this the
     agent judges every unexplained term as a gap, or none of them, and either answer is noise.
   * Give it three to five questions that reader would bring to the text. For API docs, a
     package's `src/index.md` landing page included, the question is always some form of "how do
     I use this?"; if the answer requires opening the source, the doc is missing an example or a
     link. For a README, ask whether the reader would install the package and what they would type
     first. For a guide, ask what prior knowledge it assumes and whether that matches the audience
     you named. For an `upgrading/` or `blog/` page, ask which version the page is written for and
     whether a reader on a different version can tell.
   * Ask it to say, for each answer, whether it came from the text, needed a guess, or could not
     be answered, and to list the terms it did not know. Judge that list against the audience you
     named, not against zero knowledge; a term the audience is assumed to know is not a gap.
6. Check, preview, then hand off:
   * For API docs, every item in
     [Content Standards](/guides/contributing/writing-documentation/writing-api-docs.md#content-standards),
     including a `@summary` on each exported symbol or `@module` comment you add or touch that
     owns an API page (not on class members), since it is that page's only `llms.txt`
     description, per
     [Give Each API Page a `@summary`](/guides/contributing/writing-documentation/writing-api-docs.md#give-each-api-page-a-summary),
     and nothing private left in the published docs per
     [Ignored Doc Comments](/guides/contributing/writing-documentation/writing-api-docs.md#ignored-doc-comments).
     If you added `@internal` to an exported symbol, build that package (`pnpm --filter <pkg>
     build:pkg`); a `MISSING_EXPORT` error means another package imports it and it needs a
     different fix.
   * Every other type of doc a change touches is updated too: see the
     [Cross-Documentation Checklist](/guides/contributing/writing-documentation/index.md#cross-documentation-checklist).
     When that means moving prose out of a README, remove only the sections the other page now
     owns. The README keeps everything
     [README structure](/guides/contributing/writing-documentation/writing-api-docs.md#readme-structure)
     lists: its introduction and, for a legacy package, the alert naming the replacement; the
     install line and one elevator-pitch snippet, which the landing page is meant to repeat in
     more depth; and every branding block, the tagline and the `♥️ Credits` block with its style
     tag.
     [Keep READMEs short](/guides/contributing/writing-documentation/writing-api-docs.md#keep-readmes-short)
     says why.
   * Run `pnpm lint:docs` from the repo root, then build and open the affected pages as described
     in [Previewing Your Changes](/guides/contributing/writing-documentation/index.md#previewing-your-changes).
   * Label the pull request `:label: doc` (see
     [Changelog Labels](/guides/contributing/submitting-prs.md#changelog-labels)); Previewing
     Your Changes says what that label deploys.

## Gotchas

The first three are explained in the
[Docs Viewer README](https://github.com/warp-drive-data/warp-drive/blob/main/docs-viewer/README.md).

* A page added while `pnpm start` is running is served but missing from the sidebar until you
  restart the server.
* `pnpm lint:docs` does not check package READMEs; open those on GitHub.
* A bare `<thing>` in prose fails the build, and `lint:docs` won't warn you. Use code spans.
* `@internal` also strips the declaration from the package's `.d.ts`, so it breaks any other
  package that imports the symbol. See
  [Ignored Doc Comments](/guides/contributing/writing-documentation/writing-api-docs.md#ignored-doc-comments).
