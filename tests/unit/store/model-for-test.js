import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

let container, store, registry, env;

const { camelize, dasherize } = Ember.String;
const { run } = Ember;
const { Model } = DS;

module('unit/store/model_for - DS.Store#modelFor', {
  beforeEach() {
    env = setupStore({
      blogPost: Model.extend(),
      'blog.post': Model.extend()
    });
    store = env.store;
    container = env.container;
    registry = env.registry;
  },

  afterEach() {
    run(() => {
      container.destroy();
      store.destroy();
    });
  }
});

test('when fetching factory from string, sets a normalized key as modelName', function(assert) {
  env.replaceContainerNormalize(key => dasherize(camelize(key)));

  assert.equal(registry.normalize('some.post'), 'some-post', 'precond - container camelizes');
  assert.equal(store.modelFor('blog.post').modelName, 'blog.post', 'modelName is normalized to dasherized');
});

test('when fetching factory from string, it errors if modelName was already set.', function(assert) {
  const modelName = 'original';
  const extendedModelName = 'reexport';
  const BaseModel = Model.extend({});

  // simulate `export { default } from './base-model';`
  const ExtendedModel = BaseModel;

  env.registry.register(`model:${modelName}`, BaseModel);
  env.registry.register(`model:${extendedModelName}`, ExtendedModel);

  let resolvedBaseModel = store.modelFor(modelName);
  assert.equal(resolvedBaseModel.modelName, modelName, 'We set modelName correctly');
  assert.expectDeprecation(() => {
    store.modelFor(extendedModelName);
  }, /re-export/, 'We receive a deprecation about the re-export');
});

test('when fetching factory from string and dashing normalizer, sets a normalized key as modelName', function(assert) {
  env.replaceContainerNormalize(key => dasherize(camelize(key)));

  assert.equal(registry.normalize('some.post'), 'some-post', 'precond - container dasherizes');
  assert.equal(store.modelFor("blog.post").modelName, "blog.post", "modelName is normalized to dasherized");
});

test(`when fetching something that doesn't exist, throws error`, function(assert) {
  assert.throws(() => {
    store.modelFor('wild-stuff');
  }, /No model was found/);
});
