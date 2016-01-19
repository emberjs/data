/*jshint node:true*/

var inflection  = require('inflection');
var stringUtils = require('ember-cli-string-utils');
var EOL         = require('os').EOL;

module.exports = {
  description: 'Generates an ember-data model.',

  anonymousOptions: [
    'name',
    'attr:type'
  ],

  locals: function(options) {
    var attrs = [];
    var needs = [];
    var entityOptions = options.entity.options;
    var importStatements = ['import Model from \'ember-data/model\';'];
    var shouldImportAttr = false;
    var shouldImportBelongsTo = false;
    var shouldImportHasMany = false;

    for (var name in entityOptions) {
      var type = entityOptions[name] || '';
      var foreignModel = name;
      if (type.indexOf(':') > -1) {
        foreignModel = type.split(':')[1];
        type = type.split(':')[0];
      }
      var dasherizedName = stringUtils.dasherize(name);
      var camelizedName = stringUtils.camelize(name);
      var dasherizedType = stringUtils.dasherize(type);
      var dasherizedForeignModel = stringUtils.dasherize(foreignModel);
      var dasherizedForeignModelSingular = inflection.singularize(dasherizedForeignModel);

      var attr;
      if (/has-many/.test(dasherizedType)) {
        var camelizedNamePlural = inflection.pluralize(camelizedName);
        attr = dsAttr(dasherizedForeignModelSingular, dasherizedType);
        attrs.push(camelizedNamePlural + ': ' + attr);
        shouldImportHasMany = true;
      } else if (/belongs-to/.test(dasherizedType)) {
        attr = dsAttr(dasherizedForeignModel, dasherizedType);
        attrs.push(camelizedName + ': ' + attr);
        shouldImportBelongsTo = true;
      } else {
        attr = dsAttr(dasherizedName, dasherizedType);
        attrs.push(camelizedName + ': ' + attr);
        shouldImportAttr = true;
      }

      if (/has-many|belongs-to/.test(dasherizedType)) {
        needs.push("'model:" + dasherizedForeignModelSingular + "'");
      }
    }

    var needsDeduplicated = needs.filter(function(need, i) {
      return needs.indexOf(need) === i;
    });

    if (shouldImportAttr) {
      importStatements.push('import attr from \'ember-data/attr\';');
    }

    if (shouldImportBelongsTo && shouldImportHasMany) {
      importStatements.push('import { belongsTo, hasMany } from \'ember-data/relationships\';');
    } else if (shouldImportBelongsTo) {
      importStatements.push('import { belongsTo } from \'ember-data/relationships\';');
    } else if (shouldImportHasMany) {
      importStatements.push('import { hasMany } from \'ember-data/relationships\';');
    }

    importStatements = importStatements.join(EOL);
    attrs = attrs.join(',' + EOL + '  ');
    needs = '  needs: [' + needsDeduplicated.join(', ') + ']';

    return {
      importStatements: importStatements,
      attrs: attrs,
      needs: needs
    };
  }
};

function dsAttr(name, type) {
  switch (type) {
  case 'belongs-to':
    return 'belongsTo(\'' + name + '\')';
  case 'has-many':
    return 'hasMany(\'' + name + '\')';
  case '':
    //"If you don't specify the type of the attribute, it will be whatever was provided by the server"
    //http://emberjs.com/guides/models/defining-models/
    return 'attr()';
  default:
    return 'attr(\'' + type + '\')';
  }
}
