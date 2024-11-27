const path = require('path');
const EOL = require('os').EOL;

const { has } = require('@ember/edition-utils');

const inflection = require('inflection');
const stringUtils = require('ember-cli-string-utils');

module.exports = {
  description: 'Generates an ember-data Model.',

  anonymousOptions: ['name', 'attr:type'],

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
    let attrs = [];
    let needs = [];
    let entityOptions = options.entity.options;
    let includeHasMany = false;
    let includeBelongsTo = false;
    let includeAttr = false;

    for (let name in entityOptions) {
      let type = entityOptions[name] || '';
      let foreignModel = name;
      if (type.indexOf(':') > -1) {
        foreignModel = type.split(':')[1];
        type = type.split(':')[0];
      }
      let dasherizedName = stringUtils.dasherize(name);
      let camelizedName = stringUtils.camelize(name);
      let dasherizedType = stringUtils.dasherize(type);
      let dasherizedForeignModel = stringUtils.dasherize(foreignModel);
      let dasherizedForeignModelSingular = inflection.singularize(dasherizedForeignModel);

      let attr;
      if (/has-many/.test(dasherizedType)) {
        includeHasMany = true;
        let camelizedNamePlural = inflection.pluralize(camelizedName);
        attr = {
          name: dasherizedForeignModelSingular,
          type: dasherizedType,
          propertyName: camelizedNamePlural,
        };
      } else if (/belongs-to/.test(dasherizedType)) {
        includeBelongsTo = true;
        attr = {
          name: dasherizedForeignModel,
          type: dasherizedType,
          propertyName: camelizedName,
        };
      } else {
        includeAttr = true;
        attr = {
          name: dasherizedName,
          type: dasherizedType,
          propertyName: camelizedName,
        };
      }
      attrs.push(attr);

      if (/has-many|belongs-to/.test(dasherizedType)) {
        needs.push("'model:" + dasherizedForeignModelSingular + "'");
      }
    }

    if (attrs.length) {
      let attrTransformer, attrSeparator;

      let hasOctane = has('octane');
      if (hasOctane && process.env.EMBER_EDITION === 'classic') {
        hasOctane = false; //forcible override
      }
      if (hasOctane) {
        attrTransformer = nativeAttr;
        attrSeparator = ';';
      } else {
        attrTransformer = classicAttr;
        attrSeparator = ',';
      }

      attrs = attrs.map(attrTransformer);
      attrs = '  ' + attrs.join(attrSeparator + EOL + '  ');
      if (hasOctane) {
        attrs = attrs + attrSeparator;
      }
    }

    let needsDeduplicated = needs.filter(function (need, i) {
      return needs.indexOf(need) === i;
    });
    needs = '  needs: [' + needsDeduplicated.join(', ') + ']';

    let importedModules = [];
    if (includeAttr) {
      importedModules.push('attr');
    }
    if (includeBelongsTo) {
      importedModules.push('belongsTo');
    }
    if (includeHasMany) {
      importedModules.push('hasMany');
    }
    importedModules = importedModules.join(', ');

    return {
      importedModules,
      attrs,
      needs,
    };
  },
}

function nativeAttr(attr) {
  let name = attr.name,
    type = attr.type,
    propertyName = attr.propertyName,
    result;

  if (type === 'belongs-to') {
    result = "@belongsTo('" + name + "', { async: false, inverse: null })";
  } else if (type === 'has-many') {
    result = "@hasMany('" + name + "', { async: false, inverse: null })";
  } else if (type === '') {
    result = '@attr';
  } else {
    result = "@attr('" + type + "')";
  }
  return result + ' ' + propertyName;
}

function classicAttr(attr) {
  let name = attr.name,
    type = attr.type,
    propertyName = attr.propertyName,
    result;

  if (type === 'belongs-to') {
    result = "belongsTo('" + name + "', { async: false, inverse: null })";
  } else if (type === 'has-many') {
    result = "hasMany('" + name + "', { async: false, inverse: null })";
  } else if (type === '') {
    //"If you don't specify the type of the attribute, it will be whatever was provided by the server"
    //https://emberjs.com/guides/models/defining-models/
    result = 'attr()';
  } else {
    result = "attr('" + type + "')";
  }
  return propertyName + ': ' + result;
}


