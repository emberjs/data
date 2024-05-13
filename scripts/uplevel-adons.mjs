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
  if (!info.pkg['ember-addon'] || info.pkg['ember-addon'].version === 2) {
    return;
  }

  log(`Validating ${chalk.yellow(info.name)}`);
  const { fullPkgPath, pkg } = info;

  // ensure that we are v2
  fixed(`Set ember-addon.version to 2`);
  info.pkg['ember-addon'].version = 2;

  // ensure that ember-auto-import and ember-cli-babel are not in dependencies
  if (pkg.dependencies['ember-auto-import']) {
    fixed(`Removed dependency ember-auto-import`);
    delete pkg.dependencies['ember-auto-import'];
  }
  if (pkg.dependencies['ember-cli-babel']) {
    fixed(`Removed dependency ember-cli-babel`);
    delete pkg.dependencies['ember-cli-babel'];
  }

  fs.writeFileSync(fullPkgPath, JSON.stringify(pkg, null, 2) + '\n');
}

walkSync('packages', processPackage);
