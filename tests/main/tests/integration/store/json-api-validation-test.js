import { run } from '@ember/runloop';

import QUnit, { module } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr } from '@ember-data/model';
import Serializer from '@ember-data/serializer';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

function payloadError(owner, payload, expectedError, assert) {
  owner.register(
    'serializer:person',
    Serializer.extend({
      normalizeResponse(store, type, pld) {
        return pld;
      },
    })
  );
  owner.register(
    'adapter:person',
    Adapter.extend({
      findRecord() {
        return resolve(payload);
      },
    })
  );
  this.expectAssertion(
    function () {
      run(function () {
        owner.lookup('service:store').findRecord('person', 1);
      });
    },
    expectedError,
    `Payload ${JSON.stringify(payload)} should throw error ${expectedError}`
  );
  owner.unregister('serializer:person');
  owner.unregister('adapter:person');
}

module('integration/store/json-validation', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    QUnit.assert.payloadError = payloadError.bind(QUnit.assert);

    const Person = Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string'),
    });

    this.owner.register('model:person', Person);
  });

  hooks.afterEach(function () {
    QUnit.assert.payloadError = null;
  });

  testInDebug("when normalizeResponse returns undefined (or doesn't return), throws an error", function (assert) {
    this.owner.register(
      'serializer:person',
      Serializer.extend({
        normalizeResponse() {},
      })
    );

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord() {
          return resolve({ data: {} });
        },
      })
    );

    let store = this.owner.lookup('service:store');

    assert.expectAssertion(function () {
      run(function () {
        store.findRecord('person', 1);
      });
    }, /Top level of a JSON API document must be an object/);
  });

  testInDebug('when normalizeResponse returns null, throws an error', function (assert) {
    this.owner.register(
      'serializer:person',
      Serializer.extend({
        normalizeResponse() {
          return null;
        },
      })
    );

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord() {
          return resolve({ data: {} });
        },
      })
    );

    let store = this.owner.lookup('service:store');

    assert.expectAssertion(function () {
      run(function () {
        store.findRecord('person', 1);
      });
    }, /Top level of a JSON API document must be an object/);
  });

  testInDebug('when normalizeResponse returns an empty object, throws an error', function (assert) {
    this.owner.register(
      'serializer:person',
      Serializer.extend({
        normalizeResponse() {
          return {};
        },
      })
    );

    this.owner.register(
      'adapter:person',
      Adapter.extend({
        findRecord() {
          return resolve({ data: {} });
        },
      })
    );

    let store = this.owner.lookup('service:store');

    assert.expectAssertion(function () {
      run(function () {
        store.findRecord('person', 1);
      });
    }, /One or more of the following keys must be present/);
  });

  testInDebug(
    'when normalizeResponse returns a document with both data and errors, throws an error',
    function (assert) {
      this.owner.register(
        'serializer:person',
        Serializer.extend({
          normalizeResponse() {
            return {
              data: [],
              errors: [],
            };
          },
        })
      );

      this.owner.register(
        'adapter:person',
        Adapter.extend({
          findRecord() {
            return resolve({ data: {} });
          },
        })
      );

      let store = this.owner.lookup('service:store');

      assert.expectAssertion(function () {
        run(function () {
          store.findRecord('person', 1);
        });
      }, /cannot both be present/);
    }
  );

  testInDebug("normalizeResponse 'data' cannot be undefined, a number, a string or a boolean", function (assert) {
    assert.payloadError(this.owner, { data: undefined }, /data must be/);
    assert.payloadError(this.owner, { data: 1 }, /data must be/);
    assert.payloadError(this.owner, { data: 'lollerskates' }, /data must be/);
    assert.payloadError(this.owner, { data: true }, /data must be/);
  });

  testInDebug(
    "normalizeResponse 'meta' cannot be an array, undefined, a number, a string or a boolean",
    function (assert) {
      assert.payloadError(this.owner, { meta: undefined }, /meta must be an object/);
      assert.payloadError(this.owner, { meta: [] }, /meta must be an object/);
      assert.payloadError(this.owner, { meta: 1 }, /meta must be an object/);
      assert.payloadError(this.owner, { meta: 'lollerskates' }, /meta must be an object/);
      assert.payloadError(this.owner, { meta: true }, /meta must be an object/);
    }
  );

  testInDebug(
    "normalizeResponse 'links' cannot be an array, undefined, a number, a string or a boolean",
    function (assert) {
      assert.payloadError(this.owner, { data: [], links: undefined }, /links must be an object/);
      assert.payloadError(this.owner, { data: [], links: [] }, /links must be an object/);
      assert.payloadError(this.owner, { data: [], links: 1 }, /links must be an object/);
      assert.payloadError(this.owner, { data: [], links: 'lollerskates' }, /links must be an object/);
      assert.payloadError(this.owner, { data: [], links: true }, /links must be an object/);
    }
  );

  testInDebug(
    "normalizeResponse 'jsonapi' cannot be an array, undefined, a number, a string or a boolean",
    function (assert) {
      assert.payloadError(this.owner, { data: [], jsonapi: undefined }, /jsonapi must be an object/);
      assert.payloadError(this.owner, { data: [], jsonapi: [] }, /jsonapi must be an object/);
      assert.payloadError(this.owner, { data: [], jsonapi: 1 }, /jsonapi must be an object/);
      assert.payloadError(this.owner, { data: [], jsonapi: 'lollerskates' }, /jsonapi must be an object/);
      assert.payloadError(this.owner, { data: [], jsonapi: true }, /jsonapi must be an object/);
    }
  );

  testInDebug(
    "normalizeResponse 'included' cannot be an object, undefined, a number, a string or a boolean",
    function (assert) {
      assert.payloadError(this.owner, { included: undefined }, /included must be an array/);
      assert.payloadError(this.owner, { included: {} }, /included must be an array/);
      assert.payloadError(this.owner, { included: 1 }, /included must be an array/);
      assert.payloadError(this.owner, { included: 'lollerskates' }, /included must be an array/);
      assert.payloadError(this.owner, { included: true }, /included must be an array/);
    }
  );

  testInDebug(
    "normalizeResponse 'errors' cannot be an object, undefined, a number, a string or a boolean",
    function (assert) {
      assert.payloadError(this.owner, { errors: undefined }, /errors must be an array/);
      assert.payloadError(this.owner, { errors: {} }, /errors must be an array/);
      assert.payloadError(this.owner, { errors: 1 }, /errors must be an array/);
      assert.payloadError(this.owner, { errors: 'lollerskates' }, /errors must be an array/);
      assert.payloadError(this.owner, { errors: true }, /errors must be an array/);
    }
  );
});
