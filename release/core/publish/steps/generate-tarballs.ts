import chalk from 'chalk';
import { exec } from '../../../utils/cmd';
import { APPLIED_STRATEGY, Package } from '../../../utils/package';
import path from 'path';
import fs from 'fs';
import { Glob } from 'bun';

const PROJECT_ROOT = process.cwd();
const TARBALL_DIR = path.join(PROJECT_ROOT, 'tmp/tarballs');

function toTarballName(name: string) {
  return name.replace('@', '').replace('/', '-');
}

/**
 * Iterates the public packages declared in the strategy and
 * generates tarballs in the tmp/tarballs/<root-version> directory.
 *
 * @internal
 */
export async function generatePackageTarballs(
  config: Map<string, string | number | boolean | null>,
  packages: Map<string, Package>,
  strategy: Map<string, APPLIED_STRATEGY>
) {
  // ensure tarball directory exists
  const tarballDir = path.join(TARBALL_DIR, packages.get('root')!.pkgData.version);
  fs.mkdirSync(tarballDir, { recursive: true });

  // first loop executes build steps for each package so that entangled
  // builds always have access to everything they need
  for (const [, pkgStrategy] of strategy) {
    const pkg = packages.get(pkgStrategy.name)!;
    if (pkg.pkgData.private) {
      throw new Error(`Unexpected attempt to publish private package ${pkg.pkgData.name}`);
    }

    try {
      if (pkg.pkgData.scripts?.['prepack']) {
        await exec({ cwd: path.join(PROJECT_ROOT, path.dirname(pkg.filePath)), cmd: `bun run prepack` });
      }
    } catch (e) {
      console.log(`🔴 ${chalk.redBright('failed to execute prepack script for')} ${chalk.yellow(pkg.pkgData.name)}`);
      throw e;
    }
  }

  // second loop cleans up and packs each package
  for (const [, pkgStrategy] of strategy) {
    const pkg = packages.get(pkgStrategy.name)!;

    try {
      await amendFilesForTypesStrategy(pkg, pkgStrategy);
    } catch (e) {
      console.log(`🔴 ${chalk.redBright('failed to amend files to pack for')} ${chalk.yellow(pkg.pkgData.name)}`);
      throw e;
    }

    try {
      const pkgDir = path.join(PROJECT_ROOT, path.dirname(pkg.filePath));
      const tarballPath = path.join(tarballDir, `${toTarballName(pkg.pkgData.name)}-${pkg.pkgData.version}.tgz`);
      pkg.tarballPath = tarballPath;
      await exec({ cwd: pkgDir, cmd: `pnpm pack --pack-destination=${tarballDir}`, condense: true });
    } catch (e) {
      console.log(`🔴 ${chalk.redBright('failed to generate tarball for')} ${chalk.yellow(pkg.pkgData.name)}`);
      throw e;
    } finally {
      // restore state from before amending for types strategy
      await restoreTypesStrategyChanges(pkg, pkgStrategy);
    }
  }

  console.log(
    `✅ ` +
      chalk.cyan(
        `created ${chalk.greenBright(strategy.size)} 📦 tarballs in ${path.relative(PROJECT_ROOT, tarballDir)}`
      )
  );
}

const PotentialTypesDirectories = new Set([
  'unstable-preview-types', // alpha
  'preview-types', // beta
  'types', // stable
]);

function scrubTypesFromExports(pkg: Package) {
  // scrub the package.json of any types fields in exports
  if (pkg.pkgData.exports) {
    // level 1
    for (const [key, value] of Object.entries(pkg.pkgData.exports)) {
      if (key === 'types') {
        delete pkg.pkgData.exports[key];
      } else if (typeof value === 'object') {
        // level 2
        delete value.types;

        for (const [k, v] of Object.entries(value)) {
          if (typeof v === 'object') {
            // level 3
            delete v.types;
          }
        }
      }
    }
  }
}

async function makeTypesPrivate(pkg: Package) {
  // scrub the package.json of any types fields in exports
  scrubTypesFromExports(pkg);

  // remove @warp-drive/core-types from dependencies and peerDependencies
  delete pkg.pkgData.dependencies?.['@warp-drive/core-types'];
  delete pkg.pkgData.peerDependencies?.['@warp-drive/core-types'];

  // deactivate build types command
  if (pkg.pkgData.scripts?.['build:types']) {
    pkg.pkgData.scripts['build:types'] = 'echo "Types are private" && exit 0';
  }

  // and remove any types files from the published package artifacts
  pkg.pkgData.files = pkg.pkgData.files?.filter((f) => {
    return !PotentialTypesDirectories.has(f);
  });
}

