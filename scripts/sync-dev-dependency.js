/**
 * Ensures that the version of a devDependency in root
 * is reflected in individual packages. Hoists any
 * devDependencies not yet in root to root.
 *
 * Usage
 *
 * ```
 * yarn run sync-dev
 * ```
 */

const path = require('path');
const fs = require('fs');

const execa = require('execa');
const debug = require('debug')('sync-dev');
const semver = require('semver');

const projectRoot = path.resolve(__dirname, '../');
const rootJson = path.join(projectRoot, './package.json');
const packagesDir = path.join(projectRoot, './packages');
const packages = fs.readdirSync(packagesDir);

function execWithLog(command) {
  return execa.sync(command, { stdio: [0, 1, 2], shell: true });
}

// Remove this ponyfill once fromEntries is supported in min version of node.js
if (!Object.fromEntries) {
  Object.fromEntries = require('fromentries');
}

// gather deps not yet in root
let rootPackage = require(rootJson);
let rootUpdates = {};
const packageJsons = {};

// Write a json object to file
// Add \n to end of file in accordance with .editorconfig
function writeJsonToFile(path, json) {
  return fs.writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
}

// hoist anything needed to root
packages.forEach((localName) => {
  const pkgDir = path.join(packagesDir, localName);
  const pkgPath = path.join(pkgDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    return;
  }

  const pkg = require(pkgPath);

  // for each package with this devDep, run command
  if (pkg.devDependencies) {
    packageJsons[pkgPath] = pkg;
    const packageNames = Object.keys(pkg.devDependencies);

    packageNames.forEach((name) => {
      debug(`checking devDependency "${name}"`);
      if (!rootPackage.devDependencies[name]) {
        if (
          !rootUpdates[name] ||
          (pkg.devDependencies[name] !== '*' &&
            semver.lt(semver.minVersion(rootUpdates[name]), semver.minVersion(pkg.devDependencies[name])))
        ) {
          rootUpdates[name] = pkg.devDependencies[name];
          debug(`devDependency "${name}" staged for root with version "${rootUpdates[name]}"`);
        } else {
          debug(`devDependency "${name}" was already staged for root with version "${rootUpdates[name]}"`);
        }
      } else {
        debug(`devDependency "${name}" was already in root`);
      }
    });
  }
});

// merge hoisted to root and write
if (Object.keys(rootUpdates).length > 0) {
  // sync deps that need us to find the latest version
  Object.keys(rootUpdates).forEach((packageName) => {
    const version = rootUpdates[packageName];

    if (version === '*') {
      execWithLog(`yarn add ${packageName}@latest --dev -W`);
      delete rootUpdates[packageName];
    }
  });
  // grab latest in case we wrote in the previous step
  delete require.cache[rootJson];
  rootPackage = require(rootJson);

  // Do not hoist devDependencies in @ember-data namespace
  // This is a single pass, so should be faster than spread operator or filter/reduce,
  // especially if fromEntries is supported natiely
  rootUpdates = Object.fromEntries(Object.entries(rootUpdates).filter(([key]) => !key.startsWith('@ember-data/')));

  debug(`Adding staged devDependencies to root: ${JSON.stringify(rootUpdates, null, 2)}`);
  Object.assign(rootPackage.devDependencies, rootUpdates);
  writeJsonToFile(rootJson, rootPackage);
}

// assign root versions to sub-packages and write
Object.keys(packageJsons).forEach((key) => {
  const pkg = packageJsons[key];

  Object.keys(rootPackage.devDependencies).forEach((packageName) => {
    if (pkg.devDependencies[packageName]) {
      pkg.devDependencies[packageName] = rootPackage.devDependencies[packageName];
    }
  });

  writeJsonToFile(key, pkg);
});

execWithLog(`yarn install`);
