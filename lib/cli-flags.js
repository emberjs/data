'use strict';

function isInstrumentedBuild() {
  return process.argv.includes('--instrument');
}

module.exports = {
  isInstrumentedBuild,
};
