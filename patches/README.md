# Patch Overview

## @ember/test-helpers @3.3.0

This patch exists because @ember/test-helpers 4.0+ does not support ember-source 3.28.
We install 3.3.0 during our ember-try scenario, and make pnpm happy by installing 3.3.0 all
the time in the root dev-dependencies.

It should be the same as the 4.x patch.
