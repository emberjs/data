
minispade.register('ember-data/tests/adapter_test', function(exports) {
var get = SC.get, set = SC.set, getPath = SC.getPath;

var Person, store, adapter;

module("DS.Adapter", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string')
    });

    adapter = DS.Adapter.create();
    store = DS.Store.create({ adapter: adapter });
  }
});

test("when a single record is requested, the adapter's find method is called unless it's loaded", function() {
  expect(2);

  var count = 0;

  adapter.find = function(store, type, id) {
    equals(type, Person, "the find method is called with the correct type");
    equals(count, 0, "the find method is only called once");

    store.load(type, id, { id: 1, name: "Braaaahm Dale" });

    count++;
  };

  store.find(Person, 1);
  store.find(Person, 1);
});

test("when many records are requested with query parameters, the adapter's findQuery method is called", function() {
  expect(6);

  adapter.findQuery = function(store, type, query, modelArray) {
    equal(type, Person, "the find method is called with the correct type");

    stop();

    setTimeout(function() {
      modelArray.load([{ id: 1, name: "Peter Wagenet" }, { id: 2, name: "Brohuda Katz" }]);
      start();
    }, 100);
  };

  var array = store.find(Person, { page: 1 });
  equal(get(array, 'length'), 0, "The array is 0 length do far");

  array.addArrayObserver(this, {
    willChange: function(target, start, removed, added) {
      equal(removed, 0, "0 items are being removed");
    },

    didChange: function(target, start, removed, added) {
      equal(added, 2, "2 items are being added");

      equal(get(array, 'length'), 2, "The array is now populated");
      equal(get(array.objectAt(0), 'name'), "Peter Wagenet", "The array is populated correctly");
    }
  });
});

test("when all records for a type are requested, the adapter's findAll method is called", function() {
  expect(2);

  adapter.findAll = function(store, type) {
    stop();

    setTimeout(function() {
      start();

      store.load(type, { id: 1, name: "Braaaahm Dale" });
      equal(get(array, 'length'), 1, "The array is now 1 length");
    }, 100);
  };

  var array = store.findAll(Person);
  equal(get(array, 'length'), 0, "The array is 0 length do far");
});

