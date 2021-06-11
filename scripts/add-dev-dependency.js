/**
 * Adds or updates a dev dependency in root
 * and ensures that all packages that have this
 * dev dependency specify the same version.
 *
 * Usage
 *
 * ```
 * yarn run add-dev <package@version>
 * ```
 */

const path = require('path');
const fs = require('fs');

const execa = require('execa');
const cliArgs = require('command-line-args');
const chalk = require('chalk');

const packageArgDef = [{ name: 'package', defaultOption: true }];
const cliOptions = cliArgs(packageArgDef, { stopAtFirstUnknown: true });

const projectRoot = path.resolve(__dirname, '../');
const packagesDir = path.join(projectRoot, './packages');
const packages = fs.readdirSync(packagesDir);

let [packageName] = cliOptions.package.substr(1).split('@');
packageName = cliOptions.package.charAt(0) + packageName;

function execWithLog(command) {
  return execa.sync(command, { stdio: [0, 1, 2], shell: true });
}

const updatedFiles = [`package.json`];

// run for root
execWithLog(`yarn add ${cliOptions.package} --dev -W`);

// grab all packages
packages.forEach((localName) => {
  const pkgDir = path.join(packagesDir, localName);
  const pkgPath = path.join(pkgDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return;
  }

  const pkg = require(pkgPath);

  // for each package with this devDep, run command
  if (pkg.devDependencies && pkg.devDependencies[packageName]) {
    updatedFiles.push(`packages/${localName}/package.json`);
    execWithLog(`yarn workspace ${pkg.name} add ${cliOptions.package} --dev`);
  }
});

console.log(
  chalk.grey(`Updated The following packages to ${chalk.yellow(cliOptions.package)}\r\n==========\r\n\t✅ `) +
    chalk.cyan(updatedFiles.join(`\r\n\t✅ `))
);
