/**
 * Syncs the references and paths in the tsconfig.json files
 * of each package in the monorepo and ensures that the
 * tsconfig.json settings and package.json type exports are correct
 * for using composite+references in a monorepo.
 */
import debug from 'debug';
import path from 'path';
import chalk from 'chalk';
import {
  runPrettier,
  walkPackages,
  type ProjectPackage,
  type ProjectPackageWithTsConfig,
  type TsConfigFile,
} from './-utils';

const log = debug('wd:sync-references');

function isCleanRange(range: string) {
  return !range.includes(' ') && !range.includes('||') && !range.includes('>') && !range.includes('<');
}

function cleanupAndGetReferencedPackages(project: ProjectPackage) {
  const packages = new Set<string>();
  const { pkg } = project;
  let edited = false;

  for (const packageName of Object.keys(pkg.dependencies ?? {})) {
    if (project.packages.has(packageName)) {
      packages.add(packageName);
    }
  }

  for (const packageName of Object.keys(pkg.peerDependencies ?? {})) {
    if (project.packages.has(packageName)) {
      packages.add(packageName);
    }
    if (pkg.dependencies?.[packageName]) {
      log(`\t\t🚨 ${project.pkg.name} has ${packageName} in both dependencies and peerDependencies`);
      delete pkg.dependencies[packageName];
      log(`\t\t🔧 Removed ${packageName} from dependencies`);
      edited = true;
    }
    if (!pkg.devDependencies?.[packageName]) {
      log(`\t\t🚨 ${project.pkg.name} has ${packageName} in peerDependencies but not in devDependencies`);
      if (!project.packages.has(packageName) && !isCleanRange(pkg.peerDependencies![packageName])) {
        throw new Error(
          `Unable to fix missing devDependency on PeerDependency ${packageName} as it is not a workspace package and specifies a range.`
        );
      }
      pkg.devDependencies ??= {};
      pkg.devDependencies[packageName] = project.packages.has(packageName)
        ? `workspace:${packageName}`
        : pkg.peerDependencies![packageName];
      log(`\t\t🔧 Added "${packageName}": "${pkg.devDependencies![packageName]}" to devDependencies`);
      edited = true;
    }
  }

  for (const packageName of Object.keys(project.pkg.devDependencies ?? {})) {
    if (project.packages.has(packageName)) {
      packages.add(packageName);
    }
  }

  return { referenced: packages, edited };
}

function getRelativePath(pkgA: ProjectPackage, pkgB: ProjectPackage) {
  return path.relative(pkgA.project.dir, pkgB.project.dir);
}

function hasReference(srcPkg: ProjectPackageWithTsConfig, relPkg: ProjectPackageWithTsConfig) {
  const referencePath = getRelativePath(srcPkg, relPkg);
  if (!srcPkg.tsconfig.references) {
    return false;
  }
  return srcPkg.tsconfig.references.some((ref) => ref.path === referencePath);
}

function hasPaths(srcPkg: ProjectPackageWithTsConfig, relPkg: ProjectPackageWithTsConfig) {
  if (!srcPkg.tsconfig.compilerOptions?.paths) {
    return false;
  }
  const dep = relPkg.pkg.name;
  const hasPrimary = !!srcPkg.tsconfig.compilerOptions.paths[dep];
  const hasWildcard = !!srcPkg.tsconfig.compilerOptions.paths[`${dep}/*`];

  return hasPrimary && hasWildcard;
}

function addPaths(srcPkg: ProjectPackageWithTsConfig, relPkg: ProjectPackageWithTsConfig) {
  const typesDir = relPkg.tsconfig.compilerOptions?.declarationDir;

  if (!typesDir) {
    throw new Error(`Missing compilerOptions.declarationDir in ${relPkg.tsconfigPath}`);
  }

  const relativePath = getRelativePath(srcPkg, relPkg);

  srcPkg.tsconfig.compilerOptions!.paths![relPkg.pkg.name] = [`${relativePath}/${typesDir}`];
  srcPkg.tsconfig.compilerOptions!.paths![`${relPkg.pkg.name}/*`] = [`${relativePath}/${typesDir}/*`];
}

