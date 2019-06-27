'use strict';

function isInstrumentedBuild() {
  return process.argv.includes('--instrument');
}

function wantsEnabledFeatures() {
  return process.argv.includes('--enable-in-progress');
}

function isPackingForPublish() {
  return process.env.IS_EMBER_DATA_RELEASE;
}

function getManuallyEnabledFeatures() {
  let args = process.argv;
  let enabled = {};
  let ARG = '--enable-in-progress-flag';

  for (let i = 0; i < args.length; i++) {
    if (args[i].indexOf(ARG) === 0) {
      let toEnable = args[i].substr(ARG.length + 1).split(',');
      toEnable.forEach(function(flag) {
        enabled[flag] = true;
      });
      break;
    }
  }

  return enabled;
}

module.exports = {
  isInstrumentedBuild,
  wantsEnabledFeatures,
  getManuallyEnabledFeatures,
  isPackingForPublish,
};
