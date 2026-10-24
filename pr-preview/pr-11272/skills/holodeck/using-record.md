---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-11272/skills/holodeck/using-record.md
---
# Use RECORD in Holodeck Mocks

Use this skill when a test mocks HTTP with `@warp-drive/holodeck` and you need to re-record one
request, or when you are reviewing a test that sets `RECORD`. `RECORD` is a per-request override.
It is a local tool for refreshing a fixture, not a setting a committed test should carry.

## How recording is decided

Holodeck records or replays according to a build-time flag from `@warp-drive/build-config`.

```ts
const SHOULD_RECORD = Boolean(!CI || IS_RECORDING);
```

A local run records every mock. A run with `CI` set replays every mock from `.mock-cache`. `RECORD`
overrides that for a single mock: it records the request even when the rest of the suite replays.

## Steps

1. Rely on the default first. To change a response, edit the mock and run the suite locally. It
   re-records without any option.
2. Reach for `RECORD` only when one request has to record while the suite replays, for example when
   you run with `CI=1` locally and need a single fixture refreshed.

   ```ts
   await GET(this, 'users/1', () => ({ data: { id: '1', type: 'user' } }), { RECORD: true });
   ```

   `POST`, `PUT`, `PATCH`, `DELETE`, and `HEAD` take the same option. The low-level form is
   `mock(this, generate, true)`.
3. Run the test, then commit the fixture it wrote under `.mock-cache`.
4. Delete `RECORD` from the test before you commit the test.
5. Prove the fixture replays. `CI` is compiled into the test bundle, so set it on the command that
   builds as well as the one that runs.

   ```sh
   CI=1 pnpm build:tests && CI=1 pnpm test
   ```

## Why RECORD must not be committed

A committed `RECORD: true` records that request in every environment, CI included. The request is
never compared against its committed fixture again, so the test passes whatever that fixture says,
and a stale or wrong fixture goes unnoticed. The rest of the suite still replays, which makes the
one exception easy to miss in review.

## Notes

* With `RECORD`, the response generator runs even in replay. Without it, replay never calls the
  generator, which is what makes a replayed suite cheap.
* A test that declares a mock and never requests it fails from `afterEach`, with or
  without `RECORD`.
* Treat `RECORD` in a diff the way you treat a focused or skipped test: ask for it to be removed
  before merge.

## Related

* Full guide: [Recording and Replaying](/guides/the-manual/testing/record-and-replay.md)
* Related skills: [Mock HTTP Requests in Tests](/skills/holodeck/mock-http-requests-in-tests) for the
  helpers that take this option, and [Fetch and Cache Data](/skills/requests/fetch-and-cache-data)
