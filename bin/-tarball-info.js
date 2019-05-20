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

/* eslint-disable no-console, node/no-extraneous-require, node/no-unpublished-require */
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../');
// we share this for the build
const tarballDir = '../../__tarball-cache';
const packagesDir = path.join(projectRoot, './packages');
const packages = fs.readdirSync(packagesDir);
const OurPackages = {};

function convertPackageNameToTarballName(str) {
  str = str.replace('@', '');
  str = str.replace('/', '-');
  return str;
}

packages.forEach(localName => {
  const pkgDir = path.join(packagesDir, localName);
  const pkgPath = path.join(pkgDir, 'package.json');
  const pkgInfo = require(pkgPath);
  const tarballName = `${convertPackageNameToTarballName(pkgInfo.name)}-${pkgInfo.version}.tgz`;
  OurPackages[pkgInfo.name] = {
    location: pkgDir,
    fileLocation: pkgPath,
    localName: localName,
    tarballLocation: path.join(tarballDir, tarballName),
    packageInfo: pkgInfo,
    originalPackageInfo: fs.readFileSync(pkgPath),
  };
});

const AllPackages = Object.keys(OurPackages);

function insertTarballsToPackageJson(fileLocation) {
  const pkgInfo = require(fileLocation);
  AllPackages.forEach(packageName => {
    const pkg = OurPackages[packageName];
    if (pkgInfo.dependencies && pkgInfo.dependencies[packageName] !== undefined) {
      pkgInfo.dependencies[packageName] = `file:${pkg.tarballLocation}`;
    } else if (pkgInfo.devDependencies && pkgInfo.devDependencies[packageName] !== undefined) {
      pkgInfo.devDependencies[packageName] = `file:${pkg.tarballLocation}`;
    }
  });
  fs.writeFileSync(fileLocation, JSON.stringify(pkgInfo, null, 2));
}

module.exports = {
  PackageInfos: OurPackages,
  insertTarballsToPackageJson,
};
