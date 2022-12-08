import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { defer } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import { InvalidError } from '@ember-data/adapter/error';
import Model, { attr } from '@ember-data/model';
import { DEPRECATE_SAVE_PROMISE_ACCESS } from '@ember-data/private-build-infra/deprecations';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/records/save - Save Record', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    class Post extends Model {
      @attr title;
    }

    this.owner.register('model:post', Post);
    this.owner.register('adapter:application', class extends Adapter {});
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('Will resolve save on success', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    const deferred = defer();
    adapter.createRecord = function (store, type, snapshot) {
      return deferred.promise;
    };

    let saved = post.save();

    if (DEPRECATE_SAVE_PROMISE_ACCESS) {
      // `save` returns a PromiseObject which allows to call get on it
      assert.strictEqual(saved.get('id'), undefined, `<proxy>.get('id') is undefined before save resolves`);
    }

    deferred.resolve({ data: { id: '123', type: 'post' } });
    let model = await saved;
    assert.ok(true, 'save operation was resolved');
    if (DEPRECATE_SAVE_PROMISE_ACCESS) {
      assert.strictEqual(saved.get('id'), '123', `<proxy>.get('id') is '123' after save resolves`);
      assert.strictEqual(model.id, '123', `record.id is '123' after save resolves`);
    } else {
      assert.strictEqual(saved.id, undefined, `<proxy>.id is undefined after save resolves`);
      assert.strictEqual(model.id, '123', `record.id is '123' after save resolves`);
    }
    assert.strictEqual(model, post, 'resolves with the model');
    if (DEPRECATE_SAVE_PROMISE_ACCESS) {
      // We don't care about the exact value of the property, but accessing it
      // should not throw an error and only show a deprecation.
      saved.__ec_cancel__ = true;
      assert.true(saved.__ec_cancel__, '__ec_cancel__ can be accessed on the proxy');
      assert.strictEqual(
        model.__ec_cancel__,
        undefined,
        '__ec_cancel__ can be accessed on the record but is not present'
      );

      assert.expectDeprecation({ id: 'ember-data:model-save-promise', count: 10 });
    }
  });

  test('Will reject save on error', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    adapter.createRecord = function (store, type, snapshot) {
      let error = new InvalidError([{ title: 'not valid' }]);
      return Promise.reject(error);
    };

    try {
      await post.save();
      assert.ok(false, 'we should err');
    } catch (error) {
      assert.ok(true, 'we errored during save');
    }
  });

  testInDebug('createRecord id asserts during commit are gracefully handled', async function (assert) {
    this.owner.register(
      'adapter:application',
      class extends Adapter {
        createRecord() {
          return {
            data: {
              type: 'post',
              attributes: {
                title: 'Adjunctivitis (revised)',
              },
            },
          };
        }
      }
    );
    const store = this.owner.lookup('service:store');
    const post = store.createRecord('post', { title: 'Adjunctivitis' });
    try {
      await post.save();
      assert.ok(false, 'error should be catchable');
    } catch (e) {
      assert.ok(true, `error ${e.message} was catchable`);
      assert.false(post.isValid, 'post should be in an invalid state');
    }
  });

  test('Retry is allowed in a failure handler', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    var count = 0;

    adapter.createRecord = function (store, type, snapshot) {
      let error = new InvalidError([{ title: 'not valid' }]);

      if (count++ === 0) {
        return Promise.reject(error);
      } else {
        return Promise.resolve({ data: { id: '123', type: 'post' } });
      }
    };

    try {
      await post.save();
    } catch {
      await post.save();
    }
    assert.strictEqual(post.id, '123', 'The post ID made it through');
  });

  test('Repeated failed saves keeps the record in uncommited state', async function (assert) {
    assert.expect(4);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    adapter.createRecord = function (store, type, snapshot) {
      return Promise.reject();
    };

    try {
      await post.save();
      assert.ok(false, 'we should error');
    } catch {
      assert.true(post.isError);
      assert.strictEqual(post.currentState.stateName, 'root.loaded.created.uncommitted');
    }

    try {
      await post.save();
      assert.ok(false, 'we should error');
    } catch {
      assert.true(post.isError);
      assert.strictEqual(post.currentState.stateName, 'root.loaded.created.uncommitted');
    }
  });

  test('Repeated failed saves with invalid error marks the record as invalid', async function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    adapter.createRecord = function (store, type, snapshot) {
      let error = new InvalidError([
        {
          detail: 'is invalid',
          source: { pointer: 'data/attributes/title' },
        },
      ]);

      return Promise.reject(error);
    };

    try {
      await post.save();
      assert.ok(false, 'we should error');
    } catch {
      assert.false(post.isValid);
    }
    try {
      await post.save();
      assert.ok(false, 'we should error');
    } catch {
      assert.false(post.isValid);
    }
  });

  test('Repeated failed saves with invalid error without payload marks the record as invalid', async function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    adapter.createRecord = function (store, type, snapshot) {
      let error = new InvalidError();
      return Promise.reject(error);
    };

    try {
      await post.save();
      assert.ok(false, 'we should error');
    } catch {
      assert.false(post.isValid);
    }
    try {
      await post.save();
      assert.ok(false, 'we should error');
    } catch {
      assert.false(post.isValid);
    }
  });

  test('Will reject save on invalid', async function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    adapter.createRecord = function (store, type, snapshot) {
      var error = new InvalidError([{ title: 'not valid' }]);
      return Promise.reject(error);
    };

    try {
      await post.save();
      assert.ok(false, 'we should error');
    } catch {
      assert.ok(true, 'save operation was rejected');
    }
  });

  test('Will error when saving after unloading record via the store', async function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    adapter.createRecord = function (store, type, snapshot) {
      return {
        data: {
          id: '1',
          type: 'post',
        },
      };
    };

    store.unloadAll('post');
    await settled();

    await assert.expectAssertion(
      () => post.save(),
      'A record in a disconnected state cannot utilize the store. This typically means the record has been destroyed, most commonly by unloading it.'
    );
  });

  test('Will error when saving after unloading record', async function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    adapter.createRecord = function (store, type, snapshot) {
      return {
        data: {
          id: '1',
          type: 'post',
        },
      };
    };

    post.unloadRecord();
    await settled();

    await assert.expectAssertion(
      () => post.save(),
      'A record in a disconnected state cannot utilize the store. This typically means the record has been destroyed, most commonly by unloading it.'
    );
  });
});
