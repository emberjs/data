#!/usr/bin/env node

/*
  This script generates tarballs for the current state of each package
  in the project, placing them into a cache one level above the project.

  This is useful for being able to test a specific commit against another
  project without publishing the commit to a registry.

  The tarballs produced will reference each other appropriately. For instance
  if `@ember-data/store` has a dependency on `@ember-data/-build-infra` the
  tarball for `@ember-data/store` will have a package.json file whose version
  of `@ember-data/-build-infra` is the tarball for the commit for that package.
*/

'use strict';
/* eslint-disable no-console, node/no-extraneous-require, node/no-unpublished-require */
const fs = require('fs');
const path = require('path');
const { shellSync } = require('execa');
// apparently violates no-extraneous require? /shrug
const debug = require('debug')('test-external');
const chalk = require('chalk');

const projectRoot = path.resolve(__dirname, '../');
// we share this for the build
const tarballDir = path.join(projectRoot, '../__tarball-cache');
const OurPackages = require('./-tarball-info').PackageInfos;
const insertTarballsToPackageJson = require('./-tarball-info').insertTarballsToPackageJson;

function execWithLog(command, force) {
  debug(chalk.cyan('Executing: ') + chalk.yellow(command));
  if (debug.enabled || force) {
    return shellSync(command, { stdio: [0, 1, 2] });
  }

  return shellSync(command);
}

if (!fs.existsSync(tarballDir)) {
  debug(`Ensuring Tarball Cache at: ${tarballDir}`);
  fs.mkdirSync(tarballDir);
} else {
  debug(`Tarball Cache Exists at: ${tarballDir}`);
}

const AllPackages = Object.keys(OurPackages);
AllPackages.forEach(packageName => {
  const pkg = OurPackages[packageName];

  insertTarballsToPackageJson(pkg.fileLocation);

  execWithLog(`
  cd ${tarballDir};
  npm pack ${pkg.location}
    `);

  // cleanup
  fs.writeFileSync(pkg.fileLocation, pkg.originalPackageInfo);
});
