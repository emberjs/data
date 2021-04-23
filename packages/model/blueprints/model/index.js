const EOL = require('os').EOL;

const inflection = require('inflection');
const stringUtils = require('ember-cli-string-utils');
const useEditionDetector = require('@ember-data/private-build-infra/src/utilities/edition-detector');
const { has } = require('@ember/edition-utils');

module.exports = useEditionDetector({
  description: 'Generates an ember-data model.',

  anonymousOptions: ['name', 'attr:type'],

  root: __dirname,

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
});

function nativeAttr(attr) {
  let name = attr.name,
    type = attr.type,
    propertyName = attr.propertyName,
    result;

  if (type === 'belongs-to') {
    if (name === propertyName) {
      result = '@belongsTo';
    } else {
      result = "@belongsTo('" + name + "')";
    }
  } else if (type === 'has-many') {
    if (inflection.pluralize(name) === propertyName) {
      result = '@hasMany';
    } else {
      result = "@hasMany('" + name + "')";
    }
  } else if (type === '') {
    result = '@attr()';
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
    result = "belongsTo('" + name + "')";
  } else if (type === 'has-many') {
    result = "hasMany('" + name + "')";
  } else if (type === '') {
    //"If you don't specify the type of the attribute, it will be whatever was provided by the server"
    //https://emberjs.com/guides/models/defining-models/
    result = 'attr()';
  } else {
    result = "attr('" + type + "')";
  }
  return propertyName + ': ' + result;
}
