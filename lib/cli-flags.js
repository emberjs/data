'use strict';

function isInstrumentedBuild() {
  return process.argv.includes('--instrument');
}

function useRecordData() {
  try {
    let currentProjectName = require(`${process.cwd()}/package`);
    if (
      currentProjectName === 'ember-data' &&
      process.argv.includes('--disable-record-data-rfc-build')
    ) {
      return false;
    }
  } catch (e) {
    // swallow any errors for missing package.json in CWD.
  }

  return true;
}

module.exports = {
  isInstrumentedBuild,
  useRecordData,
};
