import { color, indent, rebalanceLines } from '../-utils';

export const ABOUT = new Set([
  'about',
  'abt',
  'abut',
  'aboot',
  'abt',
  'describe',
  'desc',
  'dsc',
  'dscr',
  'dscrb',
  'why',
  'y',
  'a',
  'd',
]);

export const About = `ye<<#>> About

This script is used to automate the release process for cy<<EmberData>>.

===

ye<<##>> Who Can Release?

It is intended that this process is run in CI (ENV cy<<CI=true>>);
however, it is able to be run manually as well.

For both CI and locally it is expected that ENV contains a cy<<NODE_AUTH_TOKEN>>
with proper permissions to publish the various packages within the ember-data NPM
organization.

Users (or CI) will also need special permission to push to main, beta, lts, lts-*-*
and release-*-* branches. For CI based triggers, the user triggering MUST have been
given permission to trigger the workflow.

---

ye<<##>> Process Overview

The release process is carried out in a multi-step process, where
each step is capable of being run independently. This allows for
a release to be potentially recoverable in the event of a failure
in one step when prior steps have succeeded.

Releases are governed by a mb<<strategy>>. The strategy is determined by
the mb<<channel>> being released to, the intended version change of the release
(ye<<'major'>>, ye<<'minor'>> or ye<<'patch'>>), and the cy<<./strategy.json>>
file in the publish directory.

Each package follows both a general release strategy based on its maturity
AND a typescript release strategy based on the maturity of its type definitions.

\tye<<###>> Steps

\t[All]
\t1. ensure local branch is clean and sync'd to upstream
\t2. generate release plan
\t  - if not CI, confirm release plan

\t[All but beta/canary]
\t3. generate changelog PR against current branch
\t  - if not CI, leave open change against current branch
\t4. confirm changelog PR merged to current branch
\t  - if not CI, confirm changelog committed and upstream updated
\t5. PR changelog updates to main branch
\t  - if not CI, output warning to do this manually

\t[All]
\t6. bump versions & update referenced versions throughout the project
\t  - if CI, this is triggered automatically by the merge of the changelog PR
\t7. commit and tag version changes, push to upstream
\t8. inter-package dependency and peer-dependency ranges are patched according
\t   to the strategy defined, this is not committed
\t9. packages are patched to remove or rename files according to the typescript
\t   strategy defined, this is not committed.
\t10. prepackage tarballs
\t11. publish tarballs to npm
\t12. reset local state

\t[All but beta/canary]
\t13. generate a github Release with notes

---

`;

export function printAbout(args: string[]) {
  console.log(indent(rebalanceLines(color(About)), 1));
}
