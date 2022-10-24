import { run } from '@ember/runloop';

import { module } from 'qunit';
import { Promise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';
import { DEPRECATE_RSVP_PROMISE } from '@ember-data/private-build-infra/deprecations';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Store from '@ember-data/store';
import test from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

class Person extends Model {
  @attr()
  name;
}

module('unit/store async-waiter and leak detection', function (hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function () {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:person', Person);
    owner.register(
      'serializer:application',
      JSONAPISerializer.extend({
        normalizeResponse(_, __, jsonApiPayload) {
          return jsonApiPayload;
        },
      })
    );
    store = owner.lookup('service:store');
  });

  test('the waiter properly waits for pending requests', async function (assert) {
    let findRecordWasInvoked;
    let findRecordWasInvokedPromise = new Promise((resolveStep) => {
      findRecordWasInvoked = resolveStep;
    });
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          return new Promise((resolve) => {
            findRecordWasInvoked();

            setTimeout(() => {
              resolve({ data: { type: 'person', id: '1' } });
            }, 20); // intentionally longer than the 10ms polling interval of `wait()`
          });
        },
      })
    );

    let request = store.findRecord('person', '1');
    let waiter = store.__asyncWaiter;

    assert.true(waiter(), 'We return true when no requests have been initiated yet (pending queue flush is async)');

    await findRecordWasInvokedPromise;

    assert.false(waiter(), 'We return false to keep waiting while requests are pending');

    await request;

    assert.true(waiter(), 'We return true to end waiting when no requests are pending');
  });

  test('waiter works even when the adapter rejects', async function (assert) {
    assert.expect(4);
    let findRecordWasInvoked;
    let findRecordWasInvokedPromise = new Promise((resolveStep) => {
      findRecordWasInvoked = resolveStep;
    });
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          return new Promise((resolve, reject) => {
            findRecordWasInvoked();

            setTimeout(() => {
              reject({ errors: [] });
            }, 20); // intentionally longer than the 10ms polling interval of `wait()`
          });
        },
      })
    );

    let request = store.findRecord('person', '1');
    let waiter = store.__asyncWaiter;

    assert.true(waiter(), 'We return true when no requests have been initiated yet (pending queue flush is async)');

    await findRecordWasInvokedPromise;

    assert.false(waiter(), 'We return false to keep waiting while requests are pending');

    await assert.rejects(request);

    assert.true(waiter(), 'We return true to end waiting when no requests are pending');
  });

  test('waiter works even when the adapter throws', async function (assert) {
    assert.expect(4);
    let waiter = store.__asyncWaiter;
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          assert.false(waiter(), 'We return false to keep waiting while requests are pending');
          throw new Error('Invalid Request!');
        },
      })
    );

    let request = store.findRecord('person', '1');

    assert.true(waiter(), 'We return true when no requests have been initiated yet (pending queue flush is async)');

    await assert.rejects(request);

    assert.true(waiter(), 'We return true to end waiting when no requests are pending');
  });

  test('when the store is torn down too early, we throw an error', async function (assert) {
    let next;
    let stepPromise = new Promise((resolveStep) => {
      next = resolveStep;
    });
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          next();
          stepPromise = new Promise((resolveStep) => {
            next = resolveStep;
          }).then(() => {
            return { data: { type: 'person', id: '1' } };
          });
          return stepPromise;
        },
      })
    );

    store.findRecord('person', '1');
    let waiter = store.__asyncWaiter;

    assert.true(waiter(), 'We return true when no requests have been initiated yet (pending queue flush is async)');

    await stepPromise;

    assert.false(waiter(), 'We return false to keep waiting while requests are pending');

    assert.throws(() => {
      run(() => store.destroy());
    }, /Async Request leaks detected/);

    assert.false(waiter(), 'We return false because we still have a pending request');

    // make the waiter complete
    run(() => next());
    assert.strictEqual(store._trackedAsyncRequests.length, 0, 'Our pending request is cleaned up');
    assert.true(waiter(), 'We return true because the waiter is cleared');

    if (DEPRECATE_RSVP_PROMISE) {
      assert.expectDeprecation({ id: 'ember-data:rsvp-unresolved-async', count: 1 });
    }
  });

  test('when configured, pending requests have useful stack traces', async function (assert) {
    let stepResolve;
    let stepPromise = new Promise((resolveStep) => {
      stepResolve = resolveStep;
    });
    let fakeId = 1;
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          return new Promise((resolve) => {
            stepResolve();

            setTimeout(() => {
              resolve({ data: { type: 'person', id: `${fakeId++}` } });
            }, 20); // intentionally longer than the 10ms polling interval of `wait()`
          });
        },
      })
    );
    let request = store.findRecord('person', '1');
    let waiter = store.__asyncWaiter;

    assert.true(waiter(), 'We return true when no requests have been initiated yet (pending queue flush is async)');

    await stepPromise;

    assert.false(waiter(), 'We return false to keep waiting while requests are pending');
    assert.strictEqual(
      store._trackedAsyncRequests[0].trace,
      'set `store.generateStackTracesForTrackedRequests = true;` to get a detailed trace for where this request originated',
      'We provide a useful default message in place of a trace'
    );

    await request;

    assert.true(waiter(), 'We return true to end waiting when no requests are pending');

    store.generateStackTracesForTrackedRequests = true;
    request = store.findRecord('person', '2');

    assert.true(waiter(), 'We return true when no requests have been initiated yet (pending queue flush is async)');

    await stepPromise;

    assert.false(waiter(), 'We return false to keep waiting while requests are pending');
    /*
      TODO this just traces back to the `flushPendingFetches`,
      we should do something similar to capture where the fetch was scheduled
      from.
     */
    assert.strictEqual(
      store._trackedAsyncRequests[0].trace.message,
      "EmberData TrackedRequest: DS: Handle Adapter#findRecord of 'person' with id: '2'",
      'We captured a trace'
    );

    await request;

    assert.true(waiter(), 'We return true to end waiting when no requests are pending');
  });
});
