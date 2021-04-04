import { module, test } from 'qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';

module('unit/adapters/json-api-test', function() {
  test('coalesceFindRequests default', function(assert) {
    const adapter = JSONAPIAdapter.extend();
    assert.deepEqual(adapter.create().coalesceFindRequests, false, 'default result is false');
  });

  test('coalesceFindRequests true', function(assert) {
    const adapter = JSONAPIAdapter.extend({ coalesceFindRequests: true });
    assert.deepEqual(adapter.create().coalesceFindRequests, true, 'result is true');
  });

  test('coalesceFindRequests false', function(assert) {
    const adapter = JSONAPIAdapter.extend({ coalesceFindRequests: false });
    assert.deepEqual(adapter.create().coalesceFindRequests, false, 'result is false');
  });

  test('coalesceFindRequests class default', function(assert) {
    class MyClass extends JSONAPIAdapter {}
    assert.deepEqual(MyClass.create().coalesceFindRequests, false, 'default result is false');
  });

  test('coalesceFindRequests class true', function(assert) {
    class MyClass extends JSONAPIAdapter {
      coalesceFindRequests = true;
    }
    assert.deepEqual(MyClass.create().coalesceFindRequests, true, 'result is true');
  });

  test('coalesceFindRequests class false', function(assert) {
    class MyClass extends JSONAPIAdapter {
      coalesceFindRequests = false;
    }
    assert.deepEqual(MyClass.create().coalesceFindRequests, false, 'result is false');
  });
});
