import { module } from 'qunit';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { setupTest } from 'ember-qunit';
import Store from '@ember-data/store';
import Model from '@ember-data/model';
import { Promise } from 'rsvp';
import { attr } from '@ember-decorators/data';
import { run } from '@ember/runloop';
import Ember from 'ember';
import test from '../../helpers/test-in-debug';

class Person extends Model {
  @attr
  name;
}

module('unit/store async-waiter and leak detection', function(hooks) {
  let store;
  setupTest(hooks);

  hooks.beforeEach(function() {
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
    store.shouldTrackAsyncRequests = true;
  });

  test('the waiter properly waits for pending requests', async function(assert) {
    let findRecordWasInvoked;
    let findRecordWasInvokedPromise = new Promise(resolveStep => {
      findRecordWasInvoked = resolveStep;
    });
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          return new Promise(resolve => {
            findRecordWasInvoked();

            setTimeout(() => {
              resolve({ data: { type: 'person', id: '1' } });
            }, 50); // intentionally longer than the 10ms polling interval of `wait()`
          });
        },
      })
    );

    let request = store.findRecord('person', '1');
    let waiter = store.__asyncWaiter;

    assert.equal(
      waiter(),
      true,
      'We return true when no requests have been initiated yet (pending queue flush is async)'
    );

    await findRecordWasInvokedPromise;

    assert.equal(waiter(), false, 'We return false to keep waiting while requests are pending');

    await request;

    assert.equal(waiter(), true, 'We return true to end waiting when no requests are pending');
  });

  test('waiter can be turned off', async function(assert) {
    let findRecordWasInvoked;
    let findRecordWasInvokedPromise = new Promise(resolveStep => {
      findRecordWasInvoked = resolveStep;
    });
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          return new Promise(resolve => {
            findRecordWasInvoked();

            setTimeout(() => {
              resolve({ data: { type: 'person', id: '1' } });
            }, 50); // intentionally longer than the 10ms polling interval of `wait()`
          });
        },
      })
    );

    // turn off the waiter
    store.shouldTrackAsyncRequests = false;

    let request = store.findRecord('person', '1');
    let waiter = store.__asyncWaiter;

    assert.equal(
      waiter(),
      true,
      'We return true when no requests have been initiated yet (pending queue flush is async)'
    );

    await findRecordWasInvokedPromise;

    assert.equal(
      store._trackedAsyncRequests.length,
      1,
      'We return true even though a request is pending'
    );
    assert.equal(waiter(), true, 'We return true even though a request is pending');

    await request;

    assert.equal(waiter(), true, 'We return true to end waiting when no requests are pending');
  });

  test('waiter works even when the adapter rejects', async function(assert) {
    assert.expect(4);
    let findRecordWasInvoked;
    let findRecordWasInvokedPromise = new Promise(resolveStep => {
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
            }, 50); // intentionally longer than the 10ms polling interval of `wait()`
          });
        },
      })
    );

    let request = store.findRecord('person', '1');
    let waiter = store.__asyncWaiter;

    assert.equal(
      waiter(),
      true,
      'We return true when no requests have been initiated yet (pending queue flush is async)'
    );

    await findRecordWasInvokedPromise;

    assert.equal(waiter(), false, 'We return false to keep waiting while requests are pending');

    await assert.rejects(request);

    assert.equal(waiter(), true, 'We return true to end waiting when no requests are pending');
  });

  test('waiter works even when the adapter throws', async function(assert) {
    assert.expect(4);
    let waiter = store.__asyncWaiter;
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          assert.equal(
            waiter(),
            false,
            'We return false to keep waiting while requests are pending'
          );
          throw new Error('Invalid Request!');
        },
      })
    );

    let request = store.findRecord('person', '1');

    assert.equal(
      waiter(),
      true,
      'We return true when no requests have been initiated yet (pending queue flush is async)'
    );

    await assert.rejects(request);

    assert.equal(waiter(), true, 'We return true to end waiting when no requests are pending');
  });

  test('when the store is torn down too early, we throw an error', async function(assert) {
    let next;
    let stepPromise = new Promise(resolveStep => {
      next = resolveStep;
    });
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          next();
          stepPromise = new Promise(resolveStep => {
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

    assert.equal(
      waiter(),
      true,
      'We return true when no requests have been initiated yet (pending queue flush is async)'
    );

    await stepPromise;

    assert.equal(waiter(), false, 'We return false to keep waiting while requests are pending');

    // needed for LTS 2.16
    Ember.Test.adapter.exception = e => {
      throw e;
    };

    assert.throws(() => {
      run(() => store.destroy());
    }, /Async Request leaks detected/);

    assert.equal(waiter(), false, 'We return false because we still have a pending request');

    // make the waiter complete
    run(() => next());
    assert.equal(store._trackedAsyncRequests.length, 0, 'Our pending request is cleaned up');
    assert.equal(waiter(), true, 'We return true because the waiter is cleared');
  });

  test('when the store is torn down too early, but the waiter behavior is turned off, we emit a warning', async function(assert) {
    let next;
    let stepPromise = new Promise(resolveStep => {
      next = resolveStep;
    });
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          next();
          stepPromise = new Promise(resolveStep => {
            next = resolveStep;
          }).then(() => {
            return { data: { type: 'person', id: '1' } };
          });
          return stepPromise;
        },
      })
    );

    // turn off the waiter
    store.shouldTrackAsyncRequests = false;

    store.findRecord('person', '1');
    let waiter = store.__asyncWaiter;

    assert.equal(store._trackedAsyncRequests.length, 0, 'We have no requests yet');
    assert.equal(
      waiter(),
      true,
      'We return true when no requests have been initiated yet (pending queue flush is async)'
    );

    await stepPromise;

    assert.equal(store._trackedAsyncRequests.length, 1, 'We have a pending request');
    assert.equal(waiter(), true, 'We return true because the waiter is turned off');
    assert.expectWarning(() => {
      run(() => {
        store.destroy();
      });
    }, /Async Request leaks detected/);

    assert.equal(waiter(), true, 'We return true because the waiter is turned off');

    // make the waiter complete
    run(() => next());
    assert.equal(store._trackedAsyncRequests.length, 0, 'Our pending request is cleaned up');
    assert.equal(waiter(), true, 'We return true because the waiter is cleared');
  });

  test('when configured, pending requests have useful stack traces', async function(assert) {
    let stepResolve;
    let stepPromise = new Promise(resolveStep => {
      stepResolve = resolveStep;
    });
    let fakeId = 1;
    this.owner.register(
      'adapter:application',
      JSONAPIAdapter.extend({
        findRecord() {
          return new Promise(resolve => {
            stepResolve();

            setTimeout(() => {
              resolve({ data: { type: 'person', id: `${fakeId++}` } });
            }, 50); // intentionally longer than the 10ms polling interval of `wait()`
          });
        },
      })
    );
    let request = store.findRecord('person', '1');
    let waiter = store.__asyncWaiter;

    assert.equal(
      waiter(),
      true,
      'We return true when no requests have been initiated yet (pending queue flush is async)'
    );

    await stepPromise;

    assert.equal(waiter(), false, 'We return false to keep waiting while requests are pending');
    assert.equal(
      store._trackedAsyncRequests[0].trace,
      'set `store.generateStackTracesForTrackedRequests = true;` to get a detailed trace for where this request originated',
      'We provide a useful default message in place of a trace'
    );

    await request;

    assert.equal(waiter(), true, 'We return true to end waiting when no requests are pending');

    store.generateStackTracesForTrackedRequests = true;
    request = store.findRecord('person', '2');

    assert.equal(
      waiter(),
      true,
      'We return true when no requests have been initiated yet (pending queue flush is async)'
    );

    await stepPromise;

    assert.equal(waiter(), false, 'We return false to keep waiting while requests are pending');
    /*
      TODO this just traces back to the `flushPendingFetches`,
      we should do something similar to capture where the fetch was scheduled
      from.
     */
    assert.equal(
      store._trackedAsyncRequests[0].trace.message,
      "EmberData TrackedRequest: DS: Handle Adapter#findRecord of 'person' with id: '2'",
      'We captured a trace'
    );

    await request;

    assert.equal(waiter(), true, 'We return true to end waiting when no requests are pending');
  });
});
