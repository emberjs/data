const path = require('path');
const fs = require('fs');

const stringUtil = require('ember-cli-string-utils');
const pathUtil = require('ember-cli-path-utils');

const { has } = require('@ember/edition-utils');

module.exports = {
  description: 'Generates an ember-data Serializer.',

  availableOptions: [{ name: 'base-class', type: String }],

  root: __dirname,

  filesPath() {
    let hasOctane = has('octane');
    if (hasOctane && process.env.EMBER_EDITION === 'classic') {
      hasOctane = false; //forcible override
    }
    let rootPath = hasOctane ? 'native-files' : 'files';
    return path.join(__dirname, rootPath);
  },

  locals(options) {
    return extendFromApplicationEntity('serializer', 'JSONAPISerializer', options);
  },
};

function extendFromApplicationEntity(type, baseClass, options) {
  let isAddon = options.inRepoAddon || options.project.isEmberCLIAddon();

  let entityName = options.entity.name;
  let relativePath = pathUtil.getRelativePath(options.entity.name);

  if (options.pod && options.podPath) {
    relativePath = pathUtil.getRelativePath(options.podPath + options.entity.name);
  }

  let applicationEntityPath = path.join(options.project.root, 'app', `${type}s`, 'application.js');

  let hasApplicationEntity = fs.existsSync(applicationEntityPath);
  if (!isAddon && !options.baseClass && entityName !== 'application' && hasApplicationEntity) {
    options.baseClass = 'application';
  }

  if (options.baseClass === entityName) {
    throw new Error(
      stringUtil.classify(type) +
        's cannot extend from themself. To resolve this, remove the `--base-class` option or change to a different base-class.'
    );
  }

  let importStatement;

  if (options.baseClass) {
    let baseClassPath = options.baseClass;
    baseClass = stringUtil.classify(baseClassPath.replace('/', '-'));
    baseClass = baseClass + stringUtil.classify(type);

    importStatement = `import ${baseClass} from '${relativePath}${baseClassPath}';`;
  } else {
    let baseClassPath = `@ember-data/${type}`;

    if (baseClass.startsWith('JSONAPI')) {
      baseClassPath += '/json-api';
    }

    if (baseClass.startsWith('REST')) {
      baseClassPath += '/rest';
    }

    importStatement = `import ${baseClass} from '${baseClassPath}';`;
  }

  return {
    importStatement,
    baseClass,
  };
}
