var get = Ember.get, set = Ember.set;
var Adapter, Person, Group, Role, adapter, serializer, store, ajaxUrl, ajaxType, ajaxHash, recordArrayFlags, manyArrayFlags;
var forEach = Ember.EnumerableUtils.forEach;

// Note: You will need to ensure that you do not attempt to assert against flags that do not exist in this array (or else they will show positive).
recordArrayFlags = ['isLoaded'];
manyArrayFlags = ['isLoaded'];

// Used for testing the adapter state path on a single entity
function stateEquals(entity, expectedState) {
  var actualState = get(entity, 'stateManager.currentPath');

  actualState = actualState && actualState.replace(/^rootState\./,'');
  equal(actualState, expectedState, 'Expected state should have been: ' + expectedState+ ' but was: ' +  actualState + ' on: ' + entity);
}

// Used for testing the adapter state path on a collection of entities
function statesEqual(entities, expectedState) {
  forEach(entities, function(entity){
    stateEquals(entity, expectedState);
  });
}

// Used for testing all of the flags on a single entity
// onlyCheckFlagArr is to only check a subset of possible flags
function enabledFlags(entity, expectedFlagArr, onlyCheckFlagArr) {
  var possibleFlags;
  if(onlyCheckFlagArr){
    possibleFlags = onlyCheckFlagArr;
  } else {
    possibleFlags = ['isLoading', 'isLoaded', 'isReloading', 'isDirty', 'isSaving', 'isDeleted', 'isError', 'isNew', 'isValid'];
  }

  forEach(possibleFlags, function(flag){
    var expectedFlagValue, actualFlagValue;

    expectedFlagValue = expectedFlagArr.indexOf(flag) !== -1;
    actualFlagValue = entity.get(flag);

    equal(actualFlagValue, expectedFlagValue, 'Expected flag ' + flag + ' should have been: ' + expectedFlagValue + ' but was: ' + actualFlagValue + ' on: '  + entity);
  });
}

// Used for testing all of the flags on a collection of entities
function enabledFlagsForArray(entities, expectedFlagArr, onlyCheckFlagArr) {
  forEach(entities, function(entity){
    enabledFlags(entity, expectedFlagArr, onlyCheckFlagArr);
  });
}

// Used for testing a request url to a remote URL
var expectUrl = function(url, desc) {
  equal(ajaxUrl, url, "the URL is " + desc);
};

// Used for testing a request type to a remote URL
var expectType = function(type) {
  equal(type, ajaxType, "the HTTP method is " + type);
};

// Used to test that data is being passed to a remote URL
var expectData = function(hash) {
  deepEqual(hash, ajaxHash.data, "the hash was passed along");
};

module("the REST adapter", {
  setup: function() {
    ajaxUrl = undefined;
    ajaxType = undefined;
    ajaxHash = undefined;

    Adapter = DS.RESTAdapter.extend();
    Adapter.configure('plurals', {
      person: 'people'
    });

    adapter = Adapter.create({
      ajax: function(url, type, hash) {
        var self = this;
        return new Ember.RSVP.Promise(function(resolve, reject){
          hash = hash || {};
          var success = hash.success;

          hash.context = adapter;

          ajaxUrl = url;
          ajaxType = type;
          ajaxHash = hash;

          hash.success = function(json) {
            Ember.run(function(){
              resolve(json);
            });
          };

          hash.error = function(xhr) {
            Ember.run(function(){
              reject(xhr);
            });
          };
        });
      }
    });

    serializer = get(adapter, 'serializer');

    store = DS.Store.create({
      adapter: adapter
    });

    Person = DS.Model.extend({
      name: DS.attr('string')
    });

    Person.toString = function() {
      return "App.Person";
    };

    Group = DS.Model.extend({
      name: DS.attr('string'),
      people: DS.hasMany(Person)
    });

    Group.toString = function() {
      return "App.Group";
    };

    Person.reopen({
      group: DS.belongsTo(Group)
    });

    Role = DS.Model.extend({
      name: DS.attr('string')
    });

    Role.toString = function() {
      return "App.Role";
    };
  }
});

test("Calling ajax() calls JQuery.ajax with json data", function() {
  var oldJQueryAjax = jQuery.ajax;

  try {
    // replace jQuery.ajax()
    jQuery.ajax = function(hash) {
      ajaxHash = hash;
    };
    adapter = DS.RESTAdapter.create();
    adapter.ajax('/foo', 'GET', {extra: 'special'});

    ok(ajaxHash, 'jQuery.ajax was called');
    equal(ajaxHash.url, '/foo', 'Request URL is the given value');
    equal(ajaxHash.type, 'GET', 'Request method is the given value');
    equal(ajaxHash.dataType, 'json', 'Request data type is JSON');
    equal(ajaxHash.context, adapter, 'Request context is the adapter');
    equal(ajaxHash.extra, 'special', 'Extra options are passed through');

    adapter.ajax('/foo', 'POST', {});
    ok(!ajaxHash.data, 'Data not set when not provided');

    adapter.ajax('/foo', 'GET', {data: 'unsupported'});
    equal(ajaxHash.data, 'unsupported', 'Data untouched for unsupported methods');

    adapter.ajax('/foo', 'POST', {data: {id: 1, name: 'Bar'}});
    equal(ajaxHash.data, JSON.stringify({id: 1, name: 'Bar'}), 'Data serialized for POST requests');
    equal(ajaxHash.contentType, 'application/json; charset=utf-8', 'Request content type is JSON');

    adapter.ajax('/foo', 'PUT', {data: {id: 1, name: 'Bar'}});
    equal(ajaxHash.data, JSON.stringify({id: 1, name: 'Bar'}), 'Data serialized for PUT requests');

  } finally {
    // restore jQuery.ajax()
    jQuery.ajax = oldJQueryAjax;
  }
});

