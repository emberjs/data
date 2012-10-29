var get = Ember.get, set = Ember.set;

var Person, store, array, recordArray;

var shouldContain = function(array, item) {
  ok(array.indexOf(item) !== -1, "array should contain "+item.get('name'));
};

var shouldNotContain = function(array, item) {
  ok(array.indexOf(item) === -1, "array should not contain "+item.get('name'));
};

module("DS.Model updating", {
  setup: function() {
    store = DS.Store.create();
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });
  },
  teardown: function() {
    store.destroy();
    Person = null;
    array = null;
  }
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  store.loadMany(Person, array);

  var people = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Katz$/)) { return true; }
  });

  equal(get(people, 'length'), 1, "precond - one item is in the RecordArray");

  var person = people.objectAt(0);

  equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  set(person, 'name', "Yehuda Katz");

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  set(person, 'name', "Yehuda Katz-Foo");

  equal(get(people, 'length'), 0, "there are now no items");
});

test("a record array can have a filter on it", function() {
  store.loadMany(Person, array);

  var recordArray = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(recordArray, 'length'), 2, "The Record Array should have the filtered objects on it");

  store.load(Person, { id: 4, name: "Scumbag Koz" });

  equal(get(recordArray, 'length'), 3, "The Record Array should be updated as new items are added to the store");

  store.load(Person, { id: 1, name: "Scumbag Tom" });

  equal(get(recordArray, 'length'), 2, "The Record Array should be updated as existing members are updated");
});

test("a filtered record array includes created elements", function() {
  store.loadMany(Person, array);

  var recordArray = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(recordArray, 'length'), 2, "precond - The Record Array should have the filtered objects on it");

  store.createRecord(Person, { name: "Scumbag Koz" });

  equal(get(recordArray, 'length'), 3, "The record array has the new object on it");
});

test("a Record Array can update its filter", function() {
  set(store, 'adapter', DS.Adapter.create({
    deleteRecord: function(store, type, record) {
      store.didSaveRecord(record);
    }
  }));

  store.loadMany(Person, array);

  var dickens = store.createRecord(Person, { id: 4, name: "Scumbag Dickens" });
  dickens.deleteRecord();
  store.commit();

  var dale = store.find(Person, 1);
  var katz = store.find(Person, 2);
  var bryn = store.find(Person, 3);

  var recordArray = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  shouldContain(recordArray, dale);
  shouldContain(recordArray, katz);
  shouldNotContain(recordArray, bryn);
  shouldNotContain(recordArray, dickens);

  recordArray.set('filterFunction', function(hash) {
    if (hash.get('name').match(/Katz/)) { return true; }
  });

  equal(get(recordArray, 'length'), 1, "The Record Array should have one object on it");

  store.load(Person, 5, { name: "Other Katz" });

  equal(get(recordArray, 'length'), 2, "The Record Array now has the new object matching the filter");

  store.load(Person, 6, { name: "Scumbag Demon" });

  equal(get(recordArray, 'length'), 2, "The Record Array doesn't have objects matching the old filter");
});

