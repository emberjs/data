# Patch Overview

## @ember/test-helpers

We patch in order to support concurrently running tests.

## @ember/test-helpers @3.3.0

This patch exists because @ember/test-helpers 4.0+ does not support ember-source 3.28.
We install 3.3.0 during our ember-try scenario, and make pnpm happy by installing 3.3.0 all
the time in the root dev-dependencies.

It should be the same as the 4.x patch.

## qunit

We patch in order to support disabling the DOM reporter for memory leak investigations.

We patch in order to fix keysOf detection for modern javascript constructs like Proxy.

## testem

We patch in order to keep better track of launchers and to provide more complete information to reporters when a test begins running.