test("when a store is committed, the adapter's commit method is called with updates", function() {
  expect(2);

  adapter.commit = function(store, records) {
    records.updated.eachType(function(type, array) {
      equal(type, Person, "the type is correct");
      equal(get(array, 'length'), 1, "the array is the right length");
      store.didUpdateModels(array);
    });
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  var tom = store.find(Person, 1);

  set(tom, "name", "Tom Dale");

  store.commit();

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});

test("when a store is committed, the adapter's commit method is called with creates", function() {
  expect(3);

  adapter.commit = function(store, records) {
    records.updated.eachType(function() {
      ok(false, "updated should not be populated");
    });

    records.created.eachType(function(type, array) {
      equal(type, Person, "the type is correct");
      equal(get(array, 'length'), 1, "the array is the right length");
      store.didCreateModels(Person, array, [{ id: 1, name: "Tom Dale" }])
    });
  };

  var tom = store.create(Person, { name: "Tom Dale" });

  store.commit();

  equal(tom, store.find(Person, 1), "Once an ID is in, find returns the same object");

  store.commit();
});

test("when a store is committed, the adapter's commit method is called with deletes", function() {
  expect(3);

  adapter.commit = function(store, records) {
    records.updated.eachType(function() {
      ok(false, "updated should not be populated");
    });

    records.created.eachType(function() {
      ok(false, "updated should not be populated");
    });

    records.deleted.eachType(function(type, array) {
      equal(type, Person, "the type is correct");
      equal(get(array, 'length'), 1, "the array is the right length");
      store.didDeleteModels(array)
    });
  };

  store.load(Person, { id: 1, name: "Tom Dale" });
  var tom = store.find(Person, 1);

  tom.delete();
  store.commit();

  equal(get(tom, 'isDeleted'), true, "model is marked as deleted");
});

test("by default, commit calls createMany once per type", function() {
  expect(6);

  adapter.createMany = function(store, type, array) {
    equal(type, Person, "the type is correct");
    equal(get(array, 'length'), 2, "the array is the right length");
    var records = [{ id: 1, name: "Tom Dale", updatedAt: 'right nao' }, { id: 2, name: "Yehuda Katz" }];
    store.didCreateModels(Person, array, records);
  };

  var tom = store.create(Person, { name: "Tom Dale", updatedAt: null });
  var yehuda = store.create(Person, { name: "Yehuda Katz" });

  var callCount = 0;
  tom.addObserver('updatedAt', function() {
    callCount++;
    equal(get(tom, 'updatedAt'), 'right nao', "property returned from adapter is updated");
  });

  store.commit();
  equal(callCount, 1, "calls observer on the model when it has been changed");

  equal(tom, store.find(Person, 1), "Once an ID is in, find returns the same object");
  equal(yehuda, store.find(Person, 2), "Once an ID is in, find returns the same object");
  store.commit();
});

test("by default, commit calls updateMany once per type", function() {
  expect(3);

  adapter.updateMany = function(store, type, array) {
    equal(type, Person, "the type is correct");
    equal(get(array, 'length'), 2, "the array is the right length");
    store.didUpdateModels(array);
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Gentile Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  set(tom, "name", "Tom Dale");
  set(yehuda, "name", "Yehuda Katz");

  store.commit();

  equal(get(store.find(Person, 2), "name"), "Yehuda Katz", "model was updated");

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});

test("by default, commit calls deleteMany once per type", function() {
  expect(4);

  adapter.deleteMany = function(store, type, array) {
    equal(type, Person, "the type is correct");
    equal(get(array, 'length'), 2, "the array is the right length");
    store.didDeleteModels(array);
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Gentile Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  tom.delete();
  yehuda.delete();
  store.commit();

  ok(get(tom, 'isDeleted'), "model is marked as deleted");
  ok(!get(tom, 'isDirty'), "model is marked as not being dirty");

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});

test("by default, createMany calls create once per record", function() {
  expect(6);
  var count = 1;

  adapter.create = function(store, type, model) {
    equal(type, Person, "the type is correct");

    if (count === 1) {
      equal(get(model, 'name'), "Tom Dale");
    } else if (count === 2) {
      equal(get(model, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not have invoked more than 2 times");
    }

    var hash = get(model, 'data');
    hash.id = count;

    store.didCreateModel(model, hash);
    count++;
  };

  var tom = store.create(Person, { name: "Tom Dale" });
  var yehuda = store.create(Person, { name: "Yehuda Katz" });

  store.commit();
  equal(tom, store.find(Person, 1), "Once an ID is in, find returns the same object");
  equal(yehuda, store.find(Person, 2), "Once an ID is in, find returns the same object");
  store.commit();
});

test("by default, updateMany calls update once per record", function() {
  expect(4);

  var count = 0;

  adapter.update = function(store, type, model) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(get(model, 'name'), "Tom Dale");
    } else if (count === 1) {
      equal(get(model, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    store.didUpdateModel(model);
  };

  store.load(Person, { id: 1, name: "Braaaahm Dale" });
  store.load(Person, { id: 2, name: "Brohuda Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  set(tom, "name", "Tom Dale");
  set(yehuda, "name", "Yehuda Katz");

  store.commit();

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});

test("by default, deleteMany calls delete once per record", function() {
  expect(4);

  var count = 0;

  adapter.delete = function(store, type, model) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(get(model, 'name'), "Tom Dale");
    } else if (count === 1) {
      equal(get(model, 'name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    store.didDeleteModel(model);
  };

  store.load(Person, { id: 1, name: "Tom Dale" });
  store.load(Person, { id: 2, name: "Yehuda Katz" });

  var tom = store.find(Person, 1);
  var yehuda = store.find(Person, 2);

  tom.delete();
  yehuda.delete();
  store.commit();

  // there is nothing to commit, so eachType won't do anything
  store.commit();
});


});

minispade.register('ember-data/tests/associations_test', function(exports) {
var get = SC.get, set = SC.set, getPath = SC.getPath;

module("DS.hasMany");

test("hasMany lazily loads associations as needed", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  var store = DS.Store.create();
  store.loadMany(Tag, [5, 2, 12], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  store.load(Person, 1, { id: 1, name: "Tom Dale", tags: [5, 2] });

  var person = store.find(Person, 1);
  equals(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equals(getPath(person, 'tags.length'), 2, "the list of tags should have the correct length");
  equals(get(get(person, 'tags').objectAt(0), 'name'), "friendly", "the first tag should be a Tag");

  strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(person, 'tags').objectAt(0), store.find(Tag, 5), "association objects are the same as objects retrieved directly");
});

test("associations work when the data hash has not been loaded", function() {
  expect(13);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
  });

  Tag.toString = function() { return "Tag"; }

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag),
  });

  Person.toString = function() { return "Person"; }

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      findMany: function(store, type, ids) {
        equal(type, Tag, "type should be Tag");
        deepEqual(ids, [5, 2], "ids should be 5 and 2");

        stop();

        setTimeout(function() {
          start();
          store.loadMany(type, ids, [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);

          equal(get(person, 'name'), "Tom Dale", "precond - the person is still Tom Dale");
          equal(getPath(person, 'tags.length'), 2, "the tags object still exists");
          equal(get(getPath(person, 'tags').objectAt(0), 'name'), "friendly", "Tom Dale is now friendly");
          equal(get(getPath(person, 'tags').objectAt(0), 'isLoaded'), true, "Tom Dale is now loaded");
        }, 1);
      },

      find: function(store, type, id) {
        equal(type, Person, "type should be Person");
        equal(id, 1, "id should be 1");

        stop();

        setTimeout(function() {
          start();
          store.load(type, id, { id: 1, name: "Tom Dale", tags: [5, 2] });

          equal(get(person, 'name'), "Tom Dale", "The person is now populated");
          equal(getPath(person, 'tags.length'), 2, "the tags Array already exists");
          equal(get(getPath(person, 'tags').objectAt(0), 'isLoaded'), false, "the tag objects exist, but are not yet loaded");
        }, 1);
      }
    })
  });

  var person = store.find(Person, 1);

  equal(get(person, 'isLoaded'), false, "isLoaded should be false");
  equal(getPath(person, 'tags.length'), 0, "tags should be empty");
});

test("embedded associations work the same as referenced ones, and have the same identity map functionality", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag, { embedded: true })
  });

  var store = DS.Store.create();
  store.load(Person, 1, { id: 1, name: "Tom Dale", tags: [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }] });

  var person = store.find(Person, 1);
  equals(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equals(getPath(person, 'tags.length'), 2, "the list of tags should have the correct length");
  equals(get(get(person, 'tags').objectAt(0), 'name'), "friendly", "the first tag should be a Tag");

  strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(person, 'tags').objectAt(0), store.find(Tag, 5), "association objects are the same as objects retrieved directly");
});