function validateDesiredTsConfigSettings(project: ProjectPackageWithTsConfig) {
  // ensure that the tsconfig.json has the correct settings for our monorepo
  const { tsconfig } = project;
  let { compilerOptions } = tsconfig;
  let edited = false;

  ////////////////////////////
  //  All Projects
  ////////////////////////////
  const BaseDefaults: Exclude<TsConfigFile['compilerOptions'], undefined> = {
    allowImportingTsExtensions: true,
    // we use isolatedDeclarations in some projects, but not all
    // once we use in all set this to false
    // and set isolatedDeclarations to true in the projects
    // allowJs: false,
    // isolatedDeclarations: true,
    // verbatimModuleSyntax: true,
    checkJs: false,
    baseUrl: '.',
    composite: true,
    declaration: true,
    declarationDir: 'unstable-preview-types',
    declarationMap: true,
    emitDeclarationOnly: true,
    erasableSyntaxOnly: true,
    experimentalDecorators: true,
    incremental: true,
    inlineSourceMap: true,
    inlineSources: true,
    lib: ['ESNext'],
    module: 'ESNext',
    moduleDetection: 'force',
    moduleResolution: 'bundler',
    noEmit: undefined,
    pretty: true,
    rootDir: 'src',
    skipLibCheck: true,
    strict: true,
    target: 'ESNext',
  } as const;

  if (!compilerOptions) {
    compilerOptions = tsconfig.compilerOptions = {};
    edited = true;
    log(`\t\t🔧 Added compilerOptions hash to tsconfig.json`);
  }

  const defaultKeys = Object.keys(BaseDefaults) as (keyof typeof BaseDefaults)[];
  for (const key of defaultKeys) {
    const defaultValue = BaseDefaults[key]!;
    if (!(key in compilerOptions)) {
      // @ts-expect-error
      compilerOptions[key] = defaultValue;
      edited = true;
      log(`\t\t🔧 Added "${key}": ${JSON.stringify(defaultValue)} in compilerOptions in tsconfig.json`);
      continue;
    }

    if (typeof defaultValue === 'boolean') {
      if (compilerOptions[key] !== defaultValue) {
        // @ts-expect-error
        compilerOptions[key] = defaultValue;
        edited = true;
        log(`\t\t🔧 Updated "${key}" to ${defaultValue ? 'true' : 'false'} in compilerOptions in tsconfig.json`);
      }
    }

    if (typeof defaultValue === 'undefined') {
      if (compilerOptions[key] !== defaultValue) {
        delete compilerOptions[key];
        edited = true;
        log(`\t\t🔧 Deleted "${key}" from compilerOptions in tsconfig.json`);
      }
    }

    if (typeof defaultValue === 'string') {
      if (compilerOptions[key] !== defaultValue) {
        log(
          `\t\t⚠️ Non-default value "${compilerOptions[key]}" for "${key}" in compilerOptions in tsconfig.json, default is "${defaultValue}"`
        );
      }
    }

    if (Array.isArray(defaultValue)) {
      // TODO probably nothing, but maybe a deep comparison here
      // if (compilerOptions[key] !== defaultValue) {
      //   log(
      //     `\t\t⚠️ Non-default value "${JSON.stringify(compilerOptions[key])}" for "${key}" in compilerOptions in tsconfig.json, default is "${JSON.stringify(
      //       defaultValue
      //     )}"`
      //   );
      // }
    }
  }

  return edited;
}

export async function main() {
  log(
    `\n\t${chalk.gray('=').repeat(60)}\n\t\t${chalk.magentaBright('@warp-drive/')}${chalk.greenBright('internal-tooling')} Sync TypeScript References\n\t${chalk.gray('=').repeat(60)}\n\n\t\t${chalk.gray(`Syncing Project References`)}\n\n`
  );
  let anyFileEdited = false;

  await walkPackages(async (project: ProjectPackage, projects: Map<string, ProjectPackage>) => {
    log(`\t📦 Syncing ${project.pkg.name}`);
    let pkgEdited = false;
    let tsconfigEdited = false;

    const { referenced, edited } = cleanupAndGetReferencedPackages(project);
    pkgEdited = edited;

    /////////////////////////////////////////////////////////////////////
    // ensure that the tsconfig.json has the correct paths and references
    /////////////////////////////////////////////////////////////////////

    if (project.hasTsConfig) {
      const { tsconfig } = project;

      tsconfigEdited = validateDesiredTsConfigSettings(project);

      if (!tsconfig.references) {
        tsconfig.references = [];
        tsconfigEdited = true;
        log(`\t\t🔧 Added references array to tsconfig.json`);
      }

      if (!tsconfig.compilerOptions) {
        tsconfig.compilerOptions = {};
        tsconfigEdited = true;
        log(`\t\t🔧 Added compilerOptions hash to tsconfig.json`);
      }

      if (!tsconfig.compilerOptions.paths) {
        tsconfig.compilerOptions.paths = {};
        tsconfigEdited = true;
        log(`\t\t🔧 Added paths hash to tsconfig.json`);
      }

      if (!project.isTest) {
        if (!project.pkg.files?.includes(tsconfig.compilerOptions!.declarationDir!)) {
          project.pkg.files ??= [];
          project.pkg.files.push(tsconfig.compilerOptions!.declarationDir!);
          pkgEdited = true;
          log(
            `\t\t🔧 Added types output directory "${tsconfig.compilerOptions.declarationDir}" to files in package.json`
          );
        }
      }

      for (const name of referenced) {
        const relProject = projects.get(name);
        if (!relProject) {
          throw new Error(`Unable to find project ${name} in the workspace`);
        }

        // we can only reference projects that emit types
        if (!relProject.hasTsConfig) {
          continue;
        }

        if (relProject.tsconfig.compilerOptions?.noEmit === true) {
          log(`\t\t🚨 ${project.pkg.name} cannot reference ${name} as it does not emit types`);
          continue;
        }

        if (!hasReference(project, relProject)) {
          const referencePath = getRelativePath(project, relProject);
          tsconfig.references!.push({ path: referencePath });
          tsconfigEdited = true;
          log(`\t\t🔧 Added reference to ${referencePath} in tsconfig.json`);
        }

        if (!hasPaths(project, relProject)) {
          addPaths(project, relProject);
          tsconfigEdited = true;
          log(`\t\t🔧 Added paths for ${relProject.pkg.name} in tsconfig.json`);
        }
      }
    }

    if (pkgEdited || tsconfigEdited) {
      anyFileEdited = true;
      await project.save({ pkgEdited, configEdited: tsconfigEdited });
    }
  });

  if (anyFileEdited) await runPrettier();
}
