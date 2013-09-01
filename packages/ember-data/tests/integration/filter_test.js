var get = Ember.get, set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;
var indexOf = Ember.EnumerableUtils.indexOf;

var Person, store, env, array, recordArray;

var shouldContain = function(array, item) {
  ok(indexOf(array, item) !== -1, "array should contain "+item.get('name'));
};

var shouldNotContain = function(array, item) {
  ok(indexOf(array, item) === -1, "array should not contain "+item.get('name'));
};

module("integration/filter - DS.Model updating", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });

    env = setupStore({ person: Person });
    store = env.store;
  },
  teardown: function() {
    store.destroy();
    Person = null;
    array = null;
  }
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  store.pushMany('person', array);

  var people = store.filter('person', function(hash) {
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
  store.pushMany('person', array);

  var recordArray = store.filter('person', function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(recordArray, 'length'), 2, "The Record Array should have the filtered objects on it");

  store.push('person', { id: 4, name: "Scumbag Koz" });

  equal(get(recordArray, 'length'), 3, "The Record Array should be updated as new items are added to the store");

  store.push('person', { id: 1, name: "Scumbag Tom" });

  equal(get(recordArray, 'length'), 2, "The Record Array should be updated as existing members are updated");
});

test("a filtered record array includes created elements", function() {
  store.pushMany('person', array);

  var recordArray = store.filter('person', function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(recordArray, 'length'), 2, "precond - The Record Array should have the filtered objects on it");

  store.createRecord('person', { name: "Scumbag Koz" });

  equal(get(recordArray, 'length'), 3, "The record array has the new object on it");
});

test("a Record Array can update its filter", function() {
  set(store, 'adapter', DS.Adapter.extend({
    deleteRecord: function(store, type, record) {
      return Ember.RSVP.resolve();
    }
  }));

  store.pushMany('person', array);

  var dickens = store.createRecord('person', { id: 4, name: "Scumbag Dickens" });
  dickens.deleteRecord();

  var asyncDale = store.find('person', 1);
  var asyncKatz = store.find('person', 2);
  var asyncBryn = store.find('person', 3);

  var recordArray = store.filter(Person, function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  });

  Ember.RSVP.hash({ dale: asyncDale, katz: asyncKatz, bryn: asyncBryn }).then(async(function(records) {
    shouldContain(recordArray, records.dale);
    shouldContain(recordArray, records.katz);
    shouldNotContain(recordArray, records.bryn);
    shouldNotContain(recordArray, dickens);

    recordArray.set('filterFunction', function(hash) {
      if (hash.get('name').match(/Katz/)) { return true; }
    });

    equal(get(recordArray, 'length'), 1, "The Record Array should have one object on it");

    Ember.run(function() {
      store.push('person', { id: 5, name: "Other Katz" });
    });

    equal(get(recordArray, 'length'), 2, "The Record Array now has the new object matching the filter");

    Ember.run(function() {
      store.push('person', { id: 6, name: "Scumbag Demon" });
    });

    equal(get(recordArray, 'length'), 2, "The Record Array doesn't have objects matching the old filter");
  }));
});

test("a Record Array can update its filter and notify array observers", function() {
  set(store, 'adapter', DS.Adapter.extend({
    deleteRecord: function(store, type, record) {
      return Ember.RSVP.resolve();
    }
  }));

  store.pushMany('person', array);

  var dickens = store.createRecord('person', { id: 4, name: "Scumbag Dickens" });
  dickens.deleteRecord();

  var asyncDale = store.find('person', 1);
  var asyncKatz = store.find('person', 2);
  var asyncBryn = store.find('person', 3);

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

  Ember.RSVP.all([ asyncDale, asyncKatz, asyncBryn ]).then(async(function() {
    equal(didChangeRemoved, 1, "removed one item from array");
    didChangeRemoved = 0;

    Ember.run(function() {
      store.push('person', { id: 5, name: "Other Katz" });
    });

    equal(didChangeAdded, 1, "one item was added");
    didChangeAdded = 0;

    equal(recordArray.objectAt(didChangeIdx).get('name'), "Other Katz");

    Ember.run(function() {
      store.push('person', { id: 6, name: "Scumbag Demon" });
    });

    equal(didChangeAdded, 0, "did not get called when an object that doesn't match is added");

    Ember.run(function() {
      recordArray.set('filterFunction', function(hash) {
        if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
      });
    });

    equal(didChangeAdded, 2, "one item is added when going back");
    equal(recordArray.objectAt(didChangeIdx).get('name'), "Scumbag Demon");
    equal(recordArray.objectAt(didChangeIdx-1).get('name'), "Scumbag Dale");
  }));
});

test("it is possible to filter by computed properties", function() {
  Person.reopen({
    name: DS.attr('string'),
    upperName: Ember.computed(function() {
      return this.get('name').toUpperCase();
    }).property('name')
  });

  var filter = store.filter('person', function(person) {
    return person.get('upperName') === "TOM DALE";
  });

  equal(filter.get('length'), 0, "precond - the filter starts empty");

  store.push('person', { id: 1, name: "Tom Dale" });

  equal(filter.get('length'), 1, "the filter now has a record in it");

  store.find('person', 1).then(async(function(person) {
    Ember.run(function() {
      person.set('name', "Yehuda Katz");
    });

    equal(filter.get('length'), 0, "the filter is empty again");
  }));
});

