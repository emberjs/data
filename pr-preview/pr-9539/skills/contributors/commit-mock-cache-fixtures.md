---
url: >-
  https://canary.warp-drive.io/pr-preview/pr-9539/skills/contributors/commit-mock-cache-fixtures.md
---
# Commit Mock Cache Fixtures

Use this skill whenever a change in this repo adds or edits a test that calls
`@warp-drive/holodeck`'s mock helpers (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, or
`mock`), and before you finalize any commit or open a pull request that touches one. The fixtures
those tests record are source code, and a local run will not tell you when you have left them
behind.

## Steps

1. Run `git status` and look for new or modified paths under `**/.mock-cache/`.
2. Stage and commit every fixture that belongs to a test your change added or edited. The fixture
   is part of the change in the same way the test file is.
3. Leave unrelated `.mock-cache` churn alone. Fixtures that changed only because you ran an
   existing suite are pre-existing drift, not yours to fold into this pull request. Say so in the
   pull request instead of committing the noise.
4. Push, and let CI prove the fixtures replay, per
   [Use CI as the Source of Truth](./use-ci-as-the-source-of-truth.md). CI builds with `CI` set,
   so every test replays from `.mock-cache`, and a fixture you forgot to commit fails there as a
   missing mock. A local run without `CI` records whatever it needs and passes regardless, so it
   is not evidence that the fixtures are committed.
5. If you do check replay locally, run `CI=1 pnpm test` from the repository root, where `pnpm test`
   goes through turbo. Never run it from inside a test app's directory. `CI` is compiled into the
   test bundle by `build:tests`, and turbo is what notices the change and rebuilds. Run it in the
   app directory and it reuses the bundle already built in record mode, passes, and re-records the
   fixture you were trying to verify.

## Why a local pass means nothing here

Recording is the default outside CI. The switch lives in
`warp-drive-packages/build-config/src/-private/utils/get-env.ts`:

```ts
const SHOULD_RECORD = Boolean(!CI || IS_RECORDING);
```

So every ordinary local run, including one an agent drives, writes fresh fixtures instead of
validating against the committed ones. It does this silently. A test whose fixture was never
committed goes green on your machine and fails in the first environment that enforces replay,
with `No meta was found for ... You may need to record a mock for this request`.

The directories are hash-named and look like build output, which is the other half of the trap.
`packages/holodeck/server/utils.js` states the rule in a code comment and nowhere else:

> the `.mock-cache` directory should be checked-in to the codebase

Nothing enforces it. There is no lint rule, no CI check, and no gate that fails on a missing
fixture. Treating these paths the way you would treat `dist/` is the single most common way to
ship a test that only works on the machine that wrote it.

## Notes

* Agent sessions are the usual offender, because staging only the files a task explicitly named is
  otherwise good practice.
* Renaming a test or its module changes the test id, which orphans the old fixture directory and
  records a new one. Delete the orphan in the same commit.

## Related

* Full guide: [Recording and Replaying](/guides/the-manual/testing/record-and-replay.md)
* Related skill: [Mock HTTP Requests in Tests](/skills/holodeck/mock-http-requests-in-tests)
