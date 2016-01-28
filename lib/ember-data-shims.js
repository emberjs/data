;(function() {
  function processEmberDataShims() {
    var shims = {
      'ember-data':                          { default: DS },
      'ember-data/model':                    { default: DS.Model },
      'ember-data/mixins/embedded-records':  { default: DS.EmbeddedRecordsMixin },
      'ember-data/serializers/rest':         { default: DS.RESTSerializer },
      'ember-data/serializers/active-model': { default: DS.ActiveModelSerializer },
      'ember-data/serializers/json':         { default: DS.JSONSerializer },
      'ember-data/serializers/json-api':     { default: DS.JSONAPISerializer },
      'ember-data/serializer':               { default: DS.Serializer },
      'ember-data/adapters/json-api':        { default: DS.JSONAPIAdapter },
      'ember-data/adapters/rest':            { default: DS.RESTAdapter },
      'ember-data/adapter':                  { default: DS.Adapter },
      'ember-data/adapters/active-model':    { default: DS.ActiveModelAdapter },
      'ember-data/store':                    { default: DS.Store },
      'ember-data/transform':                { default: DS.Transform },
      'ember-data/attr':                     { default: DS.attr },
      'ember-data/relationships':            { hasMany: DS.hasMany, belongsTo: DS.belongsTo }
    };

    for (var moduleName in shims) {
      generateModule(moduleName, shims[moduleName]);
    }
  }

  function generateModule(name, values) {
    define(name, [], function() {
      'use strict';

      return values;
    });
  }

  if (typeof define !== 'undefined' && define && define.petal) {
    processEmberDataShims();
  }
})();
