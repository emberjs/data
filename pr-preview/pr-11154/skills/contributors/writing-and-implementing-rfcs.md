---
url: /pr-preview/pr-11154/skills/contributors/writing-and-implementing-rfcs.md
---
# Writing and Implementing RFCs

Use this skill when a task requires an RFC — a new public API, a behavior change, or a
deprecation — or when implementing one that has already been accepted.

## When you need an RFC

Not every change needs one. A bug fix, an internal refactor, or an addition that doesn't change
public API or observable behavior does not. If the change adds, changes, or deprecates public API
or behavior, it needs an RFC before implementation begins — see
[The RFC Process](/guides/contributing/rfc-process.md) for the full discussion-and-consensus
workflow leading up to drafting.

## Drafting

WarpDrive-specific RFCs live in [`rfcs/`](/rfcs/index.md) in this repository, which is the
**source of truth** — not `emberjs/rfcs`. Numbering is local to this repo, 1-indexed, independent
of any `emberjs/rfcs` number:

1. Copy `rfcs/0000-template.md` to `rfcs/000N-your-title.md`, where `N` is the next unused number
   (check the existing files in `rfcs/` — don't reuse or skip numbers).
2. Fill in the template's frontmatter and body. The sidebar nav is generated automatically from
   `warp-drive-rfc`/`title`/`stage`/`start-date`, ordered by RFC number — there's no separate list
   to update. Leave `emberjs-rfc`, `emberjs-pr`, `emberjs-branch`, and `sync-hash` blank — the sync
   bot fills these in once the RFC is first mirrored upstream; hand-editing them just gets
   overwritten and can desync the two copies. Don't start `title` with "WarpDrive" — the sync bot
   adds that prefix automatically for the `emberjs/rfcs` copy and its PR title, so a local title
   that already has it would end up doubled there.
3. Open a PR to `warp-drive-data/warp-drive` labeled `:label: rfc`. This label also triggers a
   docs-site PR preview (same as `:label: doc`/`:label: feat`) so reviewers can read the rendered
   RFC, not just the raw markdown diff.
4. Iterate on the PR like any other design discussion. Once there is team consensus to move
   forward, merging the PR is what publishes the RFC — see the next section for what that
   triggers.

## How the `emberjs/rfcs` sync works

WarpDrive still follows Ember's RFC process end to end (Proposed → Exploring → FCP → Accepted →
Ready for Release → Released → Recommended, per
[emberjs/rfcs' own stages](https://github.com/emberjs/rfcs#stages)) — those stages are tracked and
voted on in `emberjs/rfcs`, not here. What changes is *where the text lives and who edits it
first*: this repo, not `emberjs/rfcs`, is authoritative for the content.

A dedicated bot account (see `scripts/rfc-sync/README.md`) maintains its own fork of
`emberjs/rfcs` and does the mirroring, entirely through PRs on both sides — it never has direct
write access to `emberjs/rfcs` itself, and never merges anything:

* **Outbound** (on merge to `main` here): a new RFC (no `emberjs-rfc` set yet) gets a brand-new PR
  opened against `emberjs/rfcs` from the bot's fork; an already-published RFC gets a new commit
  pushed to the same fork branch that already backs its open `emberjs/rfcs` PR. Either way, the
  commit's author is set to whoever actually wrote the change in this repo — the bot only ever
  appears as committer, never author, so credit for the words stays with the person who wrote
  them.
* **Inbound**: the bot polls its own fork branches for commits it didn't make itself — e.g. an
  Ember reviewer applying a suggested edit directly on the PR (this requires "allow edits from
  maintainers", which the bot sets when opening the PR). When it finds one, it opens a PR back
  into `warp-drive-data/warp-drive` with that change, again crediting the real author.
* Nothing is ever auto-merged on either side. Every sync lands as a PR for a human to review.

If you're picking up an RFC that predates the bot (its `emberjs-branch` frontmatter field is
blank), the bot can't sync it until a maintainer points it at the right upstream fork branch, or
lets it open a fresh PR — ask in `#dev-ember-data` if you hit this.

## Implementing an accepted RFC

* Reference the RFC number in your implementation PR's description (e.g. "Implements
  `rfcs/0003-...`"), so reviewers and future readers can find the design discussion.
* Land the implementation behind the same phased/deprecation approach the RFC describes, if it
  describes one — don't skip straight to the end state an RFC called out as a later phase.
* Once landed, `stage` in the RFC's frontmatter (both here and, via the sync bot, upstream)
  advances the same way `emberjs/rfcs` advancement PRs do today — this repo does not add a
  separate advancement mechanism.
