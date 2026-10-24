---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11219/guides/contributing/rfc-process.md
description: >-
  Propose a WarpDrive feature or deprecation: discuss it on Discord, draft from
  rfcs/0000-template.md, open a PR labeled `:label: rfc`, and shepherd it
  through emberjs/rfcs.
---

### Requesting Features or Deprecations

While WarpDrive is universal in nature, its development is managed by the EmberJS community, and
WarpDrive participates in [Ember's RFC process (GitHub emberjs/rfcs)](https://github.com/emberjs/rfcs/).
Most changes to the public API including new features, changes in behavior, or deprecations require
community discussion and must go through this process.

**This repository is the source of truth for WarpDrive-specific RFCs.** Drafts live in
[`rfcs/`](/rfcs/index.md), iterate as normal PRs against `warp-drive-data/warp-drive`, and a copy
is opened in `emberjs/rfcs` automatically once the draft merges here — kept in sync in both
directions afterward. See the
[Writing and Implementing RFCs](/skills/contributors/writing-and-implementing-rfcs.md) skill for
the full mechanics (frontmatter fields, the sync bot, numbering). This page covers the process
itself.

While there is no guarantee that an RFC will be accepted, successful RFCs typically follow a pattern
of iteration while gathering requirements, addressing feedback, and consensus building. The best RFCs
are narrowly scoped with clear understanding of alternatives, drawbacks, and their effect on the community.

Here are a few suggestions of **steps to take before drafting your RFC** to best make your RFC successful.
Often this process will complete quickly, but when it does not, don't despair! Often the best ideas
take the longest to bake.

1. Bring up your idea on [Discord](https://discord.gg/PHBbnWJx5S) or
   with individual [team members](https://emberjs.com/team/)
2. Reflect on any concerns, alternatives, or questions that arise from these discussions.
3. Continue to discuss the idea, giving time for everyone to digest and think about it.
4. Attend the weekly team meeting to discuss your idea
5. Open an issue in this repo to broaden and record the discussion if the idea needs more time
   for discussion and iteration.
   * announce your issue in `#dev-ember-data` and anywhere else desired such as `#news-and-announcements` and `bluesky`.
6. Draft your RFC in this repo: copy [`rfcs/0000-template.md`](/rfcs/0000-template.md) to the next
   available `rfcs/000N-your-title.md` and share it with those you have been discussing the idea
   with.
7. Publish your RFC by opening a PR to `warp-drive-data/warp-drive` labeled `:label: rfc`
   * announce your PR in `#dev-ember-data` and anywhere else desired such as `#news-and-announcements` and `bluesky`.
8. Attend weekly team meetings to discuss the RFC, continue iterating on the RFC, and help shepherd it to completion.
   Once there's consensus to move forward, merging this PR is what triggers the sync bot to open the
   mirrored PR in `emberjs/rfcs`, which is where the formal Ember RFC stages (Proposed, Exploring,
   Final Comment Period, Accepted, ...) play out — see
   [emberjs/rfcs' own process documentation](https://github.com/emberjs/rfcs#how-it-works) for what
   happens from there. Stage changes and any edits made upstream during review are synced back into
   this repo's copy automatically.
9. Build a proof-of-concept. Sometimes this is best if it occurs alongside drafting the RFC, as it often informs
   the RFC design, known drawbacks, and alternatives. Often it will become incorporated in the final implementation.
10. If you are able, help land the work in a release! It is not required that you implement your own RFC but often
    this is the best way to ensure that accepted RFCs are implemented in a timely manner.
