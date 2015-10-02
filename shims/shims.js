;(function() {
  'use strict';

  function defineModule(name, value) {
    define(name, [], function() {

      return { default: value };
    });
  }

  defineModule('ember-data', DS);
  defineModule('ember-data/model', DS.Model);
  defineModule('ember-data/serializers/rest',         DS.RESTSerializer);
  defineModule('ember-data/serializers/active-model', DS.ActiveModelSerializer);
  defineModule('ember-data/serializers/json',         DS.JSONSerializer);
  defineModule('ember-data/serializers/json-api',     DS.JSONAPISerializer);
  defineModule('ember-data/adapters/json-api',        DS.JSONAPIAdapter);
  defineModule('ember-data/adapters/rest',            DS.RESTAdapter);
  defineModule('ember-data/adapter',                  DS.Adapter);
  defineModule('ember-data/adapters/active-model',    DS.ActiveModelAdapter);
  defineModule('ember-data/store',                    DS.Store);
  defineModule('ember-data/transform',                DS.Transform);
  defineModule('ember-data/attr',                     DS.attr);
  define('ember-data/relationships', [], function() {
    return {
      hasMany: DS.hasMany,
      belongsTo: DS.belongsTo
    };
  });

  if (Ember.Test) {
    defineModule('ember-test/adapter', Ember.Test.Adapter);
    defineModule('ember-test/qunit-adapter', Ember.Test.QUnitAdapter);
  }
}());
