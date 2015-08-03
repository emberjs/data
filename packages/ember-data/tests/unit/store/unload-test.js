var get = Ember.get;
var run = Ember.run;
var store, tryToFind, Record;

module("unit/store/unload - Store unloading records", {
  setup: function() {

    Record = DS.Model.extend({
      title: DS.attr('string'),
      wasFetched: DS.attr('boolean')
    });
    store = createStore({
      adapter: DS.Adapter.extend({
        findRecord: function(store, type, id, snapshot) {
          tryToFind = true;
          return Ember.RSVP.resolve({ id: id, wasFetched: true });
        }
      }),
      record: Record
    });
  },

  teardown: function() {
    Ember.run(store, 'destroy');
  }
});

test("unload a dirty record", function() {
  expect(2);

  run(function() {
    store.push({
      data: {
        type: 'record',
        id: '1',
        attributes: {
          title: 'toto'
        }
      }
    });

    store.findRecord('record', 1).then(function(record) {
      record.set('title', 'toto2');
      record._internalModel.send('willCommit');

      equal(get(record, 'hasDirtyAttributes'), true, "record is dirty");

      expectAssertion(function() {
        record.unloadRecord();
      }, "You can only unload a record which is not inFlight. `" + Ember.inspect(record) + "`", "can not unload dirty record");

      // force back into safe to unload mode.
      run(function() {
        record._internalModel.transitionTo('deleted.saved');
      });
    });
  });
});

test("unload a record", function() {
  expect(5);

  run(function() {
    store.push({
      data: {
        type: 'record',
        id: '1',
        attributes: {
          title: 'toto'
        }
      }
    });
    store.findRecord('record', 1).then(function(record) {
      equal(get(record, 'id'), 1, "found record with id 1");
      equal(get(record, 'hasDirtyAttributes'), false, "record is not dirty");

      run(function() {
        store.unloadRecord(record);
      });

      equal(get(record, 'hasDirtyAttributes'), false, "record is not dirty");
      equal(get(record, 'isDeleted'), true, "record is deleted");

      tryToFind = false;
      return store.findRecord('record', 1).then(function() {
        equal(tryToFind, true, "not found record with id 1");
      });
    });
  });
});

module("DS.Store - unload record with relationships");


test("can commit store after unload record with relationships", function() {
  expect(1);

  var like, product;

  var Brand = DS.Model.extend({
    name: DS.attr('string')
  });

  var Product = DS.Model.extend({
    description: DS.attr('string'),
    brand: DS.belongsTo('brand', { async: false })
  });

  var Like = DS.Model.extend({
    product: DS.belongsTo('product', { async: false })
  });

  var store = createStore({
    adapter: DS.Adapter.extend({
      findRecord: function(store, type, id, snapshot) {
        return Ember.RSVP.resolve({ id: 1, description: 'cuisinart', brand: 1 });
      },
      createRecord: function(store, type, snapshot) {
        return Ember.RSVP.resolve();
      }
    }),
    brand: Brand,
    product: Product,
    like: Like
  });
  var asyncRecords;

  run(function() {
    store.push({
      data: [{
        type: 'brand',
        id: '1',
        attributes: {
          name: 'EmberJS'
        }
      }, {
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

    asyncRecords = Ember.RSVP.hash({
      brand: store.findRecord('brand', 1),
      product: store.findRecord('product', 1)
    });
    asyncRecords.then(function(records) {
      like = store.createRecord('like', { id: 1, product: product });
      records.like = like.save();
      return Ember.RSVP.hash(records);
    }).then(function(records) {
      store.unloadRecord(records.product);
      return store.findRecord('product', 1);
    }).then(function(product) {
      equal(product.get('description'), 'cuisinart', "The record was unloaded and the adapter's `findRecord` was called");
      store.destroy();
    });
  });
});
