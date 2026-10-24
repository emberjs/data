---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11256/skills/contributors/write-a-pr-blog-summary.md
---
# Write a PR Blog Summary

Use this skill whenever you open a pull request against WarpDrive, change what an open PR does,
change its `:dart:` labels, or a reviewer asks for a summary or asks for one to come out. Some PRs
add a short summary file to `.next-release-post/`: a few sentences, written for users, that the
next release blog post is drafted from. This skill decides whether to propose one and writes it.
The rules for the file itself — which changes are usually worth one, how to name it, its
`releases` frontmatter, and what goes in it — live in
[Blog Summaries](/guides/contributing/submitting-prs.md#blog-summaries); read that section before
writing one.

## Steps

1. Decide whether to propose a summary, using the guidance in
   [Blog Summaries](/guides/contributing/submitting-prs.md#blog-summaries): would someone using
   ***Warp*Drive** want to hear about this change in a release post? The changelog label is a
   hint, not the rule: a `:label: feat` or `:label: breaking` PR almost always is, a
   `:label: chore` PR almost never. If you can't tell, ask the user rather than guessing; a
   summary on a routine change crowds the post, and a missing one on a notable change drops it.
   Separately, a PR that adds an RFC under `rfcs/` or changes an RFC's `stage` frontmatter always
   gets an RFC summary, one per RFC, in addition to any summary its other changes need: the post
   lists every RFC opened or advanced in the release. Follow
   [RFC Summaries](/guides/contributing/submitting-prs.md#rfc-summaries) for those files instead of
   steps 4–6; steps 7 and 8 still apply.
2. Defer to review. The PR's reviewer decides whether it keeps a summary: if they ask for one,
   write it; if they ask for it to come out, delete the file; if they ask for changes, make them.
   Mention in the PR description that the PR adds a summary, so the reviewer knows to read it.
3. Gather what a user needs before writing. Read the diff for the public surface it changes —
   exports, options, defaults, types, deprecation IDs — and the guides or API docs the PR adds or
   updates. Those docs pages are what the summary links to. Skip the implementation; the summary
   says what changed for a user, not how.
4. Work out which release lines the change ships on, for the file's `releases` frontmatter. A
   line is the `major.minor` of a branch's root `package.json` version, read on a freshly fetched
   copy of that branch (`git show origin/<branch>:package.json | grep -m1 '"version"'`):

   * always `main`'s line, the minor it is heading for (`5.10.0-alpha.13` gives `"5.10"`);
   * for each `:dart:` label the PR carries or is expected to get, that branch's line:
     `:dart: release` is `release`, `:dart: lts` is the newest `lts-*` branch, `:dart: lts-prev`
     the one before it, and `:dart: beta` is `beta`, which only matters in a cycle that isn't
     mirroring canary.

   For a PR opened directly against a release branch, use that branch's line alone.
5. Look for an existing summary on the same topic before writing a new one. List
   `.next-release-post/` on a freshly fetched `origin/main` and read any file whose name or text
   covers the feature, API, or fix this PR changes — a follow-up fix, a perf pass, or an extension
   of something an earlier PR summarized. Update that file instead of adding a second one, so the
   post tells one story, but only if its `releases` already lists every line from step 4. A
   release post removes its line from each summary it uses, so a missing line means the summary
   has already been announced there, or this PR is being backported where the original wasn't and
   the cherry-pick would find no file to update. Either way, write a new file for this PR instead.
6. Write or update the file to the rules in
   [Blog Summaries](/guides/contributing/submitting-prs.md#blog-summaries). The reader has never
   seen the PR and will meet this text in a blog post next to other PRs' summaries, so:

   * open with the change itself, not with "This PR";
   * write it so it still reads correctly once the PR has shipped: present tense, no "will";
   * for a breaking change, a deprecation, or a removal, say what users must change and link the
     upgrade or deprecation guide;
   * for a performance improvement, name the workload that gets faster and by roughly how much, if
     the PR measured it.

   When updating, rewrite the summary so it describes the topic as it will ship, not as a list of
   changes: fold this PR's change into the existing text, keep the earlier PR's points that still
   hold, and drop any this PR makes untrue. Keep the file's name and its `releases`.
7. Commit it in the same PR as the change. A new file goes directly in that directory, with no
   subdirectory, as `.next-release-post/<PR number>-<topic>.md` using this PR's number, so open
   the PR first (as a draft, per [Submit a PR](./submit-a-pr.md)) and push the file in a commit
   after it. Touch no other summary file than the ones this PR adds or updates, and don't edit
   `README.md`.
8. Keep it current until the PR merges. When you push a change that alters the public behavior the
   summary describes, or its `:dart:` labels change, run steps 1–7 again: rewrite the file to
   match, or add or delete it. If this PR updated an existing summary and no longer needs to,
   restore that file to its text on `main` rather than deleting it. The post is drafted from
   whatever the file says when it merges.

## Example

A PR titled `feat(alien-signals): compose other frameworks' signals into the alien-signals graph`
adds a feature users of more than one framework will want to hear about, so once it's open as
\#11394 it adds `.next-release-post/11394-alien-signals-composition.md`:

```md
---
releases: ["5.10"]
---
Ember and React components on the same page can now share one store. Import
`@warp-drive/alien-signals/install` before each framework's own `install`, and every framework
re-renders when the data it read changes, including when a memo returns a cached value. See
[Using Ember and React on the Same Page](/guides/the-manual/cookbook/multiple-frameworks-on-one-page.md).
```

A later PR titled `perf(alien-signals): gate each memo with one signal per framework` makes the
same feature faster. Neither is backported, so while the summary still lists `"5.10"` the later
PR updates `11394-alien-signals-composition.md`, adding a sentence on what gets faster, instead
of adding a second file. Once the 5.10 post has used the summary, it's gone, and the later PR
adds its own file, `11401-<topic>.md`.

A follow-up titled `chore(ci): replace the docs site root on each deploy` changes nothing a user
sees, so it adds no file.

A PR that adds `rfcs/0006-pointer-and-reference-fields.md` as #11420 adds
`.next-release-post/11420-rfc-pointer-and-reference-fields.md` with `rfc: 6` and
`stages: ["new", "proposed"]`. If a later PR in the same cycle moves its `stage` to `accepted`,
that PR appends `"accepted"` to the same file's `stages` rather than adding a second one.