test("updating the content of a ModelArray updates its content", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = DS.Store.create();
  var loaded = store.loadMany(Tag, [5, 2, 12], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);

  var clientIds = loaded.clientIds;

  var tags = DS.ModelArray.create({ content: [clientIds[0], clientIds[1]], store: store, type: Tag });

  var tag = tags.objectAt(0);
  equal(get(tag, 'name'), "friendly", "precond - we're working with the right tags");

  set(tags, 'content', [clientIds[1], clientIds[2]]);
  var tag = tags.objectAt(0);
  equal(get(tag, 'name'), "smarmy", "the lookup was updated");
});

});

minispade.register('ember-data/tests/fixture_adapter_test', function(exports) {
var get = SC.get, set = SC.set;

module("DS.FixtureAdapter");

test("should load all data for a type asynchronously the first time it is requested", function() {
  var store = DS.Store.create({
    adapter: 'DS.fixtureAdapter'
  });

  var Person = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),

    height: DS.attr('integer')
  });

  Person.FIXTURES = [{
    id: 'wycats',
    firstName: "Yehuda",
    lastName: "Katz",

    height: 65
  },

  {
    id: 'ebryn',
    firstName: "Erik",
    lastName: "Brynjolffsosysdfon",

    height: 70
  }];

  var ebryn = store.find(Person, 'ebryn');

  equal(get(ebryn, 'isLoaded'), false, "model from fixtures is returned in the loading state");

  ebryn.addObserver('isLoaded', function() {
    clearTimeout(timer);
    start();

    ok(get(ebryn, 'isLoaded'), "data loads asynchronously");
    equal(get(ebryn, 'height'), 70, "data from fixtures is loaded correctly");

    var wycats = store.find(Person, 'wycats');
    equal(get(wycats, 'isLoaded'), true, "subsequent requests for models are returned immediately");
    equal(get(wycats, 'height'), 65, "subsequent requested models contain correct information");
  });

  stop();

  var timer = setTimeout(function() {
    start();
    ok(false, "timeout exceeded waiting for fixture data");
  }, 1000);
});

});

