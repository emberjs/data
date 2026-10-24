---
url: https://canary.warp-drive.io/pr-preview/pr-11256/rfcs.md
description: >-
  Find WarpDrive's RFCs, learn how their numbering maps to emberjs/rfcs, and
  start a new RFC by copying the 0000-template.md file.
---

# WarpDrive RFCs

WarpDrive participates in [Ember's RFC process](https://github.com/emberjs/rfcs/), but this
repository is the **source of truth** for WarpDrive-specific RFCs. Drafting, discussion, and
iteration happen here first, as a normal PR against `warp-drive-data/warp-drive`; a copy is
opened in `emberjs/rfcs` once the WarpDrive-side PR merges, and kept in sync in both directions
afterward. See [The RFC Process](/guides/contributing/rfc-process.md) for the full workflow, and
the [Writing and Implementing RFCs](/skills/contributors/writing-and-implementing-rfcs.md) skill
for the mechanics of drafting one.

## Numbering

RFCs here are numbered independently from `emberjs/rfcs`, starting at `0001`. Each RFC's
frontmatter records both numbers once the upstream copy exists:

* `warp-drive-rfc` — this repository's number (also the file's `000N-` prefix)
* `emberjs-rfc` / `emberjs-pr` — the corresponding RFC number and PR in `emberjs/rfcs`, filled in
  after the first sync

## Starting a new RFC

Copy [`0000-template.md`](/rfcs/0000-template.md) to the next available `000N-your-title.md` and
open a PR labeled `:label: rfc`. See the process and skill docs linked above for what happens
next.

The sidebar nav is generated automatically from the `warp-drive-rfc`, `title`, `stage`, and
`start-date` frontmatter on every non-draft file in this directory, ordered by RFC number — there's
no list to keep in sync by hand. Don't start a title with "WarpDrive" (see the template's
frontmatter comments for why), and don't set `draft: true` on an actual RFC — that's reserved for
this template itself, which is why it doesn't show up in the sidebar.
