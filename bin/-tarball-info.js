'use strict';
/*
  This file generates meta information about what packages
  are included in the project and the tarballs we would produce
  for them were we to pack them using packages-for-commit.

  It exports that meta-information alongside a util helper
  that can be used to insert the locations of our tarballs
  into any package.json

  Example Package Meta:

  Given a project named `data` located in the folder `projects`
   containing a package named `@ember-data/-example`
   located at `projects/data/packages/-example`
   with a `package.json` specifying a version of `3.0.0`

  e.g.

  /projects
    /data
      /packages
        /-example
          /package.json

  We would generate meta looking like the following:

  {
    // the path to the directory for the package
    location: "/path/to/projects/data/packages/-example",

    // the location of the package.json file for the package
    fileLocation: "/path/to/projects/data/packages/some-package-directory/package.json",

    // the directory name of the package
    localName: "-example",

    // the file location a generated tarball for this package would be placed
    tarballLocation: "/path/to/projects/__tarball-cache/ember-data--example-3.0.0.tgz",

    // useful for making edits to add tarball paths to the contents
    packageInfo: <package.json contents as a json object>,

    // useful for restoring original state of a package.json after edits
    originalPackageInfo: <package.json contents as a string>,
  }

  We export this info for all packages from this module as `PackageInfos`

  Additionally, we export a util `insertTarballsToPackageJson(pathToPackageJson)`

  This util will discover any dependencies or devDependencies of the given
  package.json that match the package names of the packges in PackageInfos
  and rewrite the file replacing their version with the file path of the
  tarball we would generate.

  E.g.
  {
    dependencies: {
      "@ember-data/-example": "3.0.0"
    }
  }

  would become:

  {
    dependencies: {
      "@ember-data/-example": "file:/path/to/projects/__tarball-cache/ember-data--example-3.0.0.tgz"
    }
  }
*/

const fs = require('fs');
const path = require('path');
const url = require('url');

const execa = require('execa');
const debug = require('debug')('tarball-info');
const chalk = require('chalk');
const cliArgs = require('command-line-args');

const projectRoot = path.resolve(__dirname, '../');
// we share this for the build
const packagesDir = path.join(projectRoot, './packages');
const packages = fs.readdirSync(packagesDir);
const OurPackages = {};
const CurrentSha = execWithLog(`git rev-parse HEAD`);
const cacheDir = path.join(projectRoot, `../__tarball-cache`);
const tarballDir = path.join(cacheDir, CurrentSha);

const optionsDefinitions = [
  {
    name: 'hostPath',
    alias: 'p',
    type: String,
    defaultValue: `file:${tarballDir}`,
  },
  {
    name: 'referenceViaVersion',
    type: Boolean,
    defaultValue: false,
  },
];
const options = cliArgs(optionsDefinitions, { partial: true });

// ensure we add the trailing slash, otherwise `url.URL` will
// eliminate a directory by accident.
if (options.hostPath.charAt(options.hostPath.length - 1) !== '/') {
  options.hostPath = options.hostPath + '/';
}
if (options.hostPath.charAt(0) === '/') {
  options.hostPath = 'file:' + options.hostPath;
}

function execWithLog(command, force) {
  debug(chalk.cyan('Executing: ') + chalk.yellow(command));
  if (debug.enabled || force) {
    return execa.sync(command, { stdio: [0, 1, 2], shell: true });
  }

  return execa.sync(command, { shell: true }).stdout;
}

function convertPackageNameToTarballName(str) {
  str = str.replace('@', '');
  str = str.replace('/', '-');
  return str;
}

packages.forEach((localName) => {
  const pkgDir = path.join(packagesDir, localName);
  const pkgPath = path.join(pkgDir, 'package.json');
  let pkgInfo;
  try {
    pkgInfo = require(pkgPath);
  } catch (e) {
    return;
  }
  if (pkgInfo.private === true) {
    return;
  }
  const version = `${pkgInfo.version}-sha.${CurrentSha}`;
  const tarballName = `${convertPackageNameToTarballName(pkgInfo.name)}-${version}.tgz`;
  OurPackages[pkgInfo.name] = {
    location: pkgDir,
    fileLocation: pkgPath,
    localName: localName,
    version: version,
    tarballName: tarballName,
    localTarballLocation: path.join(tarballDir, tarballName),
    reference: generatePackageReference(version, tarballName),
    packageInfo: pkgInfo,
    originalPackageInfo: fs.readFileSync(pkgPath),
  };
});

const AllPackages = Object.keys(OurPackages);

function generatePackageReference(version, tarballName) {
  if (options.referenceViaVersion === true) {
    return version;
  }
  if (options.hostPath.indexOf('file:') === 0) {
    return path.join(options.hostPath, tarballName);
  }
  return new url.URL(tarballName, options.hostPath);
}

function insertTarballsToPackageJson(fileLocation, options = {}) {
  // in some flows we have the potential to have previously written
  //  to the package.json already prior to calling this method.
  //  reading it in this way this ensures we get the latest and not
  //  a stale module from require
  const location = require.resolve(fileLocation);
  const pkgInfo = JSON.parse(fs.readFileSync(location, 'utf8'));

  if (options.isRelativeTarball) {
    pkgInfo.version = `${pkgInfo.version}-sha.${CurrentSha}`;
  }

  AllPackages.forEach((packageName) => {
    const pkg = OurPackages[packageName];

    if (pkgInfo.dependencies && pkgInfo.dependencies[packageName] !== undefined) {
      pkgInfo.dependencies[packageName] = pkg.reference;
    } else if (pkgInfo.devDependencies && pkgInfo.devDependencies[packageName] !== undefined) {
      pkgInfo.devDependencies[packageName] = pkg.reference;
    }

    if (!options.isRelativeTarball) {
      const resolutions = (pkgInfo.resolutions = pkgInfo.resolutions || {});
      resolutions[packageName] = pkg.reference;
    }
  });

  fs.writeFileSync(location, JSON.stringify(pkgInfo, null, 2));
}

module.exports = {
  config: {
    sha: CurrentSha,
    cacheDir: cacheDir,
    tarballDir: tarballDir,
    options,
  },
  PackageInfos: OurPackages,
  insertTarballsToPackageJson,
};
