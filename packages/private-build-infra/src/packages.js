'use strict';

const requireEsm = require('esm')(module, { cache: false });

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
  const { default: POSSIBLE_PACKAGES } = requireEsm('@ember-data/private-build-infra/addon/available-packages.ts');
  const flags = {};

  Object.keys(POSSIBLE_PACKAGES).forEach(flag => {
    const packageName = POSSIBLE_PACKAGES[flag];
    let hasPackage = app ? detectPackage(app.project, packageName) : true;

    // console.log(`${flag}=${hasPackage}`);
    flags[flag] = hasPackage;
  });

  return flags;
}

module.exports = getPackages;
