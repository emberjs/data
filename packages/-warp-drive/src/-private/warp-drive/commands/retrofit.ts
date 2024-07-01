import chalk from 'chalk';
import JSONC from 'comment-json';
import fs from 'fs';
import path from 'path';

import { exec, getInfo, getPackageManagerFromLockfile, getTags } from '../../shared/npm';
import type { ParsedFlags } from '../../shared/parse-args';
import { ALL, DefinitelyTyped, Main, Mirror, Types } from '../../shared/the-big-list';
import { getPkgJson, getTypePathFor, write, writePkgJson } from '../../shared/utils';
import { TS_CONFIG } from './default-ts-config';

function assertIsString<T extends string = string>(value: unknown): asserts value is T {
  if (!value || typeof value !== 'string') {
    throw new Error(`Expected value ${value as string} to be a string`);
  }
}

type RetrofitTypes = 'types' | 'mirror';

export async function retrofit(flags: ParsedFlags) {
  const fit = flags.full.get('fit');
  assertIsString<RetrofitTypes>(fit);

  switch (fit) {
    case 'mirror':
      throw new Error('Not Implemented');
    case 'types':
      return await retrofitTypes(flags.full);
    default:
      throw new Error(`Unknown retrofit ${fit as string}`);
  }
}

async function retrofitTypes(flags: Map<string, string | number | boolean | null>) {
  if (!flags.get('monorepo')) {
    return retrofitTypesForProject(flags);
  }

  // get the monorepo packages
  const { getPackageList } = await import('../../shared/repo');
  const { packages, rootDir, rootPackage, pkgManager } = await getPackageList();
  const originalDir = process.cwd();

  for (const pkg of packages) {
    write(`Updating ${chalk.cyan(pkg.packageJson.name)}\n====================\n`);
    process.chdir(pkg.dir);
    await retrofitTypesForProject(flags);
  }

  write(`Updating ${chalk.cyan(rootPackage!.packageJson.name)} (<monoreporoot>)\n====================\n`);
  process.chdir(rootDir);
  await retrofitTypesForProject(flags, { isRoot: true, pkgManager });

  const installCmd = `${pkgManager} install`;
  await exec(installCmd);
  write(`\t✅ Updated lockfile`);

  process.chdir(originalDir);
}

