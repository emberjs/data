import walkSync from 'walk-sync';
import { readFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { minimatch } from 'minimatch';

export function keepAssets({ from, include }) {
  return {
    name: 'copy-assets',

    // Prior to https://github.com/rollup/rollup/pull/5270, we cannot call this
    // from within `generateBundle`
    buildStart() {
      this.addWatchFile(from);
    },

    // imports of assets should be left alone in the source code. This can cover
    // the case of .css as defined in the embroider v2 addon spec.
    async resolveId(source, importer, options) {
      const resolution = await this.resolve(source, importer, {
        skipSelf: true,
        ...options,
      });
      if (resolution && importer && include.some((pattern) => minimatch(resolution.id, pattern))) {
        return { id: resolve(dirname(importer), source), external: 'relative' };
      }
      return resolution;
    },

    // the assets go into the output directory in the same relative locations as
    // in the input directory
    async generateBundle() {
      for (let name of walkSync(from, {
        globs: include,
        directories: false,
      })) {
        this.emitFile({
          type: 'asset',
          fileName: name,
          source: readFileSync(join(from, name)),
        });
      }
    },
  };
}
