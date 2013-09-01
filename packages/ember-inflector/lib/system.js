require('ember-inflector/system/string');
require('ember-inflector/system/inflector');
require('ember-inflector/system/inflections');
require('ember-inflector/ext/string');

Ember.Inflector.inflector = new Ember.Inflector(Ember.Inflector.defaultRules);
