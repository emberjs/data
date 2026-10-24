---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11291/skills/contributors/publish-a-blog-post.md
---
# Publish a Blog Post

Use this skill whenever you're adding a post under the repo-root `blog/` directory, starting a new
major-version section of it, or retiring a post that's out of date. The blog holds release
announcements and other point-in-time posts. Release posts are dual-published here from
[blog.emberjs.com](https://blog.emberjs.com/) so that consumers who don't use Ember don't have to
go looking for them there. Every post's URL is a permanent contract with readers, so most of the
rules below exist to keep a post's path, date and version from ever changing under them.

For drafting the prose itself, follow [Write Documentation](./write-documentation.md) as well;
this skill covers where a post goes and how it gets listed. If the post announces a release,
start from [Draft a Release Blog Post](./draft-a-release-blog-post.md), which gathers its content
and says when it has to merge.

## Steps

1. Read [Upgrading and Blog Pages](/guides/contributing/writing-documentation/writing-guides.md#upgrading-and-blog-pages)
   before writing anything. It owns the rules this skill relies on: URLs are never renamed or
   unpublished, every post is dated and versioned, and posts are organized by major version.
2. Put the post at `blog/v<major>/<slug>.md`, where `<major>` is the major version that was
   current when the post is published. Pick the slug as if it can never change, because it
   can't: the URL is also the post's ID in the RSS feed, so renaming it later shows every
   subscriber the post again as new.
3. If `blog/v<major>/` doesn't exist yet, create it with:
   * an `index.md` whose frontmatter has a `title` (`<major>.x`) and a `description`, an H1, one
     sentence of intro, and `<BlogPostList version="<major>" />`, copying `blog/v5/index.md`;
   * a `_meta.json` with the section's `title` and `items: ["index"]`;
   * the directory added to `items` in `blog/_meta.json`, so sections sort in release order, and a
     link to the new section added to the "browse posts by major version" sentence in
     `blog/index.md`.
4. Give the post frontmatter `title`, `description`, and `date` (`YYYY-MM-DD`, the publish date),
   and put the `<SinceBadge>` and date line under the H1, as the guide in step 1 shows. Copy an
   existing post such as `blog/v5/introducing-upgrading-and-blog.md` for the shape. The docs build
   fails on a post without a valid `date`.
5. Add the post's slug to `items` in its directory's `_meta.json`, after the posts already there.
   That only orders the sidebar.
6. Don't add the post to any list by hand. `/blog/`, each `/blog/v<major>/` page and
   `/blog/feed.xml` are all generated from post frontmatter by `blogPosts` in
   `docs-viewer/src/site-utils.ts`, so a post appears in all three, newest first by `date`, as
   soon as it exists and isn't a draft. If a post is missing from them, fix its frontmatter, not
   the listing.
7. To retire a post, follow
   [URLs are never renamed or unpublished](/guides/contributing/writing-documentation/writing-guides.md#urls-are-never-renamed-or-unpublished).
   Its `draft: true` also takes it out of the listings and the feed, while its URL keeps working.
8. Run `pnpm lint:docs` from the repo root, then build the site as
   [Previewing Your Changes](/guides/contributing/writing-documentation/index.md#previewing-your-changes)
   describes and check the post's page, `/blog/` and `/blog/feed.xml`. A post added while
   `pnpm start` is running needs a restart before it shows up in the sidebar.
