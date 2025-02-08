import { join } from 'path';
import { copyFileSync, mkdirSync } from 'fs';
import { globSync } from '../utils/glob.js';

export function keepAssets({ from, include, dist }) {
  return {
    name: 'copy-assets',

    // the assets go into the output directory in the same relative locations as
    // in the input directory
    async closeBundle() {
      const files = globSync(include, { cwd: join(process.cwd(), from) });
      for (let name of files) {
        const fromPath = join(process.cwd(), from, name);
        const toPath = join(process.cwd(), dist, name);

        mkdirSync(join(toPath, '..'), { recursive: true });
        copyFileSync(fromPath, toPath);
      }
    },
  };
}
