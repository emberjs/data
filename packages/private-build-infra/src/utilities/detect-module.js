/* eslint-disable no-console */
const path = require('node:path');
const fs = require('node:fs');

const chalk = require('chalk');

function moduleSurelyExists(modulePath) {
  try {
    fs.statSync(path.join(modulePath, 'package.json'));
    return true;
  } catch {
    return false;
  }
}

function log(str) {
  if (process.env.DEBUG_MODULE_RESOLUTION) {
    console.log(chalk.grey(str));
  }
}

function bustCache(require) {
  Object.keys(require.cache).forEach((key) => {
    if (key.includes('ember-data')) {
      delete require.cache[key];
    }
  });
}

// do our best to detect being present
// Note: when this is not enough, consuming apps may need
// to "hoist" peer-deps or specify us as a direct dependency
// in order to deal with peer-dep bugs in package managers
module.exports = function detectModule(require, moduleName, baseDir, pkg) {
  const pkgName = pkg.name;
  if (moduleName === pkgName) {
    return true;
  }
  const isDeclaredDependency = pkg.dependencies?.[moduleName] || pkg.peerDependencies?.[moduleName];

  if (!isDeclaredDependency) {
    return false;
  }

  log(`\n\n${chalk.yellow(pkgName)} >> ${chalk.cyan(moduleName)} in ${chalk.white(baseDir)}`);

  const expectedLocation = path.join(baseDir, '../../', moduleName);
  if (moduleSurelyExists(expectedLocation)) {
    log(`\t✅ FOUND in Expected Location`);
    return true;
  } else {
    log(`\tMISSING in ${expectedLocation}`);
  }

  bustCache(require);

  try {
    // try default algorithm first
    require.resolve(moduleName);
    log('\t✅ FOUND via normal resolution');
    return true;
  } catch {
    try {
      bustCache(require);
      // package managers have peer-deps bugs where another library
      // bringing a peer-dependency doesn't necessarily result in all
      // versions of the dependent getting the peer-dependency
      //
      // so we resolve from project as well as from our own location
      require.resolve(moduleName, { paths: [baseDir, process.cwd()] });
      log('\t✅ FOUND via custom paths');
      return true;
    } catch {
      try {
        bustCache(require);
        // ember-data brings all packages so if present we are present
        //
        // eslint-disable-next-line n/no-missing-require
        require.resolve('ember-data', { paths: [baseDir, path.join(baseDir, '../'), process.cwd()] });
        log('\t✅ FOUND ember-data');
        return true;
      } catch {
        log('\t🙈 NOT FOUND');
        return false;
      }
    }
  }
};
