const inflection = require('inflection');
const stringUtils = require('ember-cli-string-utils');
const EOL = require('os').EOL;
const isModuleUnificationProject = require('../../lib/utilities/module-unification')
  .isModuleUnificationProject;
const path = require('path');
const useEditionDetector = require('../edition-detector');

module.exports = useEditionDetector({
  description: 'Generates an ember-data model.',

  anonymousOptions: ['name', 'attr:type'],

  fileMapTokens(options) {
    if (isModuleUnificationProject(this.project)) {
      return {
        __root__() {
          return 'src';
        },
        __path__(options) {
          return path.join('data', 'models', options.dasherizedModuleName);
        },
        __name__() {
          return 'model';
        },
      };
    }
  },

  locals(options) {
    let attrs = [];
    let needs = [];
    let entityOptions = options.entity.options;

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
        let camelizedNamePlural = inflection.pluralize(camelizedName);
        attr = {
          name: dasherizedForeignModelSingular,
          type: dasherizedType,
          propertyName: camelizedNamePlural,
        };
      } else if (/belongs-to/.test(dasherizedType)) {
        attr = {
          name: dasherizedForeignModel,
          type: dasherizedType,
          propertyName: camelizedName,
        };
      } else {
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
      let isOctane = process.env.EMBER_VERSION === 'OCTANE';

      let attrTransformer, attrSeparator;
      if (isOctane) {
        attrTransformer = nativeAttr;
        attrSeparator = ';';
      } else {
        attrTransformer = classicAttr;
        attrSeparator = ',';
      }

      attrs = attrs.map(attrTransformer);
      attrs = '  ' + attrs.join(attrSeparator + EOL + '  ');
      if (isOctane) {
        attrs = attrs + attrSeparator;
      }
    }

    let needsDeduplicated = needs.filter(function(need, i) {
      return needs.indexOf(need) === i;
    });
    needs = '  needs: [' + needsDeduplicated.join(', ') + ']';

    return {
      attrs: attrs,
      needs: needs,
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
      result = '@DS.belongsTo';
    } else {
      result = "@DS.belongsTo('" + name + "')";
    }
  } else if (type === 'has-many') {
    if (inflection.pluralize(name) === propertyName) {
      result = '@DS.hasMany';
    } else {
      result = "@DS.hasMany('" + name + "')";
    }
  } else if (type === '') {
    result = '@DS.attr';
  } else {
    result = "@DS.attr('" + type + "')";
  }
  return result + ' ' + propertyName;
}

function classicAttr(attr) {
  let name = attr.name,
    type = attr.type,
    propertyName = attr.propertyName,
    result;

  if (type === 'belongs-to') {
    result = "DS.belongsTo('" + name + "')";
  } else if (type === 'has-many') {
    result = "DS.hasMany('" + name + "')";
  } else if (type === '') {
    //"If you don't specify the type of the attribute, it will be whatever was provided by the server"
    //https://emberjs.com/guides/models/defining-models/
    result = 'DS.attr()';
  } else {
    result = "DS.attr('" + type + "')";
  }
  return propertyName + ': ' + result;
}
