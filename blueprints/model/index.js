const inflection = require('inflection');
const stringUtils = require('ember-cli-string-utils');
const EOL = require('os').EOL;
const isModuleUnificationProject = require('../../lib/utilities/module-unification')
  .isModuleUnificationProject;
const path = require('path');

module.exports = {
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
        attr = dsAttr(dasherizedForeignModelSingular, dasherizedType);
        attrs.push(camelizedNamePlural + ': ' + attr);
      } else if (/belongs-to/.test(dasherizedType)) {
        attr = dsAttr(dasherizedForeignModel, dasherizedType);
        attrs.push(camelizedName + ': ' + attr);
      } else {
        attr = dsAttr(dasherizedName, dasherizedType);
        attrs.push(camelizedName + ': ' + attr);
      }

      if (/has-many|belongs-to/.test(dasherizedType)) {
        needs.push("'model:" + dasherizedForeignModelSingular + "'");
      }
    }

    let needsDeduplicated = needs.filter(function(need, i) {
      return needs.indexOf(need) === i;
    });

    attrs = attrs.join(',' + EOL + '  ');
    needs = '  needs: [' + needsDeduplicated.join(', ') + ']';

    return {
      attrs: attrs,
      needs: needs,
    };
  },
};

function dsAttr(name, type) {
  switch (type) {
    case 'belongs-to':
      return "DS.belongsTo('" + name + "')";
    case 'has-many':
      return "DS.hasMany('" + name + "')";
    case '':
      //"If you don't specify the type of the attribute, it will be whatever was provided by the server"
      //https://emberjs.com/guides/models/defining-models/
      return 'DS.attr()';
    default:
      return "DS.attr('" + type + "')";
  }
}
