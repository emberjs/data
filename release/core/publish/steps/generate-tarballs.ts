import chalk from 'chalk';
import { exec } from '../../../utils/cmd';
import { APPLIED_STRATEGY, Package } from '../../../utils/package';
import path from 'path';
import fs from 'fs';
import { Glob } from 'bun';

export const PROJECT_ROOT = process.cwd();
export const TARBALL_DIR = path.join(PROJECT_ROOT, 'tmp/tarballs');

export function toTarballName(name: string) {
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

    if (!Array.isArray(pkg.pkgData.files) || pkg.pkgData.files.length === 0) {
      throw new Error(`Unexpected attempt to publish package ${pkg.pkgData.name} with no files`);
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
      await fixVersionsInPackageJson(pkg);
      await amendFilesForTypesStrategy(pkg, pkgStrategy);
    } catch (e) {
      console.log(`🔴 ${chalk.redBright('failed to amend files to pack for')} ${chalk.yellow(pkg.pkgData.name)}`);
      throw e;
    }

    try {
      const pkgDir = path.join(PROJECT_ROOT, path.dirname(pkg.filePath));
      const tarballPath = path.join(tarballDir, `${toTarballName(pkg.pkgData.name)}-${pkg.pkgData.version}.tgz`);
      pkg.tarballPath = tarballPath;
      const result = await exec({ cwd: pkgDir, cmd: `npm pack --pack-destination=${tarballDir}`, condense: false });
      console.log(result);
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

async function fixVersionsInPackageJson(pkg: Package) {
  if (pkg.pkgData.dependencies) {
    Object.keys(pkg.pkgData.dependencies).forEach((dep) => {
      const version = pkg.pkgData.dependencies![dep];
      if (version.startsWith('workspace:')) {
        pkg.pkgData.dependencies![dep] = version.replace('workspace:', '');
      }
    });
  }

  if (pkg.pkgData.devDependencies) {
    Object.keys(pkg.pkgData.devDependencies).forEach((dep) => {
      const version = pkg.pkgData.devDependencies![dep];
      if (version.startsWith('workspace:')) {
        pkg.pkgData.devDependencies![dep] = version.replace('workspace:', '');
      }
    });
  }

  if (pkg.pkgData.peerDependencies) {
    Object.keys(pkg.pkgData.peerDependencies).forEach((dep) => {
      const version = pkg.pkgData.peerDependencies![dep];
      if (version.startsWith('workspace:')) {
        pkg.pkgData.peerDependencies![dep] = version.replace('workspace:', '');
      }
    });
  }

  await pkg.file.write(true);
}

const PotentialTypesDirectories = new Set([
  'unstable-preview-types', // alpha
  'preview-types', // beta
  'types', // stable
]);

/**
 * scrub the package.json of any types fields in exports
 * to support private/alpha/beta types strategies
 *
 * @internal
 */
function scrubTypesFromExports(pkg: Package) {
  // when addon is still V1, we completely remove the exports field
  // to avoid issues with embroider, auto-import and v1 addons
  if (pkg.pkgData['ember-addon']?.version === 1) {
    delete pkg.pkgData.exports;
    return;
  }

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
  scrubTypesFromExports(pkg);

  // deactivate build types command
  if (pkg.pkgData.scripts?.['build:types']) {
    pkg.pkgData.scripts['build:types'] = 'echo "Types are private" && exit 0';
  }

  // and remove any types files from the published package artifacts
  pkg.pkgData.files = pkg.pkgData.files?.filter((f) => {
    return !PotentialTypesDirectories.has(f);
  });
}

// convert each file to a module
// and write it back to the file system
// e.g.
// ```
// declare module '@ember-data/model' {
//   export default class Model {}
// }
// ```
//
// instead of
// ```
// export default class Model {}
// ```
//
// additionally, rewrite each relative import
// to an absolute import
// e.g. if the types for @ember-data/model contain a file with
// the following import statement in the types directory
//
// ```
// import attr from './attr';
// ```
//
// then it becomes
//
// ```
// import attr from '@ember-data/model/attr';
// ```
async function convertFileToModule(fileData: string, relativePath: string, pkgName: string): Promise<string> {
  const lines = fileData.split('\n');
  const maybeModuleName = pkgName + '/' + relativePath.replace(/\.d\.ts$/, '');
  const moduleDir = pkgName + '/' + path.dirname(relativePath);
  const moduleName = maybeModuleName.endsWith('/index') ? maybeModuleName.slice(0, -6) : maybeModuleName;

  for (let i = 0; i < lines.length; i++) {
    lines[i] = lines[i].replace(/^declare /, '').replaceAll(' declare ', ' ');
    const line = lines[i];

    const isDynamicDoubleQuote = line.includes(`import(".`);
    const isDynamicSingleQuote = line.includes(`import('.`);
    if (isDynamicDoubleQuote || isDynamicSingleQuote) {
      const matcher = isDynamicDoubleQuote ? /import\("([^"]+)"\)/ : /import\('([^']+)'\)/;
      const importPath = line.match(matcher)![1];
      const newImportPath = path.join(moduleDir, importPath);
      lines[i] = line.replace(importPath, newImportPath);
    } else if (line.startsWith('import ')) {
      if (!line.includes(`'`)) {
        throw new Error(`Unhandled Import in ${relativePath}`);
      }
      if (line.includes(`'.`)) {
        const importPath = line.match(/'([^']+)'/)![1];
        const newImportPath = path.join(moduleDir, importPath);
        lines[i] = line.replace(importPath, newImportPath);
      }
    }

    // fix re-exports
    else if (line.startsWith('export {') || line.startsWith('export type {')) {
      if (!line.includes('}')) {
        throw new Error(`Unhandled Re-export in ${relativePath}`);
      }
      if (line.includes(`'.`)) {
        const importPath = line.match(/'([^']+)'/)![1];
        const newImportPath = path.join(moduleDir, importPath);
        lines[i] = line.replace(importPath, newImportPath);
      }
    }

    // fix * re-exports
    else if (line.startsWith('export * from')) {
      if (!line.includes(`'`)) {
        throw new Error(`Unhandled Re-export in ${relativePath}`);
      }
      if (line.includes(`'.`)) {
        const importPath = line.match(/'([^']+)'/)![1];
        const newImportPath = path.join(moduleDir, importPath);
        lines[i] = line.replace(importPath, newImportPath);
      }
    }

    // insert 2 spaces at the beginning of each line
    // to account for module wrapper
    if (!lines[i].startsWith('//# sourceMappingURL=')) lines[i] = '  ' + lines[i];
  }

  lines.unshift(`declare module '${moduleName}' {`);
  const srcMapLine = lines.at(-1)!;
  if (!srcMapLine.startsWith('//# sourceMappingURL=')) {
    lines.push('}');
  } else {
    lines.splice(-1, 0, '}');
  }

  const updatedFileData = lines.join('\n');

  return updatedFileData;
}

