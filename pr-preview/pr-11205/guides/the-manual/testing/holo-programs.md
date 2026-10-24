---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11205/guides/the-manual/testing/holo-programs.md
---

# HoloPrograms

:::danger Proposed, not implemented
Nothing on this page ships today. The design is under discussion in
[the HoloPrograms RFC](https://github.com/warp-drive-data/warp-drive/pull/11205), and that is the
place to comment on it. Everything on the other pages in this section works now.
:::

Today every test states every response it needs, one mock at a time. That is fine for a test about
one request and tedious for a test about a screen. A **HoloProgram** is planned to be a named set of
simulated API interactions that sets the scene in a single call, so a test can start from a world
rather than from a list of payloads.

A program is planned to be made of three parts:

* **Route handlers**, shared across all programs, that answer requests by reading and updating the
  program's store.
* **A seed**, per program, that sets the store's starting state for each test.
* **Behaviors**, per program and per route, for things a handler should not have to know about,
  such as a slow endpoint or state that changes between two requests.

The RFC also proposes **safety protocols**, which are schemas that check mocks match the real API
and strip sensitive values before anything is written to disk. It also proposes **VCR style
recording**, which records real requests against a real API during development and replays them
afterwards.

Programs are not planned to change replay. A program would run only while recording, and its
requests would be written to `.mock-cache` like any other. The workflow in
[Recording and replaying](./record-and-replay.md) stays the layer underneath.
