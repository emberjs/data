import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var container, store, registry;

var camelize  = Ember.String.camelize;
var dasherize = Ember.String.dasherize;

var run = Ember.run;
var env;

module("unit/store/model_for - DS.Store#modelFor", {
  beforeEach: function() {
    env = setupStore({
      blogPost: DS.Model.extend(),
      "blog.post": DS.Model.extend()
    });
    store = env.store;
    container = env.container;
    registry = env.registry;
  },

  afterEach: function() {
    run(function() {
      container.destroy();
      store.destroy();
    });
  }
});

test("when fetching factory from string, sets a normalized key as modelName", function(assert) {
  env.replaceContainerNormalize(function(key) {
    return dasherize(camelize(key));
  });

  assert.equal(registry.normalize('some.post'), 'some-post', 'precond - container camelizes');
  assert.equal(store.modelFor("blog.post").modelName, "blog.post", "modelName is normalized to dasherized");
});

test("when fetching factory from string and dashing normalizer, sets a normalized key as modelName", function(assert) {
  env.replaceContainerNormalize(function(key) {
    return dasherize(camelize(key));
  });
  assert.equal(registry.normalize('some.post'), 'some-post', 'precond - container dasherizes');
  assert.equal(store.modelFor("blog.post").modelName, "blog.post", "modelName is normalized to dasherized");
});

test("when fetching something that doesn't exist, throws error", function(assert) {
  assert.throws(function() {
    store.modelFor('wild-stuff');
  }, /No model was found/);
});
