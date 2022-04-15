/*
  This script generates tarballs for the current state of each package
  in the project, placing them into a cache one level above the project.

  This is useful for being able to test a specific commit against another
  project without publishing the commit to a registry.

  The tarballs produced will reference each other appropriately. For instance
  if `@ember-data/store` has a dependency on `@ember-data/private-build-infra` the
  tarball for `@ember-data/store` will have a package.json file whose version
  of `@ember-data/private-build-infra` is the tarball for the commit for that package.
*/

'use strict';

const fs = require('fs');

const execa = require('execa');
// apparently violates no-extraneous require? /shrug
const debug = require('debug')('test-external');
const chalk = require('chalk');

// we share this for the build
const TarballConfig = require('./-tarball-info').config;
const OurPackages = require('./-tarball-info').PackageInfos;
const insertTarballsToPackageJson = require('./-tarball-info').insertTarballsToPackageJson;

const tarballDir = TarballConfig.tarballDir;

function execWithLog(command, force) {
  debug(chalk.cyan('Executing: ') + chalk.yellow(command));
  if (debug.enabled || force) {
    return execa.sync(command, { stdio: [0, 1, 2], shell: true });
  }

  return execa.sync(command, { shell: true }).stdout;
}

if (!fs.existsSync(TarballConfig.cacheDir)) {
  debug(`Ensuring Cache for Commit Builds at: ${TarballConfig.cacheDir}`);
  fs.mkdirSync(TarballConfig.cacheDir);
} else {
  debug(`Cache for Commit Builds Exists at: ${TarballConfig.cacheDir}`);
}

if (!fs.existsSync(TarballConfig.tarballDir)) {
  debug(`Ensuring Tarball Cache for SHA ${TarballConfig.sha} at: ${TarballConfig.tarballDir}`);
  fs.mkdirSync(TarballConfig.tarballDir);
} else {
  debug(`Tarball Cache Exists for SHA ${TarballConfig.sha} at: ${TarballConfig.tarballDir}`);
}

const AllPackages = Object.keys(OurPackages);
const availablePackages = [];
AllPackages.forEach((packageName) => {
  const pkg = OurPackages[packageName];

  insertTarballsToPackageJson(pkg.fileLocation, {
    fileDestination: pkg.tarballLocation,
    isRelativeTarball: true,
  });

  execWithLog(`
  cd ${tarballDir};
  npm pack ${pkg.location};
    `);

  availablePackages.push(
    chalk.cyan(`"${pkg.packageInfo.name}"`) + chalk.white(': ') + chalk.grey(`"${pkg.reference}"`)
  );

  // cleanup
  fs.writeFileSync(pkg.fileLocation, pkg.originalPackageInfo);
});

console.log(
  chalk.cyan(`Successfully packaged commit ${chalk.white(TarballConfig.sha)}`) +
    '\n\r\n\r' +
    chalk.yellow(`The following packages have been generated:\n\r\t✅ `) +
    chalk.grey(availablePackages.join('\n\r\t✅ ')) +
    '\n\r\n\r' +
    chalk.yellow(`The tarballs for these packages are available within ${chalk.white(tarballDir)}\n\r\n\r`) +
    (!TarballConfig.options.referenceViaVersion && TarballConfig.options.hostPath.indexOf('file:') === 0
      ? chalk.red('⚠️  They may only be used on this machine.')
      : chalk.yellow(
          `⚠️  They can be hosted ${
            !TarballConfig.options.referenceViaVersion
              ? 'only at ' + chalk.white(TarballConfig.options.hostPath)
              : 'on any registry'
          }`
        ))
);
