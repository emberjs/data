import { module, test } from 'qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';

module('unit/adapters/json-api-test', function () {
  test('coalesceFindRequests default', function (assert) {
    const adapter = JSONAPIAdapter.extend();
    assert.false(adapter.create().coalesceFindRequests, 'default result is false');
  });

  test('coalesceFindRequests true', function (assert) {
    const adapter = JSONAPIAdapter.extend({ coalesceFindRequests: true });
    assert.true(adapter.create().coalesceFindRequests, 'result is true');
  });

  test('coalesceFindRequests false', function (assert) {
    const adapter = JSONAPIAdapter.extend({ coalesceFindRequests: false });
    assert.false(adapter.create().coalesceFindRequests, 'result is false');
  });

  test('coalesceFindRequests class default', function (assert) {
    class MyClass extends JSONAPIAdapter {}
    assert.false(MyClass.create().coalesceFindRequests, 'default result is false');
  });

  test('coalesceFindRequests class true', function (assert) {
    class MyClass extends JSONAPIAdapter {
      coalesceFindRequests = true;
    }
    assert.true(MyClass.create().coalesceFindRequests, 'result is true');
  });

  test('coalesceFindRequests class false', function (assert) {
    class MyClass extends JSONAPIAdapter {
      coalesceFindRequests = false;
    }
    assert.false(MyClass.create().coalesceFindRequests, 'result is false');
  });
});