minispade.register('ember-data/tests/model_array_test', function(exports) {
var get = SC.get, set = SC.set, getPath = SC.getPath;

module("DS.ModelArray");

var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];

module("DS.Store", {
  teardown: function() {
    set(DS, 'defaultStore', null);
  }
});

test("a model array is backed by models", function() {
  var Person = DS.Model.extend();

  var store = DS.Store.create({ adapter: null });
  store.loadMany(Person, [1,2,3], array);

  var modelArray = store.find(Person, [1,2,3]);

  for (var i=0, l=get(array, 'length'); i<l; i++) {
    equals(get(modelArray.objectAt(i), 'data'), array.objectAt(i), "a model array materializes objects on demand");
  }
});

test("a model is moved from a model array when it is deleted", function() {
  var Person = DS.Model.extend();

  var store = DS.Store.create({ adapter: null });
  store.loadMany(Person, [1,2,3], array);

  var scumbag = store.find(Person, 1);

  var modelArray = store.find(Person, [1, 2, 3]);
  equal(get(modelArray, 'length'), 3, "precond - model array has three items");
  equal(get(modelArray.objectAt(0), 'name'), "Scumbag Dale", "item at index 0 is model with id 1");

  scumbag.delete();

  equal(get(modelArray, 'length'), 2, "model is removed from the model array");
  ok(get(modelArray.objectAt(0), 'name') !== "Scumbag Dale", "item was removed");
});

test("a model array can have a filter on it", function() {
  var Person = DS.Model.extend();
  var store = DS.Store.create();

  store.loadMany(Person, array);

  var modelArray = store.filter(Person, function(hash) {
    if (hash.name.match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(modelArray, 'length'), 2, "The model Array should have the filtered objects on it");

  store.load(Person, { id: 4, name: "Scumbag Koz" });

  equal(get(modelArray, 'length'), 3, "The model Array should be updated as new items are added to the store");

  store.load(Person, { id: 1, name: "Scumbag Tom" });

  equal(get(modelArray, 'length'), 2, "The model Array should be updated as existing members are updated");
});

test("a filtered model array includes created elements", function() {
  var Person = DS.Model.extend();
  var store = DS.Store.create();

  store.loadMany(Person, array);

  var modelArray = store.filter(Person, function(hash) {
    if (hash.name.match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(modelArray, 'length'), 2, "precond - The model Array should have the filtered objects on it");

  person = store.create(Person, { name: "Scumbag Koz" });

  equal(get(modelArray, 'length'), 3, "The model array has the new object on it");
});

test("a model array returns undefined when asking for a member outside of its content Array's range", function() {
  var Person = DS.Model.extend();
  var store = DS.Store.create();

  store.loadMany(Person, array);

  var modelArray = store.find(Person);

  strictEqual(modelArray.objectAt(20), undefined, "objects outside of the range just return undefined");
});

test("a model Array can update its filter", function() {
  var Person = DS.Model.extend();
  var store = DS.Store.create();

  store.loadMany(Person, array);

  var modelArray = store.filter(Person, function(hash) {
    if (hash.name.match(/Scumbag [KD]/)) { return true; }
  });

  equal(get(modelArray, 'length'), 2, "The model Array should have the filtered objects on it");

  modelArray.set('filterFunction', function(hash) {
    if (hash.name.match(/Katz/)) { return true; }
  });

  equal(get(modelArray, 'length'), 1, "The model Array should have one object on it");

  store.load(Person, 5, { name: "Other Katz" });

  equal(get(modelArray, 'length'), 2, "The model Array now has the new object matching the filter");

  store.load(Person, 6, { name: "Scumbag Demon" });

  equal(get(modelArray, 'length'), 2, "The model Array doesn't have objects matching the old filter");
});

test("an AdapterPopulatedModelArray knows if it's loaded or not", function() {
  expect(2);

  var Person = DS.Model.extend();
  var store = DS.Store.create({
    adapter: {
      findQuery: function(store, type, query, modelArray) {
        stop();

        setTimeout(function() {
          modelArray.load(array);
          equal(get(array, 'isLoaded'), true, "The array is now loaded");
          start();
        }, 100);
      }
    }
  });

  var array = store.find(Person, { page: 1 });

  equal(get(array, 'isLoaded'), false, "The array is not yet loaded");
});

});

minispade.register('ember-data/tests/model_test', function(exports) {
var get = SC.get, set = SC.set, getPath = SC.getPath;

module("DS.Model");

var modelIsInState = function(model, stateName) {
  var state = getPath(model, 'stateManager.currentState');
  ok(state, "precond - there is a current state");
  var expected = getPath(model, 'stateManager.states.rootState.' + stateName);
  equals(state, expected, "the current state should be " + stateName);
};

test("a new DS.Model is in the empty state", function() {
  var model = DS.Model.create();
  modelIsInState(model, 'empty');
});

test("a DS.Model can receive data, which puts it into the loaded state", function() {
  var model = DS.Model.create();
  model.loadingData();
  model.setData({ scumbag: "tom" });
  modelIsInState(model, 'loaded');
});

var coercesType = function(type, provided, expected) {
  var model = DS.Model.create({
    name: DS.attr(type)
  });

  model.loadingData();
  model.setData({ name: provided });
  deepEqual(get(model, 'name'), expected, type + " coerces " + provided + " to " + expected);


  model = DS.Model.create({
    name: DS.attr(type)
  });

  model.loadingData();
  model.setData({});
  set(model, 'name', provided);
  deepEqual(get(model, 'name'), expected, type + " coerces " + provided + " to " + expected);
}

test("a DS.Model can describe String attributes", function() {
  coercesType('string', "Scumbag Tom", "Scumbag Tom");
  coercesType('string', 1, "1");
  coercesType('string', null, "null");
});

test("a DS.Model can describe Integer attributes", function() {
  coercesType('integer', "1", 1);
  coercesType('integer', "0", 0);
  coercesType('integer', 1, 1);
  coercesType('integer', 0, 0);
  coercesType('integer', null, 0);
  coercesType('integer', true, 1);
  coercesType('integer', false, 0);
});

test("a DS.Model can describe Boolean attributes", function() {
  coercesType('boolean', "1", true);
  coercesType('boolean', "", false);
  coercesType('boolean', 1, true);
  coercesType('boolean', 0, false);
  coercesType('boolean', null, false);
  coercesType('boolean', true, true);
  coercesType('boolean', false, false);
});

test("it can specify which key to use when looking up properties on the hash", function() {
  var model = DS.Model.create({
    name: DS.attr('string', { key: 'full_name' })
  });

  model.loadingData();
  model.setData({ name: "Steve", full_name: "Pete" });

  equals(get(model, 'name'), "Pete", "retrieves correct value");
});

var Person, store, array;

module("DS.Model updating", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });
    store = DS.Store.create();
    store.loadMany(Person, array);
  }
});

test("a DS.Model can update its attributes", function() {
  var person = store.find(Person, 2);

  set(person, 'name', "Brohuda Katz");
  equal(get(person, 'name'), "Brohuda Katz", "setting took hold");
});

test("it should modify the property of the hash specified by the `key` option", function() {
  var model = DS.Model.create({
    name: DS.attr('string', { key: 'full_name' })
  });

  model.loadingData();
  model.setData({ name: "Steve", full_name: "Pete" });

  model.set('name', "Colin");
  var data = model.get('data');
  equals(get(data, 'name'), "Steve", "did not modify name property");
  equals(get(data, 'full_name'), "Colin", "properly modified full_name property");
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  var people = store.filter(Person, function(hash) {
    if (hash.name.match(/Katz$/)) { return true; }
  });

  equal(get(people, 'length'), 1, "precond - one item is in the ModelArray");

  var person = people.objectAt(0);

  equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  set(person, 'name', "Yehuda Katz");

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  set(person, 'name', "Yehuda Katz-Foo");

  equal(get(people, 'length'), 0, "there are now no items");
});

test("when a DS.Model updates its attributes, it is marked dirty and listed in the dirty queue", function() {
  expect(9);

  var yehuda = store.find(Person, 2);

  set(yehuda, 'name', "Yehuda Katz");
  equal(get(yehuda, 'isDirty'), true, "The person is now dirty");

  var dirty = get(store, 'updatedModels');

  store.eachDirtyType('updated', function(type, models) {
    equal(type, Person);
    equal(get(models, 'length'), 1, "The dirty list should be the right length");
    equal(get(models.objectAt(0), 'name'), "Yehuda Katz", "The dirty list should have the right item");
  });

  var tom = store.find(Person, 1);
  set(tom, 'name', "Tom Dale");

  equal(get(tom, 'isDirty'), true, "The person is now dirty");

  store.eachDirtyType('updated', function(type, models) {
    equal(type, Person);

    equal(get(models, 'length'), 2, "The dirty list should be the right length");
    equal(get(models.objectAt(1), 'name'), "Tom Dale", "The dirty list should have the right item");

    set(tom, 'name', "Senor Dale");
    equal(get(models, 'length'), 2, "Items don't get added multiple times");
  });
});

test("when a DS.Model is dirty, attempting to `load` new data raises an exception", function() {
  var yehuda = store.find(Person, 2);
  set(yehuda, 'name', "Yehuda Katz");

  raises(function() {
    store.load(Person, 2, { id: 2, name: "Scumhuda Katz" });
  });
});

module("with a simple Person model", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend();
    store = DS.Store.create();
    store.loadMany(Person, array);
  }
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  var people = store.filter(Person, function(hash) {
    if (hash.name.match(/Katz$/)) { return true; }
  });

  equal(get(people, 'length'), 1, "precond - one item is in the ModelArray");

  var person = people.objectAt(0);

  equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  set(person, 'name', "Yehuda Katz");

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  set(person, 'name', "Yehuda Katz-Foo");

  equal(get(people, 'length'), 0, "there are now no items");
});

});

