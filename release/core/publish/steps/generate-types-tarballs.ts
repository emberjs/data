import { PROJECT_ROOT, TARBALL_DIR, toTarballName } from './generate-tarballs';

import { exec } from '../../../utils/cmd';
import path from 'path';
import fs from 'fs';
import { APPLIED_STRATEGY, Package } from '../../../utils/package';

const INVALID_FILES = new Set([
  'src',
  'dist',
  'addon',
  'blueprints',
  'dist/docs',
  'addon-test-support',
  'app',
  'index.js',
  'addon-main.js',
  'addon-main.cjs',
]);

export async function generateTypesTarballs(
  config: Map<string, string | number | boolean | null>,
  packages: Map<string, Package>,
  strategy: Map<string, APPLIED_STRATEGY>
) {
  const tarballDir = path.join(TARBALL_DIR, packages.get('root')!.pkgData.version);
  const tmpDir = path.join(PROJECT_ROOT, 'tmp/types', packages.get('root')!.pkgData.version);
  fs.mkdirSync(tmpDir, { recursive: true });

  // for each public package
  // if that package has types
  // generate a types tarball
  //
  // to do this we
  // copy the types directory to a temporary directory
  // create a new package.json

  for (const [, strat] of strategy) {
    if (!strat.typesPublish || strat.private || strat.types === 'private') {
      continue;
    }

    if (strat.types === 'alpha') {
      const tmpTypesDir = path.join(tmpDir, strat.typesPublishTo);
      fs.mkdirSync(tmpTypesDir, { recursive: true });

      // create a new package.json
      const pkg = packages.get(strat.name)!;
      const pkgData = pkg.pkgData;
      const newPkgData = {
        name: strat.typesPublishTo,
        version: pkgData.version,
        files: pkgData.files?.filter((f) => !INVALID_FILES.has(f)) ?? [],
        private: false,
        description: `Type Declarations for ${pkgData.name}`,
        author: pkgData.author,
        license: pkgData.license,
        repository: pkgData.repository,
        // try without any peers first
        // peerDependencies: pkgData.peerDependencies,
        // peerDependenciesMeta: pkgData.peerDependenciesMeta,
      };
      const newPkgJson = path.join(tmpTypesDir, 'package.json');
      fs.writeFileSync(newPkgJson, JSON.stringify(newPkgData, null, 2));

      // // copy the types directory
      // const typesDir = path.join(path.dirname(pkg.filePath), 'unstable-preview-types');
      // if (!fs.existsSync(typesDir)) {
      //   throw new Error(`Types directory does not exist: ${typesDir}`);
      // }
      // const typesDest = path.join(tmpTypesDir, 'unstable-preview-types');
      // fs.mkdirSync(typesDest, { recursive: true });
      // await exec(`cp -r ${typesDir}/* ${typesDest}`);

      // copy files that are needed
      const files = pkgData.files ?? [];
      for (const file of files) {
        const src = path.join(path.dirname(pkg.filePath), file);
        const dest = path.join(tmpTypesDir, file);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        await exec(`cp -r ${src} ${dest}`);
      }

      // create the tarball
      const tarballName = toTarballName(strat.typesPublishTo);
      const tarballPath = path.join(tarballDir, `${tarballName}-${pkg.pkgData.version}.tgz`);
      // pack the new package and put it in the tarballs directory
      const result = await exec({
        cwd: tmpTypesDir,
        cmd: `npm pack --pack-destination=${tarballDir}`,
        condense: false,
      });
      console.log(result);

      // update the package with the tarball path
      pkg.typesTarballPath = tarballPath;
    } else {
      throw new Error(`Oops! Time to upgrade tis script to handled types strategy: ${strat.types}`);
    }
  }
}
