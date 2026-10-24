---
url: >-
  /pr-preview/pr-11154/guides/contributing/writing-documentation/writing-permanent-content.md
---

# Writing Permanent Content

[Upgrading](/upgrading/) and [Blog](/blog/) are different from the rest of the guides: they hold
point-in-time content whose URLs are a permanent contract with readers, not just the current
best explanation of a concept. Follow these rules when adding to either section.

## URLs are never renamed or unpublished

Once a page under `upgrading/` or `blog/` is published, its path doesn't change and the page is
never deleted, even after its content is out of date.

If a page's content is fully superseded (a newer major-version guide replaces it, a post is
factually wrong, etc.), don't delete or move it. Instead:

1. Replace its body with a short pointer to the replacement, wrapped in a `:::danger` callout,
   e.g.:

   ```md
   ---
   draft: true
   ---

   :::danger **We've moved!**
   This guide has [moved](/upgrading/v6/index.md)
   :::
   ```

2. Set `draft: true` in its frontmatter. This hides the page from the sidebar and nav (so it
   doesn't clutter navigation for current readers) while leaving the page itself published at its
   original URL — unlike the rest of the guides, content here is **not** removed by the
   sync step just because it's marked `draft`.

## Every page is dated and versioned

Record the ***Warp*Drive**\* version (and the date) a page was written for, usually as a
`<SinceBadge version="X.Y.Z" />` near the top of the page next to the date it was authored or
last meaningfully revised. This lets a reader who lands on an old search result or bookmark know
immediately whether the page still applies to the version they're using.

## Organize by major version

Each section is sub-divided by major version (`upgrading/v5/`, `blog/v5/`, `upgrading/v6/`, ...).
Within a major version's directory:

* `upgrading/<major>/` holds that version's upgrade guide plus any deprecation or
  feature-specific migration guides written against it.
* `blog/<major>/` holds posts published while that major version was current.

Add new major-version directories to the section's root `_meta.json` `items` list so they sort
in release order rather than alphabetically.
