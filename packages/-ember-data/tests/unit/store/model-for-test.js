import { camelize, dasherize } from '@ember/string';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model from '@ember-data/model';

module('unit/store/model_for - DS.Store#modelFor', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('model:blog-post', Model.extend());
    this.owner.register('model:blog.post', Model.extend());
  });

  test('when fetching factory from string, sets a normalized key as modelName', function(assert) {
    let store = this.owner.lookup('service:store');
    let { __registry__: registry } = this.owner;

    registry.normalize = key => dasherize(camelize(key));

    assert.equal(registry.normalize('some.post'), 'some-post', 'precond - container camelizes');
    assert.equal(store.modelFor('blog.post').modelName, 'blog.post', 'modelName is normalized to dasherized');
  });

  test('when fetching factory from string and dashing normalizer, sets a normalized key as modelName', function(assert) {
    let store = this.owner.lookup('service:store');
    let { __registry__: registry } = this.owner;

    registry.normalize = key => dasherize(camelize(key));

    assert.equal(registry.normalize('some.post'), 'some-post', 'precond - container dasherizes');
    assert.equal(store.modelFor('blog.post').modelName, 'blog.post', 'modelName is normalized to dasherized');
  });

  test(`when fetching something that doesn't exist, throws error`, function(assert) {
    let store = this.owner.lookup('service:store');

    assert.throws(() => {
      store.modelFor('wild-stuff');
    }, /No model was found/);
  });
});
