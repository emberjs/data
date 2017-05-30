import {createStore} from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

const { get, run } = Ember;
let store, tryToFind, Record;

module('unit/store/unload - Store unloading records', {
  beforeEach() {

    Record = DS.Model.extend({
      title: DS.attr('string'),
      wasFetched: DS.attr('boolean')
    });

    Record.reopenClass({
      toString() {
        return 'Record';
      }
    });

    store = createStore({
      adapter: DS.Adapter.extend({
        findRecord(store, type, id, snapshot) {
          tryToFind = true;
          return Ember.RSVP.resolve({ data: { id, type: snapshot.modelName, attributes: { 'was-fetched': true } } });
        }
      }),

      record: Record
    });
  },

  afterEach() {
    Ember.run(store, 'destroy');
  }
});

testInDebug('unload a dirty record asserts', function(assert) {
  assert.expect(2);

  run(() => {
    store.push({
      data: {
        type: 'record',
        id: '1',
        attributes: {
          title: 'toto'
        }
      }
    });

    let record = store.peekRecord('record', 1);

    record.set('title', 'toto2');
    record._internalModel.send('willCommit');

    assert.equal(get(record, 'hasDirtyAttributes'), true, "record is dirty");

    assert.expectAssertion(function() {
      record.unloadRecord();
    }, 'You can only unload a record which is not inFlight. `' + record._internalModel.toString() + '`', 'can not unload dirty record');

    // force back into safe to unload mode.
    run(() => {
      record._internalModel.transitionTo('deleted.saved');
    });
  });
});

test('unload a record', function(assert) {
  assert.expect(2);

  return run(() => {
    store.push({
      data: {
        type: 'record',
        id: '1',
        attributes: {
          title: 'toto'
        }
      }
    });

    return store.findRecord('record', 1).then(record => {
      assert.equal(get(record, 'id'), 1, 'found record with id 1');

      run(() => store.unloadRecord(record));

      tryToFind = false;

      return store.findRecord('record', 1).then(() => {
        assert.equal(tryToFind, true, 'not found record with id 1');
      });
    });
  });
});

module("DS.Store - unload record with relationships");

test('can commit store after unload record with relationships', function(assert) {
  assert.expect(1);

  const Brand = DS.Model.extend({
    name: DS.attr('string')
  });

  Brand.reopenClass({
    toString() {
      return 'Brand';
    }
  });

  const Product = DS.Model.extend({
    description: DS.attr('string'),
    brand: DS.belongsTo('brand', {
      async: false
    })
  });

  Product.reopenClass({
    toString() {
      return 'Product';
    }
  });

  const Like = DS.Model.extend({
    product: DS.belongsTo('product', {
      async: false
    })
  });

  Like.reopenClass({
    toString() {
      return 'Like';
    }
  });

  let store = createStore({
    adapter: DS.Adapter.extend({
      findRecord(store, type, id, snapshot) {
        return Ember.RSVP.resolve({
          data: {
            id: 1,
            type: snapshot.modelName,
            attributes: {
              description: 'cuisinart',
              brand: 1
            }
          }
        });
      },

      createRecord(store, type, snapshot) {
        return Ember.RSVP.resolve();
      }
    }),
    brand: Brand,
    product: Product,
    like: Like
  });

  return run(() => {
    store.push({
      data: [
        {
          type: 'brand',
          id: '1',
          attributes: {
            name: 'EmberJS'
          }
        },
        {
          type: 'product',
          id: '1',
          attributes: {
            description: 'toto'
          },
          relationships: {
            brand: {
              data: { type: 'brand', id: '1' }
            }
          }
        }]
    });

    let product = store.peekRecord('product', 1);
    let like = store.createRecord('like', { id: 1, product: product });

    return like.save();
  }).then(() => {
    // TODO: this is strange, future travelers please address
    Ember.run(() => store.unloadRecord(store.peekRecord('product', 1)));
  }).then(() => {
    return store.findRecord('product', 1);
  }).then(product => {
    assert.equal(product.get('description'), 'cuisinart', "The record was unloaded and the adapter's `findRecord` was called");
  });
});
