---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11286/skills/docs/read-the-docs-as-markdown.md
---
# Read the Docs as Markdown

Use this skill whenever you need something from WarpDrive's guides, upgrade notes, or API
reference that no other skill covers: a concept, a config option, a signature, a deprecation.
The published site at `https://warp-drive.io` serves every page as plain Markdown, so you never
have to read or scrape its HTML.

## Steps

1. Fetch `https://warp-drive.io/llms.txt`. It is the table of contents: one absolute link per
   page, grouped by section, with the page title as the link text and, where the page provides
   one, a one-line description after a colon. Pick the one or two pages that match your task and
   fetch only those.
2. Fetch the page. Every link in `llms.txt` already ends in `.md` and returns raw Markdown. To
   reach a page from any other URL you were given, append `.md`:
   `https://warp-drive.io/guides/the-manual/requests/builders` becomes
   `https://warp-drive.io/guides/the-manual/requests/builders.md`. If the URL ends in `/`, drop the slash
   first (`/guides/installation/` becomes `/guides/installation.md`) or append `index.md`; both
   exist.
3. Resolve links inside a page against `https://warp-drive.io`. Cross-references in the Markdown
   are root-relative and already end in `.md`, such as
   `/guides/the-manual/schemas/resources/legacy-mode.md`, so following one is the same fetch with
   no guessing. The `url:` line in each page's opening `---` block is the canonical URL to cite.
4. Read the site's Markdown extensions as what they render to:
   * `:::tip`, `:::info`, `:::warning`, or `:::danger` through the closing `:::` is a callout box.
     Text on the opening line is the box's title.
   * `:::tabs` through `:::` holds alternatives. Each `== Label` line starts one tab. When the
     labels are frameworks or package managers, read only the tab that matches the app you are
     working in.
   * `::: code-group` through `:::` is the same for code: the `[Label]` after each fence's
     language names its tab.
   * Comments like `// [!code focus]` or `// [!code ++]` inside a fence are highlighting hints for
     the website. Ignore them; they are not part of the code.
5. Reach for `https://warp-drive.io/llms-full.txt` only when you need the whole corpus at once. It
   concatenates every page, is a few megabytes, and each page in it opens with the same `---` /
   `url:` block, so you can still tell which page a passage came from. `llms.txt` plus one page is
   almost always enough.

Both `warp-drive.io` and `https://canary.warp-drive.io` are built from the repository's `main`
branch; canary is redeployed on every merge and production on demand, so canary may be newer.
