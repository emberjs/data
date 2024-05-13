import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import JSONC from 'comment-json';

function log(msg) {
  console.log(chalk.grey(msg));
}
function fixed(msg) {
  log(`\t${chalk.blue('[FIXED]')} ${msg}`);
}
function tsFixed(msg) {
  log(`\t${chalk.green('[FIXED]')} ${msg}`);
}

function getRelativePath(pkgA, pkgB) {
  return path.relative(pkgA.fullPath, pkgB.fullPath);
}

function walkSync(dir, cb, pkgs = new Map()) {
  const fullPath = path.join(process.cwd(), dir);
  fs.readdirSync(fullPath).forEach((dirName) => {
    const relativePath = path.join(dir, dirName);
    const pkgPath = path.join(relativePath, 'package.json');
    const tsConfigPath = path.join(relativePath, 'tsconfig.json');
    const fullPkgPath = path.join(process.cwd(), pkgPath);
    const fullTsConfigPath = path.join(process.cwd(), tsConfigPath);

    if (!fs.existsSync(fullPkgPath)) {
      console.log(chalk.red(`🚨 Missing package.json in ${relativePath}`));
      return;
    }

    const hasTsConfig = fs.existsSync(fullTsConfigPath);
    const pkg = JSON.parse(fs.readFileSync(fullPkgPath, 'utf-8'));
    const version = pkg.version;
    const workspaceVersion = `workspace:${version}`;
    const tsConfig = hasTsConfig ? JSONC.parse(fs.readFileSync(fullTsConfigPath, 'utf-8')) : null;

    pkgs.set(pkg.name, {
      dirName,
      relativePath,
      pkgPath,
      tsConfigPath,
      hasTsConfig,
      fullPath: path.join(fullPath, dirName),
      fullPkgPath,
      fullTsConfigPath,
      pkg,
      tsConfig,
      name: pkg.name,
      version,
      workspaceVersion,
    });
  });

  pkgs.forEach((pkg) => cb(pkg, pkgs));
  return pkgs;
}

function hasReference(srcPkg, info) {
  const referencePath = getRelativePath(srcPkg, info);
  if (!srcPkg.tsConfig.references) {
    return false;
  }
  return srcPkg.tsConfig.references.some((ref) => ref.path === referencePath);
}

function hasPaths(srcPkg, info) {
  if (!srcPkg.tsConfig.compilerOptions.paths) {
    return false;
  }
  const dep = info.name;
  const hasPrimary = !!srcPkg.tsConfig.compilerOptions.paths[dep];
  const hasWildcard = !!srcPkg.tsConfig.compilerOptions.paths[`${dep}/*`];

  return hasPrimary && hasWildcard;
}

function addPaths(srcPkg, info) {
  const typesDir = info.tsConfig.compilerOptions?.declarationDir;

  if (!typesDir) {
    throw new Error(`Missing compilerOptions.declarationDir in ${info.tsConfigPath}`);
  }

  const relativePath = getRelativePath(srcPkg, info);

  srcPkg.tsConfig.compilerOptions.paths[info.name] = [`${relativePath}/${typesDir}`];
  srcPkg.tsConfig.compilerOptions.paths[`${info.name}/*`] = [`${relativePath}/${typesDir}/*`];
}

function processPackage(info, pkgs) {
  log(`Validating ${chalk.yellow(info.name)}`);
  const { fullPkgPath, fullTsConfigPath, pkg } = info;
  let edited = false;
  let tsConfigEdited = false;
  ///////////////////////////////////////////
  // ensure that peers are in devDependencies
  ///////////////////////////////////////////
  if (pkg.peerDependencies) {
    if (!pkg.devDependencies) {
      fixed(`Missing devDependencies hash`);
      pkg.devDependencies = {};
      edited = true;
    }

    for (const [peer, version] of Object.entries(pkg.peerDependencies)) {
      if (!pkg.devDependencies[peer]) {
        const addedVersion = pkgs.has(peer) ? pkgs.get(peer).workspaceVersion : version;
        pkg.devDependencies[peer] = addedVersion;
        edited = true;
        fixed(`Added missing peer ${peer}@${version} to devDependencies @ ${chalk.magenta(addedVersion)}`);
      }
    }
  }
  const tsConfig = info.tsConfig;

  ///////////////////////////////////////////////
  // ensure that all workspace deps are injected
  ///////////////////////////////////////////////
  const injected = new Set();
  Object.keys(pkg.dependencies ?? {}).forEach((dep) => {
    if (pkgs.has(dep)) injected.add(dep);
  });
  Object.keys(pkg.devDependencies ?? {}).forEach((dep) => {
    if (pkgs.has(dep)) injected.add(dep);
  });

  if (injected.size > 0) {
    if (!pkg.dependenciesMeta) {
      fixed(`Added missing dependenciesMeta hash`);
      pkg.dependenciesMeta = {};
      edited = true;
    }

    for (const dep of injected) {
      if (!pkg.dependenciesMeta[dep]) {
        fixed(`Added missing injected: true for ${dep}`);
        pkg.dependenciesMeta[dep] = { injected: true };
        edited = true;
      } else if (!pkg.dependenciesMeta[dep].injected) {
        fixed(`Set injected: true for ${dep}`);
        pkg.dependenciesMeta[dep].injected = true;
        edited = true;
      }

      const relPkg = pkgs.get(dep);

      /////////////////////////////////////////////////////////////////////
      // ensure that the tsconfig.json has the correct paths and references
      /////////////////////////////////////////////////////////////////////
      if (info.hasTsConfig && relPkg.hasTsConfig && relPkg.tsConfig.compilerOptions?.noEmit !== true) {
        if (!tsConfig.references) {
          tsConfig.references = [];
          tsConfigEdited = true;
          tsFixed(`Added references array to tsconfig.json`);
        }

        if (!hasReference(info, relPkg)) {
          const referencePath = getRelativePath(info, relPkg);
          tsConfig.references.push({ path: referencePath });
          tsConfigEdited = true;
          tsFixed(`Added reference to ${referencePath} in tsconfig.json`);
        }

        if (!tsConfig.compilerOptions) {
          tsConfig.compilerOptions = {};
          tsConfigEdited = true;
          tsFixed(`Added compilerOptions hash to tsconfig.json`);
        }

        if (!tsConfig.compilerOptions.paths) {
          tsConfig.compilerOptions.paths = {};
          tsConfigEdited = true;
          tsFixed(`Added paths hash to tsconfig.json`);
        }

        if (!hasPaths(info, relPkg)) {
          addPaths(info, relPkg);
          tsConfigEdited = true;
          tsFixed(`Added paths for ${dep} in tsconfig.json`);
        }
      }
    }
  }

  if (edited) {
    fs.writeFileSync(fullPkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
  if (tsConfigEdited) {
    fs.writeFileSync(fullTsConfigPath, JSONC.stringify(tsConfig, null, 2) + '\n');
  }
}

const pkgs = walkSync('packages', processPackage);

walkSync('tests', processPackage, pkgs);
