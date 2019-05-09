'use strict';

function isInstrumentedBuild() {
  return process.env.INSTRUMENT;
}

function wantsEnabledFeatures() {
  return process.env.ENABLE_IN_PROGRESS;
}

function getManuallyEnabledFeatures() {
  let enabled = {};
  let ARGS = process.env.ENABLE_IN_PROGRESS;

  if (ARGS) {
    ARGS.split(',').forEach(function(flag) {
      enabled[flag] = true;
    });
  }

  return enabled;
}

module.exports = {
  isInstrumentedBuild,
  wantsEnabledFeatures,
  getManuallyEnabledFeatures,
};
