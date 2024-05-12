import child_process from 'child_process';
import { globSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const DEBUG = process.env.DEBUG === '*';

export const FixModuleOutputPlugin = {
  name: 'use-weird-non-ESM-ember-convention',

  closeBundle: () => {
    /**
     * Related issues
     * - https://github.com/embroider-build/embroider/issues/1672
     * - https://github.com/embroider-build/embroider/pull/1572
     * - https://github.com/embroider-build/embroider/issues/1675
     *
     * Fixed in embroider@4 and especially @embroider/vite
     */
    const files = globSync('./dist/**/*.mjs');
    if (files.length === 0) {
      DEBUG && console.log('🟡 No MJS files found to rename to JS');
      return;
    }

    for (const file of files) {
      child_process.spawnSync('mv', [file, file.replace(/\.mjs$/, '.js')], { stdio: 'inherit' });
      DEBUG && console.log(`\t⚠️ Renamed MJS module ${file} to JS in a CJS package`);
    }

    // babel ./dist --out-dir dist --plugins=../../config/babel/fix-mjs.js
    const distDir = path.join(process.cwd(), 'dist');
    const babelPlugin = path.join(import.meta.dirname, '../babel/fix-mjs.cjs');
    const args = ['exec', 'babel', distDir, '--out-dir', distDir, '--plugins', babelPlugin];
    child_process.spawnSync('pnpm', args, {
      stdio: 'inherit',
      cwd: import.meta.dirname,
    });
    DEBUG && console.log(`\t⚠️ Fixes ${files.length} files to import/export from .js instead of .mjs`);

    const mapFiles = globSync('./dist/**/*.mjs.map');
    if (mapFiles.length === 0) {
      DEBUG && console.log('🟡 No MJS map files found to rename to JS');
      return;
    }

    for (const file of mapFiles) {
      // replace any .mjs references in the map files to .js
      const map = path.join(process.cwd(), file);
      const mapContent = readFileSync(map, { encoding: 'utf-8' });
      const newContent = mapContent.replaceAll('.mjs', '.js');
      writeFileSync(map, newContent, { encoding: 'utf-8' });

      // rename the map files
      child_process.spawnSync('mv', [file, file.replace(/\.mjs.map$/, '.js.map')], { stdio: 'inherit' });
      DEBUG && console.log(`\t⚠️ Renamed MJS map ${file} to JS in a CJS package`);
    }
  },
};
