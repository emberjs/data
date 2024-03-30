import { PROJECT_ROOT, TARBALL_DIR, toTarballName } from './generate-tarballs';

import { Glob } from 'bun';
import { exec } from '../../../utils/cmd';
import path from 'path';
import fs from 'fs';
import { APPLIED_STRATEGY, Package } from '../../../utils/package';

export async function generateMirrorTarballs(
  config: Map<string, string | number | boolean | null>,
  packages: Map<string, Package>,
  strategy: Map<string, APPLIED_STRATEGY>
) {
  const tarballDir = path.join(TARBALL_DIR, packages.get('root')!.pkgData.version);
  const tmpDir = path.join(PROJECT_ROOT, 'tmp/unpacked', packages.get('root')!.pkgData.version);
  fs.mkdirSync(tmpDir, { recursive: true });

  // for each public package
  // if the package should be mirrored
  // generate a tarball
  //
  // to do this we need to:
  // - unpack the main tarball for the package
  // - replace any references to the original package names with the mirrored package names in every file
  // - pack a new tarball into the tarballs directory
  // - add the tarball path to the package object
  const toReplace = new Map<string, string>();
  const cautionReplace = new Map<string, string>();
  for (const [, strat] of strategy) {
    if (strat.mirrorPublish) {
      if (!strat.name.startsWith('@')) {
        cautionReplace.set(strat.name, strat.mirrorPublishTo);
      } else {
        toReplace.set(strat.name, strat.mirrorPublishTo);
      }
    }
  }

  for (const [, strat] of strategy) {
    if (strat.mirrorPublish) {
      const pkg = packages.get(strat.name)!;
      const mirrorTarballPath = path.join(
        tarballDir,
        `${toTarballName(strat.mirrorPublishTo)}-${pkg.pkgData.version}.tgz`
      );

      // unpack the main tarball for the package
      const mainTarballPath = pkg.tarballPath;
      const unpackedDir = path.join(tmpDir, pkg.pkgData.name);
      const realUnpackedDir = path.join(unpackedDir, 'package');

      fs.mkdirSync(unpackedDir, { recursive: true });
      await exec(`tar -xf ${mainTarballPath} -C ${unpackedDir}`);

      // replace any references to the original package names with the mirrored package names in every file
      // to do this we scan every file in the unpacked directory and do a string replace
      const glob = new Glob('**/*');

      for await (const filePath of glob.scan(realUnpackedDir)) {
        const fullPath = path.join(realUnpackedDir, filePath);
        const file = Bun.file(fullPath);
        const fileData = await file.text();

        let newContents = fileData;
        for (const [from, to] of toReplace) {
          newContents = newContents.replace(new RegExp(from, 'g'), to);
        }
        for (const [from, to] of cautionReplace) {
          newContents = newContents.replace(new RegExp(`'${from}`, 'g'), `'${to}`);
          newContents = newContents.replace(new RegExp(`"${from}`, 'g'), `"${to}`);
        }

        newContents = newContents.replace(new RegExp(`'@ember-data/'`, 'g'), `'@ember-data-mirror/'`);
        newContents = newContents.replace(new RegExp(`"@ember-data/"`, 'g'), `"@ember-data-mirror/"`);

        await Bun.write(fullPath, newContents);
      }

      // fix the volta extends field in package.json
      const packageJsonPath = path.join(realUnpackedDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.volta && packageJson.volta.extends) {
        if (packageJson.name.includes('/')) {
          packageJson.volta.extends = '../../../../../../package.json';
        } else {
          packageJson.volta.extends = '../../../../../package.json';
        }
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      }

      // pack the new package and put it in the tarballs directory
      const result = await exec({
        cwd: realUnpackedDir,
        cmd: `npm pack --pack-destination=${tarballDir}`,
        condense: false,
      });
      console.log(result);

      pkg.mirrorTarballPath = mirrorTarballPath;
    }
  }
}
