'use strict';

function isInstrumentedBuild() {
  return process.env.INSTRUMENT;
}

function wantsEnabledFeatures() {
  return process.env.ENABLE_IN_PROGRESS;
}

function isPackingForPublish() {
  return process.env.IS_EMBER_DATA_RELEASE;
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
  isPackingForPublish,
};
