import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

const { attr, belongsTo } = DS;

let store;

const Book = DS.Model.extend({
  title: attr(),
  author: belongsTo('person', { polymorphic: true, async: false })
});

const Author = DS.Model.extend({
  name: attr()
});

const AsyncBook = DS.Model.extend({
  author: belongsTo('person', { polymorphic: true })
});

module('integration/polymorphic-belongs-to - Polymorphic BelongsTo', {
  beforeEach() {
    let env = setupStore({
      book: Book,
      author: Author,
      'async-book': AsyncBook,
      person: DS.Model.extend()
    });
    store = env.store;
  },

  afterEach() {
    run(store, 'destroy');
  }
});


test('using store.push with a null value for a payload in relationships sets the Models relationship to null - sync relationship', (assert) => {
  let payload = {
    data: {
      type: 'book',
      id: 1,
      title: 'Yes, Please',
      relationships: {
        author: {
          data: {
            type: 'author',
            id: 1
          }
        }
      }
    },
    included: [
      {
        id: 1,
        name: 'Amy Poehler',
        type: 'author'
      }
    ]
  };

  let book = run(() => {
    store.push(payload);
    return store.peekRecord('book', 1);
  });

  assert.equal(book.get('author.id'), 1);

  let payloadThatResetsBelongToRelationship = {
    data: {
      type: 'book',
      id: 1,
      title: 'Yes, Please',
      relationships: {
        author: {
          data: null
        }
      }
    }
  };

  run(() => store.push(payloadThatResetsBelongToRelationship));
  assert.equal(book.get('author'), null);
});

test('using store.push with a null value for a payload in relationships sets the Models relationship to null - async relationship', (assert) => {
  let payload = {
    data: {
      type: 'async-book',
      id: 1,
      title: 'Yes, Please',
      relationships: {
        author: {
          data: {
            type: 'author',
            id: 1
          }
        }
      }
    },
    included: [
      {
        id: 1,
        name: 'Amy Poehler',
        type: 'author'
      }
    ]
  };

  let book = run(() => {
    store.push(payload);
    return store.peekRecord('async-book', 1);
  });

  let payloadThatResetsBelongToRelationship = {
    data: {
      type: 'async-book',
      id: 1,
      title: 'Yes, Please',
      relationships: {
        author: {
          data: null
        }
      }
    }
  };

  return book.get('author').then(author => {
    assert.equal(author.get('id'), 1);
    run(() => store.push(payloadThatResetsBelongToRelationship));
    return book.get('author');
  }).then(author => {
    assert.equal(author, null);
  });
});
