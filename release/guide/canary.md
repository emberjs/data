# Canary Release Guide

## Automated Workflow

The [Release > Canary](../../.github/workflows/release_publish-canary.yml) workflow should be used to publish all new canaries from the [Action Overview](https://github.com/emberjs/data/actions/workflows/release_publish-canary.yml).

This workflow trigger is restricted to project maintainers.

For the first release of a new cycle, manually running this flow with the increment as either `major` or `minor` is required.

Subsequent pre-release versions will be auto-released on a chron schedule.


## Manually Canarying

Ensure you have bun, node and pnpm configured correctly. Volta is preferred for managing
node and pnpm versions. For bun, any `1.x` version should work but minimum version should
ideally match the installed `bun-types` dependency `package.json`.

We always release canary from the `main` branch, though forcing from another branch is possible if required in a last resort.

```ts
bun release publish canary -i <patch|major|minor>
```

Run `bun release help` for additional options.
