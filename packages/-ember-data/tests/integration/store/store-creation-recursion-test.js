import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Transform from '@ember-data/serializer/transform';

module('integration/store/creation-recursion', function (hooks) {
  setupTest(hooks);

  test('store construction does not construct transforms', function (assert) {
    let storeFactory = this.owner.factoryFor('service:store');

    this.owner.unregister('service:store');
    this.owner.register('service:store', storeFactory.class);

    let test = this;
    test.dateTransformCreated = false;
    class MockDateTransform extends Transform {
      constructor(...args) {
        super(...args);
        test.dateTransformCreated = true;
      }
    }

    this.owner.unregister('transform:date');
    this.owner.register('transform:date', MockDateTransform);

    assert.notOk(this.dateTransformCreated, 'date transform is not yet created');

    // construct a store - it should now be created
    this.owner.lookup('service:store');

    assert.notOk(this.dateTransformCreated, 'date transform is not yet created');

    // construct a date transform - it should now be created
    this.owner.lookup('transform:date');

    assert.ok(this.dateTransformCreated, 'date transform is now created');
  });
});