async function convertTypesToModules(pkg: Package, subdir: 'unstable-preview-types' | 'preview-types' | 'types') {
  const typesDir = path.join(path.dirname(pkg.filePath), subdir);
  const glob = new Glob('**/*.d.ts');

  // we will insert a reference to each file in the index.d.ts
  // so that all modules are available to consumers
  // as soon as the tsconfig sources the types directory
  const references = new Set<string>();

  // convert each file to a module
  for await (const filePath of glob.scan(typesDir)) {
    const fullPath = path.join(typesDir, filePath);
    const file = Bun.file(fullPath);
    const fileData = await file.text();
    const updatedFileData = await convertFileToModule(fileData, filePath, pkg.pkgData.name);

    if (filePath !== 'index.d.ts') {
      references.add(`/// <reference path="./${filePath}" />`);
    }

    await Bun.write(file, updatedFileData);
  }

  // write the references into the index.d.ts
  const indexFile = Bun.file(path.join(typesDir, 'index.d.ts'));
  const exists = await indexFile.exists();
  if (!exists) {
    await Bun.write(indexFile, Array.from(references).join('\n'));
  } else {
    const fileData = await indexFile.text();
    const updatedFileData = Array.from(references).join('\n') + '\n' + fileData;
    await Bun.write(indexFile, updatedFileData);
  }
}

async function makeTypesAlpha(pkg: Package) {
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

  await convertTypesToModules(pkg, 'unstable-preview-types');

  // TODO we should probably scan our dist/addon directories for ts/.d.ts files and throw if found.
}

async function makeTypesBeta(pkg: Package) {
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
      await makeTypesPrivate(pkg);
      break;
    case 'alpha':
      await makeTypesAlpha(pkg);
      break;
    case 'beta':
      await makeTypesBeta(pkg);
      break;
    case 'stable':
      await makeTypesStable(pkg);
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
        `Successfully Restored Assets Modified for Types Strategy During Publish in ${chalk.cyan(pkg.pkgData.name)}\n`
      )
  );
}
