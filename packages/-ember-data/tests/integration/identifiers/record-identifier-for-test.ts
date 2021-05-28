import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr } from '@ember-data/model';
import Store, { recordIdentifierFor } from '@ember-data/store';

module('Integration | Identifiers - recordIdentifierFor', function (hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register(`service:store`, Store);

    class User extends Model {
      @attr() name;
    }

    owner.register('model:user', User);
    store = owner.lookup('service:store');
  });

  test(`It works for newly created records`, async function (assert) {
    const record = store.createRecord('user', { name: 'Chris' });
    assert.strictEqual(record.name, 'Chris', 'We created a record');
    const identifier = recordIdentifierFor(record);

    assert.strictEqual(identifier.type, 'user', 'We have an identifier with the right type');
    assert.strictEqual(identifier.id, null, 'We have an identifier without an id');
    assert.ok(typeof identifier.lid === 'string' && identifier.lid.length > 0, 'We have an identifier with an lid');
  });

  test(`Saving newly created records updates the associated id on the identifier`, async function (assert) {
    class TestAdapter extends Adapter {
      createRecord() {
        return resolve({
          data: {
            type: 'user',
            id: '1',
            attributes: {
              name: '@runspired',
            },
          },
        });
      }
    }
    class TestSerializer extends EmberObject {
      normalizeResponse(_, __, payload) {
        return payload;
      }
    }
    this.owner.register('adapter:application', TestAdapter);
    this.owner.register('serializer:application', TestSerializer);
    const record = store.createRecord('user', { name: 'Chris' });
    assert.strictEqual(record.name, 'Chris', 'We created a record');
    const identifier = recordIdentifierFor(record);

    assert.strictEqual(identifier.type, 'user', 'We have an identifier with the right type');
    assert.strictEqual(identifier.id, null, 'We have an identifier without an id');
    assert.ok(typeof identifier.lid === 'string' && identifier.lid.length > 0, 'We have an identifier with an lid');

    await record.save();

    assert.strictEqual(record.name, '@runspired', 'We saved the record');

    assert.strictEqual(identifier.type, 'user', 'We have an identifier with the right type');
    assert.strictEqual(identifier.id, '1', 'We updated the identifier with the correct id');
    assert.ok(typeof identifier.lid === 'string' && identifier.lid.length > 0, 'We have an identifier with an lid');
  });

  test(`It works for existing records`, async function (assert) {
    const record = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
      },
    });
    assert.strictEqual(record.name, 'Chris', 'We created a record');
    const identifier = recordIdentifierFor(record);

    assert.strictEqual(identifier.type, 'user', 'We have an identifier with the right type');
    assert.strictEqual(identifier.id, '1', 'We have an identifier with the correct id');
    assert.ok(typeof identifier.lid === 'string' && identifier.lid.length > 0, 'We have an identifier with an lid');
  });

  // TODO should it also work for promiseRecord and promiseBelongsTo ?
});
