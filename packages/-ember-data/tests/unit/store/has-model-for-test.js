import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model from '@ember-data/model';

module('unit/store/has-model-For', function(hooks) {
  setupTest(hooks);

  test(`hasModelFor correctly normalizes`, function(assert) {
    this.owner.register('model:one-foo', Model.extend({}));
    this.owner.register('model:two-foo', Model.extend({}));

    let store = this.owner.lookup('service:store');

    assert.equal(store._hasModelFor('oneFoo'), true);
    assert.equal(store._hasModelFor('twoFoo'), true);
  });
});
