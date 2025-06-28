import { color, indent, rebalanceLines, write } from '../../shared/utils';

export const About = `

ye<<#>> About

This script automates installation, initial configuration, and updates for
applications built with cy<<WarpDrive>>

===

ye<<##>> When should you run it?

This script should be run to generate the initial project configuration
OR to update all installed WarpDrive libraries to a specific channel or
release version.

In both cases, the script will ensure that all associated peer dependencies
are properly installed.

---

`;

// eslint-disable-next-line @typescript-eslint/require-await
export async function about(): Promise<void> {
  write(indent(rebalanceLines(color(About)), 1));
}
