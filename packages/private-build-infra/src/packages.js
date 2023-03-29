'use strict';

const requireModule = require('./utilities/require-module');

function detectPackage(dep, packageName, seen) {
  let isFirst = !seen;
  seen = seen || new Map();
  if (seen.has(dep)) {
    return false;
  }
  seen.set(dep, true);

  if (isFirst) {
    if (dep.name() === packageName) {
      return true;
    }
  } else if (dep.name === packageName) {
    return true;
  }

  if (!dep.addonPackages) {
    return false;
  }

  if (dep.addonPackages[packageName]) {
    return true;
  }
  for (let i = 0; i < dep.addons.length; i++) {
    if (detectPackage(dep.addons[i], packageName, seen)) {
      return true;
    }
  }
  return false;
}

function getPackages(app) {
  const { default: POSSIBLE_PACKAGES } = requireModule('@ember-data/private-build-infra/virtual-packages/packages.js');
  const flags = {};
  const excludeDebugInProduction =
    app && app.options && app.options.emberData && app.options.emberData.includeDataAdapterInProduction === false;
  const isProduction = process.env.EMBER_ENV === 'production';

  Object.keys(POSSIBLE_PACKAGES).forEach((flag) => {
    const packageName = POSSIBLE_PACKAGES[flag];

    if (packageName === '@ember-data/debug' && isProduction && excludeDebugInProduction) {
      flags[flag] = false;
    } else {
      let hasPackage = app ? detectPackage(app.project, packageName) : true;
      // console.log(`${flag}=${hasPackage}`);
      flags[flag] = hasPackage;
    }
  });

  return flags;
}

module.exports = getPackages;
