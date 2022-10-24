import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/adapter/store-adapter - client-side delete', function (hooks) {
  setupTest(hooks);

  test('client-side deleted records can be added back from an inverse', async function (assert) {
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    class Bookstore extends Model {
      @attr name;
      @hasMany('book', { async: false, inverse: 'bookstore' }) books;
    }

    class Book extends Model {
      @attr name;
      @belongsTo('bookstore', { async: true, inverse: 'books' }) bookstore;
    }

    this.owner.register('model:bookstore', Bookstore);
    this.owner.register('model:book', Book);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function (_store, _modelClass, snapshot) {
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

    assert.deepEqual(
      bookstore.books.map((book) => book.id),
      ['1', '2'],
      'initial hasmany loaded'
    );

    let book2 = store.peekRecord('book', '2');

    await book2.destroyRecord({ adapterOptions: { clientSideDelete: true } });

    assert.strictEqual(store.peekRecord('book', '2'), null, 'book 2 unloaded');
    assert.deepEqual(
      bookstore.books.map((book) => book.id),
      ['1'],
      'one book client-side deleted'
    );

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
      bookstore.books.map((book) => book.id),
      ['1', '2'],
      'the deleted book (with same id) is pushed back into the store'
    );
  });
});
