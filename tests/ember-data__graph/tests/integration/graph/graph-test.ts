import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

import { graphFor } from '@ember-data/graph/-private';
import Store from '@ember-data/store';

module('Integration | Graph | Configuration', function (hooks) {
  setupTest(hooks);

  class MyStore extends Store {
    isGraphStore = true;
  }

  let store: MyStore;
  hooks.beforeEach(function (assert) {
    const { owner } = this;
    owner.register('service:store', MyStore);
    store = owner.lookup('service:store') as MyStore;
    assert.equal(store.isGraphStore, true, 'pre-cond, store registered correctly');
  });

  test('graphFor util returns the same graph instance for repeated calls on the same store wrapper instance', function (assert) {
    const wrapper = store._instanceCache._storeWrapper;
    const graph1 = graphFor(wrapper);
    const graph2 = graphFor(wrapper);
    const graph3 = graphFor(wrapper);

    assert.equal(graph1, graph2, 'We got the same instance the second time');
    assert.equal(graph2, graph3, 'We got the same instance the third time');
  });

  test('graphFor util returns a new graph instance for each unique store wrapper', function (assert) {
    const { owner } = this;
    const wrapper1 = store._instanceCache._storeWrapper;

    owner.register('service:store2', MyStore);
    owner.register('service:store3', MyStore);

    const store2 = owner.lookup('service:store2') as unknown as Store;
    const store3 = owner.lookup('service:store3') as unknown as Store;
    const wrapper2 = store2._instanceCache._storeWrapper;
    const wrapper3 = store3._instanceCache._storeWrapper;

    const graph1 = graphFor(wrapper1);
    const graph2 = graphFor(wrapper2);
    const graph3 = graphFor(wrapper3);

    assert.notEqual(graph1, graph2, 'We got a new instance for store2');
    assert.notEqual(graph1, graph3, 'We got a new instance for store3');
    assert.notEqual(graph2, graph3, 'The instance for store2 is not the same as store3');
  });

  test('graphFor util returns the same graph instance for repeated calls on the same store instance', function (assert) {
    const graph1 = graphFor(store);
    const graph2 = graphFor(store);
    const graph3 = graphFor(store);

    assert.equal(graph1, graph2, 'We got the same instance the second time');
    assert.equal(graph2, graph3, 'We got the same instance the third time');
  });

  test('graphFor util returns a new graph instance for each unique store', function (assert) {
    const { owner } = this;
    owner.register('service:store2', MyStore);
    owner.register('service:store3', MyStore);

    const store2 = owner.lookup('service:store2') as unknown as Store;
    const store3 = owner.lookup('service:store3') as unknown as Store;

    const graph1 = graphFor(store);
    const graph2 = graphFor(store2);
    const graph3 = graphFor(store3);

    assert.notEqual(graph1, graph2, 'We got a new instance for store2');
    assert.notEqual(graph1, graph3, 'We got a new instance for store3');
    assert.notEqual(graph2, graph3, 'The instance for store2 is not the same as store3');
  });

  test('graphFor util returns the same graph instance for the store and storeWrapper', function (assert) {
    const { owner } = this;
    const wrapper = store._instanceCache._storeWrapper;
    // lookup the wrapper first
    const graph1 = graphFor(wrapper);
    const graph2 = graphFor(store);

    owner.register('service:store2', MyStore);
    const store2 = owner.lookup('service:store2') as unknown as Store;
    const wrapper2 = store2._instanceCache._storeWrapper;
    // lookup the store first
    const graph3 = graphFor(store2);
    const graph4 = graphFor(wrapper2);

    assert.equal(graph1, graph2, 'We got the same instance when wrapper is looked up first');
    assert.equal(graph3, graph4, 'We got the same instance when store is looked up first');
    assert.notEqual(graph1, graph3, 'The stores do not share an instance');
  });
});
