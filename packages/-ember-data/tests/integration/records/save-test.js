import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { defer, reject, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import { InvalidError } from '@ember-data/adapter/error';
import Model, { attr } from '@ember-data/model';
import { DEPRECATE_SAVE_PROMISE_ACCESS } from '@ember-data/private-build-infra/deprecations';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/records/save - Save Record', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Post = Model.extend({
      title: attr('string'),
    });

    this.owner.register('model:post', Post);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
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
      assert.strictEqual(saved.get('id'), undefined);
    }

    deferred.resolve({ data: { id: 123, type: 'post' } });
    let model = await saved;
    assert.ok(true, 'save operation was resolved');
    if (DEPRECATE_SAVE_PROMISE_ACCESS) {
      assert.strictEqual(saved.get('id'), '123');
    }
    assert.strictEqual(model, post, 'resolves with the model');
    if (DEPRECATE_SAVE_PROMISE_ACCESS) {
      assert.expectDeprecation({ id: 'ember-data:model-save-promise', count: 2 });
    }
  });

  test('Will reject save on error', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    adapter.createRecord = function (store, type, snapshot) {
      let error = new InvalidError([{ title: 'not valid' }]);
      return reject(error);
    };

    run(function () {
      post.save().then(
        function () {},
        function () {
          assert.ok(true, 'save operation was rejected');
        }
      );
    });
  });

  test('Retry is allowed in a failure handler', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    var count = 0;

    adapter.createRecord = function (store, type, snapshot) {
      let error = new InvalidError([{ title: 'not valid' }]);

      if (count++ === 0) {
        return reject(error);
      } else {
        return resolve({ data: { id: 123, type: 'post' } });
      }
    };

    run(function () {
      post
        .save()
        .then(
          function () {},
          function () {
            return post.save();
          }
        )
        .then(function (post) {
          assert.strictEqual(post.get('id'), '123', 'The post ID made it through');
        });
    });
  });

  test('Repeated failed saves keeps the record in uncommited state', function (assert) {
    assert.expect(4);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    adapter.createRecord = function (store, type, snapshot) {
      return reject();
    };

    run(function () {
      post.save().then(null, function () {
        assert.ok(post.get('isError'));
        assert.strictEqual(post.get('currentState.stateName'), 'root.loaded.created.uncommitted');

        post.save().then(null, function () {
          assert.ok(post.get('isError'));
          assert.strictEqual(post.get('currentState.stateName'), 'root.loaded.created.uncommitted');
        });
      });
    });
  });

  test('Repeated failed saves with invalid error marks the record as invalid', function (assert) {
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

      return reject(error);
    };

    run(function () {
      post.save().then(null, function () {
        assert.false(post.get('isValid'));

        post.save().then(null, function () {
          assert.false(post.get('isValid'));
        });
      });
    });
  });

  test('Repeated failed saves with invalid error without payload marks the record as invalid', function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    adapter.createRecord = function (store, type, snapshot) {
      let error = new InvalidError();
      return reject(error);
    };

    run(function () {
      post.save().then(null, function () {
        assert.false(post.get('isValid'));

        post.save().then(null, function () {
          assert.false(post.get('isValid'));
        });
      });
    });
  });

  test('Will reject save on invalid', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    adapter.createRecord = function (store, type, snapshot) {
      var error = new InvalidError([{ title: 'not valid' }]);
      return reject(error);
    };

    run(function () {
      post.save().then(
        function () {},
        function () {
          assert.ok(true, 'save operation was rejected');
        }
      );
    });
  });

  test('Will error when saving after unloading record via the store', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'toto' });

    run(function () {
      store.unloadAll('post');
      assert.throws(function () {
        post.save();
      }, 'Attempting to save the unloaded record threw an error');
    });
  });

  test('Will error when saving after unloading record', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'toto' });

    run(function () {
      post.unloadRecord();
      assert.throws(function () {
        post.save();
      }, 'Attempting to save the unloaded record threw an error');
    });
  });

  test('Will save with extra promise data attached', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    const deferred = defer();
    adapter.createRecord = function (store, type, snapshot) {
      return { data: { id: 123, type: 'post' } };
    };

    let saved = post.save();
    saved.__ec__cancel = true;
    deferred.resolve();
    assert.ok(saved.__ec__cancel);
    if (DEPRECATE_SAVE_PROMISE_ACCESS) {
      assert.expectDeprecation({ id: 'ember-data:model-save-promise', count: 1 });
    }
  });

  test('Will save with extra promise method attached', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let post = store.createRecord('post', { title: 'toto' });

    const deferred = defer();
    adapter.createRecord = function (store, type, snapshot) {
      return { data: { id: 123, type: 'post' } };
    };

    let saved = post.save();
    saved.__ec__cancel = function () {
      assert.ok(true);
    };
    deferred.resolve();
    assert.ok(saved.__ec__cancel);
    if (DEPRECATE_SAVE_PROMISE_ACCESS) {
      assert.expectDeprecation({ id: 'ember-data:model-save-promise', count: 1 });
    }
  });
});
