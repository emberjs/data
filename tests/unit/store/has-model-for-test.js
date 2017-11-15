import { createStore } from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';
import DS from 'ember-data';

let store;

module('unit/store/has-model-For', {
  beforeEach() {
    store = createStore({
      adapter: DS.Adapter.extend(),
      'one-foo':  DS.Model.extend({}),
      'two-foo': DS.Model.extend({})
    });
  }
});

test(`hasModelFor correctly normalizes`, function(assert) {
  assert.equal(store._hasModelFor('oneFoo'), true);
  assert.equal(store._hasModelFor('twoFoo'). true);
});
