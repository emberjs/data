const Library = require('./library');

const moduleNames = ['ember-data', '@ember-data', '@ember/ordered-set', 'ember-inflector'];

module.exports = function parseModules(builtAsset) {
  let modules = builtAsset.split('define(').join('MODULE_SPLIT_POINTdefine(').split('MODULE_SPLIT_POINT');

  modules = modules.filter((mod) => {
    for (let i = 0; i < moduleNames.length; i++) {
      let projectName = moduleNames[i];
      if (mod.indexOf(projectName) === 8) {
        return true;
      }
    }
    return false;
  });

  let library = new Library('EmberData');

  modules.forEach((m) => {
    let end = m.indexOf(',', 8) - 1;
    let name = m.substring(8, end);

    let packageName = 'ember-data';

    if (name.indexOf('@ember-data/') === 0) {
      let subPackageEnd = name.indexOf('/', 12);
      packageName = name.substring(0, subPackageEnd);
    } else if (name.indexOf('ember-inflector') === 0) {
      packageName = 'ember-inflector';
    } else if (name.indexOf('@ember/ordered-set') === 0) {
      packageName = '@ember/ordered-set';
    }

    library.getPackage(packageName).addModule(name, m);
  });

  library.sort();
  return library;
};
