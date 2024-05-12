import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

function log(msg) {
  console.log(chalk.grey(msg));
}
function fixed(msg) {
  log(`\t${chalk.blue('[FIXED]')} ${msg}`);
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
      name: pkg.name,
      version,
      workspaceVersion,
    });
  });

  pkgs.forEach((pkg) => cb(pkg, pkgs));
  return pkgs;
}

function processPackage(info) {
  if (!info.pkg['ember-addon']) {
    return;
  }

  log(`Validating ${chalk.yellow(info.name)}`);
  const { fullPkgPath, pkg } = info;
  let edited = false;

  if (info.pkg['ember-addon'].version === 2 && info.pkg['ember-addon'].preventDownleveling) {
    // ensure that @warp-drive/build-config is in dependencies
    if (!pkg.dependencies['@warp-drive/build-config']) {
      fixed(`Added missing dependency @warp-drive/build-config`);
      pkg.dependencies['@warp-drive/build-config'] = info.workspaceVersion;
      edited = true;
    }

    // ensure that @warp-drive/build-config is not in devDependencies
    if (pkg.devDependencies['@warp-drive/build-config']) {
      fixed(`Removed @warp-drive/build-config from devDependencies`);
      delete pkg.devDependencies['@warp-drive/build-config'];
      edited = true;
    }

    // remove @embroider/addon-shim from dependencies
    if (pkg.dependencies['@embroider/addon-shim']) {
      fixed(`Removed @embroider/addon-shim from dependencies`);
      delete pkg.dependencies['@embroider/addon-shim'];
      edited = true;
    }

    if (edited) {
      fs.writeFileSync(fullPkgPath, JSON.stringify(pkg, null, 2) + '\n');
    }

    return;
  }

  // ensure that we are v1
  if (info.pkg['ember-addon'].version !== 1) {
    fixed(`Set ember-addon.version to 1`);
    info.pkg['ember-addon'].version = 1;
    edited = true;
  }

  // ensure that @warp-drive/build-config is in dependencies
  if (!pkg.dependencies['@warp-drive/build-config']) {
    fixed(`Added missing dependency @warp-drive/build-config`);
    pkg.dependencies['@warp-drive/build-config'] = info.workspaceVersion;
    edited = true;
  }

  // ensure that @warp-drive/build-config is not in devDependencies
  if (pkg.devDependencies['@warp-drive/build-config']) {
    fixed(`Removed @warp-drive/build-config from devDependencies`);
    delete pkg.devDependencies['@warp-drive/build-config'];
    edited = true;
  }

  // remove @embroider/addon-shim from dependencies
  if (pkg.dependencies['@embroider/addon-shim']) {
    fixed(`Removed @embroider/addon-shim from dependencies`);
    delete pkg.dependencies['@embroider/addon-shim'];
    edited = true;
  }

  // ensure that ember-auto-import and ember-cli-babel are in dependencies
  if (!pkg.dependencies['ember-auto-import']) {
    fixed(`Added missing dependency ember-auto-import`);
    pkg.dependencies['ember-auto-import'] = '^2.7.2';
    edited = true;
  }
  if (!pkg.dependencies['ember-cli-babel']) {
    fixed(`Added missing dependency ember-cli-babel`);
    pkg.dependencies['ember-cli-babel'] = '^8.2.0';
    edited = true;
  }

  // ensure that ember-auto-import and ember-cli-babel are not in devDependencies
  if (pkg.devDependencies['ember-auto-import']) {
    fixed(`Removed ember-auto-import from devDependencies`);
    delete pkg.devDependencies['ember-auto-import'];
    edited = true;
  }
  if (pkg.devDependencies['ember-cli-babel']) {
    fixed(`Removed ember-cli-babel from devDependencies`);
    delete pkg.devDependencies['ember-cli-babel'];
    edited = true;
  }

  if (edited) {
    fs.writeFileSync(fullPkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
}

walkSync('packages', processPackage);