async function retrofitTypesForProject(
  flags: Map<string, string | number | boolean | null>,
  options?: { isRoot: boolean; pkgManager: string }
) {
  const version = flags.get('version');
  assertIsString(version);

  // ensure version exists
  const tags = await getTags('ember-data-types');
  if (!tags.has(version)) {
    throw new Error(`No published types exist for ${version}. You may want to try one of latest|beta|canary`);
  }

  write(`🚀 Retrofitting types to use @${version} using the separate-type-package strategy`);

  // collect installed packages
  const installed = new Map<string, { dev?: true; version: string; isTypes?: boolean; source?: string }>();
  const needed = new Map<string, { dev?: true; version: string; isTypes?: boolean; source?: string }>();
  const pkg = getPkgJson();
  const deps = pkg.dependencies ?? {};
  const devDeps = pkg.devDependencies ?? {};

  Types.forEach((pkgName) => {
    let found = false;
    if (deps[pkgName]) {
      found = true;
      installed.set(pkgName, { version: deps[pkgName], isTypes: true, source: pkgNameFromTypes(pkgName) });
    }
    if (devDeps[pkgName]) {
      if (found) {
        throw new Error(
          `${pkgName} is currently in both <pkg>.dependencies and <pkg>.devDependencies. It should be removed from one of these.`
        );
      }
      installed.set(pkgName, {
        dev: true,
        version: devDeps[pkgName],
        isTypes: true,
        source: pkgNameFromTypes(pkgName),
      });
    }
  });

  // for any main packages installed, we ensure we have the matching types
  // package
  Main.forEach((pkgName) => {
    const typesPkg = getTypesPackageName(pkgName);
    let found = false;
    if (deps[pkgName]) {
      found = true;
      if (typesPkg && !installed.has(typesPkg)) {
        needed.set(typesPkg, { version: deps[pkgName] });
      }
    }
    if (devDeps[pkgName]) {
      if (found) {
        throw new Error(
          `${pkgName} is currently in both <pkg>.dependencies and <pkg>.devDependencies. It should be removed from one of these.`
        );
      }
      if (typesPkg && !installed.has(typesPkg)) {
        needed.set(typesPkg, { dev: true, version: devDeps[pkgName], isTypes: true, source: pkgName });
      }
    }
  });

  // if any mirror packages are installed, we recommend bumping them
  // to match the same types version
  // if (flags.get('mirror')) {
  Mirror.forEach((pkgName) => {
    let found = false;
    if (deps[pkgName]) {
      found = true;
      installed.set(pkgName, { version: deps[pkgName] });
    }
    if (devDeps[pkgName]) {
      if (found) {
        throw new Error(
          `${pkgName} is currently in both <pkg>.dependencies and <pkg>.devDependencies. It should be removed from one of these.`
        );
      }
      installed.set(pkgName, { dev: true, version: devDeps[pkgName] });
    }
  });
  // }

  // get matching version of each installed package
  // from npm based on the dist-tag
  write(`\tGenerating update for ${installed.size} installed dependencies`);
  const seen = new Set<string>();
  const toInstall = new Map<string, { dev?: true; version: string; existing?: true }>();

  for (const [pkgName, available] of installed) {
    seen.add(pkgName);

    const pkgInfo = await getInfo(`${pkgName}@${version}`);
    const mainPkgInfo = available.isTypes ? await getInfo(`${available.source}@${available.version}`) : null;
    if (!pkgInfo) {
      throw new Error(`No published version for ${pkgName}@${version}`);
    }
    if (available.isTypes && !mainPkgInfo) {
      throw new Error(`No published version for ${available.source}@${available.version}`);
    }

    // if the version is the same
    // we don't need to install it
    if (available.version !== pkgInfo.version) {
      toInstall.set(pkgName, { dev: available.dev, version: pkgInfo.version, existing: true });
    }

    // collect deps and peerDeps
    const relatedInfo = mainPkgInfo || pkgInfo;
    let relatedDeps = Object.assign({}, relatedInfo.dependencies, relatedInfo.peerDependencies);

    if (available.isTypes) {
      const mainPkgDeps = relatedDeps;
      relatedDeps = {};

      for (const depName in mainPkgDeps) {
        if (ALL.includes(depName)) {
          const typesPkg = getTypesPackageName(depName);
          if (typesPkg) {
            relatedDeps[typesPkg] = mainPkgDeps[depName];
          }
        }
      }
    }

    for (const depName in relatedDeps) {
      if (!ALL.includes(depName) || seen.has(depName) || installed.has(depName)) {
        continue;
      }
      // don't install optional deps
      if (relatedInfo.peerDependenciesMeta?.[depName]?.optional) {
        continue;
      }

      seen.add(depName);
      const depInfo = await getInfo(`${depName}@${relatedDeps[depName]}`);
      if (!depInfo) {
        throw new Error(`No published version for ${depName}@${relatedDeps[depName]}`);
      }

      toInstall.set(depName, { dev: available.dev, version: depInfo.version });
    }
  }

  // same for needed packages
  write(`\tGenerating update for ${needed.size} missing dependencies`);
  for (const [pkgName, available] of needed) {
    if (seen.has(pkgName)) {
      continue;
    }

    seen.add(pkgName);

    const pkgInfo = await getInfo(`${pkgName}@${version}`);
    const mainPkgInfo = available.isTypes ? await getInfo(`${available.source}@${version}`) : null;
    if (!pkgInfo) {
      throw new Error(`No published version for ${pkgName}@${version}`);
    }
    if (available.isTypes && !mainPkgInfo) {
      throw new Error(`No published version for ${available.source}@${available.version}`);
    }

    toInstall.set(pkgName, { dev: available.dev, version: pkgInfo.version });

    // collect deps and peerDeps
    const relatedInfo = mainPkgInfo || pkgInfo;
    let relatedDeps = Object.assign({}, relatedInfo.dependencies, relatedInfo.peerDependencies);

    if (available.isTypes) {
      const mainPkgDeps = relatedDeps;
      relatedDeps = {};

      for (const depName in mainPkgDeps) {
        const typesPkg = getTypesPackageName(depName);
        if (typesPkg) {
          relatedDeps[typesPkg] = mainPkgDeps[depName];
        }
      }
    }

    for (const depName in relatedDeps) {
      if (!ALL.includes(depName) || seen.has(depName) || needed.has(depName)) {
        continue;
      }
      // don't install optional deps
      if (relatedInfo.peerDependenciesMeta?.[depName]?.optional) {
        continue;
      }

      seen.add(depName);
      const depInfo = await getInfo(`${depName}@${relatedDeps[depName]}`);
      if (!depInfo) {
        throw new Error(`No published version for ${depName}@${relatedDeps[depName]}`);
      }

      toInstall.set(depName, { dev: available.dev, version: depInfo.version });
    }
  }

  // add the packages to the package.json
  // and install them
  write(chalk.grey(`\t📦  Updating versions for ${toInstall.size} packages`));
  if (toInstall.size > 0) {
    // add the packages to the package.json
    for (const [pkgName, config] of toInstall) {
      if (config.dev) {
        pkg.devDependencies = pkg.devDependencies ?? {};
        pkg.devDependencies[pkgName] = config.version;
      } else {
        pkg.dependencies = pkg.dependencies ?? {};
        pkg.dependencies[pkgName] = config.version;
      }
    }

    // resort the package.json
    if (pkg.dependencies) {
      const keys = Object.keys(pkg.dependencies ?? {}).sort();
      const sortedDeps: Record<string, string> = {};
      for (const key of keys) {
        sortedDeps[key] = pkg.dependencies[key];
      }
      pkg.dependencies = sortedDeps;
    }
    if (pkg.devDependencies) {
      const keys = Object.keys(pkg.devDependencies ?? {}).sort();
      const sortedDeps: Record<string, string> = {};
      for (const key of keys) {
        sortedDeps[key] = pkg.devDependencies[key];
      }
      pkg.devDependencies = sortedDeps;
    }
    if (pkg.pnpm?.overrides) {
      const keys = Object.keys(pkg.pnpm.overrides ?? {}).sort();
      const sortedDeps: Record<string, string> = {};
      for (const key of keys) {
        sortedDeps[key] = pkg.pnpm.overrides[key];
      }
      pkg.pnpm.overrides = sortedDeps;
    }
  }

  const overrideChanges = new Set<string>();
  if (pkg.pnpm?.overrides) {
    write(chalk.grey(`\t🔍  Checking for pnpm overrides to update`));
    for (const pkgName of Object.keys(pkg.pnpm.overrides)) {
      if (toInstall.has(pkgName)) {
        const value = pkg.pnpm.overrides[pkgName];
        const info = await getInfo(`${pkgName}@${version}`);
        const newValue = info.version;

        if (value !== newValue) {
          overrideChanges.add(pkgName);
          pkg.pnpm.overrides[pkgName] = newValue;
        }
      }
    }
    write(chalk.grey(`\t✅ Updated ${overrideChanges.size} pnpm overrides`));
  }

  const removed = new Set();
  for (const [pkgName] of DefinitelyTyped) {
    if (deps[pkgName]) {
      removed.add(pkgName);
      delete deps[pkgName];
    }
    if (devDeps[pkgName]) {
      removed.add(pkgName);
      delete devDeps[pkgName];
    }
  }
  write(chalk.grey(`\t🗑  Removing ${removed.size} DefinitelyTyped packages`));

  if (removed.size > 0 || toInstall.size > 0 || overrideChanges.size > 0) {
    writePkgJson(pkg);
    write(`\t✅ Updated package.json`);

    // determine which package manager to use
    // and install the packages
    if (!flags.get('monorepo')) {
      const pkgManager = getPackageManagerFromLockfile();
      const installCmd = `${pkgManager} install`;
      await exec(installCmd);
      write(`\t✅ Updated lockfile`);
    } else {
      write(`\t☑️ Skipped lockfile update`);
    }
  }

  const hasAtLeastOnePackage = toInstall.size > 0 || needed.size > 0 || installed.size > 0;
  if (!hasAtLeastOnePackage) {
    write(`\tNo WarpDrive/EmberData packages detected`);
    return;
  }

  if (options?.isRoot) {
    write(chalk.grey(`\t☑️ Skipped tsconfig.json update for monorepo root`));
    return;
  }

  // ensure tsconfig for each installed and needed package
  const fullTsConfigPath = path.join(process.cwd(), 'tsconfig.json');
  const hasTsConfig = fs.existsSync(fullTsConfigPath);

  if (!hasTsConfig) {
    write(chalk.yellow(`\t⚠️  No tsconfig.json found in the current working directory`));
    const tsConfig = structuredClone(TS_CONFIG) as { compilerOptions: { types: string[] } };
    tsConfig.compilerOptions.types = ['ember-source/types'];
    for (const [pkgName, details] of toInstall) {
      if (Types.includes(pkgName)) {
        const typePath = await getTypePathFor(pkgName, details.version);
        if (!typePath) {
          throw new Error(`Could not find type path for ${pkgName}`);
        }

        tsConfig.compilerOptions.types.push(`./node_modules/${pkgName}/${typePath}`);
      }
    }
    tsConfig.compilerOptions.types.sort();
    fs.writeFileSync(fullTsConfigPath, JSON.stringify(tsConfig, null, 2) + '\n');
    write(chalk.grey(`\t✅  created a tsconfig.json`));
  } else {
    let edited = false;
    const tsConfig = JSONC.parse(fs.readFileSync(fullTsConfigPath, { encoding: 'utf-8' })) as {
      compilerOptions?: { types?: string[] };
    };
    if (!tsConfig.compilerOptions) {
      tsConfig.compilerOptions = { types: [] };
    }
    if (!tsConfig.compilerOptions.types) {
      tsConfig.compilerOptions.types = [];
    }

    if (!tsConfig.compilerOptions.types.includes('ember-source/types')) {
      edited = true;
      tsConfig.compilerOptions.types.push('ember-source/types');
    }

    for (const [pkgName, details] of toInstall) {
      if (Types.includes(pkgName)) {
        const typePath = await getTypePathFor(pkgName, details.version);
        if (!typePath) {
          throw new Error(`Could not find type path for ${pkgName}`);
        }

        const fullTypePath = `./node_modules/${pkgName}/${typePath}`;
        if (!tsConfig.compilerOptions.types.includes(fullTypePath)) {
          edited = true;
          tsConfig.compilerOptions.types.push(fullTypePath);
        }
      }
    }

    if (edited) {
      tsConfig.compilerOptions.types.sort();
      fs.writeFileSync(fullTsConfigPath, JSONC.stringify(tsConfig, null, 2) + '\n');
      write(chalk.grey(`\t✅  updated tsconfig.json`));
    } else {
      write(`\tNo tsconfig updates required!`);
    }
  }
}

function getTypesPackageName(pkgName: string) {
  let typesPkgName: string;

  if (!pkgName.startsWith('@')) {
    typesPkgName = pkgName + '-types';
  } else {
    const parts = pkgName.split('/');
    parts[0] = parts[0] + '-types';
    typesPkgName = parts.join('/');
  }

  if (Types.includes(typesPkgName)) {
    return typesPkgName;
  }

  return null;
}

function pkgNameFromTypes(pkgName: string) {
  let mainPkgName: string;
  if (!pkgName.startsWith('@')) {
    mainPkgName = pkgName.slice(0, pkgName.length - '-types'.length);
  } else {
    const parts = pkgName.split('/');
    parts[0] = parts[0].slice(0, parts[0].length - '-types'.length);
    mainPkgName = parts.join('/');
  }

  if (Main.includes(mainPkgName)) {
    return mainPkgName;
  }

  throw new Error(`Could not find main package for ${pkgName}`);
}
