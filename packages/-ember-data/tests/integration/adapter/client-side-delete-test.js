import { resolve } from 'rsvp';
import { run } from '@ember/runloop';
import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';

import Adapter from '@ember-data/adapter';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Model, { belongsTo, hasMany } from '@ember-data/model';

module('integration/adapter/store-adapter - client-side delete', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  test('client-side deleted records can be added back from an inverse', async function(assert) {
    const Bookstore = Model.extend({
      books: hasMany('book', { async: false, inverse: 'bookstore' }),
    });

    const Book = Model.extend({
      bookstore: belongsTo('bookstore', { inverse: 'books' }),
    });

    this.owner.register('model:bookstore', Bookstore);
    this.owner.register('model:book', Book);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function(store, modelClass, snapshot) {
      if (snapshot.adapterOptions.clientSideDelete) {
        return resolve();
      }

      assert.ok(false, 'unreachable');
    };

    let bookstore = store.push({
      data: {
        id: '1',
        type: 'bookstore',
        relationships: {
          books: {
            data: [
              {
                id: '1',
                type: 'book',
              },
              {
                id: '2',
                type: 'book',
              },
            ],
          },
        },
      },
      included: [
        {
          id: '1',
          type: 'book',
        },
        {
          id: '2',
          type: 'book',
        },
      ],
    });

    assert.deepEqual(bookstore.get('books').mapBy('id'), ['1', '2'], 'initial hasmany loaded');

    let book2 = store.peekRecord('book', '2');

    await book2.destroyRecord({ adapterOptions: { clientSideDelete: true } });

    run(() => book2.unloadRecord());

    await settled();

    assert.equal(store.hasRecordForId('book', '2'), false, 'book 2 unloaded');
    assert.deepEqual(bookstore.get('books').mapBy('id'), ['1'], 'one book client-side deleted');

    store.push({
      data: {
        id: '2',
        type: 'book',
        relationships: {
          bookstore: {
            data: {
              id: '1',
              type: 'bookstore',
            },
          },
        },
      },
    });

    assert.deepEqual(
      bookstore.get('books').mapBy('id'),
      ['1', '2'],
      'the deleted book (with same id) is pushed back into the store'
    );
  });
});
