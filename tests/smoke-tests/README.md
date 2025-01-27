These packages should not be added to the pnpm-workspace.yaml file.

These are for smoke-tests and ensuring that ember-data/warp-drive's outputs work in real projects.

## Running the Smoke Tests

From the monorepo root:
```bash
bun ./tests/smoke-tests/run.ts dt-types pnpm
```

This will take a while to build everything.
Once things are built, however, you may:
```bash
bun ./tests/smoke-tests/run.ts dt-types pnpm --reuse-tars
```
