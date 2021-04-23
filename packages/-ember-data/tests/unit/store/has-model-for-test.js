import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model from '@ember-data/model';

module('unit/store/has-model-For', function (hooks) {
  setupTest(hooks);

  test(`hasModelFor correctly normalizes`, function (assert) {
    this.owner.register('model:one-foo', Model.extend({}));
    this.owner.register('model:two-foo', Model.extend({}));

    let store = this.owner.lookup('service:store');

    assert.true(store._hasModelFor('oneFoo'));
    assert.true(store._hasModelFor('twoFoo'));
  });
});