test("a filter created after a record is already loaded works", function() {
  Person.reopen({
    name: DS.attr('string'),
    upperName: Ember.computed(function() {
      return this.get('name').toUpperCase();
    }).property('name')
  });

  store.push('person', { id: 1, name: "Tom Dale" });

  var filter = store.filter('person', function(person) {
    return person.get('upperName') === "TOM DALE";
  });

  equal(filter.get('length'), 1, "the filter now has a record in it");
  asyncEqual(filter.objectAt(0), store.find('person', 1));
});

test("it is possible to filter by state flags", function() {
  set(store, 'adapter', DS.Adapter.extend({
    find: function(store, type, id) {
      return Ember.RSVP.resolve({ id: id, name: "Tom Dale" });
    }
  }));

  var filter = store.filter(Person, function(person) {
    return person.get('isLoaded');
  });

  equal(filter.get('length'), 0, "precond - there are no records yet");

  Ember.run(function() {
    var asyncPerson = store.find('person', 1);

    // Ember.run will block `find` from being synchronously
    // resolved in test mode

    equal(filter.get('length'), 0, "the unloaded record isn't in the filter");

    asyncPerson.then(async(function(person) {
      equal(filter.get('length'), 1, "the now-loaded record is in the filter");
      asyncEqual(filter.objectAt(0), store.find('person', 1));
    }));
  });
});

test("it is possible to filter loaded records by dirtiness", function() {
  set(store, 'adapter', DS.Adapter.extend({
    updateRecord: function() {
      return Ember.RSVP.resolve();
    }
  }));

  var filter = store.filter('person', function(person) {
    return !person.get('isDirty');
  });

  store.push('person', { id: 1, name: "Tom Dale" });

  store.find('person', 1).then(async(function(person) {
    equal(filter.get('length'), 1, "the clean record is in the filter");

    // Force synchronous update of the filter, even though
    // we're already inside a run loop
    Ember.run(function() {
      person.set('name', "Yehuda Katz");
    });

    equal(filter.get('length'), 0, "the now-dirty record is not in the filter");

    return person.save();
  })).then(async(function(person) {
    equal(filter.get('length'), 1, "the clean record is back in the filter");
  }));
});

test("it is possible to filter created records by dirtiness", function() {
  set(store, 'adapter', DS.Adapter.extend({
    createRecord: function() {
      return Ember.RSVP.resolve();
    }
  }));

  var filter = store.filter('person', function(person) {
    return !person.get('isDirty');
  });

  var person = store.createRecord('person', {
    id: 1,
    name: "Tom Dale"
  });

  equal(filter.get('length'), 0, "the dirty record is not in the filter");

  person.save().then(async(function(person) {
    equal(filter.get('length'), 1, "the clean record is in the filter");
  }));
});


// SERVER SIDE TESTS
var edited;

var clientEdits = function(ids) {
  edited = [];

  forEach(ids, function(id) {
    // wrap in an Ember.run to guarantee coalescence of the
    // iterated `set` calls and promise resolution.
    Ember.run(function() {
      store.find('person', id).then(function(person) {
        edited.push(person);
        person.set('name', 'Client-side ' + id );
      });
    });
  });
};

var clientCreates = function(names) {
  edited = [];

  // wrap in an Ember.run to guarantee coalescence of the
  // iterated `set` calls.
  Ember.run( function() {
    forEach(names, function( name ) {
      edited.push(store.createRecord('person', { name: 'Client-side ' + name }));
    });
  });
};

var serverResponds = function(){
  forEach(edited, function(person) { person.save(); });
};

var setup = function(serverCallbacks) {
  set(store, 'adapter', DS.Adapter.extend(serverCallbacks));

  store.pushMany('person', array);

  recordArray = store.filter('person', function(hash) {
    if (hash.get('name').match(/Scumbag/)) { return true; }
  });

  equal(get(recordArray, 'length'), 3, "The filter function should work");
};

test("a Record Array can update its filter after server-side updates one record", function() {
  setup({
    updateRecord: function(store, type, record) {
      return Ember.RSVP.resolve({id: 1, name: "Scumbag Server-side Dale"});
    }
  });

  clientEdits([1]);
  equal(get(recordArray, 'length'), 2, "The record array updates when the client changes records");

  serverResponds();
  equal(get(recordArray, 'length'), 3, "The record array updates when the server changes one record");
});

test("a Record Array can update its filter after server-side updates multiple records", function() {
  setup({
    updateRecord: function(store, type, record) {
      switch (record.get('id')) {
        case "1":
          return Ember.RSVP.resolve({ id: 1, name: "Scumbag Server-side Dale" });
        case "2":
          return Ember.RSVP.resolve({ id: 2, name: "Scumbag Server-side Katz" });
      }
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
      return Ember.RSVP.resolve({id: 4, name: "Scumbag Server-side Tim"});
    }
  });

  clientCreates(["Tim"]);
  equal(get(recordArray, 'length'), 3, "The record array does not include non-matching records");

  serverResponds();
  equal(get(recordArray, 'length'), 4, "The record array updates when the server creates a record");
});

test("a Record Array can update its filter after server-side creates multiple records", function() {
  setup({
    createRecord: function(store, type, record) {
      switch (record.get('name')) {
        case "Client-side Mike":
          return Ember.RSVP.resolve({id: 4, name: "Scumbag Server-side Mike"});
        case "Client-side David":
          return Ember.RSVP.resolve({id: 5, name: "Scumbag Server-side David"});
      }
    }
  });

  clientCreates(["Mike", "David"]);
  equal(get(recordArray, 'length'), 3, "The record array does not include non-matching records");

  serverResponds();
  equal(get(recordArray, 'length'), 5, "The record array updates when the server creates multiple records");
});

