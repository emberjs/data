import { module, test } from 'qunit';

import RESTAdapter from '@ember-data/adapter/rest';

module('unit/adapters/rest-test', function () {
  test('coalesceFindRequests default', function (assert) {
    const adapter = RESTAdapter.extend();
    assert.false(adapter.create().coalesceFindRequests, 'default result is false');
  });

  test('coalesceFindRequests true', function (assert) {
    const adapter = RESTAdapter.extend({ coalesceFindRequests: true });
    assert.true(adapter.create().coalesceFindRequests, 'result is true');
  });

  test('coalesceFindRequests false', function (assert) {
    const adapter = RESTAdapter.extend({ coalesceFindRequests: false });
    assert.false(adapter.create().coalesceFindRequests, 'result is false');
  });

  test('coalesceFindRequests class default', function (assert) {
    class MyClass extends RESTAdapter {}
    assert.false(MyClass.create().coalesceFindRequests, 'default result is false');
  });

  test('coalesceFindRequests class true', function (assert) {
    class MyClass extends RESTAdapter {
      coalesceFindRequests = true;
    }
    assert.true(MyClass.create().coalesceFindRequests, 'result is true');
  });

  test('coalesceFindRequests class false', function (assert) {
    class MyClass extends RESTAdapter {
      coalesceFindRequests = false;
    }
    assert.false(MyClass.create().coalesceFindRequests, 'result is false');
  });
});
