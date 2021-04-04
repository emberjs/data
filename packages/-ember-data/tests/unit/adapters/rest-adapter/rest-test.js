import { module, test } from 'qunit';
import RESTAdapter from '@ember-data/adapter/rest';

module('unit/adapters/rest-test', function() {
  test('coalesceFindRequests default', function(assert) {
    const adapter = RESTAdapter.extend();
    assert.deepEqual(adapter.create().coalesceFindRequests, false, 'default result is false');
  });

  test('coalesceFindRequests true', function(assert) {
    const adapter = RESTAdapter.extend({ coalesceFindRequests: true });
    assert.deepEqual(adapter.create().coalesceFindRequests, true, 'result is true');
  });

  test('coalesceFindRequests false', function(assert) {
    const adapter = RESTAdapter.extend({ coalesceFindRequests: false });
    assert.deepEqual(adapter.create().coalesceFindRequests, false, 'result is false');
  });

  test('coalesceFindRequests class default', function(assert) {
    class MyClass extends RESTAdapter {}
    assert.deepEqual(MyClass.create().coalesceFindRequests, false, 'default result is false');
  });

  test('coalesceFindRequests class true', function(assert) {
    class MyClass extends RESTAdapter { coalesceFindRequests = true }
    assert.deepEqual(MyClass.create().coalesceFindRequests, true, 'result is true');
  });

  test('coalesceFindRequests class false', function(assert) {
    class MyClass extends RESTAdapter { coalesceFindRequests = false }
    assert.deepEqual(MyClass.create().coalesceFindRequests, false, 'result is false');
  });
});