minispade.register('ember-data/tests/store_test', function(exports) {
var get = SC.get, set = SC.set, getPath = SC.getPath;

module("DS.Store", {
  teardown: function() {
    set(DS, 'defaultStore', null);
  }
});

test("a store can be created", function() {
  var store = DS.Store.create();
  ok(store, 'a store exists');
});

test("the first store becomes the default store", function() {
  var store = DS.Store.create();
  equals(get(DS, 'defaultStore'), store, "the first store is the default");
});

test("a specific store can be supplied as the default store", function() {
  DS.Store.create();
  var store = DS.Store.create({ isDefaultStore: true });
  DS.Store.create();

  equals(get(DS, 'defaultStore'), store, "isDefaultStore overrides the default behavior");
});

var stateManager, stateName;

module("DS.StateManager", {
  setup: function() {
    stateManager = DS.StateManager.create();
  }
});

var isTrue = function(flag) {
  equals(getPath(stateManager, 'states.rootState.'+stateName + "." + flag), true, stateName + "." + flag + " should be true");
};

var isFalse = function(flag) {
  equals(getPath(stateManager, 'states.rootState.'+stateName + "." + flag), false, stateName + "." + flag + " should be false");
}

test("the empty state", function() {
  stateName = "empty";
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the loading state", function() {
  stateName = "loading";
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the loaded state", function() {
  stateName = "loaded";
  isTrue("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the updated state", function() {
  stateName = "loaded.updated";
  isTrue("isLoaded");
  isTrue("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the saving state", function() {
  stateName = "loaded.updated.saving";
  isTrue("isLoaded");
  isTrue("isDirty");
  isTrue("isSaving");
  isFalse("isDeleted");
  isFalse("isError");
});

test("the deleted state", function() {
  stateName = "deleted";
  isTrue("isLoaded");
  isTrue("isDirty");
  isFalse("isSaving");
  isTrue("isDeleted");
  isFalse("isError");
});

test("the deleted.saving state", function() {
  stateName = "deleted.saving";
  isTrue("isLoaded");
  isTrue("isDirty");
  isTrue("isSaving");
  isTrue("isDeleted");
  isFalse("isError");
});

test("the deleted.saved state", function() {
  stateName = "deleted.saved";
  isTrue("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isTrue("isDeleted");
  isFalse("isError");
});


test("the error state", function() {
  stateName = "error";
  isFalse("isLoaded");
  isFalse("isDirty");
  isFalse("isSaving");
  isFalse("isDeleted");
  isTrue("isError");
});

module("DS.Store working with a DS.Adapter");

test("Calling Store#find invokes its adapter#find", function() {
  expect(4);

  var adapter = DS.Adapter.create({
    find: function(store, type, id) {
      ok(true, "Adapter#find was called");
      equals(store, currentStore, "Adapter#find was called with the right store");
      equals(type,  currentType,  "Adapter#find was called with the type passed into Store#find");
      equals(id,    1,            "Adapter#find was called with the id passed into Store#find");
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend();

  currentStore.find(currentType, 1);
});

test("DS.Store has a load method to load in a new record", function() {
  var adapter = DS.Adapter.create({
    find: function(store, type, id) {
      store.load(type, id, { id: 1, name: "Scumbag Dale" });
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend();

  var object = currentStore.find(currentType, 1);

  equals(getPath(object, 'data.name'), "Scumbag Dale", "the data hash was inserted");
});

var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];

test("DS.Store has a load method to load in an Array of records", function() {
  var adapter = DS.Adapter.create({
    findMany: function(store, type, ids) {
      store.loadMany(type, ids, array);
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend();

  var objects = currentStore.findMany(currentType, [1,2,3]);

  for (var i=0, l=get(objects, 'length'); i<l; i++) {
    var object = objects.objectAt(i), hash = array.objectAt(i);

    equals(get(object, 'data'), hash);
  }
});

test("DS.Store loads individual models without explicit IDs", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend();

  store.load(Person, { id: 1, name: "Tom Dale" });

  var tom = store.find(Person, 1);
  equal(get(tom, 'name'), "Tom Dale", "the person was successfully loaded for the given ID");
});

test("DS.Store loads individual models without explicit IDs with a custom primaryKey", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend({ primaryKey: 'key' });

  store.load(Person, { key: 1, name: "Tom Dale" });

  var tom = store.find(Person, 1);
  equal(get(tom, 'name'), "Tom Dale", "the person was successfully loaded for the given ID");
});

test("DS.Store passes only needed guids to findMany", function() {
  expect(8);

  var adapter = DS.Adapter.create({
    findMany: function(store, type, ids) {
      deepEqual(ids, [4,5,6], "only needed ids are passed");
    }
  });

  var currentStore = DS.Store.create({ adapter: adapter });
  var currentType = DS.Model.extend();

  currentStore.loadMany(currentType, [1,2,3], array);

  var objects = currentStore.findMany(currentType, [1,2,3,4,5,6]);

  equals(get(objects, 'length'), 6, "the ModelArray returned from findMany has all the objects");

  for (var i=0; i<3; i++) {
    var object = objects.objectAt(i), hash = array.objectAt(i);

    equals(get(object, 'data'), hash);
  }

  for (var i=3; i<6; i++) {
    var object = objects.objectAt(i);
    ok(currentType.detectInstance(object), "objects are instances of the ModelArray's type");
  }
});

test("loadMany extracts ids from an Array of hashes if no ids are specified", function() {
  var store = DS.Store.create();

  var Person = DS.Model.extend();

  store.loadMany(Person, array);
  equal(get(store.find(Person, 1), 'name'), "Scumbag Dale", "correctly extracted id for loaded data");
});

test("loadMany uses a model's primaryKey if one is provided to extract ids", function() {
  var store = DS.Store.create();

  var array = [{ key: 1, name: "Scumbag Dale" }, { key: 2, name: "Scumbag Katz" }, { key: 3, name: "Scumbag Bryn" }];

  var Person = DS.Model.extend({
    primaryKey: "key"
  });

  store.loadMany(Person, array);
  equal(get(store.find(Person, 1), 'name'), "Scumbag Dale", "correctly extracted id for loaded data");
});

test("loadMany takes an optional Object and passes it on to the Adapter", function() {
  var passedQuery = { page: 1 };

  var Person = DS.Model.extend();

  var adapter = DS.Adapter.create({
    findQuery: function(store, type, query) {
      equal(type, Person, "The type was Person")
      equal(query, passedQuery, "The query was passed in");
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  store.find(Person, passedQuery);
});

test("findAll(type) returns a model array of all records of a specific type", function() {
  var store = DS.Store.create({ adapter: DS.Adapter.create() });
  var Person = DS.Model.extend({
    name: DS.attr('string')
  });

  store.load(Person, 1, { id: 1, name: "Tom Dale" });

  var results = store.findAll(Person);
  equal(get(results, 'length'), 1, "model array should have the original object");
  equal(get(results.objectAt(0), 'name'), "Tom Dale", "model has the correct information");

  store.load(Person, 2, { id: 2, name: "Yehuda Katz" });
  equal(get(results, 'length'), 2, "model array should have the new object");
  equal(get(results.objectAt(1), 'name'), "Yehuda Katz", "model has the correct information");
});

test("a new model of a particular type is created via store.create(type)", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend();

  var person = store.create(Person);

  equal(get(person, 'isLoaded'), true, "A newly created model is loaded");
  equal(get(person, 'isNew'), true, "A newly created model is new");
  equal(get(person, 'isDirty'), true, "A newly created model is dirty");

  set(person, 'name', "Braaahm Dale");

  equal(get(person, 'name'), "Braaahm Dale", "Even if no hash is supplied, `set` still worked");
});

test("an initial data hash can be provided via store.create(type, hash)", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend();

  var person = store.create(Person, { name: "Brohuda Katz" });

  equal(get(person, 'isLoaded'), true, "A newly created model is loaded");
  equal(get(person, 'isNew'), true, "A newly created model is new");
  equal(get(person, 'isDirty'), true, "A newly created model is dirty");

  equal(get(person, 'name'), "Brohuda Katz", "The initial data hash is provided");
});

test("if an id is supplied in the initial data hash, it can be looked up using `store.find`", function() {
  var store = DS.Store.create();
  var Person = DS.Model.extend();

  var person = store.create(Person, { id: 1, name: "Brohuda Katz" });

  var again = store.find(Person, 1);

  strictEqual(person, again, "the store returns the loaded object");
});

module("DS.State - Lifecycle Callbacks");

test("a model receives a didLoad callback when it has finished loading", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    didLoad: function() {
      callCount++;
    }
  });

  var adapter = DS.Adapter.create({
    find: function(store, type, id) {
      store.load(Person, 1, { id: 1, name: "Foo" })
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });
  store.find(Person, 1);

  equal(callCount, 1, "didLoad callback was called once");
});

test("a model receives a didUpdate callback when it has finished updating", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    didUpdate: function() {
      callCount++;
    }
  });

  var adapter = DS.Adapter.create({
    find: function(store, type, id) {
      store.load(Person, 1, { id: 1, name: "Foo" })
    },

    update: function(store, type, model) {
      store.didUpdateModel(model)
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  var person = store.find(Person, 1);
  equal(callCount, 0, "precond - didUpdate callback was not called yet");

  person.set('bar', "Bar");
  store.commit();

  equal(callCount, 1, "didUpdate called after update");
});

test("a model receives a didUpdate callback when it has finished updating", function() {
  var callCount = 0;

  var Person = DS.Model.extend({
    didCreate: function() {
      callCount++;
    }
  });

  var adapter = DS.Adapter.create({
    create: function(store, type, model) {
      store.didCreateModel(model, {})
    }
  });

  var store = DS.Store.create({
    adapter: adapter
  });

  equal(callCount, 0, "precond - didUpdate callback was not called yet");

  var person = store.create(Person, { name: "Newt Gingrich" });
  store.commit();

  equal(callCount, 1, "didCreate called after commit");
});


});