test("a Record Array can update its filter and notify array observers", function() {
  set(store, 'adapter', DS.Adapter.create({
    deleteRecord: function(store, type, record) {
      store.didSaveRecord(record);
    }
  }));

  store.loadMany(Person, array);

  var dickens = store.createRecord(Person, { id: 4, name: "Scumbag Dickens" });
  dickens.deleteRecord();
  store.commit();

  var dale = store.find(Person, 1);
  var katz = store.find(Person, 2);
  var bryn = store.find(Person, 3);

  var recordArray = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  var didChangeIdx, didChangeRemoved = 0, didChangeAdded = 0;

  var arrayObserver = {
    arrayWillChange: Ember.K,

    arrayDidChange: function(array, idx, removed, added) {
      didChangeIdx = idx;
      didChangeRemoved += removed;
      didChangeAdded += added;
    }
  };

  recordArray.addArrayObserver(arrayObserver);

  recordArray.set('filterFunction', function(hash) {
    if (hash.get('name').match(/Katz/)) { return true; }
  });

  equal(didChangeRemoved, 1, "removed one item from array");
  didChangeRemoved = 0;

  store.load(Person, 5, { name: "Other Katz" });

  equal(didChangeAdded, 1, "one item was added");
  didChangeAdded = 0;

  equal(recordArray.objectAt(didChangeIdx).get('name'), "Other Katz");

  store.load(Person, 6, { name: "Scumbag Demon" });

  equal(didChangeAdded, 0, "did not get called when an object that doesn't match is added");

  recordArray.set('filterFunction', function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  equal(didChangeAdded, 2, "one item is added when going back");
  equal(recordArray.objectAt(didChangeIdx).get('name'), "Scumbag Demon");
  equal(recordArray.objectAt(didChangeIdx-1).get('name'), "Scumbag Dale");
});

test("it is possible to filter by computed properties", function() {
  Person = DS.Model.extend({
    name: DS.attr('string'),
    upperName: Ember.computed(function() {
      return this.get('name').toUpperCase();
    }).property('name')
  });

  var filter = store.filter(Person, function(person) {
    return person.get('upperName') === "TOM DALE";
  });

  equal(filter.get('length'), 0, "precond - the filter starts empty");

  store.load(Person, { id: 1, name: "Tom Dale" });

  equal(filter.get('length'), 1, "the filter now has a record in it");

  var person = store.find(Person, 1);
  person.set('name', "Yehuda Katz");

  equal(filter.get('length'), 0, "the filter is empty again");
});

test("a filter created after a record is already loaded works", function() {
  Person = DS.Model.extend({
    name: DS.attr('string'),
    upperName: Ember.computed(function() {
      return this.get('name').toUpperCase();
    }).property('name')
  });

  store.load(Person, { id: 1, name: "Tom Dale" });

  var filter = store.filter(Person, function(person) {
    return person.get('upperName') === "TOM DALE";
  });

  equal(filter.get('length'), 1, "the filter now has a record in it");
  equal(filter.objectAt(0), store.find(Person, 1));
});

test("it is possible to filter by state flags", function() {
  set(store, 'adapter', DS.Adapter.create({
    find: Ember.K
  }));

  var filter = store.filter(Person, function(person) {
    return person.get('isLoaded');
  });

  equal(filter.get('length'), 0, "precond - there are no records yet");

  store.find(Person, 1);

  equal(filter.get('length'), 0, "the unloaded record isn't in the filter");

  store.load(Person, { id: 1, name: "Tom Dale" });

  equal(filter.get('length'), 1, "the now-loaded record is in the filter");
  equal(filter.objectAt(0), store.find(Person, 1));
});

test("it is possible to filter loaded records by dirtiness", function() {
  set(store, 'adapter', DS.Adapter.create({
    updateRecord: Ember.K
  }));

  var filter = store.filter(Person, function(person) {
    return !person.get('isDirty');
  });

  store.load(Person, { id: 1, name: "Tom Dale" });
  var person = store.find(Person, 1);

  equal(filter.get('length'), 1, "the clean record is in the filter");

  person.set('name', "Yehuda Katz");

  equal(filter.get('length'), 0, "the now-dirty record is not in the filter");

  store.commit();
  store.didSaveRecord(person);

  equal(filter.get('length'), 1, "the clean record is back in the filter");
});

test("it is possible to filter created records by dirtiness", function() {
  set(store, 'adapter', DS.Adapter.create({
    createRecord: Ember.K
  }));

  var filter = store.filter(Person, function(person) {
    return !person.get('isDirty');
  });

  var person = store.createRecord(Person, {
    id: 1,
    name: "Tom Dale"
  });

  equal(filter.get('length'), 0, "the dirty record is not in the filter");

  store.commit();
  store.didSaveRecord(person);

  equal(filter.get('length'), 1, "the clean record is in the filter");
});


// SERVER SIDE TESTS
var clientEdits = function(ids) {
  // wrap in an Ember.run to guarantee coalescence of the
  // iterated `set` calls.
  Ember.run( function() {
    ids.forEach( function(id) {
      var person = store.find(Person, id);
      person.set('name', 'Client-side ' + id );
    });
  });
};

var clientCreates = function(names) {
  // wrap in an Ember.run to guarantee coalescence of the
  // iterated `set` calls.
  Ember.run( function() {
    names.forEach( function( name ) {
      store.createRecord(Person, { name: 'Client-side ' + name });
    });
  });
};

var serverResponds = function(){
  store.commit();
};

var setup = function(serverCallbacks) {
  set(store, 'adapter', DS.Adapter.create(serverCallbacks));

  store.loadMany(Person, array);

  recordArray = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Scumbag/)) { return true; }
  });

  equal(get(recordArray, 'length'), 3, "The filter function should work");
};

test("a Record Array can update its filter after server-side updates one record", function() {
  setup({
    updateRecord: function(store, type, record) {
      store.didSaveRecord(record, {id: 1, name: "Scumbag Server-side Dale"});
    }
  });

  clientEdits([1]);
  equal(get(recordArray, 'length'), 2, "The record array updates when the client changes records");

  serverResponds();
  equal(get(recordArray, 'length'), 3, "The record array updates when the server changes one record");
});

test("a Record Array can update its filter after server-side updates multiple records", function() {
  setup({
    updateRecords: function(store, type, records) {
      store.didSaveRecords(records, [
        {id: 1, name: "Scumbag Server-side Dale"},
        {id: 2, name: "Scumbag Server-side Katz"}
      ]);
    }
  });

  clientEdits([1,2]);
  equal(get(recordArray, 'length'), 1, "The record array updates when the client changes records");

  serverResponds();
  equal(get(recordArray, 'length'), 3, "The record array updates when the server changes multiple records");
});

test("a Record Array can update its filter after server-side creates one record", function() {
  setup({
    createRecord: function(store, type, record) {
      store.didSaveRecord(record, {id: 4, name: "Scumbag Server-side Tim"});
    }
  });

  clientCreates(["Tim"]);
  equal(get(recordArray, 'length'), 3, "The record array does not include non-matching records");

  serverResponds();
  equal(get(recordArray, 'length'), 4, "The record array updates when the server creates a record");
});

test("a Record Array can update its filter after server-side creates multiple records", function() {
  setup({
    createRecords: function(store, type, records) {
      store.didSaveRecords(records, [
        {id: 4, name: "Scumbag Server-side Mike"},
        {id: 5, name: "Scumbag Server-side David"}
      ]);
    }
  });

  clientCreates(["Mike", "David"]);
  equal(get(recordArray, 'length'), 3, "The record array does not include non-matching records");

  serverResponds();
  equal(get(recordArray, 'length'), 5, "The record array updates when the server creates multiple records");
});

