'use strict';

const requireEsm = require('esm')(module);

function detectPackage(dep, packageName, seen) {
  seen = seen || new Map();
  if (seen.has(dep)) {
    return false;
  }
  seen.set(dep, true);

  if (dep.project.addonPackages[packageName]) {
    return true;
  }
  for (let i = 0; i < dep.project.addons.length; i++) {
    if (detectPackage(dep.project.addons[i], packageName, seen)) {
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
    let hasPackage = app ? detectPackage(app, packageName) : true;

    flags[flag] = hasPackage;
  });

  return flags;
}

module.exports = getPackages;