async function makeTypesAlpha(pkg: Package) {
  // for alpha types users must explicitly opt-in to using the types
  // by adding a source field to their tsconfig.json
  // so we scrub the package.json of any types fields in exports
  scrubTypesFromExports(pkg);

  // enforce that the correct types directory is present
  const present = new Set(pkg.pkgData.files);
  if (!present.has('unstable-preview-types')) {
    throw new Error(
      `Missing unstable-preview-types directory from published files for ${pkg.pkgData.name}. This package is using an alpha types strategy, and should thus publish an unstable-preview-types directory.`
    );
  }
  if (present.has('preview-types')) {
    throw new Error(
      `Unexpected preview-types directory in published files for ${pkg.pkgData.name}. This package is using an alpha types strategy, and should thus publish an unstable-preview-types directory.`
    );
  }
  if (present.has('types')) {
    throw new Error(
      `Unexpected types directory in published files for ${pkg.pkgData.name}. This package is using an alpha types strategy, and should thus publish an unstable-preview-types directory.`
    );
  }

  // TODO we should probably scan our dist/addon directories for ts/.d.ts files and throw if found.
}

async function makeTypesBeta(pkg: Package) {
  // for beta types users must explicitly opt-in to using the types
  // by adding a source field to their tsconfig.json
  // so we scrub the package.json of any types fields in exports
  scrubTypesFromExports(pkg);

  // enforce that the correct types directory is present
  const present = new Set(pkg.pkgData.files);
  if (!present.has('preview-types')) {
    throw new Error(
      `Missing preview-types directory from published files for ${pkg.pkgData.name}. This package is using a beta types strategy, and should thus publish a preview-types directory.`
    );
  }
  if (present.has('unstable-preview-types')) {
    throw new Error(
      `Unexpected unstable-preview-types directory in published files for ${pkg.pkgData.name}. This package is using a beta types strategy, and should thus publish a preview-types directory.`
    );
  }
  if (present.has('types')) {
    throw new Error(
      `Unexpected types directory in published files for ${pkg.pkgData.name}. This package is using a beta types strategy, and should thus publish a preview-types directory.`
    );
  }

  // TODO we should probably scan our dist/addon directories for ts/.d.ts files and throw if found.
}
async function makeTypesStable(pkg: Package) {
  // for stable, we expect that the types are automatically included
  // so we check to ensure that types are in exports
  if (!pkg.pkgData.exports) {
    throw new Error(
      `Missing exports field in package.json for ${pkg.pkgData.name}. This package is using a stable types strategy, and should thus include a types field in its exports.`
    );
  }
  const value = JSON.stringify(pkg.pkgData.exports);
  if (!value.includes('types')) {
    throw new Error(
      `Missing types field in exports in package.json for ${pkg.pkgData.name}. This package is using a stable types strategy, and should thus include a types field in its exports.`
    );
  }

  const hasInlineTypes = value.includes('./dist/index.d.ts');

  // enforce that the correct types directory is present
  const present = new Set(pkg.pkgData.files);
  if (!present.has('types') && !hasInlineTypes) {
    throw new Error(
      `Missing types directory from published files for ${pkg.pkgData.name}. This package is using a stable types strategy, and should thus publish a types directory.`
    );
  }
  if (present.has('unstable-preview-types')) {
    throw new Error(
      `Unexpected unstable-preview-types directory in published files for ${pkg.pkgData.name}. This package is using a stable types strategy, and should thus publish a types directory.`
    );
  }
  if (present.has('preview-types')) {
    throw new Error(
      `Unexpected preview-types directory in published files for ${pkg.pkgData.name}. This package is using a stable types strategy, and should thus publish a types directory.`
    );
  }
}

async function amendFilesForTypesStrategy(pkg: Package, strategy: APPLIED_STRATEGY) {
  if (pkg.pkgData.scripts?.['prepack']) {
    delete pkg.pkgData.scripts['prepack'];
  }
  switch (strategy.types) {
    case 'private':
      makeTypesPrivate(pkg);
      break;
    case 'alpha':
      makeTypesAlpha(pkg);
      break;
    case 'beta':
      makeTypesBeta(pkg);
      break;
    case 'stable':
      makeTypesStable(pkg);
      break;
  }
  await pkg.file.write(true);
}

async function restoreTypesStrategyChanges(pkg: Package, _strategy: APPLIED_STRATEGY) {
  // restore the package.json to its original state
  await exec({ cmd: `git checkout HEAD -- ${pkg.filePath}`, silent: true });
  await pkg.refresh();
  process.stdout.write(
    `\t\t♻️ ` +
      chalk.grey(
        `Successfully Restored Assets Modified for Types Strategy During Publish in ${chalk.cyan(pkg.pkgData.name)}`
      )
  );
}
