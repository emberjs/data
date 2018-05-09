import { resolve } from 'rsvp';
import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

module('integration/adapter/store-adapter - client-side delete', {
  beforeEach() {
    this.Bookstore = DS.Model.extend({
      books: DS.hasMany('book', { async: false, inverse: 'bookstore' }),
    });
    this.Book = DS.Model.extend({
      bookstore: DS.belongsTo('bookstore', { inverse: 'books' }),
    });

    this.env = setupStore({
      bookstore: this.Bookstore,
      book: this.Book,
    });
    this.store = this.env.store;
    this.adapter = this.env.adapter;
  },

  afterEach() {
    run(this.env.container, 'destroy');
  },
});

test('client-side deleted records can be added back from an inverse', function(assert) {
  this.adapter.deleteRecord = function(store, modelClass, snapshot) {
    if (snapshot.adapterOptions.clientSideDelete) {
      return resolve();
    }

    assert.ok(false, 'unreachable');
  };

  run(() =>
    this.store.push({
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
    })
  );

  let bookstore = this.store.peekRecord('bookstore', '1');
  assert.deepEqual(bookstore.get('books').mapBy('id'), ['1', '2'], 'initial hasmany loaded');

  let book2 = this.store.peekRecord('book', '2');
  return run(() => book2.destroyRecord({ adapterOptions: { clientSideDelete: true } })).then(() => {
    run(() => book2.unloadRecord());
    assert.equal(this.store.hasRecordForId('book', '2'), false, 'book 2 unloaded');
    assert.deepEqual(bookstore.get('books').mapBy('id'), ['1'], 'one book client-side deleted');

    run(() =>
      this.store.push({
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
      })
    );

    assert.deepEqual(
      bookstore.get('books').mapBy('id'),
      ['1', '2'],
      'the deleted book (with same id) is pushed back into the store'
    );
  });
});
