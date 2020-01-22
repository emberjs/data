import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo } from '@ember-data/model';

module('integration/polymorphic-belongs-to - Polymorphic BelongsTo', function(hooks) {
  setupTest(hooks);
  let store;

  hooks.beforeEach(function() {
    let { owner } = this;
    class Book extends Model {
      @attr()
      title;

      @belongsTo('person', { polymorphic: true, async: false })
      author;
    }

    class Author extends Model {
      @attr()
      name;
    }

    class Person extends Model {}

    class AsyncBook extends Model {
      @belongsTo('person', { polymorphic: true })
      author;
    }
    owner.register('model:book', Book);
    owner.register('model:author', Author);
    owner.register('model:person', Person);
    owner.register('model:async-book', AsyncBook);

    store = owner.lookup('service:store');
  });

  test('using store.push with a null value for a payload in relationships sets the Models relationship to null - sync relationship', assert => {
    let payload = {
      data: {
        type: 'book',
        id: 1,
        title: 'Yes, Please',
        relationships: {
          author: {
            data: {
              type: 'author',
              id: 1,
            },
          },
        },
      },
      included: [
        {
          id: 1,
          name: 'Amy Poehler',
          type: 'author',
        },
      ],
    };

    store.push(payload);
    let book = store.peekRecord('book', 1);
    assert.equal(book.get('author.id'), 1);

    let payloadThatResetsBelongToRelationship = {
      data: {
        type: 'book',
        id: 1,
        title: 'Yes, Please',
        relationships: {
          author: {
            data: null,
          },
        },
      },
    };

    store.push(payloadThatResetsBelongToRelationship);
    assert.strictEqual(book.get('author'), null);
  });

  test('using store.push with a null value for a payload in relationships sets the Models relationship to null - async relationship', assert => {
    let payload = {
      data: {
        type: 'async-book',
        id: 1,
        title: 'Yes, Please',
        relationships: {
          author: {
            data: {
              type: 'author',
              id: 1,
            },
          },
        },
      },
      included: [
        {
          id: 1,
          name: 'Amy Poehler',
          type: 'author',
        },
      ],
    };

    store.push(payload);
    let book = store.peekRecord('async-book', 1);

    let payloadThatResetsBelongToRelationship = {
      data: {
        type: 'async-book',
        id: 1,
        title: 'Yes, Please',
        relationships: {
          author: {
            data: null,
          },
        },
      },
    };

    return book
      .get('author')
      .then(author => {
        assert.equal(author.get('id'), 1);
        store.push(payloadThatResetsBelongToRelationship);
        return book.get('author');
      })
      .then(author => {
        assert.strictEqual(author, null);
      });
  });
});
