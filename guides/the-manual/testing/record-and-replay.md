---
url: https://canary.warp-drive.io/guides/the-manual/testing/record-and-replay.md
---

# Recording and replaying

Holodeck runs in one of two modes. Recording writes fixtures to disk. Replay serves them back.
Your test code is identical either way, so the mode comes from the environment instead.

## The mode is compiled into the test build

The switch is a build-time flag, `SHOULD_RECORD`, defined in `@warp-drive/build-config` as:

```ts
const SHOULD_RECORD = Boolean(!CI || IS_RECORDING);
```

Recording is on whenever `CI` is unset, which covers every ordinary local run. Setting
`IS_RECORDING` turns recording back on when `CI` is set, which is how you re-record from a CI
environment on purpose.

:::warning The value is baked into the bundle
`SHOULD_RECORD` is inlined when the test bundle is built, not read when the test runs. Setting
`CI` on a command that does not rebuild the bundle changes nothing, and the suite goes on
recording. Set it on the build.
:::

```sh
CI=1 pnpm build:tests
CI=1 pnpm test
```

In this repository, `pnpm test` at the root runs through turbo, and `CI` is one of the inputs
turbo tracks for `build:tests`. Changing it invalidates the cached build, so a single command is
enough.

```sh
CI=1 pnpm test          # from the repository root
```

Run that same command inside a test app's own directory and it skips turbo, reuses whatever
`dist-test/` is already there, and quietly records.

## What lands on disk

The server writes fixtures under `.mock-cache/` in the directory the launching process started
from, which is the test app's own directory.

Each fixture is a directory holding two files.

```
tests/json-api/.mock-cache/
  546c9e3a/                           the test id
    GET::users_1::0/                  method, URL, and request number
      res.meta.json                   status, statusText, headers, method, requestBody
      res.body.br                     the response payload, brotli-compressed
```

The test id is a hash of the module name and the test name. Slashes in the URL become underscores.
The last path segment is the request counter for that method and URL. When the mock matches on a
request body, the file is named after a hash of that body instead of `res`.

Recording is deterministic. Re-recording an unchanged test reproduces the committed files byte for
byte, so any diff under `.mock-cache/` means something in the test or the response really changed.

Two consequences are worth knowing before you go looking for a file.

Renaming a test changes its hash, so the old directory is orphaned and a new one is recorded.
Nothing prunes the old one, and nothing reports it.

A URL with a query string puts that query string in a directory name, `?` included. Windows
forbids `?` in a path, so fixtures for those URLs cannot be checked out on Windows.

## Commit the fixtures

`.mock-cache` is source code. Commit it in the same change as the test that records it.

Committing them is what makes the cache useful. Git manages it, so a branch switch swaps fixtures
and tests together, and a rebase or a CI run does no recording work at all because the files are
already in the tree.

Nothing enforces this. No lint rule looks for it, and no CI check fails when a fixture is missing.
The failure arrives later, as a broken test in the first environment that enforces replay.

## Prove replay works before you push

A local run records what it needs, so a test with no committed fixture passes locally. Build and
run in replay mode to find out whether the fixtures are really there.

```sh
CI=1 pnpm test          # from the repository root
```

Do this after adding or changing any test that mocks a request. It is the only local signal that
tells a fixture you committed apart from one you recorded a moment ago.

## Re-record a changed test

Change the mock, run the suite locally, and holodeck records the new response over the old one.
There is no separate command.

Delete the test's directory under `.mock-cache/` first when you want to be sure nothing stale
survives. Run locally to record it fresh, then run in replay mode to confirm the result.

## Use `RECORD` locally, never in a committed test

Every mock helper takes a `RECORD` option, and `mock` takes the same flag as its third argument. It
is a per-request override. That one request records even while the rest of the suite replays.

```ts
await GET(this, 'users/1', () => ({ data: null }), { RECORD: true });
```

Reach for it when a single fixture needs refreshing during a `CI=1` run, then delete it before you
commit the test. A committed `RECORD: true` records in every environment, CI included, so the
request it covers is never compared against its fixture again and a stale fixture goes unnoticed.
[Use RECORD in Holodeck Mocks](/skills/holodeck/using-record.md) walks through the refresh and
what to look for in review.

Replay never calls a mock's response function, which is what makes a replayed suite cheap. A mock
with `RECORD` is the one exception, because it is recorded rather than replayed.

## Related

* [Writing mocks](./writing-mocks.md) covers declaring the mocks that produce these fixtures.
* [Troubleshooting](./troubleshooting.md) covers what a missing or stale fixture looks like.