test("creating a person makes a POST to /people, with the data hash", function() {
  // setup
  var person = store.createRecord(Person, { name: "Tom Dale" });

  // test
  stateEquals(person, 'loaded.created.uncommitted');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isNew', 'isValid']);

  // setup
  store.commit();

  // test
  stateEquals(person, 'loaded.created.inFlight');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isNew', 'isValid', 'isSaving']);
  expectUrl("/people", "the collection at the plural of the model name");
  expectType("POST");
  expectData({ person: { name: "Tom Dale", group_id: null } });

  // setup
  ajaxHash.success({ person: { id: 1, name: "Tom Dale" } });

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(person, store.find(Person, 1), "it is now possible to retrieve the person by the ID supplied");
});

test("singular creations can sideload data", function() {
  // setup
  var person, group;
  person = store.createRecord(Person, { name: "Tom Dale" });

  // test
  stateEquals(person, 'loaded.created.uncommitted');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isNew', 'isValid']);

  // setup
  store.commit();

  // test
  stateEquals(person, 'loaded.created.inFlight');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isSaving', 'isNew', 'isValid']);
  expectUrl("/people", "the collection at the plural of the model name");
  expectType("POST");
  expectData({ person: { name: "Tom Dale", group_id: null } });

  // setup
  ajaxHash.success({
    person: { id: 1, name: "Tom Dale" },
    groups: [{ id: 1, name: "Group 1" }]
  });
  group = store.find(Group, 1);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(person, store.find(Person, 1), "it is now possible to retrieve the person by the ID supplied");
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

test("updating a person makes a PUT to /people/:id with the data hash", function() {
  // setup
  var person;
  store.load(Person, { id: 1, name: "Yehuda Katz" });
  person = store.find(Person, 1);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);

  // setup
  set(person, 'name', 'Brohuda Brokatz');

  // test
  stateEquals(person, 'loaded.updated.uncommitted');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isValid']);

  // setup
  store.commit();

  // test
  stateEquals(person, 'loaded.updated.inFlight');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isSaving', 'isValid']);
  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("PUT");
  expectData({ person: { name: "Brohuda Brokatz", group_id: null } });

  // setup
  ajaxHash.success({ person: { id: 1, name: "Brohuda Brokatz" } });

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(person, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(get(person, 'name'), "Brohuda Brokatz", "the hash should be updated");
});


test("updates are not required to return data", function() {
  // setup
  var person;
  store.load(Person, { id: 1, name: "Yehuda Katz" });
  person = store.find(Person, 1);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);

  // setup
  set(person, 'name', 'Brohuda Brokatz');

  // test
  stateEquals(person, 'loaded.updated.uncommitted');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isValid']);

  // setup
  store.commit();

  // test
  stateEquals(person, 'loaded.updated.inFlight');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isSaving', 'isValid']);
  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("PUT");

  // setup
  ajaxHash.success();

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(person, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(get(person, 'name'), "Brohuda Brokatz", "the data is preserved");
});

test("singular updates can sideload data", function() {
  // setup
  var person, group;
  serializer.configure(Group, { sideloadAs: 'groups' });
  store.load(Person, { id: 1, name: "Yehuda Katz" });
  person = store.find(Person, 1);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);

  // setup
  set(person, 'name', "Brohuda Brokatz");

  // test
  stateEquals(person, 'loaded.updated.uncommitted');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isValid']);

  // setup
  store.commit();

  // test
  stateEquals(person, 'loaded.updated.inFlight');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isSaving', 'isValid']);
  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("PUT");

  // setup
  ajaxHash.success({
    person: { id: 1, name: "Brohuda Brokatz" },
    groups: [{ id: 1, name: "Group 1" }]
  });
  group = store.find(Group, 1);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(person, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

test("deleting a person makes a DELETE to /people/:id", function() {
  // setup
  var person;
  store.load(Person, { id: 1, name: "Tom Dale" });
  person = store.find(Person, 1);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);

  // setup
  person.deleteRecord();

  // test
  stateEquals(person, 'deleted.uncommitted');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isDeleted', 'isValid']);

  // setup
  store.commit();

  // test
  stateEquals(person, 'deleted.inFlight');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isSaving', 'isDeleted', 'isValid']);
  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("DELETE");

  // setup
  ajaxHash.success();

  // test
  stateEquals(person, 'deleted.saved');
  enabledFlags(person, ['isLoaded', 'isDeleted', 'isValid']);
});

test("singular deletes can sideload data", function() {
  // setup
  var person, group;
  serializer.configure(Group, { sideloadAs: 'groups' });
  store.load(Person, { id: 1, name: "Tom Dale" });
  person = store.find(Person, 1);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);

  // setup
  person.deleteRecord();

  // test
  stateEquals(person, 'deleted.uncommitted');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isDeleted', 'isValid']);

  // setup
  store.commit();

  // test
  stateEquals(person, 'deleted.inFlight');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isSaving', 'isDeleted', 'isValid']);
  expectUrl("/people/1", "the plural of the model name with its ID");
  expectType("DELETE");

  // setup
  ajaxHash.success({
    groups: [{ id: 1, name: "Group 1" }]
  });
  group = store.find(Group, 1);

  // test
  stateEquals('deleted.saved');
  enabledFlags(person, ['isLoaded', 'isDeleted', 'isValid']);
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

// Remove this note -- I am leaving this test broken because it's an interesting case.
// should store.find(Person) return back an object that will be fulfilled later?
test("finding all people makes a GET to /people", function() {
  // setup
  var person, people;
  people = store.find(Person);

  // test
  enabledFlags(people, ['isLoaded', 'isValid'], recordArrayFlags);
  expectUrl("/people", "the plural of the model name");
  expectType("GET");

  // setup
  ajaxHash.success({ people: [{ id: 1, name: "Yehuda Katz" }] });
  person = people.objectAt(0);

  // test
  statesEqual(people, 'loaded.saved');
  stateEquals(person, 'loaded.saved');
  enabledFlagsForArray(people, ['isLoaded', 'isValid']);
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("finding all can sideload data", function() {
  // setup
  var groups, person, people;
  groups = store.find(Group);

  // test
  enabledFlags(groups, ['isLoaded'], recordArrayFlags);
  expectUrl("/groups", "the plural of the model name");
  expectType("GET");

  // setup
  ajaxHash.success({
    groups: [{ id: 1, name: "Group 1", person_ids: [ 1 ] }],
    people: [{ id: 1, name: "Yehuda Katz" }]
  });
  people = get(groups.objectAt(0), 'people');
  person = people.objectAt(0);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(groups, ['isLoaded'], recordArrayFlags);
  enabledFlags(people, ['isLoaded'], manyArrayFlags);
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("finding all people with since makes a GET to /people", function() {
  // setup
  var people, person;
  people = store.find(Person);

  // test
  enabledFlags(people, ['isLoaded'], recordArrayFlags);
  expectUrl("/people", "the plural of the model name");
  expectType("GET");

  // setup
  ajaxHash.success({ meta: { since: '123'}, people: [{ id: 1, name: "Yehuda Katz" }] });
  people = store.find(Person);

  // test
  enabledFlags(people, ['isLoaded'], recordArrayFlags);
  expectUrl("/people", "the plural of the model name");
  expectType("GET");
  expectData({since: '123'});

  // setup
  ajaxHash.success({ meta: { since: '1234'}, people: [{ id: 2, name: "Paul Chavard" }] });
  person = people.objectAt(1);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(people, ['isLoaded'], recordArrayFlags);
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(person, store.find(Person, 2), "the record is now in the store, and can be looked up by ID without another Ajax request");

  // setup
  people.update();

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(people, ['isLoaded'], recordArrayFlags);
  enabledFlags(person, ['isLoaded', 'isValid']);
  expectUrl("/people", "the plural of the model name");
  expectType("GET");
  expectData({since: '1234'});

  // setup
  ajaxHash.success({ meta: { since: '12345'}, people: [{ id: 3, name: "Dan Gebhardt" }] });

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(people, ['isLoaded'], recordArrayFlags);
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(people.get('length'), 3, 'should have 3 records now');
});

test("meta and since are configurable", function() {
  // setup
  var people, person;
  serializer.configure({
    meta: 'metaObject',
    since: 'sinceToken'
  });
  set(adapter, 'since', 'lastToken');
  people = store.find(Person);

  // test
  enabledFlags(people, ['isLoaded'], recordArrayFlags);
  expectUrl("/people", "the plural of the model name");
  expectType("GET");

  // setup
  ajaxHash.success({ metaObject: {sinceToken: '123'}, people: [{ id: 1, name: "Yehuda Katz" }] });

  // test
  enabledFlags(people, ['isLoaded'], recordArrayFlags);

  // setup
  people.update();

  // test
  enabledFlags(people, ['isLoaded'], recordArrayFlags);
  expectUrl("/people", "the plural of the model name");
  expectType("GET");
  expectData({lastToken: '123'});

  // setup
  ajaxHash.success({ metaObject: {sinceToken: '1234'}, people: [{ id: 2, name: "Paul Chavard" }] });
  person = people.objectAt(1);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(people, ['isLoaded'], recordArrayFlags);
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(person, store.find(Person, 2), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("finding a person by ID makes a GET to /people/:id", function() {
  // setup
  var person = store.find(Person, 1);

  // test
  stateEquals(person, 'loading');
  enabledFlags(person, ['isLoading', 'isValid']);
  expectUrl("/people/1", "the plural of the model name with the ID requested");
  expectType("GET");

  // setup
  ajaxHash.success({ person: { id: 1, name: "Yehuda Katz" } });

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(person, store.find(Person, 1), "the record is now in the store, and can be looked up by ID without another Ajax request");
});

test("finding a person by an ID-alias populates the store", function() {
  // setup
  var person = store.find(Person, 'me');

  // test
  stateEquals(person, 'loading');
  enabledFlags(person, ['isLoading', 'isValid']);
  expectUrl("/people/me", "the plural of the model name with the ID requested");
  expectType("GET");

  // setup
  ajaxHash.success({ person: { id: 1, name: "Yehuda Katz" } });

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);
  equal(person, store.find(Person, 'me'), "the record is now in the store, and can be looked up by the alias without another Ajax request");
});

test("additional data can be sideloaded in a GET", function() {
  // setup
  var group = store.find(Group, 1);

  // test
  stateEquals(group, 'loading');
  enabledFlags(group, ['isLoading', 'isValid']);

  // setup
  ajaxHash.success({
    group: {id: 1, name: "Group 1", person_ids: [1] },
    people: [{id: 1, name: "Yehuda Katz"}]
  });

  // test
  stateEquals(group, 'loaded.saved');
  enabledFlags(group, ['isLoaded', 'isValid']);
  equal(get(store.find(Person, 1), 'name'), "Yehuda Katz", "the items are sideloaded");
  equal(get(get(store.find(Group, 1), 'people').objectAt(0), 'name'), "Yehuda Katz", "the items are in the relationship");
});

test("finding many people by a list of IDs", function() {
  // setup
  var group, people, rein, tom, yehuda;
  store.load(Group, { id: 1, person_ids: [ 1, 2, 3 ] });
  group = store.find(Group, 1);

  // test
  stateEquals(group, 'loaded.saved');
  enabledFlags(group, ['isLoaded', 'isValid']);
  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  // setup
  people = get(group, 'people');

  // test
  stateEquals(group, 'loaded.saved');
  enabledFlags(group, ['isLoaded', 'isValid']);
  enabledFlags(people, [], manyArrayFlags);
  equal(get(people, 'length'), 3, "there are three people in the relationship already");
  expectUrl("/people");
  expectType("GET");
  expectData({ ids: [ 1, 2, 3 ] });

  // setup
  ajaxHash.success({
    people: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });
  rein = people.objectAt(0);
  tom = people.objectAt(1);
  yehuda = people.objectAt(2);

  // test
  stateEquals(group, 'loaded.saved');
  statesEqual([rein, tom, yehuda], 'loaded.saved');
  enabledFlags(group, ['isLoaded', 'isValid']);
  enabledFlags(people, ['isLoaded'], manyArrayFlags);
  enabledFlagsForArray([rein, tom, yehuda], ['isLoaded', 'isValid']);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(rein, 'id'), 1);
  equal(get(tom, 'id'), 2);
  equal(get(yehuda, 'id'), 3);
});

test("finding many people by a list of IDs doesn't rely on the returned array order matching the passed list of ids", function() {
  // setup
  var group, people, rein, tom, yehuda;
  store.load(Group, { id: 1, person_ids: [ 1, 2, 3 ] });
  group = store.find(Group, 1);
  people = get(group, 'people');

  // test
  stateEquals(group, 'loaded.saved');
  enabledFlags(group, ['isLoaded', 'isValid']);
  enabledFlags(people, [], manyArrayFlags);

  // setup
  ajaxHash.success({
    people: [
      { id: 2, name: "Tom Dale" },
      { id: 1, name: "Rein Heinrichs" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });
  rein = people.objectAt(0);
  tom = people.objectAt(1);
  yehuda = people.objectAt(2);

  // test
  stateEquals(group, 'loaded.saved');
  statesEqual([rein, tom, yehuda], 'loaded.saved');
  enabledFlags(group, ['isLoaded', 'isValid']);
  enabledFlags(people, ['isLoaded'], manyArrayFlags);
  enabledFlagsForArray([rein, tom, yehuda], ['isLoaded', 'isValid']);
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(rein, 'id'), 1);
  equal(get(tom, 'id'), 2);
  equal(get(yehuda, 'id'), 3);
});

test("additional data can be sideloaded in a GET with many IDs", function() {
  // setup
  var groups, people, rein, tom, yehuda;

  // test
  equal(ajaxUrl, undefined, "no Ajax calls have been made yet");

  // setup
  // findMany is used here even though it is not normally public to test the functionality.
  groups = store.findMany(Group, [ 1 ]);
  rein = groups.objectAt(0); // ok because ^ is a ManyArray

  // test
  stateEquals(rein, 'loading');
  enabledFlags(groups, [], manyArrayFlags);
  enabledFlags(rein, ['isLoading', 'isValid']);
  expectUrl("/groups");
  expectType("GET");
  expectData({ ids: [ 1 ] });

  // setup
  ajaxHash.success({
    groups: [
      { id: 1, person_ids: [ 1, 2, 3 ] }
    ],
    people: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });

  people = groups.objectAt(0).get('people');
  rein = people.objectAt(0);
  tom = people.objectAt(1);
  yehuda = people.objectAt(2);

  // test
  statesEqual(people, 'loaded.saved');
  statesEqual([rein, tom, yehuda], 'loaded.saved');
  enabledFlagsForArray(people, ['isLoaded', 'isValid']);
  enabledFlagsForArray([rein, tom, yehuda], ['isLoaded', 'isValid']);
  equal(get(people, 'length'), 3, "the people have length");
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(rein, 'id'), 1);
  equal(get(tom, 'id'), 2);
  equal(get(yehuda, 'id'), 3);
});

test("finding people by a query", function() {
  // setup
  var people, rein, tom, yehuda;
  people = store.find(Person, { page: 1 });

  // test
  equal(get(people, 'length'), 0, "there are no people yet, as the query has not returned");
  enabledFlags(people, ['isLoading'], recordArrayFlags);
  expectUrl("/people", "the collection at the plural of the model name");
  expectType("GET");
  expectData({ page: 1 });

  // setup
  ajaxHash.success({
    people: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });
  rein = people.objectAt(0);
  tom = people.objectAt(1);
  yehuda = people.objectAt(2);

  // test
  statesEqual([rein, tom, yehuda], 'loaded.saved');
  enabledFlags(people, ['isLoaded'], recordArrayFlags);
  enabledFlagsForArray([rein, tom, yehuda], ['isLoaded'], recordArrayFlags);
  equal(get(people, 'length'), 3, "the people are now loaded");
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(rein, 'id'), 1);
  equal(get(tom, 'id'), 2);
  equal(get(yehuda, 'id'), 3);
});

test("finding people by a query can sideload data", function() {
  // setup
  var groups, group, people, rein, tom, yehuda;
  groups = store.find(Group, { page: 1 });

  // test
  equal(get(groups, 'length'), 0, "there are no groups yet, as the query has not returned");
  enabledFlags(groups, [], recordArrayFlags);
  expectUrl("/groups", "the collection at the plural of the model name");
  expectType("GET");
  expectData({ page: 1 });

  // setup
  ajaxHash.success({
    groups: [
      { id: 1, name: "Group 1", person_ids: [ 1, 2, 3 ] }
    ],
    people: [
      { id: 1, name: "Rein Heinrichs" },
      { id: 2, name: "Tom Dale" },
      { id: 3, name: "Yehuda Katz" }
    ]
  });
  group = groups.objectAt(0);
  people = get(group, 'people');

  // test
  equal(get(people, 'length'), 3, "the people are now loaded");
  stateEquals(group, 'loaded.saved');
  enabledFlags(groups, ['isLoaded'], recordArrayFlags);
  enabledFlags(group, ['isLoaded', 'isValid']);
  enabledFlags(people, ['isLoaded'], manyArrayFlags);

  // setup
  rein = people.objectAt(0);
  tom = people.objectAt(1);
  yehuda = people.objectAt(2);

  // test
  equal(get(rein, 'name'), "Rein Heinrichs");
  equal(get(tom, 'name'), "Tom Dale");
  equal(get(yehuda, 'name'), "Yehuda Katz");
  equal(get(rein, 'id'), 1);
  equal(get(tom, 'id'), 2);
  equal(get(yehuda, 'id'), 3);
  stateEquals(group, 'loaded.saved');
  statesEqual([rein, tom, yehuda], 'loaded.saved');
  enabledFlags(groups, ['isLoaded'], recordArrayFlags);
  enabledFlags(group, ['isLoaded', 'isValid']);
  enabledFlags(people, ['isLoaded'], manyArrayFlags);
  enabledFlagsForArray([rein, tom, yehuda], ['isLoaded', 'isValid']);
});

test("creating several people (with bulkCommit) makes a POST to /people, with a data hash Array", function() {
  // setup
  var tom, yehuda, people;
  set(adapter, 'bulkCommit', true);
  tom = store.createRecord(Person, { name: "Tom Dale" });
  yehuda = store.createRecord(Person, { name: "Yehuda Katz" });
  people = [ tom, yehuda ];

  // test
  statesEqual(people, 'loaded.created.uncommitted');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isNew', 'isValid']);

  // setup
  store.commit();

  // test
  statesEqual(people, 'loaded.created.inFlight');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isSaving', 'isNew', 'isValid']);
  expectUrl("/people", "the collection at the plural of the model name");
  expectType("POST");
  expectData({ people: [ { name: "Tom Dale", group_id: null }, { name: "Yehuda Katz", group_id: null } ] });

  // setup
  ajaxHash.success({ people: [ { id: 1, name: "Tom Dale" }, { id: 2, name: "Yehuda Katz" } ] });

  // test
  statesEqual(people, 'loaded.saved');
  enabledFlagsForArray(people, ['isLoaded', 'isValid']);
  equal(tom, store.find(Person, 1), "it is now possible to retrieve the person by the ID supplied");
  equal(yehuda, store.find(Person, 2), "it is now possible to retrieve the person by the ID supplied");
});

test("bulk commits can sideload data", function() {
  // setup
  var tom, yehuda, people, group;
  set(adapter, 'bulkCommit', true);
  tom = store.createRecord(Person, { name: "Tom Dale" });
  yehuda = store.createRecord(Person, { name: "Yehuda Katz" });
  serializer.configure(Group, { sideloadAs: 'groups' });
  people = [ tom, yehuda ];

  // test
  statesEqual(people, 'loaded.created.uncommitted');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isNew', 'isValid']);

  // setup
  store.commit();

  // test
  statesEqual(people, 'loaded.created.inFlight');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isSaving', 'isNew', 'isValid']);
  expectUrl("/people", "the collection at the plural of the model name");
  expectType("POST");
  expectData({ people: [ { name: "Tom Dale", group_id: null }, { name: "Yehuda Katz", group_id: null } ] });

  // setup
  ajaxHash.success({
    people: [ { id: 1, name: "Tom Dale" }, { id: 2, name: "Yehuda Katz" } ],
    groups: [ { id: 1, name: "Group 1" } ]
  });
  group = store.find(Group, 1);

  // test
  stateEquals(group, 'loaded.saved');
  statesEqual(people, 'loaded.saved');
  enabledFlags(group, ['isLoaded', 'isValid']);
  enabledFlagsForArray(people, ['isLoaded', 'isValid']);
  equal(tom, store.find(Person, 1), "it is now possible to retrieve the person by the ID supplied");
  equal(yehuda, store.find(Person, 2), "it is now possible to retrieve the person by the ID supplied");
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

test("updating several people (with bulkCommit) makes a PUT to /people/bulk with the data hash Array", function() {
  // setup
  var yehuda, carl, people;
  set(adapter, 'bulkCommit', true);
  store.loadMany(Person, [
    { id: 1, name: "Yehuda Katz" },
    { id: 2, name: "Carl Lerche" }
  ]);
  yehuda = store.find(Person, 1);
  carl = store.find(Person, 2);
  people = [ yehuda, carl ];

  // test
  statesEqual(people, 'loaded.saved');
  enabledFlagsForArray(people, ['isLoaded', 'isValid']);

  // setup
  set(yehuda, 'name', "Brohuda Brokatz");
  set(carl, 'name', "Brocarl Brolerche");

  // test
  statesEqual(people, 'loaded.updated.uncommitted');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isValid']);

  // setup
  store.commit();

  // test
  statesEqual(people, 'loaded.updated.inFlight');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isSaving', 'isValid']);
  expectUrl("/people/bulk", "the collection at the plural of the model name");
  expectType("PUT");
  expectData({ people: [{ id: 1, name: "Brohuda Brokatz", group_id: null }, { id: 2, name: "Brocarl Brolerche", group_id: null }] });

  // setup
  ajaxHash.success({ people: [
    { id: 1, name: "Brohuda Brokatz" },
    { id: 2, name: "Brocarl Brolerche" }
  ]});

  // test
  statesEqual(people, 'loaded.saved');
  enabledFlagsForArray(people, ['isLoaded', 'isValid']);
  equal(yehuda, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(carl, store.find(Person, 2), "the same person is retrieved by the same ID");
});

test("bulk updates can sideload data", function() {
  // setup
  var people, yehuda, carl, group;
  set(adapter, 'bulkCommit', true);
  serializer.configure(Group, { sideloadAs: 'groups' });
  store.loadMany(Person, [
    { id: 1, name: "Yehuda Katz" },
    { id: 2, name: "Carl Lerche" }
  ]);
  yehuda = store.find(Person, 1);
  carl = store.find(Person, 2);
  people = [ yehuda, carl ];

  // test
  statesEqual(people, 'loaded.saved');
  enabledFlagsForArray(people, ['isLoaded', 'isValid']);

  // setup
  set(yehuda, 'name', "Brohuda Brokatz");
  set(carl, 'name', "Brocarl Brolerche");

  // test
  statesEqual(people, 'loaded.updated.uncommitted');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isValid']);

  // setup
  store.commit();

  // test
  statesEqual(people, 'loaded.updated.inFlight');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isSaving', 'isValid']);
  expectUrl("/people/bulk", "the collection at the plural of the model name");
  expectType("PUT");
  expectData({ people: [{ id: 1, name: "Brohuda Brokatz", group_id: null }, { id: 2, name: "Brocarl Brolerche", group_id: null }] });

  // setup
  ajaxHash.success({
    people: [
      { id: 1, name: "Brohuda Brokatz" },
      { id: 2, name: "Brocarl Brolerche" }
    ],
    groups: [{ id: 1, name: "Group 1" }]
  });
  group = store.find(Group, 1);

  // test
  statesEqual(people, 'loaded.saved');
  stateEquals(group, 'loaded.saved');
  enabledFlagsForArray(people, ['isLoaded', 'isValid']);
  enabledFlags(group, ['isLoaded', 'isValid']);
  equal(yehuda, store.find(Person, 1), "the same person is retrieved by the same ID");
  equal(carl, store.find(Person, 2), "the same person is retrieved by the same ID");
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

test("deleting several people (with bulkCommit) makes a DELETE to /people/bulk", function() {
  // setup
  var yehuda, carl, people;
  set(adapter, 'bulkCommit', true);
  store.loadMany(Person, [
    { id: 1, name: "Yehuda Katz" },
    { id: 2, name: "Carl Lerche" }
  ]);
  yehuda = store.find(Person, 1);
  carl = store.find(Person, 2);
  people = [ yehuda, carl ];

  // test
  statesEqual(people, 'loaded.saved');
  enabledFlagsForArray(people, ['isLoaded', 'isValid']);

  // setup
  yehuda.deleteRecord();
  carl.deleteRecord();

  // test
  statesEqual(people, 'deleted.uncommitted');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isDeleted', 'isValid']);

  // setup
  store.commit();

  // test
  statesEqual(people, 'deleted.inFlight');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isSaving', 'isDeleted', 'isValid']);
  expectUrl("/people/bulk", "the collection at the plural of the model name with 'delete'");
  expectType("DELETE");
  expectData({ people: [1, 2] });

  // setup
  ajaxHash.success();

  // test
  statesEqual(people, 'deleted.saved');
  enabledFlagsForArray(people, ['isLoaded', 'isDeleted', 'isValid']);
});

test("bulk deletes can sideload data", function() {
  // setup
  var yehuda, carl, people, group;
  set(adapter, 'bulkCommit', true);
  serializer.configure(Group, { sideloadAs: 'groups' });
  store.loadMany(Person, [
    { id: 1, name: "Yehuda Katz" },
    { id: 2, name: "Carl Lerche" }
  ]);
  yehuda = store.find(Person, 1);
  carl = store.find(Person, 2);
  people = [ yehuda, carl ];

  // test
  statesEqual(people, 'loaded.saved');
  enabledFlagsForArray(people, ['isLoaded', 'isValid']);

  // setup
  yehuda.deleteRecord();
  carl.deleteRecord();

  // test
  statesEqual(people, 'deleted.uncommitted');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isDeleted', 'isValid']);

  // setup
  store.commit();

  // test
  statesEqual(people, 'deleted.inFlight');
  enabledFlagsForArray(people, ['isLoaded', 'isDirty', 'isSaving', 'isDeleted', 'isValid']);
  expectUrl("/people/bulk", "the collection at the plural of the model name with 'delete'");
  expectType("DELETE");
  expectData({ people: [1, 2] });

  // setup
  ajaxHash.success({
    groups: [{ id: 1, name: "Group 1" }]
  });
  group = store.find(Group, 1);

  // test
  statesEqual(people, 'deleted.saved');
  stateEquals(group, 'loaded.saved');
  enabledFlagsForArray(people, ['isLoaded', 'isDeleted', 'isValid']);
  enabledFlags(group, ['isLoaded', 'isValid']);
  equal(get(group, 'name'), "Group 1", "the data sideloaded successfully");
});

test("if you specify a namespace then it is prepended onto all URLs", function() {
  // setup
  var person;
  set(adapter, 'namespace', 'ember');
  person = store.find(Person, 1);

  // test
  expectUrl("/ember/people/1", "the namespace, followed by the plural of the model name and the id");
});

test("if you specify a url then that custom url is used", function() {
  // setup
  var person;
  set(adapter, 'url', 'http://api.ember.dev');
  person = store.find(Person, 1);

  // test
  expectUrl("http://api.ember.dev/people/1", "the custom url, followed by the plural of the model name and the id");
});

test("sideloaded data is loaded prior to primary data (to ensure relationship coherence)", function() {
  // setup
  expect(1);
  var group;
  group = store.find(Group, 1);
  stop();
  group.then(function(group) {
    start();

    // test
    // note async
    equal(group.get('people.firstObject').get('name'), "Tom Dale", "sideloaded data are already loaded");
  });

  // setup
 ajaxHash.success({
    people: [{ id: 1, name: "Tom Dale" }],
    group: { id: 1, name: "Tilde team", person_ids: [1] }
  });
});

// !!!: This test is written weird -- no aysnc, but ops happen after the assertion
test("additional data can be sideloaded with relationships in correct order", function() {
  var group;

  var Comment = DS.Model.extend({
    person: DS.belongsTo(Person)
  });

  serializer.configure(Comment, { sideloadAs: 'comments' });

  var comments = store.filter(Comment, function(data) {
    equal(store.find(Comment, data.get('id')).get('person.id'), 1);
  });

  group = store.find(Group, 1);

  ajaxHash.success({
    group: {
      id: 1, name: "Group 1", person_ids: [ 1 ]
    },
    comments: [{
      id: 1, person_id: 1, text: 'hello'
    }],
    people: [{
      id: 1, name: "Yehuda Katz"
    }]
  });
});

test("data loaded from the server is converted from underscores to camelcase", function() {
  // setup
  var person;
  Person.reopen({
    lastName: DS.attr('string')
  });
  store.load(Person, { id: 1, name: "Tom", last_name: "Dale" });
  person = store.find(Person, 1);

  // test
  equal(person.get('name'), "Tom", "precond - data was materialized");
  equal(person.get('lastName'), "Dale", "the attribute name was camelized");
});

test("When a record with a belongsTo is saved the foreign key should be sent.", function () {
  // setup
  var PersonType, personType, person;
  PersonType = DS.Model.extend({
    title: DS.attr("string"),
    people: DS.hasMany(Person)
  });
  PersonType.toString = function() {
      return "App.PersonType";
  };
  Person.reopen({
    personType: DS.belongsTo(PersonType)
  });
  store.load(PersonType, {id: 1, title: "Developer"});
  personType = store.find(PersonType, 1);
  person = store.createRecord(Person, {name: 'Sam Woodard', personType: personType});

  // test
  stateEquals(personType, 'loaded.saved');
  stateEquals(person, 'loaded.created.uncommitted');
  enabledFlags(personType, ['isLoaded', 'isValid']);
  enabledFlags(person, ['isLoaded', 'isDirty', 'isNew', 'isValid']);

  // setup
  store.commit();

  // test
  stateEquals(personType, 'loaded.saved');
  stateEquals(person, 'loaded.created.inFlight');
  enabledFlags(personType, ['isLoaded', 'isValid']);
  enabledFlags(person, ['isLoaded', 'isDirty', 'isSaving', 'isNew', 'isValid']);
  expectUrl('/people');
  expectType("POST");
  expectData({ person: { name: "Sam Woodard", person_type_id: 1, group_id: null } });

  // setup
  ajaxHash.success({ person: { name: 'Sam Woodard', person_type_id: 1}});

  // test
  stateEquals(personType, 'loaded.saved');
  stateEquals(person, 'loaded.saved');
  enabledFlags(personType, ['isLoaded', 'isValid']);
  enabledFlags(person, ['isLoaded', 'isValid']);
});

test("creating a record with a 422 error marks the records as invalid", function(){
  // setup
  var person, mockXHR;
  person = store.createRecord(Person, { name: "" });
  store.commit();
  mockXHR = {
    status:       422,
    responseText: JSON.stringify({ errors: { name: ["can't be blank"]} })
  };
  ajaxHash.error.call(ajaxHash.context, mockXHR);

  // test
  stateEquals(person, 'loaded.created.invalid');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isNew']);
  deepEqual(person.get('errors'), { name: ["can't be blank"]}, "the person has the errors");
});

test("updating a record with a 422 error marks the records as invalid", function(){
  // setup
  var person, mockXHR;
  Person.reopen({
    updatedAt: DS.attr('date')
  });
  store.load(Person, { id: 1, name: "John Doe" });
  person = store.find(Person, 1);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);

  // setup
  person.set('name', '');

  // test
  stateEquals(person, 'loaded.updated.uncommitted');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isValid']);

  // setup
  store.commit();

  // test
  stateEquals(person, 'loaded.updated.inFlight');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isSaving', 'isValid']);

  // setup
  mockXHR = {
    status:       422,
    responseText: JSON.stringify({ errors: { name: ["can't be blank"], updated_at: ["can't be blank"] } })
  };
  ajaxHash.error.call(ajaxHash.context, mockXHR);

  // test
  stateEquals(person, 'loaded.updated.invalid');
  enabledFlags(person, ['isLoaded', 'isDirty']);
  deepEqual(person.get('errors'), { name: ["can't be blank"], updatedAt: ["can't be blank"] }, "the person has the errors");
});

test("creating a record with a 500 error marks the record as error", function() {
  // setup
  var person, mockXHR;
  person = store.createRecord(Person, { name: "" });

  // test
  stateEquals(person, 'loaded.created.uncommitted');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isNew', 'isValid']);

  // setup
  store.commit();

  // test
  stateEquals(person, 'loaded.created.inFlight');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isSaving', 'isNew', 'isValid']);

  // setup
  mockXHR = {
    status:       500,
    responseText: 'Internal Server Error'
  };
  ajaxHash.error.call(ajaxHash.context, mockXHR);

  // test
  stateEquals(person, 'error');
  enabledFlags(person, ['isError', 'isValid']);
});

test("updating a record with a 500 error marks the record as error", function() {
  // setup
  var person, mockXHR;
  store.load(Person, { id: 1, name: "John Doe" });
  person = store.find(Person, 1);

  // test
  stateEquals(person, 'loaded.saved');
  enabledFlags(person, ['isLoaded', 'isValid']);

  // setup
  person.set('name', 'Jane Doe');

  // test
  stateEquals(person, 'loaded.updated.uncommitted');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isValid']);

  // setup
  store.commit();

  // test
  stateEquals(person, 'loaded.updated.inFlight');
  enabledFlags(person, ['isLoaded', 'isDirty', 'isSaving', 'isValid']);

  // setup
  mockXHR = {
    status:       500,
    responseText: 'Internal Server Error'
  };
  ajaxHash.error.call(ajaxHash.context, mockXHR);

  // test
  stateEquals(person, 'error');
  enabledFlags(person, ['isError', 'isValid']);
});

var TestError = function(message) {
  this.message = message;
};

var originalRejectionHandler = DS.rejectionHandler;

module('The REST adapter - error handling', {
  setup: function() {
    Adapter = DS.RESTAdapter.extend();

    Person = DS.Model.extend({
      name: DS.attr('string')
    });

    Person.toString = function() {
      return "App.Person";
    };
  },

  teardown: function() {
    DS.rejectionHandler = originalRejectionHandler;
  }
});

test("promise errors are sent to the ember assertion logger", function() {
  expect(1);

  // setup
  store = DS.Store.create({
    adapter: Adapter.extend({
      didFindRecord: function() {
        throw new TestError('TestError');
      },

      ajax: function(url, type, hash) {
        return new Ember.RSVP.Promise(function(resolve, reject){
          Ember.run(function(){
            resolve({ person: [{ id: 1, name: "Adam Hawkins" }] });
          });
        });
      }
    })
  });


  DS.rejectionHandler = function(reason) {
    ok(reason instanceof TestError, "Promise chains should dump exception classes to the logger");
  };

  store.find(Person, 1);
});
