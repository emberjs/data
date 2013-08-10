var get = Ember.get, set = Ember.set;
var store, tryToFind, Record;

module("unit/store/unload - Store unloading records", {
  setup: function() {
    store = DS.Store.create({
      adapter: DS.Adapter.create({
        find: function() {
          tryToFind = true;
        }
      })
    });

    Record = DS.Model.extend({
      title: DS.attr('string')
    });
  },

  teardown: function() {
    store.destroy();
  }
});

test("unload a dirty record", function() {
  store.push(Record, {id: 1, title: 'toto'});

  var record = store.find(Record, 1);
  record.set('title', 'toto2');

  equal(get(record, 'isDirty'), true, "record is dirty");
  expectAssertion(function() {
    record.unloadRecord();
  }, "You can only unload a loaded, non-dirty record.", "can not unload dirty record");
});

test("unload a record", function() {
  store.push(Record, {id: 1, title: 'toto'});

  var record = store.find(Record, 1);
  equal(get(record, 'id'), 1, "found record with id 1");
  equal(get(record, 'isDirty'), false, "record is not dirty");

  store.unloadRecord(record);

  equal(get(record, 'isDirty'), false, "record is not dirty");
  equal(get(record, 'isDeleted'), true, "record is deleted");

  tryToFind = false;
  store.find(Record, 1);
  equal(tryToFind, true, "not found record with id 1");

});

module("DS.Store - unload record with relationships");

test("can commit store after unload record with relationships", function() {
  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      find: function() {
        tryToFind = true;
      },
      createRecord: function(store, type, record) {
        this.didCreateRecord(store, type, record);
      }
    })
  });

  var like, product, brand;

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
  brand = store.find(Brand, 1);

  store.push(Product, { id: 1, description: 'toto', brand: 1 });
  product = store.find(Product, 1);

  like = store.createRecord(Like, { id: 1, product: product });
  store.commit();

  store.unloadRecord(product);
  // can commit because `product` is not in transactionBucketTypes
  store.commit();

  tryToFind = false;
  product = store.find(Product, 1);
  ok(tryToFind, "not found record with id 1");

  store.destroy();
});
