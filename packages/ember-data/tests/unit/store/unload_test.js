var get = Ember.get;
var store, tryToFind, Record;

module("unit/store/unload - Store unloading records", {
  setup: function() {
    store = createStore({ adapter: DS.Adapter.extend({
        find: function(store, type, id) {
          tryToFind = true;
          return Ember.RSVP.resolve({ id: id, wasFetched: true });
        }
      })
    });

    Record = DS.Model.extend({
      title: DS.attr('string')
    });
  },

  teardown: function() {
    Ember.run(store, 'destroy');
  }
});

test("unload a dirty record", function() {
  store.push(Record, {
    id: 1,
    title: 'toto'
  });

  store.find(Record, 1).then(async(function(record) {
    record.set('title', 'toto2');

    record.send('willCommit');
    equal(get(record, 'isDirty'), true, "record is dirty");

    expectAssertion(function() {
      record.unloadRecord();
    }, "You can only unload a record which is not inFlight. `" + Ember.inspect(record) + "`", "can not unload dirty record");

    // force back into safe to unload mode.
    record.transitionTo('deleted.saved');
  }));
});

test("unload a record", function() {
  store.push(Record, {id: 1, title: 'toto'});

  store.find(Record, 1).then(async(function(record) {
    equal(get(record, 'id'), 1, "found record with id 1");
    equal(get(record, 'isDirty'), false, "record is not dirty");

    store.unloadRecord(record);

    equal(get(record, 'isDirty'), false, "record is not dirty");
    equal(get(record, 'isDeleted'), true, "record is deleted");

    tryToFind = false;
    store.find(Record, 1).then(async(function(){
      equal(tryToFind, true, "not found record with id 1");
    }));
  }));
});

module("DS.Store - unload record with relationships");


test("can commit store after unload record with relationships", function() {
  store = createStore({ adapter: DS.Adapter.extend({
      find: function() {
        return Ember.RSVP.resolve({ id: 1, description: 'cuisinart', brand: 1 });
      },
      createRecord: function(store, type, record) {
        return Ember.RSVP.resolve();
      }
    })
  });

  var like, product;

  var Brand = DS.Model.extend({
    name: DS.attr('string')
  });

  var Product = DS.Model.extend({
    description: DS.attr('string'),
    brand: DS.belongsTo(Brand)
  });

  var Like = DS.Model.extend({
    product: DS.belongsTo(Product)
  });

  store.push(Brand, { id: 1, name: 'EmberJS' });
  store.push(Product, { id: 1, description: 'toto', brand: 1 });

  var asyncRecords = Ember.RSVP.hash({
    brand: store.find(Brand, 1),
    product: store.find(Product, 1)
  });

  asyncRecords.then(async(function(records) {
    like = store.createRecord(Like, { id: 1, product: product });
    records.like = like.save();
    return Ember.RSVP.hash(records);
  })).then(async(function(records) {
    store.unloadRecord(records.product);

    return store.find(Product, 1);
  })).then(async(function(product) {
    equal(product.get('description'), 'cuisinart', "The record was unloaded and the adapter's `find` was called");
    store.destroy();
  }));
});
