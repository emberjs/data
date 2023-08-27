import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

class Person extends Model {
  @attr name;
  @hasMany('person', { async: true, inverse: 'friends' }) friends;
  @belongsTo('person', { async: true, inverse: null }) bestFriend;
}

module('Integration | Records | New Record Unload', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:person', Person);
  });

  test('Rolling Back Attributes on a New Record unloads that record safely', async function (assert) {
    const store = this.owner.lookup('service:store');
    const Matt = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Matthew Seidel',
        },
        relationships: {
          friends: {
            data: [],
          },
        },
      },
    });
    let Pat = store.createRecord('person', { name: 'Patrick Wachter' });
    const friends = Matt.hasMany('friends').value();
    friends.push(Pat);
    let people = store.peekAll('person');

    assert.strictEqual(friends.length, 1, 'Matt has friends');
    assert.strictEqual(people.length, 2, 'precond - two people records in the store');
    assert.true(Pat.hasDirtyAttributes, 'precond - record has dirty attributes');
    assert.true(Pat.isNew, 'precond - record is new');

    Pat.rollbackAttributes();

    assert.false(Pat.isDestroyed, 'record is not yet destroyed');
    assert.true(Pat.isDestroying, 'record is destroying');
    assert.strictEqual(friends.length, 0, 'Matt has no friends');
    assert.strictEqual(people.length, 1, 'precond - one person left in the store');

    await settled();

    assert.true(Pat.isDestroyed, 'record is destroyed');
    assert.true(Pat.isDestroying, 'record is destroying');
    assert.strictEqual(friends.length, 0, 'Matt has no friends');
    assert.strictEqual(people.length, 1, 'precond - one person left in the store');
  });

  test('Rolling Back Attributes on multiple New (related via async self-reflexive HasMany) Records unloads them safely', async function (assert) {
    const store = this.owner.lookup('service:store');
    const Pat = store.createRecord('person', { name: 'Patrick Wachter' });
    const Matt = store.createRecord('person', { name: 'Matthew Seidel', friends: [Pat] });
    const friends = Matt.hasMany('friends').value();
    const people = store.peekAll('person');

    assert.strictEqual(friends.length, 1, 'Matt has friends');
    assert.strictEqual(people.length, 2, 'precond - two people records in the store');
    assert.true(Matt.hasDirtyAttributes, 'precond - record has dirty attributes');
    assert.true(Matt.isNew, 'precond - record is new');
    assert.true(Pat.hasDirtyAttributes, 'precond - record has dirty attributes');
    assert.true(Pat.isNew, 'precond - record is new');

    Pat.rollbackAttributes();

    assert.false(Pat.isDestroyed, 'Pat record is not yet destroyed');
    assert.true(Pat.isDestroying, 'Pat record is destroying');
    assert.strictEqual(friends.length, 0, 'Matt has no friends');
    assert.strictEqual(people.length, 1, 'precond - one person left in the store');

    Matt.rollbackAttributes();
    assert.false(Matt.isDestroyed, 'Matt record is not yet destroyed');
    assert.true(Matt.isDestroying, 'Matt record is destroying');
    assert.strictEqual(people.length, 0, 'precond - no people left in the store');

    await settled();

    assert.true(Pat.isDestroyed, 'Pat record is destroyed');
    assert.true(Pat.isDestroying, 'Pat record is destroying');
    assert.true(Matt.isDestroyed, 'Matt record is destroyed');
    assert.true(Matt.isDestroying, 'Matt record is destroying');
    assert.strictEqual(people.length, 0, 'precond - no people left in the store');
  });

  test('Rolling Back Attributes on multiple New (related via async belongsTo with no inverse) Records unloads them safely', async function (assert) {
    const store = this.owner.lookup('service:store');
    const Pat = store.createRecord('person', { name: 'Patrick Wachter' });
    const Matt = store.createRecord('person', { name: 'Matthew Seidel', bestFriend: Pat });
    let bestFriend = Matt.belongsTo('bestFriend').value();
    const people = store.peekAll('person');

    assert.strictEqual(people.length, 2, 'precond - two people records in the store');
    assert.strictEqual(bestFriend, Pat, 'Matt has a best friend');
    assert.true(Matt.hasDirtyAttributes, 'precond - record has dirty attributes');
    assert.true(Matt.isNew, 'precond - record is new');
    assert.true(Pat.hasDirtyAttributes, 'precond - record has dirty attributes');
    assert.true(Pat.isNew, 'precond - record is new');

    Pat.rollbackAttributes();

    bestFriend = Matt.belongsTo('bestFriend').value();
    assert.strictEqual(bestFriend, null, 'Matt has no best friend');
    assert.false(Pat.isDestroyed, 'Pat record is not yet destroyed');
    assert.true(Pat.isDestroying, 'Pat record is destroying');
    assert.strictEqual(people.length, 1, 'precond - one person left in the store');

    Matt.rollbackAttributes();
    assert.false(Matt.isDestroyed, 'Matt record is not yet destroyed');
    assert.true(Matt.isDestroying, 'Matt record is destroying');
    assert.strictEqual(people.length, 0, 'precond - no people left in the store');

    await settled();

    assert.true(Pat.isDestroyed, 'Pat record is destroyed');
    assert.true(Pat.isDestroying, 'Pat record is destroying');
    assert.true(Matt.isDestroyed, 'Matt record is destroyed');
    assert.true(Matt.isDestroying, 'Matt record is destroying');
    assert.strictEqual(people.length, 0, 'precond - no people left in the store');
  });

  test('Unload on a New Record unloads that record safely', async function (assert) {
    const store = this.owner.lookup('service:store');
    const Matt = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Matthew Seidel',
        },
        relationships: {
          friends: {
            data: [],
          },
        },
      },
    });
    let Pat = store.createRecord('person', { name: 'Patrick Wachter' });
    const friends = Matt.hasMany('friends').value();
    friends.push(Pat);
    let people = store.peekAll('person');

    assert.strictEqual(friends.length, 1, 'Matt has friends');
    assert.strictEqual(people.length, 2, 'precond - two people records in the store');
    assert.true(Pat.hasDirtyAttributes, 'precond - record has dirty attributes');
    assert.true(Pat.isNew, 'precond - record is new');

    Pat.unloadRecord();

    assert.false(Pat.isDestroyed, 'record is not yet destroyed');
    assert.true(Pat.isDestroying, 'record is destroying');
    assert.strictEqual(friends.length, 0, 'Matt has no friends');
    assert.strictEqual(people.length, 1, 'precond - one person left in the store');

    await settled();

    assert.true(Pat.isDestroyed, 'record is destroyed');
    assert.true(Pat.isDestroying, 'record is destroying');
    assert.strictEqual(friends.length, 0, 'Matt has no friends');
    assert.strictEqual(people.length, 1, 'precond - one person left in the store');
  });

  testInDebug('Unload after a save that failed for missing data is safe', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    adapter.createRecord = () => Promise.resolve({ data: null });
    const Matt = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Matthew Seidel',
        },
        relationships: {
          friends: {
            data: [],
          },
        },
      },
    });
    let Pat = store.createRecord('person', { name: 'Patrick Wachter' });
    const friends = Matt.hasMany('friends').value();
    friends.push(Pat);
    let people = store.peekAll('person');

    assert.strictEqual(friends.length, 1, 'Matt has friends');
    assert.strictEqual(people.length, 2, 'precond - two people records in the store');
    assert.true(Pat.hasDirtyAttributes, 'precond - record has dirty attributes');
    assert.true(Pat.isNew, 'precond - record is new');

    try {
      await Pat.save();
      assert.ok(false, 'save failed');
    } catch (e) {
      assert.ok(true, 'save failed');
    }

    Pat.unloadRecord();

    assert.false(Pat.isDestroyed, 'after unload (sync): record is not yet destroyed');
    assert.true(Pat.isDestroying, 'after unload (sync): record is destroying');
    assert.strictEqual(friends.length, 0, 'after unload (sync): Matt has no friends');
    assert.strictEqual(people.length, 1, 'after unload (sync): one person left in the store');

    await settled();

    assert.true(Pat.isDestroyed, 'final: record is destroyed');
    assert.true(Pat.isDestroying, 'final: record is destroying');
    assert.strictEqual(friends.length, 0, 'final: Matt has no friends');
    assert.strictEqual(people.length, 1, 'final: one person left in the store');
  });

  testInDebug('Unload after a save that failed for missing id is safe', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    adapter.createRecord = () => Promise.resolve({ data: { type: 'person' } });
    const Matt = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Matthew Seidel',
        },
        relationships: {
          friends: {
            data: [],
          },
        },
      },
    });
    let Pat = store.createRecord('person', { name: 'Patrick Wachter' });
    const friends = Matt.hasMany('friends').value();
    friends.push(Pat);
    let people = store.peekAll('person');

    assert.strictEqual(friends.length, 1, 'Matt has friends');
    assert.strictEqual(people.length, 2, 'precond - two people records in the store');
    assert.true(Pat.hasDirtyAttributes, 'precond - record has dirty attributes');
    assert.true(Pat.isNew, 'precond - record is new');

    try {
      await Pat.save();
      assert.ok(false, 'save failed');
    } catch (e) {
      assert.ok(true, 'save failed');
    }

    Pat.unloadRecord();

    assert.false(Pat.isDestroyed, 'after unload (sync): record is not yet destroyed');
    assert.true(Pat.isDestroying, 'after unload (sync): record is destroying');
    assert.strictEqual(friends.length, 0, 'after unload (sync): Matt has no friends');
    assert.strictEqual(people.length, 1, 'after unload (sync): one person left in the store');

    await settled();

    assert.true(Pat.isDestroyed, 'final: record is destroyed');
    assert.true(Pat.isDestroying, 'final: record is destroying');
    assert.strictEqual(friends.length, 0, 'final: Matt has no friends');
    assert.strictEqual(people.length, 1, 'final: one person left in the store');
  });

  test('Unload after a failed save is safe', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    adapter.createRecord = () => Promise.reject(new Error('Invalid Data'));
    const Matt = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Matthew Seidel',
        },
        relationships: {
          friends: {
            data: [],
          },
        },
      },
    });
    let Pat = store.createRecord('person', { name: 'Patrick Wachter' });
    const friends = Matt.hasMany('friends').value();
    friends.push(Pat);
    let people = store.peekAll('person');

    assert.strictEqual(friends.length, 1, 'Matt has friends');
    assert.strictEqual(people.length, 2, 'precond - two people records in the store');
    assert.true(Pat.hasDirtyAttributes, 'precond - record has dirty attributes');
    assert.true(Pat.isNew, 'precond - record is new');

    try {
      await Pat.save();
      assert.ok(false, 'save failed');
    } catch (e) {
      assert.ok(true, 'save failed');
    }

    Pat.unloadRecord();

    assert.false(Pat.isDestroyed, 'after unload (sync): record is not yet destroyed');
    assert.true(Pat.isDestroying, 'after unload (sync): record is destroying');
    assert.strictEqual(friends.length, 0, 'after unload (sync): Matt has no friends');
    assert.strictEqual(people.length, 1, 'after unload (sync): one person left in the store');

    await settled();

    assert.true(Pat.isDestroyed, 'final: record is destroyed');
    assert.true(Pat.isDestroying, 'final: record is destroying');
    assert.strictEqual(friends.length, 0, 'final: Matt has no friends');
    assert.strictEqual(people.length, 1, 'final: one person left in the store');
  });

  test('Unload after a save is safe', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    adapter.createRecord = () => Promise.resolve({ data: { type: 'person', id: '2' } });
    const Matt = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Matthew Seidel',
        },
        relationships: {
          friends: {
            data: [],
          },
        },
      },
    });
    let Pat = store.createRecord('person', { name: 'Patrick Wachter' });
    const friends = Matt.hasMany('friends').value();
    friends.push(Pat);
    let people = store.peekAll('person');

    assert.strictEqual(friends.length, 1, 'Matt has friends');
    assert.strictEqual(people.length, 2, 'precond - two people records in the store');
    assert.true(Pat.hasDirtyAttributes, 'precond - record has dirty attributes');
    assert.true(Pat.isNew, 'precond - record is new');

    try {
      await Pat.save();
      assert.ok(true, 'save succeeded');
    } catch (e) {
      assert.ok(false, 'save succeeded');
    }

    assert.strictEqual(friends.length, 1, 'after save: Matt has friends');
    assert.strictEqual(people.length, 2, 'after save: two people records in the store');
    assert.false(Pat.hasDirtyAttributes, 'after save: record is clean');
    assert.false(Pat.isNew, 'after save: record is not new');

    Pat.unloadRecord();

    assert.false(Pat.isDestroyed, 'after unload (sync): record is not yet destroyed');
    assert.true(Pat.isDestroying, 'after unload (sync): record is destroying');
    assert.strictEqual(friends.length, 0, 'after unload (sync): Matt has no friends');
    assert.strictEqual(people.length, 1, 'after unload (sync): one person left in the store');

    await settled();

    assert.true(Pat.isDestroyed, 'final: record is destroyed');
    assert.true(Pat.isDestroying, 'final: record is destroying');
    assert.strictEqual(friends.length, 0, 'final: Matt has no friends');
    assert.strictEqual(people.length, 1, 'final: one person left in the store');
  });

  test('Unload after a save is safe (no access after save before unload)', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    adapter.createRecord = () => Promise.resolve({ data: { type: 'person', id: '2' } });
    const Matt = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Matthew Seidel',
        },
        relationships: {
          friends: {
            data: [],
          },
        },
      },
    });
    let Pat = store.createRecord('person', { name: 'Patrick Wachter' });
    const friends = Matt.hasMany('friends').value();
    friends.push(Pat);
    let people = store.peekAll('person');

    assert.strictEqual(friends.length, 1, 'Matt has friends');
    assert.strictEqual(people.length, 2, 'precond - two people records in the store');
    assert.true(Pat.hasDirtyAttributes, 'precond - record has dirty attributes');
    assert.true(Pat.isNew, 'precond - record is new');

    try {
      await Pat.save();
      assert.ok(true, 'save succeeded');
    } catch (e) {
      assert.ok(false, 'save succeeded');
    }

    Pat.unloadRecord();

    assert.false(Pat.isDestroyed, 'after unload (sync): record is not yet destroyed');
    assert.true(Pat.isDestroying, 'after unload (sync): record is destroying');
    assert.strictEqual(friends.length, 0, 'after unload (sync): Matt has no friends');
    assert.strictEqual(people.length, 1, 'after unload (sync): one person left in the store');

    await settled();

    assert.true(Pat.isDestroyed, 'final: record is destroyed');
    assert.true(Pat.isDestroying, 'final: record is destroying');
    assert.strictEqual(friends.length, 0, 'final: Matt has no friends');
    assert.strictEqual(people.length, 1, 'final: one person left in the store');
  });
});
